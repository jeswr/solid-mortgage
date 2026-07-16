/**
 * The DETERMINISTIC AUS rules, tested directly against the pure functions
 * (sm-32): approve / refer / caution paths, evidence-over-risk precedence,
 * fail-closed behaviour on degenerate figures, and determinism. No IO, no
 * clock, no mocks — the module under test is pure by contract.
 */
import { FIBO, MORT } from "@mortgage/data-model";
import { describe, expect, test } from "vitest";
import {
  APPROVAL_CONDITION,
  AUS_THRESHOLDS,
  type AusEvidence,
  type AusLoanFile,
  decisionStatusIriOf,
  type EvidenceKind,
  proposedMonthlyPaymentUsd,
  recommendationIriOf,
  runAusRules,
} from "../lib/aus/rules";

const KINDS: readonly EvidenceKind[] = ["employment-income", "assets", "credit-score", "appraisal"];

function greenEvidence(overrides: Partial<Record<EvidenceKind, Partial<AusEvidence>>> = {}) {
  return KINDS.map(
    (kind): AusEvidence => ({
      fresh: true,
      kind,
      propertyBound: true,
      subjectBound: true,
      verified: true,
      verifyErrors: [],
      ...overrides[kind],
    }),
  );
}

/** The demo persona's figures — the scripted approve path. */
function approvableFile(overrides: Partial<AusLoanFile> = {}): AusLoanFile {
  return {
    appraisedValueUsd: 425000,
    creditScoreValue: 745,
    evidence: greenEvidence(),
    liquidAssetsUsd: 97400,
    loanTermMonths: 360,
    monthlyGrossIncomeUsd: 8200,
    requestedAmountUsd: 340000,
    totalMonthlyDebtUsd: 610,
    ...overrides,
  };
}

describe("the approve path", () => {
  test("all-green evidence + conforming figures approve with the VOE condition", () => {
    const result = runAusRules(approvableFile());
    expect(result.outcome).toBe("approve");
    expect(result.findings.every((finding) => finding.pass)).toBe(true);
    expect(result.conditions).toEqual([APPROVAL_CONDITION]);
  });

  test("the qualifying figures are exact and deterministic", () => {
    const { qualifying } = runAusRules(approvableFile());
    expect(qualifying.evaluated).toBe(true);
    if (!qualifying.evaluated) throw new Error("unreachable: approve emits figures");
    // 340,000 @ 6.125% / 360 months — the standard amortization formula.
    expect(qualifying.proposedMonthlyPaymentUsd).toBe(
      proposedMonthlyPaymentUsd(340000, AUS_THRESHOLDS.qualifyingRatePercent, 360),
    );
    expect(qualifying.proposedMonthlyPaymentUsd).toBe(2066);
    expect(qualifying.dtiPercent).toBe(32.6); // (610 + 2066) / 8200
    expect(qualifying.ltvPercent).toBe(80); // 340,000 / 425,000
    expect(qualifying.reservesMonths).toBe(47.1); // 97,400 / 2,066
    expect(qualifying.qualifyingRatePercent).toBe(6.125);
  });

  test("identical input produces identical output (purity)", () => {
    const file = approvableFile();
    expect(runAusRules(file)).toEqual(runAusRules(file));
  });
});

describe("the refer path (evidence gate)", () => {
  test("a stale employment credential refers the file", () => {
    const result = runAusRules(
      approvableFile({ evidence: greenEvidence({ "employment-income": { fresh: false } }) }),
    );
    expect(result.outcome).toBe("refer");
    const finding = result.findings.find((entry) => entry.code === "EVIDENCE_EMPLOYMENT_INCOME");
    expect(finding?.pass).toBe(false);
    expect(finding?.observed).toContain("validity window lapsed");
    expect(result.conditions.some((line) => line.includes("employment"))).toBe(true);
  });

  test("an unverified credential refers the file", () => {
    const result = runAusRules(
      approvableFile({
        evidence: greenEvidence({
          assets: { verified: false, verifyErrors: ["PROOF_INVALID"] },
        }),
      }),
    );
    expect(result.outcome).toBe("refer");
    expect(result.findings.find((entry) => entry.code === "EVIDENCE_ASSETS")?.pass).toBe(false);
  });

  test("a credential attesting a different subject refers the file", () => {
    const result = runAusRules(
      approvableFile({
        evidence: greenEvidence({ "credit-score": { subjectBound: false } }),
      }),
    );
    expect(result.outcome).toBe("refer");
    expect(
      result.findings.find((entry) => entry.code === "EVIDENCE_CREDIT_SCORE")?.observed,
    ).toContain("different subject");
  });

  test("a verified appraisal bound to a DIFFERENT property refers the file (no LTV from it)", () => {
    const result = runAusRules(
      approvableFile({
        appraisedValueUsd: 900000, // the mismatched appraisal's inflated value
        evidence: greenEvidence({ appraisal: { propertyBound: false } }),
      }),
    );
    expect(result.outcome).toBe("refer");
    const finding = result.findings.find((entry) => entry.code === "EVIDENCE_APPRAISAL");
    expect(finding?.pass).toBe(false);
    expect(finding?.observed).toContain("different property");
    // The FIX-1 stop guarantees the inflated denominator is never scored.
    expect(result.qualifying.evaluated).toBe(false);
    expect(result.findings.some((entry) => entry.code === "LOAN_TO_VALUE")).toBe(false);
  });

  test("a missing credential refers the file (never scored around)", () => {
    const result = runAusRules(
      approvableFile({
        evidence: greenEvidence().filter((entry) => entry.kind !== "appraisal"),
      }),
    );
    expect(result.outcome).toBe("refer");
    expect(result.findings.find((entry) => entry.code === "EVIDENCE_APPRAISAL")?.observed).toBe(
      "credential missing from the granted loan file",
    );
  });

  test("evidence problems take precedence over risk problems", () => {
    const result = runAusRules(
      approvableFile({
        creditScoreValue: 500, // would be caution on its own
        evidence: greenEvidence({ "employment-income": { fresh: false } }),
      }),
    );
    expect(result.outcome).toBe("refer");
  });

  test("a failed evidence gate emits NO qualifying figures and NO risk findings (fail-closed presentation)", () => {
    const result = runAusRules(
      approvableFile({ evidence: greenEvidence({ "employment-income": { fresh: false } }) }),
    );
    // The stop is total: figures derived from unverified numbers are never
    // presented as evaluated, and risk rules that never ran are not reported.
    expect(result.qualifying).toEqual({
      evaluated: false,
      reason: expect.stringContaining("not evaluated"),
    });
    expect(result.findings.every((finding) => finding.category === "evidence")).toBe(true);
    expect(result.findings.some((finding) => finding.category === "risk")).toBe(false);
  });
});

describe("the caution path (risk rules)", () => {
  test("a credit score below the floor cautions", () => {
    const result = runAusRules(approvableFile({ creditScoreValue: 599 }));
    expect(result.outcome).toBe("caution");
    const finding = result.findings.find((entry) => entry.code === "CREDIT_SCORE_MINIMUM");
    expect(finding?.pass).toBe(false);
    expect(finding?.observed).toBe("599");
  });

  test("a DTI above the ceiling cautions", () => {
    const result = runAusRules(approvableFile({ monthlyGrossIncomeUsd: 4000 }));
    expect(result.outcome).toBe("caution");
    expect(result.findings.find((entry) => entry.code === "DEBT_TO_INCOME")?.pass).toBe(false);
  });

  test("an LTV above the ceiling cautions", () => {
    const result = runAusRules(approvableFile({ requestedAmountUsd: 420000 }));
    expect(result.outcome).toBe("caution");
    const finding = result.findings.find((entry) => entry.code === "LOAN_TO_VALUE");
    expect(finding?.pass).toBe(false);
    expect(finding?.observed).toBe("98.8%");
  });

  test("insufficient reserves caution", () => {
    const result = runAusRules(approvableFile({ liquidAssetsUsd: 1000 }));
    expect(result.outcome).toBe("caution");
    expect(result.findings.find((entry) => entry.code === "RESERVES")?.pass).toBe(false);
  });

  test("the caution conditions quote the failed risk rules", () => {
    const result = runAusRules(approvableFile({ creditScoreValue: 599 }));
    expect(result.conditions).toHaveLength(1);
    expect(result.conditions[0]).toContain("credit score");
  });

  test("degenerate figures fail their rule instead of crashing (fail-closed)", () => {
    const result = runAusRules(approvableFile({ monthlyGrossIncomeUsd: 0 }));
    expect(result.outcome).toBe("caution");
    const finding = result.findings.find((entry) => entry.code === "DEBT_TO_INCOME");
    expect(finding?.pass).toBe(false);
    expect(finding?.observed).toBe("not computable");
  });
});

describe("the RDF mappings", () => {
  test("outcomes map to the FIBO recommendation and mort decision-status concepts", () => {
    expect(recommendationIriOf("approve")).toBe(FIBO.UnderwritingDecision_Approve);
    expect(recommendationIriOf("refer")).toBe(FIBO.UnderwritingDecision_Refer);
    expect(recommendationIriOf("caution")).toBe(FIBO.UnderwritingDecision_Ineligible);
    expect(decisionStatusIriOf("approve")).toBe(MORT.DecisionStatus_ApprovedWithConditions);
    expect(decisionStatusIriOf("refer")).toBe(MORT.DecisionStatus_Suspended);
    expect(decisionStatusIriOf("caution")).toBe(MORT.DecisionStatus_Suspended);
  });
});
