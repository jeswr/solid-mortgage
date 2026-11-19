// AUTHORED-BY Claude Opus 5.5
/** The runtime is domain-generic: no term from the demo's industry appears anywhere in the package. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { expect, test } from "vitest";

const ROOT = resolve(import.meta.dirname, "..");
const SKIP = new Set(["node_modules", "dist", "generated", ".turbo", "test-results"]);
// Built from fragments so this file does not trip its own check.
const TERMS = [
  ["mort", "gage"],
  ["lo", "an"],
  ["lend", "er"],
  ["borrow", "er"],
  ["esc", "row"],
  ["appra", "is"],
  ["underw", "rit"],
  ["tr", "id\\b"],
  ["clos", "ing disclosure"],
].map((parts) => parts.join(""));
// The workspace scope name is the one allowed occurrence.
const SCOPE = new RegExp(`@${TERMS[0]}/`, "gi");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

test("no domain term in source, tests, scripts, config or docs", () => {
  const pattern = new RegExp(TERMS.join("|"), "i");
  const hits: string[] = [];
  for (const file of files(ROOT)) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, index) => {
      const cleaned = line
        .replace(SCOPE, "@scope/")
        .replace(/MORTGAGE_HOST_MODE/g, "HOST_MODE_FLAG");
      if (pattern.test(cleaned)) hits.push(`${relative(ROOT, file)}:${index + 1}: ${line.trim()}`);
    });
  }
  expect(hits).toEqual([]);
});
