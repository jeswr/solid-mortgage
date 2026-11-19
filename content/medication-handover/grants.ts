// AUTHORED-BY Claude Opus 5.5
/**
 * The four grants of flows.md section 5, on Rosa's pod:
 *
 * - M1 (given at admission): Riverbend General Hospital reads and writes Rosa's health drawers
 *   during the stay. It ends on the afternoon of the discharge day; the wallet applies the end
 *   when Rosa next approves something.
 * - M2: Corner Dispensary reads her medicines and allergies, and records what it supplies.
 * - M3: Larch Lane Family Practice reads and updates her health record.
 * - M4: Alex, her son and carer, reads her medicines.
 *
 * A grant is written as the mortgage writes one (`../mortgage/grants.ts`): an ODRL agreement in
 * `policies/`, a DPV consent record in `consents/`, and the ACL documents recomputed from every
 * agreement on record. Those helpers are written for Alex's pod, so the same steps are repeated
 * here for Rosa's (the pod owner is the only difference). The wallet then tells each grantee by
 * appending a copy of its agreement to the grantee's inbox; a withdrawal is told the same way,
 * with a copy of the "withdrawn" consent record.
 */

import {
  AccessAgreement,
  type AccessModeName,
  AccessRequest,
  buildAccessAgreement,
  buildAccessRequest,
  buildConsentReceipt,
  ConsentReceipt,
  DPV,
  type GrantEnd,
  type PermissionInit,
  permissionInits,
} from "@mortgage/data-model";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import { DataFactory } from "n3";
import { type AclRule, aclDataset, aclTurtle } from "../mortgage/acl.js";
import {
  type GrantRecord,
  type GrantState,
  managedAgents,
  membersOf,
  unmanagedRules,
} from "../mortgage/grants.js";
import {
  at,
  podUrl,
  postResource,
  put,
  putResource,
  readDataset,
  type World,
  webid,
} from "../mortgage/world.js";
import { CARER, DAY, HOLDER } from "./facts.js";

export type { GrantRecord };

/** Rosa's drawers. Flows.md groups them under `health/`; see `MEDICATION_DRAWERS` for why not. */
export const PATHS = Object.freeze({
  allergies: "allergies/",
  consents: "consents/",
  discharge: "discharge/",
  dispenses: "medications/dispenses/",
  inbox: "inbox/",
  medications: "medications/",
  policies: "policies/",
  provenance: "medications/provenance/",
  requests: "medications/requests/",
  summary: "discharge/summary",
});

export const MED_CODES = ["M1", "M2", "M3", "M4"] as const;
export type MedCode = (typeof MED_CODES)[number];

/** Who each grant is for. */
export type Grantee = "hospital" | "pharmacy" | "clinic" | typeof CARER;

export interface MedGrant {
  readonly code: MedCode;
  readonly to: Grantee;
  /** The grant's name, as the consent screen shows it. */
  readonly name: string;
  /** The purpose in Rosa's words. */
  readonly purpose: string;
  /** The scope in a few words, for the wallet's lists. */
  readonly scope: string;
  readonly permissions: readonly { paths: readonly string[]; modes: readonly AccessModeName[] }[];
}

const HEALTH_DRAWERS = [PATHS.medications, PATHS.allergies, PATHS.discharge];

export const MED_GRANTS: Readonly<Record<MedCode, MedGrant>> = Object.freeze({
  M1: {
    code: "M1",
    name: "Riverbend General Hospital keeps my record during my stay",
    permissions: [{ modes: ["Read", "Write"], paths: HEALTH_DRAWERS }],
    purpose: "Care during my hospital stay",
    scope: "Reads and writes medicines, allergies and discharge, during the stay",
    to: "hospital",
  },
  M2: {
    code: "M2",
    name: "Corner Dispensary dispenses my medicines",
    permissions: [
      { modes: ["Read"], paths: [PATHS.medications, PATHS.allergies] },
      { modes: ["Write"], paths: [PATHS.dispenses] },
    ],
    purpose: "Dispensing my medicines",
    scope: "Reads medicines and allergies; records what it supplies",
    to: "pharmacy",
  },
  M3: {
    code: "M3",
    name: "Larch Lane Family Practice keeps my record up to date",
    permissions: [{ modes: ["Read", "Write"], paths: HEALTH_DRAWERS }],
    purpose: "My ongoing care",
    scope: "Reads and updates medicines, allergies and discharge",
    to: "clinic",
  },
  M4: {
    code: "M4",
    name: "Alex can see my medicines",
    permissions: [{ modes: ["Read"], paths: [PATHS.medications] }],
    purpose: "Helping me with my care",
    scope: "Reads medicines, read-only",
    to: CARER,
  },
});

/** The DPV purpose every M grant carries: providing the service (care) Rosa asked for. */
export const PURPOSE = DPV.ServiceProvision;
export const UNTIL_WITHDRAWN = "Until withdrawn";
export const M1_UNTIL_LABEL = "Until the afternoon of discharge";
/** When M1 ends: 14:00 on the discharge day. */
export const M1_END_TIME = "14:00";

export function isMedCode(value: string): value is MedCode {
  return (MED_CODES as readonly string[]).includes(value);
}

export function codeFor(to: Grantee): MedCode {
  const code = MED_CODES.find((candidate) => MED_GRANTS[candidate].to === to);
  if (code === undefined) throw new Error(`no grant for ${to}`);
  return code;
}

const slugOf = (code: string) => code.toLowerCase();

export function rosaUrl(world: Pick<World, "podOrigin">, path = ""): string {
  return podUrl(world, HOLDER, path);
}

export function medPolicyUrl(world: Pick<World, "podOrigin">, code: MedCode): string {
  return rosaUrl(world, `${PATHS.policies}${slugOf(code)}`);
}

function endOf(world: World, code: MedCode): GrantEnd | undefined {
  if (code !== "M1") return undefined;
  return { until: world.calendar.clock(DAY.discharge, M1_END_TIME) };
}

/** A grant's permissions, with absolute targets. */
export function medPermissions(world: World, code: MedCode): PermissionInit[] {
  const spec = MED_GRANTS[code];
  const end = endOf(world, code);
  return spec.permissions.map((permission) => ({
    assignee: webid(world, spec.to),
    modes: permission.modes,
    purpose: PURPOSE,
    targets: permission.paths.map((path) => rosaUrl(world, path)),
    ...(end === undefined ? {} : { end }),
  }));
}

// --- Inbox notices -------------------------------------------------------------------------------

/** Inbox slugs: a request to Rosa, an agreement copy to a grantee, a withdrawal to a grantee. */
export const REQUEST_SLUG_PREFIX = "medication-request-";
export const GRANT_NOTICE_PREFIX = "medication-grant-";
export const WITHDRAWAL_NOTICE_PREFIX = "medication-withdrawn-";

const nameOf = (path: string) => path.split("?")[0]?.split("/").filter(Boolean).at(-1) ?? "";

export function isGrantNotice(path: string): boolean {
  return nameOf(path).startsWith(GRANT_NOTICE_PREFIX);
}
export function isWithdrawalNotice(path: string): boolean {
  return nameOf(path).startsWith(WITHDRAWAL_NOTICE_PREFIX);
}
export function isMedicationRequest(path: string): boolean {
  return nameOf(path).startsWith(REQUEST_SLUG_PREFIX);
}

/**
 * The organisation asks: it appends an ODRL request to Rosa's inbox (any signed-in agent may;
 * only Rosa may read it). Returns the request's URL.
 */
export async function requestMedAccess(world: World, code: MedCode, time: string): Promise<string> {
  const spec = MED_GRANTS[code];
  return postResource(
    world.fetchAs(spec.to),
    rosaUrl(world, PATHS.inbox),
    `${REQUEST_SLUG_PREFIX}${slugOf(code)}`,
    (iri) =>
      buildAccessRequest({
        assignee: webid(world, spec.to),
        assigner: webid(world, HOLDER),
        description: spec.purpose,
        grantCode: code,
        iri,
        issued: at(world, time),
        name: spec.name,
        permissions: medPermissions(world, code),
      }),
  );
}

/** The access requests waiting in Rosa's inbox, read as Rosa. */
export async function pendingRequests(world: World): Promise<AccessRequest[]> {
  const rosa = world.fetchAs(HOLDER);
  const requests: AccessRequest[] = [];
  for (const url of await membersOf(rosa, rosaUrl(world, PATHS.inbox))) {
    if (!isMedicationRequest(url)) continue;
    requests.push(new AccessRequest(url, await readDataset(rosa, url), DataFactory));
  }
  return requests.sort((a, b) => a.grantCode.localeCompare(b.grantCode));
}

// --- Grants on record ----------------------------------------------------------------------------

/** Every M grant on record in Rosa's pod, with the state its latest consent record gives it. */
export async function medGrants(world: World): Promise<GrantRecord[]> {
  const rosa = world.fetchAs(HOLDER);
  const latest = new Map<string, ConsentReceipt>();
  for (const url of await membersOf(rosa, rosaUrl(world, PATHS.consents))) {
    const receipt = new ConsentReceipt(url, await readDataset(rosa, url), DataFactory);
    const policy = receipt.policyIri;
    if (policy === undefined) continue;
    const current = latest.get(policy);
    if (current === undefined || current.issued.getTime() < receipt.issued.getTime()) {
      latest.set(policy, receipt);
    }
  }
  const records: GrantRecord[] = [];
  for (const policy of await membersOf(rosa, rosaUrl(world, PATHS.policies))) {
    const agreement = new AccessAgreement(policy, await readDataset(rosa, policy), DataFactory);
    const receipt = latest.get(policy);
    if (receipt === undefined) continue;
    const state: GrantState =
      receipt.consentStatus === DPV.ConsentGiven
        ? "active"
        : receipt.consentStatus === DPV.ConsentExpired
          ? "expired"
          : "revoked";
    records.push({ agreement, code: agreement.grantCode, policy, since: receipt.issued, state });
  }
  return records.sort((a, b) => a.code.localeCompare(b.code));
}

// --- ACL computation (as `../mortgage/grants.ts`, for Rosa's pod) --------------------------------

interface Rule extends AclRule {
  readonly agent: string;
}

const isContainer = (target: string) => target.endsWith("/");

function targetsOf(records: readonly GrantRecord[]): string[] {
  const targets = new Set<string>();
  for (const record of records) {
    for (const permission of record.agreement.permissions) {
      for (const target of permission.targetIris) targets.add(target);
    }
  }
  return [...targets].sort();
}

function directRules(records: readonly GrantRecord[], target: string): Rule[] {
  const rules: Rule[] = [];
  for (const record of records) {
    if (record.state !== "active") continue;
    for (const permission of record.agreement.permissions) {
      if (!permission.targetIris.has(target)) continue;
      const modes = permission.modes;
      rules.push({
        agent: permission.assigneeIri,
        inheritable: isContainer(target) && (modes.includes("Read") || modes.includes("Write")),
        modes,
      });
    }
  }
  return rules;
}

/** The nearest ACL document wins, so a descendant's document repeats its ancestor's inheritable rules. */
function rulesFor(
  records: readonly GrantRecord[],
  targets: readonly string[],
  target: string,
): Rule[] {
  const ancestor = targets
    .filter((other) => other !== target && isContainer(other) && target.startsWith(other))
    .sort((a, b) => b.length - a.length)[0];
  const inherited =
    ancestor === undefined
      ? []
      : rulesFor(records, targets, ancestor).filter((rule) => rule.inheritable);
  return [...inherited, ...directRules(records, target)];
}

function fingerprint(rules: readonly Rule[]): string {
  return rules
    .map((rule) => `${rule.agent} ${[...rule.modes].sort().join(",")} ${rule.inheritable}`)
    .sort()
    .join("\n");
}

/**
 * Bring Rosa's ACL documents in line with the grants on record, writing only the documents whose
 * rules changed. Targets are written in path order, so `medications/dispenses/` comes last.
 */
export async function syncMedAcls(
  world: World,
  before: readonly GrantRecord[],
  after: readonly GrantRecord[],
): Promise<string[]> {
  const rosa = world.fetchAs(HOLDER);
  const beforeTargets = targetsOf(before);
  const afterTargets = targetsOf(after);
  const managed = managedAgents(before, after);
  const written: string[] = [];
  for (const target of afterTargets) {
    const rules = rulesFor(after, afterTargets, target);
    if (
      beforeTargets.includes(target) &&
      fingerprint(rulesFor(before, beforeTargets, target)) === fingerprint(rules)
    ) {
      continue;
    }
    const aclUrl = `${target}.acl`;
    const owner = webid(world, HOLDER);
    const kept = await unmanagedRules(rosa, podUrl(world, HOLDER, ""), owner, target, managed);
    await put(
      rosa,
      aclUrl,
      await aclTurtle(aclDataset(owner, target, [...rules, ...kept])),
      "text/turtle",
    );
    written.push(aclUrl);
  }
  return written;
}

function consentFor(
  world: World,
  record: { agreement: AccessAgreement; policy: string; code: string; since?: Date },
  status: string,
  suffix: string,
  time: string,
  iri = rosaUrl(world, `${PATHS.consents}${slugOf(record.code)}-${suffix}`),
): ConsentReceipt {
  // A grant's state is its latest consent record, so a new one is always later than the last.
  const asked = at(world, time);
  const issued =
    record.since !== undefined && asked.getTime() <= record.since.getTime()
      ? new Date(record.since.getTime() + 60_000)
      : asked;
  const targets = [
    ...new Set(record.agreement.permissions.flatMap((permission) => [...permission.targetIris])),
  ].sort();
  const [first, ...rest] = targets;
  if (first === undefined) throw new Error(`${record.code} names no resource`);
  return buildConsentReceipt({
    consentStatus: status,
    dataController: record.agreement.assigneeIri,
    dataSubject: webid(world, HOLDER),
    iri,
    issued,
    moreTargets: rest,
    policy: record.policy,
    purpose: record.agreement.permissions[0]?.purposeIri ?? PURPOSE,
    target: first,
  });
}

/** Write a grant's agreement in `policies/` and read it back. */
async function writeAgreement(
  world: World,
  code: MedCode,
  time: string,
  source?: string,
): Promise<AccessAgreement> {
  const rosa = world.fetchAs(HOLDER);
  const spec = MED_GRANTS[code];
  const policy = medPolicyUrl(world, code);
  await putResource(
    rosa,
    buildAccessAgreement({
      assignee: webid(world, spec.to),
      assigner: webid(world, HOLDER),
      description: spec.purpose,
      grantCode: code,
      iri: policy,
      issued: at(world, time),
      name: spec.name,
      permissions: medPermissions(world, code),
      ...(source === undefined ? {} : { source }),
    }),
  );
  return new AccessAgreement(policy, await readDataset(rosa, policy), DataFactory);
}

/** M1, given at admission (the start state, written by `prepare.ts`). */
export async function giveAdmissionGrant(world: World, time: string): Promise<string[]> {
  const before = await medGrants(world);
  const agreement = await writeAgreement(world, "M1", time);
  const policy = medPolicyUrl(world, "M1");
  await putResource(
    world.fetchAs(HOLDER),
    consentFor(world, { agreement, code: "M1", policy }, DPV.ConsentGiven, "given", time),
  );
  return syncMedAcls(world, before, await medGrants(world));
}

export interface MedApproval {
  /** Codes given now. */
  readonly given: MedCode[];
  /** Codes whose end the wallet applied first. */
  readonly expired: MedCode[];
  /** Where each grantee's copy of its agreement landed. */
  readonly notices: string[];
  /** The ACL documents written, in order. */
  readonly acls: string[];
}

/**
 * Rosa approves the waiting requests and adds Alex as her carer, in one press:
 *
 * 1. the wallet first applies any grant whose end has passed (M1, once the stay is over);
 * 2. one agreement and one consent record per new grant (M2 and M3 answer the requests in her
 *    inbox; M4 is Rosa's own);
 * 3. a copy of each agreement to the grantee's inbox;
 * 4. one ACL recomputation for all of it, last, so the step's final request is the ACL change.
 */
export async function approveMedGrants(
  world: World,
  codes: readonly MedCode[],
  time: string,
): Promise<MedApproval> {
  const rosa = world.fetchAs(HOLDER);
  const before = await medGrants(world);
  const now = at(world, time).getTime();
  const expired: MedCode[] = [];
  for (const record of before) {
    if (record.state !== "active" || !isMedCode(record.code)) continue;
    const ends = record.agreement.permissions.some((permission) => {
      const end = permission.end;
      return end !== undefined && "until" in end && end.until.getTime() <= now;
    });
    if (!ends) continue;
    await putResource(rosa, consentFor(world, record, DPV.ConsentExpired, "expired", time));
    expired.push(record.code);
  }
  const requests = await pendingRequests(world);
  const given: { code: MedCode; agreement: AccessAgreement }[] = [];
  for (const code of codes) {
    const policy = medPolicyUrl(world, code);
    if (before.some((record) => record.policy === policy && record.state === "active")) continue;
    const request = requests.find((candidate) => candidate.grantCode === code);
    const agreement = await writeAgreement(world, code, time, request?.value);
    await putResource(
      rosa,
      consentFor(world, { agreement, code, policy }, DPV.ConsentGiven, "given", time),
    );
    given.push({ agreement, code });
  }
  const notices: string[] = [];
  for (const { agreement, code } of given) {
    const policy = medPolicyUrl(world, code);
    notices.push(
      await postResource(
        rosa,
        podUrl(world, MED_GRANTS[code].to, PATHS.inbox),
        `${GRANT_NOTICE_PREFIX}${slugOf(code)}`,
        (iri) =>
          buildAccessAgreement({
            assignee: agreement.assigneeIri,
            assigner: agreement.assignerIri,
            description: agreement.description,
            grantCode: code,
            iri,
            issued: agreement.issued,
            name: agreement.name,
            permissions: permissionInits(agreement),
            source: policy,
          }),
      ),
    );
  }
  const acls = await syncMedAcls(world, before, await medGrants(world));
  return { acls, expired, given: given.map((entry) => entry.code), notices };
}

/**
 * Rosa withdraws a grant: a "withdrawn" consent record, the ACL change, then a copy of the
 * consent record to the grantee's inbox, so its back office learns of it. Returns the ACL
 * documents written and where the notice landed.
 */
export async function withdrawMedGrant(
  world: World,
  code: MedCode,
  time: string,
): Promise<{ acls: string[]; notice: string }> {
  const rosa = world.fetchAs(HOLDER);
  const before = await medGrants(world);
  const record = before.find((candidate) => candidate.code === code);
  if (record === undefined || record.state !== "active") {
    throw new Error(`${code} is not an active grant`);
  }
  const consent = consentFor(world, record, DPV.ConsentWithdrawn, "withdrawn", time);
  await putResource(rosa, consent);
  const acls = await syncMedAcls(world, before, await medGrants(world));
  const notice = await postResource(
    rosa,
    podUrl(world, MED_GRANTS[code].to, PATHS.inbox),
    `${WITHDRAWAL_NOTICE_PREFIX}${slugOf(code)}`,
    (iri) => consentFor(world, record, DPV.ConsentWithdrawn, "withdrawn", time, iri),
  );
  return { acls, notice };
}

/** A grantee reads the copy of its agreement from its own inbox. */
export async function readGrantNotice(
  world: World,
  reader: PodOwner,
  url: string,
): Promise<AccessAgreement> {
  return new AccessAgreement(url, await readDataset(world.fetchAs(reader), url), DataFactory);
}

/** A grantee reads a withdrawal notice from its own inbox. */
export async function readWithdrawalNotice(
  world: World,
  reader: PodOwner,
  url: string,
): Promise<ConsentReceipt> {
  return new ConsentReceipt(url, await readDataset(world.fetchAs(reader), url), DataFactory);
}
