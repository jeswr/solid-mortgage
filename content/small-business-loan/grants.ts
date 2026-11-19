// AUTHORED-BY Claude Opus 5.5
/**
 * Northwind's three grants for the loan (flows.md section 6):
 *
 * - S1: Alder Bank may WRITE `finance/cash-flow` (one resource, no read), to keep it up to date;
 * - S2: Brackenridge Bank may READ the identity, ownership and tax compliance credentials and the
 *   cash flow record, for a credit decision, for 30 days; and write its decision, the loan terms
 *   and the notice of action taken into `loans/brackenridge/`;
 * - S3: Brackenridge may READ the cash flow record once a quarter (ODRL `timeInterval` P3M) while
 *   the loan is open (ends on `mort:GrantEnd-LoanRepaid`), for covenant monitoring.
 *
 * Written exactly as demo 3 writes its K grants (`../business-kyb/grants.ts`): an ODRL request in
 * Northwind's inbox, an ODRL agreement in `policies/` and a DPV consent record in `consents/` when
 * the wallet approves, and the ACL documents recomputed from EVERY agreement on record in the pod
 * (demo 3's included, since S2 and K2 share targets). Every target is a single resource, so no
 * rule is inherited and demo 3's own recompute stays valid.
 *
 * WAC lets an agent with Write on a resource replace it, but creating it needs Write on the
 * container too. So the wallet reserves each resource a write grant covers (an empty document)
 * before it grants the write: Alder and Brackenridge can fill exactly those, and nothing else.
 */

import {
  AccessAgreement,
  type AccessModeName,
  AccessRequest,
  buildAccessAgreement,
  buildAccessRequest,
  buildConsentReceipt,
  DPV,
  MORT,
  type PermissionInit,
  permissionInits,
} from "@mortgage/data-model";
import type { OrgSlug } from "@mortgage/demo-kit/registry";
import { DataFactory } from "n3";
import { type KybGrantRecord, kybGrantRecords } from "../business-kyb/grants.js";
import { type AclRule, aclDataset, aclTurtle, SIGNED_IN_APPEND } from "../mortgage/acl.js";
import { managedAgents, membersOf, unmanagedRules } from "../mortgage/grants.js";
import {
  at,
  dateOf,
  podUrl,
  postResource,
  put,
  putResource,
  readDataset,
  statusOf,
  type World,
  webid,
} from "../mortgage/world.js";
import { HOLDER, PATHS } from "./facts.js";

export const LOAN_GRANT_CODES = ["S1", "S2", "S3"] as const;
export type LoanGrantCode = (typeof LOAN_GRANT_CODES)[number];

export interface LoanPermissionSpec {
  readonly paths: readonly string[];
  readonly modes: readonly AccessModeName[];
}

export interface LoanGrantSpec {
  readonly code: LoanGrantCode;
  readonly to: Extract<OrgSlug, "bank" | "business-lender">;
  readonly name: string;
  readonly description: string;
  /** The purpose in the holder's words (the Lens shows it). */
  readonly purposeText: string;
  readonly purpose: string;
  /** A fixed term in days, or an end event. */
  readonly validDays?: number;
  readonly endEvent?: string;
  /** A recurring use, as an `xsd:duration`. */
  readonly interval?: string;
  readonly untilLabel: string;
  readonly permissions: readonly LoanPermissionSpec[];
  /** Resources the wallet reserves (creates empty) before the grant, so a write can fill them. */
  readonly reserve: readonly string[];
}

/** What S2 lets Brackenridge read. */
export const APPLICATION_READS = [
  PATHS.identity,
  PATHS.ownership,
  PATHS.tax,
  PATHS.cashFlow,
] as const;
/** What S2 lets Brackenridge write back. */
export const DELIVERIES = [PATHS.decision, PATHS.terms, PATHS.notice] as const;

export const LOAN_GRANTS: Readonly<Record<LoanGrantCode, LoanGrantSpec>> = Object.freeze({
  S1: {
    code: "S1",
    description:
      "Alder Bank asks to keep a record of Northwind's operating account cash flow up to date in Northwind's pod. It may write that one record and read nothing.",
    name: "Keep my cash flow record up to date",
    permissions: [{ modes: ["Write"], paths: [PATHS.cashFlow] }],
    purpose: DPV.ServiceProvision,
    purposeText: "Keep my pod up to date",
    reserve: [PATHS.cashFlow],
    to: "bank",
    untilLabel: "until withdrawn",
  },
  S2: {
    code: "S2",
    description:
      "Brackenridge Bank asks to read Northwind's identity, ownership, tax compliance and cash flow to decide on an equipment loan, and to write its decision back.",
    name: "Credit decision: equipment loan",
    permissions: [
      { modes: ["Read"], paths: APPLICATION_READS },
      { modes: ["Read", "Write"], paths: DELIVERIES },
    ],
    purpose: DPV.CreditChecking,
    purposeText: "Credit decision",
    reserve: DELIVERIES,
    to: "business-lender",
    untilLabel: "30 days",
    validDays: 30,
  },
  S3: {
    code: "S3",
    description:
      "Brackenridge Bank asks to read Northwind's cash flow once a quarter, while the loan is open, to test its covenants.",
    endEvent: MORT.GrantEnd_LoanRepaid,
    interval: "P3M",
    name: "Covenant monitoring: quarterly cash flow",
    permissions: [{ modes: ["Read"], paths: [PATHS.cashFlow] }],
    purpose: DPV.CreditChecking,
    purposeText: "Covenant monitoring",
    reserve: [],
    to: "business-lender",
    untilLabel: "quarterly, until repaid",
  },
});

export function isLoanGrantCode(value: string): value is LoanGrantCode {
  return (LOAN_GRANT_CODES as readonly string[]).includes(value);
}

const holderUrl = (world: Pick<World, "podOrigin">, path = "") => podUrl(world, HOLDER, path);

export function loanPolicyUrl(world: Pick<World, "podOrigin">, code: LoanGrantCode): string {
  return holderUrl(world, `policies/${code.toLowerCase()}`);
}

/** The permissions of a grant, made on the current day. */
export function permissionsOf(world: World, code: LoanGrantCode): PermissionInit[] {
  const spec = LOAN_GRANTS[code];
  const assignee = webid(world, spec.to);
  const end =
    spec.validDays !== undefined
      ? { until: dateOf(world, world.day + spec.validDays) }
      : spec.endEvent !== undefined
        ? { event: spec.endEvent }
        : undefined;
  return spec.permissions.map((permission) => ({
    assignee,
    modes: permission.modes,
    purpose: spec.purpose,
    targets: permission.paths.map((path) => holderUrl(world, path)),
    ...(end === undefined ? {} : { end }),
    ...(spec.interval === undefined ? {} : { interval: spec.interval }),
  }));
}

export type LoanGrantRecord = KybGrantRecord;

/** Every grant on record in Northwind's pod (demo 3's too), with its latest consent state. */
export const grantRecords = (world: World): Promise<LoanGrantRecord[]> => kybGrantRecords(world);

/** The record of one loan grant, if Northwind ever approved it. */
export async function loanGrant(
  world: World,
  code: LoanGrantCode,
): Promise<LoanGrantRecord | undefined> {
  const policy = loanPolicyUrl(world, code);
  return (await grantRecords(world)).find((record) => record.policy === policy);
}

// --- Requests ---------------------------------------------------------------------------------

/** Northwind's inbox exists and any signed-in agent may add to it. */
export async function ensureInbox(world: World): Promise<void> {
  const holder = world.fetchAs(HOLDER);
  const inbox = holderUrl(world, PATHS.inbox);
  if ((await statusOf(holder, inbox)) === 200) return;
  await put(holder, inbox, "", "text/turtle");
  await put(
    holder,
    `${inbox}.acl`,
    await aclTurtle(aclDataset(webid(world, HOLDER), inbox, [SIGNED_IN_APPEND])),
    "text/turtle",
  );
}

/** The organisation's open request in the inbox, if one is there and not yet answered. */
export async function pendingRequest(
  world: World,
  code: LoanGrantCode,
): Promise<string | undefined> {
  const holder = world.fetchAs(HOLDER);
  const inbox = holderUrl(world, PATHS.inbox);
  if ((await statusOf(holder, inbox)) !== 200) return undefined;
  const answered = new Set((await grantRecords(world)).map((record) => record.agreement.sourceIri));
  for (const url of await membersOf(holder, inbox)) {
    if (!url.split("/").pop()?.startsWith(`request-${code.toLowerCase()}`)) continue;
    if (answered.has(url)) continue;
    const request = new AccessRequest(url, await readDataset(holder, url), DataFactory);
    if (request.grantCode === code) return url;
  }
  return undefined;
}

/** The organisation asks: an ODRL request appended to Northwind's inbox. Returns its URL. */
export async function requestLoanAccess(
  world: World,
  code: LoanGrantCode,
  time = "09:00",
): Promise<string> {
  const spec = LOAN_GRANTS[code];
  await ensureInbox(world);
  return postResource(
    world.fetchAs(spec.to),
    holderUrl(world, PATHS.inbox),
    `request-${code.toLowerCase()}`,
    (iri) =>
      buildAccessRequest({
        assignee: webid(world, spec.to),
        assigner: webid(world, HOLDER),
        description: spec.description,
        grantCode: code,
        iri,
        issued: at(world, time),
        name: spec.name,
        permissions: permissionsOf(world, code),
      }),
  );
}

/** The request waiting in the inbox, or a new one the organisation sends now. */
export async function ensureLoanRequest(
  world: World,
  code: LoanGrantCode,
  time = "09:00",
): Promise<string> {
  return (await pendingRequest(world, code)) ?? requestLoanAccess(world, code, time);
}

// --- ACLs ---------------------------------------------------------------------------------------

function targetsOf(records: readonly LoanGrantRecord[]): string[] {
  const targets = new Set<string>();
  for (const record of records) {
    for (const permission of record.agreement.permissions) {
      for (const target of permission.targetIris) targets.add(target);
    }
  }
  return [...targets].sort();
}

function rulesFor(records: readonly LoanGrantRecord[], target: string): AclRule[] {
  const rules: AclRule[] = [];
  for (const record of records) {
    if (record.state !== "active") continue;
    for (const permission of record.agreement.permissions) {
      if (!permission.targetIris.has(target)) continue;
      rules.push({ agent: permission.assigneeIri, inheritable: false, modes: permission.modes });
    }
  }
  return rules;
}

function fingerprint(rules: readonly AclRule[]): string {
  return rules
    .map((rule) => `${rule.agent} ${[...rule.modes].sort().join(",")}`)
    .sort()
    .join("\n");
}

/** Bring the ACL documents in line with every grant on record; write only those that change. */
async function syncAcls(
  world: World,
  before: readonly LoanGrantRecord[],
  after: readonly LoanGrantRecord[],
): Promise<string[]> {
  const holder = world.fetchAs(HOLDER);
  const had = targetsOf(before);
  const managed = managedAgents(before, after);
  const written: string[] = [];
  for (const target of targetsOf(after)) {
    if (target.endsWith("/")) throw new Error(`a loan grant never covers a container: ${target}`);
    const rules = rulesFor(after, target);
    if (had.includes(target) && fingerprint(rulesFor(before, target)) === fingerprint(rules)) {
      continue;
    }
    const aclUrl = `${target}.acl`;
    const owner = webid(world, HOLDER);
    const kept = await unmanagedRules(holder, holderUrl(world), owner, target, managed);
    await put(
      holder,
      aclUrl,
      await aclTurtle(aclDataset(owner, target, [...rules, ...kept])),
      "text/turtle",
    );
    written.push(aclUrl);
  }
  return written;
}

async function writeConsent(
  world: World,
  record: { agreement: AccessAgreement; policy: string; code: string; since?: Date },
  status: string,
  suffix: string,
  time: string,
): Promise<string> {
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
  return putResource(
    world.fetchAs(HOLDER),
    buildConsentReceipt({
      consentStatus: status,
      dataController: record.agreement.assigneeIri,
      dataSubject: webid(world, HOLDER),
      iri: holderUrl(world, `consents/${record.code.toLowerCase()}-${suffix}`),
      issued,
      moreTargets: rest,
      policy: record.policy,
      purpose: record.agreement.permissions[0]?.purposeIri ?? DPV.ServiceProvision,
      target: first,
    }),
  );
}

/** Create each resource empty unless it exists, and its container first. */
async function reserve(world: World, paths: readonly string[]): Promise<string[]> {
  const holder = world.fetchAs(HOLDER);
  const made: string[] = [];
  for (const path of paths) {
    const url = holderUrl(world, path);
    if ((await statusOf(holder, url)) === 200) continue;
    const segments = path.split("/").slice(0, -1);
    for (let depth = 1; depth <= segments.length; depth += 1) {
      const container = holderUrl(world, `${segments.slice(0, depth).join("/")}/`);
      if ((await statusOf(holder, container)) !== 200)
        await put(holder, container, "", "text/turtle");
    }
    await put(holder, url, "", "text/turtle");
    made.push(url);
  }
  return made;
}

export interface LoanApproval {
  readonly code: LoanGrantCode;
  readonly policy: string;
  readonly consent: string;
  readonly acls: readonly string[];
  readonly reserved: readonly string[];
}

/**
 * Northwind approves a request in the wallet: reservations, agreement, consent record and ACL
 * change together. A request may name only what its grant names, with the grant's modes, for the
 * grant's organisation: anything else is refused.
 */
export async function approveLoanRequest(
  world: World,
  requestUrl: string,
  time = "09:05",
): Promise<LoanApproval> {
  const holder = world.fetchAs(HOLDER);
  const request = new AccessRequest(requestUrl, await readDataset(holder, requestUrl), DataFactory);
  const code = request.grantCode;
  if (!isLoanGrantCode(code)) throw new Error(`${code} is not a loan grant`);
  if (request.assignerIri !== webid(world, HOLDER)) {
    throw new Error(`request ${requestUrl} is not addressed to Northwind`);
  }
  const spec = LOAN_GRANTS[code];
  const allowed = new Map<string, Set<AccessModeName>>();
  for (const permission of spec.permissions) {
    for (const path of permission.paths) {
      allowed.set(holderUrl(world, path), new Set(permission.modes));
    }
  }
  for (const permission of request.permissions) {
    if (permission.assigneeIri !== webid(world, spec.to)) {
      throw new Error(`${code} may only be granted to ${spec.to}`);
    }
    for (const target of permission.targetIris) {
      const modes = allowed.get(target);
      if (modes === undefined) throw new Error(`the wallet never grants access to ${target}`);
      for (const mode of permission.modes) {
        if (!modes.has(mode)) throw new Error(`${code} never grants ${mode} on ${target}`);
      }
    }
    if (permission.interval !== spec.interval) {
      throw new Error(`${code} must say how often it is used: ${spec.interval ?? "no interval"}`);
    }
  }
  const policy = loanPolicyUrl(world, code);
  const before = await grantRecords(world);
  if (before.some((record) => record.policy === policy && record.state === "active")) {
    throw new Error(`${code} is already active`);
  }
  const reserved = await reserve(world, spec.reserve);
  await putResource(
    holder,
    buildAccessAgreement({
      assignee: request.assigneeIri,
      assigner: request.assignerIri,
      description: request.description,
      grantCode: code,
      iri: policy,
      issued: at(world, time),
      name: request.name,
      permissions: permissionInits(request),
      source: requestUrl,
    }),
  );
  const agreement = new AccessAgreement(policy, await readDataset(holder, policy), DataFactory);
  const consent = await writeConsent(
    world,
    { agreement, code, policy },
    DPV.ConsentGiven,
    "given",
    time,
  );
  const acls = await syncAcls(world, before, await grantRecords(world));
  return { acls, code, consent, policy, reserved };
}

/** Northwind withdraws a grant: a "withdrawn" consent record and the ACL change. */
export async function withdrawLoanGrant(
  world: World,
  code: LoanGrantCode,
  time = "16:00",
): Promise<string[]> {
  const before = await grantRecords(world);
  const record = before.find((candidate) => candidate.policy === loanPolicyUrl(world, code));
  if (record === undefined || record.state !== "active") {
    throw new Error(`${code} is not an active grant`);
  }
  await writeConsent(world, record, DPV.ConsentWithdrawn, "withdrawn", time);
  return syncAcls(world, before, await grantRecords(world));
}

/**
 * Northwind's back office ends every loan grant whose fixed term has run out by `time` on the
 * world's day: an "expired" consent record and the ACL change. Returns the codes it ended.
 */
export async function expireLoanGrants(world: World, time = "00:05"): Promise<LoanGrantCode[]> {
  const now = at(world, time).getTime();
  const ended: LoanGrantCode[] = [];
  let before = await grantRecords(world);
  for (const code of LOAN_GRANT_CODES) {
    const record = before.find((candidate) => candidate.policy === loanPolicyUrl(world, code));
    if (record === undefined || record.state !== "active") continue;
    const ends = record.agreement.permissions.map((permission) => permission.end);
    const until = ends.find((end) => end !== undefined && "until" in end);
    if (until === undefined || !("until" in until) || until.until.getTime() > now) continue;
    await writeConsent(world, record, DPV.ConsentExpired, "expired", time);
    const after = await grantRecords(world);
    await syncAcls(world, before, after);
    before = after;
    ended.push(code);
  }
  return ended;
}

/** The organisation a grant goes to. */
export function grantee(code: LoanGrantCode): OrgSlug {
  return LOAN_GRANTS[code].to;
}
