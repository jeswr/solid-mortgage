// AUTHORED-BY Claude Opus 5.5
/**
 * The pages' side: a `World` for a reusable-KYC page in the browser, on the day of its tour step.
 * The runtime is passed in (typed structurally), so content does not depend on the pod runtime.
 *
 *   const world = await reusableKycWorld(runtime, "card-issuer", DAY.apply);
 */

import type { AppNote } from "@mortgage/demo-kit/contracts";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import { createBrowserWorld } from "../mortgage/browser.js";
import type { World } from "../mortgage/world.js";

/** What the page needs from `@mortgage/pod-runtime`. */
export interface ReusableKycRuntime {
  ready(): Promise<{ dayOne: string }>;
  setDay(day: number): Promise<void>;
  podFetch: typeof fetch;
  note(note: AppNote): void;
}

/** A world acting as `actsAs` on `day`; the demo clock moves there first, so the Lens dates agree. */
export async function reusableKycWorld(
  runtime: ReusableKycRuntime,
  actsAs: PodOwner,
  day: number,
): Promise<World> {
  const { dayOne } = await runtime.ready();
  await runtime.setDay(day);
  return createBrowserWorld({
    actsAs,
    day,
    dayOne,
    note: (entry) => runtime.note(entry),
    podFetch: runtime.podFetch,
  });
}
