// AUTHORED-BY Claude Opus 5.5 (ported from the Solid Suite walkthrough recorder)
/**
 * Serves the stage pages (title cards, the overlay) on loopback. The demo itself is served by
 * `tools/serve-dist.mjs` from the built site; this server only holds what the recorder adds.
 * Each root maps a first path segment to a directory: `/stage/…`, `/demo/…`.
 */
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

export async function startStatic(opts: { roots: Record<string, string> }) {
  const server = createServer(async (req, res) => {
    const u = new URL(req.url ?? "/", "http://x");
    const [, top, ...rest] = u.pathname.split("/");
    const root = top ? opts.roots[top] : undefined;
    const rel = rest.join("/") || "index.html";
    if (!root || rel.split("/").includes("..")) return res.writeHead(404).end("Not found");
    try {
      const body = await readFile(path.join(root, rel));
      res
        .writeHead(200, {
          "content-type": TYPES[path.extname(rel)] ?? "application/octet-stream",
          "cache-control": "no-store",
        })
        .end(body);
    } catch {
      res.writeHead(404).end("Not found");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}`, close: () => server.close() };
}
