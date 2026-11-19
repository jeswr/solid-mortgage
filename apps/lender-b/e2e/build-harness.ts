// AUTHORED-BY Claude Opus 5.5
/** Playwright global setup: bundle e2e/harness.ts into one script the tests inject. */
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { mortgageAliases } from "@mortgage/content/vite";
import { build } from "vite";

/**
 * Outside the repository: the bundle carries every string of the packages it includes, and the
 * insignia check scans each app's whole tree.
 */
export const HARNESS_DIR = join(tmpdir(), "mortgage-e2e-harness-lender-b");

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
