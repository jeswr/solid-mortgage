// AUTHORED-BY Claude Opus 5.5
/**
 * What the wallet's screens read from Alex's pod. Every value shown on a screen comes from here:
 * a request made as Alex through the page's `World`, parsed with `@jeswr/fetch-rdf` and read
 * with the `@mortgage/data-model` wrappers. Nothing is a hard-coded copy of pod data.
 */

import { type GrantRecord, grantRecords, membersOf } from "@mortgage/content/mortgage/grants";
import { CREDENTIALS, type CredentialName } from "@mortgage/content/mortgage/journey";
import {
  PodRequestError,
  podUrl,
  readDataset,
  type World,
  webid,
} from "@mortgage/content/mortgage/world";
import {
  AccessRequest,
  AssetCredential,
  ConsentReceipt,
  type CredentialResource,
  CreditScoreCredential,
  DCTERMS,
  EmploymentIncomeCredential,
  EvidenceOfInsuranceCredential,
  IdentityCredential,
  type MortgageResourceKind,
  ODRL,
  SCHEMA,
  TitleCommitmentCredential,
} from "@mortgage/data-model";
import type { DatasetCore } from "@rdfjs/types";
import {
  LiteralAs,
  NamedNodeAs,
  NamedNodeFrom,
  OptionalFrom,
  SetFrom,
  TermAs,
  TermFrom,
  TermWrapper,
} from "@rdfjs/wrapper";
import { DataFactory } from "n3";
import { labelOfPath } from "./explain.ts";

export const alexRoot = (world: World) => podUrl(world, "alex");
const alexUrl = (world: World, path: string) => podUrl(world, "alex", path);
const pathOf = (world: World, url: string) => url.slice(alexRoot(world).length);
const fetcher = (world: World) => world.fetchAs("alex");

// --- Home --------------------------------------------------------------------------------------

export interface Drawer {
  readonly path: string;
  readonly label: string;
  /** Resources in the drawer, counting the members of its sub-containers. */
  readonly count: number;
  readonly subfolders: readonly { path: string; label: string; count: number }[];
}

/** The pod's top-level containers and how many documents each holds. */
export async function readDrawers(world: World): Promise<Drawer[]> {
  const alex = fetcher(world);
  const drawers: Drawer[] = [];
  for (const url of await membersOf(alex, alexRoot(world))) {
    if (!url.endsWith("/")) continue;
    const members = await membersOf(alex, url);
    const subfolders = [];
    let count = 0;
    for (const member of members) {
      if (!member.endsWith("/")) {
        count += 1;
        continue;
      }
      const inner = (await membersOf(alex, member)).length;
      count += inner;
      const path = pathOf(world, member);
      subfolders.push({ count: inner, label: labelOfPath(path), path });
    }
    const path = pathOf(world, url);
    drawers.push({ count, label: labelOfPath(path), path, subfolders });
  }
  return drawers;
}

// --- Documents (credentials) -------------------------------------------------------------------

type CredentialCtor = new (
  term: string,
  dataset: DatasetCore,
  factory: typeof DataFactory,
) => CredentialResource;

const CREDENTIAL_CLASSES: Partial<Record<MortgageResourceKind, CredentialCtor>> = {
  "asset-credential": AssetCredential,
  "credit-score-credential": CreditScoreCredential,
  "employment-income-credential": EmploymentIncomeCredential,
  "evidence-of-insurance-credential": EvidenceOfInsuranceCredential,
  "identity-credential": IdentityCredential,
  "title-commitment-credential": TitleCommitmentCredential,
};

export interface CredentialCard {
  readonly name: CredentialName;
  readonly url: string;
  readonly path: string;
  readonly label: string;
  readonly kind: MortgageResourceKind;
  readonly issuer: string;
  readonly validFrom: Date;
  readonly validUntil: Date | undefined;
  /** The status list the issuer publishes this credential's revocation bit in, if named. */
  readonly statusList: string | undefined;
  /** What the credential says, in a line, for the holder's own eyes. */
  readonly summary: string;
}

const CRED_STATUS = "https://www.w3.org/2018/credentials#credentialStatus";
const STATUS_LIST_CREDENTIAL = "https://www.w3.org/ns/credentials/status#statusListCredential";

/** A `credentialStatus` entry: the suite's issuers write it as a blank node (vc-kit status.ts). */
class StatusEntry extends TermWrapper {
  get statusList(): string | undefined {
    return OptionalFrom.subjectPredicate(this, STATUS_LIST_CREDENTIAL, NamedNodeAs.string);
  }
}

/** The credential node, read only for its status entries (named or blank). */
class StatusHolder extends TermWrapper {
  get entries(): Set<StatusEntry> {
    return SetFrom.subjectPredicate(
      this,
      CRED_STATUS,
      TermAs.instance(StatusEntry),
      TermFrom.instance,
    );
  }
}

function statusListOf(url: string, dataset: DatasetCore): string | undefined {
  for (const entry of new StatusHolder(url, dataset, DataFactory).entries) {
    const list = entry.statusList;
    if (list !== undefined) return list;
  }
  return undefined;
}

const usd = (amount: number) => `$${amount.toLocaleString("en-US")}`;
const day = (date: Date) => date.toISOString().slice(0, 10);

function summaryOf(credential: CredentialResource): string {
  try {
    if (credential instanceof EmploymentIncomeCredential) {
      const subject = credential.credentialSubject;
      return `${subject.jobTitle}, ${usd(subject.monthlyGrossIncomeUsd)} a month before tax`;
    }
    if (credential instanceof CreditScoreCredential) {
      return `Credit score ${credential.credentialSubject.creditScoreValue}`;
    }
    if (credential instanceof AssetCredential) {
      const accounts = [...credential.credentialSubject.accounts];
      return `${accounts.length} account${accounts.length === 1 ? "" : "s"} summarised`;
    }
    if (credential instanceof IdentityCredential) {
      const subject = credential.credentialSubject;
      return `${subject.name}, tax ID ending ${subject.taxIdLast4}`;
    }
    if (credential instanceof EvidenceOfInsuranceCredential) {
      const subject = credential.credentialSubject;
      return `Policy ${subject.policyNumber}, dwelling cover ${usd(subject.dwellingCoverageUsd)}`;
    }
    if (credential instanceof TitleCommitmentCredential) {
      return `Commitment ${credential.credentialSubject.commitmentNumber}`;
    }
  } catch {
    // A claim the wrapper cannot read is left out of the one-line summary, not invented.
  }
  return "";
}

/** The credentials the journey puts in Alex's pod that are there now. */
export async function readCredentials(world: World): Promise<CredentialCard[]> {
  const alex = fetcher(world);
  const cards: CredentialCard[] = [];
  for (const [name, entry] of Object.entries(CREDENTIALS) as [
    CredentialName,
    (typeof CREDENTIALS)[CredentialName],
  ][]) {
    const url = alexUrl(world, entry.path);
    let dataset: DatasetCore;
    try {
      dataset = await readDataset(alex, url);
    } catch (error) {
      if (error instanceof PodRequestError && error.status === 404) continue;
      throw error;
    }
    const Ctor = CREDENTIAL_CLASSES[entry.kind];
    if (Ctor === undefined) continue;
    const credential = new Ctor(url, dataset, DataFactory);
    cards.push({
      issuer: credential.issuer,
      kind: entry.kind,
      label: labelOfPath(entry.path),
      name,
      path: entry.path,
      statusList: statusListOf(url, dataset),
      summary: summaryOf(credential),
      url,
      validFrom: credential.validFrom,
      validUntil: credential.validUntil,
    });
  }
  return cards;
}

export { day as isoDay };

// --- Requests ----------------------------------------------------------------------------------

export interface RequestItem {
  readonly url: string;
  readonly request: AccessRequest;
  /** Answered: an agreement in `policies/` names this request as its source. */
  readonly answered: boolean;
}

/** The access requests in Alex's inbox, newest first, each marked answered or not. */
export async function readRequests(world: World): Promise<RequestItem[]> {
  const alex = fetcher(world);
  const records = await grantRecords(world);
  const answered = new Set(
    records.map((record) => record.agreement.sourceIri).filter((iri) => iri !== undefined),
  );
  const items: RequestItem[] = [];
  for (const url of await membersOf(alex, alexUrl(world, "inbox/"))) {
    if (url.endsWith("/")) continue;
    const dataset = await readDataset(alex, url);
    const request = new AccessRequest(url, dataset, DataFactory);
    // The inbox takes appends from anyone signed in: only well-formed requests are shown.
    if (!request.typeIris.has(ODRL.Request)) continue;
    try {
      void request.grantCode;
      void request.assigneeIri;
      void request.permissions;
    } catch {
      continue;
    }
    items.push({ answered: answered.has(url), request, url });
  }
  return items.sort((a, b) => safeTime(b.request) - safeTime(a.request));
}

function safeTime(request: AccessRequest): number {
  try {
    return request.issued.getTime();
  } catch {
    return 0;
  }
}

/** One request by URL, read as Alex. Refuses a URL outside Alex's inbox. */
export async function readRequest(world: World, url: string): Promise<RequestItem> {
  const inbox = alexUrl(world, "inbox/");
  if (!url.startsWith(inbox) || url.length === inbox.length || url.includes("..")) {
    throw new Error("That is not a request in your inbox.");
  }
  const all = await readRequests(world);
  const found = all.find((item) => item.url === url);
  if (found === undefined) throw new Error("That request is no longer in your inbox.");
  return found;
}

// --- Sharing and activity ----------------------------------------------------------------------

export interface ReceiptItem {
  readonly url: string;
  readonly receipt: ConsentReceipt;
}

/** Every consent record in `consents/`, newest first. */
export async function readReceipts(world: World): Promise<ReceiptItem[]> {
  const alex = fetcher(world);
  const items: ReceiptItem[] = [];
  for (const url of await membersOf(alex, alexUrl(world, "consents/"))) {
    if (url.endsWith("/")) continue;
    items.push({
      receipt: new ConsentReceipt(url, await readDataset(alex, url), DataFactory),
      url,
    });
  }
  return items.sort((a, b) => b.receipt.issued.getTime() - a.receipt.issued.getTime());
}

export interface GrantItem {
  readonly record: GrantRecord;
  /** The consent records of this grant, oldest first. */
  readonly history: readonly ReceiptItem[];
}

/** The grants on record with their consent history (state from `grantRecords`). */
export async function readGrants(world: World): Promise<GrantItem[]> {
  const records = await grantRecords(world);
  const receipts = await readReceipts(world);
  return records.map((record) => ({
    history: receipts
      .filter((item) => item.receipt.policyIri === record.policy)
      .sort((a, b) => a.receipt.issued.getTime() - b.receipt.issued.getTime()),
    record,
  }));
}

// --- Inbox (documents delivered) ---------------------------------------------------------------

/** The fields every delivered document shares: a name, an author, a date, maybe a summary. */
class DeliveredNode extends TermWrapper {
  get name(): string | undefined {
    return OptionalFrom.subjectPredicate(this, SCHEMA.name, LiteralAs.string);
  }
  get description(): string | undefined {
    return (
      OptionalFrom.subjectPredicate(this, SCHEMA.description, LiteralAs.string) ??
      OptionalFrom.subjectPredicate(this, DCTERMS.description, LiteralAs.string)
    );
  }
  get creator(): string | undefined {
    return OptionalFrom.subjectPredicate(this, DCTERMS.creator, NamedNodeAs.string);
  }
  get issued(): Date | undefined {
    return OptionalFrom.subjectPredicate(this, DCTERMS.issued, LiteralAs.date);
  }
  get types(): Set<string> {
    return SetFrom.subjectPredicate(
      this,
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
      NamedNodeAs.string,
      NamedNodeFrom.string,
    );
  }
}

export interface DeliveredItem {
  readonly url: string;
  readonly path: string;
  readonly name: string;
  readonly description: string | undefined;
  readonly from: string | undefined;
  readonly issued: Date | undefined;
}

/** The drawers organisations deliver documents into. */
export const DELIVERY_DRAWERS = [
  "mortgage/juniper/",
  "mortgage/closing/",
  "mortgage/servicing/",
] as const;

async function walk(world: World, container: string, out: string[]): Promise<void> {
  for (const member of await membersOf(fetcher(world), container)) {
    if (member.endsWith("/")) await walk(world, member, out);
    else out.push(member);
  }
}

/** Documents organisations have written into Alex's pod, newest first. */
export async function readDelivered(world: World): Promise<DeliveredItem[]> {
  const urls: string[] = [];
  for (const drawer of DELIVERY_DRAWERS) {
    try {
      await walk(world, alexUrl(world, drawer), urls);
    } catch (error) {
      if (error instanceof PodRequestError && error.status === 404) continue;
      throw error;
    }
  }
  const items: DeliveredItem[] = [];
  for (const url of urls) {
    const node = new DeliveredNode(url, await readDataset(fetcher(world), url), DataFactory);
    const path = pathOf(world, url);
    let issued: Date | undefined;
    try {
      issued = node.issued;
    } catch {
      issued = undefined;
    }
    items.push({
      description: node.description,
      from: node.creator,
      issued,
      name: node.name ?? labelOfPath(path),
      path,
      url,
    });
  }
  return items.sort((a, b) => (b.issued?.getTime() ?? 0) - (a.issued?.getTime() ?? 0));
}

/** Alex's own WebID in this world. */
export const alexWebid = (world: World) => webid(world, "alex");
