/**
 * Page-side surface of the Mode-1 in-browser pod runtime
 * (`@mortgage/solid-kit/browser-pod`, sm-23, decision 0011): the postMessage-routed
 * `browserPodFetch`, the SharedWorker → dedicated-worker fallback, and the simulated-login
 * binding. Wasm-free and node-free by construction — the wasm host lives on
 * `@mortgage/solid-kit/browser-pod/worker`, which only the worker entry file imports.
 */

// Re-exported so pod UI code can take the honesty flag from ONE import (decision 0011).
export {
  type DemoSession,
  SIMULATED_LOGIN_DISCLOSURE,
  type SimulatedLoginDisclosure,
} from "../auth/demo.js";
export {
  type BrowserPodConnection,
  type BrowserPodFetch,
  browserPodFetch,
  type ConnectBrowserPodOptions,
  type ConnectRemoteDemoPodOptions,
  connectBrowserPod,
  connectRemoteDemoPod,
  createPodPortClient,
  type DedicatedWorkerLike,
  type OpenPodEndpointOptions,
  openPodEndpoint,
  type PodEndpoint,
  type PodPortClient,
  type PodReadyInfo,
  type SharedWorkerLike,
} from "./client.js";
export {
  POD_PROTOCOL,
  type PodMessagePortLike,
  type PodRequestPayload,
  type PodResponsePayload,
} from "./protocol.js";
