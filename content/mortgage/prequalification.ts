// AUTHORED-BY Claude Fable 5.2
/**
 * Pre-qualification by proof (tour steps 5 and 6). Alex proves two thresholds to a lender
 * without showing the numbers and without granting any access to the pod.
 *
 * - The lender publishes a challenge in its own pod: a fresh nonce and the thresholds it asks for.
 * - Alex's wallet reads its own credentials and their issuer-signed operand anchors, makes one
 *   proof per threshold bound to the lender's nonce, and appends a presentation to the lender's
 *   inbox. The presentation holds the proofs and the anchors. It holds no income and no score.
 * - The lender checks each proof against the anchor, the anchor against its issuer, and its own
 *   nonce; then it deletes the challenge, so the same presentation cannot be used twice.
 *
 * The presentation and the challenge are JSON, not RDF: a proof is bytes for a verifier.
 */

import {
  buildDeliveredDocument,
  CreditScoreCredential,
  EmploymentIncomeCredential,
  MORT,
  ZkOperandAnchor,
} from "@mortgage/data-model";
import type { OrgSlug } from "@mortgage/demo-kit/registry";
import type { TierAProofJson, TierAStatement } from "@mortgage/vc-kit";
import { DataFactory } from "n3";
import { PREQUALIFICATION } from "./facts.js";
import { vcKit } from "./vc.js";
import {
  at,
  PodRequestError,
  podUrl,
  put,
  putResource,
  readDataset,
  readText,
  remove,
  type World,
  webid,
} from "./world.js";

export type PrequalifyingLender = "lender" | "lender-b";

/** The two statements both lenders ask for. */
export const PREQUALIFICATION_STATEMENTS: readonly TierAStatement[] = Object.freeze([
  { bound: PREQUALIFICATION.minimumMonthlyIncomeUsd, field: MORT.monthlyGrossIncomeUsd, op: "ge" },
  { bound: PREQUALIFICATION.minimumCreditScore, field: MORT.creditScoreValue, op: "ge" },
]);

/** The pod resources each statement is proved from: the credential and its issuer's anchor. */
export const STATEMENT_SOURCES: Readonly<
  Record<string, { credential: string; anchor: string; issuer: "payroll" | "bureau" }>
> = Object.freeze({
  [MORT.creditScoreValue]: {
    anchor: "credentials/credit-summary-anchor",
    credential: "credentials/credit-summary",
    issuer: "bureau",
  },
  [MORT.monthlyGrossIncomeUsd]: {
    anchor: "credentials/employment-income-anchor",
    credential: "credentials/employment-income",
    issuer: "payroll",
  },
});

export interface PrequalificationChallenge {
  readonly type: "PrequalificationChallenge";
  readonly lender: string;
  readonly nonce: string;
  readonly statements: readonly TierAStatement[];
}

export interface ThresholdPresentation {
  readonly type: "ThresholdPresentation";
  /** The presenter's WebID. Each anchor must name the same subject. */
  readonly holder: string;
  /** The challenge this answers. */
  readonly challenge: string;
  readonly nonce: string;
  readonly statements: readonly {
    readonly statement: TierAStatement;
    readonly proof: TierAProofJson;
    /** The issuer-signed operand anchor, as stored in the holder's pod (Turtle). */
    readonly anchor: string;
  }[];
}

export function challengeUrl(world: Pick<World, "podOrigin">, lender: PrequalifyingLender): string {
  return podUrl(world, lender, "prequalification/challenge");
}

/** The lender opens a pre-qualification: a fresh single-use nonce, readable by anyone. */
export async function openPrequalification(
  world: World,
  lender: PrequalifyingLender,
): Promise<PrequalificationChallenge> {
  const challenge: PrequalificationChallenge = {
    lender: webid(world, lender),
    nonce: globalThis.crypto.randomUUID(),
    statements: PREQUALIFICATION_STATEMENTS,
    type: "PrequalificationChallenge",
  };
  await put(
    world.fetchAs(lender),
    challengeUrl(world, lender),
    JSON.stringify(challenge),
    "application/json",
  );
  return challenge;
}

async function hiddenValue(world: World, field: string): Promise<number> {
  const source = STATEMENT_SOURCES[field];
  if (source === undefined) throw new Error(`no credential holds ${field}`);
  const url = podUrl(world, "alex", source.credential);
  const dataset = await readDataset(world.fetchAs("alex"), url);
  return field === MORT.monthlyGrossIncomeUsd
    ? new EmploymentIncomeCredential(url, dataset, DataFactory).credentialSubject
        .monthlyGrossIncomeUsd
    : new CreditScoreCredential(url, dataset, DataFactory).credentialSubject.creditScoreValue;
}

/**
 * Alex's wallet answers a lender's challenge. Everything is read from Alex's own pod by Alex.
 * The hidden values go into the prover as private inputs and are in nothing this returns.
 * Returns the URL of the presentation in the lender's inbox.
 */
export async function presentThresholdProofs(
  world: World,
  lender: PrequalifyingLender,
): Promise<string> {
  const alex = world.fetchAs("alex");
  const challenge = JSON.parse(
    await readText(alex, challengeUrl(world, lender), "application/json"),
  ) as PrequalificationChallenge;
  const statements: ThresholdPresentation["statements"][number][] = [];
  const { proveTierA, tierAProofToJson } = await vcKit();
  for (const statement of challenge.statements) {
    const source = STATEMENT_SOURCES[statement.field];
    if (source === undefined) throw new Error(`cannot prove ${statement.field}`);
    const anchorUrl = podUrl(world, "alex", source.anchor);
    const anchor = await readText(alex, anchorUrl);
    const operandEnc = new ZkOperandAnchor(
      anchorUrl,
      await readDataset(alex, anchorUrl),
      DataFactory,
    ).credentialSubject.operandEnc;
    const proof = await proveTierA({
      nonce: challenge.nonce,
      operandEnc,
      statement,
      value: await hiddenValue(world, statement.field),
    });
    statements.push({ anchor, proof: tierAProofToJson(proof), statement });
  }
  const presentation: ThresholdPresentation = {
    challenge: challengeUrl(world, lender),
    holder: webid(world, "alex"),
    nonce: challenge.nonce,
    statements,
    type: "ThresholdPresentation",
  };
  const inbox = podUrl(world, lender, "inbox/");
  const response = await alex(inbox, {
    body: JSON.stringify(presentation),
    headers: { "content-type": "application/json", slug: "prequalification" },
    method: "POST",
  });
  const location = response.headers.get("location");
  if (!response.ok || location === null) throw new PodRequestError("POST", inbox, response.status);
  return new URL(location, inbox).href;
}

export interface PrequalificationOutcome {
  readonly qualified: boolean;
  /** The lender's own record of the outcome. */
  readonly result: string;
  readonly errors: readonly string[];
}

/**
 * The lender checks a presentation from its inbox. Every statement it asked for must be proved
 * against an anchor signed by the issuer it trusts for that field, for its own live nonce.
 * Passing or failing, the challenge is deleted afterwards.
 */
export async function verifyPresentation(
  world: World,
  lender: PrequalifyingLender,
  presentationUrl: string,
  time = "11:00",
): Promise<PrequalificationOutcome> {
  const fetcher = world.fetchAs(lender);
  const presentation = JSON.parse(
    await readText(fetcher, presentationUrl, "application/json"),
  ) as ThresholdPresentation;
  const errors: string[] = [];
  let live: PrequalificationChallenge | undefined;
  try {
    live = JSON.parse(
      await readText(fetcher, challengeUrl(world, lender), "application/json"),
    ) as PrequalificationChallenge;
  } catch {
    errors.push("no live challenge: it was already used or never opened");
  }
  if (live !== undefined) {
    const challenge = live;
    const { tierAProofFromJson, verifyTierA } = await vcKit();
    for (const asked of challenge.statements) {
      const offered = presentation.statements.find(
        (entry) =>
          entry.statement.field === asked.field &&
          entry.statement.op === asked.op &&
          entry.statement.bound === asked.bound,
      );
      const source = STATEMENT_SOURCES[asked.field];
      if (offered === undefined || source === undefined) {
        errors.push(`no proof for ${asked.field} ${asked.op} ${asked.bound}`);
        continue;
      }
      let used = false;
      const outcome = await verifyTierA(tierAProofFromJson(offered.proof), {
        anchorVc: offered.anchor,
        nonce: presentation.nonce,
        nonces: {
          // One use per statement of the one live nonce; the challenge itself is deleted below.
          consume: (_session, nonce) => {
            if (used || nonce !== challenge.nonce) return false;
            used = true;
            return true;
          },
        },
        now: at(world, time),
        sessionKey: challengeUrl(world, lender),
        statement: asked,
        statusFetch: fetcher,
        trustedIssuers: [webid(world, source.issuer)],
        webIdFetch: fetcher,
        webid: presentation.holder,
      });
      for (const error of outcome.errors) errors.push(`${asked.field}: ${error.code}`);
    }
    await remove(fetcher, challengeUrl(world, lender));
  }
  const qualified = errors.length === 0;
  const result = await putResource(
    fetcher,
    buildDeliveredDocument({
      about: presentationUrl,
      creator: webid(world, lender),
      description: qualified
        ? `Pre-qualified, not a commitment to lend. Proved without disclosure: monthly income of at least $${PREQUALIFICATION.minimumMonthlyIncomeUsd.toLocaleString("en-US")} and a credit score of at least ${PREQUALIFICATION.minimumCreditScore}. Received: two proofs and two issuer anchors. Not received: the income, the score, or any document.`
        : `Not pre-qualified: ${errors.join("; ")}`,
      iri: podUrl(world, lender, "quotes/prequalification"),
      issued: at(world, time),
      name: "Pre-qualification result",
    }),
  );
  world.note({
    kind: "proof-verified",
    org: lender as OrgSlug,
    refs: [presentationUrl, result],
    text: qualified
      ? "Two threshold proofs verified against the issuers' anchors. The lender learned yes or no, and who vouches for it."
      : "The presentation did not verify.",
  });
  return { errors, qualified, result };
}
