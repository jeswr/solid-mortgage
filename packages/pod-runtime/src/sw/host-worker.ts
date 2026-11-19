// AUTHORED-BY Claude Opus 5.5
/**
 * The `pod-host` dedicated-worker role (fallback mode, no service worker). Every tab starts one,
 * but only one of them, the host, runs the pods, so all tabs share one state and one event-id
 * sequence. The others forward their page's messages to the host over a BroadcastChannel.
 *
 * Electing the host:
 * - With Web Locks (secure contexts), the holder of the `HOST_LOCK` lock hosts. When its tab
 *   closes, the lock passes to a waiting worker.
 * - Without Web Locks (plain HTTP is not a secure context), a lease in storage elects it: a worker
 *   claims the lease atomically (`PodStorage.claimLease`) and renews it every `renewMs`; a lease
 *   not renewed for `ttlMs` is free. The host also renews before answering each request, and a
 *   host that finds the lease taken (it was suspended, say) steps down and forwards instead.
 *   Closing releases the lease; a tab killed outright frees it after `ttlMs`.
 *
 * Handing over: a new host restores the pods from storage (another tab's host may have written
 * since), announces `host-ready`, and the other workers resend whatever is still unanswered.
 * Every request carries an id that its sender keeps across resends, and the host answers each id
 * once: a duplicate gets the first reply. Replies to state-changing requests are also kept in a
 * short log in storage, so a new host answers a resend of something the old host already applied
 * with the old reply instead of applying it again.
 *
 * `createHostWorker` takes its environment (storage, locks, channel, agent loader) as options, so
 * tests run several "tabs" in one process over the Node wasm; `startHostWorker` wires it to the
 * dedicated worker.
 */
import { runAgentsOnHost } from "../agents/headless.js";
import type { AgentHandlers, AgentRunner } from "../agents/runner.js";
import type { PodStorage } from "../host/storage.js";
import {
  type ControlReply,
  type ControlRequest,
  HOST_LOCK,
  HOST_RPC_CHANNEL,
} from "../protocol.js";
import type { SwRuntime } from "./runtime.js";

type AgentsMessage = Extract<ControlRequest, { type: "agents" }>;

type Rpc =
  | { kind: "request"; id: string; from: string; message: ControlRequest }
  | { kind: "reply"; id: string; to: string; reply: ControlReply }
  | { kind: "host-ready" };

/** The part of BroadcastChannel the worker uses. */
export interface RpcChannel {
  postMessage(message: unknown): void;
  onmessage: ((event: MessageEvent) => void) | null;
  close(): void;
}

/** The part of the Web Locks API the worker uses. */
export interface Locks {
  request(name: string, callback: () => Promise<unknown>): Promise<unknown>;
}

export interface HostWorkerOptions {
  runtime: SwRuntime;
  /** The storage the runtime uses: it also holds the host lease and the reply log. */
  storage: PodStorage;
  /** `navigator.locks`, when the browser has it; without it a storage lease elects the host. */
  locks?: Locks | undefined;
  /** A fresh channel to the other tabs' workers. */
  channel: () => RpcChannel;
  loadAgents: (slugs: readonly string[]) => Promise<Record<string, AgentHandlers>>;
  /** The storage lease, when there are no Web Locks. Default: 5 s, renewed every second. */
  lease?: { ttlMs: number; renewMs: number };
  /** How long a forwarded request waits for a host. Default 60 s. */
  forwardTimeoutMs?: number;
  /** This worker's id. Default: random, also outside secure contexts. */
  randomId?: () => string;
  now?: () => number;
}

export interface HostWorker {
  /** Answer one message from this worker's page. */
  receive(message: ControlRequest): Promise<ControlReply>;
  isHost(): boolean;
  /** Stop: leave the election (releasing the lock or the lease) and close the channel. */
  close(): void;
}

/** Where the host keeps its recent replies to state-changing requests. */
export const REPLY_LOG_KEY = "hostReplyLog";
const REPLY_LOG_LIMIT = 200;
/** Bodies bigger than this are not kept in the log (a replayed reply then has no body). */
const REPLY_LOG_BODY_LIMIT = 4096;
/** Ids the host remembers in memory. */
const HANDLED_LIMIT = 500;

interface LoggedReply {
  id: string;
  reply: ControlReply;
}

/** A random id. `crypto.randomUUID` exists only in secure contexts; `getRandomValues` everywhere. */
export function randomId(): string {
  const source = globalThis.crypto;
  if (typeof source.randomUUID === "function") return source.randomUUID();
  return Array.from(source.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Requests that change state, so applying one twice differs from applying it once. */
function changesState(message: ControlRequest): boolean {
  switch (message.type) {
    case "seed":
    case "reset":
    case "note":
      return true;
    case "fetch":
      return !SAFE_METHODS.has(message.method.toUpperCase());
    default:
      return false;
  }
}

function forLog(reply: ControlReply): ControlReply {
  const body = reply.ok ? reply.response?.body : null;
  if (!reply.ok || reply.response === undefined || body == null) return reply;
  if (body.byteLength <= REPLY_LOG_BODY_LIMIT) return reply;
  return { ...reply, response: { ...reply.response, body: null } };
}

const settle = (work: Promise<ControlReply>) =>
  work.catch(
    (error: unknown): ControlReply => ({
      error: String((error as Error)?.message ?? error),
      ok: false,
    }),
  );

export function createHostWorker(options: HostWorkerOptions): HostWorker {
  const { runtime, storage } = options;
  const forwardTimeoutMs = options.forwardTimeoutMs ?? 60_000;
  const now = options.now ?? Date.now;
  const lease = options.lease ?? { renewMs: 1000, ttlMs: 5000 };
  const me = (options.randomId ?? randomId)();
  let sequence = 0;
  const rpc = options.channel();
  let isHost = false;
  let closed = false;
  /** The lease tenure this worker hosts under (lease mode). */
  let term = 0;
  let releaseLock: () => void = () => undefined;
  const lockReleased = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  let agents: AgentsMessage | undefined;
  let runner: AgentRunner | undefined;
  let starting: Promise<void> | undefined;
  /** Grows whenever the agents stop, so a start that finishes afterwards does not run them. */
  let agentGeneration = 0;

  /** This worker's requests forwarded to the host and not yet answered: id → message and answer. */
  const outstanding = new Map<
    string,
    { message: ControlRequest; answer(reply: ControlReply): void }
  >();
  /** As host: id → the reply to it, so a resend or a duplicate is answered once. */
  const handled = new Map<string, Promise<ControlReply>>();
  let logWrites: Promise<unknown> = Promise.resolve();

  function remember(id: string, reply: Promise<ControlReply>): void {
    handled.set(id, reply);
    if (handled.size > HANDLED_LIMIT) handled.delete(handled.keys().next().value as string);
  }

  function record(id: string, reply: ControlReply): Promise<unknown> {
    const entry: LoggedReply = { id, reply: forLog(reply) };
    logWrites = logWrites
      .then(async () => {
        const log = (await storage.getMeta<LoggedReply[]>(REPLY_LOG_KEY)) ?? [];
        log.push(entry);
        await storage.putMeta(REPLY_LOG_KEY, log.slice(-REPLY_LOG_LIMIT));
      })
      .catch(() => undefined);
    return logWrites;
  }

  function stopAgents(): void {
    agentGeneration += 1;
    runner?.stop();
    runner = undefined;
    starting = undefined;
  }

  /** Start the agents once, however many `agents` messages arrive while they load. */
  function startAgents(message: AgentsMessage): Promise<void> {
    if (runner !== undefined) return Promise.resolve();
    if (starting !== undefined) return starting;
    const generation = agentGeneration;
    const start = (async () => {
      const host = await runtime.getHost();
      if (host === undefined) throw new Error("send hello first");
      const loaded = await options.loadAgents(message.agents);
      if (generation !== agentGeneration || closed || !isHost) return;
      runner = runAgentsOnHost({ agents: loaded, host, identities: message.identities });
    })();
    starting = start;
    start.catch(() => {
      if (starting === start) starting = undefined;
    });
    return start;
  }

  /** Answer as the host. */
  async function handle(message: ControlRequest): Promise<ControlReply> {
    if (message.type !== "agents") return runtime.handleControl(message);
    agents ??= message;
    await startAgents(message);
    return { ok: true };
  }

  /** Take over as host: restore from storage, load the reply log, announce, answer what waits. */
  async function takeOver(): Promise<void> {
    stopAgents();
    runtime.dropHost();
    handled.clear();
    const log = await storage.getMeta<LoggedReply[]>(REPLY_LOG_KEY).catch(() => undefined);
    for (const { id, reply } of log ?? []) remember(id, Promise.resolve(reply));
    if (closed) return;
    isHost = true;
    rpc.postMessage({ kind: "host-ready" } satisfies Rpc);
    for (const [id, { message, answer }] of [...outstanding]) {
      void serve(id, message).then((reply) => {
        if (reply !== undefined) answer(reply);
      });
    }
    if (agents !== undefined) void startAgents(agents).catch(() => undefined);
  }

  function stepDown(): void {
    isHost = false;
    stopAgents();
    runtime.dropHost();
    handled.clear();
  }

  let elections: Promise<unknown> = Promise.resolve();
  /** Lease mode: claim or renew the lease, taking over or stepping down as the result says. */
  function claim(): Promise<boolean> {
    const run = elections.then(async () => {
      if (closed) return false;
      const held = await storage
        .claimLease(HOST_LOCK, me, lease.ttlMs, now())
        .catch(() => undefined);
      if (closed) return false;
      if (held?.holder === me) {
        // A new tenure means another tab may have hosted in between: restore from storage.
        if (!isHost || held.term !== term) {
          term = held.term;
          await takeOver();
        }
        return true;
      }
      if (isHost) stepDown();
      return false;
    });
    elections = run.catch(() => undefined);
    return run;
  }

  /** Whether this worker may answer as host right now. */
  function confirmHost(): Promise<boolean> | boolean {
    if (!isHost) return false;
    return options.locks === undefined ? claim() : true;
  }

  /** Answer `id` as host, once; undefined when this worker turns out not to be the host. */
  async function serve(id: string, message: ControlRequest): Promise<ControlReply | undefined> {
    const known = handled.get(id);
    if (known !== undefined) return known;
    if (!(await confirmHost())) return undefined;
    const raced = handled.get(id);
    if (raced !== undefined) return raced;
    const reply = settle(handle(message)).then(async (settled) => {
      // Reads are safe to repeat: keep them only while in flight, so big bodies are not held.
      if (changesState(message)) await record(id, settled);
      else if (handled.get(id) === reply) handled.delete(id);
      return settled;
    });
    remember(id, reply);
    return reply;
  }

  function forward(id: string, message: ControlRequest): Promise<ControlReply> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        outstanding.delete(id);
        resolve({ error: "no tab is hosting the pods", ok: false });
      }, forwardTimeoutMs);
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

  rpc.onmessage = (event: MessageEvent) => {
    const data = event.data as Rpc;
    if (closed) return;
    if (data.kind === "request" && isHost) {
      void serve(data.id, data.message).then((reply) => {
        if (reply !== undefined && !closed)
          rpc.postMessage({ id: data.id, kind: "reply", reply, to: data.from } satisfies Rpc);
      });
    } else if (data.kind === "reply" && data.to === me) {
      outstanding.get(data.id)?.answer(data.reply);
    } else if (data.kind === "host-ready" && !isHost) {
      // A new host took over: send it whatever is unanswered, under the same ids.
      for (const [id, { message }] of outstanding)
        rpc.postMessage({ from: me, id, kind: "request", message } satisfies Rpc);
    }
  };

  let renewal: ReturnType<typeof setInterval> | undefined;
  if (options.locks === undefined) {
    void claim();
    renewal = setInterval(() => void claim(), lease.renewMs);
  } else {
    void options.locks.request(HOST_LOCK, async () => {
      if (closed) return;
      await takeOver();
      await lockReleased;
    });
  }

  return {
    close() {
      if (closed) return;
      const wasHost = isHost;
      closed = true;
      isHost = false;
      if (renewal !== undefined) clearInterval(renewal);
      if (options.locks === undefined && wasHost)
        void storage.claimLease(HOST_LOCK, me, 0, now()).catch(() => undefined);
      stopAgents();
      rpc.close();
      releaseLock();
    },
    isHost: () => isHost,
    async receive(message) {
      if (message?.type === "agents") agents ??= message;
      sequence += 1;
      const id = `${me}:${sequence}`;
      if (isHost) {
        const reply = await serve(id, message);
        if (reply !== undefined) return reply;
      }
      return forward(id, message);
    },
  };
}

/**
 * Run the role in this dedicated worker: answer the page on the port each message carries. The
 * message listener goes in first, so a page's first message is answered even if setting up the
 * host fails (it then gets the error).
 */
export function startHostWorker(setup: () => { runtime: SwRuntime; storage: PodStorage }): void {
  let worker: HostWorker | undefined;
  let failure = "the pod host worker is not running";
  self.addEventListener("message", (event: MessageEvent) => {
    const port = event.ports[0];
    const reply: Promise<ControlReply> =
      worker === undefined
        ? Promise.resolve({ error: failure, ok: false })
        : worker.receive(event.data as ControlRequest);
    // Posted as a copy, never transferred: the host keeps replies to answer resends.
    void reply.then((settled) => port?.postMessage(settled));
  });
  try {
    const { runtime, storage } = setup();
    worker = createHostWorker({
      channel: () => new BroadcastChannel(HOST_RPC_CHANNEL),
      loadAgents: async (slugs) => (await import("./agent-worker.js")).loadAgents(slugs),
      locks: (navigator as Navigator & { locks?: LockManager }).locks,
      runtime,
      storage,
    });
  } catch (error) {
    failure = `the pod host worker could not start: ${String((error as Error)?.message ?? error)}`;
  }
}
