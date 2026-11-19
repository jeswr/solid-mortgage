// AUTHORED-BY Claude Opus 5.5
/** The service-worker role: install, activate, claim, route `/pods/**`, answer control messages. */
import { BRIDGE_PATH } from "../protocol.js";
import { identityOf, type SwRuntime } from "./runtime.js";

export interface ServiceWorkerOptions {
  /** Host mode: identity and control messages are accepted only from the bridge page. */
  hostMode: boolean;
}

/** The parts of `ServiceWorkerGlobalScope` this role uses (a fake one in tests). */
export interface ServiceWorkerScope {
  addEventListener(type: string, listener: (event: never) => void): void;
  clients: {
    get(id: string): Promise<{ url: string; type?: string } | undefined>;
    claim(): Promise<void>;
  };
  location: { origin: string };
  skipWaiting(): Promise<void>;
}

interface FetchEventLike {
  request: Request;
  clientId: string;
  respondWith(response: Promise<Response>): void;
}

interface MessageEventLike {
  data: unknown;
  ports: readonly MessagePort[];
  source: unknown;
  waitUntil(promise: Promise<unknown>): void;
}

const isBridge = (url: string | undefined) =>
  url !== undefined && new URL(url).pathname === BRIDGE_PATH;

/**
 * Host mode: who may name an identity in a request. The bridge page (it vouches for the calling
 * app's origin) and the agent worker it starts from this same script (it acts for the
 * organisations). The pod origin serves nothing else that could start either.
 */
const mayNameIdentity = (client: { url: string; type?: string } | undefined) =>
  client !== undefined &&
  (isBridge(client.url) ||
    (client.type === "worker" && new URL(client.url).pathname === "/pods-sw.js"));

export function startServiceWorker(
  sw: ServiceWorkerScope,
  runtime: SwRuntime,
  options: ServiceWorkerOptions,
): void {
  async function identityFor(event: FetchEventLike): Promise<string | null> {
    if (!options.hostMode) return identityOf(event.request);
    // Host mode: identity is established by the bridge page (from the caller's origin), never by
    // whichever page on this origin happens to send the header.
    const client = event.clientId === "" ? undefined : await sw.clients.get(event.clientId);
    return mayNameIdentity(client) ? identityOf(event.request) : null;
  }

  sw.addEventListener("install", (event: { waitUntil(p: Promise<unknown>): void }) => {
    // The first page's hello needs the compiled wasm: start it now, while activation and the
    // claim run, instead of after the hello arrives.
    runtime.prewarm();
    event.waitUntil(sw.skipWaiting());
  });
  sw.addEventListener("activate", (event: { waitUntil(p: Promise<unknown>): void }) =>
    event.waitUntil(
      (async () => {
        await sw.clients.claim();
        await runtime.getHost().catch(() => undefined);
      })(),
    ),
  );
  sw.addEventListener("fetch", (event: FetchEventLike) => {
    const url = new URL(event.request.url);
    if (url.origin !== sw.location.origin) return;
    if (url.pathname !== "/pods" && !url.pathname.startsWith("/pods/")) return;
    event.respondWith(
      identityFor(event).then((identity) => runtime.serveRequest(event.request, identity)),
    );
  });
  sw.addEventListener("message", (event: MessageEventLike) => {
    const data = event.data as { type?: string } | null;
    const port = event.ports[0];
    if (data?.type === "claim") {
      event.waitUntil(sw.clients.claim().then(() => port?.postMessage({ ok: true })));
      return;
    }
    // Host mode: only the bridge page talks to the worker; it vouches for the calling app.
    if (options.hostMode && !isBridge((event.source as { url?: string } | null)?.url)) {
      port?.postMessage({ error: "control messages are accepted only from the bridge", ok: false });
      return;
    }
    // A pod request must arrive as a fetch, where the identity rules above apply.
    if (data?.type === "fetch" || data?.type === "agents") {
      port?.postMessage({ error: `${data.type} is not accepted by the service worker`, ok: false });
      return;
    }
    // Keep the worker alive until the reply is sent.
    event.waitUntil(runtime.onControlMessage(event));
  });
}
