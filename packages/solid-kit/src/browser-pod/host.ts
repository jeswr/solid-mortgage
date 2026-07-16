/**
 * Mode-1 in-browser pod runtime — the WORKER-SIDE host (sm-23, decisions 0011 + 0013):
 * one seeded, WRITABLE borrower pod per visitor, served by the sparq-lws-wasm `SolidServer`
 * (`@jeswr/solid-server/wasm`, the `--target web` artifact the vendored tarball ships — see
 * `vendor/PROVENANCE.md`) inside a SharedWorker, with a dedicated-worker fallback.
 *
 * This module runs inside the worker. It must stay browser-safe (no `node:` imports) and is
 * the ONLY browser-pod module that touches wasm — the page-side client (`client.ts`) never
 * pulls the glue or the binary into the app bundle.
 *
 * Dispatch contract (mirrors the Node host's `attachTrapRecoveryHandler`, which upstream
 * sparq-org/sparq#2323 will factor into `createSolidPod().dispatch()` — swap to that
 * primitive when it lands):
 * - requests are serialized through a queue (the wasm pod is single-threaded);
 * - a body over {@link MAX_POD_BODY_BYTES} answers 413 without crossing the wasm boundary;
 * - a wasm trap (`WebAssembly.RuntimeError`) answers 503, frees the poisoned instance, and
 *   the NEXT request re-provisions a fresh pod — reseeded from the same fixtures, because a
 *   trap wipes in-memory state (deployed-infra.md §3: "trap-recycle-wipes-state ⇒ reseed").
 */
import initWasm, { type InitInput, SolidServer } from "@jeswr/solid-server/wasm";
import { type ResourceFixture, seedPod } from "../seed.js";
import {
  createPodFetch,
  POD_PROTOCOL,
  type PodBootErrorMessage,
  type PodFailureMessage,
  type PodMessagePortLike,
  type PodReadyMessage,
  type PodRequestPayload,
  type PodResponseMessage,
  type PodResponsePayload,
  parsePodClientMessage,
} from "./protocol.js";

/**
 * Host-side request-body ceiling: parity with the Node host's `MAX_BODY_BYTES`
 * (`@jeswr/solid-server/http`, not importable here — it pulls `node:buffer`).
 */
export const MAX_POD_BODY_BYTES = 2 * 1024 * 1024;

/** The 503 the trap-recycle contract answers the trapping request with (Node-host parity). */
const TRAP_RESPONSE_BODY = "server temporarily unavailable (wasm trap)\n";

/**
 * The structural surface of one wasm pod instance (`SolidServer` + `LwsResponse`), kept
 * structural so the trap-recovery test can wrap a REAL instance with an injected trap.
 */
export interface PodServerInstance {
  handleRequest(
    method: string,
    path: string,
    headers: string[],
    body: Uint8Array,
    authenticatedWebid?: string | null,
  ): Promise<{
    readonly status: number;
    readonly headers: string[];
    readonly body: Uint8Array;
    free?(): void;
  }>;
  free?(): void;
}

export interface CreateBrowserPodOptions {
  /**
   * The pod's VIRTUAL origin (e.g. the persona's `https://alex.pod.example`): requests are
   * answered in-worker and never reach the network, so this never resolves in DNS. Must be
   * an http(s) origin without credentials, path, query, or fragment (Node-host parity).
   */
  podBaseUrl: string;
  /**
   * Owner WebID. Mode 1 is fixed-owner: EVERY request acts as this WebID (the per-visitor
   * pod is theirs by construction), which is exactly why login is SIMULATED and the
   * decision-0011 disclosure is mandatory on the client side.
   */
  ownerWebId: string;
  /** Persona display name, surfaced to clients in the ready handshake. */
  displayName?: string;
  /**
   * Resources seeded into the pod on provision AND after every trap recycle. Pass a factory
   * for fixtures that need the (already-validated) base/owner.
   */
  seedFixtures?:
    | readonly ResourceFixture[]
    | ((context: { podBaseUrl: string; ownerWebId: string }) => readonly ResourceFixture[]);
  /**
   * Wasm module source forwarded to the glue's init (bytes/URL/Response/Module). Default:
   * the glue resolves `sparq_lws_wasm_bg.wasm` next to itself (`new URL(..., import.meta.url)`
   * — bundlers that understand asset URLs emit the binary automatically). Node tests pass
   * the bytes. The wasm is initialised once per JS realm; later inputs are ignored.
   */
  wasm?: InitInput | Promise<InitInput>;
  /** Request-body ceiling. Defaults to {@link MAX_POD_BODY_BYTES}. */
  maxBodyBytes?: number;
  /**
   * TEST SEAM: the pod factory, called at provision and after each trap recycle. Defaults
   * to the real wasm `SolidServer`. Tests wrap the real instance to inject traps; when a
   * custom factory needs no wasm at all, omit `wasm` and init is skipped.
   */
  createPod?: (podBaseUrl: string, ownerWebId: string) => PodServerInstance;
}

/** The worker-side pod host: payload dispatch plus its own fetch-shaped view. */
export interface BrowserPodHost {
  readonly podBaseUrl: string;
  readonly ownerWebId: string;
  readonly displayName: string | undefined;
  /** Resolves once the pod is provisioned and seeded; rejects when boot failed. */
  readonly ready: Promise<void>;
  /** Serialized request dispatch (the #2323 dispatcher shape). */
  dispatch(payload: PodRequestPayload): Promise<PodResponsePayload>;
  /** Dispatch-backed fetch on the pod's virtual origin (seeding used it; tests may too). */
  readonly podFetch: typeof fetch;
  /** Free the wasm instance and refuse further dispatches. */
  dispose(): void;
}

/**
 * True for a wasm trap — the engine's `WebAssembly.RuntimeError` after a Rust panic or an
 * allocation failure. A trapped instance is permanently poisoned and must be replaced.
 * (Conservative check, same as the Node host's `isWasmTrap`; not importable here because
 * the package root pulls `node:` modules.)
 */
export function isWasmTrap(error: unknown): boolean {
  // Read off globalThis: the ES2023 lib (no DOM/WebWorker) does not declare WebAssembly.
  const wasmNamespace = (globalThis as { WebAssembly?: { RuntimeError?: unknown } }).WebAssembly;
  const runtimeError = wasmNamespace?.RuntimeError;
  return typeof runtimeError === "function" && error instanceof runtimeError;
}

/** Mirror of the Node host's base-URL normalization: origin only, http(s), no credentials. */
function validatePodBaseUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError("podBaseUrl must use http or https");
  }
  if (url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") {
    throw new TypeError("podBaseUrl must be an origin without credentials, query, or fragment");
  }
  if (url.pathname !== "/") {
    throw new TypeError("podBaseUrl must be an origin without a path");
  }
  return url.origin;
}

function validateOwnerWebId(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError("ownerWebId must be an http(s) WebID");
  }
  if (url.username !== "" || url.password !== "") {
    throw new TypeError("ownerWebId must not carry userinfo credentials");
  }
  return value;
}

/**
 * One wasm init per JS realm (the glue re-instantiates on every call, which would orphan
 * live `SolidServer`s — same singleton discipline as the Node host). A failed init resets
 * so a later provision can retry.
 */
let wasmReady: Promise<void> | undefined;
function ensureWasm(input?: InitInput | Promise<InitInput>): Promise<void> {
  if (wasmReady === undefined) {
    wasmReady = (async () => {
      await initWasm(input === undefined ? undefined : { module_or_path: input });
    })();
    wasmReady.catch(() => {
      wasmReady = undefined;
    });
  }
  return wasmReady;
}

function textResponse(status: number, text: string): PodResponsePayload {
  const body = new TextEncoder().encode(text);
  return {
    status,
    headers: ["content-type", "text/plain; charset=utf-8"],
    body: body.buffer as ArrayBuffer,
  };
}

/** Copy a wasm response into an OWNED, transfer-safe payload before freeing it. */
function copyPodResponse(response: {
  readonly status: number;
  readonly headers: string[];
  readonly body: Uint8Array;
  free?(): void;
}): PodResponsePayload {
  try {
    const headers = Array.from(response.headers, String);
    if (headers.length % 2 !== 0) {
      throw new TypeError("wasm response headers must contain name/value pairs");
    }
    const bytes = response.body;
    const owned =
      bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
        ? bytes
        : bytes.slice();
    return {
      status: Number(response.status),
      headers,
      body: owned.buffer as ArrayBuffer,
    };
  } finally {
    response.free?.();
  }
}

const noop = (): void => {};

/** Create the Mode-1 pod host: wasm init + provision + seed + serialized trap-recycling dispatch. */
export function createBrowserPod(options: CreateBrowserPodOptions): BrowserPodHost {
  const podBaseUrl = validatePodBaseUrl(options.podBaseUrl);
  const ownerWebId = validateOwnerWebId(options.ownerWebId);
  const maxBodyBytes = options.maxBodyBytes ?? MAX_POD_BODY_BYTES;
  const createPod =
    options.createPod ?? ((base: string, owner: string) => new SolidServer(base, owner));
  // A custom factory with no wasm input runs wasm-free (pure-unit tests); the default
  // factory always needs the module, and an explicit wasm input is always honoured.
  const needsWasm = options.createPod === undefined || options.wasm !== undefined;

  let pod: PodServerInstance | undefined;
  let disposed = false;
  let queue: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(turn: () => Promise<T>): Promise<T> => {
    const result = queue.then(turn);
    queue = result.then(noop, noop);
    return result;
  };

  async function handleWith(
    target: PodServerInstance,
    payload: PodRequestPayload,
  ): Promise<PodResponsePayload> {
    const url = new URL(payload.url);
    if (url.origin !== podBaseUrl) {
      throw new TypeError(`pod host serves ${podBaseUrl} only; refusing ${payload.url}`);
    }
    const body = payload.body === null ? new Uint8Array(0) : new Uint8Array(payload.body);
    if (body.byteLength > maxBodyBytes) {
      // Node-host parity: over-limit bodies never cross the wasm boundary.
      return textResponse(413, `request body exceeds ${maxBodyBytes} bytes\n`);
    }
    const response = await target.handleRequest(
      payload.method,
      `${url.pathname}${url.search}`,
      payload.headers,
      body,
      ownerWebId,
    );
    return copyPodResponse(response);
  }

  async function provisionPod(): Promise<PodServerInstance> {
    if (needsWasm) await ensureWasm(options.wasm);
    const fresh = createPod(podBaseUrl, ownerWebId);
    const fixtures =
      typeof options.seedFixtures === "function"
        ? options.seedFixtures({ podBaseUrl, ownerWebId })
        : options.seedFixtures;
    if (fixtures !== undefined && fixtures.length > 0) {
      // The seeder path (sm-4 `seedPod`) over a direct fetch view of THIS instance — the
      // queue turn provisioning us already holds the lock, so no re-entrant dispatch.
      const seedFetch = createPodFetch({
        dispatch: (payload) => handleWith(fresh, payload),
        podBaseUrl,
      });
      try {
        await seedPod(podBaseUrl, fixtures, { fetch: seedFetch, ownerWebid: ownerWebId });
      } catch (error) {
        fresh.free?.();
        throw error;
      }
    }
    return fresh;
  }

  function dispatch(payload: PodRequestPayload): Promise<PodResponsePayload> {
    return enqueue(async () => {
      if (disposed) throw new Error("browser pod host is disposed");
      pod ??= await provisionPod();
      const target = pod;
      try {
        return await handleWith(target, payload);
      } catch (error) {
        if (!isWasmTrap(error)) throw error;
        // Recycle contract: free the poisoned instance now; the NEXT dispatch re-provisions
        // (and reseeds) a fresh pod. The trapping request answers 503 (Node-host parity).
        try {
          target.free?.();
        } catch {
          // freeing a poisoned instance may itself trap — nothing to salvage
        }
        pod = undefined;
        return textResponse(503, TRAP_RESPONSE_BODY);
      }
    });
  }

  const ready = enqueue(async () => {
    if (!disposed) pod ??= await provisionPod();
  });

  return {
    podBaseUrl,
    ownerWebId,
    displayName: options.displayName,
    ready,
    dispatch,
    podFetch: createPodFetch({ dispatch: (payload) => dispatch(payload), podBaseUrl }),
    dispose(): void {
      disposed = true;
      void enqueue(async () => {
        pod?.free?.();
        pod = undefined;
      });
    },
  };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Serve one client connection (a `MessagePort`, dedicated-worker scope, or test port).
 * Returns a detach function. Multiple ports share the host's single pod and dispatch queue —
 * that is the SharedWorker per-visitor-not-per-tab property.
 */
export function attachPodHostPort(host: BrowserPodHost, port: PodMessagePortLike): () => void {
  const listener = (event: { data?: unknown }): void => {
    const message = parsePodClientMessage(event.data);
    if (message === undefined) return;
    if (message.kind === "solid-pod-hello") {
      void host.ready.then(
        () => {
          const ready: PodReadyMessage = {
            kind: "solid-pod-ready",
            protocol: POD_PROTOCOL,
            podBaseUrl: host.podBaseUrl,
            webId: host.ownerWebId,
            ...(host.displayName !== undefined ? { displayName: host.displayName } : {}),
            simulated: true,
          };
          port.postMessage(ready);
        },
        (error: unknown) => {
          const bootError: PodBootErrorMessage = {
            kind: "solid-pod-boot-error",
            message: describeError(error),
          };
          port.postMessage(bootError);
        },
      );
      return;
    }
    void (async () => {
      try {
        const payload = await host.dispatch(message);
        const response: PodResponseMessage = {
          kind: "solid-pod-response",
          id: message.id,
          ...payload,
        };
        port.postMessage(response, [payload.body]);
      } catch (error) {
        const failure: PodFailureMessage = {
          kind: "solid-pod-failure",
          id: message.id,
          message: describeError(error),
        };
        port.postMessage(failure);
      }
    })();
  };
  port.addEventListener("message", listener);
  port.start?.();
  return () => port.removeEventListener("message", listener);
}

/** The structural worker-global-scope surface {@link startBrowserPodHost} accepts. */
export interface PodWorkerScopeLike {
  onconnect?: ((event: { ports: readonly PodMessagePortLike[] }) => void) | null;
  postMessage?: (message: unknown, transfer?: readonly unknown[]) => void;
  addEventListener?: PodMessagePortLike["addEventListener"];
  removeEventListener?: PodMessagePortLike["removeEventListener"];
}

export interface StartBrowserPodHostOptions extends CreateBrowserPodOptions {
  /** The worker global scope. Defaults to `globalThis`; tests pass fakes. */
  scope?: PodWorkerScopeLike;
}

/**
 * Boot the pod host inside a worker entry file and wire it to the surrounding scope:
 *
 * - SharedWorker scope (`onconnect` present): every connecting tab's port is served by the
 *   ONE pod — the per-visitor pod decision 0011 wants on the single shared demo domain.
 * - Dedicated-worker scope (fallback for browsers without `SharedWorker`): the scope itself
 *   is the port; the pod is per-tab, which is the honest degradation (state still never
 *   leaves the visitor's browser). A service-worker host is deliberately NOT offered here:
 *   fetch-interception hosting is the upstream #2323 dispatcher's territory, and the
 *   dedicated fallback already covers every SharedWorker-less browser.
 *
 * ```ts
 * // pod.worker.ts — bundle as BOTH `new SharedWorker(...)` and fallback `new Worker(...)`
 * startBrowserPodHost({
 *   podBaseUrl: personaPodOrigin(alex),
 *   ownerWebId: alex.webId,
 *   displayName: alex.displayName,
 *   seedFixtures: personaSeedFixtures(alex),
 * });
 * ```
 */
export function startBrowserPodHost(options: StartBrowserPodHostOptions): BrowserPodHost {
  const scope: PodWorkerScopeLike = options.scope ?? (globalThis as PodWorkerScopeLike);
  const host = createBrowserPod(options);
  if ("onconnect" in scope) {
    scope.onconnect = (event) => {
      const port = event.ports[0];
      if (port !== undefined) attachPodHostPort(host, port);
    };
    return host;
  }
  if (
    typeof scope.postMessage === "function" &&
    typeof scope.addEventListener === "function" &&
    typeof scope.removeEventListener === "function"
  ) {
    attachPodHostPort(host, scope as PodMessagePortLike);
    return host;
  }
  host.dispose();
  throw new Error(
    "startBrowserPodHost: scope is neither a SharedWorker nor a dedicated-worker global " +
      "scope — pass options.scope explicitly",
  );
}
