// AUTHORED-BY Claude Opus 5.5
/**
 * Host-mode bridge page: `pods.<domain>/pods-bridge/` loads this bundle as a classic script. It
 * registers the pod service worker, then serves the apps that embed it (their identity is their
 * origin, `<slug>.<domain>`).
 */
import { ORG_SLUGS } from "@mortgage/demo-kit/registry";
import { BRIDGE_READY, hostModeIdentity, startBridge } from "../bridge/server.js";
import { serviceWorkerTransport } from "../client/transport.js";

export function startBridgePage(): void {
  void (async () => {
    const domain = location.hostname.replace(/^pods\./, "");
    const transport = await serviceWorkerTransport(new URL("/pods-sw.js", location.origin).href);
    if (transport === undefined) throw new Error("the pod service worker did not take control");
    startBridge({
      control: (message) => transport.control(message),
      fetch: (request) => transport.fetch(request),
      identify: hostModeIdentity(domain, ORG_SLUGS),
      podsOrigin: location.origin,
      target: window,
    });
    if (window.parent !== window) window.parent.postMessage({ type: BRIDGE_READY }, "*");
  })().catch((error: unknown) => console.error("pod-runtime bridge:", error));
}
