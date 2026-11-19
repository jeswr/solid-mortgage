// AUTHORED-BY Claude Opus 5.5
/**
 * `pods-sw.js`: one classic bundle, four roles, chosen by where it runs.
 *
 * - Service worker (normal): intercepts same-origin `/pods/**` and answers from the wasm pods.
 * - Dedicated worker named `pod-host`: the same host, for browsers without service workers.
 * - Dedicated worker named `pod-agents`: the organisation agents, one runner across all tabs.
 * - Window on the pod origin (host-mode build only): the bridge page.
 */
import hostConfig from "virtual:pod-runtime-host-config";
import base64 from "virtual:pod-runtime-wasm";
import { idbStorage, type PodStorage } from "../host/storage.js";
import { AGENTS_WORKER_NAME, EVENTS_CHANNEL } from "../protocol.js";
import { startAgentWorker } from "./agent-worker.js";
import { startBridgePage } from "./bridge-page.js";
import { startHostWorker } from "./host-worker.js";
import { createSwRuntime, type SwRuntimeOptions } from "./runtime.js";
import { type ServiceWorkerScope, startServiceWorker } from "./service-worker.js";

const scope = globalThis as unknown as { name?: string; document?: unknown };

function decode(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const runtime = (storage: PodStorage = idbStorage()) => {
  const options: SwRuntimeOptions = {
    channel: new BroadcastChannel(EVENTS_CHANNEL),
    compile: () => WebAssembly.compile(decode(base64)),
    origin: self.location.origin,
    storage,
  };
  if (__HOST_MODE__) {
    if (hostConfig === undefined) throw new Error("host-mode build without a registry");
    options.fixedConfig = hostConfig;
  }
  return createSwRuntime(options);
};

if (
  typeof ServiceWorkerGlobalScope !== "undefined" &&
  globalThis instanceof ServiceWorkerGlobalScope
) {
  startServiceWorker(globalThis as unknown as ServiceWorkerScope, runtime(), {
    hostMode: __HOST_MODE__,
  });
} else if (scope.document !== undefined) {
  if (__HOST_MODE__ && hostConfig !== undefined) startBridgePage(hostConfig);
} else if (scope.name === AGENTS_WORKER_NAME) {
  startAgentWorker();
} else {
  startHostWorker(() => {
    const storage = idbStorage();
    return { runtime: runtime(storage), storage };
  });
}
