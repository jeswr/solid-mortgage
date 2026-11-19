// AUTHORED-BY Claude Opus 5.5
/**
 * How a page reaches the pod host: the service worker (normal), a dedicated worker running the
 * same bundle (where service workers are unavailable), or the host-mode bridge iframe.
 */
import type { ControlReply, ControlRequest, FetchReply } from "../protocol.js";

export interface Transport {
  mode: "service-worker" | "worker" | "bridge";
  control(message: ControlRequest): Promise<ControlReply & { ok: true }>;
  /** Send a pod request; the transport adds nothing but what the caller put in `request`. */
  fetch(request: Request): Promise<Response>;
}

/** Send one control message over a fresh MessageChannel and wait for the reply. */
export function sendControl(
  target: { postMessage(message: unknown, transfer: Transferable[]): void },
  message: ControlRequest,
  timeoutMs = 30_000,
): Promise<ControlReply & { ok: true }> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      reject(new Error(`pod runtime did not answer "${message.type}" within ${timeoutMs} ms`));
    }, timeoutMs);
    channel.port1.onmessage = (event: MessageEvent<ControlReply>) => {
      clearTimeout(timer);
      channel.port1.close();
      const reply = event.data;
      if (reply.ok) resolve(reply);
      else reject(new Error(reply.error));
    };
    const transfer: Transferable[] = [channel.port2];
    if (message.type === "fetch" && message.body !== null) transfer.push(message.body);
    target.postMessage(message, transfer);
  });
}

export async function toControlFetch(request: Request): Promise<ControlRequest> {
  const body =
    request.method === "GET" || request.method === "HEAD" ? null : await request.arrayBuffer();
  return {
    body: body === null || body.byteLength === 0 ? null : body,
    headers: [...request.headers],
    method: request.method,
    type: "fetch",
    url: request.url,
  };
}

export function fromFetchReply(reply: FetchReply | undefined): Response {
  if (reply === undefined) throw new Error("pod runtime sent no response");
  const nullBody = reply.status === 204 || reply.status === 205 || reply.status === 304;
  return new Response(nullBody ? null : reply.body, {
    headers: reply.headers,
    status: reply.status,
  });
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Register the service worker and wait until it controls this page. */
export async function serviceWorkerTransport(
  swUrl: string,
  timeoutMs = 10_000,
): Promise<Transport | undefined> {
  const container = navigator.serviceWorker;
  await container.register(swUrl, { scope: "/", type: "classic", updateViaCache: "none" });
  const registration = await Promise.race([container.ready, wait(timeoutMs).then(() => undefined)]);
  const active = registration?.active;
  if (!active) return undefined;
  if (!container.controller) {
    const controlled = new Promise<void>((resolve) =>
      container.addEventListener("controllerchange", () => resolve(), { once: true }),
    );
    // A hard reload leaves the page uncontrolled even after activation; ask for a claim.
    await sendControl(active, { type: "claim" }).catch(() => undefined);
    await Promise.race([controlled, wait(timeoutMs)]);
    if (!container.controller) return undefined;
  }
  const target = () => container.controller ?? active;
  return {
    control: (message) => sendControl(target(), message),
    fetch: (request) => fetch(request),
    mode: "service-worker",
  };
}

/** Run the host in a dedicated worker from the same bundle. */
export function workerTransport(swUrl: string, name: string): Transport {
  const worker = new Worker(swUrl, { name, type: "classic" });
  return {
    control: (message) => sendControl(worker, message),
    async fetch(request) {
      const reply = await sendControl(worker, await toControlFetch(request));
      return fromFetchReply(reply.response);
    },
    mode: "worker",
  };
}
