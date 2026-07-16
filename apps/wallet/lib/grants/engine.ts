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
 *   - REVOCATION IS IMMUTABLE at the app level: once the ledger holds a
 *     withdraw receipt for an agent on this container, re-granting that agent
 *     is refused (409). WAC stays the real enforcement; the ledger check is
 *     the app-level policy the demo narrates (decision 0006).
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
/** The wallet's own namespaced slice of the ledger (collision-free by design). */
const VAULT_RECEIPT_PREFIX = `${RECEIPT_PREFIX}vault-`;

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

function aclIri(containerIri: string): string {
  return `${containerIri}.acl`;
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

function receiptView(iri: string, receipt: ConsentReceipt): ConsentReceiptView {
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
  return `${mortgageContainerIri(podBase)}${VAULT_RECEIPT_PREFIX}${sequence}-${action}-${encodeURIComponent(recipient)}`;
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
  const receipts = await readConsentLedger(podBase, borrowerWebId, options);
  const history = receipts.filter(
    (receipt) => receipt.recipient === agentWebId && receipt.resource === containerIri,
  );
  const everRevoked = history.some((receipt) => receipt.action === "revoke");
  const everGranted = history.some((receipt) => receipt.action === "grant");
  const snapshot = await readAclSnapshot(
    containerIri,
    borrowerWebId,
    options.serviceWebId,
    options.podFetch,
  );
  const isGranted = snapshot.granted.has(agentWebId);

  if (action === "grant") {
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
      return await writeReceipt(
        podBase,
        borrowerWebId,
        agentWebId,
        "grant",
        history.length,
        options,
      );
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

  // action === "revoke"
  if (!isGranted && everRevoked) {
    throw new PodAccessError(409, "access is already revoked and recorded");
  }
  if (!isGranted && !everGranted) {
    throw new PodAccessError(
      409,
      "no grant exists for this organisation, so there is nothing to revoke",
    );
  }
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
  // Access is now OFF (or already was — the repair branch for a crash between
  // ACL write and receipt write). A recording failure keeps access off and
  // stays retryable; it can never resurrect the grant.
  return writeReceipt(podBase, borrowerWebId, agentWebId, "revoke", history.length, options);
}

/**
 * The dashboard view: every agent that currently holds a rule OR ever
 * appeared in the ledger, with live modes and the immutability flag.
 */
export async function readGrantStandings(
  podBase: string,
  borrowerWebId: string,
  options: GrantEngineOptions,
): Promise<readonly GrantStanding[]> {
  const containerIri = mortgageContainerIri(podBase);
  const [receipts, snapshot] = await Promise.all([
    readConsentLedger(podBase, borrowerWebId, options),
    readAclSnapshot(containerIri, borrowerWebId, options.serviceWebId, options.podFetch),
  ]);
  const agents = new Set<string>(snapshot.granted.keys());
  for (const receipt of receipts) {
    if (receipt.resource === containerIri) agents.add(receipt.recipient);
  }
  return [...agents].sort().map((agent) => ({
    agent,
    granted: snapshot.granted.has(agent),
    modes: snapshot.granted.get(agent) ?? [],
    revoked: receipts.some(
      (receipt) =>
        receipt.recipient === agent &&
        receipt.resource === containerIri &&
        receipt.action === "revoke",
    ),
  }));
}

/**
 * The scene-5 consent-receipt ledger: EVERY `consent-receipt-…` record in the
 * `/mortgage/` container — the wallet's own `vault-…` records and any written
 * by other apps (the closing ceremony) — SHACL-validated, subject-checked,
 * time-ordered. An empty/missing container is an empty ledger.
 */
export async function readConsentLedger(
  podBase: string,
  borrowerWebId: string,
  options: GrantEngineOptions,
): Promise<readonly ConsentReceiptView[]> {
  const containerIri = mortgageContainerIri(podBase);
  const resource = await readPodResource(containerIri, podBase, options.podFetch);
  if (resource === undefined) return [];
  const container = new ContainerDataset(resource.dataset, DataFactory).container;
  if (container === undefined) {
    throw new PodAccessError(502, "the mortgage container has no typed LDP container root");
  }
  const receiptIris = [...container.contains]
    .map((entry) => entry.value)
    .filter((iri) => iri.startsWith(`${containerIri}${RECEIPT_PREFIX}`));
  const receipts = await Promise.all(
    receiptIris.map(async (iri) => {
      const stored = await readPodResource(iri, podBase, options.podFetch);
      if (stored === undefined) throw new PodAccessError(502, `listed receipt ${iri} is missing`);
      const report = await validate(stored.dataset, {
        expect: "consent-receipt",
        focusNode: iri,
      });
      if (!report.conforms) throw new PodAccessError(502, `listed receipt ${iri} fails SHACL`);
      const receipt = new ConsentReceipt(iri, stored.dataset, DataFactory);
      if (receipt.dataSubjectIri !== borrowerWebId) {
        throw new PodAccessError(403, "receipt ledger contains a record for another data subject");
      }
      return receiptView(iri, receipt);
    }),
  );
  return receipts.sort(
    (left, right) =>
      left.issuedAt.localeCompare(right.issuedAt) || left.iri.localeCompare(right.iri),
  );
}
