// AUTHORED-BY Claude Opus 5.5
/** The service-worker role: install, activate, claim, route `/pods/**`, answer control messages. */
import { BRIDGE_PATH } from "../protocol.js";
import { getHost, identityOf, onControlMessage, serveRequest } from "./serve.js";

async function identityFor(
  sw: ServiceWorkerGlobalScope,
  event: FetchEvent,
): Promise<string | null> {
  if (!__HOST_MODE__) return identityOf(event.request);
  // Host mode: identity is established by the bridge page (from the caller's origin), never by
  // whichever page on this origin happens to send the header.
  const client = event.clientId === "" ? undefined : await sw.clients.get(event.clientId);
  if (client === undefined || new URL(client.url).pathname !== BRIDGE_PATH) return null;
  return identityOf(event.request);
}

export function startServiceWorker(sw: ServiceWorkerGlobalScope): void {
  sw.addEventListener("install", (event) => event.waitUntil(sw.skipWaiting()));
  sw.addEventListener("activate", (event) =>
    event.waitUntil(
      (async () => {
        await sw.clients.claim();
        await getHost().catch(() => undefined);
      })(),
    ),
  );
  sw.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);
    if (url.origin !== sw.location.origin) return;
    if (url.pathname !== "/pods" && !url.pathname.startsWith("/pods/")) return;
    event.respondWith(
      identityFor(sw, event).then((identity) => serveRequest(event.request, identity)),
    );
  });
  sw.addEventListener("message", (event) => {
    const data = event.data as { type?: string } | null;
    if (data?.type === "claim") {
      event.waitUntil(sw.clients.claim().then(() => event.ports[0]?.postMessage({ ok: true })));
      return;
    }
    // A pod request must arrive as a fetch, where the identity rules above apply.
    if (data?.type === "fetch" || data?.type === "agents") {
      event.ports[0]?.postMessage({
        error: `${data.type} is not accepted by the service worker`,
        ok: false,
      });
      return;
    }
    // Keep the worker alive until the reply is sent.
    event.waitUntil(onControlMessage(event as unknown as MessageEvent));
  });
}
