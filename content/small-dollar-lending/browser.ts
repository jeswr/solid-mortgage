// AUTHORED-BY Claude Opus 5.5
/**
 * The pages' side: a `World` for a lending page in the browser, on the day of its tour step. The
 * runtime is passed in (typed structurally), so content does not depend on the pod runtime.
 *
 *   const world = await lendingWorld(runtime, "fintech-lender", DAY.apply);
 *
 * `lendingPages` adds the story's starting point: the first world a page asks for prepares the
 * pods once (`prepare.ts`), so any lending page works when it is the first one opened.
 */

import type { AppNote } from "@mortgage/demo-kit/contracts";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import { createBrowserWorld } from "../mortgage/browser.js";
import type { World } from "../mortgage/world.js";

/** What the page needs from `@mortgage/pod-runtime`. */
export interface LendingRuntime {
  ready(): Promise<{ dayOne: string }>;
  setDay(day: number): Promise<void>;
  podFetch: typeof fetch;
  note(note: AppNote): void;
}

/**
 * A world acting as `actsAs` on `day`; the demo clock moves there first, so the Lens dates agree.
 * Without a day (a page that only reads) the clock is left where it is.
 */
export async function lendingWorld(
  runtime: LendingRuntime,
  actsAs: PodOwner,
  day?: number,
): Promise<World> {
  const { dayOne } = await runtime.ready();
  if (day !== undefined) await runtime.setDay(day);
  return createBrowserWorld({
    actsAs,
    day: day ?? 1,
    dayOne,
    note: (entry) => runtime.note(entry),
    podFetch: runtime.podFetch,
  });
}

/**
 * A page's worlds, acting as `actsAs`, with the story prepared before the first one is handed out.
 * The preparing code (and the data model it writes with) is loaded only then.
 */
export function lendingPages(
  runtime: LendingRuntime,
  actsAs: PodOwner,
): (day?: number) => Promise<World> {
  let prepared: Promise<unknown> | undefined;
  return async (day) => {
    const world = await lendingWorld(runtime, actsAs, day);
    prepared ??= import("./prepare.js")
      .then(({ prepareSmallDollarLending }) => prepareSmallDollarLending(world))
      .catch((error: unknown) => {
        prepared = undefined;
        throw error;
      });
    await prepared;
    return world;
  };
}
