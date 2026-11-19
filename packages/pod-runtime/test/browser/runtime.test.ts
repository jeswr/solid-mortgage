// AUTHORED-BY Claude Opus 5.5
/**
 * The runtime in a real browser: the built `dist/pods-sw.js` in Chrome, a fixture page using the
 * built client, a fixture agent. Skipped (with a message) when dist/ or a Chrome is missing.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AGENT_JS, buildPage, call, close, launch, PAGE_HTML, SW, serve } from "./support.js";

let browser: Browser | undefined;
let server: Server | undefined;
let origin = "";
let out = "";
let skipReason: string | undefined;
/** Pod owners in the padded cold-start test (`POD_RUNTIME_PAD` overrides it, to measure). */
const PADDED_OWNERS = Number(process.env.POD_RUNTIME_PAD ?? 30);

beforeAll(async () => {
  if (!existsSync(SW)) {
    skipReason = "dist/pods-sw.js is missing (run the build first)";
    return;
  }
  browser = await launch();
  if (browser === undefined) {
    skipReason = "no Chrome or Playwright Chromium available";
    return;
  }
  out = mkdtempSync(join(tmpdir(), "pod-runtime-browser-"));
  const files: Record<string, [string, string]> = {
    "/": ["text/html", PAGE_HTML],
    "/agents/bank.js": ["text/javascript", AGENT_JS],
    "/page.js": ["text/javascript", await buildPage(out)],
    "/pods-sw.js": ["text/javascript", readFileSync(SW, "utf8")],
    "/site.json": ["application/json", JSON.stringify({ agents: ["bank"] })],
  };
  server = await serve((_, path) => files[path], 0);
  // localhost (not 127.0.0.1) so the page is a secure context by name as well as by address.
  origin = `http://localhost:${(server.address() as AddressInfo).port}`;
}, 120_000);

afterAll(async () => {
  await browser?.close();
  await close(server);
  if (out) rmSync(out, { force: true, recursive: true });
});

async function open(context: BrowserContext, query = ""): Promise<Page> {
  const page = await context.newPage();
  page.on("pageerror", (error) => console.error("page error:", error.message));
  await page.goto(`${origin}/${query}`);
  await page.waitForFunction(() => "rt" in globalThis);
  return page;
}

type Rt = typeof import("../../src/index.js");
declare const rt: Rt;
declare const acl: typeof import("../../src/acl.js");
declare const events: Array<{
  source: string;
  kind?: string;
  path?: string;
  actor?: { viaAgent: boolean };
}>;

describe("pod runtime in Chrome", () => {
  it("starts cold within 3 s, under a service worker, seeded", async (ctx) => {
    if (skipReason) return ctx.skip(skipReason);
    const context = await (browser as Browser).newContext();
    const page = await open(context);
    const { elapsed, info } = await page.evaluate(async () => {
      const info = await rt.ready();
      // performance.now() counts from navigation start: page load, install, wasm compile, seed.
      return { elapsed: performance.now(), info };
    });
    console.log(`cold start, ${info.owners.length} pod owners: ${Math.round(elapsed)} ms`);
    expect(info.mode).toBe("service-worker");
    expect(info.seeded).toBe(true);
    expect(elapsed).toBeLessThan(3000);
    const seeded = await call(page, "GET", "/pods/bank/documents/seeded.txt");
    expect(seeded).toEqual({ body: "seeded text", status: 200 });
    // A plain fetch carries no identity: the service worker answers it, anonymously.
    const anonymous = await page.evaluate(
      async () => (await fetch("/pods/bank/documents/seeded.txt")).status,
    );
    expect(anonymous).toBe(401);
    await context.close();
  });

  it("starts cold within 3 s with 30 pod owners, and every pod is there", async (ctx) => {
    if (skipReason) return ctx.skip(skipReason);
    const context = await (browser as Browser).newContext();
    // The registry grows with every demo; hold the budget at a size it has not reached yet.
    const page = await open(context, `?pad=${PADDED_OWNERS}`);
    const { elapsed, info } = await page.evaluate(async () => {
      const info = await rt.ready();
      return { elapsed: performance.now(), info };
    });
    console.log(`cold start, ${info.owners.length} pod owners: ${Math.round(elapsed)} ms`);
    expect(info.owners).toHaveLength(PADDED_OWNERS);
    expect(info.owners).toContain("extra-01");
    expect(info.mode).toBe("service-worker");
    expect(info.seeded).toBe(true);
    expect(elapsed).toBeLessThan(3000);
    // The seed is in place, and a pod the seed never touched has its baseline: an owner-only
    // root and a public profile.
    expect(await call(page, "GET", "/pods/bank/documents/seeded.txt")).toEqual({
      body: "seeded text",
      status: 200,
    });
    const last = info.owners.at(-1) as string;
    expect(last).toMatch(/^extra-\d\d$/);
    const profile = await page.evaluate(async (owner) => {
      const response = await fetch(`/pods/${owner}/profile/card`);
      return { body: await response.text(), status: response.status };
    }, last);
    expect(profile.status).toBe(200);
    expect(profile.body).toContain(`/pods/${last}/`);
    expect(
      await page.evaluate(async (owner) => (await fetch(`/pods/${owner}/`)).status, last),
    ).toBe(401);
    // A write to a pod made after the start is saved like any other: it survives a reload.
    // (As the pod's owner: a plain fetch with the path-mode identity header.)
    const created = await page.evaluate(
      async (owner) =>
        (
          await fetch(`/pods/${owner}/notes/a.txt`, {
            body: "kept",
            headers: { "content-type": "text/plain", "x-demo-agent": owner },
            method: "PUT",
          })
        ).status,
      last,
    );
    expect(created).toBe(201);
    await page.reload();
    await page.waitForFunction(() => "rt" in globalThis);
    const kept = await page.evaluate(async (owner) => {
      const response = await fetch(`/pods/${owner}/notes/a.txt`, {
        headers: { "x-demo-agent": owner },
      });
      return { body: await response.text(), status: response.status };
    }, last);
    expect(kept).toEqual({ body: "kept", status: 200 });
    await context.close();
  });

  it("keeps state across a reload and a stopped service worker", async (ctx) => {
    if (skipReason) return ctx.skip(skipReason);
    const context = await (browser as Browser).newContext();
    let page = await open(context);
    await page.evaluate(() => rt.ready());
    expect(
      (await call(page, "PUT", "/pods/bank/notes/a.txt", "first", { "content-type": "text/plain" }))
        .status,
    ).toBe(201);
    await page.reload();
    await page.waitForFunction(() => "rt" in globalThis);
    expect(await call(page, "GET", "/pods/bank/notes/a.txt")).toEqual({
      body: "first",
      status: 200,
    });

    const cdp = await context.newCDPSession(page);
    await cdp.send("ServiceWorker.enable");
    await cdp.send("ServiceWorker.stopAllWorkers");
    expect(await call(page, "GET", "/pods/bank/notes/a.txt")).toEqual({
      body: "first",
      status: 200,
    });
    // A new page after the stop restores from the snapshot too.
    page = await open(context);
    expect(await call(page, "GET", "/pods/bank/notes/a.txt")).toEqual({
      body: "first",
      status: 200,
    });
    // The nesting guard answers before the wasm sees the body, and the pod keeps serving.
    const bomb = `${"[".repeat(2000)}${"]".repeat(2000)}`;
    expect(
      (
        await call(page, "PUT", "/pods/bank/notes/b.json", bomb, {
          "content-type": "application/ld+json",
        })
      ).status,
    ).toBe(400);
    expect((await call(page, "GET", "/pods/bank/notes/a.txt")).status).toBe(200);
    await context.close();
  });

  it("shares writes and events between two tabs", async (ctx) => {
    if (skipReason) return ctx.skip(skipReason);
    const context = await (browser as Browser).newContext();
    const one = await open(context);
    await one.evaluate(() => rt.ready());
    const two = await open(context, "?app=payroll");
    await two.evaluate(() => rt.ready());
    expect(
      (
        await call(one, "PUT", "/pods/bank/shared/x.txt", "from one", {
          "content-type": "text/plain",
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await call(two, "PUT", "/pods/payroll/shared/y.txt", "from two", {
          "content-type": "text/plain",
        })
      ).status,
    ).toBe(201);
    // Tab two acts as payroll: bank's resource is refused to it, and its own is visible to it.
    expect((await call(two, "GET", "/pods/bank/shared/x.txt")).status).toBe(403);
    expect(await call(two, "GET", "/pods/payroll/shared/y.txt")).toEqual({
      body: "from two",
      status: 200,
    });
    const seen = (page: Page) =>
      page.waitForFunction(
        () =>
          ["/shared/x.txt", "/shared/y.txt"].every((path) =>
            events.some((e) => e.source === "pod" && e.kind === "write" && e.path === path),
          ),
        undefined,
        { timeout: 5000 },
      );
    await Promise.all([seen(one), seen(two)]);
    await context.close();
  });

  it("runs an organisation agent on an inbox write", async (ctx) => {
    if (skipReason) return ctx.skip(skipReason);
    const context = await (browser as Browser).newContext();
    const page = await open(context);
    await page.evaluate(() => rt.ready());
    // A second tab starts its own agent worker; the Web Lock keeps it on standby.
    const other = await open(context, "?app=payroll");
    await other.evaluate(() => rt.ready());
    const posted = await call(page, "POST", "/pods/bank/inbox/", "hello", {
      "content-type": "text/plain",
    });
    expect(posted.status).toBe(201);
    await page.waitForFunction(
      () =>
        events.some(
          (e) => e.source === "pod" && e.path === "/outbox/receipt.txt" && e.actor?.viaAgent,
        ),
      undefined,
      { timeout: 10_000 },
    );
    const receipt = await call(page, "GET", "/pods/bank/outbox/receipt.txt");
    expect(receipt.status).toBe(200);
    expect(receipt.body).toMatch(/^received \/inbox\/.+ from bank$/);
    await page.waitForFunction(() => events.some((e) => e.source === "app"), undefined, {
      timeout: 5000,
    });
    await page.waitForTimeout(500);
    const handled = await page.evaluate(
      () =>
        events.filter(
          (e) => e.source === "pod" && e.kind === "write" && e.path === "/outbox/receipt.txt",
        ).length,
    );
    expect(handled).toBe(1);
    await context.close();
  });

  it("notifies a subscribed agent of a change and closes a one-time grant after one read", async (ctx) => {
    if (skipReason) return ctx.skip(skipReason);
    const context = await (browser as Browser).newContext();
    const wallet = await open(context, "?app=wallet");
    await wallet.evaluate(() => rt.ready());
    const text = { "content-type": "text/plain" };
    expect((await call(wallet, "PUT", "/pods/alex/documents/addr.txt", "v1", text)).status).toBe(
      201,
    );
    const granted = await wallet.evaluate(async () => {
      const response = await acl.grantAccess({
        fetch: rt.podFetch,
        grant: { agent: rt.podUrl("bank", "/profile/card#me"), modes: ["Read"] },
        owner: rt.podUrl("alex", "/profile/card#me"),
        podRoot: rt.podUrl("alex", "/"),
        resourceUrl: rt.podUrl("alex", "/documents/addr.txt"),
      });
      return response.status;
    });
    expect(granted).toBe(201);
    // The bank subscribes from its page; its agent (in the agent worker) handles the notices.
    const bank = await open(context);
    const sub = await bank.evaluate(async () => rt.watch(rt.podUrl("alex", "/documents/addr.txt")));
    expect(sub).toMatchObject({ app: "bank", path: "/documents/addr.txt" });
    expect((await call(wallet, "PUT", "/pods/alex/documents/addr.txt", "v2", text)).status).toBe(
      204,
    );
    await bank.waitForFunction(
      () => events.some((e) => e.source === "pod" && e.path === "/outbox/changed.txt"),
      undefined,
      { timeout: 10_000 },
    );
    expect(await call(bank, "GET", "/pods/bank/outbox/changed.txt")).toEqual({
      body: "Update 200 v2",
      status: 200,
    });
    expect(
      await bank.evaluate(() => events.some((e) => e.source === "app" && e.kind === "notified")),
    ).toBe(true);

    // One-time: the wallet marks the bank's read as one-time; the second read is refused.
    await wallet.evaluate(() =>
      rt.oneTimeGrant({
        agent: rt.podUrl("bank", "/profile/card#me"),
        resource: rt.podUrl("alex", "/documents/addr.txt"),
      }),
    );
    expect((await call(bank, "GET", "/pods/alex/documents/addr.txt")).status).toBe(200);
    expect((await call(bank, "GET", "/pods/alex/documents/addr.txt")).status).toBe(403);
    await wallet.waitForFunction(
      () =>
        events.some((e) => e.source === "app" && e.kind === "grant-used") &&
        events.some((e) => e.source === "pod" && e.kind === "revoke" && e.actor?.viaAgent),
      undefined,
      { timeout: 5000 },
    );
    await context.close();
  });

  it("falls back to a dedicated worker with the same host", async (ctx) => {
    if (skipReason) return ctx.skip(skipReason);
    const context = await (browser as Browser).newContext();
    const page = await open(context, "?mode=worker");
    const info = await page.evaluate(() => rt.ready());
    expect(info.mode).toBe("worker");
    expect(await call(page, "GET", "/pods/bank/documents/seeded.txt")).toEqual({
      body: "seeded text",
      status: 200,
    });
    expect(
      (await call(page, "PUT", "/pods/bank/w/z.txt", "worker", { "content-type": "text/plain" }))
        .status,
    ).toBe(201);
    await page.reload();
    await page.waitForFunction(() => "rt" in globalThis);
    expect(await call(page, "GET", "/pods/bank/w/z.txt")).toEqual({ body: "worker", status: 200 });
    await context.close();
  });

  it("in fallback mode one tab hosts; the others share its pods and its event ids", async (ctx) => {
    if (skipReason) return ctx.skip(skipReason);
    const context = await (browser as Browser).newContext();
    const one = await open(context, "?mode=worker");
    expect((await one.evaluate(() => rt.ready())).mode).toBe("worker");
    const two = await open(context, "?mode=worker");
    expect((await two.evaluate(() => rt.ready())).mode).toBe("worker");
    const text = { "content-type": "text/plain" };
    // Each tab sees the other's writes at once: there is one host, not one per tab.
    expect((await call(one, "PUT", "/pods/bank/f/one.txt", "from one", text)).status).toBe(201);
    expect(await call(two, "GET", "/pods/bank/f/one.txt")).toEqual({
      body: "from one",
      status: 200,
    });
    expect((await call(two, "PUT", "/pods/bank/f/two.txt", "from two", text)).status).toBe(201);
    expect(await call(one, "GET", "/pods/bank/f/two.txt")).toEqual({
      body: "from two",
      status: 200,
    });
    // One event log: every tab sees the same entries, and no id is used twice.
    const writes = (page: Page) =>
      page.evaluate(() =>
        events
          .filter((e) => e.source === "pod" && e.kind === "write")
          .map((e) => [(e as unknown as { id: number }).id, e.path]),
      );
    await one.waitForFunction(() => events.filter((e) => e.kind === "write").length >= 2);
    await two.waitForFunction(() => events.filter((e) => e.kind === "write").length >= 2);
    const seen = await writes(one);
    expect(seen.map(([, path]) => path)).toEqual(["/f/one.txt", "/f/two.txt"]);
    expect(await writes(two)).toEqual(seen);
    expect(new Set(seen.map(([id]) => id)).size).toBe(2);
    // The hosting tab goes away; the other takes over from the saved snapshots.
    await one.close();
    expect(await call(two, "GET", "/pods/bank/f/one.txt")).toEqual({
      body: "from one",
      status: 200,
    });
    expect((await call(two, "PUT", "/pods/bank/f/three.txt", "from three", text)).status).toBe(201);
    const three = await open(context, "?mode=worker");
    expect(await call(three, "GET", "/pods/bank/f/three.txt")).toEqual({
      body: "from three",
      status: 200,
    });
    await context.close();
  });

  it("on plain HTTP (no secure context: no service worker, Web Locks or randomUUID) one tab hosts by lease", async (ctx) => {
    if (skipReason) return ctx.skip(skipReason);
    // A name other than localhost is not a secure context over http.
    const insecure = await launch(["--host-resolver-rules=MAP insecure.test 127.0.0.1"]);
    if (insecure === undefined) return ctx.skip("no Chrome or Playwright Chromium available");
    try {
      const context = await insecure.newContext();
      const port = new URL(origin).port;
      const openInsecure = async () => {
        const page = await context.newPage();
        page.on("pageerror", (error) => console.error("page error:", error.message));
        await page.goto(`http://insecure.test:${port}/`);
        await page.waitForFunction(() => "rt" in globalThis);
        return page;
      };
      const one = await openInsecure();
      expect(
        await one.evaluate(() => ({
          locks: "locks" in navigator,
          secure: isSecureContext,
          uuid: typeof crypto.randomUUID,
        })),
      ).toEqual({ locks: false, secure: false, uuid: "undefined" });
      // The first hello is answered promptly (well inside the 60 s forward timeout).
      const started = Date.now();
      expect((await one.evaluate(() => rt.ready())).mode).toBe("worker");
      expect(Date.now() - started).toBeLessThan(15_000);
      const two = await openInsecure();
      expect((await two.evaluate(() => rt.ready())).mode).toBe("worker");
      const text = { "content-type": "text/plain" };
      expect((await call(one, "PUT", "/pods/bank/i/one.txt", "from one", text)).status).toBe(201);
      expect(await call(two, "GET", "/pods/bank/i/one.txt")).toEqual({
        body: "from one",
        status: 200,
      });
      expect((await call(two, "PUT", "/pods/bank/i/two.txt", "from two", text)).status).toBe(201);
      expect(await call(one, "GET", "/pods/bank/i/two.txt")).toEqual({
        body: "from two",
        status: 200,
      });
      // One host, so one event log with no id used twice.
      await two.waitForFunction(
        () => events.filter((e) => e.kind === "write" && e.path?.startsWith("/i/")).length >= 2,
      );
      const ids = await two.evaluate(() =>
        events
          .filter((e) => e.source === "pod" && e.kind === "write")
          .map((e) => (e as unknown as { id: number }).id),
      );
      expect(new Set(ids).size).toBe(ids.length);
      // Whichever tab hosted goes away; the lease frees and the other takes over from storage.
      await one.close();
      expect(await call(two, "GET", "/pods/bank/i/one.txt")).toEqual({
        body: "from one",
        status: 200,
      });
      expect((await call(two, "PUT", "/pods/bank/i/three.txt", "three", text)).status).toBe(201);
      await context.close();
    } finally {
      await insecure.close();
    }
  });

  it("setTourContext tags the requests that follow; null clears it", async (ctx) => {
    if (skipReason) return ctx.skip(skipReason);
    const context = await (browser as Browser).newContext();
    const page = await open(context);
    await page.evaluate(() => rt.ready());
    const text = { "content-type": "text/plain" };
    await page.evaluate(() => rt.setTourContext({ demo: "demo-a", step: "step-3" }));
    expect((await call(page, "PUT", "/pods/bank/t/a.txt", "a", text)).status).toBe(201);
    await page.evaluate(() => rt.setTourContext(null));
    expect((await call(page, "PUT", "/pods/bank/t/b.txt", "b", text)).status).toBe(201);
    await page.waitForFunction(() => events.filter((e) => e.path?.startsWith("/t/")).length >= 2);
    const tours = await page.evaluate(() =>
      events
        .filter((e) => e.path?.startsWith("/t/"))
        .map((e) => [e.path, (e as unknown as { tour?: unknown }).tour ?? null]),
    );
    expect(tours).toEqual([
      ["/t/a.txt", { demo: "demo-a", step: "step-3" }],
      ["/t/b.txt", null],
    ]);
    await context.close();
  });

  it("returns to the seed on resetDemo", async (ctx) => {
    if (skipReason) return ctx.skip(skipReason);
    const context = await (browser as Browser).newContext();
    const page = await open(context);
    await page.evaluate(() => rt.ready());
    expect(
      (
        await call(page, "PUT", "/pods/bank/tmp/r.txt", "gone soon", {
          "content-type": "text/plain",
        })
      ).status,
    ).toBe(201);
    await page.evaluate(() => rt.resetDemo());
    expect((await call(page, "GET", "/pods/bank/tmp/r.txt")).status).toBe(404);
    expect((await call(page, "GET", "/pods/bank/documents/seeded.txt")).status).toBe(200);
    await context.close();
  });
  it("the wallet acts for whichever holder it is set to; an organisation cannot switch", async (ctx) => {
    if (skipReason) return ctx.skip(skipReason);
    const context = await (browser as Browser).newContext();
    const wallet = await open(context, "?app=wallet");
    await wallet.evaluate(() => rt.ready());
    // Default: the wallet acts as Alex, exactly as before.
    expect(await wallet.evaluate(() => [rt.actingAs(), rt.session().webid])).toEqual([
      "alex",
      `${origin}/pods/alex/profile/card#me`,
    ]);
    const note = { "content-type": "text/plain" };
    expect((await call(wallet, "PUT", "/pods/maya/notes/a.txt", "maya's", note)).status).toBe(403);
    await wallet.evaluate(() => rt.setHolder("maya"));
    expect(await wallet.evaluate(() => [rt.actingAs(), rt.session()])).toEqual([
      "maya",
      {
        org: "wallet",
        persona: "Maya Torres",
        simulated: true,
        webid: `${origin}/pods/maya/profile/card#me`,
      },
    ]);
    expect((await call(wallet, "PUT", "/pods/maya/notes/a.txt", "maya's", note)).status).toBe(201);
    expect(await call(wallet, "GET", "/pods/maya/notes/a.txt")).toEqual({
      body: "maya's",
      status: 200,
    });
    // As Maya, the wallet is a stranger to Alex's pod.
    expect((await call(wallet, "GET", "/pods/alex/")).status).toBe(403);
    await wallet.evaluate(() => rt.setHolder("alex"));
    expect((await call(wallet, "GET", "/pods/maya/notes/a.txt")).status).toBe(403);

    const bank = await open(context, "?app=bank");
    await bank.evaluate(() => rt.ready());
    const refused = await bank.evaluate(() => {
      try {
        rt.setHolder("maya");
        return "switched";
      } catch (error) {
        return String((error as Error).message);
      }
    });
    expect(refused).toMatch(/bank cannot act for maya/);
    expect((await call(bank, "GET", "/pods/maya/notes/a.txt")).status).toBe(403);
    await context.close();
  });
});
