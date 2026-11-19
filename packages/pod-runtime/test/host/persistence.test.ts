// AUTHORED-BY Claude Opus 5.5
/** Snapshots as the persistence: restart, seed, reset, events and notes. */
import { describe, expect, test } from "vitest";
import { aclDocument } from "../../src/acl.js";
import { memoryStorage, type Seed } from "../../src/node.js";
import { doc, makeHost, put, recorder, url, webid } from "../helpers.js";

const seed: Seed = async (ctx) => [
  {
    body: await doc(ctx.podUrl("alex", "documents/id")),
    contentType: "text/turtle",
    method: "PUT",
    path: "/documents/id",
    pod: "alex",
  },
  {
    body: await aclDocument({
      aclUrl: ctx.podUrl("alex", "documents/.acl"),
      grants: [{ agent: ctx.webid("bank"), modes: ["Read"] }],
      owner: ctx.webid("alex"),
    }),
    contentType: "text/turtle",
    method: "PUT",
    path: "/documents/.acl",
    pod: "alex",
  },
  {
    body: await doc(ctx.podUrl("bank", "statements/1")),
    contentType: "text/turtle",
    method: "PUT",
    path: "/statements/1",
    pod: "bank",
  },
];

async function listing(f: typeof fetch, container: string): Promise<string> {
  return (await f(container, { headers: { accept: "text/turtle" } })).text();
}

describe("seed", () => {
  test("the seed runs once, as each pod's owner, and emits no events", async () => {
    const storage = memoryStorage();
    const host = makeHost({ seed, storage });
    await host.ready;
    expect((await host.info()).seeded).toBe(true);
    expect(await host.events()).toEqual([]);
    expect((await host.fetchAs("bank")(url("alex", "/documents/id"))).status).toBe(200);
    expect((await host.fetchAs("bank")(url("bank", "/statements/1"))).status).toBe(200);
    expect(await host.applySeed(seed)).toBe(false);
  });

  test("a seed that would drop the owner's Control fails loudly", async () => {
    const bad: Seed = async (ctx) => [
      {
        body: await aclDocument({ aclUrl: ctx.podUrl("alex", ".acl"), owner: ctx.webid("bank") }),
        contentType: "text/turtle",
        method: "PUT",
        path: "/.acl",
        pod: "alex",
      },
    ];
    await expect(makeHost({ seed: bad }).ready).rejects.toThrow(/acl:Control/);
  });

  test("a late seed (the service-worker path: the page builds it) applies once", async () => {
    const host = makeHost();
    await host.ready;
    expect((await host.info()).seeded).toBe(false);
    expect(await host.applySeed(seed)).toBe(true);
    expect(await host.applySeed(seed)).toBe(false);
    expect((await host.fetchAs("alex")(url("alex", "/documents/id"))).status).toBe(200);
  });
});

describe("restart from snapshots", () => {
  test("a new host on the same storage has the same resources and ACLs, and restoring emits no events", async () => {
    const storage = memoryStorage();
    const first = makeHost({ seed, storage });
    await first.ready;
    const alex = first.fetchAs("alex");
    await put(alex, url("alex", "/notes/n1"), await doc(url("alex", "/notes/n1")));
    await first.fetchAs("bureau")(url("alex", "/documents/id"));
    const notesBefore = await listing(alex, url("alex", "/notes/"));
    const rootBefore = await listing(alex, url("alex", "/"));
    const eventsBefore = await first.events();

    const second = makeHost({ seed, storage });
    const log = recorder(second);
    await second.ready;
    expect(log.all).toEqual([]);
    expect(await listing(second.fetchAs("alex"), url("alex", "/notes/"))).toBe(notesBefore);
    expect(await listing(second.fetchAs("alex"), url("alex", "/"))).toBe(rootBefore);
    expect((await second.fetchAs("bank")(url("alex", "/documents/id"))).status).toBe(200);
    expect((await second.fetchAs("bureau")(url("alex", "/documents/id"))).status).toBe(403);
    // Four requests through the second host, four events; nothing replayed.
    expect(log.all).toHaveLength(4);
    const ids = (await second.events()).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Event ids continue across the restart.
    expect(log.all[0]?.id).toBe((eventsBefore.at(-1)?.id ?? 0) + 1);
  });
});

describe("reset", () => {
  test("resetDemo returns every pod to the seed and clears the event log", async () => {
    const host = makeHost({ seed });
    await host.ready;
    const alex = host.fetchAs("alex");
    await put(alex, url("alex", "/notes/n1"), await doc(url("alex", "/notes/n1")));
    await alex(url("alex", "/documents/id"), { method: "DELETE" });
    const resets: string[] = [];
    host.subscribe((m) => resets.push(m.type));
    await host.reset();
    expect(resets).toContain("reset");
    expect((await alex(url("alex", "/notes/n1"))).status).toBe(404);
    expect((await alex(url("alex", "/documents/id"))).status).toBe(200);
    expect((await host.events()).map((e) => e.id)).toEqual([1, 2]);
  });
});

describe("events and notes", () => {
  test("each request emits one PodEvent with the demo clock, kind, actor and resource; notes are app entries", async () => {
    const host = makeHost({ clock: () => "2026-09-07T09:00:00.000Z", seed });
    await host.ready;
    const log = recorder(host);
    const target = url("bank", "/statements/2");
    await put(
      host.fetchAs("bank", { tour: { demo: "d", step: "s1" }, viaAgent: true }),
      target,
      await doc(target, "https://schema.org/Invoice"),
    );
    await host.fetchAs("bank")(target, { method: "DELETE" });
    await host.fetchAs("bureau")(url("alex", "/documents/id"));
    await host.fetchAs(null)(url("alex", "/documents/id"));
    const note = await host.note({ kind: "verified", org: "bank", text: "checked a signature" });
    expect(log.events.map((e) => [e.kind, e.method, e.status])).toEqual([
      ["write", "PUT", 201],
      ["delete", "DELETE", 204],
      ["denied", "GET", 403],
    ]);
    expect(log.events[0]).toMatchObject({
      actor: { org: "bank", viaAgent: true, webid: webid("bank") },
      at: "2026-09-07T09:00:00.000Z",
      path: "/statements/2",
      pod: "bank",
      resource: { drawer: "statements", label: "2", types: ["https://schema.org/Invoice"] },
      tour: { demo: "d", step: "s1" },
    });
    expect(note).toMatchObject({ kind: "verified", source: "app", text: "checked a signature" });
    expect(note.id).toBe((log.events.at(-1)?.id ?? 0) + 1);
  });

  test("a POST event names the created resource; a credential's type, issuer and validFrom are read", async () => {
    const host = makeHost({ seed });
    await host.ready;
    const log = recorder(host);
    const vc = JSON.stringify({
      "@id": "",
      "@type": [
        "https://www.w3.org/2018/credentials#VerifiableCredential",
        "https://schema.org/EmployeeRole",
      ],
      "https://www.w3.org/2018/credentials#issuer": { "@id": webid("payroll") },
      "https://www.w3.org/2018/credentials#validFrom": {
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        "@value": "2026-09-07T09:00:00Z",
      },
    });
    const res = await host.fetchAs("alex")(url("alex", "/documents/"), {
      body: vc,
      headers: { "content-type": "application/ld+json" },
      method: "POST",
    });
    expect(res.status).toBe(201);
    const event = log.events.at(-1);
    expect(event?.path).toBe(
      new URL(res.headers.get("location") ?? "").pathname.replace("/pods/alex", ""),
    );
    expect(event?.resource?.credential).toEqual({
      issuer: webid("payroll"),
      type: "https://schema.org/EmployeeRole",
      validFrom: "2026-09-07T09:00:00Z",
    });
  });
});
