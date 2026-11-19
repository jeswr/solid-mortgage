// AUTHORED-BY Claude Opus 5.5
/**
 * The pages' side: a `World` for a business KYB page in the browser, on the day of its tour step.
 * The runtime is passed in (typed structurally), so content does not depend on the pod runtime.
 *
 *   const world = await kybWorld(runtime, "registry", DAY.register);
 */

import type { PodOwner } from "@mortgage/demo-kit/registry";
import type { World } from "../mortgage/world.js";
import { type MovingHouseRuntime, movingHouseWorld } from "../moving-house/browser.js";

/** What the page needs from `@mortgage/pod-runtime`. */
export type KybRuntime = MovingHouseRuntime;

/** A world acting as `actsAs` on `day` (the demo clock moves there first). */
export function kybWorld(runtime: KybRuntime, actsAs: PodOwner, day?: number): Promise<World> {
  return movingHouseWorld(runtime, actsAs, day);
}
