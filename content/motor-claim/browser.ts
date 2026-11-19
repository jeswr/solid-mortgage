// AUTHORED-BY Claude Opus 5.5
/**
 * The pages' side: a `World` for a motor-claim page in the browser, on the day of its tour step.
 * The same construction as the moving-house pages' (`../moving-house/browser.ts`), which is not
 * specific to that demo.
 *
 *   const world = await motorClaimWorld(runtime, "repairer", DAY.estimate);
 */

export {
  type MovingHouseRuntime as MotorClaimRuntime,
  movingHouseWorld as motorClaimWorld,
} from "../moving-house/browser.js";
