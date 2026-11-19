// AUTHORED-BY Claude Opus 5.5
/**
 * What Alder Bank's screens read from the pods, always acting as the bank: its own `issued/`
 * records and status list, and deliberate attempts to read the two places it has written in
 * Alex's pod (both refused).
 */
import { membersOf } from "@mortgage/content/mortgage/grants";
import { statusListOf } from "@mortgage/content/mortgage/issuers";
import { CREDENTIALS } from "@mortgage/content/mortgage/journey";
import { at, podUrl, readDataset, statusOf, type World } from "@mortgage/content/mortgage/world";
import { CredentialPointer } from "@mortgage/data-model";
import { deriveStatusIndex } from "@mortgage/vc-kit";
import { DataFactory } from "n3";
import { lastSegment } from "./view.ts";

export const OWNER = "bank" as const;

/** The two places in Alex's pod the bank has written, and the access it holds to each. */
export const SLOTS = {
  assets: { grant: "write-only", path: CREDENTIALS.assets.path },
  identity: { grant: "none", path: CREDENTIALS.identity.path },
} as const;
export type SlotName = keyof typeof SLOTS;

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
    // Alder Bank issues each credential once, so the index derives from the credential's URL.
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

/** The bank tries to read a slot it wrote. The pod answers; this returns the status. */
export function tryReadBack(world: World, slot: SlotName): Promise<number> {
  return statusOf(world.fetchAs(OWNER), podUrl(world, "alex", SLOTS[slot].path));
}
