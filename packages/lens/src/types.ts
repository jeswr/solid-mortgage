// AUTHORED-BY Claude Opus 5.5
/**
 * Configuration the Lens accepts. The Lens draws only from `LensEntry` values (pushed from the
 * runtime's `onEvent()`) and the organisation registry. Everything here is either layout (drawer
 * order, labels) or copy the host supplies; none of it creates an entry.
 */

import type { Chip } from "@mortgage/demo-kit/contracts";
import type { AppSlug, OrgRegistry } from "@mortgage/demo-kit/registry";

/** A top-level container of the holder's pod, drawn as one drawer of the cabinet. */
export interface DrawerSpec {
  /** Pod-relative container path, e.g. `/documents/`. */
  path: string;
  /** Plain-word label, e.g. "Documents". */
  label: string;
}

/** What the host knows about an access policy (from its own content or the pod). */
export interface GrantInfo {
  /** Short handle shown in entries, e.g. "G2". */
  label: string;
  /** Why access was given, in plain words. */
  purpose?: string;
  /** When it ends, in plain words ("until the trip ends"). */
  until?: string;
}

/** The demo calendar functions the Lens uses to show simulated dates. */
export interface LensCalendar {
  /** "Day 12 · Fri". */
  label(day: number): string;
  /** Day number of a `YYYY-MM-DD` date. */
  dayOf(date: string): number;
}

export interface LensConfig {
  registry: OrgRegistry;
  /**
   * The holder whose pod sits in the middle: a registered holder id (`@mortgage/demo-kit/holders`,
   * default `alex`) and the name to call it by (default the holder's short name).
   */
  holder?: { id?: string; name?: string };
  /** The app hosting this Lens; its organisation is drawn larger on the map. */
  app?: AppSlug;
  /** Cabinet layout: drawers in display order. Drawers seen in events are added after these. */
  drawers?: DrawerSpec[];
  /**
   * Policy handles, keyed by policy IRI or by a suffix of it (`/policies/g2`). Used to say
   * "allowed by G2 · purpose · until" when an event names the policy that allowed it.
   */
  grants?: Record<string, GrantInfo>;
  /**
   * The caveat shown under a refused request after a withdrawal. `{org}` and `{holder}` are
   * replaced. Defaults to a domain-neutral sentence.
   */
  revokeCaveat?: string;
  /**
   * Drawer paths whose writes are bookkeeping rather than documents (access requests, policy
   * and consent records). They are left out of "documents delivered" and "uploads". Default
   * `["/inbox/"]`.
   */
  recordDrawers?: string[];
  calendar?: LensCalendar;
  /** Where the Grants tab links to (the holder's sharing screen). */
  grantsHref?: string;
  /** Where "Journey ledger" goes. Without it, the ledger opens inside the Lens. */
  ledgerHref?: string;
  /**
   * Loads a resource as Turtle for the Raw tab. Optional: the host must supply a read that is
   * not itself logged as an organisation's request (an inspector read), or leave it out.
   */
  loadTurtle?: (pod: string, path: string) => Promise<string>;
}

/** The current tour step as the Lens shows it (zone 1 and zone 2). */
export interface LensStep {
  id: string;
  chapter: string;
  title: string;
  body?: string;
  /** 1-based position and total, for "Step 3 of 8". */
  index: number;
  total: number;
  done: boolean;
  /** Label for "Do it for me"; absent when the step has no action. */
  actionLabel?: string;
  /** Simulated day of the step. */
  day?: number;
  headline: string;
  chips: Chip[];
  canGoBack: boolean;
}

/** A tour step's outline, for the ledger's timeline. */
export interface TimelineStep {
  id: string;
  chapter: string;
  title: string;
  day?: number;
}

/** Inspector tabs, the journey ledger, or the ledger's examiner view. */
export type LensView = "step" | "grants" | "not-shared" | "raw" | "ledger" | "examiner";
export type LensMode = "guided" | "free" | "present";
export type LensLayout = "dock" | "sheet" | "window";
