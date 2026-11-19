// AUTHORED-BY Claude Opus 5.5
/**
 * What Plumbline reads from the pods, always as Plumbline (`podFetch`). Each read parses with
 * `@jeswr/fetch-rdf` and is read through the `@mortgage/data-model` wrappers. A refusal throws
 * `PodRequestError` so the screen can show it; a missing resource is `undefined`.
 */
import { parseRdf } from "@jeswr/fetch-rdf";
import { membersOf } from "@mortgage/content/mortgage/grants";
import { PodRequestError } from "@mortgage/content/mortgage/world";
import {
  AgentProfile,
  AppraisalCredential,
  InboxMessage,
  PurchaseAgreement,
  ServiceOrder,
  SubjectProperty,
} from "@mortgage/data-model";
import type { DatasetCore } from "@rdfjs/types";
import { DataFactory } from "n3";
import { ACTS_AS, podFetch, podUrl } from "./runtime.ts";

export const ORDER_NUMBER = "PV-7731";
export const LOAN_NUMBER = "JHL-1001";

export const urls = {
  agreement: () => podUrl("alex", "property/purchase-agreement"),
  /** A resource G5 does not cover: what the "try it" probe reads. */
  credit: () => podUrl("alex", "credentials/credit-summary"),
  inbox: () => podUrl(ACTS_AS, "inbox/"),
  order: () => podUrl("lender", `loans/${LOAN_NUMBER}/orders/appraisal`),
  property: () => podUrl("alex", "property/subject-property"),
  report: () => podUrl(ACTS_AS, `orders/${ORDER_NUMBER}/appraisal`),
};

/** GET and parse; `undefined` on 404, `PodRequestError` on any other failure. */
export async function readOptional(url: string): Promise<DatasetCore | undefined> {
  const response = await podFetch(url, { headers: { accept: "text/turtle" } });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new PodRequestError("GET", url, response.status);
  return parseRdf(await response.text(), response.headers.get("content-type"), { baseIRI: url });
}

async function readRequired(url: string): Promise<DatasetCore> {
  const dataset = await readOptional(url);
  if (dataset === undefined) throw new PodRequestError("GET", url, 404);
  return dataset;
}

/** `undefined` when the resource is missing or this organisation may not read it. */
async function readIfAllowed(url: string): Promise<DatasetCore | undefined> {
  try {
    return await readOptional(url);
  } catch (error) {
    if (error instanceof PodRequestError && (error.status === 401 || error.status === 403)) {
      return undefined;
    }
    throw error;
  }
}

export interface OrderView {
  readonly number: string;
  readonly ordered: Date;
  readonly delivered: boolean;
  readonly customer: string;
  readonly loanNumber: string;
}

export interface InboxEntry {
  readonly url: string;
  readonly kind: string;
  readonly summary: string;
  readonly published: Date;
  readonly from: string;
}

export interface ReportView {
  readonly url: string;
  readonly valueUsd: number | undefined;
  readonly appraiser: string;
  readonly licenseId: string;
  readonly issued: Date;
  readonly address: string;
}

const names = new Map<string, string>();

/** The organisation's public name, from its WebID profile (read once per page). */
async function nameOf(webid: string): Promise<string> {
  const known = names.get(webid);
  if (known !== undefined) return known;
  const card = new URL(webid);
  card.hash = "";
  const dataset = await readIfAllowed(card.href);
  const name =
    dataset === undefined ? webid : new AgentProfile(card.href, dataset, DataFactory).agent.name;
  names.set(webid, name);
  return name;
}

/** Juniper's order, which Juniper shares with Plumbline when it orders (step 12). */
export async function readOrder(): Promise<OrderView | undefined> {
  const url = urls.order();
  const dataset = await readIfAllowed(url);
  if (dataset === undefined) return undefined;
  const order = new ServiceOrder(url, dataset, DataFactory);
  return {
    customer: await nameOf(order.customerIri),
    delivered: order.orderStatus.endsWith("OrderDelivered"),
    loanNumber: order.loanNumber,
    number: order.orderNumber,
    ordered: order.orderDate,
  };
}

export async function readInbox(): Promise<InboxEntry[]> {
  const members = await membersOf(podFetch, urls.inbox());
  const entries: InboxEntry[] = [];
  for (const url of members) {
    const message = new InboxMessage(url, await readRequired(url), DataFactory);
    entries.push({
      from: await nameOf(message.actorIri),
      kind: message.messageKind,
      published: message.published,
      summary: message.summary,
      url,
    });
  }
  return entries.sort((a, b) => a.published.getTime() - b.published.getTime());
}

/** The signed report in Plumbline's own store (after step 13). */
export async function readReport(): Promise<ReportView | undefined> {
  const url = urls.report();
  const dataset = await readOptional(url);
  if (dataset === undefined) return undefined;
  const report = new AppraisalCredential(url, dataset, DataFactory);
  const property = report.credentialSubject.subjectProperty;
  const appraiser = report.evidence.generatedBy;
  return {
    address: property.address.streetAddress,
    appraiser: appraiser.appraiserName,
    issued: report.validFrom,
    licenseId: appraiser.licenseId,
    url,
    valueUsd: property.appraisedValue?.amountValue,
  };
}

export interface FieldFacts {
  readonly property: SubjectProperty;
  readonly agreement: PurchaseAgreement;
}

/** The two resources G5 covers, read from Alex's pod. Refused once G5 has ended. */
export async function readFieldFacts(): Promise<FieldFacts> {
  const propertyUrl = urls.property();
  const agreementUrl = urls.agreement();
  return {
    agreement: new PurchaseAgreement(agreementUrl, await readRequired(agreementUrl), DataFactory),
    property: new SubjectProperty(propertyUrl, await readRequired(propertyUrl), DataFactory),
  };
}

/** The probe: a read outside G5. The pod is expected to refuse it. */
export async function probeCredit(): Promise<number> {
  const response = await podFetch(urls.credit(), { headers: { accept: "text/turtle" } });
  return response.status;
}
