// AUTHORED-BY Claude Opus 5.5
/**
 * Free play's catch-up order: the journey beats before a step, in order. The two
 * pre-qualification proof beats (steps 5 and 6) are skipped: nothing later depends on them, and
 * the proof belongs on the wallet's isolated route. The journey module is loaded on first use
 * (it carries the credential kit).
 */
import { TOUR } from "./tour.js";

export const SKIPPED_IN_CATCH_UP: ReadonlySet<string> = new Set([
  "wallet-prove",
  "lender-b-received",
]);

/** The journey beats a catch-up runs before tour step `step`. */
export async function beatsBefore(step: string) {
  const { JOURNEY } = await import("./journey.js");
  const index = JOURNEY.findIndex((beat) => beat.step === step);
  if (index < 0) throw new Error(`no beat belongs to step ${step}`);
  return JOURNEY.slice(0, index).filter((beat) => !SKIPPED_IN_CATCH_UP.has(beat.step));
}

/** How many tour steps the catch-up runs before `step`. */
export function stepsBefore(step: string): number {
  const index = TOUR.findIndex((s) => s.id === step);
  return TOUR.slice(0, Math.max(index, 0)).filter((s) => !SKIPPED_IN_CATCH_UP.has(s.id)).length;
}
