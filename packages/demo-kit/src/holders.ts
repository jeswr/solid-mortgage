// AUTHORED-BY Claude Opus 5.5
/**
 * `@mortgage/demo-kit/holders`: the pod holder registry. It lives in `./registry.ts` (which the
 * site tools load directly, so it imports nothing); this module re-exports that part.
 */
export {
  DEFAULT_HOLDER,
  HOLDER_IDS,
  HOLDERS,
  type HolderId,
  type HolderKind,
  type HolderRecord,
  holderOfPodUrl,
  holderRecord,
  isHolderId,
} from "./registry.js";
