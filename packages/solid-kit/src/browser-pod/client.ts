/**
 * Mode-1 in-browser pod runtime — the PAGE-SIDE client (sm-23, decision 0011):
 * `browserPodFetch` routing pod requests to the worker host over postMessage RPC, the
 * SharedWorker → dedicated-worker fallback, and the simulated-login binding.
 *
 * Browser-safe and wasm-free: importing this module never pulls the wasm glue, the binary,
 * or any node-only server code into the app bundle (the worker entry does that on its own
 * thread via `@mortgage/solid-kit/browser-pod/worker`).
 *
 * Honesty rule (decision 0011): the ONLY session this module hands out comes from
 * `demoLogin`, so it is impossible to render pod UI through {@link connectBrowserPod}
 * without `acknowledgeSimulated` at the type level, the runtime check, and a returned
 * session whose `simulated` flag is literally `true`.
 */
import type { GuardOptions } from "@jeswr/guarded-fetch";
import {
  type DemoSession,
  demoLogin,
  SIMULATED_LOGIN_DISCLOSURE,
  type SimulatedLoginDisclosure,
} from "../auth/demo.js";
import {
  createPodFetch,
  POD_PROTOCOL,
  type PodClientMessage,
  type PodMessagePortLike,
  type PodResponsePayload,
  parsePodHostMessage,
} from "./protocol.js";

/** What the host reports in the ready handshake. */
export interface PodReadyInfo {
  podBaseUrl: string;
  webId: string;
  displayName?: string;
}

/** A low-level RPC client over one port: the fetch boundary plus lifecycle. */
export interface PodPortClient {
  /**
   * `fetch` over postMessage: pod-origin requests only (relative URLs resolve against the
   * pod base), concurrent-safe via per-request correlation ids. Transport failures reject
   * with `TypeError` (fetch network-error semantics); a wasm trap surfaces as an HTTP 503
   * Response per the host's recycle contract — retry once and the recycled pod answers.
   */
  podFetch: typeof fetch;
  /** Resolves with the host's ready info; rejects on boot failure or protocol mismatch. */
  ready: Promise<PodReadyInfo>;
  /** Reject all in-flight requests and close the port. */
  close(): void;
}

interface PendingRequest {
  resolve(response: PodResponsePayload): void;
  reject(error: unknown): void;
}

/** Wire the RPC client onto an open port (a `SharedWorker#port`, `Worker`, or test port). */
export function createPodPortClient(port: PodMessagePortLike): PodPortClient {
  const pending = new Map<number, PendingRequest>();
  let nextId = 1;
  let closed = false;

  let readyResolve!: (info: PodReadyInfo) => void;
  let readyReject!: (error: unknown) => void;
  const ready = new Promise<PodReadyInfo>((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  // The rejection always reaches callers through podFetch/ready awaiters; never let the
  // bare promise trip unhandled-rejection reporting when a caller only uses podFetch.
  ready.catch(() => {});

  const failEverything = (error: unknown): void => {
    readyReject(error);
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  };

  const onMessage = (event: { data?: unknown }): void => {
    const message = parsePodHostMessage(event.data);
    if (message === undefined) return;
    if (message.kind === "solid-pod-ready") {
      if (message.protocol !== POD_PROTOCOL) {
        readyReject(
          new Error(
            `pod worker speaks protocol ${message.protocol}, this client speaks ${POD_PROTOCOL} ` +
              "— redeploy the worker bundle and the app together",
          ),
        );
        return;
      }
      readyResolve({
        podBaseUrl: message.podBaseUrl,
        webId: message.webId,
        ...(message.displayName !== undefined ? { displayName: message.displayName } : {}),
      });
      return;
    }
    if (message.kind === "solid-pod-boot-error") {
      failEverything(new Error(`browser pod failed to boot: ${message.message}`));
      return;
    }
    const request = pending.get(message.id);
    if (request === undefined) return; // late reply after abort/close
    pending.delete(message.id);
    if (message.kind === "solid-pod-response") {
      request.resolve({ status: message.status, headers: message.headers, body: message.body });
    } else {
      request.reject(new TypeError(`browser pod request failed: ${message.message}`));
    }
  };

  const onError = (): void => {
    failEverything(new TypeError("browser pod worker errored"));
  };

  port.addEventListener("message", onMessage);
  port.addEventListener("error", onError);
  port.start?.();
  const hello: PodClientMessage = { kind: "solid-pod-hello", protocol: POD_PROTOCOL };
  port.postMessage(hello);

  const podFetch = createPodFetch({
    // Resolving the base awaits `ready`, so every dispatch runs against a booted (or
    // definitively boot-failed) host — no request can hang pre-handshake.
    podBaseUrl: async () => (await ready).podBaseUrl,
    dispatch: (payload, transfer) =>
      new Promise<PodResponsePayload>((resolve, reject) => {
        if (closed) {
          reject(new TypeError("browser pod connection is closed"));
          return;
        }
        const id = nextId;
        nextId += 1;
        pending.set(id, { resolve, reject });
        const message: PodClientMessage = { kind: "solid-pod-request", id, ...payload };
        try {
          port.postMessage(message, transfer);
        } catch (error) {
          pending.delete(id);
          reject(error);
        }
      }),
  });

  return {
    podFetch,
    ready,
    close(): void {
      if (closed) return;
      closed = true;
      failEverything(new TypeError("browser pod connection is closed"));
      port.removeEventListener("message", onMessage);
      port.removeEventListener("error", onError);
      port.close?.();
    },
  };
}

/** A `SharedWorker`-shaped handle (structural: no DOM lib required). */
export interface SharedWorkerLike {
  port: PodMessagePortLike;
}

/**
 * A dedicated-`Worker`-shaped handle. A dedicated `Worker` IS its own message port
 * (`postMessage`/`addEventListener` on the worker itself), but its teardown verb is
 * `terminate()` — NOT `close()` — so `openPodEndpoint` must terminate it explicitly on
 * disconnect, or the wasm pod worker keeps running (roborev sm-23).
 */
export interface DedicatedWorkerLike extends PodMessagePortLike {
  terminate(): void;
}

export interface OpenPodEndpointOptions {
  /**
   * Preferred transport: ONE pod shared by every same-origin tab. Typically
   * `() => new SharedWorker(new URL("./pod.worker.js", import.meta.url), { name: "solid-pod" })`
   * — the `new URL(..., import.meta.url)` form is what bundlers statically resolve.
   */
  createSharedWorker?: () => SharedWorkerLike;
  /**
   * Fallback for browsers without `SharedWorker` (per-tab pod — an honest degradation;
   * state still never leaves the browser). Typically
   * `() => new Worker(new URL("./pod.worker.js", import.meta.url))` — the same entry module
   * serves both scopes (see `startBrowserPodHost`). The returned worker is `terminate()`d
   * when the endpoint is disposed.
   */
  createDedicatedWorker?: () => DedicatedWorkerLike;
  /** Override `SharedWorker` availability detection (tests). */
  sharedWorkerAvailable?: boolean;
}

export interface PodEndpoint {
  port: PodMessagePortLike;
  kind: "shared" | "dedicated";
  /**
   * Tear down the underlying transport. For a dedicated worker this `terminate()`s it (the
   * pod dies with the tab's connection); for a SharedWorker it is a no-op — the shared pod
   * outlives any one tab by design, and only the tab's `port` is closed (by the client).
   */
  dispose(): void;
}

const noDispose = (): void => {};

/** Open the worker transport: SharedWorker when available, dedicated worker otherwise. */
export function openPodEndpoint(options: OpenPodEndpointOptions): PodEndpoint {
  const available =
    options.sharedWorkerAvailable ??
    typeof (globalThis as { SharedWorker?: unknown }).SharedWorker === "function";
  if (options.createSharedWorker !== undefined && available) {
    return { port: options.createSharedWorker().port, kind: "shared", dispose: noDispose };
  }
  if (options.createDedicatedWorker !== undefined) {
    const worker = options.createDedicatedWorker();
    return { port: worker, kind: "dedicated", dispose: () => worker.terminate() };
  }
  throw new Error(
    options.createSharedWorker !== undefined
      ? "openPodEndpoint: SharedWorker is unavailable and no createDedicatedWorker fallback was provided"
      : "openPodEndpoint: provide createSharedWorker and/or createDedicatedWorker",
  );
}

export interface ConnectBrowserPodOptions extends OpenPodEndpointOptions {
  /**
   * An already-open port (or endpoint) to use instead of the factories — e.g. a
   * `MessageChannel` port in tests, or an endpoint from a previous `openPodEndpoint`.
   */
  endpoint?: PodEndpoint | PodMessagePortLike;
  /**
   * MUST be {@link SIMULATED_LOGIN_DISCLOSURE}: the caller's assertion that the UI
   * rendering this pod displays the decision-0011 simulation disclosure. Forwarded to
   * `demoLogin`, which enforces it at runtime too.
   */
  acknowledgeSimulated: SimulatedLoginDisclosure;
  /** Forwarded to `demoLogin` (loopback pod bases in dev/tests). */
  allowInsecureLoopback?: boolean;
  /** Extra origins the session fetch may serve (forwarded to `demoLogin`). */
  allowedOrigins?: string[];
  /** Credential-free fetch for out-of-boundary requests (forwarded to `demoLogin`). */
  publicFetch?: typeof fetch;
  /**
   * `@jeswr/guarded-fetch` policy for `session.authFetch`. Defaults to `false` — the pod
   * origin is VIRTUAL (answered in-worker, never on the network), which is exactly the
   * case `demoLogin`'s guard option documents skipping the guard for.
   */
  guard?: GuardOptions | false;
}

/** The connected Mode-1 pod: the simulated session plus the raw worker-routed fetch. */
export interface BrowserPodConnection {
  /**
   * The persona's SIMULATED session (`simulated` is literally `true`): render pod UI from
   * this and surface the disclosure — decision 0011 makes that non-optional.
   */
  session: DemoSession;
  /** The exact disclosure acknowledgement this connection was constructed under. */
  disclosure: SimulatedLoginDisclosure;
  /** Which transport won: SharedWorker (per-visitor) or dedicated worker (per-tab). */
  kind: "shared" | "dedicated" | "port";
  podBaseUrl: string;
  webId: string;
  displayName?: string;
  /** The raw pod fetch (no session boundary). Prefer `session.authFetch` in app code. */
  podFetch: typeof fetch;
  /** Tear down the RPC connection (in-flight requests reject). */
  close(): void;
}

function isEndpoint(value: PodEndpoint | PodMessagePortLike): value is PodEndpoint {
  return "port" in value && "kind" in value;
}

/**
 * Connect to the in-browser pod and bind the persona's simulated session: open (or accept)
 * the worker transport, complete the ready handshake, then `demoLogin` the persona the
 * worker reports. The returned {@link BrowserPodConnection} is the only way this module
 * hands out pod access, and it cannot be constructed without the decision-0011
 * acknowledgement.
 */
export async function connectBrowserPod(
  options: ConnectBrowserPodOptions,
): Promise<BrowserPodConnection> {
  // Fail before booting a worker, not after (demoLogin re-enforces this check).
  if (options.acknowledgeSimulated !== SIMULATED_LOGIN_DISCLOSURE) {
    throw new Error(
      "connectBrowserPod: refusing to bind a simulated session without the decision-0011 " +
        "acknowledgement. Pass acknowledgeSimulated: SIMULATED_LOGIN_DISCLOSURE and " +
        "surface session.simulated in the UI.",
    );
  }
  let port: PodMessagePortLike;
  let kind: BrowserPodConnection["kind"];
  // Only a transport this call OPENED is ours to terminate; a caller-supplied port/endpoint
  // is disposed by whoever created it (they may reuse it), so its dispose stays a no-op here.
  let disposeEndpoint: () => void = noDispose;
  if (options.endpoint !== undefined) {
    if (isEndpoint(options.endpoint)) {
      ({ port, kind } = options.endpoint);
    } else {
      port = options.endpoint;
      kind = "port";
    }
  } else {
    const endpoint = openPodEndpoint(options);
    ({ port, kind } = endpoint);
    disposeEndpoint = endpoint.dispose;
  }

  const client = createPodPortClient(port);
  let ready: PodReadyInfo;
  try {
    ready = await client.ready;
  } catch (error) {
    client.close();
    disposeEndpoint();
    throw error;
  }

  const session = demoLogin({
    webId: ready.webId,
    podBaseUrl: ready.podBaseUrl,
    fetch: client.podFetch,
    guard: options.guard ?? false,
    acknowledgeSimulated: options.acknowledgeSimulated,
    ...(options.allowInsecureLoopback !== undefined
      ? { allowInsecureLoopback: options.allowInsecureLoopback }
      : {}),
    ...(options.allowedOrigins !== undefined ? { allowedOrigins: options.allowedOrigins } : {}),
    ...(options.publicFetch !== undefined ? { publicFetch: options.publicFetch } : {}),
  });

  return {
    session,
    disclosure: SIMULATED_LOGIN_DISCLOSURE,
    kind,
    podBaseUrl: ready.podBaseUrl,
    webId: ready.webId,
    ...(ready.displayName !== undefined ? { displayName: ready.displayName } : {}),
    podFetch: client.podFetch,
    close(): void {
      client.close();
      // Terminate the fallback worker we opened (SharedWorker dispose is a no-op — the
      // shared pod outlives this tab; the client already closed this tab's port).
      disposeEndpoint();
    },
  };
}

/** A `fetch`-shaped pod client with its RPC lifecycle attached (the brief's `browserPodFetch`). */
export type BrowserPodFetch = typeof fetch & {
  /** Resolves with the host's ready info; rejects on boot failure or protocol mismatch. */
  readonly ready: Promise<PodReadyInfo>;
  /** Reject in-flight requests and close the port (does NOT terminate a worker). */
  close(): void;
};

/**
 * The low-level page-side pod fetch: wrap an already-open worker transport (a
 * `SharedWorker#port`, dedicated `Worker`, or test `MessagePort`) into a `fetch` you can call
 * directly — pod-origin requests routed over postMessage RPC, concurrent-safe, with `.ready`
 * and `.close` attached. Prefer {@link connectBrowserPod}, which additionally binds the
 * persona's simulated session and enforces the decision-0011 disclosure; reach for
 * `browserPodFetch` when you only need raw pod IO (e.g. a health probe) and own the
 * transport's lifecycle yourself.
 */
export function browserPodFetch(transport: PodEndpoint | PodMessagePortLike): BrowserPodFetch {
  const port = isEndpoint(transport) ? transport.port : transport;
  const client = createPodPortClient(port);
  const fetchFn = ((input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
    client.podFetch(input, init)) as BrowserPodFetch;
  return Object.assign(fetchFn, { ready: client.ready, close: client.close });
}
