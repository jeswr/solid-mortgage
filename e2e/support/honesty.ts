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

function matches(entry: PodEntry, r: ObservedRequest): boolean {
  if (r.method !== entry.method || r.status !== entry.status) return false;
  const owner = actsAs((r.agent ?? "") as AppSlug);
  if (owner === undefined || webidOf(owner) !== entry.actor.webid) return false;
  if (r.viaAgent !== entry.actor.viaAgent) return false;
  const target = `/pods/${entry.pod}${podRelative(entry.path, entry.pod)}`;
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
  /** Entries with no matching observed request. */
  unmatched: string[];
  /** Matched requests that were not answered inside the browser (by the service worker). */
  notInBrowser: string[];
}

export function checkHonesty(log: LensEntry[], requests: ObservedRequest[]): HonestyReport {
  const used = new Set<number>();
  const report: HonestyReport = { checked: 0, notInBrowser: [], unmatched: [] };
  for (const entry of log.filter(isPodEntry)) {
    report.checked++;
    const request = requests.find((r) => !used.has(r.seq) && matches(entry, r));
    if (request === undefined) {
      report.unmatched.push(describeEntry(entry));
      continue;
    }
    used.add(request.seq);
    if (!request.fromServiceWorker) report.notInBrowser.push(`${request.method} ${request.url}`);
  }
  return report;
}
