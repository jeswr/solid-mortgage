// AUTHORED-BY Claude Opus 5.5
import { execFileSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";

// Pick a free loopback port once; worker processes inherit it through the environment.
const FREE_PORT =
  "const s=require('node:net').createServer();s.listen(0,'127.0.0.1',()=>{process.stdout.write(String(s.address().port));s.close()})";
process.env.APP_E2E_PORT ??= execFileSync(process.execPath, ["-e", FREE_PORT], {
  encoding: "utf8",
});
const port = Number(process.env.APP_E2E_PORT);

/**
 * Runs against the assembled site (`pnpm run build` at the repo root) with the real
 * service-worker pods: the wallet needs `/pods-sw.js` at the site root, which `vite preview`
 * of this app alone does not serve.
 */
export default defineConfig({
  testDir: "./e2e",
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["github"]] : "list",
  timeout: 240_000,
  expect: { timeout: 20_000 },
  workers: 1,
  use: { baseURL: `http://127.0.0.1:${port}/wallet/`, trace: "retain-on-failure" },
  webServer: {
    command: `node e2e/serve.mjs --port ${port}`,
    url: `http://127.0.0.1:${port}/wallet/`,
    reuseExistingServer: false,
    timeout: 180_000,
    // e2e/serve.mjs removes its copy of the site (about 600 MB) on SIGTERM; Playwright's default
    // SIGKILL left one behind in the temp directory on every run.
    gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
