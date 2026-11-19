// AUTHORED-BY Claude Opus 5.5
/** Host mode, the app side: a hidden iframe on the pod origin carries every pod request. */
import { fromFetchReply, type Transport, toControlFetch } from "../client/transport.js";
import type { HostMessage } from "../host/host.js";
import { BRIDGE_PATH, type ControlReply, type ControlRequest } from "../protocol.js";
import { BRIDGE_EVENT, BRIDGE_READY, BRIDGE_REPLY, BRIDGE_REQUEST } from "./server.js";

export interface BridgeClientOptions {
  podsOrigin: string;
  timeoutMs?: number;
}

export async function createBridgeClient(options: BridgeClientOptions): Promise<Transport> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const frame = document.createElement("iframe");
  frame.hidden = true;
  frame.setAttribute("aria-hidden", "true");
  frame.title = "pod bridge";
  frame.src = new URL(BRIDGE_PATH, options.podsOrigin).href;
  const pending = new Map<number, (reply: ControlReply) => void>();
  const subscribers = new Set<(message: HostMessage) => void>();
  let nextId = 1;
  const readyPromise = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("the pod bridge did not start")), timeoutMs);
    window.addEventListener("message", (event: MessageEvent) => {
      if (event.origin !== options.podsOrigin || event.source !== frame.contentWindow) return;
      const data = event.data as {
        type?: string;
        id?: number;
        reply?: ControlReply;
        message?: HostMessage;
      };
      if (data?.type === BRIDGE_READY) {
        clearTimeout(timer);
        resolve();
      } else if (data?.type === BRIDGE_EVENT && data.message !== undefined) {
        for (const subscriber of subscribers) subscriber(data.message);
      } else if (data?.type === BRIDGE_REPLY && typeof data.id === "number" && data.reply) {
        pending.get(data.id)?.(data.reply);
        pending.delete(data.id);
      }
    });
  });
  document.body.append(frame);
  await readyPromise;

  const control = (message: ControlRequest) =>
    new Promise<ControlReply & { ok: true }>((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`the pod bridge did not answer "${message.type}"`));
      }, timeoutMs);
      pending.set(id, (reply) => {
        clearTimeout(timer);
        if (reply.ok) resolve(reply);
        else reject(new Error(reply.error));
      });
      const transfer = message.type === "fetch" && message.body !== null ? [message.body] : [];
      frame.contentWindow?.postMessage(
        { id, message, type: BRIDGE_REQUEST },
        options.podsOrigin,
        transfer,
      );
    });

  return {
    control,
    async fetch(request) {
      const reply = await control(await toControlFetch(request));
      return fromFetchReply(reply.response);
    },
    mode: "bridge",
    subscribe: (listener) => {
      subscribers.add(listener);
    },
  };
}
