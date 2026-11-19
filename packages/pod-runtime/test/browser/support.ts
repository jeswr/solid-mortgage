// AUTHORED-BY Claude Opus 5.5
/** Shared setup for the browser tests: Chrome, the fixture page bundle, a static server. */
import { existsSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { join, resolve } from "node:path";
import { type Browser, chromium, type Page } from "@playwright/test";
import { build } from "vite";

export const PACKAGE = resolve(import.meta.dirname, "../..");
export const SW = join(PACKAGE, "dist", "pods-sw.js");
const CHROME = process.env.POD_RUNTIME_CHROME ?? "/usr/bin/google-chrome";

export const PAGE_HTML =
  '<!doctype html><meta charset="utf-8"><title>pods</title><script type="module" src="/page.js"></script>';
export const AGENT_JS = readFileSync(join(import.meta.dirname, "fixture/agent.js"), "utf8");

/** Chrome (the system one when present, else Playwright's), or undefined when none starts. */
export async function launch(args: string[] = []): Promise<Browser | undefined> {
  const attempts = existsSync(CHROME) ? [{ executablePath: CHROME }, {}] : [{}];
  for (const options of attempts) {
    try {
      return await chromium.launch({ ...options, args, headless: true });
    } catch {
      // try the next browser
    }
  }
  return undefined;
}

const REGISTRY = "@mortgage/demo-kit/registry";
const PADDED_REGISTRY = join(import.meta.dirname, "fixture/padded-registry.ts");

/**
 * Bundle the fixture page (the built client) into `out/page.js`. The client's registry import is
 * routed through `fixture/padded-registry.ts`, which pads the pod owners when the page URL asks.
 */
export async function buildPage(out: string): Promise<string> {
  await build({
    plugins: [
      {
        enforce: "pre",
        name: "padded-registry",
        async resolveId(source, importer) {
          if (source !== REGISTRY || importer === PADDED_REGISTRY) return null;
          return PADDED_REGISTRY;
        },
      },
    ],
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
  return readFileSync(join(out, "page.js"), "utf8");
}

export type Route = (host: string, path: string) => [type: string, body: string] | undefined;

/** A static server; `route` picks the file from the Host header and path. */
export async function serve(route: Route, port: number, hostname = "127.0.0.1"): Promise<Server> {
  const server = createServer((request, response) => {
    const host = (request.headers.host ?? "").replace(/:\d+$/, "");
    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    const file = route(host, path);
    if (file === undefined) {
      response.writeHead(404, { "content-type": "text/plain" }).end(`not served: ${host}${path}`);
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
  await new Promise<void>((done, fail) => {
    server.once("error", fail);
    server.listen(port, hostname, done);
  });
  return server;
}

export const close = (server: Server | undefined) =>
  new Promise<void>((done) => (server ? server.close(() => done()) : done()));

type Rt = typeof import("../../src/index.js");
declare const rt: Rt;

/** `podFetch` in the page; returns status and text body. */
export const call = (
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
