// AUTHORED-BY Claude Opus 5.5
/**
 * The fallback host worker (no service worker): several "tabs" in one process, each with its own
 * runtime over the REAL Node wasm, sharing one storage and one BroadcastChannel name, the way
 * dedicated workers in several tabs share IndexedDB and a channel. Nothing here mocks the pod or
 * the access check; only the Web Locks API is replaced, by a FIFO lock manager with the same rules.
 */
import type { PodOwner } from "@mortgage/demo-kit/registry";
import { afterEach, describe, expect, test } from "vitest";
import { grantAccess } from "../../src/acl.js";
import type { AgentHandlers } from "../../src/agents/runner.js";
import { memoryStorage, nodeWasmModule, type PodStorage } from "../../src/node.js";
import { AGENT_HEADER, type ControlReply, type ControlRequest } from "../../src/protocol.js";
import {
  createHostWorker,
  type HostWorker,
  type HostWorkerOptions,
  type Locks,
} from "../../src/sw/host-worker.js";
import { createSwRuntime } from "../../src/sw/runtime.js";
import { doc, ORIGIN, OWNERS, url, webid } from "../helpers.js";

/** Web Locks semantics: one holder per name, granted in request order, held until the callback settles. */
function fifoLocks(): Locks {
  const tails = new Map<string, Promise<unknown>>();
  return {
    request(name, callback) {
      const run = (tails.get(name) ?? Promise.resolve()).then(() => callback());
      tails.set(
        name,
        run.catch(() => undefined),
      );
      return run;
    },
  };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check: () => boolean, ms = 5000): Promise<void> {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error("timed out waiting");
    await wait(5);
  }
}

const opened: HostWorker[] = [];
const channels: BroadcastChannel[] = [];
afterEach(() => {
  for (const worker of opened.splice(0)) worker.close();
  for (const channel of channels.splice(0)) channel.close();
});

let channelCount = 0;
interface World {
  storage: PodStorage;
  name: string;
  tab(extra?: Partial<HostWorkerOptions>): HostWorker;
}
function world(locks: Locks | undefined): World {
  const storage = memoryStorage();
  const name = `host-worker-test-${channelCount++}`;
  return {
    name,
    storage,
    tab(extra = {}) {
      const runtime = createSwRuntime({
        compile: async () => nodeWasmModule(),
        origin: ORIGIN,
        storage,
      });
      const worker = createHostWorker({
        channel: () => new BroadcastChannel(name) as never,
        loadAgents: async () => ({}),
        locks,
        runtime,
        storage,
        ...extra,
      });
      opened.push(worker);
      return worker;
    },
  };
}

const hello = (identities: Record<string, PodOwner> = {}): ControlRequest => ({
  identities,
  owners: OWNERS,
  type: "hello",
});

/** What a page does first: hello, then the (here empty) seed. An unseeded host starts blank. */
async function start(worker: HostWorker, identities: Record<string, PodOwner> = {}) {
  await ok(worker.receive(hello(identities)));
  await ok(worker.receive({ requests: [], type: "seed" }));
}

function fetchMessage(
  identity: string,
  method: string,
  target: string,
  body?: string,
  contentType = "text/turtle",
): ControlRequest {
  const headers: Array<[string, string]> = [[AGENT_HEADER, identity]];
  if (body !== undefined) headers.push(["content-type", contentType]);
  return {
    body: body === undefined ? null : (new TextEncoder().encode(body).buffer as ArrayBuffer),
    headers,
    method,
    type: "fetch",
    url: target,
  };
}

async function ok(reply: Promise<ControlReply>): Promise<ControlReply & { ok: true }> {
  const settled = await reply;
  if (!settled.ok) throw new Error(settled.error);
  return settled;
}

async function send(
  worker: HostWorker,
  identity: string,
  method: string,
  target: string,
  body?: string,
): Promise<number> {
  const reply = await ok(worker.receive(fetchMessage(identity, method, target, body)));
  return reply.response?.status ?? 0;
}

/** A fetch whose requests go through `worker` as `identity`. */
function fetchThrough(worker: HostWorker, identity: string): typeof fetch {
  return async (input, init) => {
    const request = new Request(input, init);
    const body = ["GET", "HEAD"].includes(request.method) ? null : await request.arrayBuffer();
    const headers: Array<[string, string]> = [...request.headers, [AGENT_HEADER, identity]];
    const reply = await ok(
      worker.receive({ body, headers, method: request.method, type: "fetch", url: request.url }),
    );
    const response = reply.response;
    if (response === undefined) throw new Error("no response");
    return new Response(response.body, { headers: response.headers, status: response.status });
  };
}

/** POSTs that created something under `container` (a pod path such as `/notes/`). */
async function postsTo(storage: PodStorage, container: string): Promise<number> {
  return (await storage.events()).filter(
    (entry) =>
      entry.source === "pod" &&
      entry.method === "POST" &&
      entry.status === 201 &&
      entry.path.startsWith(container),
  ).length;
}

describe("fallback host worker", () => {
  test("without Web Locks, a storage lease elects exactly one host and the tabs share its state", async () => {
    const w = world(undefined);
    const lease = { renewMs: 50, ttlMs: 400 };
    const tabs = [w.tab({ lease }), w.tab({ lease }), w.tab({ lease })];
    await until(() => tabs.some((tab) => tab.isHost()));
    await wait(120);
    expect(tabs.filter((tab) => tab.isHost())).toHaveLength(1);
    await start(tabs[0] as HostWorker);
    for (const tab of tabs) await ok(tab.receive(hello()));
    expect(
      await send(
        tabs[1] as HostWorker,
        "bank",
        "PUT",
        url("bank", "/shared"),
        await doc(url("bank", "/shared")),
      ),
    ).toBe(201);
    for (const tab of tabs)
      expect(await send(tab, "bank", "GET", url("bank", "/shared"))).toBe(200);
  });

  test("without Web Locks, hosting moves on when the leaseholder closes or stops renewing", async () => {
    const w = world(undefined);
    // The first tab is "suspended": it claims once and then never renews.
    const stalled = w.tab({ lease: { renewMs: 60_000, ttlMs: 150 } });
    await until(() => stalled.isHost());
    const other = w.tab({ lease: { renewMs: 20, ttlMs: 150 } });
    await start(stalled);
    expect(
      await send(stalled, "bank", "PUT", url("bank", "/one"), await doc(url("bank", "/one"))),
    ).toBe(201);
    await until(() => other.isHost());
    // The stalled tab wakes up: it must find it lost the lease and forward instead of writing to
    // its stale pods.
    expect(
      await send(stalled, "bank", "PUT", url("bank", "/two"), await doc(url("bank", "/two"))),
    ).toBe(201);
    expect(stalled.isHost()).toBe(false);
    expect(await send(other, "bank", "GET", url("bank", "/one"))).toBe(200);
    expect(await send(other, "bank", "GET", url("bank", "/two"))).toBe(200);
    // Closing releases the lease, so the next tab takes over without waiting for it to expire.
    const third = w.tab({ lease: { renewMs: 20, ttlMs: 60_000 } });
    other.close();
    await until(() => third.isHost(), 1000);
    expect(await send(third, "bank", "GET", url("bank", "/two"))).toBe(200);
  });

  test("a request in flight when the host changes is applied once", async () => {
    const w = world(fifoLocks());
    const first = w.tab();
    const second = w.tab();
    const third = w.tab();
    await until(() => first.isHost());
    await start(third);
    expect(await send(third, "bank", "PUT", url("bank", "/notes/"), "")).toBe(201);
    // The hosting tab closes as a POST is on its way: the next host gets the queued request AND the
    // resend after its host-ready.
    const posted = send(third, "bank", "POST", url("bank", "/notes/"), await doc("#it"));
    first.close();
    expect(await posted).toBe(201);
    expect(second.isHost()).toBe(true);
    await wait(100);
    expect(await postsTo(w.storage, "/notes/")).toBe(1);
  });

  test("a resend of a request the old host already applied gets the old reply, not a second write", async () => {
    const w = world(fifoLocks());
    const first = w.tab();
    const second = w.tab();
    const third = w.tab();
    await until(() => first.isHost());
    const spy = new BroadcastChannel(w.name);
    channels.push(spy);
    const requests: unknown[] = [];
    const replies = new Map<string, ControlReply>();
    spy.onmessage = (event: MessageEvent) => {
      const data = event.data as { kind: string; id: string; reply?: ControlReply };
      if (data.kind === "request") requests.push(data);
      if (data.kind === "reply" && data.reply) replies.set(data.id, data.reply);
    };
    await start(third);
    expect(await send(third, "bank", "PUT", url("bank", "/notes/"), "")).toBe(201);
    const before = requests.length;
    const created = await ok(
      third.receive(fetchMessage("bank", "POST", url("bank", "/notes/"), await doc("#it"))),
    );
    expect(created.response?.status).toBe(201);
    await until(() => requests.length > before);
    const post = requests[before] as { id: string };
    // The old host applied the POST but (as far as the follower knows) its reply was lost; it
    // closes and the follower sends the same request again to the new host.
    first.close();
    await until(() => second.isHost());
    replies.delete(post.id);
    spy.postMessage(post);
    await until(() => replies.has(post.id));
    const again = replies.get(post.id) as ControlReply & { ok: true };
    expect(again.response?.status).toBe(201);
    expect(new Headers(again.response?.headers).get("location")).toBe(
      new Headers(created.response?.headers).get("location"),
    );
    expect(await postsTo(w.storage, "/notes/")).toBe(1);
  });

  test("two agents messages at once start one runner", async () => {
    const calls: string[] = [];
    let loads = 0;
    const handlers: Record<string, AgentHandlers> = {
      "payroll-app": {
        inbox: (message) => {
          calls.push(message.path);
        },
      },
    };
    const w = world(fifoLocks());
    const tab = w.tab({
      loadAgents: async () => {
        loads++;
        await wait(30);
        return handlers;
      },
    });
    await until(() => tab.isHost());
    const identities: Record<string, PodOwner> = { "payroll-app": "payroll" };
    await start(tab, identities);
    expect(await send(tab, "payroll", "PUT", url("payroll", "/inbox/"), "")).toBe(201);
    const granted = await grantAccess({
      fetch: fetchThrough(tab, "payroll"),
      grant: { agent: webid("bank"), modes: ["Append"] },
      owner: webid("payroll"),
      podRoot: url("payroll", "/"),
      resourceUrl: url("payroll", "/inbox/"),
    });
    expect(granted.ok).toBe(true);
    const runAgents: ControlRequest = { agents: ["payroll-app"], identities, type: "agents" };
    await Promise.all([ok(tab.receive(runAgents)), ok(tab.receive(runAgents))]);
    const posted = await ok(
      tab.receive(
        fetchMessage("bank", "POST", url("payroll", "/inbox/"), "statement please", "text/plain"),
      ),
    );
    expect(posted.response?.status).toBe(201);
    await until(() => calls.length > 0);
    await wait(100);
    expect(calls).toHaveLength(1);
    expect(loads).toBe(1);
  });

  test("works where crypto.randomUUID does not exist (plain HTTP is not a secure context)", async () => {
    const original = Object.getOwnPropertyDescriptor(crypto, "randomUUID");
    Object.defineProperty(crypto, "randomUUID", { configurable: true, value: undefined });
    try {
      const w = world(fifoLocks());
      const host = w.tab();
      const follower = w.tab();
      await until(() => host.isHost());
      await start(follower);
      expect(await send(follower, "bank", "GET", url("bank", "/profile/card"))).toBe(200);
    } finally {
      if (original === undefined) delete (crypto as { randomUUID?: unknown }).randomUUID;
      else Object.defineProperty(crypto, "randomUUID", original);
    }
  });
});
