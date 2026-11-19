// AUTHORED-BY Claude Opus 5.5
/**
 * The transport-agnostic pod host (design.md §d.2): one wasm `SolidServer` per pod at
 * `<origin>/pods/<owner>/`, every request checked by the pod server's own WAC with the caller's
 * WebID as `authenticatedWebid`.
 *
 * What the host adds around the wasm, each from a measured 0.1.8 behaviour (README, "Findings"):
 *
 * - Dispatch is serialised per wasm MODULE (all pods share one), so a trap can be attributed to
 *   the request in flight.
 * - Bodies are size- and nesting-checked before dispatch (`guard.ts`); the known trap trigger never
 *   reaches the wasm.
 * - A trap does not reject `handleRequest`: it surfaces as an uncaught error and the promise never
 *   settles, and it poisons the whole module. The host races each call against an uncaught-error
 *   signal and a watchdog; on a trap it answers 503, loads a FRESH module and restores every pod
 *   from its last snapshot.
 * - State is one snapshot per pod (`SolidServer.withSnapshot` / `snapshot()`), persisted after each
 *   request that changed it, so nothing is lost to a trap or a stopped worker. No journal replay.
 * - An unknown or missing identity is passed as `undefined` (anonymous), never `""` (which the wasm
 *   treats as an authenticated agent).
 * - Writes to ACL resources must keep the pod owner's `acl:Control`; PATCH on an ACL and deleting the
 *   root ACL are refused, and a non-RDF ACL is refused (the wasm would store it and deny everyone).
 */
import type {
  AccessMode,
  AccessRule,
  AppNote,
  LensEntry,
  PodEvent,
} from "@mortgage/demo-kit/contracts";
import { type PodOwner, webidFor } from "@mortgage/demo-kit/registry";
import { DataFactory, type Store } from "n3";
import {
  aclDocument,
  aclTarget,
  diffRules,
  isAclPath,
  matchingAuthorization,
  ownerKeepsControl,
  PUBLIC,
  rulesOf,
} from "../acl.js";
import type { Glue } from "../generated/glue-factory.js";
import { parseToStore, toTurtle } from "../rdf.js";
import { describe, labelOf } from "./describe.js";
import { checkBody } from "./guard.js";
import { memoryStorage, type PodStorage } from "./storage.js";

type WasmPod = InstanceType<Glue["SolidServer"]>;

/** One request of a seed: made as the pod's owner, with no events. */
export interface SeedRequest {
  pod: PodOwner;
  method: "PUT" | "POST" | "PATCH" | "DELETE";
  /** Path inside the pod, e.g. `/documents/payslip-1`. */
  path: string;
  contentType?: string;
  body?: string | Uint8Array;
  headers?: Record<string, string>;
}

export interface SeedContext {
  origin: string;
  podUrl(owner: PodOwner, path: string): string;
  webid(owner: PodOwner): string;
}

export type Seed =
  | readonly SeedRequest[]
  | ((context: SeedContext) => readonly SeedRequest[] | Promise<readonly SeedRequest[]>);

/** Who is making a request, as the transport established it. */
export interface DispatchContext {
  /** An owner (`bank`) or an identity key mapped by `identities` (an app slug). Unknown → anonymous. */
  identity?: string | null;
  /** True when an organisation agent (back office) made the request. */
  viaAgent?: boolean;
  tour?: { demo: string; step: string };
}

export interface PodHostOptions {
  /** The pod origin, e.g. `https://example.test`. Pods live at `<origin>/pods/<owner>/`. */
  origin: string;
  owners: readonly PodOwner[];
  /** Extra identity keys (app slugs) and the owner each acts as. Owners always map to themselves. */
  identities?: Readonly<Record<string, PodOwner>>;
  /** Returns fresh, initialised bindings with a NEW wasm instance on every call. */
  loadWasm: () => Glue;
  storage?: PodStorage;
  seed?: Seed;
  /** Demo-calendar ISO time for `PodEvent.at`. Default: the real clock. */
  clock?: () => string;
  limits?: { maxBodyBytes?: number; maxNesting?: number; dispatchTimeoutMs?: number };
  /**
   * Subscribe to uncaught errors (where a wasm trap surfaces). The listener returns true when it
   * claimed the error for an in-flight dispatch. Default: the global `error` event, where one exists.
   */
  watchUncaught?: (listener: (error: unknown) => boolean) => () => void;
}

export interface HostInfo {
  origin: string;
  owners: PodOwner[];
  seeded: boolean;
  /** How many times the wasm module was replaced after a trap. */
  recoveries: number;
}

export type HostMessage = { type: "event"; entry: LensEntry } | { type: "reset" };

export interface PodHost {
  /** Resolves when every pod is up (restored, or seeded when a seed was given). */
  readonly ready: Promise<void>;
  /** Answer one request addressed to `<origin>/pods/**`. */
  handle(request: Request, context?: DispatchContext): Promise<Response>;
  /** A fetch that acts as `identity` (relative URLs resolve against the origin). */
  fetchAs(identity: string | null, options?: Omit<DispatchContext, "identity">): typeof fetch;
  /** Apply a seed once; false when the pods were already seeded. */
  applySeed(seed: Seed): Promise<boolean>;
  /** Return every pod to its seed and clear the event log. */
  reset(): Promise<void>;
  /** Record an "app said" Lens entry. */
  note(note: AppNote): Promise<LensEntry>;
  events(): Promise<LensEntry[]>;
  subscribe(listener: (message: HostMessage) => void): () => void;
  /** Replace the identity map (app slug → owner), e.g. when a page sends the registry. */
  setIdentities(identities: Readonly<Record<string, PodOwner>>): Promise<void>;
  info(): Promise<HostInfo>;
  webid(owner: PodOwner): string;
  podUrl(owner: PodOwner, path?: string): string;
}

class TrapError extends Error {}

interface BufferedRequest {
  method: string;
  url: string;
  headers: Headers;
  body: Uint8Array;
}

const MUTATING = new Set(["PUT", "POST", "PATCH", "DELETE"]);
const RDF_ACL_TYPES = new Set(["text/turtle", "application/ld+json"]);
const FOAF = "http://xmlns.com/foaf/0.1/";
const PIM = "http://www.w3.org/ns/pim/space#";

function isTrap(error: unknown): boolean {
  const ns = (globalThis as { WebAssembly?: { RuntimeError?: new () => Error } }).WebAssembly;
  return (
    error instanceof TrapError ||
    (ns?.RuntimeError !== undefined && error instanceof ns.RuntimeError)
  );
}

function defaultWatch(listener: (error: unknown) => boolean): () => void {
  const scope = globalThis as unknown as {
    addEventListener?: (
      type: string,
      l: (e: { error?: unknown; message?: string }) => void,
    ) => void;
    removeEventListener?: (
      type: string,
      l: (e: { error?: unknown; message?: string }) => void,
    ) => void;
    process?: unknown;
  };
  if (typeof scope.addEventListener !== "function" || scope.process !== undefined) return () => {};
  const onError = (event: { error?: unknown; message?: string }) => {
    listener(event.error ?? new TrapError(event.message ?? "uncaught error"));
  };
  scope.addEventListener("error", onError);
  return () => scope.removeEventListener?.("error", onError);
}

function text(status: number, message: string): Response {
  return new Response(`${message}\n`, {
    headers: { "content-type": "text/plain; charset=utf-8" },
    status,
  });
}

function flatHeaders(headers: Headers): string[] {
  const out: string[] = [];
  headers.forEach((value, name) => {
    if (!name.startsWith("x-demo-")) out.push(name, value);
  });
  return out;
}

interface WasmResult {
  status: number;
  headers: string[];
  body: Uint8Array;
}

function header(result: WasmResult, name: string): string | null {
  for (let i = 0; i < result.headers.length; i += 2) {
    if (result.headers[i]?.toLowerCase() === name) return result.headers[i + 1] ?? null;
  }
  return null;
}

function toResponse(result: WasmResult, method: string): Response {
  const headers = new Headers();
  for (let i = 0; i < result.headers.length; i += 2) {
    headers.append(result.headers[i] ?? "", result.headers[i + 1] ?? "");
  }
  const nullBody = method === "HEAD" || result.status === 204 || result.status === 304;
  return new Response(nullBody ? null : (result.body as BodyInit), {
    headers,
    status: result.status,
  });
}

function modesFor(method: string): AccessMode[] {
  if (method === "GET" || method === "HEAD") return ["Read"];
  if (method === "POST" || method === "PATCH") return ["Append", "Write"];
  return ["Write"];
}

function kindFor(method: string, status: number): PodEvent["kind"] {
  if (status === 401 || status === 403) return "denied";
  if (method === "GET" || method === "HEAD") return "read";
  if (method === "DELETE") return "delete";
  return "write";
}

function parentOf(path: string): string | undefined {
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path;
  if (trimmed === "") return undefined;
  return trimmed.slice(0, trimmed.lastIndexOf("/") + 1);
}

export function createPodHost(options: PodHostOptions): PodHost {
  const origin = new URL(options.origin).origin;
  const owners = [...new Set(options.owners)];
  const storage = options.storage ?? memoryStorage();
  const clock = options.clock ?? (() => new Date().toISOString());
  const timeoutMs = options.limits?.dispatchTimeoutMs ?? 15_000;
  const listeners = new Set<(message: HostMessage) => void>();
  let identities: Record<string, PodOwner> = { ...(options.identities ?? {}) };

  const base = (owner: PodOwner) => `${origin}/pods/${owner}/`;
  const webid = (owner: PodOwner) => webidFor(owner, origin);
  const podUrl = (owner: PodOwner, path = "") => `${base(owner)}${path.replace(/^\/+/, "")}`;
  const seedContext: SeedContext = { origin, podUrl, webid };

  let glue: Glue | undefined;
  const pods = new Map<PodOwner, WasmPod>();
  let recoveries = 0;
  let seeded = false;
  let nextId = 1;

  // ---- serialisation: one queue per wasm module ----
  let queue: Promise<unknown> = Promise.resolve();
  function serial<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task);
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  // ---- trap detection ----
  let pendingTrap: ((error: unknown) => void) | undefined;
  (options.watchUncaught ?? defaultWatch)((error) => {
    if (pendingTrap === undefined) return false;
    pendingTrap(error);
    return true;
  });

  async function call(
    pod: WasmPod,
    method: string,
    path: string,
    headers: string[],
    body: Uint8Array,
    agent: string | undefined,
  ): Promise<WasmResult> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const signal = new Promise<never>((_, reject) => {
      pendingTrap = (error) => reject(new TrapError(String((error as Error)?.message ?? error)));
      timer = setTimeout(
        () => reject(new TrapError(`no answer within ${timeoutMs} ms`)),
        timeoutMs,
      );
    });
    try {
      const response = await Promise.race([
        pod.handleRequest(method, path, headers, body, agent),
        signal,
      ]);
      try {
        return {
          body: response.body.slice(),
          headers: Array.from(response.headers, String),
          status: response.status,
        };
      } finally {
        response.free();
      }
    } catch (error) {
      if (isTrap(error)) throw error instanceof TrapError ? error : new TrapError(String(error));
      throw error;
    } finally {
      pendingTrap = undefined;
      clearTimeout(timer);
    }
  }

  /** An internal request as the pod owner: no guard, no event, no persistence. */
  function asOwner(
    owner: PodOwner,
    method: string,
    path: string,
    contentType?: string,
    body = "",
  ): Promise<WasmResult> {
    const pod = pods.get(owner);
    if (pod === undefined) throw new Error(`no pod for ${owner}`);
    const headers = contentType === undefined ? [] : ["content-type", contentType];
    return call(pod, method, path, headers, new TextEncoder().encode(body), webid(owner));
  }

  async function persist(owner: PodOwner, kinds: Array<"current" | "seed">): Promise<void> {
    const bytes = pods.get(owner)?.snapshot();
    if (bytes === undefined) return;
    for (const kind of kinds) await storage.putSnapshot(owner, kind, bytes);
  }

  async function baseline(owner: PodOwner): Promise<void> {
    const me = webid(owner);
    const card = podUrl(owner, "profile/card");
    const steps: Array<[string, string]> = [
      ["/.acl", await aclDocument({ aclUrl: `${base(owner)}.acl`, owner: me })],
      [
        "/profile/card",
        await toTurtle(
          [
            DataFactory.quad(
              DataFactory.namedNode(card),
              DataFactory.namedNode(`${FOAF}primaryTopic`),
              DataFactory.namedNode(me),
            ),
            DataFactory.quad(
              DataFactory.namedNode(me),
              DataFactory.namedNode(`${PIM}storage`),
              DataFactory.namedNode(base(owner)),
            ),
          ],
          { foaf: FOAF, pim: PIM },
        ),
      ],
      [
        "/profile/card.acl",
        await aclDocument({
          aclUrl: `${card}.acl`,
          grants: [{ agent: PUBLIC, modes: ["Read"] }],
          owner: me,
        }),
      ],
    ];
    for (const [path, body] of steps) {
      const result = await asOwner(owner, "PUT", path, "text/turtle", body);
      if (result.status >= 300) throw new Error(`baseline ${owner}${path}: HTTP ${result.status}`);
    }
  }

  /** Fresh module and pods; restore from snapshots when `restore`, else empty baseline pods. */
  async function rebuild(source: "current" | "seed" | "none"): Promise<void> {
    glue = options.loadWasm();
    pods.clear();
    for (const owner of owners) {
      const bytes = source === "none" ? undefined : await storage.getSnapshot(owner, source);
      if (bytes !== undefined) {
        pods.set(owner, glue.SolidServer.withSnapshot(base(owner), webid(owner), bytes));
      } else {
        pods.set(owner, glue.SolidServer.withSnapshot(base(owner), webid(owner), new Uint8Array()));
        await baseline(owner);
      }
    }
  }

  // ---- ACL policy ----
  async function readAclRules(owner: PodOwner, aclPath: string): Promise<AccessRule[] | undefined> {
    const result = await asOwner(owner, "GET", aclPath);
    if (result.status !== 200) return undefined;
    const store = await parseToStore(
      new TextDecoder().decode(result.body),
      header(result, "content-type") ?? "text/turtle",
      podUrl(owner, aclPath),
    );
    return rulesOf(store, base(owner));
  }

  /** The rules in force for `target` (pod path) when it has no ACL of its own: the nearest ancestor's defaults. */
  async function inheritedRules(owner: PodOwner, target: string): Promise<AccessRule[]> {
    for (
      let container = parentOf(target);
      container !== undefined;
      container = parentOf(container)
    ) {
      const rules = await readAclRules(owner, `${container}.acl`);
      if (rules === undefined) continue;
      return rules
        .filter((r) => r.inherited && r.resource === container)
        .flatMap((r) => {
          const own: AccessRule = { ...r, inherited: false, resource: target };
          return target.endsWith("/") ? [own, { ...r, resource: target }] : [own];
        });
    }
    return [];
  }

  async function effectiveRules(owner: PodOwner, aclPath: string): Promise<AccessRule[]> {
    return (
      (await readAclRules(owner, aclPath)) ?? (await inheritedRules(owner, aclTarget(aclPath)))
    );
  }

  /** Refuse an ACL write that would break the runtime's invariant; `undefined` lets it through. */
  async function checkAclWrite(
    owner: PodOwner,
    method: string,
    path: string,
    body: Uint8Array,
    contentType: string | null,
  ): Promise<{ response?: Response; store?: Store }> {
    if (method === "PATCH") {
      return {
        response: text(
          409,
          "ACL resources are replaced with PUT (use grantAccess or revokeAccess), not patched",
        ),
      };
    }
    if (method === "DELETE") {
      return path === "/.acl"
        ? { response: text(409, "the pod's root ACL cannot be deleted") }
        : {};
    }
    if (method !== "PUT") return {};
    const type = (contentType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
    if (!RDF_ACL_TYPES.has(type))
      return { response: text(415, "an ACL must be text/turtle or application/ld+json") };
    let store: Store;
    try {
      store = await parseToStore(new TextDecoder().decode(body), type, podUrl(owner, path));
    } catch {
      return { response: text(400, "the ACL is not valid RDF") };
    }
    if (!ownerKeepsControl(store, webid(owner), podUrl(owner, aclTarget(path)))) {
      return {
        response: text(
          409,
          "an ACL must keep acl:Control for the pod owner (acl:accessTo, and acl:default on a container)",
        ),
      };
    }
    return { store };
  }

  /** The IRI of the authorisation that let `agent` do this, if one names it. */
  async function findGrant(
    owner: PodOwner,
    agent: string,
    path: string,
    method: string,
  ): Promise<string | undefined> {
    const modes = modesFor(method);
    const target = path.split("?")[0] ?? path;
    for (
      let level: string | undefined = target, inherited = false;
      level !== undefined;
      level = parentOf(level), inherited = true
    ) {
      const aclPath = `${level}.acl`;
      const result = await asOwner(owner, "GET", aclPath);
      if (result.status !== 200) continue;
      const store = await parseToStore(
        new TextDecoder().decode(result.body),
        header(result, "content-type") ?? "text/turtle",
        podUrl(owner, aclPath),
      );
      return matchingAuthorization(store, {
        agent,
        inherited,
        modes,
        target: podUrl(owner, level),
      });
    }
    return undefined;
  }

  // ---- events ----
  async function emit(entry: LensEntry): Promise<void> {
    await storage.appendEvent(entry);
    await storage.putMeta("nextEventId", nextId);
    for (const listener of listeners) listener({ entry, type: "event" });
  }

  function resolveIdentity(identity: string | null | undefined): PodOwner | undefined {
    if (identity === null || identity === undefined || identity === "") return undefined;
    if ((owners as string[]).includes(identity)) return identity as PodOwner;
    return identities[identity];
  }

  async function dispatch(request: BufferedRequest, context: DispatchContext): Promise<Response> {
    const url = new URL(request.url);
    const match = /^\/pods\/([^/]+)(\/.*)?$/.exec(url.pathname);
    const owner = match?.[1] as PodOwner | undefined;
    if (url.origin !== origin || owner === undefined || !pods.has(owner))
      return text(404, "no such pod");
    const path = `${match?.[2] ?? "/"}${url.search}`;
    const podPath = match?.[2] ?? "/";
    const method = request.method;
    const body = request.body;
    const contentType = request.headers.get("content-type");
    const actorOwner = resolveIdentity(context.identity);
    const agent = actorOwner === undefined ? undefined : webid(actorOwner);

    const guard = MUTATING.has(method) ? checkBody(body, contentType, options.limits) : undefined;
    const aclWrite = MUTATING.has(method) && isAclPath(podPath);

    const pod = pods.get(owner) as WasmPod;
    const revision = pod.snapshotRevision();
    let response: Response;
    let result: WasmResult | undefined;
    let before: AccessRule[] | undefined;
    let written: Store | undefined;
    if (guard !== undefined) {
      response = text(guard.status, guard.message);
    } else {
      const policy = aclWrite ? await checkAclWrite(owner, method, podPath, body, contentType) : {};
      if (policy.response !== undefined) {
        response = policy.response;
      } else {
        written = policy.store;
        try {
          if (aclWrite) before = await effectiveRules(owner, podPath);
          result = await call(pod, method, path, flatHeaders(request.headers), body, agent);
          response = toResponse(result, method);
        } catch (error) {
          if (!isTrap(error)) throw error;
          recoveries += 1;
          await rebuild("current");
          response = text(
            503,
            "the pod server stopped and was restored from its last saved state; retry the request",
          );
        }
      }
    }

    const current = pods.get(owner);
    if (result !== undefined && current !== undefined && current.snapshotRevision() !== revision) {
      await persist(owner, ["current"]);
    }
    if (method !== "OPTIONS" && actorOwner !== undefined && agent !== undefined) {
      const event = await buildEvent({
        actorOwner,
        agent,
        before,
        body,
        contentType,
        context,
        method,
        owner,
        path,
        podPath,
        response,
        result,
        written,
      });
      await emit({ source: "pod", ...event });
    }
    return response;
  }

  async function buildEvent(input: {
    owner: PodOwner;
    actorOwner: PodOwner;
    agent: string;
    method: string;
    path: string;
    podPath: string;
    body: Uint8Array;
    contentType: string | null;
    response: Response;
    result: WasmResult | undefined;
    before: AccessRule[] | undefined;
    written: Store | undefined;
    context: DispatchContext;
  }): Promise<PodEvent> {
    const { owner, method, podPath, response, result } = input;
    const status = response.status;
    const event: PodEvent = {
      actor: {
        org: input.actorOwner,
        viaAgent: input.context.viaAgent === true,
        webid: input.agent,
      },
      at: clock(),
      id: nextId++,
      kind: kindFor(method, status),
      method,
      path: podPath,
      pod: owner,
      status,
    };
    if (input.context.tour !== undefined) event.tour = input.context.tour;
    const ok = status >= 200 && status < 300;
    if (
      result !== undefined &&
      ok &&
      input.before !== undefined &&
      (method === "PUT" || method === "DELETE")
    ) {
      const after =
        input.written === undefined
          ? await inheritedRules(owner, aclTarget(podPath))
          : rulesOf(input.written, base(owner));
      const acl = diffRules(input.before, after);
      event.acl = acl;
      event.kind = acl.revoked.length > 0 && acl.granted.length === 0 ? "revoke" : "grant";
      event.resource = { ...labelOf(aclTarget(podPath)), types: [] };
      return event;
    }
    if (result === undefined || !ok) {
      if (status !== 404) event.resource = { ...labelOf(podPath), types: [] };
      return event;
    }
    const location = header(result, "location");
    const resourceUrl = method === "POST" && location !== null ? location : podUrl(owner, podPath);
    const resourcePath = resourceUrl.startsWith(base(owner))
      ? `/${resourceUrl.slice(base(owner).length)}`
      : podPath;
    if (method === "POST") event.path = resourcePath;
    const source =
      method === "GET"
        ? result.body
        : MUTATING.has(method) && method !== "DELETE"
          ? input.body
          : undefined;
    const type = method === "GET" ? header(result, "content-type") : input.contentType;
    event.resource = await describe(resourcePath, resourceUrl, source, type);
    if (input.actorOwner !== owner) {
      const grant = await findGrant(
        owner,
        input.agent,
        method === "POST" ? podPath : resourcePath,
        method,
      );
      if (grant !== undefined) event.grant = grant;
    }
    return event;
  }

  // ---- seeding and reset ----
  async function runSeed(seed: Seed): Promise<void> {
    const requests = typeof seed === "function" ? await seed(seedContext) : seed;
    await rebuild("none");
    for (const step of requests) {
      if (!pods.has(step.pod)) throw new Error(`seed: no pod ${step.pod}`);
      const body =
        typeof step.body === "string"
          ? new TextEncoder().encode(step.body)
          : (step.body ?? new Uint8Array());
      if (isAclPath(step.path)) {
        const policy = await checkAclWrite(
          step.pod,
          step.method,
          step.path,
          body,
          step.contentType ?? null,
        );
        if (policy.response !== undefined) {
          throw new Error(
            `seed ${step.method} ${step.pod}${step.path}: ${(await policy.response.text()).trim()}`,
          );
        }
      }
      const guard = checkBody(body, step.contentType ?? null, options.limits);
      if (guard !== undefined) throw new Error(`seed ${step.pod}${step.path}: ${guard.message}`);
      const headers = Object.entries({
        ...(step.headers ?? {}),
        ...(step.contentType ? { "content-type": step.contentType } : {}),
      }).flat();
      const result = await call(
        pods.get(step.pod) as WasmPod,
        step.method,
        step.path,
        headers,
        body,
        webid(step.pod),
      );
      if (result.status >= 300) {
        throw new Error(
          `seed ${step.method} ${step.pod}${step.path}: HTTP ${result.status} ${new TextDecoder().decode(result.body).trim()}`,
        );
      }
    }
    for (const owner of owners) await persist(owner, ["current", "seed"]);
    seeded = true;
    await storage.putMeta("seeded", true);
  }

  async function start(): Promise<void> {
    nextId = (await storage.getMeta<number>("nextEventId")) ?? 1;
    identities = {
      ...((await storage.getMeta<Record<string, PodOwner>>("identities")) ?? {}),
      ...identities,
    };
    seeded = (await storage.getMeta<boolean>("seeded")) === true;
    if (seeded) {
      await rebuild("current");
    } else if (options.seed !== undefined) {
      await runSeed(options.seed);
    } else {
      await rebuild("none");
      for (const owner of owners) await persist(owner, ["current"]);
    }
  }

  const ready = serial(start);

  const host: PodHost = {
    applySeed: (seed) =>
      serial(async () => {
        await ready;
        if (seeded) return false;
        await runSeed(seed);
        return true;
      }),
    events: () => storage.events(),
    fetchAs(identity, extra = {}) {
      return async (input, init) => {
        const request = new Request(
          typeof input === "string" || input instanceof URL ? new URL(input, origin) : input,
          init,
        );
        return host.handle(request, { ...extra, identity });
      };
    },
    async handle(request, context = {}) {
      await ready;
      // Read the body before taking the queue so a slow upload never blocks other pods. A plain
      // Headers copy keeps `Origin` (a Request would drop it), which acl:origin rules need.
      const method = request.method.toUpperCase();
      const buffered: BufferedRequest = {
        body:
          method === "GET" || method === "HEAD"
            ? new Uint8Array()
            : new Uint8Array(await request.arrayBuffer()),
        headers: new Headers(request.headers),
        method,
        url: request.url,
      };
      return serial(() => dispatch(buffered, context));
    },
    info: async () => {
      await ready;
      return { origin, owners: [...owners], recoveries, seeded };
    },
    note: (note) =>
      serial(async () => {
        await ready;
        const entry: LensEntry = { ...note, at: clock(), id: nextId++, source: "app" };
        await emit(entry);
        return entry;
      }),
    podUrl,
    ready,
    reset: () =>
      serial(async () => {
        await ready;
        const hasSeed = (await storage.getSnapshot(owners[0] as PodOwner, "seed")) !== undefined;
        await rebuild(hasSeed ? "seed" : "none");
        for (const owner of owners) await persist(owner, ["current"]);
        await storage.clearEvents();
        nextId = 1;
        await storage.putMeta("nextEventId", nextId);
        for (const listener of listeners) listener({ type: "reset" });
      }),
    setIdentities: async (map) => {
      identities = { ...map };
      await storage.putMeta("identities", identities);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    webid,
  };
  return host;
}
