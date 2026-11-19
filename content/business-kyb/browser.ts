// AUTHORED-BY Claude Opus 5.5
/**
 * The pages' side: a `World` for a business KYB page in the browser, on the day of its tour step.
 * The runtime is passed in (typed structurally), so content does not depend on the pod runtime.
 *
 *   const world = await kybWorld(runtime, "registry", DAY.register);
 */

import type { AppNote } from "@mortgage/demo-kit/contracts";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import { createBrowserWorld } from "../mortgage/browser.js";
import type { World } from "../mortgage/world.js";

/** What the page needs from `@mortgage/pod-runtime`. */
export interface KybRuntime {
  ready(): Promise<{ dayOne: string; day?: number }>;
  setDay(day: number): Promise<void>;
  podFetch: typeof fetch;
  note(note: AppNote): void;
}

/**
 * A world acting as `actsAs` on `day`; the demo clock moves there first, so the Lens dates agree.
 * Without a day (a page that only reads) the world is on the runtime's current day.
 */
export async function kybWorld(
  runtime: KybRuntime,
  actsAs: PodOwner,
  day?: number,
): Promise<World> {
  const info = await runtime.ready();
  if (day !== undefined) await runtime.setDay(day);
  return createBrowserWorld({
    actsAs,
    day: day ?? info.day ?? 1,
    dayOne: info.dayOne,
    note: (entry) => runtime.note(entry),
    podFetch: runtime.podFetch,
  });
}
