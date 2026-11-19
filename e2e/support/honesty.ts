// AUTHORED-BY Claude Opus 5.5
/**
 * Lens honesty (acceptance test 9): pair every "pod saw" entry with a distinct request the test
 * observed in the browser: same method, status, pod path (for a POST, the created resource's
 * `Location` or a member of the container posted to), declared identity and agent flag.
 */
import { describeEntry } from "./match.ts";
import type { ObservedRequest } from "./network.ts";
import { isPodEntry, type LensEntry, type PodEntry, podRelative } from "./pod.ts";
import { type AppSlug, actsAs, webidOf } from "./site.ts";

/** The pod path an observed request targets (`/pods/<owner>/…`), without the query. */
const targetOf = (entry: PodEntry) => `/pods/${entry.pod}${podRelative(entry.path, entry.pod)}`;

function matches(entry: PodEntry, r: ObservedRequest): boolean {
  if (r.status === undefined) return false; // never answered: it cannot stand for a response
  if (r.method !== entry.method || r.status !== entry.status) return false;
  const owner = actsAs((r.agent ?? "") as AppSlug);
  if (owner === undefined || webidOf(owner) !== entry.actor.webid) return false;
  if (r.viaAgent !== entry.actor.viaAgent) return false;
  const target = targetOf(entry);
  const url = new URL(r.url);
  if (url.pathname === target) return true;
  if (entry.method === "POST") {
    if (r.location !== undefined) return new URL(r.location, url).pathname === target;
    return url.pathname.endsWith("/") && target.startsWith(url.pathname);
  }
  return false;
}

export interface HonestyReport {
  checked: number;
  /**
   * Entries with no matching observed request, each followed by the requests the test did observe
   * with the same method and pod path, and what they carried, so a failure says why.
   */
  unmatched: string[];
  /** Observed pod requests by method: how many, and how many had a response. */
  observed: string;
  /** Matched requests that were not answered inside the browser (by the service worker). */
  notInBrowser: string[];
}

/** One observed request, as a report shows it. */
function describeRequest(r: ObservedRequest, used: boolean): string {
  const parts = [
    `seq ${r.seq}`,
    `status ${r.status ?? "none"}`,
    `agent ${r.agent ?? "none"}`,
    r.viaAgent ? "via agent" : "direct",
    r.fromServiceWorker ? "answered by the service worker" : "not from the service worker",
  ];
  if (r.failure !== undefined) parts.push(`failed: ${r.failure}`);
  if (r.location !== undefined) parts.push(`location ${new URL(r.location).pathname}`);
  if (used) parts.push("already paired");
  return parts.join(", ");
}

/** The requests with the entry's method and pod path (or, for a POST, its container). */
function candidates(entry: PodEntry, requests: ObservedRequest[]): ObservedRequest[] {
  const target = targetOf(entry);
  return requests.filter((r) => {
    if (r.method !== entry.method) return false;
    const path = new URL(r.url).pathname;
    return path === target || (entry.method === "POST" && target.startsWith(path));
  });
}

function summarise(requests: ObservedRequest[]): string {
  const byMethod = new Map<string, { seen: number; answered: number }>();
  for (const r of requests) {
    const row = byMethod.get(r.method) ?? { answered: 0, seen: 0 };
    row.seen++;
    if (r.status !== undefined) row.answered++;
    byMethod.set(r.method, row);
  }
  return [...byMethod]
    .map(([method, { seen, answered }]) => `${method} ${answered}/${seen} answered`)
    .join(", ");
}

export function checkHonesty(log: LensEntry[], requests: ObservedRequest[]): HonestyReport {
  const used = new Set<number>();
  const report: HonestyReport = {
    checked: 0,
    notInBrowser: [],
    observed: summarise(requests),
    unmatched: [],
  };
  for (const entry of log.filter(isPodEntry)) {
    report.checked++;
    const request = requests.find((r) => !used.has(r.seq) && matches(entry, r));
    if (request === undefined) {
      const seen = candidates(entry, requests)
        .slice(0, 4)
        .map((r) => describeRequest(r, used.has(r.seq)));
      report.unmatched.push(
        `${describeEntry(entry)}; observed: ${seen.length === 0 ? "nothing with that method and path" : seen.join(" | ")}`,
      );
      continue;
    }
    used.add(request.seq);
    if (!request.fromServiceWorker) report.notInBrowser.push(`${request.method} ${request.url}`);
  }
  return report;
}
