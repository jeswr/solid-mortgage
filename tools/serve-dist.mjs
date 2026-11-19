#!/usr/bin/env node
// AUTHORED-BY Claude Opus 5.5
/**
 * Serve the assembled `dist/` on loopback with the same redirects, fallbacks and headers as
 * production (`tools/site-routes.mjs`). Used by the root Playwright config and `pnpm preview`.
 *
 * Usage: node tools/serve-dist.mjs [--port <n>] [--dir <dist>]
 * With no port (or 0, or SITE_PORT unset) it picks a free one. It prints `serving http://127.0.0.1:<port>/` once ready.
 */
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { headersFor, ROOT, resolveRequest } from "./site-routes.mjs";

const TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttl": "text/turtle; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".vtt": "text/vtt; charset=utf-8",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

export function createSiteServer(distDir) {
  const root = resolve(distDir);
  const exists = (relative) => {
    const full = normalize(join(root, relative));
    if (full !== root && !full.startsWith(root + sep)) return false;
    try {
      return statSync(full).isFile();
    } catch {
      return false;
    }
  };
  return createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    } catch {
      response.writeHead(400).end();
      return;
    }
    if (pathname.includes("\0") || pathname.split("/").includes("..")) {
      response.writeHead(400).end();
      return;
    }
    const headers = headersFor(pathname);
    const route = resolveRequest(pathname, exists);
    if (route.redirect) {
      response.writeHead(307, { ...headers, Location: route.redirect }).end();
      return;
    }
    if (route.file === null) {
      response.writeHead(404, { ...headers, "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found\n");
      return;
    }
    let stat;
    try {
      stat = statSync(join(root, route.file));
    } catch {
      // A slug fallback can name an app that is not built into dist/: answer 404, not a crash.
      response.writeHead(404, { ...headers, "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found\n");
      return;
    }
    const lastModified = new Date(Math.floor(stat.mtimeMs / 1000) * 1000).toUTCString();
    const since = Date.parse(request.headers["if-modified-since"] ?? "");
    if (!Number.isNaN(since) && since >= Date.parse(lastModified)) {
      response.writeHead(304, { ...headers, "Last-Modified": lastModified }).end();
      return;
    }
    const type = TYPES[extname(route.file)] ?? "application/octet-stream";
    response.writeHead(200, { ...headers, "Content-Type": type, "Last-Modified": lastModified });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(join(root, route.file)).pipe(response);
  });
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = argument("--dir", join(ROOT, "dist"));
  const port = Number(argument("--port", process.env.SITE_PORT ?? "0"));
  const server = createSiteServer(dir);
  server.listen(port, "127.0.0.1", () => {
    const address = server.address();
    console.log(`serving http://127.0.0.1:${address.port}/ from ${dir}`);
  });
}
