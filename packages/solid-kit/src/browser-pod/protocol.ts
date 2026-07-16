/**
 * Mode-1 in-browser pod runtime — the postMessage RPC protocol between the worker-side pod
 * host (`host.ts`, runs the sparq-lws-wasm `SolidServer`) and the page-side client
 * (`client.ts`, exposes a `fetch`-shaped boundary), plus the request/response payload
 * conversions both sides share (sm-23, decision 0011).
 *
 * Everything in this module is transport-agnostic, structured-clone-safe, and browser-safe:
 * no `node:` imports, no wasm imports, no DOM-lib dependency (worker/port surfaces are
 * structural so the same code type-checks against browser ports and Node's `MessageChannel`
 * in tests).
 */

/** Bumped on any incompatible message-shape change; client and host must agree. */
export const POD_PROTOCOL = 1;

/**
 * One HTTP request in structured-clone-safe form. Headers are flat `[name, value, ...]`
 * pairs — the same convention as the wasm `handleRequest` boundary, so repeated header
 * names survive end-to-end.
 */
export interface PodRequestPayload {
  method: string;
  /** Absolute URL on the pod's virtual origin. */
  url: string;
  /** Flat name/value pairs (even length). */
  headers: string[];
  /** Request body bytes, or null when bodyless. Transferred, not copied, when possible. */
  body: ArrayBuffer | null;
}

/** One HTTP response in structured-clone-safe form (same flat-header convention). */
export interface PodResponsePayload {
  status: number;
  headers: string[];
  body: ArrayBuffer;
}

/** Client → host: handshake. The host answers with `PodReadyMessage` or `PodBootError`. */
export interface PodHelloMessage {
  kind: "solid-pod-hello";
  protocol: number;
}

/**
 * Host → client: the pod is provisioned and seeded. Carries the decision-0011 honesty flag
 * on the wire: a Mode-1 pod host only ever binds SIMULATED sessions.
 */
export interface PodReadyMessage {
  kind: "solid-pod-ready";
  protocol: number;
  podBaseUrl: string;
  webId: string;
  displayName?: string;
  simulated: true;
}

/** Host → client: provisioning or seeding failed; the pod cannot serve requests. */
export interface PodBootErrorMessage {
  kind: "solid-pod-boot-error";
  message: string;
}

/** Client → host: one request, correlated by `id` (unique per client connection). */
export interface PodRequestMessage extends PodRequestPayload {
  kind: "solid-pod-request";
  id: number;
}

/** Host → client: the response to `PodRequestMessage` with the same `id`. */
export interface PodResponseMessage extends PodResponsePayload {
  kind: "solid-pod-response";
  id: number;
}

/**
 * Host → client: the request with this `id` failed OUTSIDE normal HTTP semantics (transport
 * or host error). The client surfaces it as a fetch network error (`TypeError`), matching
 * what a dead server would produce. Wasm traps are NOT failures — they surface as HTTP 503
 * per the recycle contract (see `host.ts`).
 */
export interface PodFailureMessage {
  kind: "solid-pod-failure";
  id: number;
  message: string;
}

export type PodClientMessage = PodHelloMessage | PodRequestMessage;
export type PodHostMessage =
  | PodReadyMessage
  | PodBootErrorMessage
  | PodResponseMessage
  | PodFailureMessage;

/**
 * The structural MessagePort surface this runtime needs. Browser `MessagePort`,
 * `SharedWorker#port`, dedicated `Worker`, worker global scopes, and Node's
 * `MessageChannel` ports (vitest) all satisfy it.
 */
export interface PodMessagePortLike {
  postMessage(message: unknown, transfer?: readonly unknown[]): void;
  addEventListener(
    type: "message" | "messageerror" | "error",
    listener: (event: { data?: unknown }) => void,
  ): void;
  removeEventListener(
    type: "message" | "messageerror" | "error",
    listener: (event: { data?: unknown }) => void,
  ): void;
  /** Web `MessagePort`s queue until started; `Worker`s have no `start`. */
  start?(): void;
  close?(): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFlatHeaderPairs(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length % 2 === 0 &&
    value.every((entry) => typeof entry === "string")
  );
}

/** Parse an incoming client→host message; `undefined` for foreign/malformed traffic. */
export function parsePodClientMessage(data: unknown): PodClientMessage | undefined {
  if (!isRecord(data)) return undefined;
  if (data.kind === "solid-pod-hello" && typeof data.protocol === "number") {
    return { kind: "solid-pod-hello", protocol: data.protocol };
  }
  if (
    data.kind === "solid-pod-request" &&
    typeof data.id === "number" &&
    typeof data.method === "string" &&
    typeof data.url === "string" &&
    isFlatHeaderPairs(data.headers) &&
    (data.body === null || data.body instanceof ArrayBuffer)
  ) {
    return {
      kind: "solid-pod-request",
      id: data.id,
      method: data.method,
      url: data.url,
      headers: data.headers,
      body: data.body,
    };
  }
  return undefined;
}

/** Parse an incoming host→client message; `undefined` for foreign/malformed traffic. */
export function parsePodHostMessage(data: unknown): PodHostMessage | undefined {
  if (!isRecord(data)) return undefined;
  if (
    data.kind === "solid-pod-ready" &&
    typeof data.protocol === "number" &&
    typeof data.podBaseUrl === "string" &&
    typeof data.webId === "string" &&
    data.simulated === true
  ) {
    return {
      kind: "solid-pod-ready",
      protocol: data.protocol,
      podBaseUrl: data.podBaseUrl,
      webId: data.webId,
      ...(typeof data.displayName === "string" ? { displayName: data.displayName } : {}),
      simulated: true,
    };
  }
  if (data.kind === "solid-pod-boot-error" && typeof data.message === "string") {
    return { kind: "solid-pod-boot-error", message: data.message };
  }
  if (
    data.kind === "solid-pod-response" &&
    typeof data.id === "number" &&
    typeof data.status === "number" &&
    isFlatHeaderPairs(data.headers) &&
    data.body instanceof ArrayBuffer
  ) {
    return {
      kind: "solid-pod-response",
      id: data.id,
      status: data.status,
      headers: data.headers,
      body: data.body,
    };
  }
  if (
    data.kind === "solid-pod-failure" &&
    typeof data.id === "number" &&
    typeof data.message === "string"
  ) {
    return { kind: "solid-pod-failure", id: data.id, message: data.message };
  }
  return undefined;
}

/** Serialize a `Request` into a clone-safe payload plus its transfer list. */
export async function requestToPayload(
  request: Request,
): Promise<{ payload: PodRequestPayload; transfer: unknown[] }> {
  const bytes = await request.arrayBuffer();
  const body = bytes.byteLength > 0 ? bytes : null;
  return {
    payload: {
      method: request.method,
      url: request.url,
      headers: [...request.headers].flat(),
      body,
    },
    transfer: body === null ? [] : [body],
  };
}

/** Statuses the `Response` constructor refuses a body for. */
const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304]);

/** Rebuild a real `Response` from a clone-safe payload (repeated headers preserved). */
export function payloadToResponse(payload: PodResponsePayload): Response {
  if (payload.headers.length % 2 !== 0) {
    throw new TypeError("pod response headers must contain name/value pairs");
  }
  const headers = new Headers();
  for (let index = 0; index < payload.headers.length; index += 2) {
    headers.append(String(payload.headers[index]), String(payload.headers[index + 1]));
  }
  const body =
    NULL_BODY_STATUSES.has(payload.status) || payload.body.byteLength === 0 ? null : payload.body;
  return new Response(body, { status: payload.status, headers });
}

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("The operation was aborted.", "AbortError");
}

function raceAbort<T>(promise: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (signal === undefined) return promise;
  if (signal.aborted) return Promise.reject(abortReason(signal));
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(abortReason(signal));
    signal.addEventListener("abort", onAbort, { once: true });
    const settle = (): void => signal.removeEventListener("abort", onAbort);
    promise.then(
      (value) => {
        settle();
        resolve(value);
      },
      (error: unknown) => {
        settle();
        reject(error);
      },
    );
  });
}

/** A payload-level request executor (direct wasm dispatch, or postMessage RPC). */
export type PodDispatch = (
  payload: PodRequestPayload,
  transfer: readonly unknown[],
) => Promise<PodResponsePayload>;

/**
 * Build the `fetch`-shaped boundary over a payload dispatcher. Shared by the client
 * (RPC dispatch) and the host's own seeding/testing fetch (direct dispatch).
 *
 * Fail-closed origin rule: only requests on the pod's virtual origin are served; anything
 * else rejects with a `TypeError` (fetch network-error semantics) rather than silently
 * leaving the pod boundary. Relative URLs resolve against the pod base.
 */
export function createPodFetch(options: {
  dispatch: PodDispatch;
  podBaseUrl: string | (() => Promise<string>);
}): typeof fetch {
  const baseOption = options.podBaseUrl;
  const resolveBase =
    typeof baseOption === "string" ? () => Promise.resolve(baseOption) : baseOption;
  return async (input, init) => {
    const base = await resolveBase();
    const origin = new URL(base).origin;
    const request =
      input instanceof Request
        ? new Request(input, init)
        : new Request(new URL(String(input), base), init);
    if (new URL(request.url).origin !== origin) {
      throw new TypeError(
        `browser pod fetch only serves the pod origin ${origin}; refusing ${request.url}`,
      );
    }
    const { payload, transfer } = await requestToPayload(request);
    const signal = request.signal ?? undefined;
    if (signal?.aborted) throw abortReason(signal);
    const response = await raceAbort(options.dispatch(payload, transfer), signal);
    return payloadToResponse(response);
  };
}
