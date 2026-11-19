// AUTHORED-BY Claude Opus 5.5
/**
 * What Ledgerly's screens read from the pods. Everything here acts as Ledgerly: its own
 * `issued/` records, its own status list and inbox, and a deliberate attempt to read the slot it
 * fills in Alex's pod (which the pod refuses).
 */
import { membersOf } from "@mortgage/content/mortgage/grants";
import { statusListOf } from "@mortgage/content/mortgage/issuers";
import { CREDENTIALS } from "@mortgage/content/mortgage/journey";
import { handledUrl, readMessage } from "@mortgage/content/mortgage/messages";
import { at, podUrl, readDataset, statusOf, type World } from "@mortgage/content/mortgage/world";
import { CredentialPointer, MORT } from "@mortgage/data-model";
import { deriveStatusIndex } from "@mortgage/vc-kit";
import { DataFactory } from "n3";
import { lastSegment, statusSeed } from "./view.ts";

export const OWNER = "payroll" as const;

/** Where Ledgerly's credential lives in Alex's pod. */
export const slotUrl = (world: World): string =>
  podUrl(world, "alex", CREDENTIALS["employment-income"].path);

export interface Issuance {
  /** The record's URL in Ledgerly's pod. */
  readonly record: string;
  readonly name: string;
  /** Where the credential went (Alex's pod). */
  readonly credentialUrl: string;
  readonly credentialType: string;
  readonly sha256: string;
  readonly asOf: Date;
  readonly statusIndex: number;
  /** `true` once Ledgerly has revoked it in its status list; `undefined` if the list could not be read. */
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
  // "Now" is at least the latest issuance Ledgerly knows of: the list is re-signed when an entry
  // is revoked, and a list read before its own validFrom does not verify.
  const latest = Math.max(0, ...pointers.map((pointer) => pointer.asOf.getTime()));
  const now = new Date(Math.max(at(world, "12:00").getTime(), latest + 10 * 60_000));
  const issuances: Issuance[] = [];
  for (const pointer of pointers) {
    const record = pointer.value;
    const name = lastSegment(record);
    const statusIndex = deriveStatusIndex(statusSeed(name, pointer.url));
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
      name,
      record,
      revoked,
      sha256: pointer.sha256,
      statusIndex,
    });
  }
  return issuances.sort((a, b) => a.asOf.getTime() - b.asOf.getTime());
}

export interface RefreshRequest {
  readonly url: string;
  readonly from: string;
  readonly summary: string;
  readonly published: Date;
  readonly about: string[];
  /** Ledgerly's back office has taken it in hand (its `handled/` record exists). */
  readonly answered: boolean;
}

export async function loadRefreshRequests(world: World): Promise<RefreshRequest[]> {
  const fetcher = world.fetchAs(OWNER);
  const requests: RefreshRequest[] = [];
  for (const url of await membersOf(fetcher, podUrl(world, OWNER, "inbox/"))) {
    const message = await readMessage(world, OWNER, url).catch(() => undefined);
    if (message === undefined || message.messageKind !== MORT.MessageKind_RefreshRequest) continue;
    requests.push({
      about: [...message.objectIris],
      answered: (await statusOf(fetcher, handledUrl(world, OWNER, url))) === 200,
      from: message.actorIri,
      published: message.published,
      summary: message.summary,
      url,
    });
  }
  return requests.sort((a, b) => b.published.getTime() - a.published.getTime());
}

/** Ledgerly tries to read the credential it wrote. The pod answers; this returns the status. */
export function tryReadBack(world: World): Promise<number> {
  return statusOf(world.fetchAs(OWNER), slotUrl(world));
}
