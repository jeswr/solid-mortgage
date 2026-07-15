import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, test } from "vitest";
import { MORT, MORT_NAMESPACE, MORT_ONTOLOGY_IRI } from "../src/vocab/mort.js";

const PACKAGE_ROOT = path.resolve(import.meta.dirname, "..");

test("committed vocab constants match vocab/mort.ttl (codegen freshness)", () => {
  execFileSync(process.execPath, ["scripts/generate-vocab.mjs", "--check"], {
    cwd: PACKAGE_ROOT,
    stdio: "pipe",
  });
});

test("namespace is the decision-0010 hash namespace", () => {
  expect(MORT_ONTOLOGY_IRI).toBe("https://solid-mortgage-vocab.vercel.app/mort");
  expect(MORT_NAMESPACE).toBe(`${MORT_ONTOLOGY_IRI}#`);
});

test("every constant is an IRI in the mort namespace", () => {
  for (const iri of Object.values(MORT)) {
    expect(iri.startsWith(MORT_NAMESPACE)).toBe(true);
  }
});

test("the decision-0005/0012 terms are present", () => {
  expect(MORT.ZkOperandAnchor).toBe(`${MORT_NAMESPACE}ZkOperandAnchor`);
  expect(MORT.field).toBe(`${MORT_NAMESPACE}field`);
  expect(MORT.operandEnc).toBe(`${MORT_NAMESPACE}operandEnc`);
  expect(MORT.monthlyGrossIncomeUsd).toBe(`${MORT_NAMESPACE}monthlyGrossIncomeUsd`);
  expect(MORT.totalMonthlyDebtUsd).toBe(`${MORT_NAMESPACE}totalMonthlyDebtUsd`);
  expect(MORT.creditScoreValue).toBe(`${MORT_NAMESPACE}creditScoreValue`);
  // Decision 0005 superseded vocab.md section 6: no cents-denominated fields.
  const keys = Object.keys(MORT);
  expect(keys.some((key) => key.toLowerCase().includes("cents"))).toBe(false);
  expect(keys.length).toBeGreaterThanOrEqual(36);
});
