// AUTHORED-BY Claude Opus 5.5
/** The `pod-host` dedicated-worker role: the host for one page, plus that page's agents. */
import { runAgentsOnHost } from "../agents/headless.js";
import type { AgentRunner } from "../agents/runner.js";
import type { ControlRequest } from "../protocol.js";
import { loadAgents } from "./agent-worker.js";
import type { SwRuntime } from "./runtime.js";

let runner: AgentRunner | undefined;

export function startHostWorker(runtime: SwRuntime): void {
  self.addEventListener("message", (event: MessageEvent) => {
    const message = event.data as ControlRequest;
    if (message?.type !== "agents") {
      void runtime.onControlMessage(event);
      return;
    }
    const port = event.ports[0];
    (async () => {
      const host = await runtime.getHost();
      if (host === undefined) throw new Error("send hello first");
      runner?.stop();
      runner = runAgentsOnHost({
        agents: await loadAgents(message.agents),
        host,
        identities: message.identities,
      });
    })().then(
      () => port?.postMessage({ ok: true }),
      (error: unknown) => port?.postMessage({ error: String(error), ok: false }),
    );
  });
}
