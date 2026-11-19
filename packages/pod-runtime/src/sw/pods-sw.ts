// AUTHORED-BY Claude Opus 5.5
/**
 * `pods-sw.js`: one classic bundle, four roles, chosen by where it runs.
 *
 * - Service worker (normal): intercepts same-origin `/pods/**` and answers from the wasm pods.
 * - Dedicated worker named `pod-host`: the same host, for browsers without service workers.
 * - Dedicated worker named `pod-agents`: the organisation agents, one runner across all tabs.
 * - Window on the pod origin (host-mode build only): the bridge page.
 */
import { AGENTS_WORKER_NAME } from "../protocol.js";
import { startAgentWorker } from "./agent-worker.js";
import { startBridgePage } from "./bridge-page.js";
import { startHostWorker } from "./host-worker.js";
import { startServiceWorker } from "./service-worker.js";

const scope = globalThis as unknown as { name?: string; document?: unknown };

if (
  typeof ServiceWorkerGlobalScope !== "undefined" &&
  globalThis instanceof ServiceWorkerGlobalScope
) {
  startServiceWorker(globalThis as unknown as ServiceWorkerGlobalScope);
} else if (scope.document !== undefined) {
  if (__HOST_MODE__) startBridgePage();
} else if (scope.name === AGENTS_WORKER_NAME) {
  startAgentWorker();
} else {
  startHostWorker();
}
