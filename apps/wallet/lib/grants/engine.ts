/**
 * The wallet's grant/revoke/ledger engine (decisions 0006 + 0015 L4) —
 * ISOMORPHIC: the same state machine runs server-side over the wallet's
 * service-identity fetch (Mode 2) and client-side over the Mode-1 in-browser
 * pod's fetch (the disclosed simulation). Nothing here touches `node:`.
 *
 * The proven closing-app state model (apps/closing/lib/server/scene.ts,
 * roborev-hardened) is carried over unchanged where it applies:
 *
 *   - ACLs are REBUILT from per-agent authorizations: `#owner` (borrower,
 *     full + Control), optional `#service` (the wallet's own service WebID),
 *     and one single-agent `#grant-…` rule per granted party — modes per the
 *     party definition (Read always; Write/Control only where the scene needs
 *     them). Rules are never shared between agents, so changing one agent can
 *     never widen or narrow another's access. The wallet's rules additionally
 *     carry `acl:default`: the grant covers the `/mortgage/` container AND
 *     its members (that is what lender prefill/AUS/closing consume).
 *
 *   - POLICY-BEARING receipts are UNFORGEABLE (roborev sm-28 High ×2): a
 *     grant materialises WAC Write for a party on the `/mortgage/` container,
 *     so a granted party's service identity could otherwise author or corrupt
 *     `consent-receipt-…` records — poisoning the ledger to BLOCK the
 *     borrower's own revocation, or forging a withdraw receipt to lock a
 *     competitor out permanently. The authoritative ledger therefore lives in
 *     a dedicated `/mortgage/receipts/` subcontainer whose OWN ACL grants
 *     write to the borrower + the wallet's service identity ONLY (never a
 *     granted party — the subcontainer ACL overrides the container's inherited
 *     `acl:default`; a pre-existing store is TAMPER-CHECKED, not blindly
 *     trusted — see `ensureReceiptsStore`). Grant/revoke POLICY reads STRICTLY
 *     from there (a transient dropout ABORTS the caller, never silently
 *     shrinking history — a fail-open read would re-enable a revoked party).
 *     The DISPLAY ledger additionally shows other apps' root-level records
 *     TOLERANTLY (skip-and-surface, tagged `external` provenance) so no
 *     untrusted record can brick a transition or masquerade as wallet-verified.
 *
 *   - REVOCATION IS IMMUTABLE at the app level: once the protected store holds
 *     a withdraw receipt for an agent on this container, re-granting that agent
 *     is refused (409). WAC stays the real enforcement; the ledger check is
 *     the app-level policy the demo narrates (decision 0006). A REVOKE removes
 *     live WAC access BEFORE it consults the ledger, so nothing can block the
 *     borrower from cutting off a party.
 *
 *   - REPEAT operations are loud no-ops: an already-recorded grant or an
 *     already-recorded revocation answers 409 and touches NOTHING (idempotent
 *     in effect — the ACL cannot drift on retries).
 *
 *   - ACL and receipt cannot silently diverge: a REVOKE removes access first
 *     and then records (fail-safe direction — recording failure keeps access
 *     OFF and the retry repairs the missing receipt). A GRANT records after
 *     the ACL change and compensates surgically on receipt failure (removes
 *     ONLY that agent from the CURRENT ACL, never a stale snapshot restore);
 *     a compensation racing a concurrent repair first re-checks whether the
 *     DETERMINISTIC receipt for this exact transition landed anyway. All
 *     writes are conditional (`If-Match` / `If-None-Match: *`).
 *
 *   - Receipt IRIs are deterministic per logical transition and namespaced
 *     `consent-receipt-vault-…` so they can NEVER collide with the closing
 *     app's `consent-receipt-<seq>-…` records in the same container (both
 *     apps write into `/mortgage/`; the shared `consent-receipt-` prefix is
 *     what makes the scene-5 ledger read them together).
 *
 *   - Transitions are SERIALIZED per pod in-process; multi-instance deploys
 *     need a shared lock (same seam family as closing — bead sm-9kz). Two of
 *     the receipt-store guarantees below depend on that in-process
 *     serialization and DO NOT hold across instances until the shared lock
 *     lands (bead sm-p6q, dependency of sm-9kz): (a) a failed
 *     reconcile that re-throws could be laundered by a retry that takes the
 *     verify-only 412 path on a DIFFERENT instance; (b) the fresh-create
 *     reconcile's "any member is a plant" premise can misclassify a legitimate
 *     receipt written by a concurrent instance between this instance's lock PUT
 *     and its reconcile listing. Neither is attacker-drivable, and both are
 *     excluded by the single-writer demo deploy; the shared-lock work closes
 *     them (a readiness sentinel or per-pod lock so no other writer treats the
 *     lock as ready until reconciliation completes).
 *
 * RDF discipline: ACL documents are read AND written through the
 * `@solid/object` typed wrappers (`AclResource`/`Authorization`) and
 * serialised with `@jeswr/rdf-serialize`; receipts go through the data-model
 * `buildConsentReceipt` wrapper and are SHACL-validated on read.
 */
import { serialize } from "@jeswr/rdf-serialize";
import {
  buildConsentReceipt,
  ConsentReceipt,
  DPV,
  resourceToTurtle,
  validate,
} from "@mortgage/data-model";
import type { Quad } from "@rdfjs/types";
import { AclResource, Authorization, ContainerDataset } from "@solid/object";
import { DataFactory, Store } from "n3";
import {
  PodAccessError,
  type PodIoFetch,
  readPodResource,
  writePodTurtle,
} from "../../../lender-boa/lib/server/pod";

export { PodAccessError } from "../../../lender-boa/lib/server/pod";

const ACL = {
  Authorization: "http://www.w3.org/ns/auth/acl#Authorization",
  namespace: "http://www.w3.org/ns/auth/acl#",
} as const;

const RDF = { namespace: "http://www.w3.org/1999/02/22-rdf-syntax-ns#" } as const;

/** Shared ledger prefix (decision 0006 — the closing app uses the same one). */
const RECEIPT_PREFIX = "consent-receipt-";
/**
 * The AUTHORITATIVE receipt store: a subcontainer whose own ACL admits writes
 * from the borrower + wallet service ONLY (see the module header). Members are
 * named `vault-{seq}-{action}-{recipient}` — the `vault-` stem keeps them
 * distinct from any root-level `consent-receipt-…` the display view also reads.
 */
const RECEIPTS_SUBCONTAINER = "receipts/";
const VAULT_RECEIPT_PREFIX = "vault-";

/** The access modes a grant materialises (Read is always granted). */
export interface GrantModes {
  readonly write: boolean;
  readonly control: boolean;
}

export interface ConsentReceiptView {
  readonly iri: string;
  readonly action: "grant" | "revoke";
  readonly actor: string;
  readonly recipient: string;
  readonly resource: string;
  readonly issuedAt: string;
  /**
   * Where the record came from: `wallet` = the protected, integrity-locked
   * store (authoritative); `external` = a root-level record written by another
   * app or party — shown for completeness but NOT verified by the wallet, so
   * the UI must mark it as such (roborev sm-28 Low #4).
   */
  readonly provenance: "wallet" | "external";
}

/** One agent's current standing on the container, for the dashboard. */
export interface GrantStanding {
  readonly agent: string;
  /** The agent currently holds a live WAC rule on the container. */
  readonly granted: boolean;
  /** Modes read back from the live ACL (empty when not granted). */
  readonly modes: readonly string[];
  /** A withdraw receipt exists — re-granting is refused (decision 0006). */
  readonly revoked: boolean;
}

export interface GrantEngineOptions {
  /**
   * The pod fetch the engine operates through. Mode 2: the wallet's
   * DPoP-bound service identity (the custodian grant names it). Mode 1: the
   * in-browser pod's `session.authFetch` (fixed-owner, disclosed simulation).
   */
  readonly podFetch: PodIoFetch;
  /**
   * The wallet's own service WebID, kept in every rebuilt ACL so the app
   * never locks itself out (decision 0015 L4). Omit in Mode 1 — the borrower
   * IS the only writer there.
   */
  readonly serviceWebId?: string;
  readonly now?: () => Date;
}

/**
 * IN-PROCESS per-pod serialization of grant/revoke transitions (closing-scene
 * parity — see the module header; cross-instance: bead sm-9kz).
 */
const podTransitionLocks = new Map<string, Promise<void>>();

function withPodTransitionLock<T>(podBase: string, run: () => Promise<T>): Promise<T> {
  const previous = podTransitionLocks.get(podBase) ?? Promise.resolve();
  const next = previous.then(run, run);
  const settled = next.then(
    () => undefined,
    () => undefined,
  );
  podTransitionLocks.set(podBase, settled);
  void settled.then(() => {
    if (podTransitionLocks.get(podBase) === settled) podTransitionLocks.delete(podBase);
  });
  return next;
}

export function mortgageContainerIri(podBase: string): string {
  return `${podBase}mortgage/`;
}

/** The protected receipt subcontainer IRI (see the module header). */
export function receiptsContainerIri(podBase: string): string {
  return `${mortgageContainerIri(podBase)}${RECEIPTS_SUBCONTAINER}`;
}

function aclIri(containerIri: string): string {
  return `${containerIri}.acl`;
}

/**
 * Idempotently provision the protected `/mortgage/receipts/` store: create the
 * subcontainer, then lock it to the borrower (+ wallet service) with an ACL
 * that OVERRIDES the container's inherited `acl:default` — so no granted party
 * can write a receipt there even though they hold Write on the parent. THE
 * load-bearing control for receipt integrity.
 *
 * TAMPER DETECTION (roborev sm-28 High, hardened twice): the wallet writes the
 * lock ONLY on a container it JUST CREATED FRESH — never over a pre-existing
 * one. In the intended flow the fresh create runs on the FIRST grant, while NO
 * party has any grant yet, so the store is locked in a window with no
 * adversary. A container that ALREADY EXISTS is verify-only: the wallet GETs
 * its `.acl` and either trusts an owner+service-only lock or FAILS CLOSED —
 * writing NOTHING, so a tampered/un-migrated store stays fail-closed on every
 * retry (an earlier version wrote the lock before throwing, which one retry
 * laundered into "our own" trusted lock — roborev sm-28 round-3). A
 * Control-granted party could still author a matching lock over pre-planted
 * records (the container-Control residual + a "sign policy receipts" follow-up,
 * both beaded); everything short of Control is caught here.
 */
async function ensureReceiptsStore(
  podBase: string,
  ownerWebId: string,
  serviceWebId: string | undefined,
  podFetch: PodIoFetch,
): Promise<void> {
  const container = receiptsContainerIri(podBase);
  const iri = aclIri(container);
  const created = await podFetch(container, {
    method: "PUT",
    headers: { "content-type": "text/turtle", "if-none-match": "*" },
    body: "",
    redirect: "error",
  });
  // PRE-EXISTING container: verify-only, write NOTHING (see the doc). An absent
  // or foreign lock throws; only an owner+service-only lock is trusted.
  if (created.status === 412) {
    await verifyReceiptsLock(container, iri, ownerWebId, serviceWebId, podFetch);
    return;
  }
  if (!created.ok) {
    throw new PodAccessError(502, `could not provision the receipt store (${created.status})`);
  }
  // FRESH container (we just created it, in the no-adversary window). Lock it:
  // owner + service full control (accessTo AND default so members inherit);
  // NO agentClass, NO agentGroup, NO party.
  const dataset = new Store();
  const owner = authorization(`${iri}#owner`, dataset, container, ownerWebId);
  owner.default = container;
  owner.canRead = true;
  owner.canWrite = true;
  owner.canReadWriteAcl = true;
  if (serviceWebId !== undefined) {
    const service = authorization(`${iri}#service`, dataset, container, serviceWebId);
    service.default = container;
    service.canRead = true;
    service.canWrite = true;
    service.canReadWriteAcl = true;
  }
  const aclResponse = await podFetch(iri, {
    method: "PUT",
    headers: { "content-type": "text/turtle", "if-none-match": "*" },
    body: await serializeAcl(dataset),
    redirect: "error",
  });
  if (aclResponse.ok) {
    // CLOSE THE CREATE→LOCK WINDOW (roborev sm-28 round-4/5): between the
    // container PUT and this lock PUT the new container inherited the parent's
    // ACL, so a party with inherited Write could have RACED a forged receipt
    // in. The lock is now EFFECTIVE (only owner/service can write the store
    // henceforth), and this call created the container MILLISECONDS ago, so any
    // `vault-*` member present is a forgery by construction — DELETE it and
    // proceed with a clean store. Detecting-then-throwing would seal the plant
    // under our own canonical lock and let a retry launder it (the round-3
    // mistake, reintroduced one write later — roborev sm-28 round-5).
    await reconcileFreshStore(container, podBase, podFetch);
    return;
  }
  // A concurrent transition (multi-instance) locked our fresh container first:
  // verify THAT lock rather than trusting blindly.
  if (aclResponse.status === 412) {
    await verifyReceiptsLock(container, iri, ownerWebId, serviceWebId, podFetch);
    return;
  }
  throw new PodAccessError(502, `could not lock the receipt store (${aclResponse.status})`);
}

/** The `vault-*` members currently listed in the receipts container. */
async function listPlantedMembers(
  container: string,
  podBase: string,
  podFetch: PodIoFetch,
): Promise<readonly string[]> {
  const resource = await readPodResource(container, podBase, podFetch);
  if (resource === undefined) {
    // The container we created milliseconds ago must exist — a 404 here is an
    // anomalous fault, not "empty" (roborev sm-28 round-5 Low). Fail closed.
    throw new PodAccessError(502, "the just-created receipt store is unexpectedly absent");
  }
  const listing = new ContainerDataset(resource.dataset, DataFactory).container;
  // An EMPTY fresh container reads as untyped on the sparq server (no
  // ldp:contains, no typed root) — that is the ordinary empty state, not a
  // fault: no members to reconcile.
  if (listing === undefined) return [];
  return [...listing.contains]
    .map((entry) => entry.value)
    .filter((memberIri) => memberIri.startsWith(`${container}${VAULT_RECEIPT_PREFIX}`));
}

/**
 * Reconcile a just-created, just-locked store: DELETE any `vault-*` member
 * planted in the create→lock window (forged by construction — the store did
 * not exist a moment ago), then confirm the store is clean. If a member cannot
 * be removed, or a re-plant survives (a Control party racing the lock — the
 * beaded residual), FAIL CLOSED rather than proceed over untrusted records.
 */
async function reconcileFreshStore(
  container: string,
  podBase: string,
  podFetch: PodIoFetch,
): Promise<void> {
  const planted = await listPlantedMembers(container, podBase, podFetch);
  if (planted.length === 0) return;
  for (const memberIri of planted) {
    const deleted = await podFetch(memberIri, { method: "DELETE", redirect: "error" });
    if (!deleted.ok && deleted.status !== 404) {
      throw new PodAccessError(
        409,
        "a record planted in the receipt store before its lock could not be removed — " +
          "refusing to trust the store; reconcile it out of band",
      );
    }
  }
  const remaining = await listPlantedMembers(container, podBase, podFetch);
  if (remaining.length > 0) {
    throw new PodAccessError(
      409,
      "the receipt store still holds records after reconciliation (a writer is racing the " +
        "integrity lock) — refusing to trust it; reconcile it out of band",
    );
  }
}

/**
 * Fail closed unless `/mortgage/receipts/.acl` grants access to the borrower +
 * wallet service ONLY — no public/authenticated class, no `acl:agentClass`, no
 * `acl:agentGroup` (a group document lives outside the pod and its membership
 * could be edited later — roborev sm-28 round-3), no other `acl:agent`, and
 * every rule scoped to THIS container. Read through the `@solid/object` typed
 * wrappers (house rule).
 */
async function verifyReceiptsLock(
  containerIri: string,
  aclDocumentIri: string,
  ownerWebId: string,
  serviceWebId: string | undefined,
  podFetch: PodIoFetch,
): Promise<void> {
  const existing = await readPodResource(aclDocumentIri, containerIri, podFetch);
  if (existing === undefined) {
    throw new PodAccessError(
      409,
      "the consent-receipt store exists without its integrity lock — refusing to trust it " +
        "(possible tampering or an un-migrated pod); reconcile it out of band before granting",
    );
  }
  const allowed = new Set([ownerWebId, ...(serviceWebId === undefined ? [] : [serviceWebId])]);
  const acl = new AclResource(new Store([...existing.dataset] as Quad[]), DataFactory);
  const untrusted = (detail: string): PodAccessError =>
    new PodAccessError(409, `the consent-receipt store lock is untrusted (${detail})`);
  // POSITIVE check (roborev sm-28 round-4): the lock must actually grant the
  // owner (+ service, when configured) member-covering write via
  // `acl:default` on THIS container — a purely-negative check would pass an
  // empty ACL or one with only `accessTo` rules, leaving members inheriting
  // the parent's party-Write default.
  let ownerCovered = false;
  let serviceCovered = serviceWebId === undefined;
  for (const rule of acl.authorizations) {
    if (rule.accessibleToAny || rule.accessibleToAuthenticated) {
      throw untrusted("grants public/authenticated access");
    }
    if (rule.agentClass.size > 0) throw untrusted("grants agentClass access");
    if (rule.agentGroup !== undefined) throw untrusted("grants agentGroup access");
    // Each DEFINED target must be THIS container (checked independently, so a
    // mixed-target rule with a foreign `default` is rejected), and at least
    // one target must be present.
    if (rule.accessTo !== undefined && rule.accessTo !== containerIri) {
      throw untrusted("names a foreign accessTo target");
    }
    if (rule.default !== undefined && rule.default !== containerIri) {
      throw untrusted("names a foreign default target");
    }
    if (rule.accessTo === undefined && rule.default === undefined) {
      throw untrusted("names no target");
    }
    for (const agent of rule.agent) {
      if (!allowed.has(agent)) throw untrusted("names an unexpected agent");
    }
    if (rule.default === containerIri && rule.canWrite) {
      if (rule.agent.has(ownerWebId)) ownerCovered = true;
      if (serviceWebId !== undefined && rule.agent.has(serviceWebId)) serviceCovered = true;
    }
  }
  if (!ownerCovered) throw untrusted("does not grant the borrower member-covering write");
  if (!serviceCovered) throw untrusted("does not grant the service member-covering write");
}

function authorization(iri: string, dataset: Store, target: string, agent: string): Authorization {
  const rule = new Authorization(iri, dataset, DataFactory);
  rule.type.add(ACL.Authorization);
  rule.accessTo = target;
  // Container rule: the grant covers the members too (prefill reads
  // `/mortgage/credentials/…`; the closing app writes `/mortgage/closing-record`).
  rule.default = target;
  rule.agent.add(agent);
  return rule;
}

async function serializeAcl(dataset: Store): Promise<string> {
  return serialize([...dataset] as Quad[], {
    prefixes: { acl: ACL.namespace, rdf: RDF.namespace },
  });
}

/** The live container ACL, reduced to per-agent granted modes. */
interface AclSnapshot {
  /** `undefined` when no ACL document exists yet (create with `If-None-Match: *`). */
  readonly etag: string | null | undefined;
  /** Agents (excluding owner + service) → the modes their rules grant. */
  readonly granted: ReadonlyMap<string, readonly string[]>;
}

async function readAclSnapshot(
  containerIri: string,
  ownerWebId: string,
  serviceWebId: string | undefined,
  podFetch: PodIoFetch,
): Promise<AclSnapshot> {
  const existing = await readPodResource(aclIri(containerIri), containerIri, podFetch);
  if (existing === undefined) return { etag: undefined, granted: new Map() };
  const acl = new AclResource(new Store([...existing.dataset] as Quad[]), DataFactory);
  const granted = new Map<string, string[]>();
  for (const rule of acl.authorizations) {
    if (rule.accessTo !== containerIri || !rule.canRead) continue;
    for (const agent of rule.agent) {
      if (agent === ownerWebId || agent === serviceWebId) continue;
      const modes = granted.get(agent) ?? [];
      if (!modes.includes("read")) modes.push("read");
      if (rule.canWrite && !modes.includes("write")) modes.push("write");
      if (rule.canReadWriteAcl && !modes.includes("control")) modes.push("control");
      granted.set(agent, modes);
    }
  }
  return { etag: existing.etag, granted };
}

/**
 * Write the FULL container ACL: borrower (+ service identity when configured)
 * in full control, one dedicated single-agent rule per granted agent with
 * exactly its recorded modes.
 */
async function writeAclDocument(
  containerIri: string,
  ownerWebId: string,
  serviceWebId: string | undefined,
  granted: ReadonlyMap<string, readonly string[]>,
  etag: string | null | undefined,
  podFetch: PodIoFetch,
): Promise<void> {
  const dataset = new Store();
  const iri = aclIri(containerIri);
  const owner = authorization(`${iri}#owner`, dataset, containerIri, ownerWebId);
  owner.canRead = true;
  owner.canWrite = true;
  owner.canReadWriteAcl = true;
  if (serviceWebId !== undefined) {
    const service = authorization(`${iri}#service`, dataset, containerIri, serviceWebId);
    service.canRead = true;
    service.canWrite = true;
    service.canReadWriteAcl = true;
  }
  for (const agent of [...granted.keys()].sort()) {
    const rule = authorization(
      `${iri}#grant-${encodeURIComponent(agent)}`,
      dataset,
      containerIri,
      agent,
    );
    const modes = granted.get(agent) ?? [];
    rule.canRead = true;
    if (modes.includes("write")) rule.canWrite = true;
    if (modes.includes("control")) rule.canReadWriteAcl = true;
  }
  await writePodTurtle(iri, await serializeAcl(dataset), { etag, podFetch });
}

/**
 * SURGICAL rollback for grant compensation: re-read the CURRENT ACL and
 * remove only `agentWebId` — a concurrent mutation that landed in between
 * survives untouched (never a stale-snapshot restore).
 */
async function removeAgentFromAcl(
  containerIri: string,
  ownerWebId: string,
  serviceWebId: string | undefined,
  agentWebId: string,
  podFetch: PodIoFetch,
): Promise<void> {
  const snapshot = await readAclSnapshot(containerIri, ownerWebId, serviceWebId, podFetch);
  if (!snapshot.granted.has(agentWebId)) return;
  const granted = new Map(snapshot.granted);
  granted.delete(agentWebId);
  await writeAclDocument(containerIri, ownerWebId, serviceWebId, granted, snapshot.etag, podFetch);
}

function receiptView(
  iri: string,
  receipt: ConsentReceipt,
  provenance: "wallet" | "external" = "wallet",
): ConsentReceiptView {
  const status = receipt.consentStatus;
  if (status !== DPV.ConsentGiven && status !== DPV.ConsentWithdrawn) {
    throw new PodAccessError(502, `receipt ${iri} has an unsupported consent status`);
  }
  return {
    iri,
    action: status === DPV.ConsentGiven ? "grant" : "revoke",
    actor: receipt.dataSubjectIri,
    recipient: receipt.dataControllerIri,
    resource: receipt.targetIri,
    issuedAt: receipt.issued.toISOString(),
    provenance,
  };
}

/**
 * DETERMINISTIC receipt IRI per logical transition (agent + preceding receipt
 * count for that agent ON THIS CONTAINER): concurrent repairs of the same
 * missing receipt target the SAME IRI and the strict `If-None-Match: *`
 * create makes the loser fail loudly. The `vault-` namespace keeps the IRIs
 * disjoint from the closing app's numeric-first scheme in the same container.
 */
function receiptIriFor(
  podBase: string,
  action: "grant" | "revoke",
  sequence: number,
  recipient: string,
): string {
  return `${receiptsContainerIri(podBase)}${VAULT_RECEIPT_PREFIX}${sequence}-${action}-${encodeURIComponent(recipient)}`;
}

async function writeReceipt(
  podBase: string,
  actor: string,
  recipient: string,
  action: "grant" | "revoke",
  sequence: number,
  options: GrantEngineOptions,
): Promise<ConsentReceiptView> {
  const now = options.now?.() ?? new Date();
  const iri = receiptIriFor(podBase, action, sequence, recipient);
  const receipt = buildConsentReceipt({
    iri,
    dataSubject: actor,
    dataController: recipient,
    target: mortgageContainerIri(podBase),
    consentStatus: action === "grant" ? DPV.ConsentGiven : DPV.ConsentWithdrawn,
    issued: now,
  });
  await writePodTurtle(iri, await resourceToTurtle(receipt), {
    etag: undefined,
    podFetch: options.podFetch,
  });
  return receiptView(iri, receipt);
}

/**
 * Grant or revoke one agent's access to the `/mortgage/` container, with the
 * matching DPV receipt. State model in the module header. `modes` applies to
 * grants only (revokes remove the agent's rule entirely).
 */
export function changeContainerAccess(
  podBase: string,
  borrowerWebId: string,
  agentWebId: string,
  action: "grant" | "revoke",
  modes: GrantModes,
  options: GrantEngineOptions,
): Promise<ConsentReceiptView> {
  return withPodTransitionLock(podBase, () =>
    changeContainerAccessSerialized(podBase, borrowerWebId, agentWebId, action, modes, options),
  );
}

async function changeContainerAccessSerialized(
  podBase: string,
  borrowerWebId: string,
  agentWebId: string,
  action: "grant" | "revoke",
  modes: GrantModes,
  options: GrantEngineOptions,
): Promise<ConsentReceiptView> {
  const containerIri = mortgageContainerIri(podBase);
  const snapshot = await readAclSnapshot(
    containerIri,
    borrowerWebId,
    options.serviceWebId,
    options.podFetch,
  );
  const isGranted = snapshot.granted.has(agentWebId);

  // REVOKE removes live WAC access FIRST — before ANY ledger read OR receipt-
  // store provisioning — so nothing (a poisoned history, a store-provisioning
  // fault) can stand between the borrower and cutting off a party (roborev
  // sm-28 High #1 + Low #3). Only after access is off do we ensure the store,
  // read policy history (protected store only), and record the receipt.
  if (action === "revoke") {
    if (isGranted) {
      const granted = new Map(snapshot.granted);
      granted.delete(agentWebId);
      await writeAclDocument(
        containerIri,
        borrowerWebId,
        options.serviceWebId,
        granted,
        snapshot.etag,
        options.podFetch,
      );
    }
    // Access is off; NOW provision the (idempotent) protected store the
    // receipt lands in, then read history + record. A provisioning fault here
    // no longer blocks the cut-off (roborev Low #3) — access is already gone.
    await ensureReceiptsStore(podBase, borrowerWebId, options.serviceWebId, options.podFetch);
    const history = await policyHistoryFor(podBase, borrowerWebId, agentWebId, options);
    const everRevoked = history.some((receipt) => receipt.action === "revoke");
    const everGranted = history.some((receipt) => receipt.action === "grant");
    if (!isGranted && everRevoked) {
      throw new PodAccessError(409, "access is already revoked and recorded");
    }
    if (!isGranted && !everGranted) {
      throw new PodAccessError(
        409,
        "no grant exists for this organisation, so there is nothing to revoke",
      );
    }
    // Access is now OFF (or already was — the repair branch for a crash between
    // ACL write and receipt write). A recording failure keeps access off and
    // stays retryable; it can never resurrect the grant.
    return writeReceipt(podBase, borrowerWebId, agentWebId, "revoke", history.length, options);
  }

  // action === "grant": the protected store must exist AND be locked BEFORE
  // the immutability check, so the first receipt never lands unprotected and a
  // pre-existing store is tamper-checked (roborev sm-28 High/Medium #2).
  await ensureReceiptsStore(podBase, borrowerWebId, options.serviceWebId, options.podFetch);
  const history = await policyHistoryFor(podBase, borrowerWebId, agentWebId, options);
  const everRevoked = history.some((receipt) => receipt.action === "revoke");
  const everGranted = history.some((receipt) => receipt.action === "grant");

  if (everRevoked) {
    throw new PodAccessError(
      409,
      "revocation is immutable: this organisation's access was withdrawn by the borrower " +
        "and is never silently re-granted",
    );
  }
  if (isGranted && everGranted) {
    throw new PodAccessError(409, "access is already granted and recorded");
  }
  if (!isGranted) {
    const granted = new Map(snapshot.granted);
    const grantedModes = ["read", ...(modes.write ? ["write"] : [])];
    if (modes.control) grantedModes.push("control");
    granted.set(agentWebId, grantedModes);
    await writeAclDocument(
      containerIri,
      borrowerWebId,
      options.serviceWebId,
      granted,
      snapshot.etag,
      options.podFetch,
    );
  }
  // `isGranted && !everGranted` falls through here too: the repair branch
  // for a previous crash between ACL write and receipt write.
  try {
    return await writeReceipt(podBase, borrowerWebId, agentWebId, "grant", history.length, options);
  } catch (error) {
    if (!isGranted) {
      // A concurrent repair may have recorded the DETERMINISTIC receipt for
      // this exact transition (making our create lose its `If-None-Match:
      // *`): a RECORDED grant must never be compensated away.
      const transitionIri = receiptIriFor(podBase, "grant", history.length, agentWebId);
      try {
        const recorded = await readPodResource(transitionIri, podBase, options.podFetch);
        if (recorded !== undefined) {
          const report = await validate(recorded.dataset, {
            expect: "consent-receipt",
            focusNode: transitionIri,
          });
          if (report.conforms) {
            const view = receiptView(
              transitionIri,
              new ConsentReceipt(transitionIri, recorded.dataset, DataFactory),
            );
            if (
              view.action === "grant" &&
              view.actor === borrowerWebId &&
              view.recipient === agentWebId &&
              view.resource === containerIri
            ) {
              return view;
            }
          }
        }
      } catch {
        // Could not tell — fall through to the fail-safe rollback below.
      }
      // Compensation: an UNRECORDED grant must not survive this request.
      try {
        await removeAgentFromAcl(
          containerIri,
          borrowerWebId,
          options.serviceWebId,
          agentWebId,
          options.podFetch,
        );
      } catch {
        // Rollback failed too: the grant is applied but unrecorded. A retry
        // lands in the repair branch above and completes the receipt.
      }
    }
    throw error;
  }
}

/** The authoritative history for ONE agent on the container (protected store). */
async function policyHistoryFor(
  podBase: string,
  borrowerWebId: string,
  agentWebId: string,
  options: GrantEngineOptions,
): Promise<readonly ConsentReceiptView[]> {
  // requireStore: transitions call this only AFTER ensureReceiptsStore, so a
  // missing store here is a transient fault, not the empty state (round-3 #3).
  const history = await readPolicyHistory(podBase, borrowerWebId, options, true);
  return history.filter((receipt) => receipt.recipient === agentWebId);
}

/**
 * The dashboard view: every agent that currently holds a rule OR appears in
 * the AUTHORITATIVE (protected) history, with live modes and the immutability
 * flag. `revoked` is derived only from the protected store — a forged
 * root-level receipt can never make a party look revoked.
 */
export async function readGrantStandings(
  podBase: string,
  borrowerWebId: string,
  options: GrantEngineOptions,
): Promise<readonly GrantStanding[]> {
  const containerIri = mortgageContainerIri(podBase);
  const [history, snapshot] = await Promise.all([
    readPolicyHistory(podBase, borrowerWebId, options),
    readAclSnapshot(containerIri, borrowerWebId, options.serviceWebId, options.podFetch),
  ]);
  const agents = new Set<string>(snapshot.granted.keys());
  for (const receipt of history) agents.add(receipt.recipient);
  return [...agents].sort().map((agent) => ({
    agent,
    granted: snapshot.granted.has(agent),
    modes: snapshot.granted.get(agent) ?? [],
    revoked: history.some((receipt) => receipt.recipient === agent && receipt.action === "revoke"),
  }));
}

/**
 * Read receipts out of ONE container.
 *
 * `mode: "tolerant"` (the DISPLAY ledger): an entry that is missing, fails
 * SHACL, or names another subject is SKIPPED — an untrusted record must never
 * brick a read.
 *
 * `mode: "strict"` (the AUTHORITATIVE policy store): a listed member that
 * cannot be read (a 5xx/transient), fails SHACL, or names another subject
 * THROWS — a transient dropout must never silently shrink policy history and
 * re-enable a revoked party (roborev sm-28 Medium #1). Only owner/service can
 * delete a protected member, so a listed-but-404 there is also a fault worth
 * failing on.
 *
 * `requireContainer` (transitions only): the caller has JUST provisioned the
 * store, so a 404 on the CONTAINER itself is a transient fault → THROW rather
 * than read as empty (roborev sm-28 round-3). The dashboard/ledger reads leave
 * it false, so a fresh pod with no store yet reads as empty history.
 */
async function readReceiptsFrom(
  listIri: string,
  prefixes: readonly string[],
  provenance: "wallet" | "external",
  mode: "strict" | "tolerant",
  requireContainer: boolean,
  podBase: string,
  borrowerWebId: string,
  options: GrantEngineOptions,
): Promise<ConsentReceiptView[]> {
  const resource = await readPodResource(listIri, podBase, options.podFetch);
  if (resource === undefined) {
    if (requireContainer) {
      throw new PodAccessError(502, "the just-provisioned receipt store is unexpectedly absent");
    }
    return [];
  }
  const container = new ContainerDataset(resource.dataset, DataFactory).container;
  // No typed LDP root ⇒ no members ⇒ empty history, in BOTH modes: a freshly
  // provisioned empty store legitimately lists nothing. Strict's guarantee is
  // about a listed MEMBER that cannot be read, not about an empty container.
  if (container === undefined) return [];
  const receiptIris = [...container.contains]
    .map((entry) => entry.value)
    .filter((iri) => prefixes.some((prefix) => iri.startsWith(`${listIri}${prefix}`)));
  const views = await Promise.all(
    receiptIris.map(async (iri): Promise<ConsentReceiptView | undefined> => {
      try {
        const stored = await readPodResource(iri, podBase, options.podFetch);
        if (stored === undefined) {
          if (mode === "strict") {
            throw new PodAccessError(502, `protected receipt ${iri} is listed but missing`);
          }
          return undefined;
        }
        const report = await validate(stored.dataset, {
          expect: "consent-receipt",
          focusNode: iri,
        });
        if (!report.conforms) {
          if (mode === "strict") {
            throw new PodAccessError(502, `protected receipt ${iri} fails SHACL`);
          }
          return undefined;
        }
        const receipt = new ConsentReceipt(iri, stored.dataset, DataFactory);
        if (receipt.dataSubjectIri !== borrowerWebId) {
          if (mode === "strict") {
            throw new PodAccessError(502, `protected receipt ${iri} names another data subject`);
          }
          return undefined; // a foreign record must not block the borrower's reads
        }
        return receiptView(iri, receipt, provenance);
      } catch (error) {
        // STRICT fails closed on ANY per-receipt error — a grant must never
        // proceed on incomplete authoritative history.
        if (mode === "strict") {
          throw error instanceof PodAccessError
            ? error
            : new PodAccessError(502, `protected receipt ${iri} could not be read`);
        }
        return undefined; // tolerant: an unsupported status / transient read → skip
      }
    }),
  );
  return views.filter((view): view is ConsentReceiptView => view !== undefined);
}

/**
 * AUTHORITATIVE grant/revoke history: ONLY the protected `/mortgage/receipts/`
 * store, whose ACL admits writes from the borrower + wallet service alone.
 * This is the sole input to the immutability + idempotency policy, so a
 * granted party cannot forge a revocation or corrupt the sequence
 * (roborev sm-28 High #2), and the read is STRICT — a transient dropout aborts
 * the caller rather than silently shrinking history (roborev sm-28 Medium #1).
 * Records are additionally required to sit at the DETERMINISTIC vault IRI that
 * encodes their own recipient + action, so even the wallet service cannot mint
 * a policy record whose body contradicts its name.
 */
async function readPolicyHistory(
  podBase: string,
  borrowerWebId: string,
  options: GrantEngineOptions,
  requireStore = false,
): Promise<readonly ConsentReceiptView[]> {
  const listIri = receiptsContainerIri(podBase);
  const views = await readReceiptsFrom(
    listIri,
    [VAULT_RECEIPT_PREFIX],
    "wallet",
    "strict",
    requireStore,
    podBase,
    borrowerWebId,
    options,
  );
  const containerIri = mortgageContainerIri(podBase);
  const authoritative = views.filter((view) => {
    if (view.resource !== containerIri) return false;
    // The name must match the body: reconstruct the expected IRI for this
    // (action, recipient) at every plausible sequence and require an exact hit.
    const suffix = view.iri.slice(listIri.length);
    const match = /^vault-(\d+)-(grant|revoke)-(.+)$/.exec(suffix);
    if (match === null) return false;
    const [, sequence, action, recipient] = match;
    return (
      action === view.action &&
      recipient === encodeURIComponent(view.recipient) &&
      view.iri === receiptIriFor(podBase, view.action, Number(sequence), view.recipient)
    );
  });
  return authoritative.sort(
    (left, right) =>
      left.issuedAt.localeCompare(right.issuedAt) || left.iri.localeCompare(right.iri),
  );
}

/**
 * The scene-5 DISPLAY ledger (decision 0006): the wallet's authoritative
 * `/mortgage/receipts/` records PLUS any root-level `consent-receipt-…`
 * written by other apps in the journey (the closing ceremony) — all
 * SHACL-validated, subject-checked, and time-ordered, with untrusted/foreign
 * entries skipped rather than thrown (so the ledger can never be bricked).
 */
export async function readConsentLedger(
  podBase: string,
  borrowerWebId: string,
  options: GrantEngineOptions,
): Promise<readonly ConsentReceiptView[]> {
  const [vault, root] = await Promise.all([
    readReceiptsFrom(
      receiptsContainerIri(podBase),
      [VAULT_RECEIPT_PREFIX],
      "wallet",
      "tolerant",
      false,
      podBase,
      borrowerWebId,
      options,
    ),
    readReceiptsFrom(
      mortgageContainerIri(podBase),
      [RECEIPT_PREFIX],
      "external",
      "tolerant",
      false,
      podBase,
      borrowerWebId,
      options,
    ),
  ]);
  return [...vault, ...root].sort(
    (left, right) =>
      left.issuedAt.localeCompare(right.issuedAt) || left.iri.localeCompare(right.iri),
  );
}
