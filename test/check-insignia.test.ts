import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { defaultTargetDirectories, scanInsignia } from "../tools/check-insignia.mjs";
import { INSIGNIA_ROSTER } from "../tools/insignia-roster.mjs";

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

test("flags banned filenames even when the file content is clean (image assets)", () => {
  const findings = scanInsignia([FIXTURES]) as Array<{ file: string; id: string; line: number }>;
  const filenameFindings = findings.filter((finding) =>
    finding.file.endsWith("lpa-seal-badge.svg"),
  );
  expect(filenameFindings.map((finding) => finding.id)).toContain("gse-product-abbreviation");
  expect(filenameFindings.every((finding) => finding.line === 0)).toBe(true);
});

test("flags prohibited directory names carrying the mark past a generic basename", () => {
  const findings = scanInsignia([FIXTURES]) as Array<{ file: string; id: string; line: number }>;
  const pathFindings = findings.filter((finding) => finding.file.endsWith("fdic/seal.svg"));
  expect(pathFindings.map((finding) => finding.id)).toContain("fdic-mark");
  expect(pathFindings.every((finding) => finding.line === 0)).toBe(true);
});

test("does not flag the clean fixture (word-boundary and casing negatives)", () => {
  const findings = scanInsignia([FIXTURES]) as Array<{ file: string }>;
  expect(findings.filter((finding) => finding.file.endsWith("clean.txt"))).toEqual([]);
});

test("flags real organisation names, case-sensitively for acronyms", () => {
  const findings = scanInsignia([join(FIXTURES, "..", "organisations")]) as Array<{
    file: string;
    id: string;
  }>;
  const flagged = new Set(
    findings.filter((finding) => finding.file.endsWith("real.txt")).map((finding) => finding.id),
  );
  for (const id of [
    "org-equifax",
    "org-freddie-mac",
    "org-bank-of-america",
    "org-adp",
    "org-mers",
  ]) {
    expect(flagged).toContain(id);
  }
  expect(findings.filter((finding) => finding.file.endsWith("fictional.txt"))).toEqual([]);
});

test("every roster entry has a unique id and compiles", () => {
  const ids = INSIGNIA_ROSTER.map((entry) => entry.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const entry of INSIGNIA_ROSTER) expect(() => new RegExp(entry.pattern)).not.toThrow();
  expect(ids.filter((id) => id.startsWith("org-")).length).toBeGreaterThanOrEqual(80);
});

test("rendered-source directories are clean (the gate itself)", () => {
  const directories = defaultTargetDirectories() as string[];
  expect(directories.some((directory) => directory.endsWith(join("apps", "_template")))).toBe(true);
  expect(directories.some((directory) => directory.endsWith("content"))).toBe(true);
  expect(scanInsignia(directories)).toEqual([]);
  // Scans every app's source and built output, which grows with each app: allow well over the
  // 5 s default.
}, 120_000);
