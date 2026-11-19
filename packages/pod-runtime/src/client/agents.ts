// AUTHORED-BY Claude Opus 5.5
/** Starting the organisation agent worker, shared by app pages and the host-mode bridge page. */
import type { AppNote } from "@mortgage/demo-kit/contracts";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import { AGENTS_LOCK, AGENTS_WORKER_NAME, type AgentWorkerStart } from "../protocol.js";

/** The app slugs with an agent bundle, from `/site.json` (`agents`). */
export async function siteAgents(): Promise<string[]> {
  try {
    const response = await fetch("/site.json", { cache: "no-store" });
    if (!response.ok) return [];
    const site = (await response.json()) as { agents?: unknown };
    return Array.isArray(site.agents)
      ? site.agents.filter((s): s is string => typeof s === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * Start an agent worker. Every tab starts one; it runs the agents only while it holds the agents
 * Web Lock. Notes the agents write come back through `onNote`.
 */
export function spawnAgentWorker(input: {
  swUrl: string;
  agents: string[];
  identities: Record<string, PodOwner>;
  origin: string;
  onNote(note: AppNote): void;
}): void {
  const worker = new Worker(input.swUrl, { name: AGENTS_WORKER_NAME });
  worker.onmessage = (event: MessageEvent<{ type?: string; note?: AppNote }>) => {
    if (event.data?.type === "note" && event.data.note !== undefined) input.onNote(event.data.note);
  };
  const start: AgentWorkerStart = {
    agents: input.agents,
    identities: input.identities,
    lock: AGENTS_LOCK,
    origin: input.origin,
    type: "agents",
  };
  worker.postMessage(start);
}
