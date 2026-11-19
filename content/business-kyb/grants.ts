// AUTHORED-BY Claude Opus 5.5
/**
 * Northwind's two grants (flows.md section 3):
 *
 * - K1: Alder Bank reads the identity, officer and ownership credentials for customer due
 *   diligence, for one year;
 * - K2: Brackenridge Bank reads the same three for its credit decision, for 90 days.
 *
 * A grant is written exactly as the mortgage writes one (`../mortgage/grants.ts`): the bank
 * appends an ODRL request to the holder's inbox, the wallet approves it as an ODRL agreement in
 * `policies/` and a DPV consent record in `consents/`, and the ACL documents are recomputed from
 * every agreement on record. The mortgage module is written for Alex's pod only; this one takes
 * the holder as a parameter, with the same rules.
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
  permissionInits,
} from "@mortgage/data-model";
import type { HolderId } from "@mortgage/demo-kit/holders";
import type { OrgSlug } from "@mortgage/demo-kit/registry";
import { DataFactory } from "n3";
import { type AclRule, aclDataset, aclTurtle } from "../mortgage/acl.js";
import { membersOf } from "../mortgage/grants.js";
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

export const KYB_GRANT_CODES = ["K1", "K2"] as const;
export type KybGrantCode = (typeof KYB_GRANT_CODES)[number];
export type KybBank = "bank" | "business-lender";

export interface KybGrantSpec {
  readonly code: KybGrantCode;
  readonly to: KybBank;
  readonly name: string;
  readonly description: string;
  /** The purpose in the holder's words (the Lens shows it). */
  readonly purposeText: string;
  readonly purpose: string;
  readonly validDays: number;
  readonly untilLabel: string;
  readonly paths: readonly string[];
  readonly modes: readonly AccessModeName[];
}

/** The register credentials each bank reads. */
export const SHARED_CREDENTIALS = [PATHS.identity, PATHS.officers, PATHS.ownership] as const;

export const KYB_GRANTS: Readonly<Record<KybGrantCode, KybGrantSpec>> = Object.freeze({
  K1: {
    code: "K1",
    description:
      "Alder Bank asks to read Northwind's identity, officer and ownership credentials to open a business account.",
    modes: ["Read"],
    name: "Customer due diligence: business account",
    paths: SHARED_CREDENTIALS,
    purpose: DPV.IdentityVerification,
    purposeText: "Customer due diligence",
    to: "bank",
    untilLabel: "1 year",
    validDays: 365,
  },
  K2: {
    code: "K2",
    description:
      "Brackenridge Bank asks to read Northwind's identity, officer and ownership credentials to decide on a credit line.",
    modes: ["Read"],
    name: "Credit decision: business credit line",
    paths: SHARED_CREDENTIALS,
    purpose: DPV.CreditChecking,
    purposeText: "Credit decision",
    to: "business-lender",
    untilLabel: "90 days",
    validDays: 90,
  },
});

export function codeFor(bank: KybBank): KybGrantCode {
  return bank === "bank" ? "K1" : "K2";
}

export function isKybGrantCode(value: string): value is KybGrantCode {
  return (KYB_GRANT_CODES as readonly string[]).includes(value);
}

const holderUrl = (world: Pick<World, "podOrigin">, path = "", holder: HolderId = HOLDER) =>
  podUrl(world, holder, path);

export function kybPolicyUrl(world: Pick<World, "podOrigin">, code: KybGrantCode): string {
  return holderUrl(world, `policies/${code.toLowerCase()}`);
}

export type GrantState = "active" | "expired" | "revoked";

export interface KybGrantRecord {
  readonly code: string;
  readonly state: GrantState;
  readonly policy: string;
  readonly agreement: AccessAgreement;
  readonly since: Date;
}

// --- Requests ---------------------------------------------------------------------------------

/** The bank's open request in the holder's inbox, if one is there and not yet answered. */
export async function pendingRequest(
  world: World,
  code: KybGrantCode,
): Promise<string | undefined> {
  const holder = world.fetchAs(HOLDER);
  const inbox = holderUrl(world, PATHS.inbox);
  if ((await statusOf(holder, inbox)) !== 200) return undefined;
  // A request an agreement on record names as its source has been answered.
  const answered = new Set(
    (await kybGrantRecords(world)).map((record) => record.agreement.sourceIri),
  );
  for (const url of await membersOf(holder, inbox)) {
    if (!url.split("/").pop()?.startsWith(`request-${code.toLowerCase()}`)) continue;
    if (answered.has(url)) continue;
    const request = new AccessRequest(url, await readDataset(holder, url), DataFactory);
    if (request.grantCode === code) return url;
  }
  return undefined;
}

/**
 * The bank asks: it appends an ODRL request to the holder's inbox (any signed-in agent may add
 * to it; only the holder may read it). Returns the request's URL.
 */
export async function requestKybAccess(
  world: World,
  code: KybGrantCode,
  time = "09:00",
): Promise<string> {
  const spec = KYB_GRANTS[code];
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
        permissions: [
          {
            assignee: webid(world, spec.to),
            end: { until: dateOf(world, world.day + spec.validDays) },
            modes: spec.modes,
            purpose: spec.purpose,
            targets: spec.paths.map((path) => holderUrl(world, path)),
          },
        ],
      }),
  );
}

// --- The grants on record -------------------------------------------------------------------

/** Every grant on record in the holder's pod, with the state its latest consent record gives it. */
export async function kybGrantRecords(world: World): Promise<KybGrantRecord[]> {
  const holder = world.fetchAs(HOLDER);
  const latest = new Map<string, ConsentReceipt>();
  const consents = holderUrl(world, "consents/");
  const policies = holderUrl(world, "policies/");
  if ((await statusOf(holder, policies)) !== 200) return [];
  if ((await statusOf(holder, consents)) === 200) {
    for (const url of await membersOf(holder, consents)) {
      const receipt = new ConsentReceipt(url, await readDataset(holder, url), DataFactory);
      const policy = receipt.policyIri;
      if (policy === undefined) continue;
      const current = latest.get(policy);
      if (current === undefined || current.issued.getTime() < receipt.issued.getTime()) {
        latest.set(policy, receipt);
      }
    }
  }
  const records: KybGrantRecord[] = [];
  for (const policy of await membersOf(holder, policies)) {
    const agreement = new AccessAgreement(policy, await readDataset(holder, policy), DataFactory);
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

// --- ACL computation (the mortgage's rules, for the holder's pod) ----------------------------

interface Rule extends AclRule {
  readonly agent: string;
}

function targetsOf(records: readonly KybGrantRecord[]): string[] {
  const targets = new Set<string>();
  for (const record of records) {
    for (const permission of record.agreement.permissions) {
      for (const target of permission.targetIris) targets.add(target);
    }
  }
  return [...targets].sort();
}

function rulesFor(records: readonly KybGrantRecord[], target: string): Rule[] {
  const rules: Rule[] = [];
  for (const record of records) {
    if (record.state !== "active") continue;
    for (const permission of record.agreement.permissions) {
      if (!permission.targetIris.has(target)) continue;
      rules.push({ agent: permission.assigneeIri, inheritable: false, modes: permission.modes });
    }
  }
  return rules;
}

function fingerprint(rules: readonly Rule[]): string {
  return rules
    .map((rule) => `${rule.agent} ${[...rule.modes].sort().join(",")}`)
    .sort()
    .join("\n");
}

/**
 * Bring the holder's ACL documents in line with the grants on record. Only documents whose rules
 * change are written. Every KYB target is a single resource, so no rule is inherited.
 */
async function syncAcls(
  world: World,
  before: readonly KybGrantRecord[],
  after: readonly KybGrantRecord[],
): Promise<string[]> {
  const holder = world.fetchAs(HOLDER);
  const had = targetsOf(before);
  const written: string[] = [];
  for (const target of targetsOf(after)) {
    if (target.endsWith("/")) throw new Error(`a KYB grant never covers a container: ${target}`);
    const rules = rulesFor(after, target);
    if (had.includes(target) && fingerprint(rulesFor(before, target)) === fingerprint(rules)) {
      continue;
    }
    const aclUrl = `${target}.acl`;
    await put(
      holder,
      aclUrl,
      await aclTurtle(aclDataset(webid(world, HOLDER), target, rules)),
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

export interface KybApproval {
  readonly code: KybGrantCode;
  readonly policy: string;
  readonly consent: string;
  readonly acls: readonly string[];
}

/**
 * The holder approves a request in the wallet: agreement, consent record and ACL change together.
 * The agreement repeats the request's permissions exactly. A request may name only the register
 * credentials of its grant: anything else (a container, an ACL, another drawer) is refused.
 */
export async function approveKybRequest(
  world: World,
  requestUrl: string,
  time = "09:05",
): Promise<KybApproval> {
  const holder = world.fetchAs(HOLDER);
  const request = new AccessRequest(requestUrl, await readDataset(holder, requestUrl), DataFactory);
  const code = request.grantCode;
  if (!isKybGrantCode(code)) throw new Error(`${code} is not a KYB grant`);
  if (request.assignerIri !== webid(world, HOLDER)) {
    throw new Error(`request ${requestUrl} is not addressed to Northwind`);
  }
  const spec = KYB_GRANTS[code];
  const allowed = new Set(spec.paths.map((path) => holderUrl(world, path)));
  for (const permission of request.permissions) {
    if (permission.assigneeIri !== webid(world, spec.to)) {
      throw new Error(`${code} may only be granted to ${spec.to}`);
    }
    if (permission.modes.some((mode) => mode !== "Read")) {
      throw new Error(`${code} grants reading only`);
    }
    for (const target of permission.targetIris) {
      if (!allowed.has(target)) throw new Error(`the wallet never grants access to ${target}`);
    }
  }
  const policy = kybPolicyUrl(world, code);
  const before = await kybGrantRecords(world);
  if (before.some((record) => record.policy === policy && record.state === "active")) {
    throw new Error(`${code} is already active`);
  }
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
  const acls = await syncAcls(world, before, await kybGrantRecords(world));
  return { acls, code, consent, policy };
}

/** The holder withdraws a grant: a "withdrawn" consent record and the ACL change. */
export async function withdrawKybGrant(
  world: World,
  code: KybGrantCode,
  time = "16:00",
): Promise<string[]> {
  const before = await kybGrantRecords(world);
  const record = before.find((candidate) => candidate.code === code);
  if (record === undefined || record.state !== "active") {
    throw new Error(`${code} is not an active grant`);
  }
  await writeConsent(world, record, DPV.ConsentWithdrawn, "withdrawn", time);
  return syncAcls(world, before, await kybGrantRecords(world));
}

/** The organisation a grant goes to. */
export function grantee(code: KybGrantCode): OrgSlug {
  return KYB_GRANTS[code].to;
}
