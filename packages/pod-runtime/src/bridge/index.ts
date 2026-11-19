// AUTHORED-BY Claude Opus 5.5
/** `@mortgage/pod-runtime/bridge`: host mode (design.md §d.5). */

export { BRIDGE_PATH } from "../protocol.js";
export { type BridgeClientOptions, createBridgeClient } from "./client.js";
export {
  BRIDGE_EVENT,
  BRIDGE_READY,
  BRIDGE_REPLY,
  BRIDGE_REQUEST,
  type BridgeEnvelope,
  type BridgeOptions,
  hostModeIdentity,
  startBridge,
} from "./server.js";
