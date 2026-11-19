/**
 * The wallet's Mode-1 pod worker entry (decisions 0011 + 0013): ONE seeded,
 * writable, per-visitor sparq-wasm borrower pod, shared by every same-origin
 * tab (SharedWorker), with the dedicated-worker fallback — the SAME module
 * serves both scopes. Bundled by Next via `new SharedWorker(new URL(...))` /
 * `new Worker(new URL(...))` in `connect.ts`.
 *
 * The seed is ASYNC (signed-credential issuance — see `seed.ts`), but
 * SharedWorker `onconnect` must be registered synchronously or early tab
 * connections are lost. `BufferedPort` bridges the gap: it queues messages
 * per port until the host exists, then replays them into the real handler.
 * A failed seed answers every connection with the protocol's boot-error, so
 * the page-side `connectBrowserPod` rejects loudly instead of hanging.
 */
// FIRST import (side effect): base64url support for the Buffer polyfill —
// the status-list signing in `buildWalletPodSeed` needs it (see the patch).
import "./buffer-base64url-patch";
import type { PodMessagePortLike } from "@mortgage/solid-kit/browser-pod/worker";
import {
  attachPodHostPort,
  createBrowserPod,
  personaPodOrigin,
} from "@mortgage/solid-kit/browser-pod/worker";
import { buildWalletPodSeed, WALLET_DISPLAY_NAME, WALLET_POD_BASE, WALLET_WEB_ID } from "./seed";

/** A port facade that buffers inbound messages until a listener attaches. */
class BufferedPort implements PodMessagePortLike {
  private buffered: { data?: unknown }[] = [];
  private listeners = new Set<(event: { data?: unknown }) => void>();

  constructor(private readonly port: PodMessagePortLike) {
    port.addEventListener("message", this.onMessage);
    port.start?.();
  }

  private onMessage = (event: { data?: unknown }): void => {
    if (this.listeners.size === 0) {
      this.buffered.push({ data: event.data });
      return;
    }
    for (const listener of this.listeners) listener(event);
  };

  addEventListener(type: string, listener: (event: { data?: unknown }) => void): void {
    if (type !== "message") return; // "error" never fires on an open port facade
    this.listeners.add(listener);
    for (const event of this.buffered.splice(0)) listener(event);
  }

  removeEventListener(type: string, listener: (event: { data?: unknown }) => void): void {
    if (type !== "message") return;
    this.listeners.delete(listener);
  }

  postMessage(message: unknown, transfer?: unknown[]): void {
    this.port.postMessage(message, transfer);
  }

  start(): void {
    // Already started in the constructor.
  }

  close(): void {
    this.port.removeEventListener("message", this.onMessage);
    this.port.close?.();
  }
}

let attach: ((port: BufferedPort) => void) | undefined;
const pending: BufferedPort[] = [];

function accept(port: PodMessagePortLike): void {
  const buffered = new BufferedPort(port);
  if (attach !== undefined) attach(buffered);
  else pending.push(buffered);
}

// Register scope handlers SYNCHRONOUSLY (see the module header).
const scope = globalThis as {
  onconnect?: ((event: { ports: readonly PodMessagePortLike[] }) => void) | null;
  postMessage?: (message: unknown, transfer?: readonly unknown[]) => void;
  addEventListener?: PodMessagePortLike["addEventListener"];
  removeEventListener?: PodMessagePortLike["removeEventListener"];
};
if ("onconnect" in scope) {
  // SharedWorker scope: every connecting tab shares the ONE pod.
  scope.onconnect = (event) => {
    const port = event.ports[0];
    if (port !== undefined) accept(port);
  };
} else if (
  typeof scope.postMessage === "function" &&
  typeof scope.addEventListener === "function" &&
  typeof scope.removeEventListener === "function"
) {
  // Dedicated-worker fallback: the scope itself is the (per-tab) port.
  accept(scope as PodMessagePortLike);
}

void (async () => {
  try {
    const seed = await buildWalletPodSeed(new Date());
    const host = createBrowserPod({
      podBaseUrl: personaPodOrigin({ podBase: WALLET_POD_BASE }),
      ownerWebId: WALLET_WEB_ID,
      displayName: WALLET_DISPLAY_NAME,
      seedFixtures: seed.fixtures,
    });
    attach = (port) => attachPodHostPort(host, port);
  } catch (error) {
    const message = `wallet pod seed failed: ${error instanceof Error ? error.message : String(error)}`;
    attach = (port) => {
      // The protocol's boot-error: connectBrowserPod rejects `ready` on it.
      port.postMessage({ kind: "solid-pod-boot-error", message });
    };
  }
  const ready = attach;
  for (const port of pending.splice(0)) ready(port);
})();
