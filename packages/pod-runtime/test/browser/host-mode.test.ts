// AUTHORED-BY Claude Opus 5.5
/**
 * Host mode in Chrome: apps at `http://<slug>.demo.localhost`, pods at `http://pods.demo.localhost`
 * behind the bridge iframe, with a host-mode build of pods-sw.js (registry fixed at build time).
 * `*.localhost` is a secure context and one site, as a real `<slug>.<domain>` set would be.
 * Needs port 80 on loopback; skipped (with a message) when it, dist/ or Chrome is missing.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { build } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BRIDGE_PATH } from "../../src/protocol.js";
import {
  AGENT_JS,
  buildPage,
  call,
  close,
  launch,
  PACKAGE,
  PAGE_HTML,
  SW,
  serve,
} from "./support.js";

const DOMAIN = "demo.localhost";
const PODS = `http://pods.${DOMAIN}`;
let browser: Browser | undefined;
let server: Server | undefined;
let out = "";
let skipReason: string | undefined;

async function buildHostModeWorker(dir: string): Promise<string> {
  const saved = { ...process.env };
  process.env.MORTGAGE_HOST_MODE = "1";
  process.env.MORTGAGE_HOST_REGISTRY = join(import.meta.dirname, "fixture/registry.ts");
  try {
    await build({
      build: { emptyOutDir: false, outDir: dir, sourcemap: false },
      configFile: join(PACKAGE, "vite.config.ts"),
      logLevel: "warn",
      root: PACKAGE,
    });
  } finally {
    process.env = saved;
  }
  return readFileSync(join(dir, "pods-sw.js"), "utf8");
}

beforeAll(async () => {
  if (!existsSync(SW)) {
    skipReason = "dist/ is missing (run the build first)";
    return;
  }
  out = mkdtempSync(join(tmpdir(), "pod-runtime-host-"));
  const page = await buildPage(join(out, "page"));
  const worker = await buildHostModeWorker(join(out, "sw"));
  const podsFiles: Record<string, [string, string]> = {
    [BRIDGE_PATH]: [
      "text/html",
      '<!doctype html><meta charset="utf-8"><script src="/pods-sw.js"></script>',
    ],
    "/agents/bank.js": ["text/javascript", AGENT_JS],
    "/other/": ["text/html", '<!doctype html><meta charset="utf-8"><title>other</title>'],
    "/pods-sw.js": ["text/javascript", worker],
    "/site.json": ["application/json", JSON.stringify({ agents: ["bank"] })],
  };
  const appFiles: Record<string, [string, string]> = {
    "/": ["text/html", PAGE_HTML],
    "/page.js": ["text/javascript", page],
  };
  try {
    server = await serve(
      (host, path) => (host === `pods.${DOMAIN}` ? podsFiles : appFiles)[path],
      80,
    );
  } catch (error) {
    skipReason = `cannot listen on port 80: ${(error as Error).message}`;
    return;
  }
  browser = await launch([`--host-resolver-rules=MAP *.${DOMAIN} 127.0.0.1`]);
  if (browser === undefined) skipReason = "no Chrome or Playwright Chromium available";
}, 180_000);

afterAll(async () => {
  await browser?.close();
  await close(server);
  if (out) rmSync(out, { force: true, recursive: true });
});

declare const rt: typeof import("../../src/index.js");
declare const events: Array<{
  source: string;
  kind?: string;
  path?: string;
  actor?: { org: string; viaAgent: boolean };
}>;

async function app(context: BrowserContext, slug: string): Promise<Page> {
  const page = await context.newPage();
  page.on("pageerror", (error) => console.error(`${slug} page error:`, error.message));
  await page.goto(`http://${slug}.${DOMAIN}/?host=${DOMAIN}&app=${slug}`);
  await page.waitForFunction(() => "rt" in globalThis);
  const info = await page.evaluate(() => rt.ready());
  expect(info.mode).toBe("bridge");
  return page;
}

describe("host mode in Chrome", () => {
  it("identity is the app's origin; nothing an app sends changes it", async (ctx) => {
    if (skipReason) return ctx.skip(skipReason);
    const context = await (browser as Browser).newContext();
    const bank = await app(context, "bank");
    const seeded = `${PODS}/pods/bank/documents/seeded.txt`;
    expect(await call(bank, "GET", seeded)).toEqual({ body: "seeded text", status: 200 });
    const wallet = await app(context, "wallet");
    expect((await call(wallet, "GET", seeded)).status).toBe(403);
    // A header naming another app is replaced by the bridge.
    expect((await call(wallet, "GET", seeded, undefined, { "x-demo-agent": "bank" })).status).toBe(
      403,
    );
    // A hello straight to the bridge that maps the wallet to bank changes nothing.
    await wallet.evaluate(async (pods) => {
      const frame = document.querySelector("iframe");
      frame?.contentWindow?.postMessage(
        {
          id: 999,
          message: { identities: { wallet: "bank" }, owners: ["alex"], type: "hello" },
          type: "pod-bridge",
        },
        pods,
      );
      await new Promise((resolve) => setTimeout(resolve, 300));
    }, PODS);
    expect((await call(wallet, "GET", seeded)).status).toBe(403);
    expect((await call(wallet, "GET", `${PODS}/pods/alex/profile/card`)).status).toBe(200);
    expect((await call(bank, "GET", `${PODS}/pods/payroll/profile/card`)).status).toBe(200);
    await context.close();
  });

  it("a page on the pod origin other than the bridge is anonymous and cannot send control messages", async (ctx) => {
    if (skipReason) return ctx.skip(skipReason);
    const context = await (browser as Browser).newContext();
    const bank = await app(context, "bank");
    expect(
      (
        await call(bank, "PUT", `${PODS}/pods/bank/x/a.txt`, "kept", {
          "content-type": "text/plain",
        })
      ).status,
    ).toBe(201);
    const other = await context.newPage();
    await other.goto(`${PODS}/other/`);
    const result = await other.evaluate(async () => {
      const container = navigator.serviceWorker;
      await container.ready;
      const status = (await fetch("/pods/bank/x/a.txt", { headers: { "x-demo-agent": "bank" } }))
        .status;
      const reply = await new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => resolve(event.data);
        container.controller?.postMessage({ type: "reset" }, [channel.port2]);
      });
      return { controlled: container.controller !== null, reply, status };
    });
    expect(result.controlled).toBe(true);
    expect(result.status).toBe(401);
    expect(result.reply).toMatchObject({ ok: false });
    expect(await call(bank, "GET", `${PODS}/pods/bank/x/a.txt`)).toEqual({
      body: "kept",
      status: 200,
    });
    await context.close();
  });

  it("events reach the app page, and the bridge page runs the organisation agents", async (ctx) => {
    if (skipReason) return ctx.skip(skipReason);
    const context = await (browser as Browser).newContext();
    const bank = await app(context, "bank");
    expect(
      (
        await call(bank, "POST", `${PODS}/pods/bank/inbox/`, "hello", {
          "content-type": "text/plain",
        })
      ).status,
    ).toBe(201);
    await bank.waitForFunction(
      () =>
        events.some(
          (e) => e.source === "pod" && e.path === "/outbox/receipt.txt" && e.actor?.viaAgent,
        ),
      undefined,
      { timeout: 10_000 },
    );
    const notes = await bank.waitForFunction(
      () => events.find((e) => e.source === "app"),
      undefined,
      { timeout: 5000 },
    );
    expect(await notes.jsonValue()).toMatchObject({ org: "bank", source: "app" });
    await context.close();
  });
});
