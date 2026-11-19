// AUTHORED-BY Claude Opus 5.5
/**
 * The page side of the pod runtime (design.md §d.2 contract). Apps call `configure` once at
 * start-up, then reach pods only through `podFetch`.
 */
import type { AppNote, LensEntry, Session } from "@mortgage/demo-kit/contracts";
import {
  type AppSlug,
  displayName,
  HOLDERS,
  type HolderId,
  holdersActedFor,
  isOrgSlug,
  type OrgRegistry,
  type PodOwner,
  podOwners,
  webidFor,
} from "@mortgage/demo-kit/registry";
import { podOrigin, urlMode } from "@mortgage/demo-kit/urls";
import { createBridgeClient } from "../bridge/client.js";
import type { HostInfo, HostMessage, Seed, SeedContext } from "../host/host.js";
import {
  AGENT_HEADER,
  EVENTS_CHANNEL,
  HOLDER_HEADER,
  HOST_WORKER_NAME,
  TOUR_HEADER,
} from "../protocol.js";
import {
  makeGrantOneTime,
  type OneTimeGrantRecord,
  type SubscriptionRecord,
  unwatchResource,
  watchResource,
} from "../runtime-api.js";
import { siteAgents, spawnAgentWorker } from "./agents.js";
import { serviceWorkerTransport, type Transport, workerTransport } from "./transport.js";

export interface RuntimeConfig {
  registry: OrgRegistry;
  /** The app this page belongs to; its `actsAs` is who `podFetch` acts as. */
  app: AppSlug;
  /**
   * For an app that acts for holders (the wallet): the registered holder this page acts for.
   * Default: the app's `actsAs`. Change it later with `setHolder`.
   */
  holder?: HolderId;
  /** Applied once, the first time any page starts the runtime. */
  seed?: Seed;
  /** App slugs with an agent bundle at `/agents/<slug>.js`. Default: read from `/site.json`. */
  agents?: readonly string[] | false;
  /** Where the runtime bundle is served. Default `/pods-sw.js`. */
  swUrl?: string;
  /** Force a transport (tests, or the honesty panel's "try the fallback"). */
  mode?: "auto" | "worker";
}

export interface RuntimeInfo extends HostInfo {
  mode: Transport["mode"];
  /** The demo calendar's day 1 and the current demo day. */
  dayOne: string;
  day: number;
}

let config: RuntimeConfig | undefined;
let holder: HolderId | undefined;
let started: Promise<{ transport: Transport; info: RuntimeInfo }> | undefined;
let tour: { demo: string; step: string } | undefined;
const listeners = new Set<(entry: LensEntry) => void>();
const resetListeners = new Set<() => void>();
let channel: BroadcastChannel | undefined;

function requireConfig(): RuntimeConfig {
  if (config === undefined)
    throw new Error("pod-runtime: call configure() before using the runtime");
  return config;
}

/** Set the registry, the app and the seed. Call once, before `ready()`. */
export function configure(next: RuntimeConfig): void {
  if (started !== undefined) throw new Error("pod-runtime: configure() after the runtime started");
  if (next.holder !== undefined) checkHolder(next, next.holder);
  config = next;
  holder = next.holder;
}

function checkHolder(current: RuntimeConfig, next: HolderId): void {
  if (!holdersActedFor(current.registry, current.app).includes(next))
    throw new Error(`pod-runtime: ${current.app} cannot act for ${next}`);
}

/**
 * Act for another registered holder from now on (the wallet's holder switcher). Only an app
 * that acts for holders may call it; `podFetch`, `session()` and `actingAs()` follow at once.
 */
export function setHolder(next: HolderId): void {
  checkHolder(requireConfig(), next);
  holder = next;
}

/** Who this page's requests are made as: the holder it acts for, or the app's `actsAs`. */
export function actingAs(): PodOwner {
  const { registry, app } = requireConfig();
  if (!isOrgSlug(app)) throw new Error(`pod-runtime: ${app} is not an organisation app`);
  return holder ?? registry[app].actsAs;
}

/** The holder this page acts for when it is not the app's own `actsAs`, else undefined. */
function actingHolder(): HolderId | undefined {
  const { registry, app } = requireConfig();
  return holder !== undefined && isOrgSlug(app) && holder !== registry[app].actsAs
    ? holder
    : undefined;
}

function origin(): string {
  return podOrigin() || globalThis.location.origin;
}

/** The absolute URL of `path` in `owner`'s pod. */
export function podUrl(owner: PodOwner, path: string): string {
  return `${origin()}/pods/${owner}/${path.replace(/^\/+/, "")}`;
}

function identities(registry: OrgRegistry): Record<string, PodOwner> {
  const map: Record<string, PodOwner> = {};
  for (const [slug, record] of Object.entries(registry)) map[slug] = record.actsAs;
  return map;
}

/** Who this app signs in as (simulated; design.md §d.3). */
export function session(): Session {
  const { registry, app } = requireConfig();
  if (!isOrgSlug(app)) throw new Error(`pod-runtime: ${app} is not an organisation app`);
  const record = registry[app];
  const other = actingHolder();
  if (other !== undefined) {
    // The wallet showing another holder's pod is signed in as that holder (simulated).
    const shown = HOLDERS[other];
    const persona = shown.operator === undefined ? shown.name : `${shown.operator}, ${shown.name}`;
    return { org: app, persona, simulated: true, webid: webidFor(other, origin()) };
  }
  const persona =
    record.persona === null
      ? displayName(record)
      : record.persona.role === undefined
        ? record.persona.name
        : `${record.persona.name}, ${record.persona.role}`;
  return { org: app, persona, simulated: true, webid: webidFor(record.actsAs, origin()) };
}

function dispatchHostMessage(message: HostMessage): void {
  if (message.type === "event") for (const listener of listeners) listener(message.entry);
  else if (message.type === "reset") for (const listener of resetListeners) listener();
}

function ensureChannel(): void {
  if (channel !== undefined || typeof BroadcastChannel === "undefined") return;
  channel = new BroadcastChannel(EVENTS_CHANNEL);
  channel.onmessage = (event: MessageEvent<HostMessage>) => dispatchHostMessage(event.data);
}

async function chooseTransport(current: RuntimeConfig): Promise<Transport> {
  const swUrl = current.swUrl ?? "/pods-sw.js";
  if (urlMode().kind === "host") return createBridgeClient({ podsOrigin: origin() });
  if (current.mode !== "worker" && globalThis.isSecureContext && "serviceWorker" in navigator) {
    try {
      const transport = await serviceWorkerTransport(swUrl);
      if (transport !== undefined) return transport;
    } catch (error) {
      console.warn("pod-runtime: service worker unavailable, using a dedicated worker", error);
    }
  }
  return workerTransport(swUrl, HOST_WORKER_NAME);
}

async function startAgents(transport: Transport, current: RuntimeConfig): Promise<void> {
  if (current.agents === false) return;
  const agents = current.agents === undefined ? await siteAgents() : [...current.agents];
  if (agents.length === 0) return;
  const map = identities(current.registry);
  if (transport.mode === "worker") {
    await transport.control({ agents, identities: map, type: "agents" });
    return;
  }
  // In host mode the bridge page runs the agents, on the pod origin.
  if (transport.mode !== "service-worker" || typeof Worker === "undefined") return;
  spawnAgentWorker({
    agents,
    identities: map,
    onNote: note,
    origin: origin(),
    swUrl: current.swUrl ?? "/pods-sw.js",
  });
}

/** Start the runtime (once per page) and resolve when the pods are seeded and controlled. */
export function ready(): Promise<RuntimeInfo> {
  started ??= (async () => {
    const current = requireConfig();
    ensureChannel();
    const transport = await chooseTransport(current);
    transport.subscribe?.(dispatchHostMessage);
    const owners = podOwners(current.registry);
    const reply = await transport.control({
      identities: identities(current.registry),
      owners,
      type: "hello",
    });
    const hello = reply.hello;
    if (hello === undefined) throw new Error("pod-runtime: the host sent no hello");
    let info: RuntimeInfo = {
      ...hello.info,
      day: hello.day,
      dayOne: hello.dayOne,
      mode: transport.mode,
    };
    if (current.seed !== undefined && !info.seeded) {
      const context: SeedContext = {
        origin: origin(),
        podUrl: (owner, path) => podUrl(owner, path),
        webid: (owner) => webidFor(owner, origin()),
      };
      const requests =
        typeof current.seed === "function" ? await current.seed(context) : current.seed;
      await transport.control({ requests: [...requests], type: "seed" });
      info = { ...info, seeded: true };
    }
    await startAgents(transport, current);
    return { info, transport };
  })();
  started.catch(() => {
    started = undefined;
  });
  return started.then(({ info }) => info);
}

/** The started runtime, starting it when needed. */
function runtime(): Promise<{ transport: Transport; info: RuntimeInfo }> {
  ready().catch(() => undefined);
  return started as NonNullable<typeof started>;
}

function isPodRequest(url: URL): boolean {
  return url.origin === origin() && (url.pathname === "/pods" || url.pathname.startsWith("/pods/"));
}

/** The only way apps reach a pod: acts as this app's organisation. */
export const podFetch: typeof fetch = async (input, init) => {
  const request = new Request(input, init);
  const url = new URL(request.url);
  if (!isPodRequest(url)) return fetch(request);
  const { app } = requireConfig();
  const { transport } = await runtime();
  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) if (name.startsWith("x-demo-")) headers.delete(name);
  const other = actingHolder();
  if (transport.mode === "bridge") {
    // The bridge decides whether this origin may act for the holder.
    if (other !== undefined) headers.set(HOLDER_HEADER, other);
  } else if (isOrgSlug(app)) {
    // Path mode: the holder is an identity of its own (self-declared, design.md §d.5).
    headers.set(AGENT_HEADER, other ?? app);
  }
  if (tour !== undefined) headers.set(TOUR_HEADER, `${tour.demo}:${tour.step}`);
  return transport.fetch(new Request(request, { headers }));
};

/** Subscribe to Lens entries from every tab; `replay` first delivers what is already logged. */
export function onEvent(
  callback: (entry: LensEntry) => void,
  options: { replay?: boolean } = {},
): () => void {
  ensureChannel();
  if (!options.replay) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }
  const seen = new Set<number>();
  let replaying = true;
  const buffered: LensEntry[] = [];
  const live = (entry: LensEntry) => {
    if (replaying) buffered.push(entry);
    else if (!seen.has(entry.id)) {
      seen.add(entry.id);
      callback(entry);
    }
  };
  listeners.add(live);
  void (async () => {
    try {
      const { transport } = await runtime();
      const reply = await transport.control({ type: "events" });
      for (const entry of reply.events ?? []) {
        seen.add(entry.id);
        callback(entry);
      }
    } catch (error) {
      console.error("pod-runtime: event replay failed", error);
    } finally {
      replaying = false;
      for (const entry of buffered.splice(0))
        if (!seen.has(entry.id)) {
          seen.add(entry.id);
          callback(entry);
        }
    }
  })();
  return () => listeners.delete(live);
}

/** Called after "Restart the demo" in any tab. */
export function onReset(callback: () => void): () => void {
  ensureChannel();
  resetListeners.add(callback);
  return () => resetListeners.delete(callback);
}

async function control<T>(fn: (transport: Transport) => Promise<T>): Promise<T> {
  const { transport } = await runtime();
  return fn(transport);
}

/** Add an "app said" entry to the Lens. */
export function note(entry: AppNote): void {
  control((t) => t.control({ note: entry, type: "note" })).catch((error: unknown) =>
    console.error("pod-runtime: note failed", error),
  );
}

/** Return every pod to its seed and clear the Lens. */
export async function resetDemo(): Promise<void> {
  await control((t) => t.control({ type: "reset" }));
}

/** Move the demo clock to `day` (PodEvent.at uses it). */
export async function setDay(day: number): Promise<void> {
  await control((t) => t.control({ day, type: "day" }));
}

/**
 * Tag later `podFetch` requests with a tour step (`PodEvent.tour`); `null` clears it. The
 * signature `packages/tour`'s `mountDemo({ runtime })` expects, so apps can pass this module in.
 */
export function setTourContext(ctx: { demo: string; step: string } | null): void {
  if (ctx !== null && (ctx.demo.includes(":") || ctx.demo === "" || ctx.step === ""))
    throw new Error("pod-runtime: a tour demo id must be non-empty and contain no colon");
  tour = ctx === null ? undefined : { demo: ctx.demo, step: ctx.step };
}

/** The same as `setTourContext`; `undefined` also clears it. */
export function setTour(step: { demo: string; step: string } | undefined | null): void {
  setTourContext(step ?? null);
}

/**
 * Subscribe this app to changes of `topic` (a resource, or a container's members). The runtime,
 * not the pod server, sends the notices: they arrive as `notified` Lens entries (and run the
 * app's agent `changed` handler). This app's organisation must be able to read the topic.
 */
export async function watch(topic: string): Promise<SubscriptionRecord> {
  const { app } = requireConfig();
  return watchResource(podFetch, topic, isOrgSlug(app) ? { app } : {});
}

/** Stop this app's subscription to `topic`. */
export async function unwatch(topic: string): Promise<void> {
  const { app } = requireConfig();
  await unwatchResource(podFetch, topic, isOrgSlug(app) ? { app } : {});
}

/**
 * Mark access granted to `agent` on `resource` as one-time: the runtime revokes it, as the
 * holder's wallet, after the agent's first successful read. Only the pod owner's app may call it.
 */
export async function oneTimeGrant(input: {
  resource: string;
  agent: string;
}): Promise<OneTimeGrantRecord> {
  return makeGrantOneTime(podFetch, input);
}
