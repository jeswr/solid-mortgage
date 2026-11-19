// AUTHORED-BY Claude Opus 5.5
/**
 * Change notification (runtime service): subscribing needs Read access as the pod server decides
 * it; after a write the pod server accepted, each subscriber gets a `notified` note and its agent's
 * `changed` handler runs; the read that follows is an ordinary request, so a subscriber whose grant
 * was withdrawn is refused (403). All against the real wasm.
 */
import type { AppNote, LensEntry } from "@mortgage/demo-kit/contracts";
import { beforeEach, describe, expect, test } from "vitest";
import { grantAccess, revokeAccess } from "../../src/acl.js";
import {
  type AgentContext,
  type ChangeMessage,
  listSubscriptions,
  parseChangeNotice,
  runAgentsOnHost,
  unwatchResource,
  watchResource,
} from "../../src/agents/index.js";
import { memoryStorage, type PodHost, type PodStorage, type Seed } from "../../src/node.js";
import { doc, makeHost, ORIGIN, put, recorder, url, webid } from "../helpers.js";

const ADDRESS = url("alex", "/profile/address");
const AS = "https://www.w3.org/ns/activitystreams#";

/** A seed, so a restart restores the saved pods instead of starting empty. */
const seed: Seed = async (ctx) => [
  {
    body: await doc(ctx.podUrl("alex", "profile/address")),
    contentType: "text/turtle",
    method: "PUT",
    path: "/profile/address",
    pod: "alex",
  },
];
let storage: PodStorage;
let host: PodHost;

async function share(agent: "bank" | "payroll" | "bureau", resource = ADDRESS) {
  const response = await grantAccess({
    fetch: host.fetchAs("alex"),
    grant: { agent: webid(agent), modes: ["Read"] },
    owner: webid("alex"),
    podRoot: url("alex", "/"),
    resourceUrl: resource,
  });
  expect(response.ok).toBe(true);
}

async function withdraw(agent: "bank" | "payroll") {
  const response = await revokeAccess({
    agent: webid(agent),
    fetch: host.fetchAs("alex"),
    owner: webid("alex"),
    podRoot: url("alex", "/"),
    resourceUrl: ADDRESS,
  });
  expect(response.ok).toBe(true);
}

const notes = (all: LensEntry[]) =>
  all.filter((e): e is Extract<LensEntry, { source: "app" }> & AppNote => e.source === "app");

beforeEach(async () => {
  storage = memoryStorage();
  host = makeHost({ seed, storage });
  await host.ready;
});

describe("subscribing", () => {
  test("needs Read access to the topic, asked of the pod server; anonymous gets 401", async () => {
    await expect(watchResource(host.fetchAs("bank"), ADDRESS)).rejects.toThrow(/403/);
    await share("bank");
    const created = await watchResource(host.fetchAs("bank"), ADDRESS);
    expect(created).toMatchObject({ app: "bank", path: "/profile/address", pod: "alex" });
    expect(created.subscriber).toBe("bank");
    expect(host.subscriptions()).toHaveLength(1);
    // Subscribing twice keeps one subscription.
    await watchResource(host.fetchAs("bank"), ADDRESS);
    expect(host.subscriptions()).toHaveLength(1);
    const anonymous = await host.fetchAs(null)(`${ORIGIN}/pods/.runtime/subscriptions`, {
      body: JSON.stringify({ topic: ADDRESS }),
      method: "POST",
    });
    expect(anonymous.status).toBe(401);
  });

  test("an app may only name an organisation app that acts as the caller", async () => {
    await share("bank");
    await expect(watchResource(host.fetchAs("bank"), ADDRESS, { app: "payroll" })).rejects.toThrow(
      /403/,
    );
    await expect(
      watchResource(host.fetchAs("bank"), url("alex", "/profile/address.acl")),
    ).rejects.toThrow(/400/);
    const foreign = await host.fetchAs("bank")(`${ORIGIN}/pods/.runtime/subscriptions`, {
      body: JSON.stringify({ topic: "https://elsewhere.example/pods/alex/x" }),
      method: "POST",
    });
    expect(foreign.status).toBe(400);
  });

  test("subscribing emits no Lens entry and makes no pod request visible as one", async () => {
    await share("bank");
    const log = recorder(host);
    await watchResource(host.fetchAs("bank"), ADDRESS);
    expect(log.all).toEqual([]);
  });

  test("a caller lists and removes only its own subscriptions", async () => {
    await share("bank");
    await share("payroll");
    await watchResource(host.fetchAs("bank"), ADDRESS);
    await watchResource(host.fetchAs("payroll"), ADDRESS);
    expect((await listSubscriptions(host.fetchAs("bank"), ORIGIN)).map((s) => s.app)).toEqual([
      "bank",
    ]);
    await unwatchResource(host.fetchAs("bank"), ADDRESS);
    expect(host.subscriptions().map((s) => s.app)).toEqual(["payroll"]);
  });
});

describe("notifying", () => {
  test("a write the pod accepted notifies each subscriber once, with no data, and not the writer", async () => {
    await share("bank");
    await share("payroll");
    await watchResource(host.fetchAs("bank"), ADDRESS);
    await watchResource(host.fetchAs("payroll"), ADDRESS);
    const log = recorder(host);
    expect(
      (
        await put(
          host.fetchAs("alex"),
          ADDRESS,
          await doc(ADDRESS, "https://schema.org/PostalAddress"),
        )
      ).status,
    ).toBe(204);
    const sent = notes(log.all);
    expect(sent.map((n) => [n.kind, n.org])).toEqual([
      ["notified", "bank"],
      ["notified", "payroll"],
    ]);
    for (const n of sent) {
      expect(n.refs).toEqual([ADDRESS, ADDRESS, `${AS}Update`]);
      expect(n.text).toMatch(/demo runtime; the Solid Notifications Protocol in production/);
      expect(parseChangeNotice(n)).toEqual({ activity: "Update", topic: ADDRESS, url: ADDRESS });
    }
    // The write event comes first: the notice follows what the pod saw.
    expect(log.all[0]?.source).toBe("pod");
  });

  test("a refused or failed write notifies nobody", async () => {
    await share("bank");
    await watchResource(host.fetchAs("bank"), ADDRESS);
    const log = recorder(host);
    expect((await put(host.fetchAs("payroll"), ADDRESS, await doc(ADDRESS))).status).toBe(403);
    expect(
      (
        await host.fetchAs("alex")(ADDRESS, {
          body: "not turtle {",
          headers: { "content-type": "text/turtle" },
          method: "PUT",
        })
      ).status,
    ).toBeGreaterThanOrEqual(400);
    expect(notes(log.all)).toEqual([]);
  });

  test("a container topic reports members created and deleted", async () => {
    const container = url("alex", "/profile/");
    await share("bank", container);
    await watchResource(host.fetchAs("bank"), container);
    const log = recorder(host);
    const created = await host.fetchAs("alex")(container, {
      body: await doc(`${container}x`),
      headers: { "content-type": "text/turtle" },
      method: "POST",
    });
    expect(created.status).toBe(201);
    const member = created.headers.get("location") as string;
    expect((await host.fetchAs("alex")(member, { method: "DELETE" })).status).toBeLessThan(300);
    expect(notes(log.all).map((n) => [n.refs?.[1], n.refs?.[2]])).toEqual([
      [member, `${AS}Create`],
      [member, `${AS}Delete`],
    ]);
  });

  test("subscriptions survive a restart over the same storage and end with a reset", async () => {
    await share("bank");
    await watchResource(host.fetchAs("bank"), ADDRESS);
    const restarted = makeHost({ seed, storage });
    await restarted.ready;
    expect(restarted.subscriptions().map((s) => s.app)).toEqual(["bank"]);
    // The grant survived too: the pod server still lets the bank read.
    expect((await restarted.fetchAs("bank")(ADDRESS)).status).toBe(200);
    const log = recorder(restarted);
    await put(restarted.fetchAs("alex"), ADDRESS, await doc(ADDRESS));
    expect(notes(log.all)).toHaveLength(1);
    await restarted.reset();
    expect(restarted.subscriptions()).toEqual([]);
  });
});

describe("the change handler", () => {
  test("subscribers read the change; one whose grant was withdrawn is refused (403)", async () => {
    await share("bank");
    await share("payroll");
    const reads: string[] = [];
    const changed = async (message: ChangeMessage, ctx: AgentContext) => {
      const response = await ctx.podFetch(message.url);
      reads.push(`${ctx.app} ${message.activity} ${response.status}`);
    };
    const runner = runAgentsOnHost({
      agents: {
        bank: {
          changed,
          inbox: async (_m, ctx) => ctx.watch(ADDRESS),
        },
        payroll: { changed },
      },
      host,
    });
    // The bank subscribes from its agent (after hearing of its grant); payroll from its page.
    await put(host.fetchAs("bank"), url("bank", "/inbox/"), "");
    await grantAccess({
      fetch: host.fetchAs("bank"),
      grant: { agent: webid("alex"), modes: ["Append"] },
      owner: webid("bank"),
      podRoot: url("bank", "/"),
      resourceUrl: url("bank", "/inbox/"),
    });
    await host.fetchAs("alex")(url("bank", "/inbox/"), {
      body: await doc(url("bank", "/inbox/grant")),
      headers: { "content-type": "text/turtle" },
      method: "POST",
    });
    await runner.idle();
    await watchResource(host.fetchAs("payroll"), ADDRESS);
    expect(
      host
        .subscriptions()
        .map((s) => s.app)
        .sort(),
    ).toEqual(["bank", "payroll"]);

    const log = recorder(host);
    await put(host.fetchAs("alex"), ADDRESS, await doc(ADDRESS));
    await runner.idle();
    expect(reads.sort()).toEqual(["bank Update 200", "payroll Update 200"]);

    await withdraw("bank");
    reads.length = 0;
    await put(
      host.fetchAs("alex"),
      ADDRESS,
      await doc(ADDRESS, "https://schema.org/PostalAddress"),
    );
    await runner.idle();
    expect(reads.sort()).toEqual(["bank Update 403", "payroll Update 200"]);
    const denied = log.events.filter((e) => e.kind === "denied");
    expect(denied).toHaveLength(1);
    expect(denied[0]).toMatchObject({
      actor: { org: "bank", viaAgent: true },
      path: "/profile/address",
      status: 403,
    });
    runner.stop();
  });
});
