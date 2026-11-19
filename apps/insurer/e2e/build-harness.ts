// AUTHORED-BY Claude Opus 5.5
/** Playwright global setup: bundle e2e/harness.ts into one script the tests inject. */
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { mortgageAliases } from "@mortgage/content/vite";
import { build } from "vite";

export const HARNESS_DIR = fileURLToPath(new URL("../test-results/harness/", import.meta.url));

export default async function buildHarness(): Promise<void> {
  mkdirSync(HARNESS_DIR, { recursive: true });
  await build({
    build: {
      emptyOutDir: true,
      lib: {
        entry: fileURLToPath(new URL("./harness.ts", import.meta.url)),
        fileName: () => "harness.js",
        formats: ["es"],
      },
      outDir: HARNESS_DIR,
      rolldownOptions: { output: { codeSplitting: false } },
    },
    configFile: false,
    logLevel: "warn",
    publicDir: false,
    resolve: { alias: mortgageAliases() },
  });
}
