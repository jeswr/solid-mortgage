#!/usr/bin/env node
// AUTHORED-BY Claude Opus 5.5
/**
 * The wallet's e2e server: a copy of the assembled site (`pnpm run build` at the repo root
 * first) with the test harness page added at /__wallet-e2e__/, served with the production
 * routing and headers by tools/serve-dist.mjs. The harness never reaches dist/ or a deploy.
 *
 * Usage: node e2e/serve.mjs --port <n>
 */
import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "vite";
import { createSiteServer } from "../../../tools/serve-dist.mjs";

const app = resolve(import.meta.dirname, "..");
const root = resolve(app, "..", "..");
const dist = join(root, "dist");
if (!existsSync(join(dist, "wallet", "index.html")) || !existsSync(join(dist, "pods-sw.js"))) {
  console.error("e2e/serve.mjs: build the site first (pnpm run build at the repo root)");
  process.exit(1);
}
const site = mkdtempSync(join(tmpdir(), "wallet-e2e-"));
cpSync(dist, site, { recursive: true });
await build({
  base: "/__wallet-e2e__/",
  build: { emptyOutDir: true, outDir: join(site, "__wallet-e2e__"), target: "es2022" },
  configFile: false,
  logLevel: "warn",
  resolve: {
    alias: {
      "@jeswr/guarded-fetch/node": "@mortgage/vc-kit/browser/guarded-fetch",
      "node:crypto": "@mortgage/vc-kit/browser/crypto",
      "node:zlib": "@mortgage/vc-kit/browser/zlib",
    },
  },
  root: join(app, "e2e", "harness"),
});
const portIndex = process.argv.indexOf("--port");
const port = Number(portIndex === -1 ? 0 : process.argv[portIndex + 1]);
const server = createSiteServer(site);
server.listen(port, "127.0.0.1", () => {
  console.log(`wallet e2e: serving http://127.0.0.1:${server.address().port}/ from ${site}`);
});
const stop = () => {
  server.close();
  rmSync(site, { force: true, recursive: true });
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
