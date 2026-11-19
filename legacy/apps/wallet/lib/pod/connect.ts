/**
 * Page-side Mode-1 pod connection (decision 0011): SharedWorker preferred
 * (ONE pod per visitor, shared across tabs on the single demo domain), a
 * dedicated worker as the honest per-tab degradation. The connection can only
 * be constructed under the decision-0011 simulated-login acknowledgement —
 * the vault UI renders `session.simulated` unconditionally.
 */
import type { BrowserPodConnection } from "@mortgage/solid-kit/browser-pod";
import { connectBrowserPod, SIMULATED_LOGIN_DISCLOSURE } from "@mortgage/solid-kit/browser-pod";

export function openWalletPod(): Promise<BrowserPodConnection> {
  return connectBrowserPod({
    acknowledgeSimulated: SIMULATED_LOGIN_DISCLOSURE,
    createSharedWorker: () =>
      new SharedWorker(new URL("./pod.worker.ts", import.meta.url), {
        name: "solid-pod",
        type: "module",
      }),
    createDedicatedWorker: () =>
      new Worker(new URL("./pod.worker.ts", import.meta.url), { type: "module" }),
  });
}
