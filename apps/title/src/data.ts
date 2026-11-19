// AUTHORED-BY Claude Opus 5.5
/**
 * What Sextant reads, always as Sextant (`podFetch`): Juniper's order, its own inbox and file,
 * the two resources grant G6 lets it read in Alex's pod, and the county's public register.
 * Parsed with `@jeswr/fetch-rdf`, read through the `@mortgage/data-model` wrappers. Note that
 * G6 lets Sextant WRITE `mortgage/closing/` but not read it: the copies it delivers there are not
 * read back.
 */
import { parseRdf } from "@jeswr/fetch-rdf";
import { membersOf } from "@mortgage/content/mortgage/grants";
import { PodRequestError } from "@mortgage/content/mortgage/world";
import {
  AgentProfile,
  InboxMessage,
  MORT,
  PurchaseAgreement,
  RecordedInstrument,
  ServiceOrder,
  TitleCommitmentCredential,
} from "@mortgage/data-model";
import type { DatasetCore } from "@rdfjs/types";
import { DataFactory } from "n3";
import { ACTS_AS, podFetch, podUrl } from "./runtime.ts";

export const FILE_NUMBER = "STE-2026-0417";
export const LOAN_NUMBER = "JHL-1001";

export const urls = {
  agreement: () => podUrl("alex", "property/purchase-agreement"),
  /** The commitment credential's id: Alex's copy (journey's CREDENTIALS["title-commitment"]). */
  alexCommitment: () => podUrl("alex", "mortgage/closing/title-commitment"),
  commitment: () => podUrl(ACTS_AS, `files/${FILE_NUMBER}/commitment`),
  inbox: () => podUrl(ACTS_AS, "inbox/"),
  order: () => podUrl("lender", `loans/${LOAN_NUMBER}/orders/title`),
  profile: () => podUrl("alex", "profile/card"),
  settlement: () => podUrl("alex", "mortgage/closing/settlement-statement"),
};

async function readOptional(url: string): Promise<DatasetCore | undefined> {
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

const names = new Map<string, string>();

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

export interface Message {
  readonly url: string;
  readonly kind: string;
  readonly from: string;
  readonly summary: string;
  readonly published: Date;
  readonly objects: string[];
}

export interface FileState {
  readonly order:
    | {
        readonly number: string;
        readonly loanNumber: string;
        readonly customer: string;
        readonly ordered: Date;
      }
    | undefined;
  readonly messages: Message[];
  readonly commitment: CommitmentView | undefined;
  /** Juniper's closing instructions arrived: the signing has been held. */
  readonly closed: boolean;
  /** The county confirmed recording. */
  readonly recorded: boolean;
}

export interface CommitmentView {
  readonly number: string;
  readonly address: string;
  readonly vestedOwner: string;
  readonly proposedInsured: string[];
  readonly ownerPolicyUsd: number;
  readonly loanPolicyUsd: number;
  readonly requirements: string[];
  readonly exceptions: string[];
  readonly searchedThrough: Date;
  readonly issued: Date;
}

async function readMessages(): Promise<Message[]> {
  const messages: Message[] = [];
  for (const url of await membersOf(podFetch, urls.inbox())) {
    const message = new InboxMessage(url, await readRequired(url), DataFactory);
    messages.push({
      from: await nameOf(message.actorIri),
      kind: message.messageKind,
      objects: [...message.objectIris].sort(),
      published: message.published,
      summary: message.summary,
      url,
    });
  }
  return messages.sort((a, b) => a.published.getTime() - b.published.getTime());
}

/** The signed commitment as Sextant keeps it in its own file (after step 14). */
export async function readCommitment(): Promise<CommitmentView | undefined> {
  const url = urls.commitment();
  const dataset = await readOptional(url);
  if (dataset === undefined) return undefined;
  // Sextant's file copy carries the same credential, whose id is Alex's copy.
  const credential = new TitleCommitmentCredential(urls.alexCommitment(), dataset, DataFactory);
  const subject = credential.credentialSubject;
  return {
    address: subject.subjectProperty.address.streetAddress,
    exceptions: [...subject.exceptions],
    issued: credential.validFrom,
    loanPolicyUsd: subject.loanPolicyAmountUsd,
    number: subject.commitmentNumber,
    ownerPolicyUsd: subject.ownerPolicyAmountUsd,
    proposedInsured: [...subject.proposedInsured],
    requirements: [...subject.requirements],
    searchedThrough: subject.searchedThrough,
    vestedOwner: subject.vestedOwner,
  };
}

export async function readFile(): Promise<FileState> {
  const orderUrl = urls.order();
  const [orderData, messages, commitment] = await Promise.all([
    readIfAllowed(orderUrl),
    readMessages(),
    readCommitment(),
  ]);
  const order =
    orderData === undefined ? undefined : new ServiceOrder(orderUrl, orderData, DataFactory);
  const has = (kind: string) => messages.some((message) => message.kind === kind);
  return {
    closed: has(MORT.MessageKind_ClosingInstructions),
    commitment,
    messages,
    order:
      order === undefined
        ? undefined
        : {
            customer: await nameOf(order.customerIri),
            loanNumber: order.loanNumber,
            number: order.orderNumber,
            ordered: order.orderDate,
          },
    recorded: has(MORT.MessageKind_RecordingConfirmation),
  };
}

export interface Parties {
  /** How the buyer will hold title, from the WebID profile (G6). */
  readonly buyer: string;
  readonly seller: string;
  readonly priceUsd: number;
  readonly address: string;
  readonly closingDate: Date;
}

/** The two reads G6 allows: the buyer's profile and the purchase agreement. */
export async function readParties(): Promise<Parties> {
  const profileUrl = urls.profile();
  const agreementUrl = urls.agreement();
  const profile = new AgentProfile(profileUrl, await readRequired(profileUrl), DataFactory);
  const agreement = new PurchaseAgreement(
    agreementUrl,
    await readRequired(agreementUrl),
    DataFactory,
  );
  return {
    address: agreement.subjectProperty.address.streetAddress,
    buyer: profile.agent.titleVesting ?? profile.agent.name,
    closingDate: agreement.closingDate,
    priceUsd: agreement.purchasePriceUsd,
    seller: agreement.sellerName,
  };
}

export interface Instrument {
  readonly reference: string;
  readonly name: string;
  readonly recordedAt: Date;
}

/** The instruments the county's confirmation names, read from the public register. */
export async function readRecorded(messages: Message[]): Promise<Instrument[]> {
  const confirmation = messages.find(
    (message) => message.kind === MORT.MessageKind_RecordingConfirmation,
  );
  if (confirmation === undefined) return [];
  const instruments: Instrument[] = [];
  for (const url of confirmation.objects) {
    const record = new RecordedInstrument(url, await readRequired(url), DataFactory);
    instruments.push({
      name: record.name,
      recordedAt: record.recordedAt,
      reference: record.recordingReference,
    });
  }
  return instruments;
}

/**
 * Try to read back the settlement statement Sextant delivered to Alex's pod. G6 grants Write on
 * `mortgage/closing/` and no Read, so the pod refuses. Returns the status code.
 */
export async function probeSettlement(): Promise<number> {
  const response = await podFetch(urls.settlement(), { headers: { accept: "text/turtle" } });
  return response.status;
}
