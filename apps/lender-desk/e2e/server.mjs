// AUTHORED-BY Claude Opus 5.5
/**
 * The e2e server: the assembled site (`pnpm run build` → dist/) with the production routing of
 * tools/serve-dist.mjs, plus the test-only harness page at /e2e-harness/ (same origin, so it
 * shares the browser context's service-worker pods with the app under test).
 *
 * Usage: node e2e/server.mjs --port <n>
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { createSiteServer } from "../../../tools/serve-dist.mjs";

const HERE = import.meta.dirname;
const SITE = resolve(HERE, "../../../dist");
const HARNESS = resolve(HERE, "harness/dist");
const PREFIX = "/e2e-harness/";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8" };

if (!existsSync(join(SITE, "site.json"))) {
  throw new Error(`no assembled site at ${SITE}: run \`pnpm run build\` at the repository root`);
}

const site = createSiteServer(SITE);
const [siteHandler] = site.listeners("request");

function serveHarness(pathname, response) {
  const relative = pathname.slice(PREFIX.length) || "index.html";
  const full = normalize(join(HARNESS, relative));
  if (!full.startsWith(HARNESS + sep) || !existsSync(full) || !statSync(full).isFile()) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": TYPES[extname(full)] ?? "application/octet-stream",
  });
  createReadStream(full).pipe(response);
}

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  if (pathname.startsWith(PREFIX) && !pathname.includes("..")) serveHarness(pathname, response);
  else siteHandler.call(site, request, response);
});

const index = process.argv.indexOf("--port");
const port = Number(index === -1 ? "0" : process.argv[index + 1]);
server.listen(port, "127.0.0.1", () => {
  console.log(`e2e server on http://127.0.0.1:${server.address().port}/`);
});
