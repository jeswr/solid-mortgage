// AUTHORED-BY Claude Opus 5.5
/**
 * Step 10's totals, computed from the journey's log (the Lens entries the pod runtime emitted),
 * never typed in:
 *
 * - lists: Rosa's drawers that every writing organisation wrote into (her medicines: one list);
 * - writers: organisations that wrote to that list;
 * - readers: everyone other than Rosa whose read of her pod succeeded, organisations and her carer;
 * - changes: writes to a medicine on her list by an organisation;
 * - attributed: provenance records those organisations wrote with them (who, when, why);
 * - denied: reads of Rosa's pod the pod refused.
 */

import type { LensEntry, PodEvent } from "@mortgage/demo-kit/contracts";
import { HOLDER } from "./facts.js";
import { PATHS } from "./grants.js";

export interface MedicationTotals {
  readonly lists: number;
  readonly writers: number;
  readonly readers: number;
  readonly changes: number;
  readonly attributed: number;
  readonly denied: number;
  /** Who wrote to the list, and how many writes each. */
  readonly writesBy: Readonly<Record<string, number>>;
  /** Who read Rosa's pod, and how many reads each. */
  readonly readsBy: Readonly<Record<string, number>>;
}

type Pod = Extract<LensEntry, { source: "pod" }>;

const ORGS_IN_DEMO = new Set<string>(["hospital", "pharmacy", "clinic"]);

const pathOf = (event: PodEvent) => event.path.split("?")[0] ?? event.path;
const isOk = (status: number) => status >= 200 && status < 300;
const isAcl = (path: string) => path.endsWith(".acl");

/** The first-level drawer of a pod path (`/medications/x` is in `/medications/`). */
function drawerOf(path: string): string {
  const first = path.split("/").filter(Boolean)[0];
  return first === undefined ? "/" : `/${first}/`;
}

const MEDICATIONS = `/${PATHS.medications}`;
const PROVENANCE = `/${PATHS.provenance}`;
const STATEMENT = new RegExp(`^${MEDICATIONS}[^/]+$`);

function isRosaPod(entry: LensEntry): entry is Pod {
  return entry.source === "pod" && entry.pod === HOLDER;
}

export function medicationTotals(entries: Iterable<LensEntry>): MedicationTotals {
  const drawersByWriter = new Map<string, Set<string>>();
  const writesBy: Record<string, number> = {};
  const readsBy: Record<string, number> = {};
  let changes = 0;
  let attributed = 0;
  let denied = 0;
  for (const entry of entries) {
    if (!isRosaPod(entry)) continue;
    const org = entry.actor.org;
    const path = pathOf(entry);
    if (entry.kind === "denied") {
      if (org !== HOLDER) denied += 1;
      continue;
    }
    if (!isOk(entry.status) || isAcl(path) || org === HOLDER) continue;
    if (entry.kind === "read" && entry.method === "GET") {
      readsBy[org] = (readsBy[org] ?? 0) + 1;
      continue;
    }
    if (entry.kind !== "write" || !ORGS_IN_DEMO.has(org)) continue;
    let drawers = drawersByWriter.get(org);
    if (drawers === undefined) {
      drawers = new Set();
      drawersByWriter.set(org, drawers);
    }
    drawers.add(drawerOf(path));
    if (drawerOf(path) === MEDICATIONS) writesBy[org] = (writesBy[org] ?? 0) + 1;
    if (STATEMENT.test(path)) changes += 1;
    if (path.startsWith(PROVENANCE)) attributed += 1;
  }
  const writerSets = [...drawersByWriter.values()];
  const shared = new Set<string>();
  for (const drawer of writerSets[0] ?? []) {
    if (writerSets.every((set) => set.has(drawer))) shared.add(drawer);
  }
  return {
    attributed,
    changes,
    denied,
    lists: shared.has(MEDICATIONS) ? 1 : 0,
    readers: Object.keys(readsBy).length,
    readsBy,
    writers: Object.keys(writesBy).length,
    writesBy,
  };
}

/** Display order for the ledger's tables. */
export const LEDGER_ORDER = ["hospital", "pharmacy", "clinic", "alex"] as const;
