/**
 * Scene-5 pod logic: eClose record, WAC servicing transfer, DPV consent-receipt
 * ledger (decisions 0006 + 0015).
 *
 * State model (roborev sm-34 High/Medium fixes):
 *
 *   - Every ACL this scene writes is REBUILT from per-agent authorizations —
 *     `#owner` (borrower, full + Control), `#service` (this app's own service
 *     WebID, decision 0015 L4 — the grant the borrower's wallet materialises
 *     must keep naming the app or it locks itself out of the very ACL it
 *     manages), and one single-agent `#grant-…` Read rule per granted agent.
 *     No rule is ever shared between agents, so granting/revoking one agent
 *     can never widen or narrow another's access.
 *
 *   - CLOSE is single-shot but RESUMABLE: once any lender receipt exists the
 *     close is complete and a repeat is 409 that touches NOTHING — in
 *     particular it can never re-grant a lender whose access the borrower
 *     revoked (scene 5's whole thesis). A close that crashed before recording
 *     the lender grant (record present, NO lender receipt) is repaired through
 *     the same guarded grant pipeline instead of wedging on 409 forever.
 *
 *   - TRANSFERS REQUIRE THE RECORD: grant/revoke refuse (409) until a closing
 *     record exists — no orphan ACLs or receipts for an unsigned ceremony.
 *
 *   - REVOCATION IS IMMUTABLE at the app level: once the ledger holds a
 *     withdraw receipt for an agent, this app refuses to re-grant that agent
 *     (409). The pod's WAC stays the real enforcement; the ledger check is the
 *     app-level policy the demo narrates (decision 0006).
 *
 *   - ACL and receipt cannot silently diverge: a REVOKE removes access first
 *     and then records — if recording fails the access stays OFF (fail-safe
 *     direction) and a retry lands in the repair branch, which completes the
 *     missing receipt instead of erroring on "no grant to revoke". A GRANT
 *     records AFTER the ACL change but compensates surgically: a receipt-write
 *     failure removes ONLY that agent from the CURRENT ACL (never a stale
 *     snapshot restore, which could overwrite a concurrent change), so no
 *     unrecorded grant survives; if even the rollback fails, the retry repair
 *     branch writes the missing receipt. Receipt IRIs are DETERMINISTIC per
 *     logical transition, so concurrent repairs collide on `If-None-Match: *`
 *     instead of minting duplicates, and a grant whose receipt create loses
 *     that collision returns the RECORDED receipt instead of compensating a
 *     transition another request just recorded. All writes are conditional
 *     (`If-Match`/`If-None-Match: *`), so concurrent mutations lose loudly
 *     instead of clobbering.
 *
 *   - Transitions are SERIALIZED per pod in-process (the demo's deploy shape
 *     has one writer instance), so a grant can never interleave with a
 *     revoke's ACL-write/receipt-write window; multi-instance deployments
 *     must swap in a shared lock (see {@link withPodTransitionLock}).
 */
import { serialize } from "@jeswr/rdf-serialize";
import {
  buildClosingRecord,
  buildConsentReceipt,
  ClosingRecord,
  ConsentReceipt,
  DPV,
  resourceToTurtle,
  validate,
} from "@mortgage/data-model";
import type { Quad } from "@rdfjs/types";
import { AclResource, Authorization, ContainerDataset } from "@solid/object";
import { DataFactory, Store } from "n3";
import type { PodIoFetch } from "../../../lender-boa/lib/server/pod";
import * as lenderPod from "../../../lender-boa/lib/server/pod";

const { PodAccessError, readPodResource, writePodTurtle } = lenderPod;

const ACL = {
  Authorization: "http://www.w3.org/ns/auth/acl#Authorization",
  namespace: "http://www.w3.org/ns/auth/acl#",
} as const;

const RDF = { namespace: "http://www.w3.org/1999/02/22-rdf-syntax-ns#" } as const;
const RECEIPT_PREFIX = "consent-receipt-";

export interface ConsentReceiptView {
  readonly iri: string;
  readonly action: "grant" | "revoke";
  readonly actor: string;
  readonly recipient: string;
  readonly resource: string;
  readonly issuedAt: string;
}

export interface ClosingSceneOptions {
  /**
   * The AUTHENTICATED pod fetch of the app's service identity (decision 0015
   * L4). The pod enforces WAC against this identity — an anonymous fetch is
   * refused for every private resource, so the scene fails closed rather than
   * silently depending on open pods.
   */
  readonly podFetch: PodIoFetch;
  /** The service identity's WebID — named in every ACL this scene writes. */
  readonly serviceWebId: string;
  readonly now?: () => Date;
  readonly randomId?: () => string;
}

/**
 * IN-PROCESS serialization of servicing transitions, keyed per pod: same-agent
 * races (e.g. a grant overlapping a revoke's ACL-write/receipt-write window)
 * cannot interleave within one instance, which is the only writer in this
 * demo's deploy shape. A multi-instance deployment must swap in a shared lock
 * or reconcile via the deterministic receipt IRIs — the same seam caveat as
 * solid-kit's in-process replay/nonce stores.
 */
const podTransitionLocks = new Map<string, Promise<unknown>>();

async function withPodTransitionLock<T>(podBase: string, run: () => Promise<T>): Promise<T> {
  const previous = podTransitionLocks.get(podBase) ?? Promise.resolve();
  const next = previous.then(run, run);
  podTransitionLocks.set(
    podBase,
    next.catch(() => undefined),
  );
  return next;
}

function mortgageContainer(podBase: string): string {
  return `${podBase}mortgage/`;
}

export function closingRecordIri(podBase: string): string {
  return `${mortgageContainer(podBase)}closing-record`;
}

function aclIri(resourceIri: string): string {
  return `${resourceIri}.acl`;
}

function authorization(iri: string, dataset: Store, target: string, agent: string): Authorization {
  const rule = new Authorization(iri, dataset, DataFactory);
  rule.type.add(ACL.Authorization);
  rule.accessTo = target;
  rule.agent.add(agent);
  return rule;
}

async function serializeAcl(dataset: Store): Promise<string> {
  return serialize([...dataset] as Quad[], {
    prefixes: { acl: ACL.namespace, rdf: RDF.namespace },
  });
}

/** The current ACL document of `resourceIri`, reduced to the granted READ agents. */
interface AclSnapshot {
  /** `undefined` when no ACL document exists yet (create with `If-None-Match: *`). */
  readonly etag: string | null | undefined;
  /** Agents (excluding owner + service) currently holding a Read grant. */
  readonly granted: ReadonlySet<string>;
}

async function readAclSnapshot(
  resourceIri: string,
  ownerWebId: string,
  serviceWebId: string,
  podFetch: PodIoFetch,
): Promise<AclSnapshot> {
  const existing = await readPodResource(aclIri(resourceIri), resourceIri, podFetch);
  if (existing === undefined) return { etag: undefined, granted: new Set() };
  const acl = new AclResource(new Store([...existing.dataset] as Quad[]), DataFactory);
  const granted = new Set<string>();
  for (const rule of acl.authorizations) {
    if (rule.accessTo !== resourceIri || !rule.canRead) continue;
    for (const agent of rule.agent) {
      if (agent !== ownerWebId && agent !== serviceWebId) granted.add(agent);
    }
  }
  return { etag: existing.etag, granted };
}

/**
 * Write the FULL ACL document for `resourceIri`: borrower + service in full
 * control, one dedicated single-agent Read rule per granted agent.
 */
async function writeAclDocument(
  resourceIri: string,
  ownerWebId: string,
  serviceWebId: string,
  granted: ReadonlySet<string>,
  etag: string | null | undefined,
  podFetch: PodIoFetch,
): Promise<void> {
  const dataset = new Store();
  const iri = aclIri(resourceIri);
  const owner = authorization(`${iri}#owner`, dataset, resourceIri, ownerWebId);
  owner.canRead = true;
  owner.canWrite = true;
  owner.canReadWriteAcl = true;
  const service = authorization(`${iri}#service`, dataset, resourceIri, serviceWebId);
  service.canRead = true;
  service.canWrite = true;
  service.canReadWriteAcl = true;
  for (const agent of [...granted].sort()) {
    const rule = authorization(
      `${iri}#grant-${encodeURIComponent(agent)}`,
      dataset,
      resourceIri,
      agent,
    );
    rule.canRead = true;
  }
  await writePodTurtle(iri, await serializeAcl(dataset), { etag, podFetch });
}

/**
 * SURGICAL rollback for grant compensation: re-read the CURRENT ACL and remove
 * only `agentWebId` from it. Never restores a stale snapshot — a concurrent
 * mutation (e.g. another agent's revocation) that landed between the grant and
 * this rollback survives untouched (roborev 79200e5: snapshot-restore could
 * resurrect concurrently-revoked access).
 */
async function removeAgentFromAcl(
  resourceIri: string,
  ownerWebId: string,
  serviceWebId: string,
  agentWebId: string,
  podFetch: PodIoFetch,
): Promise<void> {
  const snapshot = await readAclSnapshot(resourceIri, ownerWebId, serviceWebId, podFetch);
  if (!snapshot.granted.has(agentWebId)) return;
  const granted = new Set(snapshot.granted);
  granted.delete(agentWebId);
  await writeAclDocument(resourceIri, ownerWebId, serviceWebId, granted, snapshot.etag, podFetch);
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
 * DETERMINISTIC receipt IRI per logical transition (agent + how many receipts
 * precede it): two concurrent repairs of the same missing receipt target the
 * SAME IRI, so the strict `If-None-Match: *` create makes the loser fail
 * loudly instead of minting a duplicate record (roborev 79200e5).
 */
function receiptIriFor(
  podBase: string,
  action: "grant" | "revoke",
  sequence: number,
  recipient: string,
): string {
  return `${mortgageContainer(podBase)}${RECEIPT_PREFIX}${sequence}-${action}-${encodeURIComponent(recipient)}`;
}

async function writeReceipt(
  podBase: string,
  actor: string,
  recipient: string,
  action: "grant" | "revoke",
  sequence: number,
  options: ClosingSceneOptions,
): Promise<ConsentReceiptView> {
  const now = options.now?.() ?? new Date();
  const iri = receiptIriFor(podBase, action, sequence, recipient);
  const receipt = buildConsentReceipt({
    iri,
    dataSubject: actor,
    dataController: recipient,
    target: closingRecordIri(podBase),
    consentStatus: action === "grant" ? DPV.ConsentGiven : DPV.ConsentWithdrawn,
    issued: now,
  });
  await writePodTurtle(iri, await resourceToTurtle(receipt), {
    etag: undefined,
    podFetch: options.podFetch,
  });
  return receiptView(iri, receipt);
}

export async function executeClosing(
  podBase: string,
  borrowerWebId: string,
  lenderWebId: string,
  options: ClosingSceneOptions,
): Promise<{ iri: string; eNoteReference: string; closedAt: string }> {
  const now = options.now?.() ?? new Date();
  const iri = closingRecordIri(podBase);
  // Single-shot with ONE exception: a close that crashed between writing the
  // record and recording the lender grant (no lender receipt exists at all) is
  // RESUMED — the grant pipeline below repairs ACL and/or receipt, and still
  // enforces revocation immutability itself. Any lender receipt (grant OR
  // revoke) means the close completed, and a repeat is 409 that must NEVER
  // touch the record or its ACL again — re-running the lender grant here is
  // exactly how a revoked lender would be silently re-granted (roborev sm-34
  // High; resumability: roborev 79200e5 High).
  const existing = await readPodResource(iri, podBase, options.podFetch);
  if (existing !== undefined) {
    const receipts = await readConsentLedger(podBase, borrowerWebId, options);
    // The resume gate is ANY receipt for the record, for ANY agent — never
    // just the currently CONFIGURED lender. The close-time lender grant is
    // always the record's first receipt (transfers are record-gated), so a
    // record with receipts is a completed ceremony: resuming it under a
    // different MORTGAGE_LENDER_SERVICE_WEBID must not mint a fresh grant for
    // the new identity (roborev cd706f6 Medium — config drift).
    if (receipts.some((receipt) => receipt.resource === iri)) {
      throw new PodAccessError(
        409,
        "the closing package is already signed — servicing access is managed only by the " +
          "transfer controls, never by re-running the close",
      );
    }
    const stored = new ClosingRecord(iri, existing.dataset, DataFactory);
    await changeServicingAccess(podBase, borrowerWebId, lenderWebId, "grant", options);
    return {
      iri,
      eNoteReference: stored.eNoteReference,
      closedAt: stored.closingDate.toISOString(),
    };
  }
  const eNoteReference = `SIMULATED-ENOTE-${now.toISOString().slice(0, 10)}-${
    options.randomId?.() ?? crypto.randomUUID()
  }`;
  const record = buildClosingRecord({
    iri,
    borrower: borrowerWebId,
    property: {
      address: {
        streetAddress: "1121 Maple Hollow Court",
        addressLocality: "Columbus",
        addressRegion: "OH",
        postalCode: "43230",
      },
    },
    principalUsd: 335000,
    closingCostsUsd: 11600,
    interestRatePercent: 6.125,
    loanTermMonths: 360,
    closingDate: now,
    recordingReference: `SIMULATED-FRANKLIN-${now.toISOString().slice(0, 10)}`,
    eNoteReference,
    servicerName: "Truist-modelled mortgage servicer",
  });
  await writePodTurtle(iri, await resourceToTurtle(record), {
    etag: undefined,
    podFetch: options.podFetch,
  });
  // The lender's initial read grant goes through the SAME guarded pipeline as
  // every later transfer, so it is receipt-recorded in the ledger too
  // (decision 0006: a receipt for every grant/revoke).
  await changeServicingAccess(podBase, borrowerWebId, lenderWebId, "grant", options);
  return { iri, eNoteReference, closedAt: now.toISOString() };
}

/**
 * Grant or revoke one agent's Read access on the closing record, with the
 * matching DPV receipt. See the module header for the exact state model
 * (idempotency, immutability of revocation, and failure repair). Transitions
 * are serialized per pod (see {@link withPodTransitionLock}), so a grant can
 * never interleave with a revoke's ACL-write/receipt-write window in-process.
 */
export function changeServicingAccess(
  podBase: string,
  borrowerWebId: string,
  agentWebId: string,
  action: "grant" | "revoke",
  options: ClosingSceneOptions,
): Promise<ConsentReceiptView> {
  return withPodTransitionLock(podBase, () =>
    changeServicingAccessSerialized(podBase, borrowerWebId, agentWebId, action, options),
  );
}

async function changeServicingAccessSerialized(
  podBase: string,
  borrowerWebId: string,
  agentWebId: string,
  action: "grant" | "revoke",
  options: ClosingSceneOptions,
): Promise<ConsentReceiptView> {
  const resourceIri = closingRecordIri(podBase);
  // No transfers before a closing record exists — otherwise a grant would mint
  // an orphan ACL + receipt for a resource the ceremony never produced.
  const record = await readPodResource(resourceIri, podBase, options.podFetch);
  if (record === undefined) {
    throw new PodAccessError(
      409,
      "no closing record exists — the closing package must be signed before servicing access changes",
    );
  }
  const receipts = await readConsentLedger(podBase, borrowerWebId, options);
  const history = receipts.filter(
    (receipt) => receipt.recipient === agentWebId && receipt.resource === resourceIri,
  );
  const everRevoked = history.some((receipt) => receipt.action === "revoke");
  const everGranted = history.some((receipt) => receipt.action === "grant");
  const snapshot = await readAclSnapshot(
    resourceIri,
    borrowerWebId,
    options.serviceWebId,
    options.podFetch,
  );
  const isGranted = snapshot.granted.has(agentWebId);

  if (action === "grant") {
    if (everRevoked) {
      throw new PodAccessError(
        409,
        "revocation is immutable: this agent's access was withdrawn by the borrower and " +
          "is never silently re-granted",
      );
    }
    if (isGranted && everGranted) {
      throw new PodAccessError(409, "access is already granted and recorded");
    }
    if (!isGranted) {
      const granted = new Set(snapshot.granted);
      granted.add(agentWebId);
      await writeAclDocument(
        resourceIri,
        borrowerWebId,
        options.serviceWebId,
        granted,
        snapshot.etag,
        options.podFetch,
      );
    }
    // `isGranted && !everGranted` falls through here too: the repair branch for
    // a previous crash between ACL write and receipt write.
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
        // Before compensating, check whether the DETERMINISTIC receipt for
        // this exact transition landed anyway (a concurrent repair may have
        // recorded it, making our create fail its `If-None-Match: *`): a
        // RECORDED grant must never be compensated away (roborev cd706f6).
        const transitionIri = receiptIriFor(podBase, "grant", history.length, agentWebId);
        try {
          const recorded = await readPodResource(transitionIri, podBase, options.podFetch);
          if (recorded !== undefined) {
            return receiptView(
              transitionIri,
              new ConsentReceipt(transitionIri, recorded.dataset, DataFactory),
            );
          }
        } catch {
          // Could not tell — fall through to the fail-safe rollback below.
        }
        // Compensation: an UNRECORDED grant must not survive this request.
        // Surgical (removes ONLY this agent from the CURRENT ACL) so a
        // concurrent mutation is never overwritten by a stale snapshot.
        try {
          await removeAgentFromAcl(
            resourceIri,
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
    throw new PodAccessError(409, "no grant exists for this agent, so there is nothing to revoke");
  }
  if (isGranted) {
    const granted = new Set(snapshot.granted);
    granted.delete(agentWebId);
    await writeAclDocument(
      resourceIri,
      borrowerWebId,
      options.serviceWebId,
      granted,
      snapshot.etag,
      options.podFetch,
    );
  }
  // Access is now OFF (or already was — the repair branch for a crash between
  // ACL write and receipt write). Recording failure keeps access off and stays
  // retryable; it can never resurrect the grant.
  return writeReceipt(podBase, borrowerWebId, agentWebId, "revoke", history.length, options);
}

export async function readConsentLedger(
  podBase: string,
  borrowerWebId: string,
  options: ClosingSceneOptions,
): Promise<readonly ConsentReceiptView[]> {
  const containerIri = mortgageContainer(podBase);
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
