import { expect, test } from "vitest";
import { demoPersona, zkThresholds } from "../app/content/persona";

/**
 * The demo identity must satisfy every scene-2 statement under the decision-0005 encodings
 * — whole-USD 4-digit income budget, 3-digit score, recast DTI bound — or the scripted
 * proofs would fail on stage. (Canonical fixtures land with sm-20; until this card imports
 * them, these tests pin the consistency contract.)
 */

test("income proves ≥ $7,000/mo inside the 4-digit whole-USD budget", () => {
  expect(Number.isInteger(demoPersona.monthlyGrossIncomeUsd)).toBe(true);
  expect(demoPersona.monthlyGrossIncomeUsd).toBeGreaterThanOrEqual(
    zkThresholds.monthlyIncomeMinUsd,
  );
  expect(demoPersona.monthlyGrossIncomeUsd).toBeLessThanOrEqual(9999);
});

test("credit score proves ≥ 620 inside the 3-digit budget", () => {
  expect(Number.isInteger(demoPersona.creditScore)).toBe(true);
  expect(demoPersona.creditScore).toBeGreaterThanOrEqual(zkThresholds.creditScoreMin);
  expect(demoPersona.creditScore).toBeLessThanOrEqual(850);
});

test("monthly debts satisfy the recast DTI bound (≤ floor(0.43 × income))", () => {
  expect(Number.isInteger(demoPersona.monthlyDebtsUsd)).toBe(true);
  expect(demoPersona.monthlyDebtsUsd).toBeLessThanOrEqual(
    Math.floor(zkThresholds.dtiRatioMax * demoPersona.monthlyGrossIncomeUsd),
  );
  expect(demoPersona.monthlyDebtsUsd).toBeLessThanOrEqual(9999);
});

test("persona is explicitly fictional", () => {
  expect(demoPersona.descriptor.toLowerCase()).toContain("fictional");
  expect(demoPersona.employer.toLowerCase()).toContain("fictional");
});
