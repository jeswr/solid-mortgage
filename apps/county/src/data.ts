// AUTHORED-BY Claude Opus 5.5
/**
 * What the Recorder's office reads. Two kinds of reader:
 *
 * - the clerk, signed in as the county (`podFetch`), reads the eRecording inbox;
 * - the public search reads the register ANONYMOUSLY: a plain request with no identity, which
 *   the pod answers because the register's access rule lets anyone read it.
 */
import { parseRdf } from "@jeswr/fetch-rdf";
import { membersOf } from "@mortgage/content/mortgage/grants";
import { PodRequestError } from "@mortgage/content/mortgage/world";
import { AgentProfile, InboxMessage, MORT, RecordedInstrument } from "@mortgage/data-model";
import type { DatasetCore } from "@rdfjs/types";
import { DataFactory } from "n3";
import { ACTS_AS, podFetch, podUrl, startDemo } from "./runtime.ts";

export const urls = {
  inbox: () => podUrl(ACTS_AS, "inbox/"),
  record: (reference: string) => podUrl(ACTS_AS, `records/${reference}`),
  register: () => podUrl(ACTS_AS, "records/"),
};

/**
 * A request with no identity at all: no `X-Demo-Agent`, no cookies. In service-worker mode the
 * pod host treats it as anonymous, so the access check is the one any member of the public gets.
 */
export const anonymousFetch: typeof fetch = async (input, init) => {
  await startDemo();
  return fetch(input, { ...init, credentials: "omit" });
};

async function read(fetcher: typeof fetch, url: string): Promise<DatasetCore | undefined> {
  const response = await fetcher(url, { headers: { accept: "text/turtle" } });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new PodRequestError("GET", url, response.status);
  return parseRdf(await response.text(), response.headers.get("content-type"), { baseIRI: url });
}

export interface RecordView {
  readonly url: string;
  readonly reference: string;
  readonly name: string;
  readonly recordedAt: Date;
  readonly grantors: string[];
  readonly grantees: string[];
  readonly parcel: string;
}

function recordView(url: string, dataset: DatasetCore): RecordView {
  const record = new RecordedInstrument(url, dataset, DataFactory);
  return {
    grantees: [...record.grantees].sort(),
    grantors: [...record.grantors].sort(),
    name: record.name,
    parcel: record.parcelNumber,
    recordedAt: record.recordedAt,
    reference: record.recordingReference,
    url,
  };
}

/** Every recorded instrument, read the way the public reads it. */
export async function readRegister(fetcher: typeof fetch = anonymousFetch): Promise<RecordView[]> {
  const members = await membersOf(fetcher, urls.register());
  const records: RecordView[] = [];
  for (const url of members) {
    const dataset = await read(fetcher, url);
    if (dataset !== undefined) records.push(recordView(url, dataset));
  }
  return records.sort((a, b) => a.reference.localeCompare(b.reference));
}

/** One instrument by its number, read anonymously. `undefined` when there is none. */
export async function readRecord(reference: string): Promise<RecordView | undefined> {
  const url = urls.record(reference);
  const dataset = await read(anonymousFetch, url);
  return dataset === undefined ? undefined : recordView(url, dataset);
}

export interface Submission {
  readonly url: string;
  readonly from: string;
  readonly summary: string;
  readonly received: Date;
}

const names = new Map<string, string>();

async function nameOf(webid: string): Promise<string> {
  const known = names.get(webid);
  if (known !== undefined) return known;
  const card = new URL(webid);
  card.hash = "";
  const dataset = await read(podFetch, card.href).catch(() => undefined);
  const name =
    dataset === undefined ? webid : new AgentProfile(card.href, dataset, DataFactory).agent.name;
  names.set(webid, name);
  return name;
}

/** eRecording submissions in the county's inbox, read by the clerk as the county. */
export async function readSubmissions(): Promise<Submission[]> {
  const submissions: Submission[] = [];
  for (const url of await membersOf(podFetch, urls.inbox())) {
    const dataset = await read(podFetch, url);
    if (dataset === undefined) continue;
    const message = new InboxMessage(url, dataset, DataFactory);
    if (message.messageKind !== MORT.MessageKind_RecordingSubmission) continue;
    submissions.push({
      from: await nameOf(message.actorIri),
      received: message.published,
      summary: message.summary,
      url,
    });
  }
  return submissions.sort((a, b) => a.received.getTime() - b.received.getTime());
}

/** The same anonymous visitor asks for the eRecording queue, which is not public. Returns the status. */
export async function probeQueueAnonymously(): Promise<number> {
  const response = await anonymousFetch(urls.inbox(), { headers: { accept: "text/turtle" } });
  return response.status;
}
