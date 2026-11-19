// AUTHORED-BY Claude Opus 5.5
/**
 * Step 7 (flows.md section 3): before Northwind discloses anything to Brackenridge, it proves
 * "no undisclosed owner holds 25% or more".
 *
 * 1. Brackenridge's credit desk opens a challenge: a single-use nonce it keeps in its own pod,
 *    with a copy appended to Northwind's inbox.
 * 2. Northwind's wallet proves, in the browser, against the register's anchors in its own pod:
 *    - Tier B (`kyb_completeness_scan_n8`): of the full owner array, exactly two owners hold 25%
 *      or more. The array stays on the device; only its anchored commitment is public;
 *    - Tier A (`filter_int_d4`), one per disclosed owner: that owner's share is at least 25%.
 *    It appends the presentation (proofs, the anchors, the disclosed owners' names) to
 *    `brackenridge:/inbox/`.
 * 3. Brackenridge verifies every gate (nonce burned first, challenge, statement, anchor signature
 *    and status at Halyard, holder binding, field, commitment or operand, the proof), deletes the
 *    challenge and records its pre-decision in its own pod.
 */

import {
  BeneficialOwnershipCredential,
  buildDeliveredDocument,
  MORT,
  ZkOperandAnchor,
} from "@mortgage/data-model";
import type { CompletenessProofJson, TierAProofJson, TierAStatement } from "@mortgage/vc-kit";
import { DataFactory } from "n3";
import { vcKit } from "../mortgage/vc.js";
import {
  at,
  PodRequestError,
  podUrl,
  put,
  putResource,
  readDataset,
  readText,
  remove,
  statusOf,
  type World,
  webid,
} from "../mortgage/world.js";
import { HOLDER, PATHS, shareAnchorPath, THRESHOLD_BPS } from "./facts.js";
import { holderUrl } from "./register.js";

const LENDER = "business-lender" as const;

export const SHARE_STATEMENT: TierAStatement = Object.freeze({
  bound: THRESHOLD_BPS,
  field: MORT.ownershipPercentageBps,
  op: "ge",
});

export interface KybChallenge {
  readonly type: "OwnershipCompletenessChallenge";
  readonly lender: string;
  readonly nonce: string;
  readonly threshold: number;
}

export interface KybPresentation {
  readonly type: "OwnershipCompletenessPresentation";
  readonly holder: string;
  readonly nonce: string;
  /** The owners Northwind names as holding 25% or more. */
  readonly disclosed: readonly string[];
  readonly completeness: { readonly proof: CompletenessProofJson; readonly anchor: string };
  readonly shares: readonly {
    readonly owner: string;
    readonly proof: TierAProofJson;
    readonly anchor: string;
  }[];
  /** Proving time in this browser, ms, and whether it was proved here and now. */
  readonly provedMs: number;
  readonly threads: number;
}

export function challengeUrl(world: Pick<World, "podOrigin">): string {
  return podUrl(world, LENDER, "kyb/challenges/northwind");
}

export function resultUrl(world: Pick<World, "podOrigin">): string {
  return podUrl(world, LENDER, "kyb/pre-decisions/northwind");
}

/** Brackenridge opens a challenge (its own copy, and one in Northwind's inbox). */
export async function openChallenge(world: World): Promise<KybChallenge> {
  const challenge: KybChallenge = {
    lender: webid(world, LENDER),
    nonce: globalThis.crypto.randomUUID(),
    threshold: THRESHOLD_BPS,
    type: "OwnershipCompletenessChallenge",
  };
  const lender = world.fetchAs(LENDER);
  const body = JSON.stringify(challenge);
  await put(lender, challengeUrl(world), body, "application/json");
  const inbox = holderUrl(world, PATHS.inbox);
  const response = await lender(inbox, {
    body,
    headers: { "content-type": "application/json", slug: "ownership-challenge" },
    method: "POST",
  });
  if (!response.ok) throw new PodRequestError("POST", inbox, response.status);
  return challenge;
}

/** The newest challenge in Northwind's inbox, if any. */
export async function findChallenge(world: World): Promise<KybChallenge | undefined> {
  const holder = world.fetchAs(HOLDER);
  const { membersOf } = await import("../mortgage/grants.js");
  const inbox = holderUrl(world, PATHS.inbox);
  if ((await statusOf(holder, inbox)) !== 200) return undefined;
  const urls = (await membersOf(holder, inbox)).filter((url) =>
    url.split("/").pop()?.startsWith("ownership-challenge"),
  );
  let latest: KybChallenge | undefined;
  for (const url of urls) {
    const parsed = JSON.parse(await readText(holder, url, "application/json")) as KybChallenge;
    if (parsed.type === "OwnershipCompletenessChallenge") latest = parsed;
  }
  return latest;
}

/** Is a challenge still live at Brackenridge (opened and not yet answered)? */
export async function challengeIsLive(world: World): Promise<boolean> {
  return (await statusOf(world.fetchAs(LENDER), challengeUrl(world))) === 200;
}

/**
 * Northwind proves and presents. Reads its own ownership credential and anchors; every proof is
 * made here. Returns the presentation's URL in Brackenridge's inbox and the proving time.
 */
export async function proveToLender(
  world: World,
  onProgress?: (stage: string) => void,
): Promise<{ url: string; presentation: KybPresentation }> {
  const holder = world.fetchAs(HOLDER);
  const challenge = await findChallenge(world);
  if (challenge === undefined) throw new Error("no challenge from Brackenridge in the inbox");
  const kit = await vcKit();
  const ownershipUrl = holderUrl(world, PATHS.ownership);
  const owners = new BeneficialOwnershipCredential(
    ownershipUrl,
    await readDataset(holder, ownershipUrl),
    DataFactory,
  ).credentialSubject.ownerships.map((ownership) => ({
    bps: ownership.bps,
    name: ownership.owner.personName,
  }));
  const arrayUrl = holderUrl(world, PATHS.arrayAnchor);
  const arrayAnchor = await readText(holder, arrayUrl);
  const commitment = new ZkOperandAnchor(arrayUrl, await readDataset(holder, arrayUrl), DataFactory)
    .credentialSubject.operandEnc;
  const disclosed = owners.filter((owner) => owner.bps >= challenge.threshold);
  const started = performance.now();
  onProgress?.("completeness");
  const completeness = await kit.proveCompleteness({
    arrayCommitment: commitment,
    bps: owners.map((owner) => owner.bps),
    disclosedCount: disclosed.length,
    nonce: challenge.nonce,
    threshold: challenge.threshold,
  });
  const shares: KybPresentation["shares"][number][] = [];
  for (const [index, owner] of disclosed.entries()) {
    const url = holderUrl(world, shareAnchorPath(index + 1));
    onProgress?.(`share:${owner.name}`);
    const anchor = await readText(holder, url);
    const operandEnc = new ZkOperandAnchor(url, await readDataset(holder, url), DataFactory)
      .credentialSubject.operandEnc;
    const proof = await kit.proveTierA({
      nonce: challenge.nonce,
      operandEnc,
      statement: { ...SHARE_STATEMENT, bound: challenge.threshold },
      value: owner.bps,
    });
    shares.push({ anchor, owner: owner.name, proof: kit.tierAProofToJson(proof) });
  }
  const presentation: KybPresentation = {
    completeness: { anchor: arrayAnchor, proof: kit.completenessProofToJson(completeness) },
    disclosed: disclosed.map((owner) => owner.name),
    holder: webid(world, HOLDER),
    nonce: challenge.nonce,
    provedMs: Math.round(performance.now() - started),
    shares,
    threads: completeness.threads,
    type: "OwnershipCompletenessPresentation",
  };
  const inbox = podUrl(world, LENDER, "inbox/");
  const response = await holder(inbox, {
    body: JSON.stringify(presentation),
    headers: { "content-type": "application/json", slug: "ownership-proof" },
    method: "POST",
  });
  const location = response.headers.get("location");
  if (!response.ok || location === null) throw new PodRequestError("POST", inbox, response.status);
  return { presentation, url: new URL(location, inbox).href };
}

export interface PreDecision {
  readonly passed: boolean;
  readonly errors: readonly string[];
  readonly disclosed: readonly string[];
  readonly result: string;
  readonly provedMs: number;
}

/** Brackenridge verifies a presentation from its inbox and records the pre-decision. */
export async function verifyAtLender(
  world: World,
  presentationUrl: string,
  time = "13:40",
): Promise<PreDecision> {
  const lender = world.fetchAs(LENDER);
  const presentation = JSON.parse(
    await readText(lender, presentationUrl, "application/json"),
  ) as KybPresentation;
  const errors: string[] = [];
  let live: KybChallenge | undefined;
  try {
    live = JSON.parse(
      await readText(lender, challengeUrl(world), "application/json"),
    ) as KybChallenge;
  } catch {
    errors.push("no live challenge: it was already used or never opened");
  }
  const kit = await vcKit();
  if (live !== undefined) {
    const challenge = live;
    const trusted = [webid(world, "registry")];
    const now = at(world, time);
    const holderId = presentation.holder;
    if (holderId !== webid(world, HOLDER)) errors.push("the presenter is not Northwind");
    // One burn per proof: each proof is checked against this challenge exactly once.
    const once = () => {
      let used = false;
      return {
        consume: (_session: string, nonce: string) => {
          if (used || nonce !== challenge.nonce) return false;
          used = true;
          return true;
        },
      };
    };
    const common = {
      nonce: presentation.nonce,
      now,
      sessionKey: challengeUrl(world),
      statusFetch: lender,
      trustedIssuers: trusted,
      webIdFetch: lender,
      webid: holderId,
    };
    const completeness = await kit.verifyCompleteness(
      kit.completenessProofFromJson(presentation.completeness.proof),
      {
        ...common,
        anchorVc: presentation.completeness.anchor,
        disclosedCount: presentation.disclosed.length,
        nonces: once(),
        threshold: challenge.threshold,
      },
    );
    for (const error of completeness.errors) errors.push(`completeness: ${error.code}`);
    const named = new Set(presentation.shares.map((share) => share.owner));
    if (
      presentation.disclosed.some((owner) => !named.has(owner)) ||
      named.size !== presentation.disclosed.length
    ) {
      errors.push("each disclosed owner needs its own share proof");
    }
    const anchorsSeen = new Set<string>();
    for (const share of presentation.shares) {
      if (anchorsSeen.has(share.anchor)) errors.push(`${share.owner}: anchor reused`);
      anchorsSeen.add(share.anchor);
      const outcome = await kit.verifyTierA(kit.tierAProofFromJson(share.proof), {
        ...common,
        anchorVc: share.anchor,
        nonces: once(),
        statement: { ...SHARE_STATEMENT, bound: challenge.threshold },
      });
      for (const error of outcome.errors) errors.push(`${share.owner}: ${error.code}`);
    }
    await remove(lender, challengeUrl(world));
  }
  const passed = errors.length === 0;
  const names = presentation.disclosed.join(" and ");
  const result = await putResource(
    lender,
    buildDeliveredDocument({
      about: presentationUrl,
      creator: webid(world, LENDER),
      description: passed
        ? `Pre-decision: proceed. Proved without disclosure: no owner other than ${names} holds 25% or more, and each of them holds at least 25%. Received: ${1 + presentation.shares.length} proofs and their register anchors. Not received: any share, the other owners' names or a credential.`
        : `Pre-decision: not passed: ${errors.join("; ")}`,
      iri: resultUrl(world),
      issued: at(world, time),
      name: "Ownership pre-decision",
    }),
  );
  world.note({
    kind: "proof-verified",
    org: LENDER,
    refs: [presentationUrl, result],
    text: passed
      ? `${1 + presentation.shares.length} proofs verified against Halyard's anchors: no undisclosed owner holds 25% or more. Brackenridge learned the names ${names} and nothing else.`
      : "The ownership proofs did not verify.",
  });
  return {
    disclosed: presentation.disclosed,
    errors,
    passed,
    provedMs: presentation.provedMs,
    result,
  };
}
