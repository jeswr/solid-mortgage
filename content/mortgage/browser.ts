// AUTHORED-BY Claude Opus 5.5
/**
 * The mortgage journey in a browser: a `World` over the in-browser pod runtime, the issuers'
 * signing keys, and the seed every app passes to the runtime.
 *
 * Content does not depend on `@mortgage/pod-runtime`. What this file needs from it comes in by
 * injection (`podFetch`, `note`, the agent context) or is typed structurally (the seed), so the
 * apps hand the runtime's own functions in and nothing here imports the runtime.
 *
 * How the world acts as each pod owner:
 *
 * - **The page's own organisation** (`actsAs`): the runtime's `podFetch`, which the runtime marks
 *   with the page's identity.
 * - **Any other owner**: a plain `fetch` that declares the owner in the path-mode identity header
 *   (`x-demo-agent: <owner>`), marks the request as made by a back office
 *   (`x-demo-via-agent: 1`) and carries the tour tag. The journey needs this because a step can
 *   do more than one party's part in line: steps 2 to 4 include Alex's approval in the wallet,
 *   and step 9 includes the bureau's answer to the lender's order. design.md §d.5 accepts
 *   self-declared identity in path mode. The pod server still checks every request against the
 *   access rules for the owner named.
 *
 *   This works only when the service worker serves `/pods/**` (path mode). In the dedicated-worker
 *   fallback the page's `fetch` never reaches the pods, and in host mode the bridge sets identity
 *   from the page's origin and ignores the header. In those modes a cross-owner action has to run
 *   in that organisation's agent instead (lane H1).
 *
 * Keys: each organisation's Ed25519 key is created in the visitor's browser the first time it is
 * needed, as a non-extractable WebCrypto key, and kept in one IndexedDB database
 * (`mortgage-demo-keys`, store `keys`, keyed by pod owner) that every app on the origin shares.
 * Nothing signed ships in the bundle.
 *
 * Seed: `mortgageSeed()` returns the function `configure({ seed })` takes. It is `seedRequests()`
 * followed by `firstRun()` (each issuer publishes its key and status list; Alder Bank signs the
 * identity credential). `firstRun` runs against a recording world, so its writes are captured as
 * seed requests and applied by the runtime as each pod's owner. Every app passes the same seed:
 * whichever page starts the runtime first seeds the pods for all of them.
 */

// The pinned @jeswr/solid-vc build uses the Buffer global (status lists, signing). Install the
// stand-in before anything here can reach it; vite aliases for its Node imports come from
// `@mortgage/content/vite`.
import "@mortgage/vc-kit/browser/buffer";

import { createDemoCalendar, type DemoCalendar } from "@mortgage/demo-kit/calendar";
import type { AppNote } from "@mortgage/demo-kit/contracts";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import type { KeyPair } from "@mortgage/vc-kit";
import { keyId } from "./issuers.js";
import { firstRun, seedRequests } from "./seed.js";
import { podUrl, type World } from "./world.js";

// --- The tour tag --------------------------------------------------------------------------------

/** The tour step later requests belong to (`PodEvent.tour`). */
export interface TourContext {
  readonly demo: string;
  readonly step: string;
}

let tourContext: TourContext | null = null;

/** The tour step recorded by {@link trackTourContext}, or `null` outside the tour. */
export function currentTourContext(): TourContext | null {
  return tourContext;
}

/**
 * Wrap the runtime's `setTourContext` so cross-owner requests carry the same tour tag as the
 * runtime's own. Pass the result to `mountDemo({ runtime: { setTourContext } })`.
 */
export function trackTourContext(
  set: (ctx: TourContext | null) => void,
): (ctx: TourContext | null) => void {
  return (ctx) => {
    set(ctx);
    tourContext = ctx === null ? null : { demo: ctx.demo, step: ctx.step };
  };
}

// --- Keys ----------------------------------------------------------------------------------------

/** Where organisations' signing keys are kept. */
export interface KeyStore {
  get(owner: PodOwner): Promise<KeyPair | undefined>;
  /** Store `key` unless a key is already stored for `owner`. Returns the stored key. */
  add(owner: PodOwner, key: KeyPair): Promise<KeyPair>;
}

export const KEY_DATABASE = "mortgage-demo-keys";
export const KEY_OBJECT_STORE = "keys";

function promised<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Keys in the origin's shared IndexedDB. A `CryptoKey` is stored by structured clone, so a
 * non-extractable key stays non-extractable. `add` uses `IDBObjectStore.add`, which fails when the
 * owner already has a key: two tabs that create a key at once end up using the same one.
 */
export function indexedDbKeyStore(factory: IDBFactory = globalThis.indexedDB): KeyStore {
  let database: Promise<IDBDatabase> | undefined;
  const open = () => {
    database ??= new Promise((resolve, reject) => {
      const request = factory.open(KEY_DATABASE, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(KEY_OBJECT_STORE)) {
          request.result.createObjectStore(KEY_OBJECT_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.catch(() => {
      database = undefined;
    });
    return database;
  };
  const get = async (owner: PodOwner): Promise<KeyPair | undefined> => {
    const db = await open();
    return promised<KeyPair | undefined>(
      db.transaction(KEY_OBJECT_STORE, "readonly").objectStore(KEY_OBJECT_STORE).get(owner),
    );
  };
  return {
    async add(owner, key) {
      const db = await open();
      try {
        await promised(
          db
            .transaction(KEY_OBJECT_STORE, "readwrite")
            .objectStore(KEY_OBJECT_STORE)
            .add(key, owner),
        );
        return key;
      } catch {
        const stored = await get(owner);
        if (stored === undefined) throw new Error(`could not store the signing key of ${owner}`);
        return stored;
      }
    },
    get,
  };
}

/** Keys in memory, for tests and for pages without IndexedDB. */
export function memoryKeyStore(): KeyStore {
  const keys = new Map<PodOwner, KeyPair>();
  return {
    async add(owner, key) {
      const stored = keys.get(owner);
      if (stored !== undefined) return stored;
      keys.set(owner, key);
      return key;
    },
    async get(owner) {
      return keys.get(owner);
    },
  };
}

/** A new Ed25519 key pair whose private key cannot be exported. */
export async function createSigningKey(verificationMethod: string): Promise<KeyPair> {
  const pair = (await globalThis.crypto.subtle.generateKey({ name: "Ed25519" }, false, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  return { privateKey: pair.privateKey, publicKey: pair.publicKey, verificationMethod };
}

/** `keyFor`: the owner's stored key, created on first use. */
export function keyRing(podOrigin: string, store: KeyStore): (owner: PodOwner) => Promise<KeyPair> {
  const pending = new Map<PodOwner, Promise<KeyPair>>();
  return (owner) => {
    let key = pending.get(owner);
    if (key === undefined) {
      key = (async () =>
        (await store.get(owner)) ??
        store.add(owner, await createSigningKey(keyId({ podOrigin }, owner))))();
      pending.set(owner, key);
      key.catch(() => pending.delete(owner));
    }
    return key;
  };
}

let defaultStore: KeyStore | undefined;
const sharedKeyStore = () => {
  defaultStore ??= indexedDbKeyStore();
  return defaultStore;
};

// --- The world -----------------------------------------------------------------------------------

/** The path-mode request headers of the pod runtime (`packages/pod-runtime/src/protocol.ts`). */
export const PATH_MODE_HEADERS = Object.freeze({
  agent: "x-demo-agent",
  tour: "x-demo-tour",
  viaAgent: "x-demo-via-agent",
});

export interface BrowserWorldOptions {
  /** The pod owner the page (or agent) acts as: the registry's `actsAs`. */
  readonly actsAs: PodOwner;
  /** A fetch acting as `actsAs`: the runtime's `podFetch`, or an agent's `ctx.podFetch`. */
  readonly podFetch: typeof fetch;
  /** The Lens "app said" channel: the runtime's `note`. Default: dropped. */
  readonly note?: (note: AppNote) => void;
  /** The simulated day the action happens on. Default 1. */
  readonly day?: number;
  /** Day 1 of the demo calendar (`RuntimeInfo.dayOne`). Default: the calendar's own default. */
  readonly dayOne?: string;
  /** Where the pods live. Default: this page's origin (path mode). */
  readonly podOrigin?: string;
  /** The fetch used for other owners. Default `globalThis.fetch`. */
  readonly fetch?: typeof fetch;
  /** Where keys are kept. Default: the shared IndexedDB store. */
  readonly keys?: KeyStore;
  /** The tour tag for cross-owner requests. Default: {@link currentTourContext}. */
  readonly tour?: () => TourContext | null;
}

/** A fetch that declares `owner` in the path-mode identity header. */
export function crossOwnerFetch(
  owner: PodOwner,
  base: typeof fetch = globalThis.fetch.bind(globalThis),
  tour: () => TourContext | null = currentTourContext,
): typeof fetch {
  return (input, init) => {
    const request = new Request(input, init);
    const headers = new Headers(request.headers);
    for (const name of [...headers.keys()]) if (name.startsWith("x-demo-")) headers.delete(name);
    headers.set(PATH_MODE_HEADERS.agent, owner);
    headers.set(PATH_MODE_HEADERS.viaAgent, "1");
    const context = tour();
    if (context !== null) headers.set(PATH_MODE_HEADERS.tour, `${context.demo}:${context.step}`);
    return base(new Request(request, { headers }));
  };
}

/** A `World` for a page or an agent in the browser. */
export function createBrowserWorld(options: BrowserWorldOptions): World {
  const podOrigin = options.podOrigin ?? globalThis.location.origin;
  const calendar: DemoCalendar = createDemoCalendar(options.dayOne);
  const base = options.fetch ?? globalThis.fetch.bind(globalThis);
  const tour = options.tour ?? currentTourContext;
  const keyFor = keyRing(podOrigin, options.keys ?? sharedKeyStore());
  const fetchers = new Map<PodOwner, typeof fetch>([[options.actsAs, options.podFetch]]);
  return {
    calendar,
    day: options.day ?? 1,
    fetchAs(owner) {
      let fetcher = fetchers.get(owner);
      if (fetcher === undefined) {
        fetcher = crossOwnerFetch(owner, base, tour);
        fetchers.set(owner, fetcher);
      }
      return fetcher;
    },
    keyFor,
    note: options.note ?? (() => undefined),
    podOrigin,
  };
}

/** What an agent handler's context (`@mortgage/pod-runtime/agents`) offers, structurally. */
export interface AgentContextLike {
  readonly owner: PodOwner;
  readonly podFetch: typeof fetch;
  podUrl(owner: PodOwner, path?: string): string;
  /** Demo-calendar ISO time of the event being handled. */
  now(): string;
  note(note: AppNote): void;
}

/**
 * The world an agent handler acts in: as its own organisation through `ctx.podFetch`, on the
 * demo day of the event it is handling.
 */
export function agentWorld(
  ctx: AgentContextLike,
  options: Omit<BrowserWorldOptions, "actsAs" | "podFetch" | "note" | "podOrigin"> = {},
): World {
  const podOrigin = new URL(ctx.podUrl(ctx.owner, "")).origin;
  const calendar = createDemoCalendar(options.dayOne);
  const now = ctx.now();
  const day = options.day ?? Math.max(1, calendar.dayOf(now));
  return createBrowserWorld({
    ...options,
    actsAs: ctx.owner,
    day,
    note: (note) => ctx.note(note),
    podFetch: ctx.podFetch,
    podOrigin,
  });
}

// --- The seed ------------------------------------------------------------------------------------

/** The part of the runtime's seed context the seed reads. */
export interface SeedContextLike {
  readonly origin: string;
}

/** A seed request, structurally the runtime's `SeedRequest`. */
export interface BrowserSeedRequest {
  readonly pod: PodOwner;
  readonly method: "PUT";
  /** Path inside the pod, with a leading slash. */
  readonly path: string;
  readonly contentType: string;
  readonly body: string;
}

export interface MortgageSeedOptions {
  readonly keys?: KeyStore;
  /** Day 1 of the demo calendar. Default: the calendar's own default (the runtime's too). */
  readonly dayOne?: string;
}

const bodyText = async (body: BodyInit | null | undefined): Promise<string> =>
  body === undefined || body === null ? "" : new Response(body).text();

/**
 * A world whose writes are recorded, not sent. Each owner may only PUT into its own pod, which is
 * what a seed request is; anything else throws, so a change to `firstRun` that needs a read or a
 * cross-pod write fails loudly instead of seeding something different.
 */
export function recordingWorld(
  podOrigin: string,
  calendar: DemoCalendar,
  keyFor: (owner: PodOwner) => Promise<KeyPair>,
): { world: World; requests: BrowserSeedRequest[] } {
  const requests: BrowserSeedRequest[] = [];
  const world: World = {
    calendar,
    day: 1,
    fetchAs: (owner) => async (input, init) => {
      const request = new Request(input, init);
      const root = podUrl({ podOrigin }, owner, "");
      if (request.method !== "PUT" || !request.url.startsWith(root)) {
        throw new Error(`the seed cannot record ${request.method} ${request.url} as ${owner}`);
      }
      requests.push({
        body: await bodyText(init?.body),
        contentType: request.headers.get("content-type") ?? "text/turtle",
        method: "PUT",
        path: `/${request.url.slice(root.length)}`,
        pod: owner,
      });
      return new Response(null, { status: 201 });
    },
    keyFor,
    note: () => undefined,
    podOrigin,
  };
  return { requests, world };
}

/** Every pod's starting state, signed with keys created now. Pass it to `configure({ seed })`. */
export function mortgageSeed(
  options: MortgageSeedOptions = {},
): (context: SeedContextLike) => Promise<BrowserSeedRequest[]> {
  return async (context) => {
    const calendar = createDemoCalendar(options.dayOne);
    const podOrigin = context.origin;
    const requests: BrowserSeedRequest[] = [...(await seedRequests({ calendar, podOrigin }))];
    const recorder = recordingWorld(
      podOrigin,
      calendar,
      keyRing(podOrigin, options.keys ?? sharedKeyStore()),
    );
    await firstRun(recorder.world);
    return [...requests, ...recorder.requests];
  };
}
