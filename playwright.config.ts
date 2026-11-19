// AUTHORED-BY Claude Opus 5.5
/**
 * Acceptance suite (build-plan.md §4, lane T1): Playwright in Chromium against the assembled
 * static site (`pnpm run build` → dist/), served on loopback by tools/serve-dist.mjs with the
 * production routing rules. Every test starts from fresh demo data.
 */
import { execFileSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";

// Pick a free loopback port once; worker processes inherit it through the environment.
const FREE_PORT =
  "const s=require('node:net').createServer();s.listen(0,'127.0.0.1',()=>{process.stdout.write(String(s.address().port));s.close()})";
process.env.SITE_E2E_PORT ??= execFileSync(process.execPath, ["-e", FREE_PORT], {
  encoding: "utf8",
});
const origin = `http://127.0.0.1:${process.env.SITE_E2E_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  outputDir: "test-results",
  use: {
    baseURL: `${origin}/`,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  webServer: {
    command: `node tools/serve-dist.mjs --port ${process.env.SITE_E2E_PORT}`,
    url: `${origin}/_template/`,
    reuseExistingServer: false,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
