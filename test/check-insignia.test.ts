import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { defaultTargetDirectories, scanInsignia } from "../scripts/check-insignia.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, "fixtures", "insignia");

test("flags every banned-insignia pattern in the violation fixtures", () => {
  const findings = scanInsignia([FIXTURES]) as Array<{ file: string; id: string; line: number }>;
  const violationFindings = findings.filter((finding) => finding.file.endsWith("violations.txt"));
  const foundIds = new Set(violationFindings.map((finding) => finding.id));
  expect([...foundIds].sort()).toEqual([
    "agency-seal",
    "equal-housing",
    "fdic-mark",
    "gse-product-abbreviation",
    "gse-product-mark",
    "nmls",
  ]);
  // Every line of the violations fixture is a violation.
  expect(violationFindings.length).toBeGreaterThanOrEqual(12);
});

test("does not flag the clean fixture (word-boundary and casing negatives)", () => {
  const findings = scanInsignia([FIXTURES]) as Array<{ file: string }>;
  expect(findings.filter((finding) => finding.file.endsWith("clean.txt"))).toEqual([]);
});

test("rendered-source directories are clean (the R2 gate itself)", () => {
  const directories = defaultTargetDirectories() as string[];
  expect(directories.length).toBeGreaterThanOrEqual(9);
  expect(directories.some((directory) => directory.endsWith(join("packages", "ui", "src")))).toBe(
    true,
  );
  expect(scanInsignia(directories)).toEqual([]);
});
