// AUTHORED-BY Claude Opus 5.5
/**
 * The journey ledger's totals for the lending story, computed from the log (the Lens entries the
 * pod runtime emitted), never typed in: how many organisations issued a credential into Maya's
 * pod, how many lenders she proved to, how many payment services read anything, how many of her
 * resources organisations read, and how many reads the pod refused.
 */

import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { isHolderId } from "@mortgage/demo-kit/registry";
import { MAYA } from "./facts.js";
import { DOCUMENT_PATHS } from "./grants.js";

export interface LendingTotals {
  /** Organisations that wrote a credential into Maya's `credentials/`. */
  readonly issuers: number;
  /** Lenders whose inbox Maya's wallet appended to (her pre-qualification presentations). */
  readonly lenders: number;
  /** Organisations that read Maya's payout instruction. */
  readonly paymentServices: number;
  /** Credentials written into Maya's pod (anchors not counted). */
  readonly credentials: number;
  /** Successful reads of Maya's pod by organisations. */
  readonly reads: number;
  /** Requests to Maya's pod the pod refused. */
  readonly denied: number;
  /** Who read Maya's pod, and how often. */
  readonly readers: Readonly<Record<string, number>>;
}

type PodEntry = Extract<LensEntry, { source: "pod" }>;

const pathOf = (entry: PodEntry) => entry.path.split("?")[0] ?? entry.path;
const ok = (entry: PodEntry) => entry.status >= 200 && entry.status < 300;
const byOrg = (entry: PodEntry) => !isHolderId(entry.actor.org);
const PAYOUT = `/${DOCUMENT_PATHS.payoutInstruction}`;

export function lendingTotals(entries: Iterable<LensEntry>): LendingTotals {
  const issuers = new Set<string>();
  const lenders = new Set<string>();
  const payment = new Set<string>();
  const credentials = new Set<string>();
  const readers: Record<string, number> = {};
  let reads = 0;
  let denied = 0;
  for (const entry of entries) {
    if (entry.source !== "pod") continue;
    const path = pathOf(entry);
    if (entry.pod !== MAYA) {
      // Maya's wallet appends to an organisation's inbox only to answer a lender's challenge or
      // to tell that lender a grant was withdrawn: every pod it appends to is a lender's.
      const appended =
        entry.actor.org === MAYA &&
        entry.method === "POST" &&
        path.startsWith("/inbox/") &&
        ok(entry);
      if (appended && !isHolderId(entry.pod)) lenders.add(entry.pod);
      continue;
    }
    if (entry.kind === "denied" && byOrg(entry)) denied += 1;
    if (!ok(entry) || !byOrg(entry)) continue;
    if (entry.kind === "write" && path.startsWith("/credentials/")) {
      issuers.add(entry.actor.org);
      if (!path.endsWith("-anchor")) credentials.add(path);
    }
    if (entry.kind === "read" && entry.method === "GET") {
      reads += 1;
      readers[entry.actor.org] = (readers[entry.actor.org] ?? 0) + 1;
      if (path === PAYOUT) payment.add(entry.actor.org);
    }
  }
  return {
    credentials: credentials.size,
    denied,
    issuers: issuers.size,
    lenders: lenders.size,
    paymentServices: payment.size,
    readers,
    reads,
  };
}
