// AUTHORED-BY Claude Opus 5.5
/**
 * Matching a step's `expect` items (Partial<PodEvent> | Partial<AppNote>, design.md §d.6)
 * against log entries. Written here, not imported from packages/tour, so the suite checks the
 * engine rather than agreeing with it by construction.
 *
 * Rules: every key the pattern names must match. Strings and numbers are equal; a `path`
 * matches when equal after both are made pod-relative, or when the entry's path ends with the
 * pattern. A POST whose pattern path is a container (`/inbox/`) matches an entry for a resource
 * created directly in it: the runtime logs a POST under the `Location` it created
 * (packages/pod-runtime), while content/mortgage/tour.ts names the container posted to. Objects
 * match partially; an array pattern matches when each of its items matches some item of the
 * entry's array. App-note kinds only match app notes; everything else only matches pod events.
 */
import type { AppNote, LensEntry, PodEvent } from "../../packages/demo-kit/src/contracts/index.ts";
import { podRelative } from "./pod.ts";

export type Expectation = Partial<PodEvent> | Partial<AppNote>;

const NOTE_KINDS = new Set<string>([
  "verified",
  "proof-verified",
  "org-to-org",
  "no-solid",
  "clock",
]);
const NOTE_ONLY_KEYS = new Set(["text", "refs", "org"]);

/** Is this expectation about an app note ("app said") rather than a pod event ("pod saw")? */
export function isNoteExpectation(item: Expectation): boolean {
  const kind = (item as { kind?: string }).kind;
  if (kind !== undefined) return NOTE_KINDS.has(kind);
  return Object.keys(item).some((key) => NOTE_ONLY_KEYS.has(key));
}

function matchValue(pattern: unknown, value: unknown, key: string, entry: LensEntry): boolean {
  if (pattern === undefined) return true;
  if (key === "path" && typeof pattern === "string" && typeof value === "string") {
    const owner = entry.source === "pod" ? entry.pod : undefined;
    const p = podRelative(pattern, owner);
    const v = podRelative(value, owner);
    return v === p || v.endsWith(pattern) || value.endsWith(pattern);
  }
  if (Array.isArray(pattern)) {
    if (!Array.isArray(value)) return false;
    return pattern.every((item) =>
      value.some((candidate) => matchValue(item, candidate, "", entry)),
    );
  }
  if (pattern !== null && typeof pattern === "object") {
    if (value === null || typeof value !== "object") return false;
    return Object.entries(pattern).every(([k, p]) =>
      matchValue(p, (value as Record<string, unknown>)[k], k, entry),
    );
  }
  if (typeof pattern === "string" && typeof value === "string" && key === "text") {
    return value === pattern || value.includes(pattern);
  }
  return pattern === value;
}

/** The container a pod path sits in (`/inbox/x` → `/inbox/`). */
function containerOf(path: string): string {
  return path.replace(/[^/]+\/?$/, "");
}

export function matchesExpectation(item: Expectation, entry: LensEntry): boolean {
  if (isNoteExpectation(item) !== (entry.source === "app")) return false;
  const postToContainer =
    entry.source === "pod" &&
    (item as Partial<PodEvent>).method === "POST" &&
    typeof (item as Partial<PodEvent>).path === "string" &&
    ((item as Partial<PodEvent>).path as string).endsWith("/");
  return Object.entries(item).every(([key, pattern]) => {
    const value = (entry as unknown as Record<string, unknown>)[key];
    if (postToContainer && key === "path" && typeof value === "string") {
      const created = podRelative(value, entry.source === "pod" ? entry.pod : undefined);
      return created === pattern || containerOf(created) === pattern;
    }
    return matchValue(pattern, value, key, entry);
  });
}

/** One line describing an expectation, for failure messages. */
export function describeExpectation(item: Expectation): string {
  return JSON.stringify(item);
}

/** One line describing an entry, for failure messages. */
export function describeEntry(entry: LensEntry): string {
  if (entry.source === "pod") {
    return `#${entry.id} pod ${entry.actor.org}${entry.actor.viaAgent ? " (agent)" : ""} ${entry.method} ${entry.pod}:${entry.path} -> ${entry.status} ${entry.kind}${entry.tour ? ` [${entry.tour.step}]` : ""}`;
  }
  return `#${entry.id} note ${entry.org} ${entry.kind}: ${entry.text}`;
}
