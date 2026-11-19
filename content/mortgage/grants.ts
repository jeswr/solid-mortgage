// AUTHORED-BY Claude Fable 5.2
/**
 * The eight grants of design.md section b.4, and the wallet's side of them.
 *
 * A grant is three things the wallet writes together:
 *
 * 1. an ODRL agreement in `policies/` (scope, purpose, end, onward recipients),
 * 2. a DPV consent record in `consents/` (the audit entry), and
 * 3. the WAC change that enforces it.
 *
 * The ACL documents are never edited by hand: `syncAcls` recomputes each one from the agreements
 * whose latest consent record says "given". Revoking or expiring a grant is therefore one new
 * consent record and a recomputation. WAC has no expiry of its own; `applyExpiries` is the
 * wallet removing access when an agreement's end is reached.
 */

import { parseRdf } from "@jeswr/fetch-rdf";
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
  MORT,
  type PermissionInit,
  permissionInits,
} from "@mortgage/data-model";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import { NamedNodeAs, NamedNodeFrom, SetFrom, TermWrapper } from "@rdfjs/wrapper";
import { AclResource, type Authorization } from "@solid/object";
import { DataFactory } from "n3";
import { ACL, type AclMode, type AclRule, aclDataset, aclTurtle } from "./acl.js";
import { DAY } from "./facts.js";
import {
  at,
  dateOf,
  PodRequestError,
  podUrl,
  postResource,
  putResource,
  readDataset,
  type World,
  webid,
} from "./world.js";

export const GRANT_CODES = ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"] as const;
export type GrantCode = (typeof GRANT_CODES)[number];

/** When a grant ends, before it is turned into a date or an event IRI. */
export type GrantEndSpec =
  | { readonly daysAfterApproval: number }
  | { readonly daysAfterClosing: number }
  | { readonly event: string };

export interface GrantPermissionSpec {
  /** Who may act. Omitted: the grant's main recipient. Present: an onward recipient. */
  readonly to?: PodOwner;
  /** Paths in Alex's pod. A trailing slash is a container and covers what is in it. */
  readonly paths: readonly string[];
  readonly modes: readonly AccessModeName[];
}

export interface GrantSpec {
  readonly code: GrantCode;
  readonly to: PodOwner;
  /** The consent screen's title. */
  readonly name: string;
  /** The purpose in plain words, shown on the consent screen and kept in the policy. */
  readonly description: string;
  /** The DPV purpose IRI. */
  readonly purpose: string;
  readonly end: GrantEndSpec;
  /** What the consent screen says about the end. */
  readonly endLabel: string;
  readonly permissions: readonly GrantPermissionSpec[];
}

/**
 * The slot pattern for issuers (G1 to G3). `acl:Append` on `credentials/` alone would let an
 * issuer add resources under names the server picks and never replace one. Each issuer instead
 * gets Append on the container (needed to create a member) and Write on the exact credential
 * resources it issues. It can create and replace those and nothing else, and it cannot read
 * anything, including what it wrote.
 */
export const GRANTS: Readonly<Record<GrantCode, GrantSpec>> = Object.freeze({
  G1: {
    code: "G1",
    description:
      "Deliver a signed employment and income verification, and refresh it if Juniper asks",
    end: { event: MORT.GrantEnd_Closing },
    endLabel: "Ends at closing",
    name: "Deliver employment verification",
    permissions: [
      { modes: ["Append"], paths: ["credentials/"] },
      {
        modes: ["Write"],
        paths: ["credentials/employment-income", "credentials/employment-income-anchor"],
      },
    ],
    purpose: DPV.ServiceProvision,
    to: "payroll",
  },
  G2: {
    code: "G2",
    description: "Deliver a signed summary of account balances",
    end: { daysAfterApproval: 7 },
    endLabel: "Ends after 7 days",
    name: "Deliver asset verification",
    permissions: [
      { modes: ["Append"], paths: ["credentials/"] },
      { modes: ["Write"], paths: ["credentials/assets"] },
    ],
    purpose: DPV.ServiceProvision,
    to: "bank",
  },
  G3: {
    code: "G3",
    description: "Deliver a signed summary of the credit file",
    end: { daysAfterApproval: 7 },
    endLabel: "Ends after 7 days",
    name: "Deliver credit summary",
    permissions: [
      { modes: ["Append"], paths: ["credentials/"] },
      {
        modes: ["Write"],
        paths: ["credentials/credit-summary", "credentials/credit-summary-anchor"],
      },
    ],
    purpose: DPV.ServiceProvision,
    to: "bureau",
  },
  G4: {
    code: "G4",
    description:
      "Mortgage origination and underwriting, including a credit report from Quillon and automated underwriting by Castellan",
    end: { daysAfterClosing: 60 },
    endLabel: "Ends 60 days after closing (quality control)",
    name: "Mortgage application",
    permissions: [
      {
        modes: ["Read"],
        paths: ["profile/", "identity/", "credentials/", "property/", "insurance/"],
      },
      // Juniper reads back what it delivered (the Loan Estimate, the Closing Disclosure).
      { modes: ["Read", "Write"], paths: ["mortgage/juniper/"] },
      {
        modes: ["Read"],
        paths: [
          "credentials/employment-income",
          "credentials/assets",
          "credentials/credit-summary",
        ],
        to: "aus",
      },
      { modes: ["Read"], paths: ["consents/g4-credit-report-authorisation"], to: "bureau" },
    ],
    purpose: DPV.ServiceProvision,
    to: "lender",
  },
  G5: {
    code: "G5",
    description: "Appraise 14 Larch Lane for Juniper Home Loans",
    end: { event: MORT.GrantEnd_ReportDelivered },
    endLabel: "Ends when the report is delivered",
    name: "Appraisal",
    permissions: [
      {
        modes: ["Read"],
        paths: ["property/subject-property", "property/purchase-agreement"],
      },
    ],
    purpose: DPV.ServiceProvision,
    to: "appraisal",
  },
  G6: {
    code: "G6",
    description: "Search title, insure it and run the settlement",
    end: { event: MORT.GrantEnd_PolicyIssued },
    endLabel: "Ends when the owner's policy is issued",
    name: "Title and settlement",
    permissions: [
      { modes: ["Read"], paths: ["profile/card", "property/purchase-agreement"] },
      { modes: ["Write"], paths: ["mortgage/closing/"] },
    ],
    purpose: DPV.ServiceProvision,
    to: "title",
  },
  G7: {
    code: "G7",
    description: "Quote and issue a homeowner's insurance policy",
    end: { event: MORT.GrantEnd_PolicyLapses },
    endLabel: "Lasts while the policy is in force",
    name: "Home insurance",
    permissions: [
      { modes: ["Read"], paths: ["property/subject-property", "mortgage/juniper/appraisal"] },
      { modes: ["Write"], paths: ["insurance/"] },
    ],
    purpose: DPV.ServiceProvision,
    to: "insurer",
  },
  G8: {
    code: "G8",
    description:
      "Service the loan: contact details, proof of insurance and the autopay instruction",
    end: { event: MORT.GrantEnd_ServicingEnds },
    endLabel: "Lasts while Marigold services the loan",
    name: "Loan servicing",
    permissions: [
      { modes: ["Read"], paths: ["profile/contact", "insurance/", "banking/payment-mandate"] },
      // Marigold reads back the letters it writes into its own drawer (its portal shows them).
      { modes: ["Read", "Write"], paths: ["mortgage/servicing/"] },
    ],
    purpose: DPV.ServiceProvision,
    to: "servicer",
  },
});

/** The resource whose presence in the pod tells the wallet an end event has happened. */
export const GRANT_END_EVIDENCE: Readonly<Record<string, string>> = Object.freeze({
  [MORT.GrantEnd_Closing]: "mortgage/closing/settlement-statement",
  [MORT.GrantEnd_PolicyIssued]: "mortgage/closing/owners-policy",
  [MORT.GrantEnd_ReportDelivered]: "mortgage/juniper/appraisal",
});

/** Paths no request may ever name: the pod root and the drawers that hold the grants themselves. */
const NEVER_GRANTED = ["", "policies/", "inbox/"];

export type GrantState = "active" | "expired" | "revoked";

export interface GrantRecord {
  readonly code: string;
  readonly state: GrantState;
  /** The agreement's IRI in `policies/`. */
  readonly policy: string;
  readonly agreement: AccessAgreement;
  /** When the latest consent record was written. */
  readonly since: Date;
}

const slugOf = (code: string) => code.toLowerCase();
const alexUrl = (world: World, path = "") => podUrl(world, "alex", path);

export function policyUrl(world: World, code: GrantCode): string {
  return alexUrl(world, `policies/${slugOf(code)}`);
}

function endOf(world: World, spec: GrantSpec): GrantEnd {
  if ("event" in spec.end) return { event: spec.end.event };
  const day =
    "daysAfterApproval" in spec.end
      ? world.day + spec.end.daysAfterApproval
      : DAY.closing + spec.end.daysAfterClosing;
  return { until: dateOf(world, day) };
}

/** The permissions of a grant as the request carries them, with absolute targets. */
export function permissionsOf(world: World, code: GrantCode): PermissionInit[] {
  const spec = GRANTS[code];
  const end = endOf(world, spec);
  return spec.permissions.map((permission) => ({
    assignee: webid(world, permission.to ?? spec.to),
    end,
    modes: permission.modes,
    purpose: spec.purpose,
    targets: permission.paths.map((path) => alexUrl(world, path)),
  }));
}

/**
 * The organisation asks: it appends an ODRL request to Alex's inbox, which any signed-in agent
 * may do and nobody but Alex may read. Returns the request's URL (the server picks its name).
 */
export async function requestAccess(
  world: World,
  code: GrantCode,
  time = "09:00",
): Promise<string> {
  const spec = GRANTS[code];
  return postResource(
    world.fetchAs(spec.to),
    alexUrl(world, "inbox/"),
    `request-${slugOf(code)}`,
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

class ContainerNode extends TermWrapper {
  get contains(): Set<string> {
    return SetFrom.subjectPredicate(
      this,
      "http://www.w3.org/ns/ldp#contains",
      NamedNodeAs.string,
      NamedNodeFrom.string,
    );
  }
}

/** The members of a container, as the pod lists them. */
export async function membersOf(fetcher: typeof fetch, container: string): Promise<string[]> {
  const dataset = await readDataset(fetcher, container);
  return [...new ContainerNode(container, dataset, DataFactory).contains].sort();
}

/** Every grant on record in the pod, with the state its latest consent record gives it. */
export async function grantRecords(world: World): Promise<GrantRecord[]> {
  const alex = world.fetchAs("alex");
  const latest = new Map<string, ConsentReceipt>();
  for (const url of await membersOf(alex, alexUrl(world, "consents/"))) {
    const receipt = new ConsentReceipt(url, await readDataset(alex, url), DataFactory);
    const policy = receipt.policyIri;
    // The credit-report authorisation is an audit record of its own, not a grant's state.
    if (policy === undefined || receipt.purposeIri === DPV.CreditChecking) continue;
    const current = latest.get(policy);
    if (current === undefined || current.issued.getTime() < receipt.issued.getTime()) {
      latest.set(policy, receipt);
    }
  }
  const records: GrantRecord[] = [];
  for (const policy of await membersOf(alex, alexUrl(world, "policies/"))) {
    const agreement = new AccessAgreement(policy, await readDataset(alex, policy), DataFactory);
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

// --- ACL computation ---------------------------------------------------------------------------

interface Rule extends AclRule {
  readonly agent: string;
}

const isContainer = (target: string) => target.endsWith("/");

/** Every target named by any agreement on record, active or not: the ACL documents the wallet owns. */
function targetsOf(records: readonly GrantRecord[]): string[] {
  const targets = new Set<string>();
  for (const record of records) {
    for (const permission of record.agreement.permissions) {
      for (const target of permission.targetIris) targets.add(target);
    }
  }
  return [...targets].sort();
}

/**
 * Whether a one-time permission (`maxUses`) still belongs in an ACL document. The pod runtime
 * closes a one-time grant after its first use by removing the rule, while the grant stays active
 * on record until the wallet records the use. So a one-time rule is written only by the approval
 * that creates it (`fresh`), and kept afterwards only while the document still holds it: a sync
 * never puts back a rule the runtime removed.
 */
type KeepOneTime = (policy: string, agent: string, target: string) => boolean;

const NO_ONE_TIME: KeepOneTime = () => false;

function directRules(records: readonly GrantRecord[], target: string, keep: KeepOneTime): Rule[] {
  const rules: Rule[] = [];
  for (const record of records) {
    if (record.state !== "active") continue;
    for (const permission of record.agreement.permissions) {
      if (!permission.targetIris.has(target)) continue;
      if (
        permission.maxUses !== undefined &&
        !keep(record.policy, permission.assigneeIri, target)
      ) {
        continue;
      }
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

/**
 * The rules an ACL document for `target` must hold. The pod server uses the nearest ACL document
 * and ignores the ones above it, so a document for a resource has to repeat every inheritable
 * rule of the nearest container that has a document of its own.
 */
function rulesFor(
  records: readonly GrantRecord[],
  targets: readonly string[],
  target: string,
  keep: KeepOneTime = NO_ONE_TIME,
): Rule[] {
  const ancestor = targets
    .filter((other) => other !== target && isContainer(other) && target.startsWith(other))
    .sort((a, b) => b.length - a.length)[0];
  const inherited =
    ancestor === undefined
      ? []
      : rulesFor(records, targets, ancestor, keep).filter((rule) => rule.inheritable);
  return [...inherited, ...directRules(records, target, keep)];
}

/**
 * The one-time rules each target's ACL document holds now (`agent target` keys), read for the
 * targets of active one-time permissions only.
 */
async function oneTimeRulesInForce(
  sync: AclSync,
  records: readonly GrantRecord[],
): Promise<Set<string>> {
  const targets = new Set<string>();
  for (const record of records) {
    if (record.state !== "active") continue;
    for (const permission of record.agreement.permissions) {
      if (permission.maxUses === undefined) continue;
      for (const target of permission.targetIris) targets.add(target);
    }
  }
  const held = new Set<string>();
  for (const target of targets) {
    const doc = await readAclDocument(sync, `${target}.acl`);
    for (const rule of doc?.authorizations ?? []) {
      for (const agent of rule.agent) held.add(`${agent} ${target}`);
    }
  }
  return held;
}

const AGENT_CLASSES: Readonly<Record<string, AclRule["agent"]>> = Object.freeze({
  "http://xmlns.com/foaf/0.1/Agent": { class: "anyone" } as const,
  [`${ACL}AuthenticatedAgent`]: { class: "signed-in" } as const,
});
const ACL_MODES: readonly AclMode[] = ["Read", "Write", "Append", "Control"];

/** The container a pod URL sits in, or undefined at the pod root. */
function parentOf(url: string, root: string): string | undefined {
  if (url === root || !url.startsWith(root)) return undefined;
  const trimmed = url.endsWith("/") ? url.slice(0, -1) : url;
  return trimmed.slice(0, trimmed.lastIndexOf("/") + 1);
}

/** An ACL document as read: its authorizations and the ETag a conditional write must match. */
interface AclDocument {
  readonly authorizations: readonly Authorization[];
  readonly etag: string;
}

/**
 * One ACL recomputation: who writes, whose rules the agreements manage, and the ACL documents
 * read so far. Each document is read at most once per sync (a 404 is remembered as absent); a
 * document the sync writes is forgotten, so a later read sees the new copy.
 */
export interface AclSync {
  readonly fetcher: typeof fetch;
  /** The pod root: reads walk up to it and no further. */
  readonly root: string;
  readonly owner: string;
  /** Every agent an agreement names: their rules are recomputed, never carried over. */
  readonly managed: ReadonlySet<string>;
  readonly docs: Map<string, AclDocument | undefined>;
}

export function aclSync(
  fetcher: typeof fetch,
  root: string,
  owner: string,
  managed: ReadonlySet<string>,
): AclSync {
  return { docs: new Map(), fetcher, managed, owner, root };
}

/** The ACL document at `aclUrl`, or undefined when there is none; read once per sync. */
async function readAclDocument(sync: AclSync, aclUrl: string): Promise<AclDocument | undefined> {
  if (sync.docs.has(aclUrl)) return sync.docs.get(aclUrl);
  const response = await sync.fetcher(aclUrl, { headers: { accept: "text/turtle" } });
  if (response.status === 404) {
    sync.docs.set(aclUrl, undefined);
    return undefined;
  }
  if (!response.ok) throw new PodRequestError("GET", aclUrl, response.status);
  const etag = response.headers.get("etag");
  if (etag === null)
    throw new Error(`${aclUrl} came without an ETag: it cannot be rewritten safely`);
  const dataset = await parseRdf(await response.text(), response.headers.get("content-type"), {
    baseIRI: aclUrl,
  });
  const doc = { authorizations: [...new AclResource(dataset, DataFactory).authorizations], etag };
  sync.docs.set(aclUrl, doc);
  return doc;
}

/**
 * What a rewrite of `target`'s ACL document must keep: the rules in force there that no agreement
 * manages, such as a public read Alex wrote on a document herself. The pod
 * server uses only the nearest ACL document, so a document the wallet writes must repeat them.
 *
 * - From the target's own document: the public and signed-in classes, and agents that no
 *   agreement on record names, each with its modes, scope (`acl:accessTo`, `acl:default`, or
 *   members only) and `acl:origin` limits as they were. The owner and every agreement's assignee
 *   are left out: the wallet recomputes those. An `acl:agentGroup` is not carried (its members
 *   are defined elsewhere); the agents and classes on the same authorization still are.
 * - When the target has no document of its own: only the public and signed-in class rules the
 *   nearest document above lets its members have. No agent rule is ever copied down, because a
 *   copy would outlive a later change to the document above.
 *
 * Leaving anything out can only narrow access, never widen it. `etag` is the target's own
 * document's (absent when it has none), for a write that fails if the document changed.
 */
async function currentAcl(
  sync: AclSync,
  target: string,
): Promise<{ kept: AclRule[]; etag?: string }> {
  for (let doc: string | undefined = target; doc !== undefined; doc = parentOf(doc, sync.root)) {
    const found = await readAclDocument(sync, `${doc}.acl`);
    if (found === undefined) continue;
    const own = doc === target;
    const kept: AclRule[] = [];
    for (const authorization of found.authorizations) {
      const modes = ACL_MODES.filter((mode) => authorization.mode.has(`${ACL}${mode}`));
      if (modes.length === 0) continue;
      const self = authorization.accessTo === target;
      const members = authorization.default === doc;
      // Its own document: rules about the target or its members. Above: rules for members.
      if (own ? !self && !members : !members) continue;
      const origins = [...authorization.origin].sort();
      const scope = own
        ? { inheritable: members, ...(self ? {} : { membersOnly: true }) }
        : { inheritable: true };
      const limits = origins.length > 0 ? { origins } : {};
      for (const agentClass of authorization.agentClass) {
        const agent = AGENT_CLASSES[agentClass];
        if (agent !== undefined) kept.push({ agent, modes, ...scope, ...limits });
      }
      if (!own) continue;
      for (const agent of authorization.agent) {
        if (agent === sync.owner || sync.managed.has(agent)) continue;
        kept.push({ agent, modes, ...scope, ...limits });
      }
    }
    return own ? { etag: found.etag, kept } : { kept };
  }
  return { kept: [] };
}

/**
 * Write the ACL document for `target`: the owner, `rules`, and what {@link currentAcl} says must be
 * kept. The write is conditional on what was read (`If-Match` on the ETag, or `If-None-Match: *`
 * when there was no document), so a change made in between is never overwritten with a stale
 * copy: on 412 the documents are read again and the write retried.
 */
export async function writeAclDocument(
  sync: AclSync,
  target: string,
  rules: readonly AclRule[],
  attempts = 3,
): Promise<void> {
  const aclUrl = `${target}.acl`;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const { etag, kept } = await currentAcl(sync, target);
    const response = await sync.fetcher(aclUrl, {
      body: await aclTurtle(aclDataset(sync.owner, target, [...rules, ...kept])),
      headers: {
        "content-type": "text/turtle",
        ...(etag === undefined ? { "if-none-match": "*" } : { "if-match": etag }),
      },
      method: "PUT",
    });
    if (response.ok) {
      sync.docs.delete(aclUrl);
      return;
    }
    if (response.status !== 412) throw new PodRequestError("PUT", aclUrl, response.status);
    // Something changed since the read: read everything again.
    sync.docs.clear();
  }
  throw new Error(`${aclUrl} kept changing while the wallet wrote it (${attempts} attempts)`);
}

/** The state a grant is in once a consent record with `status` is its latest. */
export function endedState(status: string): "expired" | "revoked" {
  return status === DPV.ConsentExpired ? "expired" : "revoked";
}

/** Every agent any agreement on record names: the agents whose rules the wallet recomputes. */
export function managedAgents(
  ...records: ReadonlyArray<
    ReadonlyArray<{
      readonly agreement: { readonly permissions: readonly { assigneeIri: string }[] };
    }>
  >
): Set<string> {
  const agents = new Set<string>();
  for (const list of records) {
    for (const record of list) {
      for (const permission of record.agreement.permissions) agents.add(permission.assigneeIri);
    }
  }
  return agents;
}

/**
 * End a grant in the order that fails safe: the ACL documents first, computed as if the grant had
 * already ended, and the consent record that says so only once they are written. If a pod request
 * fails on the way, the grant is still on record as active, so ending it again retries the whole
 * change; it is never recorded as ended while its access is still in force.
 */
export async function endGrantInOrder<
  R extends { readonly policy: string; readonly state: string },
>(
  before: readonly R[],
  ended: R,
  state: R["state"],
  sync: (before: readonly R[], after: readonly R[]) => Promise<string[]>,
  record: () => Promise<unknown>,
): Promise<string[]> {
  const after = before.map((candidate) =>
    candidate.policy === ended.policy ? { ...candidate, state } : candidate,
  );
  const written = await sync(before, after);
  await record();
  return written;
}

/** A stable description of a rule set, for telling whether a document has to be rewritten. */
function fingerprint(rules: readonly Rule[]): string {
  return rules
    .map((rule) => `${rule.agent} ${[...rule.modes].sort().join(",")} ${rule.inheritable}`)
    .sort()
    .join("\n");
}

/**
 * Bring the pod's ACL documents in line with the grants on record. Only documents whose rules
 * differ between `before` and `after` are written, so each change shows in the Lens as the ACL
 * documents it really touched. Each document is written by {@link writeAclDocument}, which keeps
 * the rules no agreement manages (a public read Alex wrote herself) and never overwrites a
 * change made since it read the document.
 */
export async function syncAcls(
  world: World,
  before: readonly GrantRecord[],
  after: readonly GrantRecord[],
  /** Policies approved by this change: their one-time rules are written (see `KeepOneTime`). */
  fresh: readonly string[] = [],
): Promise<string[]> {
  const sync = aclSync(
    world.fetchAs("alex"),
    alexUrl(world),
    webid(world, "alex"),
    managedAgents(before, after),
  );
  const beforeTargets = targetsOf(before);
  const afterTargets = targetsOf(after);
  const held = await oneTimeRulesInForce(sync, after);
  const keep: KeepOneTime = (policy, agent, target) =>
    fresh.includes(policy) || held.has(`${agent} ${target}`);
  const written: string[] = [];
  for (const target of afterTargets) {
    const rules = rulesFor(after, afterTargets, target, keep);
    const had = beforeTargets.includes(target);
    if (had && fingerprint(rulesFor(before, beforeTargets, target, keep)) === fingerprint(rules))
      continue;
    await writeAclDocument(sync, target, rules);
    written.push(`${target}.acl`);
  }
  return written;
}

/** The authorizations an ACL document holds, read back with the `@solid/object` wrappers. */
export async function readAcl(fetcher: typeof fetch, aclUrl: string): Promise<Authorization[]> {
  const response = await fetcher(aclUrl, { headers: { accept: "text/turtle" } });
  if (!response.ok) throw new PodRequestError("GET", aclUrl, response.status);
  const dataset = await parseRdf(await response.text(), response.headers.get("content-type"), {
    baseIRI: aclUrl,
  });
  return [...new AclResource(dataset, DataFactory).authorizations];
}

// --- The wallet's actions ----------------------------------------------------------------------

function assertGrantable(world: World, request: AccessRequest): void {
  const root = alexUrl(world);
  for (const permission of request.permissions) {
    for (const target of permission.targetIris) {
      const path = target.startsWith(root) ? target.slice(root.length) : undefined;
      if (path === undefined || NEVER_GRANTED.includes(path) || path.endsWith(".acl")) {
        throw new Error(`the wallet never grants access to ${target}`);
      }
    }
  }
}

export async function writeConsent(
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
    world.fetchAs("alex"),
    buildConsentReceipt({
      consentStatus: status,
      dataController: record.agreement.assigneeIri,
      dataSubject: webid(world, "alex"),
      iri: alexUrl(world, `consents/${slugOf(record.code)}-${suffix}`),
      issued,
      moreTargets: rest,
      policy: record.policy,
      purpose: record.agreement.permissions[0]?.purposeIri ?? DPV.ServiceProvision,
      target: first,
    }),
  );
}

export interface ApprovalResult {
  readonly code: string;
  readonly policy: string;
  readonly consent: string;
  /** The ACL documents the approval wrote. */
  readonly acls: readonly string[];
}

/**
 * Registers a one-time grant with the pod runtime, which closes it after the agent's first read
 * (`oneTimeGrant` / `makeGrantOneTime` in `@mortgage/pod-runtime`). Content does not depend on the
 * runtime, so the caller passes it in.
 */
export type RegisterOneTime = (input: { resource: string; agent: string }) => Promise<unknown>;

export interface ApproveOptions {
  /**
   * Required to approve a permission limited to one use (`odrl:count`). Without it such a request
   * is refused: WAC cannot say "once", so the grant must not be written unless the runtime will
   * close it.
   */
  readonly registerOneTime?: RegisterOneTime;
}

/** Whether a request carries a permission limited in uses (approved on a one-time screen). */
export function isLimitedUse(request: Pick<AccessRequest, "permissions">): boolean {
  return request.permissions.some((permission) => permission.maxUses !== undefined);
}

/**
 * Before any write: a one-time permission needs the runtime's one-time grant, and only "once" is
 * supported (the runtime closes a grant after the first read). Fails closed.
 */
function assertOneTimeSupported(request: AccessRequest, options: ApproveOptions): void {
  for (const permission of request.permissions) {
    const uses = permission.maxUses;
    if (uses === undefined) continue;
    if (uses !== 1) throw new Error(`the wallet grants one-time access only, not ${uses} uses`);
    if (options.registerOneTime === undefined) {
      throw new Error(
        `request ${request.grantCode} is limited to one use: it is answered on the one-time consent screen`,
      );
    }
  }
}

/**
 * Alex approves a request in the wallet: the agreement, the consent record and the ACL change
 * are written together. The agreement repeats the request's permissions exactly; the wallet adds
 * nothing and drops nothing. A permission limited to one use is registered with the runtime
 * before the ACL is written (`options.registerOneTime`), and refused without it.
 */
export async function approveRequest(
  world: World,
  requestUrl: string,
  time = "09:05",
  options: ApproveOptions = {},
): Promise<ApprovalResult> {
  const alex = world.fetchAs("alex");
  const request = new AccessRequest(requestUrl, await readDataset(alex, requestUrl), DataFactory);
  if (request.assignerIri !== webid(world, "alex")) {
    throw new Error(`request ${requestUrl} is not addressed to Alex`);
  }
  assertGrantable(world, request);
  assertOneTimeSupported(request, options);
  const code = request.grantCode;
  const policy = alexUrl(world, `policies/${slugOf(code)}`);
  const before = await grantRecords(world);
  if (before.some((record) => record.policy === policy && record.state === "active")) {
    throw new Error(`${code} is already active`);
  }
  await putResource(
    alex,
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
  const agreement = new AccessAgreement(policy, await readDataset(alex, policy), DataFactory);
  const consent = await writeConsent(
    world,
    { agreement, code, policy },
    DPV.ConsentGiven,
    "given",
    time,
  );
  // The runtime must know the grant is one-time before the pod lets the agent read.
  const register = options.registerOneTime;
  if (register !== undefined) {
    for (const permission of request.permissions) {
      if (permission.maxUses === undefined) continue;
      for (const resource of permission.targetIris) {
        await register({ agent: permission.assigneeIri, resource });
      }
    }
  }
  const after = await grantRecords(world);
  return { acls: await syncAcls(world, before, after, [policy]), code, consent, policy };
}

export async function endGrant(
  world: World,
  code: string,
  status: string,
  suffix: string,
  time: string,
): Promise<string[]> {
  const before = await grantRecords(world);
  const record = before.find((candidate) => candidate.code === code);
  if (record === undefined || record.state !== "active") {
    throw new Error(`${code} is not an active grant`);
  }
  return endGrantInOrder(
    before,
    record,
    endedState(status),
    (from, to) => syncAcls(world, from, to),
    () => writeConsent(world, record, status, suffix, time),
  );
}

/** Alex withdraws a grant. The agreement stays on record; a "withdrawn" consent record is added. */
export function revokeGrant(world: World, code: GrantCode, time = "09:00"): Promise<string[]> {
  return endGrant(world, code, DPV.ConsentWithdrawn, "withdrawn", time);
}

async function hasEnded(world: World, record: GrantRecord): Promise<boolean> {
  const now = at(world, "00:00").getTime();
  for (const permission of record.agreement.permissions) {
    const end = permission.end;
    if (end === undefined) continue;
    if ("until" in end) {
      if (end.until.getTime() <= now) return true;
      continue;
    }
    const evidence = GRANT_END_EVIDENCE[end.event];
    if (evidence === undefined) continue;
    const response = await world.fetchAs("alex")(alexUrl(world, evidence), { method: "HEAD" });
    if (response.ok) return true;
  }
  return false;
}

/**
 * The wallet applies expiry: every active grant whose end date has passed, or whose end event
 * has left its evidence in the pod, gets an "expired" consent record and loses its ACL entries.
 * Returns the codes that expired. The Lens labels this "expiry applied by Alex's wallet".
 */
export async function applyExpiries(world: World, time = "00:05"): Promise<string[]> {
  const expired: string[] = [];
  for (const record of await grantRecords(world)) {
    if (record.state !== "active" || !(await hasEnded(world, record))) continue;
    await endGrant(world, record.code, DPV.ConsentExpired, "expired", time);
    expired.push(record.code);
  }
  return expired;
}
