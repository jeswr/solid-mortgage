// AUTHORED-BY Claude Opus 5.5
/**
 * `@mortgage/pod-runtime`: the page-side contract (design.md §d.2). Browser-only and wasm-free;
 * the host itself runs in `pods-sw.js`. Headless code uses `@mortgage/pod-runtime/node`.
 */
export {
  actingAs,
  configure,
  note,
  onEvent,
  oneTimeGrant,
  onReset,
  podFetch,
  podUrl,
  type RuntimeConfig,
  type RuntimeInfo,
  ready,
  resetDemo,
  session,
  setDay,
  setHolder,
  setTour,
  setTourContext,
  unwatch,
  watch,
} from "./client/index.js";
export type { Seed, SeedContext, SeedRequest } from "./host/host.js";
export {
  type ChangeActivity,
  type ChangeNotice,
  type OneTimeGrantRecord,
  parseChangeNotice,
  type SubscriptionRecord,
} from "./runtime-api.js";
