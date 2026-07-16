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
 *     need a shared lock (same seam family as closing — bead sm-9kz).
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
 * TAMPER DETECTION (roborev sm-28 High, hardened): the wallet always creates
 * the container AND its lock together (both strict `If-None-Match: *`). In the
 * intended flow this runs on the FIRST grant, while NO party has any grant yet
 * — so the store is locked before any adversary holds inherited Write. A SPLIT
 * outcome — the container already exists but its lock does NOT (so our lock
 * create SUCCEEDS) — means someone created the store WITHOUT the lock (an
 * inherited-Write party pre-provisioning forged records, or a pre-hardening
 * pod). That is untrusted: we FAIL CLOSED rather than lock over foreign
 * contents and let them read as authoritative. A Control-granted party could
 * still forge a matching lock (the separate container-Control residual, tracked
 * as a bead); everything short of Control is caught here.
 */
async function ensureReceiptsStore(
  podBase: string,
  ownerWebId: string,
  serviceWebId: string | undefined,
  podFetch: PodIoFetch,
): Promise<void> {
  const container = receiptsContainerIri(podBase);
  const created = await podFetch(container, {
    method: "PUT",
    headers: { "content-type": "text/turtle", "if-none-match": "*" },
    body: "",
    redirect: "error",
  });
  const containerExisted = created.status === 412;
  if (!created.ok && !containerExisted) {
    throw new PodAccessError(502, `could not provision the receipt store (${created.status})`);
  }
  // The restrictive ACL: owner + service full control (accessTo AND default,
  // so members inherit it too); NO agentClass, NO party.
  const iri = aclIri(container);
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
  const lockExisted = aclResponse.status === 412;
  if (!aclResponse.ok && !lockExisted) {
    throw new PodAccessError(502, `could not lock the receipt store (${aclResponse.status})`);
  }
  // Happy paths: fresh (container created + lock created) or ours (both 412).
  // A container that existed WITHOUT its lock is untrusted (see the doc).
  if (containerExisted && !lockExisted) {
    throw new PodAccessError(
      409,
      "the consent-receipt store exists without its integrity lock — refusing to trust it " +
        "(possible tampering or an un-migrated pod); reconcile it out of band before granting",
    );
  }
  // A PRE-EXISTING lock is only trusted after we VERIFY it grants access to the
  // borrower + wallet service ALONE (roborev sm-28 Medium): a first-writer that
  // happened to hold Control (the container-Control residual) could otherwise
  // author a permissive lock and own the store forever. GET + typed-wrapper
  // check, never string comparison.
  if (lockExisted) {
    await verifyReceiptsLock(container, iri, ownerWebId, serviceWebId, podFetch);
  }
}

/**
 * Fail closed unless `/mortgage/receipts/.acl` grants write/control to the
 * borrower + wallet service ONLY — no other agent, no agentClass. Read through
 * the `@solid/object` typed wrappers (house rule).
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
    throw new PodAccessError(409, "the consent-receipt store lock vanished — refusing to proceed");
  }
  const allowed = new Set([ownerWebId, ...(serviceWebId === undefined ? [] : [serviceWebId])]);
  const acl = new AclResource(new Store([...existing.dataset] as Quad[]), DataFactory);
  for (const rule of acl.authorizations) {
    // No public / authenticated-class access to the policy store, ever.
    if (rule.accessibleToAny || rule.accessibleToAuthenticated || rule.agentClass.size > 0) {
      throw new PodAccessError(
        409,
        "the consent-receipt store lock grants class-based access — untrusted, refusing to proceed",
      );
    }
    for (const agent of rule.agent) {
      if (!allowed.has(agent)) {
        throw new PodAccessError(
          409,
          "the consent-receipt store lock names an unexpected agent — untrusted, refusing to proceed",
        );
      }
    }
  }
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
  const history = await readPolicyHistory(podBase, borrowerWebId, options);
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
 * failing on. A 404 on the CONTAINER itself is the ordinary empty state.
 */
async function readReceiptsFrom(
  listIri: string,
  prefixes: readonly string[],
  provenance: "wallet" | "external",
  mode: "strict" | "tolerant",
  podBase: string,
  borrowerWebId: string,
  options: GrantEngineOptions,
): Promise<ConsentReceiptView[]> {
  const resource = await readPodResource(listIri, podBase, options.podFetch);
  if (resource === undefined) return [];
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
): Promise<readonly ConsentReceiptView[]> {
  const listIri = receiptsContainerIri(podBase);
  const views = await readReceiptsFrom(
    listIri,
    [VAULT_RECEIPT_PREFIX],
    "wallet",
    "strict",
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
      podBase,
      borrowerWebId,
      options,
    ),
    readReceiptsFrom(
      mortgageContainerIri(podBase),
      [RECEIPT_PREFIX],
      "external",
      "tolerant",
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
