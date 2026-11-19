// AUTHORED-BY Claude Opus 5.5
/**
 * Host-mode bridge page: `pods.<domain>/pods-bridge/` loads this bundle as a classic script. It
 * registers the pod service worker, then serves the apps that embed it (their identity is their
 * origin, `<slug>.<domain>`).
 */
import type { PodOwner } from "@mortgage/demo-kit/registry";
import { BRIDGE_EVENT, BRIDGE_READY, hostModeIdentity, startBridge } from "../bridge/server.js";
import { siteAgents, spawnAgentWorker } from "../client/agents.js";
import { serviceWorkerTransport } from "../client/transport.js";
import type { HostMessage } from "../host/host.js";
import { EVENTS_CHANNEL } from "../protocol.js";

/** `config` is the build-time registry: the only identities the bridge recognises. */
export function startBridgePage(config: { identities: Record<string, PodOwner> }): void {
  void (async () => {
    const domain = location.hostname.replace(/^pods\./, "");
    const transport = await serviceWorkerTransport(new URL("/pods-sw.js", location.origin).href);
    if (transport === undefined) throw new Error("the pod service worker did not take control");
    // Relay events to the embedding app, once it has shown itself to be a recognised app.
    let parentOrigin: string | undefined;
    new BroadcastChannel(EVENTS_CHANNEL).onmessage = (event: MessageEvent<HostMessage>) => {
      if (parentOrigin !== undefined)
        window.parent.postMessage({ message: event.data, type: BRIDGE_EVENT }, parentOrigin);
    };
    startBridge({
      onRecognised: (origin, source) => {
        if (source === window.parent) parentOrigin = origin;
      },
      control: (message) => transport.control(message),
      fetch: (request) => transport.fetch(request),
      identify: hostModeIdentity(domain, Object.keys(config.identities)),
      podsOrigin: location.origin,
      target: window,
    });
    if (window.parent !== window) window.parent.postMessage({ type: BRIDGE_READY }, "*");
    // The organisation agents run here, on the pod origin, as in path mode they run in a page.
    const agents = await siteAgents();
    if (agents.length > 0 && typeof Worker !== "undefined") {
      spawnAgentWorker({
        agents,
        identities: config.identities,
        onNote: (note) => {
          transport.control({ note, type: "note" }).catch(() => undefined);
        },
        origin: location.origin,
        swUrl: "/pods-sw.js",
      });
    }
  })().catch((error: unknown) => console.error("pod-runtime bridge:", error));
}
