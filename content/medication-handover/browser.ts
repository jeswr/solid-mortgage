// AUTHORED-BY Claude Opus 5.5
/**
 * The pages' side: a `World` for a medication-handover page in the browser, on the day of its tour
 * step, after bringing the pods to the demo's starting point. The runtime is passed in (typed
 * structurally), so content does not depend on the pod runtime.
 *
 *   const world = await medicationWorld(runtime, "pharmacy", DAY.discharge);
 */

import type { PodOwner } from "@mortgage/demo-kit/registry";
import type { World } from "../mortgage/world.js";
import type { MovingHouseRuntime } from "../moving-house/browser.js";
import { movingHouseWorld } from "../moving-house/browser.js";
import { prepareMedicationHandover } from "./prepare.js";

/** What the page needs from `@mortgage/pod-runtime`. */
export type MedicationRuntime = MovingHouseRuntime;

let preparing: Promise<boolean> | undefined;

/**
 * A world acting as `actsAs` on `day`. The first call on a page brings the pods to the morning of
 * the discharge (once; `prepare.ts` checks the pod first).
 */
export async function medicationWorld(
  runtime: MedicationRuntime,
  actsAs: PodOwner,
  day?: number,
): Promise<World> {
  const world = await movingHouseWorld(runtime, actsAs, day);
  preparing ??= prepareMedicationHandover(world).catch((error: unknown) => {
    preparing = undefined;
    throw error;
  });
  await preparing;
  return world;
}
