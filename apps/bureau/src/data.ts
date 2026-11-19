// AUTHORED-BY Claude Opus 5.5
/**
 * What Quillon's screens read from the pods, always acting as Quillon: its own `issued/` records,
 * status list, inbox, `handled/` records and order files, and deliberate reads in Alex's pod (the
 * slot it fills, which it may not read; the authorisation, which it may read only while Alex's
 * application consent stands).
 */
import { membersOf } from "@mortgage/content/mortgage/grants";
import { statusListOf } from "@mortgage/content/mortgage/issuers";
import { CREDENTIALS, CREDIT_AUTHORISATION } from "@mortgage/content/mortgage/journey";
import { handledUrl, readMessage } from "@mortgage/content/mortgage/messages";
import { at, podUrl, readDataset, statusOf, type World } from "@mortgage/content/mortgage/world";
import { CredentialPointer, CreditReport, MORT } from "@mortgage/data-model";
import { deriveStatusIndex } from "@mortgage/vc-kit";
import { DataFactory } from "n3";
import { lastSegment } from "./view.ts";

export const OWNER = "bureau" as const;

export interface Issuance {
  readonly record: string;
  readonly name: string;
  readonly credentialUrl: string;
  readonly credentialType: string;
  readonly sha256: string;
  readonly asOf: Date;
  readonly statusIndex: number;
  /** `undefined` when the status list could not be read. */
  readonly revoked: boolean | undefined;
}

export async function loadIssuances(world: World): Promise<Issuance[]> {
  const fetcher = world.fetchAs(OWNER);
  const records = await membersOf(fetcher, podUrl(world, OWNER, "issued/"));
  const list = records.length === 0 ? undefined : await statusListOf(world, OWNER);
  const pointers = await Promise.all(
    records.map(
      async (record) =>
        new CredentialPointer(record, await readDataset(fetcher, record), DataFactory),
    ),
  );
  // A list read before its own validFrom does not verify; read it at or after the latest issue.
  const latest = Math.max(0, ...pointers.map((pointer) => pointer.asOf.getTime()));
  const now = new Date(Math.max(at(world, "12:00").getTime(), latest + 10 * 60_000));
  const issuances: Issuance[] = [];
  for (const pointer of pointers) {
    // The summary and its proof anchor each take their index from their own URL.
    const statusIndex = deriveStatusIndex(pointer.url);
    let revoked: boolean | undefined;
    try {
      revoked = await list?.readBit(statusIndex, { now });
    } catch {
      revoked = undefined;
    }
    issuances.push({
      asOf: pointer.asOf,
      credentialType: pointer.credentialType,
      credentialUrl: pointer.url,
      name: lastSegment(pointer.value),
      record: pointer.value,
      revoked,
      sha256: pointer.sha256,
      statusIndex,
    });
  }
  return issuances.sort((a, b) => a.asOf.getTime() - b.asOf.getTime());
}

export interface Report {
  readonly url: string;
  readonly reportNumber: string;
  readonly permissiblePurpose: string;
  readonly authorisedBy: string;
  readonly issued: Date;
  readonly scores: readonly { source: string; score: number }[];
}

export interface Order {
  readonly url: string;
  readonly from: string;
  readonly received: Date;
  readonly loanNumber: string | undefined;
  /** The consumer's authorisation the order names, if any. */
  readonly authorisation: string | undefined;
  /** Quillon's back office has taken it in hand. */
  readonly taken: boolean;
  /** The report file Quillon released for this order, once it exists. */
  readonly report: Report | undefined;
}

async function readReport(world: World, loanNumber: string): Promise<Report | undefined> {
  const fetcher = world.fetchAs(OWNER);
  const url = podUrl(world, OWNER, `orders/${loanNumber}/report`);
  if ((await statusOf(fetcher, url)) !== 200) return undefined;
  const report = new CreditReport(url, await readDataset(fetcher, url), DataFactory);
  return {
    authorisedBy: report.authorisedByIri,
    issued: report.issued,
    permissiblePurpose: report.permissiblePurpose,
    reportNumber: report.reportNumber,
    scores: report.scores.map((score) => ({ score: score.score, source: score.source })),
    url,
  };
}

/** Credit report orders in Quillon's inbox, most recent first. */
export async function loadOrders(world: World): Promise<Order[]> {
  const fetcher = world.fetchAs(OWNER);
  const authorisationUrl = podUrl(world, "alex", CREDIT_AUTHORISATION);
  const orders: Order[] = [];
  for (const url of await membersOf(fetcher, podUrl(world, OWNER, "inbox/"))) {
    const message = await readMessage(world, OWNER, url).catch(() => undefined);
    if (message === undefined || message.messageKind !== MORT.MessageKind_CreditReportOrder) {
      continue;
    }
    const loanNumber = message.loanNumber;
    orders.push({
      authorisation: message.objectIris.has(authorisationUrl) ? authorisationUrl : undefined,
      from: message.actorIri,
      loanNumber,
      received: message.published,
      report: loanNumber === undefined ? undefined : await readReport(world, loanNumber),
      taken: (await statusOf(fetcher, handledUrl(world, OWNER, url))) === 200,
      url,
    });
  }
  return orders.sort((a, b) => b.received.getTime() - a.received.getTime());
}

/** Quillon checks the consumer's authorisation at source. The pod's status is the answer. */
export function checkAuthorisation(world: World, url: string): Promise<number> {
  return statusOf(world.fetchAs(OWNER), url);
}

/** Quillon tries to read the summary it wrote into Alex's pod. */
export function tryReadBack(world: World): Promise<number> {
  return statusOf(world.fetchAs(OWNER), podUrl(world, "alex", CREDENTIALS["credit-summary"].path));
}
