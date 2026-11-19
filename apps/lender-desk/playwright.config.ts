// AUTHORED-BY Claude Opus 5.5
/**
 * Loan Desk e2e: Chromium against the assembled site (run `pnpm run build` at the root first)
 * with the real service-worker pods. Each test gets a fresh browser context, so fresh pods.
 */
import { execFileSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";

// Pick a free loopback port once; worker processes inherit it through the environment.
const FREE_PORT =
  "const s=require('node:net').createServer();s.listen(0,'127.0.0.1',()=>{process.stdout.write(String(s.address().port));s.close()})";
process.env.APP_E2E_PORT ??= execFileSync(process.execPath, ["-e", FREE_PORT], {
  encoding: "utf8",
});
const port = Number(process.env.APP_E2E_PORT);

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["github"]] : "list",
  timeout: 240_000,
  expect: { timeout: 20_000 },
  use: { baseURL: `http://127.0.0.1:${port}/lender-desk/`, trace: "retain-on-failure" },
  webServer: {
    command: `pnpm exec vite build --config e2e/harness.vite.config.ts && node ../../test-support/e2e-server.mjs --port ${port} --harness e2e/harness/dist`,
    url: `http://127.0.0.1:${port}/e2e-harness/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
