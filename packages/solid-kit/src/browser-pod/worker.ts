/**
 * Worker-side surface of the Mode-1 in-browser pod runtime
 * (`@mortgage/solid-kit/browser-pod/worker`, sm-23): the sparq-lws-wasm pod host and the
 * persona seed adapter. ONLY import this from a worker entry file — it pulls the wasm glue
 * (`@jeswr/solid-server/wasm`, the `--target web` artifact) which must never land in the
 * page bundle. Browser-safe: no `node:` imports anywhere beneath it.
 */

export type { ResourceFixture } from "../seed.js";
export {
  attachPodHostPort,
  type BrowserPodHost,
  type CreateBrowserPodOptions,
  createBrowserPod,
  isWasmTrap,
  MAX_POD_BODY_BYTES,
  type PodServerInstance,
  type PodWorkerScopeLike,
  type StartBrowserPodHostOptions,
  startBrowserPodHost,
} from "./host.js";
export {
  type PersonaSeedOptions,
  personaPodOrigin,
  personaSeedFixtures,
  type SeedablePersona,
  type SeedablePersonaResource,
} from "./persona.js";
export {
  POD_PROTOCOL,
  type PodMessagePortLike,
  type PodRequestPayload,
  type PodResponsePayload,
} from "./protocol.js";
