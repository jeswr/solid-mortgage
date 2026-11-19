// AUTHORED-BY Claude Opus 5.5
/**
 * A fake service-worker scope that drives the real service-worker role and runtime (over the
 * Node wasm) the way the browser would: fetch events with a clientId, message events with a
 * source client and a reply port.
 */

import { memoryStorage, nodeWasmModule } from "../../src/node.js";
import type { ControlReply } from "../../src/protocol.js";
import { createSwRuntime, type SwRuntime, type SwRuntimeOptions } from "../../src/sw/runtime.js";
import { type ServiceWorkerScope, startServiceWorker } from "../../src/sw/service-worker.js";
import { ORIGIN } from "../helpers.js";

export interface FakeClient {
  id: string;
  url: string;
}

export interface FakeServiceWorker {
  runtime: SwRuntime;
  fetch(request: Request, client?: FakeClient): Promise<Response>;
  post(data: unknown, client: FakeClient): Promise<ControlReply>;
}

export function fakeServiceWorker(
  hostMode: boolean,
  clients: FakeClient[],
  extra: Partial<SwRuntimeOptions> = {},
): FakeServiceWorker {
  const handlers: Record<string, (event: never) => void> = {};
  const sw: ServiceWorkerScope = {
    addEventListener: (type, listener) => {
      handlers[type] = listener;
    },
    clients: {
      claim: async () => undefined,
      get: async (id) => clients.find((client) => client.id === id),
    },
    location: { origin: ORIGIN },
    skipWaiting: async () => undefined,
  };
  const runtime = createSwRuntime({
    compile: async () => nodeWasmModule(),
    origin: ORIGIN,
    storage: memoryStorage(),
    ...extra,
  });
  startServiceWorker(sw, runtime, { hostMode });
  const dispatch = (type: string, event: unknown) =>
    (handlers[type] as unknown as (event: unknown) => void)(event);
  return {
    fetch: (request, client) =>
      new Promise((resolve) =>
        dispatch("fetch", {
          clientId: client?.id ?? "",
          request,
          respondWith: (response: Promise<Response>) => resolve(response),
        }),
      ),
    post: (data, client) =>
      new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          channel.port1.close();
          resolve(event.data as ControlReply);
        };
        dispatch("message", {
          data,
          ports: [channel.port2],
          source: client,
          waitUntil: () => undefined,
        });
      }),
    runtime,
  };
}
