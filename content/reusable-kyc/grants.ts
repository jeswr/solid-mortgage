// AUTHORED-BY Claude Opus 5.5
/**
 * Grant Y1 (flows.md section 8, step 2): Pennant may read one resource, Alex's KYC attestation,
 * once, within an hour, for identity verification. It is the narrowest grant in these demos.
 *
 * It is written like every other grant (`../mortgage/grants.ts`): Pennant appends an ODRL request
 * to Alex's inbox; Alex's wallet approves it, which writes the agreement in `policies/` (with an
 * `odrl:count` of 1 and an end one hour later), a DPV consent record in `consents/` and the ACL
 * change. WAC cannot say "once", so the wallet also registers the grant with the pod runtime's
 * one-time-grant service before the rule is written: after Pennant's first successful read the
 * runtime closes the rule as Alex's wallet, and the pod server refuses the next read (step 5).
 *
 * The runtime service is reached through the function the page passes in (`GrantOneTime`), so
 * content does not depend on the pod runtime.
 */

import {
  AccessAgreement,
  buildAccessRequest,
  DPV,
  type PermissionInit,
} from "@mortgage/data-model";
import type { Authorization } from "@solid/object";
import { DataFactory } from "n3";
import {
  type ApprovalResult,
  approveRequest,
  type GrantRecord,
  grantRecords,
  readAcl,
  writeConsent,
} from "../mortgage/grants.js";
import {
  at,
  podUrl,
  postResource,
  readDataset,
  statusOf,
  type World,
  webid,
} from "../mortgage/world.js";
import { attestationUrl } from "./attestation.js";
import { GRANT_CODE, GRANT_WINDOW_MINUTES } from "./facts.js";

const CARD = "card-issuer" as const;

/** The Lens handle of the grant's agreement. */
export const POLICY_PATH = `policies/${GRANT_CODE.toLowerCase()}`;
export const PURPOSE = DPV.IdentityVerification;
export const PURPOSE_TEXT = "Check my identity for a card application";
export const UNTIL_LABEL = `Once, within ${GRANT_WINDOW_MINUTES} minutes`;

/** Register `agent`'s access to `resource` as one-time with the pod runtime (as the pod owner). */
export type GrantOneTime = (input: { resource: string; agent: string }) => Promise<unknown>;

export function policyUrl(world: Pick<World, "podOrigin">): string {
  return podUrl(world, "alex", POLICY_PATH);
}

/** Y1's single permission, with absolute targets and the end an hour after `time`. */
export function oneTimePermission(world: World, time: string): PermissionInit {
  const start = at(world, time);
  return {
    assignee: webid(world, CARD),
    end: { until: new Date(start.getTime() + GRANT_WINDOW_MINUTES * 60_000) },
    maxUses: 1,
    modes: ["Read"],
    purpose: PURPOSE,
    targets: [attestationUrl(world)],
  };
}

/**
 * Pennant asks: it appends the request to Alex's inbox, which any signed-in agent may do and
 * nobody but Alex may read. Returns the request's URL (the server picks its name).
 */
export function requestVerifiedIdentity(world: World, time: string): Promise<string> {
  return postResource(
    world.fetchAs(CARD),
    podUrl(world, "alex", "inbox/"),
    `request-${GRANT_CODE.toLowerCase()}`,
    (iri) =>
      buildAccessRequest({
        assignee: webid(world, CARD),
        assigner: webid(world, "alex"),
        description:
          "Read your KYC attestation from Alder Bank once, to verify your identity for a card application",
        grantCode: GRANT_CODE,
        iri,
        issued: at(world, time),
        name: "Use verified identity",
        permissions: [oneTimePermission(world, time)],
      }),
  );
}

/** Is the request at `url` a one-time request of this demo, in the shape the wallet expects? */
export async function readOneTimeRequest(
  world: World,
  url: string,
): Promise<{ agreement: AccessAgreement; reason?: string }> {
  const dataset = await readDataset(world.fetchAs("alex"), url);
  // The request and the agreement share their accessors; the agreement class reads both.
  const request = new AccessAgreement(url, dataset, DataFactory);
  const permissions = request.permissions;
  const only = permissions[0];
  let reason: string | undefined;
  if (request.grantCode !== GRANT_CODE) reason = `not a ${GRANT_CODE} request`;
  else if (permissions.length !== 1 || only === undefined) reason = "more than one permission";
  else if (only.maxUses !== 1) reason = "not limited to one use";
  else if (only.modes.join(",") !== "Read") reason = "asks for more than reading";
  else if ([...only.targetIris].join(" ") !== attestationUrl(world)) {
    reason = "names something other than the KYC attestation";
  } else if (only.assigneeIri !== webid(world, CARD)) reason = "not for Pennant";
  return { agreement: request, ...(reason === undefined ? {} : { reason }) };
}

/**
 * Alex approves in the wallet. The request must be exactly Y1's shape (one read of the
 * attestation, once, by Pennant). The one-time registration comes first, so the rule is
 * one-time from the moment it exists; then the agreement, the consent record and the ACL.
 */
export async function approveVerifiedIdentity(
  world: World,
  requestUrl: string,
  grantOneTime: GrantOneTime,
  time: string,
): Promise<ApprovalResult> {
  const { reason } = await readOneTimeRequest(world, requestUrl);
  if (reason !== undefined) throw new Error(`the wallet will not approve this request: ${reason}`);
  if ((await statusOf(world.fetchAs("alex"), attestationUrl(world))) !== 200) {
    throw new Error("there is no KYC attestation in the pod to share");
  }
  await grantOneTime({ agent: webid(world, CARD), resource: attestationUrl(world) });
  return approveRequest(world, requestUrl, time);
}

/** Y1 as the pod records it, if it has been approved. */
export async function oneTimeRecord(world: World): Promise<GrantRecord | undefined> {
  return (await grantRecords(world)).find((record) => record.policy === policyUrl(world));
}

/** Does the attestation's ACL document still give Pennant a rule? */
export async function pennantHasRule(world: World): Promise<boolean> {
  const aclUrl = `${attestationUrl(world)}.acl`;
  const alex = world.fetchAs("alex");
  if ((await statusOf(alex, aclUrl)) !== 200) return false;
  const rules: Authorization[] = await readAcl(alex, aclUrl);
  const pennant = webid(world, CARD);
  return rules.some((rule) => [...rule.agent].includes(pennant));
}

/** What Alex's wallet shows about Y1. */
export type OneTimeState = "none" | "open" | "used" | "ended";

export async function oneTimeState(world: World): Promise<OneTimeState> {
  const record = await oneTimeRecord(world);
  if (record === undefined) return "none";
  if (record.state !== "active") return record.state === "expired" ? "used" : "ended";
  return (await pennantHasRule(world)) ? "open" : "used";
}

/**
 * The wallet's bookkeeping after the runtime closed Y1: the agreement is still on record as
 * given, so the wallet adds an "expired" consent record and recomputation never reopens the
 * rule. Writes only when Y1 is on record as active and the ACL no longer names Pennant.
 * Returns the consent record's URL, or `undefined` when there was nothing to record.
 */
export async function recordOneTimeUsed(world: World, time: string): Promise<string | undefined> {
  const record = await oneTimeRecord(world);
  if (record === undefined || record.state !== "active") return undefined;
  if (await pennantHasRule(world)) return undefined;
  return writeConsent(world, record, DPV.ConsentExpired, "used", time);
}
