// AUTHORED-BY Claude Opus 5.5
/**
 * `@mortgage/tour`: the guided-tour engine and step schema (design.md §d.6). Apps normally use
 * `mountDemo` from `@mortgage/tour/mount`.
 */
export { type ActOptions, TourCursor, waitForTarget } from "./cursor.js";
export {
  parseTourParams,
  type TourChange,
  TourEngine,
  type TourOptions,
  type TourParams,
} from "./engine.js";
export { completesByEntry, completesStep, matchesExpectation, matchesPartial } from "./match.js";
export {
  CHIP_KINDS,
  TARGET_NAME,
  TourValidationError,
  tourStepSchema,
  type ValidateOptions,
  validateTour,
  wordCount,
} from "./schema.js";
export { idbStore, memoryStore, type TourMode, type TourState, type TourStore } from "./store.js";
