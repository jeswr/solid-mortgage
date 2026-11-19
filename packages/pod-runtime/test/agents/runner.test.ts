// AUTHORED-BY Claude Opus 5.5
/** Organisation agents over the real host: inbox writes wake the right agent, acting as its org. */
import { beforeEach, describe, expect, test } from "vitest";
import { grantAccess } from "../../src/acl.js";
import {
  type AgentHandlers,
  defineAgent,
  inboxWrite,
  runAgentsOnHost,
} from "../../src/agents/index.js";
import type { PodHost } from "../../src/node.js";
import { makeHost, put, recorder, url, webid } from "../helpers.js";

let host: PodHost;
beforeEach(async () => {
  host = makeHost({ identities: { "payroll-app": "payroll" } });
  await host.ready;
  const payroll = host.fetchAs("payroll");
  await put(payroll, url("payroll", "/inbox/"), "");
  // Bank may drop things into payroll's inbox, and nothing more.
  const granted = await grantAccess({
    fetch: payroll,
    grant: { agent: webid("bank"), modes: ["Append"] },
    owner: webid("payroll"),
    podRoot: url("payroll", "/"),
    resourceUrl: url("payroll", "/inbox/"),
  });
  expect(granted.ok).toBe(true);
});

const receipt = defineAgent({
  async inbox(message, context) {
    const read = await context.podFetch(message.url);
    await context.podFetch(context.podUrl(context.owner, "/outbox/receipt.txt"), {
      body: `${message.from.org}: ${await read.text()}`,
      headers: { "content-type": "text/plain" },
      method: "PUT",
    });
    // Its own inbox bookkeeping must not wake it again.
    await context.podFetch(context.podUrl(context.owner, "/inbox/"), {
      body: "seen",
      headers: { "content-type": "text/plain" },
      method: "POST",
    });
    context.note({ kind: "org-to-org", org: "payroll", text: "receipt sent" });
  },
} satisfies AgentHandlers);

describe("agents", () => {
  test("a write to an organisation's inbox runs its agent, which acts as that organisation", async () => {
    const calls: string[] = [];
    const runner = runAgentsOnHost({
      agents: {
        "payroll-app": {
          inbox: async (message, context) => {
            calls.push(message.path);
            await receipt.inbox(message, context);
          },
        },
      },
      host,
      identities: { "payroll-app": "payroll" },
    });
    const log = recorder(host);
    const posted = await host.fetchAs("bank")(url("payroll", "/inbox/"), {
      body: "statement please",
      headers: { "content-type": "text/plain" },
      method: "POST",
    });
    expect(posted.status).toBe(201);
    await runner.idle();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatch(/^\/inbox\/.+/);

    const written = await host.fetchAs("payroll")(url("payroll", "/outbox/receipt.txt"));
    expect(await written.text()).toBe("bank: statement please");
    const agentWrites = log.events.filter((e) => e.actor.viaAgent);
    expect(agentWrites.length).toBeGreaterThanOrEqual(3);
    expect(agentWrites.every((e) => e.actor.org === "payroll")).toBe(true);
    expect(log.all.some((e) => e.source === "app" && e.text === "receipt sent")).toBe(true);
    // The bank cannot read what it appended, and the agent's view does not leak to it.
    expect((await host.fetchAs("bank")(url("payroll", "/outbox/receipt.txt"))).status).toBe(403);
    runner.stop();
  });

  test("other pods' inboxes, reads, refused writes and ACL writes do not wake the agent", async () => {
    const calls: string[] = [];
    const runner = runAgentsOnHost({
      agents: { payroll: { inbox: (message) => void calls.push(message.path) } },
      host,
    });
    const bank = host.fetchAs("bank");
    await put(bank, url("bank", "/inbox/"), "");
    await bank(url("bank", "/inbox/"), {
      body: "x",
      headers: { "content-type": "text/plain" },
      method: "POST",
    });
    // Append does not allow PUT: refused, so nothing happened.
    expect((await put(bank, url("payroll", "/inbox/direct.txt"), "x", "text/plain")).status).toBe(
      403,
    );
    await host.fetchAs("payroll")(url("payroll", "/inbox/"));
    await runner.idle();
    expect(calls).toEqual([]);
    runner.stop();
  });

  test("a failing handler is reported and the next message is still handled", async () => {
    const errors: unknown[] = [];
    let count = 0;
    const runner = runAgentsOnHost({
      agents: {
        payroll: {
          inbox: () => {
            count += 1;
            if (count === 1) throw new Error("boom");
          },
        },
      },
      host,
      onError: (error) => errors.push(error),
    });
    const bank = host.fetchAs("bank");
    for (const body of ["one", "two"])
      await bank(url("payroll", "/inbox/"), {
        body,
        headers: { "content-type": "text/plain" },
        method: "POST",
      });
    await runner.idle();
    expect(count).toBe(2);
    expect(errors).toHaveLength(1);
    runner.stop();
  });

  test("inboxWrite recognises only successful writes of inbox members", () => {
    const base = {
      actor: { org: "bank" as const, viaAgent: false, webid: webid("bank") },
      at: "2026-01-05T09:00:00.000Z",
      id: 1,
      kind: "write" as const,
      method: "POST",
      path: "/inbox/a",
      pod: "payroll" as const,
      source: "pod" as const,
      status: 201,
    };
    expect(inboxWrite(base)).toBeDefined();
    expect(inboxWrite({ ...base, status: 403, kind: "denied" })).toBeUndefined();
    expect(inboxWrite({ ...base, path: "/inbox/" })).toBeUndefined();
    expect(inboxWrite({ ...base, path: "/inbox/.acl" })).toBeUndefined();
    expect(inboxWrite({ ...base, path: "/outbox/a" })).toBeUndefined();
    expect(inboxWrite({ ...base, method: "DELETE", kind: "delete" })).toBeUndefined();
  });
});
