// AUTHORED-BY Claude Opus 5.5
import { execFileSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";

/**
 * Runs against the assembled site (`pnpm run build` → ../../dist), served by tools/serve-dist.mjs
 * with production routing, so the real pod service worker (`/pods-sw.js`) and the organisation
 * agents (`/agents/*.js`) are present. Nothing about the pods or their access checks is mocked.
 */
const FREE_PORT =
  "const s=require('node:net').createServer();s.listen(0,'127.0.0.1',()=>{process.stdout.write(String(s.address().port));s.close()})";
process.env.APP_E2E_PORT ??= execFileSync(process.execPath, ["-e", FREE_PORT], {
  encoding: "utf8",
});
const port = Number(process.env.APP_E2E_PORT);

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/build-harness.ts",
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["github"]] : "list",
  timeout: 240_000,
  expect: { timeout: 30_000 },
  workers: 1,
  use: { baseURL: `http://127.0.0.1:${port}/lender/` },
  webServer: {
    command: `node ../../tools/serve-dist.mjs --port ${port}`,
    url: `http://127.0.0.1:${port}/lender/`,
    reuseExistingServer: false,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
