// AUTHORED-BY Claude Opus 5.5
/**
 * The motor claim's three grants (flows.md section 7), written exactly as the mortgage writes one
 * (`../mortgage/grants.ts`): an ODRL agreement in `policies/`, a DPV consent record in
 * `consents/`, and the ACL documents recomputed from every agreement on record. The pod enforces
 * the result; nothing here checks access itself.
 *
 * - P1, standing: Wrenfield keeps the motor policy credential in Alex's `insurance/` drawer
 *   current. Given when Alex took the policy out (before the story), it lasts while the policy is
 *   in force. It is "the policy grant" that stays when the claim closes.
 * - C1, the claim: Wrenfield reads the driver licence and the motor policy, and reads and writes
 *   the claim folder, until the claim closes. Alex withdraws it in step 10.
 * - C2, the repair job: Anvil reads the damage report and the photos only, and adds its estimate
 *   and its invoice, until the job is complete. The invoice is the evidence: once it is in the
 *   folder, Alex's wallet expires C2 (`applyMotorClaimExpiries`).
 *
 * The slot pattern of the mortgage (Append on the container, Write on exact resources) lets Anvil
 * create its two documents and nothing else: it cannot read the folder, list it, or replace the
 * incident report.
 */

import {
  AccessAgreement,
  type AccessModeName,
  AccessRequest,
  buildAccessAgreement,
  buildAccessRequest,
  DPV,
  MORT,
  permissionInits,
} from "@mortgage/data-model";
import { DataFactory } from "n3";
import {
  approveRequest,
  endGrant,
  type GrantRecord,
  grantRecords,
  syncAcls,
  writeConsent,
} from "../mortgage/grants.js";
import { findMember } from "../mortgage/messages.js";
import {
  at,
  podUrl,
  postResource,
  putResource,
  readDataset,
  type World,
  webid,
} from "../mortgage/world.js";
import { CLAIM_NUMBER, PATHS } from "./facts.js";

export const MOTOR_CODES = ["P1", "C1", "C2"] as const;
export type MotorCode = (typeof MOTOR_CODES)[number];

/** The two grants this claim adds (the narration's "two grants, each scoped to one job"). */
export const CLAIM_CODES = ["C1", "C2"] as const satisfies readonly MotorCode[];

export interface MotorGrant {
  readonly code: MotorCode;
  readonly to: "insurer" | "repairer";
  /** The consent screen's title. */
  readonly name: string;
  /** The purpose in plain words. */
  readonly description: string;
  /** The `mort:GrantEndScheme` event that ends it. */
  readonly end: string;
  readonly endLabel: string;
  /** What the consent screen lists, one line per permission. */
  readonly permissions: readonly {
    readonly paths: readonly string[];
    readonly modes: readonly AccessModeName[];
    readonly label: string;
  }[];
}

export const MOTOR_GRANTS: Readonly<Record<MotorCode, MotorGrant>> = Object.freeze({
  P1: {
    code: "P1",
    description: "Keep my motor policy credential current",
    end: MORT.GrantEnd_MotorPolicyLapses,
    endLabel: "Lasts while the policy is in force",
    name: "Motor policy",
    permissions: [
      {
        label: "Read and replace the motor policy",
        modes: ["Read", "Write"],
        paths: [PATHS.policy],
      },
    ],
    to: "insurer",
  },
  C1: {
    code: "C1",
    description: `Handle claim ${CLAIM_NUMBER}: check my licence and my policy, read the claim file and add the damage report`,
    end: MORT.GrantEnd_ClaimClosed,
    endLabel: "Until the claim closes",
    name: `Claim ${CLAIM_NUMBER}`,
    permissions: [
      {
        label: "Read the driver licence and the motor policy",
        modes: ["Read"],
        paths: [PATHS.licence, PATHS.policy],
      },
      { label: "Read and add to the claim folder", modes: ["Read", "Write"], paths: [PATHS.claim] },
    ],
    to: "insurer",
  },
  C2: {
    code: "C2",
    description: `Repair the car on claim ${CLAIM_NUMBER}: read the damage report and the photos, and add the estimate and the invoice`,
    end: MORT.GrantEnd_JobCompleted,
    endLabel: "Until the job is complete",
    name: `Repair job ${CLAIM_NUMBER}`,
    permissions: [
      {
        label: "Read the damage report and the photos",
        modes: ["Read"],
        paths: [PATHS.damageReport, PATHS.photos],
      },
      { label: "Add documents to the claim folder", modes: ["Append"], paths: [PATHS.claim] },
      {
        label: "Write the estimate and the invoice",
        modes: ["Write"],
        paths: [PATHS.estimate, PATHS.invoice],
      },
    ],
    to: "repairer",
  },
});

/** The evidence that an end event happened, by event: the wallet looks for it in the pod. */
export const MOTOR_END_EVIDENCE: Readonly<Record<string, string>> = Object.freeze({
  [MORT.GrantEnd_JobCompleted]: PATHS.invoice,
});

export function isMotorCode(value: string): value is MotorCode {
  return (MOTOR_CODES as readonly string[]).includes(value);
}

const alexUrl = (world: Pick<World, "podOrigin">, path = "") => podUrl(world, "alex", path);

export function motorPolicyUrl(world: Pick<World, "podOrigin">, code: MotorCode): string {
  return alexUrl(world, `policies/${code.toLowerCase()}`);
}

/** A grant's permissions as a request or agreement carries them, with absolute targets. */
function permissionsOf(world: World, code: MotorCode) {
  const spec = MOTOR_GRANTS[code];
  return spec.permissions.map((permission) => ({
    assignee: webid(world, spec.to),
    end: { event: spec.end },
    modes: permission.modes,
    purpose: DPV.ServiceProvision,
    targets: permission.paths.map((path) => alexUrl(world, path)),
  }));
}

/** The motor grants on record, with the state each one's latest consent record gives it. */
export async function motorGrants(world: World): Promise<GrantRecord[]> {
  return (await grantRecords(world)).filter((record) => isMotorCode(record.code));
}

export async function motorGrant(world: World, code: MotorCode): Promise<GrantRecord | undefined> {
  return (await motorGrants(world)).find((record) => record.code === code);
}

/**
 * The standing policy grant P1, written as the wallet writes any grant. Part of the story's set-up
 * (`prepare.ts`): Alex gave it when taking the policy out. Does nothing when it is already active.
 */
export async function ensurePolicyGrant(world: World, time: string): Promise<boolean> {
  const before = await grantRecords(world);
  const policy = motorPolicyUrl(world, "P1");
  if (before.some((record) => record.policy === policy && record.state === "active")) return false;
  const spec = MOTOR_GRANTS.P1;
  const alex = world.fetchAs("alex");
  await putResource(
    alex,
    buildAccessAgreement({
      assignee: webid(world, spec.to),
      assigner: webid(world, "alex"),
      description: spec.description,
      grantCode: "P1",
      iri: policy,
      issued: at(world, time),
      name: spec.name,
      permissions: permissionsOf(world, "P1"),
    }),
  );
  const agreement = new AccessAgreement(policy, await readDataset(alex, policy), DataFactory);
  await writeConsent(world, { agreement, code: "P1", policy }, DPV.ConsentGiven, "given", time);
  await syncAcls(world, before, await grantRecords(world));
  return true;
}

/**
 * The organisation asks: it appends an ODRL request to Alex's inbox, which any signed-in agent may
 * do and nobody but Alex may read. Returns the request's URL.
 */
export function requestClaimGrant(world: World, code: "C1" | "C2", time: string): Promise<string> {
  const spec = MOTOR_GRANTS[code];
  return postResource(
    world.fetchAs(spec.to),
    alexUrl(world, "inbox/"),
    `request-${code.toLowerCase()}`,
    (iri) =>
      buildAccessRequest({
        assignee: webid(world, spec.to),
        assigner: webid(world, "alex"),
        description: spec.description,
        grantCode: code,
        iri,
        issued: at(world, time),
        name: spec.name,
        permissions: permissionsOf(world, code),
      }),
  );
}

/** The request for `code` in Alex's inbox, if it has landed (Alex reads its own inbox). */
export function findClaimRequest(world: World, code: MotorCode): Promise<string | undefined> {
  const alex = world.fetchAs("alex");
  return findMember(alex, alexUrl(world, "inbox/"), async (url) =>
    new AccessRequest(url, await readDataset(alex, url), DataFactory).grantCode === code
      ? url
      : undefined,
  );
}

/** Alex approves a claim request: agreement, consent record and ACL change, as in the mortgage. */
export async function approveClaimGrant(
  world: World,
  requestUrl: string,
  time: string,
): Promise<string> {
  const { code } = await approveRequest(world, requestUrl, time);
  return code;
}

/** The inbox slug of the wallet's copy of an agreement to the organisation. */
export const GRANT_NOTICE_PREFIX = "claim-grant-";

export function isClaimGrantNotice(path: string): boolean {
  const name = path.split("?")[0]?.split("/").filter(Boolean).at(-1) ?? "";
  return name.startsWith(GRANT_NOTICE_PREFIX);
}

/** The wallet tells the organisation: a copy of its agreement, appended to its inbox. */
export async function noticeOfGrant(world: World, code: MotorCode, time: string): Promise<string> {
  const policy = motorPolicyUrl(world, code);
  const alex = world.fetchAs("alex");
  const agreement = new AccessAgreement(policy, await readDataset(alex, policy), DataFactory);
  return postResource(
    alex,
    podUrl(world, MOTOR_GRANTS[code].to, "inbox/"),
    `${GRANT_NOTICE_PREFIX}${code.toLowerCase()}`,
    (iri) =>
      buildAccessAgreement({
        assignee: agreement.assigneeIri,
        assigner: agreement.assignerIri,
        description: agreement.description,
        grantCode: code,
        iri,
        issued: at(world, time),
        name: agreement.name,
        permissions: permissionInits(agreement),
        source: policy,
      }),
  );
}

/** The organisation reads the copy of its agreement from its own inbox. */
export async function readGrantNotice(
  world: World,
  owner: "insurer" | "repairer",
  url: string,
): Promise<AccessAgreement> {
  return new AccessAgreement(url, await readDataset(world.fetchAs(owner), url), DataFactory);
}

/** Alex withdraws a grant. The agreement stays on record; a "withdrawn" consent record is added. */
export function withdrawMotorGrant(world: World, code: MotorCode, time: string): Promise<string[]> {
  return endGrant(world, code, DPV.ConsentWithdrawn, "withdrawn", time);
}

async function anyEndEvidence(world: World): Promise<boolean> {
  for (const evidence of new Set(Object.values(MOTOR_END_EVIDENCE))) {
    const response = await world.fetchAs("alex")(alexUrl(world, evidence), { method: "HEAD" });
    if (response.ok) return true;
  }
  return false;
}

async function hasEnded(world: World, record: GrantRecord): Promise<boolean> {
  for (const permission of record.agreement.permissions) {
    const end = permission.end;
    if (end === undefined || !("event" in end)) continue;
    const evidence = MOTOR_END_EVIDENCE[end.event];
    if (evidence === undefined) continue;
    const response = await world.fetchAs("alex")(alexUrl(world, evidence), { method: "HEAD" });
    if (response.ok) return true;
  }
  return false;
}

/**
 * The wallet applies the motor grants' ends: every active one whose end event has left its
 * evidence in the pod gets an "expired" consent record and loses its access rules. WAC has no
 * expiry of its own. Run as Alex's wallet back office, so the Lens labels it an expiry. Returns
 * the codes that expired.
 */
export async function applyMotorClaimExpiries(world: World, time = "00:05"): Promise<string[]> {
  // The wallet runs this on every write to Alex's inbox, in every demo: while no end event has
  // left its evidence, one HEAD per kind of evidence is all it costs.
  if (!(await anyEndEvidence(world))) return [];
  const expired: string[] = [];
  for (const record of await motorGrants(world)) {
    if (record.state !== "active" || !(await hasEnded(world, record))) continue;
    await endGrant(world, record.code, DPV.ConsentExpired, "expired", time);
    expired.push(record.code);
  }
  return expired;
}

export type { GrantRecord };
