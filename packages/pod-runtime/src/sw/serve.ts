// AUTHORED-BY Claude Opus 5.5
/**
 * The host as the service worker (and the fallback dedicated worker) runs it: IndexedDB storage,
 * the inlined wasm, the demo calendar as the clock, events broadcast to every page, and the
 * control messages pages send.
 */

import base64 from "virtual:pod-runtime-wasm";
import { createDemoCalendar, demoDayOne } from "@mortgage/demo-kit/calendar";
import { createPodHost, type DispatchContext, type PodHost } from "../host/host.js";
import { idbStorage } from "../host/storage.js";
import { wasmLoader } from "../host/wasm.js";
import {
  AGENT_HEADER,
  type ControlReply,
  type ControlRequest,
  EVENTS_CHANNEL,
  parseTour,
  type RuntimeConfigMessage,
  TOUR_HEADER,
  VIA_AGENT_HEADER,
} from "../protocol.js";

const storage = idbStorage();
const channel = new BroadcastChannel(EVENTS_CHANNEL);
let compiled: Promise<WebAssembly.Module> | undefined;
let hostPromise: Promise<PodHost> | undefined;
let config: RuntimeConfigMessage | undefined;
let day = 1;
let dayOne = "";

function decode(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const sameOwners = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

/** The host, created once the owners are known (from a page's hello, or stored from an earlier one). */
export async function getHost(): Promise<PodHost | undefined> {
  if (hostPromise !== undefined) return hostPromise;
  config ??= await storage.getMeta<RuntimeConfigMessage>("config");
  if (config === undefined) return undefined;
  const { owners, identities } = config;
  hostPromise = (async () => {
    dayOne = (await storage.getMeta<string>("dayOne")) ?? demoDayOne();
    await storage.putMeta("dayOne", dayOne);
    day = (await storage.getMeta<number>("day")) ?? 1;
    const calendar = createDemoCalendar(dayOne);
    compiled ??= WebAssembly.compile(decode(base64));
    const host = createPodHost({
      clock: () => calendar.time(day, new Date().toISOString().slice(11, 16)),
      identities,
      loadWasm: wasmLoader(await compiled),
      origin: self.location.origin,
      owners,
      storage,
    });
    host.subscribe((message) => channel.postMessage(message));
    await host.ready;
    return host;
  })();
  hostPromise.catch(() => {
    hostPromise = undefined;
  });
  return hostPromise;
}

/** Answer a `/pods/**` request; `identity` is what the transport established. */
export async function serveRequest(request: Request, identity: string | null): Promise<Response> {
  const host = await getHost();
  if (host === undefined) {
    return new Response("the pod runtime has not been started by a page yet\n", { status: 503 });
  }
  const context: DispatchContext = {
    identity,
    viaAgent: request.headers.get(VIA_AGENT_HEADER) === "1",
  };
  const tour = parseTour(request.headers.get(TOUR_HEADER));
  if (tour !== undefined) context.tour = tour;
  return host.handle(request, context);
}

export function identityOf(request: Request): string | null {
  return request.headers.get(AGENT_HEADER);
}

async function handleControl(message: ControlRequest): Promise<ControlReply> {
  if (message.type === "hello") {
    const next = { identities: message.identities, owners: [...message.owners] };
    const stored = config ?? (await storage.getMeta<RuntimeConfigMessage>("config"));
    if (stored === undefined || !sameOwners(stored.owners, next.owners)) hostPromise = undefined;
    config = next;
    await storage.putMeta("config", next);
    const host = (await getHost()) as PodHost;
    await host.setIdentities(next.identities);
    return { hello: { day, dayOne, info: await host.info() }, ok: true };
  }
  const host = await getHost();
  if (host === undefined) return { error: "send hello first", ok: false };
  switch (message.type) {
    case "seed":
      return { applied: await host.applySeed(message.requests), ok: true };
    case "note":
      return { entry: await host.note(message.note), ok: true };
    case "events":
      return { events: await host.events(), ok: true };
    case "reset":
      await host.reset();
      return { ok: true };
    case "day":
      if (!Number.isInteger(message.day) || message.day < 1)
        return { error: "day must be a positive integer", ok: false };
      day = message.day;
      await storage.putMeta("day", day);
      return { ok: true };
    case "claim":
    case "agents":
      return { error: `${message.type} is not handled here`, ok: false };
    case "fetch": {
      const request = new Request(message.url, {
        body: message.body,
        headers: message.headers,
        method: message.method,
      });
      const response = await serveRequest(request, identityOf(request));
      const body = response.body === null ? null : await response.arrayBuffer();
      return {
        ok: true,
        response: { body, headers: [...response.headers], status: response.status },
      };
    }
  }
}

/** Reply to a control message on the port it came with; resolves once the reply is sent. */
export function onControlMessage(event: MessageEvent): Promise<void> {
  const port = event.ports[0];
  if (port === undefined) return Promise.resolve();
  return handleControl(event.data as ControlRequest).then(
    (reply) => {
      const transfer = reply.ok && reply.response?.body ? [reply.response.body] : [];
      port.postMessage(reply, transfer);
    },
    (error: unknown) =>
      port.postMessage({ error: String((error as Error)?.message ?? error), ok: false }),
  );
}
