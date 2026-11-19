// AUTHORED-BY Claude Opus 5.5
/**
 * Tour contract types, copied from design.md §d.6. `packages/tour` validates steps against this
 * shape and `content/<demo>/tour.ts` supplies them; neither may redefine it.
 */
import type { OrgSlug } from "../registry.js";
import type { AppNote, PodEvent } from "./pod-event.js";

/** The involvement chips listed in design.md §c.2 ("Where Solid is" zone). */
export type ChipKind =
  | "pod read"
  | "pod write"
  | "grant"
  | "credential"
  | "proof"
  | "denied"
  | "no Solid in this step";

/**
 * One chip on a step's Lens card, e.g. `{ kind: "grant", label: "G5" }`.
 * Not specified by design.md beyond the chip names; defined here by lane L0.
 */
export interface Chip {
  kind: ChipKind;
  /** Optional qualifier shown after the chip name (a grant id, a resource label). */
  label?: string;
}

// biome-ignore format: kept verbatim from design.md so the two can be compared line by line
export interface TourStep {
  id: string; chapter: string; app: OrgSlug | "welcome"; path: string;
  title: string;                         // ≤ 8 words
  body: string;                          // ≤ 45 words, describes the action, not an outcome not yet shown
  action?: { target: string; label: string };        // [data-tour="<target>"]
  done: { event?: Partial<PodEvent>; note?: Partial<AppNote>; target?: string };
  mode: "interactive" | "summary";
  lens: { headline: string; chips: Chip[]; notShared?: string[] };
  realWorld: { stage: string; rule?: string; source?: string /* C-id from design.md */ };
  clock?: { day: number };               // simulated day this step happens on
  expect: Array<Partial<PodEvent> | Partial<AppNote>>; // asserted by e2e
}

/** Editorial limits from design.md §d.6, enforced by the tour's validator and content tests. */
export const TOUR_STEP_LIMITS = { titleWords: 8, bodyWords: 45 } as const;
