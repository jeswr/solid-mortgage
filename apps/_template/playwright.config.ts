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

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["github"]] : "list",
  use: { baseURL: `http://127.0.0.1:${port}/_template/` },
  webServer: {
    command: `pnpm exec vite preview --host 127.0.0.1 --strictPort --port ${port}`,
    url: `http://127.0.0.1:${port}/_template/`,
    reuseExistingServer: false,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
