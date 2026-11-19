// AUTHORED-BY Claude Opus 5.5
/**
 * Host mode (design.md §d.5), the pod-origin side. The bridge page at `pods.<domain>/pods-bridge/`
 * sits in a hidden iframe inside each app. It takes the caller's identity from `event.origin`,
 * which the browser sets and the app cannot forge, and forwards the request to its own service
 * worker. In a host-mode build the service worker honours the identity header only from this page.
 */
import type { AppNote } from "@mortgage/demo-kit/contracts";
import { AGENT_HEADER, type ControlReply, type ControlRequest, TOUR_HEADER } from "../protocol.js";

export const BRIDGE_REQUEST = "pod-bridge";
export const BRIDGE_REPLY = "pod-bridge-reply";
export const BRIDGE_READY = "pod-bridge-ready";

export interface BridgeEnvelope {
  type: typeof BRIDGE_REQUEST;
  id: number;
  message: ControlRequest;
}

interface MessageSource {
  postMessage(message: unknown, targetOrigin: string, transfer?: Transferable[]): void;
}

interface BridgeMessageEvent {
  origin: string;
  source: unknown;
  data: unknown;
}

export interface BridgeOptions {
  /** The bridge page's own origin (`https://pods.<domain>`). */
  podsOrigin: string;
  /** The app slug an origin belongs to, or undefined (then requests are anonymous). */
  identify(origin: string): string | undefined;
  /** Where `message` events arrive. Default: the window. */
  target?: {
    addEventListener(type: "message", listener: (event: BridgeMessageEvent) => void): void;
    removeEventListener(type: "message", listener: (event: BridgeMessageEvent) => void): void;
  };
  /** Fetch through the pod service worker. Default: global fetch. */
  fetch?: (request: Request) => Promise<Response>;
  /** Send a non-fetch control message to the service worker. */
  control(message: ControlRequest): Promise<ControlReply>;
}

/** `https://<slug>.<domain>` → `<slug>` when the slug is one of `slugs`. */
export function hostModeIdentity(domain: string, slugs: readonly string[]) {
  return (origin: string): string | undefined => {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      return undefined;
    }
    if (
      url.protocol !== "https:" &&
      url.hostname !== "localhost" &&
      !url.hostname.endsWith(".localhost")
    )
      return undefined;
    const suffix = `.${domain}`;
    if (!url.hostname.endsWith(suffix)) return undefined;
    const slug = url.hostname.slice(0, -suffix.length);
    return slugs.includes(slug) ? slug : undefined;
  };
}

async function forwardFetch(
  message: Extract<ControlRequest, { type: "fetch" }>,
  identity: string | undefined,
  options: BridgeOptions,
): Promise<ControlReply> {
  const url = new URL(message.url);
  if (
    url.origin !== options.podsOrigin ||
    !(url.pathname === "/pods" || url.pathname.startsWith("/pods/"))
  )
    return { error: "the bridge only forwards requests for this origin's pods", ok: false };
  const headers = new Headers(message.headers);
  const tour = headers.get(TOUR_HEADER);
  for (const name of [...headers.keys()]) if (name.startsWith("x-demo-")) headers.delete(name);
  if (identity !== undefined) headers.set(AGENT_HEADER, identity);
  if (tour !== null) headers.set(TOUR_HEADER, tour);
  const init: RequestInit = { headers, method: message.method };
  if (message.body !== null) init.body = message.body;
  const response = await (options.fetch ?? fetch)(new Request(url, init));
  const body = response.body === null ? null : await response.arrayBuffer();
  return { ok: true, response: { body, headers: [...response.headers], status: response.status } };
}

/**
 * Forward a control message from a recognised app. What the app could use to claim another
 * identity is replaced: a hello carries no owners or identities (the service worker's are fixed
 * at build time), and a note's org is the calling app.
 */
function forwardControl(
  message: Exclude<ControlRequest, { type: "fetch" }>,
  identity: string,
  options: BridgeOptions,
): Promise<ControlReply> {
  switch (message.type) {
    case "hello":
      return options.control({ identities: {}, owners: [], type: "hello" });
    case "note":
      return options.control({
        note: { ...message.note, org: identity as AppNote["org"] },
        type: "note",
      });
    case "claim":
    case "agents":
      return Promise.resolve({ error: `${message.type} is not forwarded`, ok: false });
    default:
      return options.control(message);
  }
}

/** Serve bridge requests until the returned function is called. */
export function startBridge(options: BridgeOptions): () => void {
  const target = options.target ?? (globalThis as unknown as NonNullable<BridgeOptions["target"]>);
  const listener = (event: BridgeMessageEvent) => {
    const data = event.data as Partial<BridgeEnvelope> | null;
    if (data === null || typeof data !== "object" || data.type !== BRIDGE_REQUEST) return;
    const source = event.source as MessageSource | null;
    if (source === null || typeof source?.postMessage !== "function") return;
    const id = data.id;
    const message = data.message;
    if (typeof id !== "number" || message === undefined) return;
    const identity = options.identify(event.origin);
    const answer =
      message.type === "fetch"
        ? forwardFetch(message, identity, options)
        : identity === undefined
          ? Promise.resolve<ControlReply>({ error: "unknown app origin", ok: false })
          : forwardControl(message, identity, options);
    answer
      .catch(
        (error: unknown): ControlReply => ({
          error: String((error as Error)?.message ?? error),
          ok: false,
        }),
      )
      .then((reply) => {
        const transfer = reply.ok && reply.response?.body ? [reply.response.body] : [];
        source.postMessage({ id, reply, type: BRIDGE_REPLY }, event.origin, transfer);
      });
  };
  target.addEventListener("message", listener);
  return () => target.removeEventListener("message", listener);
}
