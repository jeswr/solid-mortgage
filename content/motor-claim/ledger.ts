// AUTHORED-BY Claude Opus 5.5
/**
 * Step 10's totals, computed from the journey's log (the Lens entries the pod runtime emitted),
 * never typed in: the parties that touched the claim file, the grants the claim added, what the
 * repairer read and did not read, and the reads the pod refused.
 */

import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { CLAIM_NUMBER, PATHS } from "./facts.js";

/** What the wallet lists under "Anvil did not see", with the path in Alex's pod. */
export const NOT_FOR_THE_REPAIRER = Object.freeze([
  { label: "Driver licence", path: PATHS.licence },
  { label: "Motor policy", path: PATHS.policy },
  { label: "Incident report", path: PATHS.incident },
  { label: "Other driver's details", path: PATHS.otherParty },
]);

export interface MotorClaimTotals {
  /** Who read or wrote the claim folder: Alex, the insurer, the repairer. */
  readonly parties: number;
  /** The grants the claim added (consent records given for C1 and C2). */
  readonly claimGrants: number;
  /** Things the repairer read: the damage report, and the photos (one folder). */
  readonly repairerThings: number;
  /** Which of {@link NOT_FOR_THE_REPAIRER} the repairer never read. */
  readonly notSeen: readonly string[];
  /** Reads of Alex's pod the pod refused. */
  readonly denied: number;
  /** Who read what in the claim folder (pod path → readers). */
  readonly readers: Readonly<Record<string, readonly string[]>>;
}

type Pod = Extract<LensEntry, { source: "pod" }>;

const CLAIM = `/${PATHS.claim}`;
const PHOTOS = `/${PATHS.photos}`;

const pathOf = (entry: Pod) => {
  const path = entry.path.split("?")[0] ?? entry.path;
  const at = path.indexOf("/pods/alex/");
  return at >= 0 ? path.slice(at + "/pods/alex".length) : path;
};
const ok = (entry: Pod) => entry.status >= 200 && entry.status < 300;
const inAlex = (entry: LensEntry): entry is Pod => entry.source === "pod" && entry.pod === "alex";

export function motorClaimTotals(entries: Iterable<LensEntry>): MotorClaimTotals {
  const parties = new Set<string>();
  const consents = new Set<string>();
  const repairerRead = new Set<string>();
  const readers: Record<string, Set<string>> = {};
  /** Every path of Alex's pod the repairer read, in or out of the claim folder. */
  const repairerAll = new Set<string>();
  let denied = 0;
  for (const entry of entries) {
    if (!inAlex(entry)) continue;
    const path = pathOf(entry);
    if (entry.kind === "denied") {
      if (entry.actor.org !== "alex") denied += 1;
      continue;
    }
    if (!ok(entry)) continue;
    if (entry.kind === "write") {
      const consent = /^\/consents\/(c1|c2)-given$/.exec(path)?.[1];
      if (consent !== undefined) consents.add(consent);
    }
    if (entry.kind === "read" && entry.method === "GET" && entry.actor.org === "repairer") {
      repairerAll.add(path);
    }
    if (!path.startsWith(CLAIM) || path.endsWith(".acl")) continue;
    if (entry.kind === "read" || entry.kind === "write") parties.add(entry.actor.org);
    if (entry.kind !== "read" || entry.method !== "GET") continue;
    let set = readers[path];
    if (set === undefined) {
      set = new Set();
      readers[path] = set;
    }
    set.add(entry.actor.org);
    if (entry.actor.org === "repairer") repairerRead.add(path.startsWith(PHOTOS) ? PHOTOS : path);
  }
  const readByRepairer = (path: string) => repairerAll.has(`/${path}`);
  return {
    claimGrants: consents.size,
    denied,
    notSeen: NOT_FOR_THE_REPAIRER.filter((item) => !readByRepairer(item.path)).map(
      (item) => item.label,
    ),
    parties: parties.size,
    readers: Object.fromEntries(
      Object.entries(readers).map(([path, set]) => [path, [...set].sort()]),
    ),
    repairerThings: repairerRead.size,
  };
}

/** The claim's label in the ledger. */
export const LEDGER_TITLE = `Claim ${CLAIM_NUMBER}: who saw what`;
