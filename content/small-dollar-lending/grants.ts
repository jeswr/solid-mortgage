// AUTHORED-BY Claude Opus 5.5
/**
 * Maya's grants (flows.md section 4), written exactly as the mortgage writes Alex's
 * (`../mortgage/grants.ts`): an ODRL agreement in `policies/`, a DPV consent record in
 * `consents/`, and the WAC documents recomputed from every agreement whose latest consent record
 * says "given". The rule computation is the mortgage's, for Maya's pod instead of Alex's: the
 * mortgage module names Alex throughout, so its pod-relative parts are restated here over the
 * same `acl.ts` writer and the same `@solid/object` readers.
 *
 * - S1 to S4: the four issuer slots (identity, income, cash flow, credit summary). Each issuer
 *   gets Append on `credentials/` and Write on the exact resources it issues, and reads nothing.
 * - A1: Alder Bank's pre-qualification includes a credit check. Quillon may read the one
 *   authorisation record; Alder may deliver its decision into `loans/alder/`.
 * - L1: Finchly's application. It reads identity, income and cash flow for 30 days, keeps the
 *   loan documents in `loans/finchly/`, writes the repayment history credential, and Quillon may
 *   read the credit-check authorisation.
 * - L2: Swiftline reads `banking/payout-instruction` once. WAC cannot say "once", so the wallet
 *   also marks the rule one-time with the demo runtime, which closes it after the first read.
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
  type PermissionInit,
  permissionInits,
} from "@mortgage/data-model";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import { DataFactory } from "n3";
import { type AclRule, aclDataset, aclTurtle } from "../mortgage/acl.js";
import { membersOf } from "../mortgage/grants.js";
import {
  at,
  dateOf,
  PodRequestError,
  podUrl,
  postResource,
  put,
  putResource,
  readDataset,
  type World,
  webid,
} from "../mortgage/world.js";
import { MAYA } from "./facts.js";

export const LENDING_GRANT_CODES = ["S1", "S2", "S3", "S4", "A1", "L1", "L2"] as const;
export type LendingGrantCode = (typeof LENDING_GRANT_CODES)[number];

export interface LendingPermissionSpec {
  /** Who may act. Omitted: the grant's main recipient. */
  readonly to?: PodOwner;
  /** Paths in Maya's pod. A trailing slash is a container and covers what is in it. */
  readonly paths: readonly string[];
  readonly modes: readonly AccessModeName[];
}

export interface LendingGrantSpec {
  readonly code: LendingGrantCode;
  readonly to: PodOwner;
  readonly name: string;
  readonly description: string;
  readonly purpose: string;
  /** Days after approval until the grant ends. */
  readonly days: number;
  readonly endLabel: string;
  readonly permissions: readonly LendingPermissionSpec[];
  /** The grant closes after the recipient's first read. */
  readonly oneTime?: true;
}

export const CREDENTIAL_PATHS = Object.freeze({
  cashFlow: "credentials/cash-flow",
  cashFlowAnchor: "credentials/cash-flow-score-anchor",
  creditSummary: "credentials/credit-summary",
  identity: "credentials/identity",
  income: "credentials/employment-income",
  incomeAnchor: "credentials/employment-income-anchor",
  repayment: "credentials/repayment-history",
  returnedPaymentsAnchor: "credentials/returned-payments-anchor",
});

export const DOCUMENT_PATHS = Object.freeze({
  adverseAction: "loans/alder/adverse-action",
  disclosure: "loans/finchly/disclosure",
  payoutInstruction: "banking/payout-instruction",
});

export const AUTHORISATIONS = Object.freeze({
  A1: "consents/a1-credit-report-authorisation",
  L1: "consents/l1-credit-report-authorisation",
});

const slot = (
  code: LendingGrantCode,
  to: PodOwner,
  name: string,
  description: string,
  paths: readonly string[],
): LendingGrantSpec => ({
  code,
  days: 7,
  description,
  endLabel: "Ends after 7 days",
  name,
  permissions: [
    { modes: ["Append"], paths: ["credentials/"] },
    { modes: ["Write"], paths },
  ],
  purpose: DPV.ServiceProvision,
  to,
});

export const LENDING_GRANTS: Readonly<Record<LendingGrantCode, LendingGrantSpec>> = Object.freeze({
  A1: {
    code: "A1",
    days: 30,
    description:
      "Pre-qualify for a personal loan with a credit check by Quillon, and deliver the decision",
    endLabel: "Ends after 30 days",
    name: "Personal loan pre-qualification",
    permissions: [
      { modes: ["Write"], paths: ["loans/alder/"] },
      { modes: ["Read"], paths: [AUTHORISATIONS.A1], to: "bureau" },
    ],
    purpose: DPV.ServiceProvision,
    to: "bank",
  },
  L1: {
    code: "L1",
    days: 30,
    description:
      "Decide and service a $2,000 loan: read identity, income and cash flow, keep the loan documents, report repayments, and a credit check by Quillon",
    endLabel: "Ends after 30 days",
    name: "Loan application",
    permissions: [
      {
        modes: ["Read"],
        paths: [CREDENTIAL_PATHS.identity, CREDENTIAL_PATHS.income, CREDENTIAL_PATHS.cashFlow],
      },
      { modes: ["Read", "Write"], paths: ["loans/finchly/"] },
      { modes: ["Append"], paths: ["credentials/"] },
      { modes: ["Write"], paths: [CREDENTIAL_PATHS.repayment] },
      { modes: ["Read"], paths: [AUTHORISATIONS.L1], to: "bureau" },
    ],
    purpose: DPV.ServiceProvision,
    to: "fintech-lender",
  },
  L2: {
    code: "L2",
    days: 1,
    description: "Pay out loan FL-2048 to my debit card: read the payout instruction, once",
    endLabel: "One read, then closed",
    name: "Payout",
    oneTime: true,
    permissions: [{ modes: ["Read"], paths: [DOCUMENT_PATHS.payoutInstruction] }],
    purpose: DPV.ServiceProvision,
    to: "payout",
  },
  S1: slot("S1", "idv", "Deliver identity credential", "Deliver a verified identity credential", [
    CREDENTIAL_PATHS.identity,
  ]),
  S2: slot(
    "S2",
    "payroll",
    "Deliver employment verification",
    "Deliver a signed statement of employment and income",
    [CREDENTIAL_PATHS.income, CREDENTIAL_PATHS.incomeAnchor],
  ),
  S3: slot(
    "S3",
    "bank",
    "Deliver cash-flow summary",
    "Deliver a signed summary of deposits, balances and returned payments",
    [
      CREDENTIAL_PATHS.cashFlow,
      CREDENTIAL_PATHS.cashFlowAnchor,
      CREDENTIAL_PATHS.returnedPaymentsAnchor,
    ],
  ),
  S4: slot(
    "S4",
    "bureau",
    "Deliver credit summary",
    "Deliver a signed summary of the credit file",
    [CREDENTIAL_PATHS.creditSummary],
  ),
});

export function isLendingGrantCode(value: string): value is LendingGrantCode {
  return (LENDING_GRANT_CODES as readonly string[]).includes(value);
}

/** Paths no request may ever name: the pod root and the drawers that hold the grants. */
const NEVER_GRANTED = ["", "policies/", "inbox/"];

export type GrantState = "active" | "expired" | "revoked";

export interface LendingGrantRecord {
  readonly code: string;
  readonly state: GrantState;
  readonly policy: string;
  readonly agreement: AccessAgreement;
  readonly since: Date;
}

const slugOf = (code: string) => code.toLowerCase();
export const mayaUrl = (world: Pick<World, "podOrigin">, path = "") => podUrl(world, MAYA, path);
const maya = (world: World) => world.fetchAs(MAYA);

export function lendingPolicyUrl(world: Pick<World, "podOrigin">, code: LendingGrantCode): string {
  return mayaUrl(world, `policies/${slugOf(code)}`);
}

export function permissionsOf(world: World, code: LendingGrantCode): PermissionInit[] {
  const spec = LENDING_GRANTS[code];
  const end = { until: dateOf(world, world.day + spec.days) };
  return spec.permissions.map((permission) => ({
    assignee: webid(world, permission.to ?? spec.to),
    end,
    modes: permission.modes,
    purpose: spec.purpose,
    targets: permission.paths.map((path) => mayaUrl(world, path)),
  }));
}

/**
 * The organisation asks: an ODRL request appended to Maya's inbox (any signed-in agent may append,
 * only Maya may read). Returns the request's URL.
 */
export function requestLendingAccess(
  world: World,
  code: LendingGrantCode,
  time: string,
): Promise<string> {
  const spec = LENDING_GRANTS[code];
  return postResource(
    world.fetchAs(spec.to),
    mayaUrl(world, "inbox/"),
    `request-${slugOf(code)}`,
    (iri) =>
      buildAccessRequest({
        assignee: webid(world, spec.to),
        assigner: webid(world, MAYA),
        description: spec.description,
        grantCode: code,
        iri,
        issued: at(world, time),
        name: spec.name,
        permissions: permissionsOf(world, code),
      }),
  );
}

/** Every grant on record in Maya's pod, with the state its latest consent record gives it. */
export async function lendingGrantRecords(world: World): Promise<LendingGrantRecord[]> {
  const fetcher = maya(world);
  const latest = new Map<string, ConsentReceipt>();
  for (const url of await membersOf(fetcher, mayaUrl(world, "consents/"))) {
    const receipt = new ConsentReceipt(url, await readDataset(fetcher, url), DataFactory);
    const policy = receipt.policyIri;
    // A credit-check authorisation is an audit record of its own, not a grant's state.
    if (policy === undefined || receipt.purposeIri === DPV.CreditChecking) continue;
    const current = latest.get(policy);
    if (current === undefined || current.issued.getTime() < receipt.issued.getTime()) {
      latest.set(policy, receipt);
    }
  }
  const records: LendingGrantRecord[] = [];
  for (const policy of await membersOf(fetcher, mayaUrl(world, "policies/"))) {
    const receipt = latest.get(policy);
    if (receipt === undefined) continue;
    const agreement = new AccessAgreement(policy, await readDataset(fetcher, policy), DataFactory);
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

// --- ACL computation (the mortgage's rules, for Maya's pod) ------------------------------------

interface Rule extends AclRule {
  readonly agent: string;
}

const isContainer = (target: string) => target.endsWith("/");

function targetsOf(records: readonly LendingGrantRecord[]): string[] {
  const targets = new Set<string>();
  for (const record of records) {
    for (const permission of record.agreement.permissions) {
      for (const target of permission.targetIris) targets.add(target);
    }
  }
  return [...targets].sort();
}

function directRules(records: readonly LendingGrantRecord[], target: string): Rule[] {
  const rules: Rule[] = [];
  for (const record of records) {
    if (record.state !== "active") continue;
    for (const permission of record.agreement.permissions) {
      if (!permission.targetIris.has(target)) continue;
      const modes = permission.modes;
      rules.push({
        agent: permission.assigneeIri,
        // Append on a container lets an agent add a member; it says nothing about the members.
        inheritable: isContainer(target) && (modes.includes("Read") || modes.includes("Write")),
        modes,
      });
    }
  }
  return rules;
}

/** The nearest ACL document replaces the ones above it, so inheritable rules are repeated. */
function rulesFor(
  records: readonly LendingGrantRecord[],
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

/** Rewrite only the ACL documents whose rules differ between `before` and `after`. */
export async function syncLendingAcls(
  world: World,
  before: readonly LendingGrantRecord[],
  after: readonly LendingGrantRecord[],
): Promise<string[]> {
  const beforeTargets = targetsOf(before);
  const afterTargets = targetsOf(after);
  const written: string[] = [];
  for (const target of afterTargets) {
    const rules = rulesFor(after, afterTargets, target);
    const had = beforeTargets.includes(target);
    if (had && fingerprint(rulesFor(before, beforeTargets, target)) === fingerprint(rules)) {
      continue;
    }
    const aclUrl = `${target}.acl`;
    await put(
      maya(world),
      aclUrl,
      await aclTurtle(aclDataset(webid(world, MAYA), target, rules)),
      "text/turtle",
    );
    written.push(aclUrl);
  }
  return written;
}

// --- The wallet's actions ----------------------------------------------------------------------

function assertGrantable(world: World, request: AccessRequest): void {
  const root = mayaUrl(world);
  for (const permission of request.permissions) {
    for (const target of permission.targetIris) {
      const path = target.startsWith(root) ? target.slice(root.length) : undefined;
      if (path === undefined || NEVER_GRANTED.includes(path) || path.endsWith(".acl")) {
        throw new Error(`the wallet never grants access to ${target}`);
      }
    }
  }
}

async function writeConsent(
  world: World,
  record: { agreement: AccessAgreement; policy: string; code: string; since?: Date },
  status: string,
  suffix: string,
  time: string,
): Promise<string> {
  // A grant's state is its latest consent record, so a new record is always later than the last.
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
    maya(world),
    buildConsentReceipt({
      consentStatus: status,
      dataController: record.agreement.assigneeIri,
      dataSubject: webid(world, MAYA),
      iri: mayaUrl(world, `consents/${slugOf(record.code)}-${suffix}`),
      issued,
      moreTargets: rest,
      policy: record.policy,
      purpose: record.agreement.permissions[0]?.purposeIri ?? DPV.ServiceProvision,
      target: first,
    }),
  );
}

/** Maya's credit-check authorisation for one lender: a consent record Quillon may read. */
async function writeAuthorisation(
  world: World,
  code: "A1" | "L1",
  lender: PodOwner,
  time: string,
): Promise<string> {
  return putResource(
    maya(world),
    buildConsentReceipt({
      consentStatus: DPV.ConsentGiven,
      dataController: webid(world, lender),
      dataSubject: webid(world, MAYA),
      iri: mayaUrl(world, AUTHORISATIONS[code]),
      issued: at(world, time),
      policy: lendingPolicyUrl(world, code),
      purpose: DPV.CreditChecking,
      target: webid(world, "bureau"),
    }),
  );
}

export interface LendingApproval {
  readonly code: string;
  readonly policy: string;
  readonly consent: string;
  readonly acls: readonly string[];
}

/** The demo runtime's one-time grant service (no pod can be called `.runtime`). */
export function oneTimeServiceUrl(world: Pick<World, "podOrigin">): string {
  return new URL("/pods/.runtime/one-time-grants", world.podOrigin).href;
}

/**
 * Maya approves a request in her wallet: agreement, consent record and ACL change together. The
 * agreement repeats the request's permissions exactly. A credit-check authorisation is written
 * before the ACL change for A1 and L1; a one-time grant is marked one-time before the ACL change
 * opens it, so there is no moment at which it could be read twice.
 */
export async function approveLendingRequest(
  world: World,
  requestUrl: string,
  time: string,
): Promise<LendingApproval> {
  const fetcher = maya(world);
  const request = new AccessRequest(
    requestUrl,
    await readDataset(fetcher, requestUrl),
    DataFactory,
  );
  if (request.assignerIri !== webid(world, MAYA)) {
    throw new Error(`request ${requestUrl} is not addressed to Maya`);
  }
  assertGrantable(world, request);
  const code = request.grantCode;
  if (!isLendingGrantCode(code)) throw new Error(`${code} is not a grant this wallet knows`);
  const spec = LENDING_GRANTS[code];
  if (request.assigneeIri !== webid(world, spec.to)) {
    throw new Error(`${code} was asked for by someone other than ${spec.to}`);
  }
  const policy = lendingPolicyUrl(world, code);
  const before = await lendingGrantRecords(world);
  if (before.some((record) => record.policy === policy && record.state === "active")) {
    throw new Error(`${code} is already active`);
  }
  await putResource(
    fetcher,
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
  const agreement = new AccessAgreement(policy, await readDataset(fetcher, policy), DataFactory);
  const consent = await writeConsent(
    world,
    { agreement, code, policy },
    DPV.ConsentGiven,
    "given",
    time,
  );
  if (code === "A1" || code === "L1") await writeAuthorisation(world, code, spec.to, time);
  if (spec.oneTime) {
    for (const permission of agreement.permissions) {
      for (const resource of permission.targetIris) {
        const response = await fetcher(oneTimeServiceUrl(world), {
          body: JSON.stringify({ agent: permission.assigneeIri, resource }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        if (!response.ok) {
          throw new PodRequestError("POST", oneTimeServiceUrl(world), response.status);
        }
      }
    }
  }
  const after = await lendingGrantRecords(world);
  return { acls: await syncLendingAcls(world, before, after), code, consent, policy };
}

/** The organisation asks and Maya approves, in one step (the issuer pages and the lenders). */
export async function askAndApprove(
  world: World,
  code: LendingGrantCode,
  times: readonly [string, string],
): Promise<LendingApproval | undefined> {
  const active = (await lendingGrantRecords(world)).some(
    (record) => record.code === code && record.state === "active",
  );
  if (active) return undefined;
  const request = await requestLendingAccess(world, code, times[0]);
  return approveLendingRequest(world, request, times[1]);
}

/** Is grant `code` active now? */
export async function isActive(world: World, code: LendingGrantCode): Promise<boolean> {
  return (await lendingGrantRecords(world)).some(
    (record) => record.code === code && record.state === "active",
  );
}

/**
 * End an active grant: a "withdrawn" or "expired" consent record. With `syncAcl` the ACL documents
 * follow; without it the caller knows they already do (a one-time grant the runtime closed).
 */
export async function endLendingGrant(
  world: World,
  code: LendingGrantCode,
  status: string,
  suffix: string,
  time: string,
  syncAcl = true,
): Promise<string[]> {
  const before = await lendingGrantRecords(world);
  const record = before.find((candidate) => candidate.code === code);
  if (record === undefined || record.state !== "active") {
    throw new Error(`${code} is not an active grant`);
  }
  await writeConsent(world, record, status, suffix, time);
  if (!syncAcl) return [];
  return syncLendingAcls(world, before, await lendingGrantRecords(world));
}

/** The inbox slug of the wallet's withdrawal notice to an organisation. */
export const WITHDRAWAL_SLUG_PREFIX = "grant-withdrawn-";

export function isWithdrawalNotice(path: string): boolean {
  const name = path.split("?")[0]?.split("/").filter(Boolean).at(-1) ?? "";
  return name.startsWith(WITHDRAWAL_SLUG_PREFIX);
}

/**
 * Maya withdraws a grant: the consent record, the ACL change, then a copy of the withdrawal in
 * the organisation's inbox, so its back office learns the access has ended.
 */
export async function withdrawLendingGrant(
  world: World,
  code: LendingGrantCode,
  time: string,
): Promise<{ acls: string[]; notice: string }> {
  const acls = await endLendingGrant(world, code, DPV.ConsentWithdrawn, "withdrawn", time);
  const fetcher = maya(world);
  const url = mayaUrl(world, `consents/${slugOf(code)}-withdrawn`);
  const receipt = new ConsentReceipt(url, await readDataset(fetcher, url), DataFactory);
  const spec = LENDING_GRANTS[code];
  const [first, ...rest] = [...receipt.targetIris].sort();
  if (first === undefined) throw new Error(`${code}'s withdrawal names no resource`);
  const notice = await postResource(
    fetcher,
    podUrl(world, spec.to, "inbox/"),
    `${WITHDRAWAL_SLUG_PREFIX}${slugOf(code)}`,
    (iri) =>
      buildConsentReceipt({
        consentStatus: receipt.consentStatus,
        dataController: receipt.dataControllerIri,
        dataSubject: receipt.dataSubjectIri,
        iri,
        issued: receipt.issued,
        moreTargets: rest,
        policy: lendingPolicyUrl(world, code),
        purpose: receipt.purposeIri ?? DPV.ServiceProvision,
        target: first,
      }),
  );
  return { acls, notice };
}
