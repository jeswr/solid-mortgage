// AUTHORED-BY Claude Opus 5.5
/** Playwright global setup: bundle e2e/harness.ts into one script the tests inject. */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { mortgageAliases } from "@mortgage/content/vite";
import { buildHarness } from "../../../test-support/e2e.ts";

/**
 * Outside the repository: the bundle inlines the data model, and tools/check-insignia.mjs
 * scans every file under apps/<app>, so an in-tree copy would fail the gate.
 */
export const HARNESS_DIR = join(tmpdir(), "mortgage-e2e-harness", "insurer");

export default function buildInsurerHarness(): Promise<void> {
  return buildHarness({
    alias: mortgageAliases(),
    entry: fileURLToPath(new URL("./harness.ts", import.meta.url)),
    outDir: HARNESS_DIR,
  });
}
