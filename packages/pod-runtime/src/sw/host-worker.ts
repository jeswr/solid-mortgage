// AUTHORED-BY Claude Opus 5.5
/**
 * The `pod-host` dedicated-worker role (fallback mode, no service worker). Every tab starts one,
 * but only the holder of the host Web Lock runs the pods, so all tabs share one state and one
 * event-id sequence. The other workers forward their page's messages to the holder over a
 * BroadcastChannel. When the hosting tab closes, the lock passes to a waiting worker, which
 * restores the pods from the saved snapshots and answers what is still outstanding.
 */
import { runAgentsOnHost } from "../agents/headless.js";
import type { AgentRunner } from "../agents/runner.js";
import {
  type ControlReply,
  type ControlRequest,
  HOST_LOCK,
  HOST_RPC_CHANNEL,
} from "../protocol.js";
import { loadAgents } from "./agent-worker.js";
import type { SwRuntime } from "./runtime.js";

type AgentsMessage = Extract<ControlRequest, { type: "agents" }>;

type Rpc =
  | { kind: "request"; id: string; from: string; message: ControlRequest }
  | { kind: "reply"; id: string; to: string; reply: ControlReply }
  | { kind: "host-ready" };

const FORWARD_TIMEOUT_MS = 60_000;

export function startHostWorker(runtime: SwRuntime): void {
  const me = crypto.randomUUID();
  const rpc = new BroadcastChannel(HOST_RPC_CHANNEL);
  let isHost = false;
  let runner: AgentRunner | undefined;
  let agents: AgentsMessage | undefined;
  /** Requests forwarded to the host and not yet answered: id → message and how to answer. */
  const outstanding = new Map<
    string,
    { message: ControlRequest; answer(reply: ControlReply): void }
  >();

  async function startAgents(message: AgentsMessage): Promise<void> {
    if (runner !== undefined) return;
    const host = await runtime.getHost();
    if (host === undefined) throw new Error("send hello first");
    runner = runAgentsOnHost({
      agents: await loadAgents(message.agents),
      host,
      identities: message.identities,
    });
  }

  /** Answer as the host. */
  async function handle(message: ControlRequest): Promise<ControlReply> {
    if (message.type !== "agents") return runtime.handleControl(message);
    agents ??= message;
    await startAgents(message);
    return { ok: true };
  }

  const settle = (work: Promise<ControlReply>) =>
    work.catch(
      (error: unknown): ControlReply => ({
        error: String((error as Error)?.message ?? error),
        ok: false,
      }),
    );

  function forward(message: ControlRequest): Promise<ControlReply> {
    if (isHost) return settle(handle(message));
    const id = crypto.randomUUID();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        outstanding.delete(id);
        resolve({ error: "no tab is hosting the pods", ok: false });
      }, FORWARD_TIMEOUT_MS);
      outstanding.set(id, {
        answer: (reply) => {
          clearTimeout(timer);
          outstanding.delete(id);
          resolve(reply);
        },
        message,
      });
      rpc.postMessage({ from: me, id, kind: "request", message } satisfies Rpc);
    });
  }

  rpc.onmessage = (event: MessageEvent<Rpc>) => {
    const data = event.data;
    if (data.kind === "request" && isHost) {
      void settle(handle(data.message)).then((reply) =>
        rpc.postMessage({ id: data.id, kind: "reply", reply, to: data.from } satisfies Rpc),
      );
    } else if (data.kind === "reply" && data.to === me) {
      outstanding.get(data.id)?.answer(data.reply);
    } else if (data.kind === "host-ready" && !isHost) {
      // A new host took over: send it whatever the old one left unanswered.
      for (const [id, { message }] of outstanding)
        rpc.postMessage({ from: me, id, kind: "request", message } satisfies Rpc);
    }
  };

  async function becomeHost(): Promise<void> {
    isHost = true;
    // This worker's own unanswered requests are now its to answer.
    for (const { message, answer } of [...outstanding.values()])
      void settle(handle(message)).then(answer);
    rpc.postMessage({ kind: "host-ready" } satisfies Rpc);
    if (agents !== undefined) await startAgents(agents).catch(() => undefined);
  }

  const locks = (navigator as Navigator & { locks?: LockManager }).locks;
  if (locks === undefined) void becomeHost();
  else
    void locks.request(HOST_LOCK, async () => {
      await becomeHost();
      await new Promise<never>(() => undefined);
    });

  self.addEventListener("message", (event: MessageEvent) => {
    const message = event.data as ControlRequest;
    const port = event.ports[0];
    if (message?.type === "agents") agents ??= message;
    void forward(message).then((reply) => {
      const transfer = reply.ok && reply.response?.body ? [reply.response.body] : [];
      port?.postMessage(reply, transfer);
    });
  });
}
