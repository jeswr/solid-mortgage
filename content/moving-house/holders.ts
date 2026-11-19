// AUTHORED-BY Claude Opus 5.5
/**
 * The organisations' side: each keeps a copy of Alex's address in its own pod, says where it came
 * from (`prov:wasDerivedFrom`), under which agreement (`odrl:hasPolicy`) and when it was read
 * (`prov:generatedAtTime`). A copy is refreshed only by reading the source again, under the grant.
 *
 * - On the wallet's grant notice, the back office subscribes to `profile/address` (runtime change
 *   notification). The bank, payroll and the servicer read it at once; the state, the county and
 *   the insurer read it when their page is opened (steps 4 to 6).
 * - On a change notice, every subscriber reads again. A subscriber whose grant was withdrawn is
 *   refused by the pod (403); it marks its copy stale (`prov:invalidatedAtTime`) and keeps it.
 */

import { DataFactory } from "n3";
import {
  PodRequestError,
  podUrl,
  putResource,
  readDataset,
  statusOf,
  type World,
  webid,
} from "../mortgage/world.js";
import { AddressRecord, buildAddressRecord } from "./address.js";
import type { AddressValue } from "./facts.js";
import {
  addressUrl,
  codeOf,
  type Holder,
  holderPolicyUrl,
  RECEIPT_PATH,
  readNotice,
} from "./grants.js";
import { issuedVersions, issueLicence, readIssuance } from "./issuer.js";

/** Where each organisation keeps its copy, in its own pod. */
export const COPY_PATHS: Readonly<Record<Holder, string>> = Object.freeze({
  bank: "customers/alex-address",
  county: "treasurer/alex-address",
  insurer: "policyholders/alex-address",
  payroll: "employees/alex-address",
  servicer: "accounts/alex-address",
  state: "licensing/alex-address",
});

/** The holders whose back office reads as soon as the grant arrives. */
export const READ_ON_GRANT: readonly Holder[] = Object.freeze(["bank", "payroll", "servicer"]);

/** The holders whose page reads on its first visit (tour steps 4, 5 and 6). */
export const READ_ON_VISIT: readonly Holder[] = Object.freeze(["state", "county", "insurer"]);

export function copyUrl(world: Pick<World, "podOrigin">, holder: Holder): string {
  return podUrl(world, holder, COPY_PATHS[holder]);
}

/** The organisation's copy, or `undefined` when it has none yet. */
export async function readCopy(world: World, holder: Holder): Promise<AddressRecord | undefined> {
  const url = copyUrl(world, holder);
  const fetcher = world.fetchAs(holder);
  if ((await statusOf(fetcher, url)) !== 200) return undefined;
  return new AddressRecord(url, await readDataset(fetcher, url), DataFactory);
}

/** Read Alex's address as `holder`. Throws {@link PodRequestError} when the pod refuses. */
export async function readSource(world: World, holder: Holder): Promise<AddressRecord> {
  const url = addressUrl(world);
  return new AddressRecord(url, await readDataset(world.fetchAs(holder), url), DataFactory);
}

/** Read the source and write the copy. Returns the address read. */
export async function readAndKeep(
  world: World,
  holder: Holder,
  time: string,
): Promise<AddressValue> {
  const source = await readSource(world, holder);
  const now = world.calendar.clock(world.day, time);
  await putResource(
    world.fetchAs(holder),
    buildAddressRecord({
      address: source.address,
      derivedFrom: [addressUrl(world)],
      generatedAt: now,
      iri: copyUrl(world, holder),
      modified: now,
      policy: holderPolicyUrl(world, codeOf(holder)),
      validFrom: source.validFrom,
    }),
  );
  return source.address;
}

/** Mark the copy as no longer current: the source changed and could not be read. */
export async function markStale(world: World, holder: Holder, time: string): Promise<void> {
  const copy = await readCopy(world, holder);
  if (copy === undefined) return;
  const now = world.calendar.clock(world.day, time);
  await putResource(
    world.fetchAs(holder),
    buildAddressRecord({
      address: copy.address,
      derivedFrom: [...copy.derivedFrom],
      ...(copy.generatedAt === undefined ? {} : { generatedAt: copy.generatedAt }),
      invalidatedAt: now,
      iri: copyUrl(world, holder),
      modified: now,
      ...(copy.policy === undefined ? {} : { policy: copy.policy }),
      validFrom: copy.validFrom,
    }),
  );
}

export interface NoticeOutcome {
  readonly holder: Holder;
  readonly subscribed: string;
  readonly read: boolean;
}

/**
 * The back office takes the wallet's notice: checks that it names this organisation and an H
 * agreement in Alex's pod, subscribes to the address, and (bank, payroll, servicer) reads it.
 */
export async function takeGrantNotice(
  world: World,
  holder: Holder,
  noticeUrl: string,
  watch: (topic: string) => Promise<void>,
  time = "10:25",
): Promise<NoticeOutcome> {
  const notice = await readNotice(world, holder, noticeUrl);
  const expected = holderPolicyUrl(world, codeOf(holder));
  if (notice.sourceIri !== expected) {
    throw new Error(`${noticeUrl} does not point at ${holder}'s agreement`);
  }
  if (notice.assigneeIri !== webid(world, holder)) {
    throw new Error(`${noticeUrl} is not addressed to ${holder}`);
  }
  const topic = addressUrl(world);
  await watch(topic);
  const read = READ_ON_GRANT.includes(holder);
  if (read) await readAndKeep(world, holder, time);
  return { holder, read, subscribed: topic };
}

const visiting = new Map<string, Promise<AddressRecord | undefined>>();

/**
 * The first visit to an organisation's page (steps 4 to 6): read the address once, if this
 * organisation has no copy yet. Concurrent calls (React's double effect) share one read. Returns
 * the copy, or `undefined` when the organisation has no grant (the refusal shows in the Lens).
 */
export function firstLook(
  world: World,
  holder: Holder,
  time: string,
): Promise<AddressRecord | undefined> {
  const key = `${world.podOrigin} ${holder}`;
  let pending = visiting.get(key);
  if (pending === undefined) {
    pending = (async () => {
      const existing = await readCopy(world, holder);
      if (existing !== undefined) return existing;
      try {
        await readAndKeep(world, holder, time);
      } catch (error) {
        if (error instanceof PodRequestError && (error.status === 401 || error.status === 403)) {
          return undefined;
        }
        throw error;
      }
      return readCopy(world, holder);
    })();
    visiting.set(key, pending);
    pending.then(
      () => visiting.delete(key),
      () => visiting.delete(key),
    );
  }
  return pending;
}

/**
 * The state also reads the evidence: the recorded deed's receipt from closing. Returns the
 * receipt's URL once read.
 */
export async function readEvidence(world: World): Promise<string> {
  const url = podUrl(world, "alex", RECEIPT_PATH);
  await readDataset(world.fetchAs("state"), url);
  return url;
}

export interface ChangeOutcome {
  readonly holder: Holder;
  /** 200 when the read succeeded, else the refusal status. */
  readonly status: number;
  readonly address?: AddressValue;
  /** The licence version the state issued, when it re-issued one. */
  readonly licence?: number;
}

/**
 * A change notice for the address: read it again and keep the new copy, or, when the pod refuses,
 * mark the copy stale. The state also re-issues the licence when the address on it is out of date.
 */
export async function takeChange(
  world: World,
  holder: Holder,
  time = "11:05",
): Promise<ChangeOutcome> {
  let address: AddressValue;
  try {
    address = await readAndKeep(world, holder, time);
  } catch (error) {
    if (error instanceof PodRequestError && (error.status === 401 || error.status === 403)) {
      await markStale(world, holder, time);
      return { holder, status: error.status };
    }
    throw error;
  }
  if (holder !== "state") return { address, holder, status: 200 };
  const licence = await updateLicence(world, address, "state", time);
  return { address, holder, status: 200, ...(licence === undefined ? {} : { licence }) };
}

/**
 * Re-issue Alex's licence for `address` unless the latest version was issued after the state last
 * read the address (then it already carries it). Returns the new version, or `undefined`.
 */
export async function updateLicence(
  world: World,
  address: AddressValue,
  writer: "state" | "alex",
  time: string,
): Promise<number | undefined> {
  const latest = (await issuedVersions(world)).at(-1);
  const copy = await readCopy(world, "state");
  if (latest !== undefined && copy?.generatedAt !== undefined) {
    const issued = await readIssuance(world, latest);
    if (issued.asOf.getTime() >= copy.generatedAt.getTime()) return undefined;
  }
  return (await issueLicence(world, address, { time, writer })).version;
}
