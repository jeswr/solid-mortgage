// AUTHORED-BY Claude Opus 5.5
/**
 * The host as the service worker (and the fallback dedicated worker) runs it: the demo calendar
 * as the clock, events broadcast to every page, and the control messages pages send. Storage, the
 * compiled wasm and the broadcast channel are passed in, so tests run it over the Node wasm.
 */
import { createDemoCalendar, demoDayOne } from "@mortgage/demo-kit/calendar";
import {
  createPodHost,
  type DispatchContext,
  type HostMessage,
  type PodHost,
  type PodHostOptions,
} from "../host/host.js";
import type { PodStorage } from "../host/storage.js";
import { wasmLoader } from "../host/wasm.js";
import {
  AGENT_HEADER,
  type ControlReply,
  type ControlRequest,
  parseTour,
  type RuntimeConfigMessage,
  TOUR_HEADER,
  VIA_AGENT_HEADER,
} from "../protocol.js";

export interface SwRuntimeOptions {
  storage: PodStorage;
  /** Compile the wasm (called once). */
  compile: () => Promise<WebAssembly.Module>;
  /** The pod origin. */
  origin: string;
  /** Where events and resets are broadcast. */
  channel?: { postMessage(message: HostMessage): void };
  watchUncaught?: PodHostOptions["watchUncaught"];
  /**
   * Host mode: owners and identities fixed at build time. A page's hello then changes nothing,
   * so no app can remap an identity to another owner or drop a pod.
   */
  fixedConfig?: RuntimeConfigMessage;
}

export interface SwRuntime {
  /**
   * Start compiling the wasm now, without waiting for it: the service worker calls this when it
   * installs, so the compile runs while the page waits to be controlled, not after its hello.
   */
  prewarm(): void;
  /** The host, once the owners are known (from a page's hello, or stored from an earlier one). */
  getHost(): Promise<PodHost | undefined>;
  /**
   * Forget the running host, so the next call restores it from storage. The fallback worker calls
   * this when it starts hosting, since another tab's host may have written since it last looked.
   */
  dropHost(): void;
  /** Answer a `/pods/**` request; `identity` is what the transport established. */
  serveRequest(request: Request, identity: string | null): Promise<Response>;
  handleControl(message: ControlRequest): Promise<ControlReply>;
  /** Reply to a control message on the port it came with; resolves once the reply is sent. */
  onControlMessage(event: { data: unknown; ports: readonly MessagePort[] }): Promise<void>;
}

export function identityOf(request: Request): string | null {
  return request.headers.get(AGENT_HEADER);
}

const sameOwners = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

export function createSwRuntime(options: SwRuntimeOptions): SwRuntime {
  const { storage } = options;
  let compiled: Promise<WebAssembly.Module> | undefined;
  let hostPromise: Promise<PodHost> | undefined;
  let config: RuntimeConfigMessage | undefined;
  let day = 1;
  let dayOne = "";

  function compile(): Promise<WebAssembly.Module> {
    if (compiled === undefined) {
      compiled = options.compile();
      // A failed compile is reported where it is awaited (getHost), not as an unhandled rejection.
      compiled.catch(() => undefined);
    }
    return compiled;
  }

  async function getHost(): Promise<PodHost | undefined> {
    if (hostPromise !== undefined) return hostPromise;
    config ??= options.fixedConfig ?? (await storage.getMeta<RuntimeConfigMessage>("config"));
    if (config === undefined) return undefined;
    const { owners, identities } = config;
    hostPromise = (async () => {
      dayOne = (await storage.getMeta<string>("dayOne")) ?? demoDayOne();
      await storage.putMeta("dayOne", dayOne);
      day = (await storage.getMeta<number>("day")) ?? 1;
      const calendar = createDemoCalendar(dayOne);
      const hostOptions: PodHostOptions = {
        clock: () => calendar.time(day, new Date().toISOString().slice(11, 16)),
        identities,
        loadWasm: wasmLoader(await compile()),
        origin: options.origin,
        owners,
        storage,
      };
      if (options.watchUncaught) hostOptions.watchUncaught = options.watchUncaught;
      const host = createPodHost(hostOptions);
      const channel = options.channel;
      if (channel !== undefined) host.subscribe((message) => channel.postMessage(message));
      await host.ready;
      return host;
    })();
    hostPromise.catch(() => {
      hostPromise = undefined;
    });
    return hostPromise;
  }

  async function serveRequest(request: Request, identity: string | null): Promise<Response> {
    const host = await getHost();
    if (host === undefined) {
      return new Response("the pod runtime has not been started by a page yet\n", {
        status: 503,
      });
    }
    const context: DispatchContext = {
      identity,
      viaAgent: request.headers.get(VIA_AGENT_HEADER) === "1",
    };
    const tour = parseTour(request.headers.get(TOUR_HEADER));
    if (tour !== undefined) context.tour = tour;
    return host.handle(request, context);
  }

  async function handleControl(message: ControlRequest): Promise<ControlReply> {
    if (message.type === "hello" && options.fixedConfig !== undefined) {
      const host = (await getHost()) as PodHost;
      return { hello: { day, dayOne, info: await host.info() }, ok: true };
    }
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

  function onControlMessage(event: { data: unknown; ports: readonly MessagePort[] }) {
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

  function dropHost(): void {
    hostPromise = undefined;
    config = undefined;
  }

  return {
    dropHost,
    getHost,
    handleControl,
    onControlMessage,
    prewarm: () => void compile(),
    serveRequest,
  };
}
