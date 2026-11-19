// AUTHORED-BY Claude Opus 5.5
/**
 * Partial matching of Lens entries against a step's `done` and `expect` patterns. A pattern
 * matches when every key it names matches: primitives by equality, objects recursively, arrays
 * when every pattern element matches some entry element. Paths match when equal or when the
 * entry's path ends with the pattern's (so `/documents/a` matches `/pods/alex/documents/a`).
 */
import type { AppNote, LensEntry, PodEvent, TourStep } from "@mortgage/demo-kit/contracts";
import { NOTE_KINDS } from "./schema.js";

export function matchesPartial(value: unknown, pattern: unknown, key?: string): boolean {
  if (pattern === undefined) return true;
  if (pattern === null || typeof pattern !== "object") {
    if (key === "path" && typeof value === "string" && typeof pattern === "string") {
      return value === pattern || value.endsWith(pattern.startsWith("/") ? pattern : `/${pattern}`);
    }
    return Object.is(value, pattern);
  }
  if (Array.isArray(pattern)) {
    if (!Array.isArray(value)) return false;
    return pattern.every((p) => value.some((v) => matchesPartial(v, p)));
  }
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Object.entries(pattern).every(([k, p]) => matchesPartial(record[k], p, k));
}

/** Does an entry satisfy an `expect` item (a pod-event or app-note pattern)? */
export function matchesExpectation(
  entry: LensEntry,
  pattern: Partial<PodEvent> | Partial<AppNote>,
): boolean {
  const isNotePattern =
    typeof pattern.kind === "string" && (NOTE_KINDS as readonly string[]).includes(pattern.kind);
  if (isNotePattern !== (entry.source === "app")) return false;
  return matchesPartial(entry, pattern);
}

/** Does an entry complete the step? Pod events match `done.event`, app notes `done.note`. */
export function completesStep(step: TourStep, entry: LensEntry): boolean {
  if (step.done.event && entry.source === "pod") return matchesPartial(entry, step.done.event);
  if (step.done.note && entry.source === "app") return matchesPartial(entry, step.done.note);
  return false;
}

/** Steps complete by entry when they name one; only otherwise by their DOM target. */
export function completesByEntry(step: TourStep): boolean {
  return step.done.event !== undefined || step.done.note !== undefined;
}
