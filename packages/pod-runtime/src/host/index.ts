// AUTHORED-BY Claude Opus 5.5
/** `@mortgage/pod-runtime/host`: the transport-agnostic pod host and its storage. */

export { checkBody, jsonDepth, MAX_BODY_BYTES, MAX_NESTING, turtleDepth } from "./guard.js";
export {
  createPodHost,
  type DispatchContext,
  type HostInfo,
  type HostMessage,
  type PodHost,
  type PodHostOptions,
  type Seed,
  type SeedContext,
  type SeedRequest,
} from "./host.js";
export { idbStorage, memoryStorage, type PodStorage, type SnapshotKind } from "./storage.js";
export { type Glue, wasmLoader } from "./wasm.js";
