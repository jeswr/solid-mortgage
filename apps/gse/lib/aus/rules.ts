/**
 * DETERMINISTIC automated-underwriting rules (sm-32, journey scenes 3 + 4):
 * pure functions over the parsed granted loan file. No randomness, no clock —
 * every time-dependent signal (credential freshness) arrives as an explicit
 * pre-computed input, so the same loan file always produces byte-identical
 * findings. This module is the AUS role's whole "model": transparent,
 * threshold-based rules an examiner can read top to bottom, standing in for
 * the proprietary scorecard the real GSE system runs.
 *
 * Outcome model (role-based framing only — no vendor product vocabulary):
 *   - "approve": every evidence gate AND every risk rule passes;
 *   - "refer":   the EVIDENCE cannot be relied on (a credential failed the
 *                fail-closed verifier, attests a different subject, or its
 *                validity window lapsed) — re-verify through the existing
 *                grant, then re-run (the scene-4 beat);
 *   - "caution": the evidence verifies but a RISK threshold fails — not
 *                eligible for automated approval; manual underwriting.
 * Evidence problems take precedence over risk problems: numbers that cannot
 * be trusted are never risk-scored.
 */
import { FIBO, MORT } from "@mortgage/data-model";

/** The credential kinds an AUS run consumes from the granted loan file. */
export type EvidenceKind = "employment-income" | "assets" | "credit-score" | "appraisal";

/** Pre-computed evidence verdicts for ONE credential (clock resolved upstream). */
export interface AusEvidence {
  readonly kind: EvidenceKind;
  /** Full fail-closed `verifyCredential` verdict (signature + issuer + window + status + shape). */
  readonly verified: boolean;
  /** `credentialSubject == authenticated borrower WebID` (decision 0015 L3). */
  readonly subjectBound: boolean;
  /** Decision-0007 validity-window check at the evaluation instant. */
  readonly fresh: boolean;
  /** Distinct verifier failure codes (diagnostics; never secrets). */
  readonly verifyErrors: readonly string[];
}

/** The parsed loan file the rules run over — plain values, no RDF, no IO. */
export interface AusLoanFile {
  readonly monthlyGrossIncomeUsd: number;
  readonly totalMonthlyDebtUsd: number;
  readonly creditScoreValue: number;
  /** Sum of disclosed deposit-account balances. */
  readonly liquidAssetsUsd: number;
  readonly requestedAmountUsd: number;
  readonly loanTermMonths: number;
  readonly appraisedValueUsd: number;
  readonly evidence: readonly AusEvidence[];
}

export type AusOutcome = "approve" | "refer" | "caution";

export interface AusFinding {
  readonly code: string;
  /** "evidence" gates decide refer; "risk" rules decide caution. */
  readonly category: "evidence" | "risk";
  /** Human-readable rule statement (rendered verbatim in the findings report). */
  readonly rule: string;
  readonly pass: boolean;
  readonly observed: string;
  readonly threshold: string;
}

/** Derived qualifying figures (all deterministic; all illustrative in the demo). */
export interface AusQualifyingFigures {
  readonly evaluated: true;
  readonly qualifyingRatePercent: number;
  readonly proposedMonthlyPaymentUsd: number;
  readonly dtiPercent: number;
  readonly ltvPercent: number;
  readonly reservesMonths: number;
}

/**
 * FAIL-CLOSED presentation: when the evidence gate fails, the risk rules are
 * never evaluated and NO qualifying figures exist — figures derived from
 * numbers the verifier could not trust must never be presented as evaluated.
 */
export interface AusQualifyingUnevaluated {
  readonly evaluated: false;
  readonly reason: string;
}

export type AusQualifying = AusQualifyingFigures | AusQualifyingUnevaluated;

export interface AusResult {
  readonly outcome: AusOutcome;
  /**
   * Every EVALUATED finding. On "refer" this is the evidence findings only —
   * risk rules that never ran are not reported as if they had been.
   */
  readonly findings: readonly AusFinding[];
  readonly qualifying: AusQualifying;
  /** Conditions for the written underwriting decision (non-empty on every path). */
  readonly conditions: readonly string[];
}

/**
 * Published conforming-guideline-style thresholds (illustrative, deterministic
 * constants — the demo's stand-in for the proprietary risk model).
 */
export const AUS_THRESHOLDS = {
  /** Conventional conforming credit-score floor. */
  minCreditScore: 620,
  /** Back-end debt-to-income ceiling, percent. */
  maxDtiPercent: 45,
  /** Loan-to-value ceiling, percent. */
  maxLtvPercent: 95,
  /** Liquid reserves after close, in months of the proposed payment. */
  minReservesMonths: 2,
  /** Fixed qualifying note rate (deterministic input, matches the demo quote). */
  qualifyingRatePercent: 6.125,
} as const;

/** Fannie Mae B3-3.1-04 — the scene-4 freshness anchor quoted on decisions. */
export const VOE_RULE =
  "Verbal verification of employment within 10 business days before the note date (Fannie Mae B3-3.1-04)";

export const APPROVAL_CONDITION =
  "Provide updated employment verification within 10 business days of closing.";

const EVIDENCE_LABELS: Readonly<Record<EvidenceKind, string>> = {
  "employment-income": "employment + income credential",
  assets: "asset credential",
  "credit-score": "credit-score credential",
  appraisal: "appraisal credential",
};

const EVIDENCE_ORDER: readonly EvidenceKind[] = [
  "employment-income",
  "assets",
  "credit-score",
  "appraisal",
];

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Standard amortized monthly principal + interest, rounded to whole USD.
 * Same formula as the lender app's quote so the two rails agree on figures.
 */
export function proposedMonthlyPaymentUsd(
  principalUsd: number,
  annualRatePercent: number,
  termMonths: number,
): number {
  if (!(principalUsd > 0) || !(termMonths > 0) || !(annualRatePercent > 0)) return 0;
  const r = annualRatePercent / 100 / 12;
  const factor = (1 + r) ** termMonths;
  return Math.round((principalUsd * r * factor) / (factor - 1));
}

function evidenceFinding(evidence: AusEvidence): AusFinding {
  const failures: string[] = [];
  if (!evidence.verified) failures.push("failed fail-closed verification");
  if (!evidence.subjectBound) failures.push("attests a different subject");
  if (!evidence.fresh) failures.push("validity window lapsed");
  const pass = failures.length === 0;
  return {
    category: "evidence",
    code: `EVIDENCE_${evidence.kind.toUpperCase().replace(/-/g, "_")}`,
    observed: pass
      ? "verified, subject-bound, and within its validity window"
      : failures.join("; "),
    pass,
    rule: `The ${EVIDENCE_LABELS[evidence.kind]} must fully verify, attest the applicant, and be within its validity window`,
    threshold: "verified AND subject-bound AND fresh",
  };
}

/**
 * Run the deterministic rule set. Pure: same input, same output — no clock,
 * no randomness, no IO. Non-finite or non-positive figures never crash the
 * run; they fail their rule (fail-closed) with an explicit observation.
 */
export function runAusRules(file: AusLoanFile): AusResult {
  const t = AUS_THRESHOLDS;

  // ── Evidence gates (decide "refer") ────────────────────────────────────
  const byKind = new Map(file.evidence.map((entry) => [entry.kind, entry]));
  const evidenceFindings: AusFinding[] = EVIDENCE_ORDER.map((kind) => {
    const entry = byKind.get(kind);
    if (entry !== undefined) return evidenceFinding(entry);
    return {
      category: "evidence",
      code: `EVIDENCE_${kind.toUpperCase().replace(/-/g, "_")}`,
      observed: "credential missing from the granted loan file",
      pass: false,
      rule: `The ${EVIDENCE_LABELS[kind]} must fully verify, attest the applicant, and be within its validity window`,
      threshold: "verified AND subject-bound AND fresh",
    };
  });

  // FAIL-CLOSED STOP (the evidence gate): when any credential cannot be
  // relied on, the risk rules are NOT evaluated and no qualifying figures
  // are derived — untrusted numbers are never risk-scored, and nothing
  // downstream may present them as if they had been.
  const failedEvidence = evidenceFindings.filter((finding) => !finding.pass);
  if (failedEvidence.length > 0) {
    return {
      conditions: failedEvidence.map(
        (finding) => `${finding.rule} — observed: ${finding.observed} (${finding.threshold}).`,
      ),
      findings: evidenceFindings,
      outcome: "refer",
      qualifying: {
        evaluated: false,
        reason:
          "the evidence gate failed — risk rules and qualifying figures were not evaluated on unverified data",
      },
    };
  }

  // ── Risk rules (decide "caution") ──────────────────────────────────────
  const payment = proposedMonthlyPaymentUsd(
    file.requestedAmountUsd,
    t.qualifyingRatePercent,
    file.loanTermMonths,
  );
  const dtiComputable = file.monthlyGrossIncomeUsd > 0 && payment > 0;
  const dtiPercent = dtiComputable
    ? round1(((file.totalMonthlyDebtUsd + payment) / file.monthlyGrossIncomeUsd) * 100)
    : Number.NaN;
  const ltvComputable = file.appraisedValueUsd > 0 && file.requestedAmountUsd > 0;
  const ltvPercent = ltvComputable
    ? round1((file.requestedAmountUsd / file.appraisedValueUsd) * 100)
    : Number.NaN;
  const reservesComputable = payment > 0 && file.liquidAssetsUsd >= 0;
  const reservesMonths = reservesComputable ? round1(file.liquidAssetsUsd / payment) : Number.NaN;

  const riskFindings: AusFinding[] = [
    {
      category: "risk",
      code: "CREDIT_SCORE_MINIMUM",
      observed: Number.isFinite(file.creditScoreValue)
        ? String(file.creditScoreValue)
        : "not computable",
      pass: Number.isFinite(file.creditScoreValue) && file.creditScoreValue >= t.minCreditScore,
      rule: "Representative credit score meets the conforming floor",
      threshold: `>= ${t.minCreditScore}`,
    },
    {
      category: "risk",
      code: "DEBT_TO_INCOME",
      observed: dtiComputable ? `${dtiPercent}%` : "not computable",
      pass: dtiComputable && dtiPercent <= t.maxDtiPercent,
      rule: "Back-end debt-to-income ratio (existing debts + proposed payment over gross income)",
      threshold: `<= ${t.maxDtiPercent}%`,
    },
    {
      category: "risk",
      code: "LOAN_TO_VALUE",
      observed: ltvComputable ? `${ltvPercent}%` : "not computable",
      pass: ltvComputable && ltvPercent <= t.maxLtvPercent,
      rule: "Loan-to-value ratio against the appraised value",
      threshold: `<= ${t.maxLtvPercent}%`,
    },
    {
      category: "risk",
      code: "RESERVES",
      observed: reservesComputable ? `${reservesMonths} months` : "not computable",
      pass: reservesComputable && reservesMonths >= t.minReservesMonths,
      rule: "Liquid reserves cover the proposed monthly payment",
      threshold: `>= ${t.minReservesMonths} months`,
    },
  ];

  const findings = [...evidenceFindings, ...riskFindings];
  const failedRisk = riskFindings.filter((finding) => !finding.pass);
  const outcome: AusOutcome = failedRisk.length > 0 ? "caution" : "approve";

  const conditions =
    outcome === "approve"
      ? [APPROVAL_CONDITION]
      : failedRisk.map(
          (finding) => `${finding.rule} — observed: ${finding.observed} (${finding.threshold}).`,
        );

  return {
    conditions,
    findings,
    outcome,
    qualifying: {
      dtiPercent,
      evaluated: true,
      ltvPercent,
      proposedMonthlyPaymentUsd: payment,
      qualifyingRatePercent: t.qualifyingRatePercent,
      reservesMonths,
    },
  };
}

/** The FIBO AUS-recommendation named individual for an outcome. */
export function recommendationIriOf(outcome: AusOutcome): string {
  switch (outcome) {
    case "approve":
      return FIBO.UnderwritingDecision_Approve;
    case "refer":
      return FIBO.UnderwritingDecision_Refer;
    case "caution":
      return FIBO.UnderwritingDecision_Ineligible;
  }
}

/** The mort: decision-status concept for an outcome. */
export function decisionStatusIriOf(outcome: AusOutcome): string {
  return outcome === "approve"
    ? MORT.DecisionStatus_ApprovedWithConditions
    : MORT.DecisionStatus_Suspended;
}
