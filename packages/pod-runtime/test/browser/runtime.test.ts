// AUTHORED-BY Claude Opus 5.5
/**
 * The runtime in a real browser: the built `dist/pods-sw.js` in Chrome, a fixture page using the
 * built client, a fixture agent. Skipped (with a message) when dist/ or a Chrome is missing.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { type Browser, type BrowserContext, chromium, type Page } from "@playwright/test";
import { build } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const PACKAGE = resolve(import.meta.dirname, "../..");
const SW = join(PACKAGE, "dist", "pods-sw.js");
const CHROME = process.env.POD_RUNTIME_CHROME ?? "/usr/bin/google-chrome";

let browser: Browser | undefined;
let server: Server | undefined;
let origin = "";
let out = "";
let skipReason: string | undefined;

async function launch(): Promise<Browser | undefined> {
  const attempts = existsSync(CHROME) ? [{ executablePath: CHROME }, {}] : [{}];
  for (const options of attempts) {
    try {
      return await chromium.launch({ ...options, headless: true });
    } catch {
      // try the next browser
    }
  }
  return undefined;
}

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
  await build({
    build: {
      emptyOutDir: true,
      lib: {
        entry: join(import.meta.dirname, "fixture/page.ts"),
        fileName: () => "page.js",
        formats: ["es"],
      },
      minify: false,
      outDir: out,
    },
    configFile: false,
    logLevel: "warn",
    publicDir: false,
    root: PACKAGE,
  });
  const files: Record<string, [string, string]> = {
    "/": [
      "text/html",
      '<!doctype html><meta charset="utf-8"><title>pods</title><script type="module" src="/page.js"></script>',
    ],
    "/agents/bank.js": [
      "text/javascript",
      readFileSync(join(import.meta.dirname, "fixture/agent.js"), "utf8"),
    ],
    "/page.js": ["text/javascript", readFileSync(join(out, "page.js"), "utf8")],
    "/pods-sw.js": ["text/javascript", readFileSync(SW, "utf8")],
    "/site.json": ["application/json", JSON.stringify({ agents: ["bank"] })],
  };
  server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    const file = files[path];
    if (file === undefined) {
      response.writeHead(404, { "content-type": "text/plain" }).end(`not served: ${path}`);
      return;
    }
    response
      .writeHead(200, {
        "cache-control": "no-cache",
        "content-type": file[0],
        "service-worker-allowed": "/",
      })
      .end(file[1]);
  });
  await new Promise<void>((done) => server?.listen(0, "127.0.0.1", done));
  // localhost (not 127.0.0.1) so the page is a secure context by name as well as by address.
  origin = `http://localhost:${(server.address() as AddressInfo).port}`;
}, 120_000);

afterAll(async () => {
  await browser?.close();
  await new Promise<void>((done) => (server ? server.close(() => done()) : done()));
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
declare const events: Array<{
  source: string;
  kind?: string;
  path?: string;
  actor?: { viaAgent: boolean };
}>;

const call = (
  page: Page,
  method: string,
  path: string,
  body?: string,
  headers: Record<string, string> = {},
) =>
  page.evaluate(
    async ([m, p, b, h]) => {
      const response = await rt.podFetch(p as string, {
        body: b as string | undefined,
        headers: h as Record<string, string>,
        method: m as string,
      });
      return { body: await response.text(), status: response.status };
    },
    [method, path, body, headers] as const,
  );

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
});
