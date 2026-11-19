// AUTHORED-BY Claude Opus 5.5
/**
 * Acceptance test 11, second half (build-plan.md §4): `lint:iris` passes, so every IRI in the
 * repository's RDF dereferences. The first half (every pod resource validates against its SHACL
 * shape after a full run) is in guided-path.spec.ts, judged on the browser run's pods. It needs
 * network access to the vocabularies' hosts.
 */
import { execFileSync } from "node:child_process";
import { test } from "@playwright/test";
import { REPO_ROOT } from "./support/site.ts";

test("11 Data: lint:iris passes", () => {
  test.setTimeout(10 * 60_000);
  try {
    execFileSync(process.execPath, ["tools/lint-iris.mjs"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: "pipe",
      timeout: 9 * 60_000,
    });
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string };
    const output = `${e.stdout ?? ""}${e.stderr ?? ""}`.trim().split("\n").slice(-40).join("\n");
    throw new Error(`tools/lint-iris.mjs failed:\n${output}`);
  }
});
