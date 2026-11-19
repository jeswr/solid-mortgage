// AUTHORED-BY Claude Opus 5.5
/**
 * The `pod-agents` dedicated-worker role (service-worker mode). Every tab starts one; only the
 * holder of the agents Web Lock runs them, so each inbox write is handled once. Requests go
 * through the service worker like any page's, acting as the agent's organisation.
 */
import type { AppNote, LensEntry } from "@mortgage/demo-kit/contracts";
import { type PodOwner, webidFor } from "@mortgage/demo-kit/registry";
import { type AgentHandlers, createAgentRunner } from "../agents/runner.js";
import type { HostMessage } from "../host/host.js";
import { idbStorage } from "../host/storage.js";
import {
  AGENT_HEADER,
  type AgentWorkerStart,
  EVENTS_CHANNEL,
  VIA_AGENT_HEADER,
} from "../protocol.js";

const SLUG = /^[a-z][a-z0-9-]*$/;

/** Import `/agents/<slug>.js` for each slug; a bundle that fails to load is reported and skipped. */
export async function loadAgents(slugs: readonly string[]): Promise<Record<string, AgentHandlers>> {
  const agents: Record<string, AgentHandlers> = {};
  for (const slug of slugs) {
    if (!SLUG.test(slug)) continue;
    try {
      const url = new URL(`/agents/${slug}.js`, self.location.origin).href;
      const module = (await import(/* @vite-ignore */ url)) as { handlers?: AgentHandlers };
      if (module.handlers !== undefined) agents[slug] = module.handlers;
    } catch (error) {
      console.error(`pod-runtime: could not load the ${slug} agent`, error);
    }
  }
  return agents;
}

const CURSOR = "agentsCursor";

/**
 * Deliver logged events this runner has not seen yet (written before the worker started, or
 * while another tab held the lock), then live ones. The cursor is the last event id delivered.
 */
function replayThenListen(
  channel: BroadcastChannel,
  listener: (entry: LensEntry) => void,
): () => void {
  const storage = idbStorage();
  let cursor = 0;
  let live = false;
  const buffered: LensEntry[] = [];
  const deliver = (entry: LensEntry) => {
    if (entry.id <= cursor) return;
    cursor = entry.id;
    listener(entry);
    storage.putMeta(CURSOR, cursor).catch(() => undefined);
  };
  const onMessage = (event: MessageEvent<HostMessage>) => {
    const message = event.data;
    if (message.type === "reset") {
      cursor = 0;
      buffered.length = 0;
      storage.putMeta(CURSOR, 0).catch(() => undefined);
    } else if (!live) buffered.push(message.entry);
    else deliver(message.entry);
  };
  channel.addEventListener("message", onMessage);
  void (async () => {
    try {
      const logged = await storage.events();
      const last = logged.at(-1)?.id ?? 0;
      const stored = (await storage.getMeta<number>(CURSOR)) ?? 0;
      // A cursor past the end of the log means the demo was reset since it was written.
      cursor = stored > last ? 0 : stored;
      for (const entry of logged) deliver(entry);
    } catch (error) {
      console.error("pod-runtime: agent replay failed", error);
    } finally {
      live = true;
      for (const entry of buffered.splice(0)) deliver(entry);
      self.postMessage({ type: "listening" });
    }
  })();
  return () => channel.removeEventListener("message", onMessage);
}

function run(start: AgentWorkerStart): Promise<void> {
  return (async () => {
    const agents = await loadAgents(start.agents);
    const channel = new BroadcastChannel(EVENTS_CHANNEL);
    const podUrl = (owner: PodOwner, path = "") =>
      `${start.origin}/pods/${owner}/${path.replace(/^\/+/, "")}`;
    createAgentRunner({
      agents,
      fetchFor: (owner) => (input, init) => {
        const request = new Request(input, init);
        const headers = new Headers(request.headers);
        for (const name of [...headers.keys()])
          if (name.startsWith("x-demo-")) headers.delete(name);
        headers.set(AGENT_HEADER, owner);
        headers.set(VIA_AGENT_HEADER, "1");
        return fetch(new Request(request, { headers }));
      },
      identities: start.identities,
      // The page that started this worker relays notes to the host.
      note: (note: AppNote) => self.postMessage({ note, type: "note" }),
      podUrl,
      subscribe: (listener: (entry: LensEntry) => void) => replayThenListen(channel, listener),
      webid: (owner) => webidFor(owner, start.origin),
    });
    // Hold the lock for the worker's lifetime.
    await new Promise<never>(() => undefined);
  })();
}

export function startAgentWorker(): void {
  self.addEventListener(
    "message",
    (event: MessageEvent<AgentWorkerStart>) => {
      const start = event.data;
      if (start?.type !== "agents") return;
      const locks = (navigator as Navigator & { locks?: LockManager }).locks;
      if (locks === undefined) void run(start);
      else void locks.request(start.lock, () => run(start));
    },
    { once: true },
  );
}
