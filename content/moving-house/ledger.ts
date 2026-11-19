// AUTHORED-BY Claude Opus 5.5
/**
 * Step 10's totals, computed from the journey's log (the Lens entries the pod runtime emitted),
 * never typed in: how many of Alex's records every organisation read, how many organisations read
 * Alex's pod, how many times they read the address, and how many reads the pod refused.
 */

import type { LensEntry, PodEvent } from "@mortgage/demo-kit/contracts";
import { ADDRESS_PATH, HOLDERS, isHolder } from "./grants.js";

export interface MovingHouseTotals {
  /** Alex's resources that every reading organisation read: the one shared record. */
  readonly records: number;
  /** Organisations that read Alex's pod. */
  readonly organisations: number;
  /** Successful reads of the address by organisations. */
  readonly reads: number;
  /** Reads of Alex's pod the pod refused. */
  readonly denied: number;
  /** Who read the address, and how often. */
  readonly readers: Readonly<Record<string, number>>;
}

const ADDRESS = `/${ADDRESS_PATH}`;

type Pod = Extract<LensEntry, { source: "pod" }>;

function isOrgRead(entry: LensEntry): entry is Pod {
  return (
    entry.source === "pod" &&
    entry.pod === "alex" &&
    entry.kind === "read" &&
    entry.method === "GET" &&
    entry.status >= 200 &&
    entry.status < 300 &&
    isHolder(entry.actor.org)
  );
}

const pathOf = (event: PodEvent) => event.path.split("?")[0] ?? event.path;

export function movingHouseTotals(entries: Iterable<LensEntry>): MovingHouseTotals {
  const readersOf = new Map<string, Set<string>>();
  const orgs = new Set<string>();
  const readers: Record<string, number> = {};
  let reads = 0;
  let denied = 0;
  for (const entry of entries) {
    if (entry.source !== "pod" || entry.pod !== "alex") continue;
    if (entry.kind === "denied" && isHolder(entry.actor.org)) denied += 1;
    if (!isOrgRead(entry)) continue;
    const path = pathOf(entry);
    orgs.add(entry.actor.org);
    let set = readersOf.get(path);
    if (set === undefined) {
      set = new Set();
      readersOf.set(path, set);
    }
    set.add(entry.actor.org);
    if (path === ADDRESS) {
      reads += 1;
      readers[entry.actor.org] = (readers[entry.actor.org] ?? 0) + 1;
    }
  }
  const records =
    orgs.size === 0 ? 0 : [...readersOf.values()].filter((set) => set.size === orgs.size).length;
  return { denied, organisations: orgs.size, readers, reads, records };
}

/** The holders in display order, for a ledger table. */
export const LEDGER_ORDER = HOLDERS;
