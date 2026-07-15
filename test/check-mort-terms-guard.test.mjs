import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const guard = join(repoRoot, "scripts", "check-mort-terms.mjs");

describe("check-mort-terms guard", () => {
  it("passes on the repository, whose comments contain 'mort: term' prose", () => {
    // Regression: prose with a space after the colon (e.g. "no mort: terms
    // found" in the generators) must never parse as a compact IRI reference.
    const result = spawnSync(process.execPath, [guard], { encoding: "utf8" });
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/all resolve/);
  });

  it("matches compact IRI references but not prose", async () => {
    const { PREFIXED_PATTERN } = await import("../scripts/check-mort-terms.mjs");
    const locals = (text) => [...text.matchAll(PREFIXED_PATTERN)].map((match) => match[1]);
    expect(locals("one entry per mort: term.")).toEqual([]);
    expect(locals('anchor type is "mort:ZkOperandAnchor" here')).toEqual(["ZkOperandAnchor"]);
    expect(locals("fields mort:field and mort:operandEnc")).toEqual(["field", "operandEnc"]);
  });
});
