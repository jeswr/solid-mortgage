import { serialize } from "@jeswr/rdf-serialize";
import {
  buildClosingRecord,
  buildConsentReceipt,
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
  readonly podFetch: PodIoFetch;
  readonly now?: () => Date;
  readonly randomId?: () => string;
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

async function mutateAcl(
  resourceIri: string,
  ownerWebId: string,
  agentWebId: string,
  action: "grant" | "revoke",
  podFetch: PodIoFetch,
): Promise<void> {
  const iri = aclIri(resourceIri);
  const existing = await readPodResource(iri, resourceIri, podFetch);
  const dataset = new Store(existing === undefined ? [] : ([...existing.dataset] as Quad[]));
  const acl = new AclResource(dataset, DataFactory);

  const owner = authorization(`${iri}#owner`, dataset, resourceIri, ownerWebId);
  owner.canRead = true;
  owner.canWrite = true;
  owner.canReadWriteAcl = true;

  let matched = false;
  for (const rule of acl.authorizations) {
    if (rule.accessTo !== resourceIri || !rule.agent.has(agentWebId)) continue;
    matched = true;
    rule.canRead = action === "grant";
    if (action === "revoke") rule.agent.delete(agentWebId);
  }
  if (action === "revoke" && !matched) {
    throw new PodAccessError(
      409,
      "cannot record a revocation because no matching WAC grant exists",
    );
  }
  if (action === "grant" && !matched) {
    const granted = authorization(
      `${iri}#agent-${encodeURIComponent(agentWebId)}`,
      dataset,
      resourceIri,
      agentWebId,
    );
    granted.canRead = true;
  }

  await writePodTurtle(iri, await serializeAcl(dataset), {
    etag: existing?.etag,
    podFetch,
  });
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

async function writeReceipt(
  podBase: string,
  actor: string,
  recipient: string,
  action: "grant" | "revoke",
  options: ClosingSceneOptions,
): Promise<ConsentReceiptView> {
  const now = options.now?.() ?? new Date();
  const randomId = options.randomId?.() ?? crypto.randomUUID();
  const iri = `${mortgageContainer(podBase)}${RECEIPT_PREFIX}${now.getTime()}-${randomId}`;
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
  const existing = await readPodResource(iri, podBase, options.podFetch);
  await writePodTurtle(iri, await resourceToTurtle(record), {
    etag: existing?.etag,
    podFetch: options.podFetch,
  });
  await mutateAcl(iri, borrowerWebId, lenderWebId, "grant", options.podFetch);
  return { iri, eNoteReference, closedAt: now.toISOString() };
}

export async function changeServicingAccess(
  podBase: string,
  borrowerWebId: string,
  agentWebId: string,
  action: "grant" | "revoke",
  options: ClosingSceneOptions,
): Promise<ConsentReceiptView> {
  await mutateAcl(closingRecordIri(podBase), borrowerWebId, agentWebId, action, options.podFetch);
  return writeReceipt(podBase, borrowerWebId, agentWebId, action, options);
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
