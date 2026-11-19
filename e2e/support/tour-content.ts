// AUTHORED-BY Claude Opus 5.5
/**
 * The mortgage tour, read at run time from `content/mortgage/tour.ts` (lane L3) so the suite
 * never hard-codes step ids, `data-tour` names or `expect` lists. Positions (step 9, step 23, …)
 * come from design.md §b.5, which fixes the order of the 24 steps.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { TourStep } from "../../packages/demo-kit/src/contracts/index.ts";
import { REPO_ROOT } from "./site.ts";

export type { TourStep };

export interface MortgageTour {
  demo: string;
  steps: TourStep[];
}

/** design.md §b.5: the guided path has 24 steps. */
export const DESIGN_STEP_COUNT = 24;

const TOUR_FILE = join(REPO_ROOT, "content", "mortgage", "tour.ts");

function looksLikeSteps(value: unknown): value is TourStep[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (step) =>
        typeof step === "object" &&
        step !== null &&
        typeof (step as TourStep).id === "string" &&
        typeof (step as TourStep).app === "string" &&
        Array.isArray((step as TourStep).expect),
    )
  );
}

let cached: Promise<MortgageTour> | undefined;

/** Load the tour steps, or fail with a message that names the lane that owes them. */
export function loadMortgageTour(): Promise<MortgageTour> {
  cached ??= (async () => {
    if (!existsSync(TOUR_FILE)) {
      throw new Error(
        "content/mortgage/tour.ts does not exist yet (lane L3): the guided path cannot be driven without its steps",
      );
    }
    const module = (await import(pathToFileURL(TOUR_FILE).href)) as Record<string, unknown>;
    const preferred = ["TOUR", "MORTGAGE_TOUR", "STEPS", "steps", "tour", "default"];
    const named = preferred.map((key) => module[key]);
    const fromObject = named.map((value) =>
      value !== null && typeof value === "object" && !Array.isArray(value)
        ? (value as { steps?: unknown }).steps
        : undefined,
    );
    const steps = [...named, ...fromObject, ...Object.values(module)].find(looksLikeSteps);
    if (steps === undefined) {
      throw new Error(
        `content/mortgage/tour.ts exports no TourStep[] (exports: ${Object.keys(module).join(", ")})`,
      );
    }
    const demoExport = ["DEMO", "TOUR_DEMO", "DEMO_ID"].map((key) => module[key]);
    const demo = demoExport.find((value): value is string => typeof value === "string");
    return { demo: demo ?? "mortgage", steps };
  })();
  return cached;
}

/** The step at design position `n` (1-based, design.md §b.5). */
export function stepAt(tour: MortgageTour, n: number): TourStep {
  const step = tour.steps[n - 1];
  if (step === undefined) {
    throw new Error(`the tour has ${tour.steps.length} steps; design.md §b.5 step ${n} is missing`);
  }
  return step;
}

/** Index of the first step of the `n`th distinct chapter (0-based chapters, in tour order). */
export function chapterStarts(tour: MortgageTour): number[] {
  const starts: number[] = [];
  let last: string | undefined;
  tour.steps.forEach((step, index) => {
    if (step.chapter !== "" && step.chapter !== last) {
      starts.push(index);
      last = step.chapter;
    }
  });
  return starts;
}
