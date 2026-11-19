// AUTHORED-BY Claude Opus 5.5
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Runs against the assembled site (`pnpm run build` at the root), served by tools/serve-dist.mjs,
 * so the real pod service worker (/pods-sw.js) and the agent bundles (/agents/*.js) are there.
 */
const FREE_PORT =
  "const s=require('node:net').createServer();s.listen(0,'127.0.0.1',()=>{process.stdout.write(String(s.address().port));s.close()})";
process.env.APP_E2E_PORT ??= execFileSync(process.execPath, ["-e", FREE_PORT], {
  encoding: "utf8",
});
const port = Number(process.env.APP_E2E_PORT);
const serve = resolve(import.meta.dirname, "../../tools/serve-dist.mjs");

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["github"]] : "list",
  timeout: 90_000,
  use: { baseURL: `http://127.0.0.1:${port}/payroll/` },
  webServer: {
    command: `node ${serve} --port ${port}`,
    url: `http://127.0.0.1:${port}/payroll/`,
    reuseExistingServer: false,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
