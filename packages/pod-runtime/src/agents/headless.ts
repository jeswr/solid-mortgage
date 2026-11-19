// AUTHORED-BY Claude Opus 5.5
/** Agents over an in-process host, for headless journeys (Vitest) and the fallback worker. */
import type { PodOwner } from "@mortgage/demo-kit/registry";
import type { PodHost } from "../host/host.js";
import {
  type AgentHandlers,
  type AgentRunner,
  type ChangeMessage,
  createAgentRunner,
  type InboxMessage,
} from "./runner.js";

export interface HostAgentOptions {
  host: PodHost;
  agents: Readonly<Record<string, AgentHandlers>>;
  identities?: Readonly<Record<string, PodOwner>>;
  onError?(error: unknown, app: string, message: InboxMessage | ChangeMessage): void;
}

export function runAgentsOnHost(options: HostAgentOptions): AgentRunner {
  const { host } = options;
  const runner: Parameters<typeof createAgentRunner>[0] = {
    agents: options.agents,
    fetchFor: (owner) => host.fetchAs(owner, { viaAgent: true }),
    identities: options.identities ?? {},
    note: (note) => {
      host.note(note).catch((error: unknown) => console.error("agent note failed", error));
    },
    podUrl: (owner, path) => host.podUrl(owner, path),
    subscribe: (listener) =>
      host.subscribe((message) => {
        if (message.type === "event") listener(message.entry);
      }),
    webid: (owner) => host.webid(owner),
  };
  if (options.onError) runner.onError = options.onError;
  return createAgentRunner(runner);
}
