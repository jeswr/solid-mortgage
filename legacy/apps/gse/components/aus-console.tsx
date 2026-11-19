"use client";

import { IllustrativeFigure } from "@mortgage/ui";
import { useCallback, useState } from "react";

interface AusEvidenceView {
  kind: string;
  verified: boolean;
  subjectBound: boolean;
  fresh: boolean;
  verifyErrors: string[];
}

interface AusFindingView {
  code: string;
  category: "evidence" | "risk";
  rule: string;
  pass: boolean;
  observed: string;
  threshold: string;
}

interface AusRunResponse {
  simulated: true;
  outcome: "approve" | "refer" | "caution";
  recommendation: string;
  findings: AusFindingView[];
  evidence: AusEvidenceView[];
  qualifying:
    | {
        evaluated: true;
        qualifyingRatePercent: number;
        proposedMonthlyPaymentUsd: number;
        dtiPercent: number | null;
        ltvPercent: number | null;
        assetsToPaymentMonths: number | null;
      }
    | { evaluated: false; reason: string };
  conditions: string[];
  applicationIri: string;
  decisionIri: string;
  evaluatedAt: string;
  rule: string;
  detail?: string;
}

export interface AusConsoleProps {
  apiBase: string;
}

/**
 * Display recommendation per outcome. The API's `recommendation` string is
 * the FIBO-aligned label written to the pod (unit-tested); the screen uses
 * the GSE risk-class terms (Accept / Caution) and shows a verification
 * failure as a validation message, not a risk class.
 */
const OUTCOME_LABEL: Record<AusRunResponse["outcome"], string> = {
  approve: "Accept",
  // Stored in the pod as FIBO UnderwritingDecision-Ineligible (FIBO has no
  // caution individual); it is always DISPLAYED as caution, never "Ineligible".
  caution: "Caution — manual underwriting review required",
  refer: "Unable to validate",
};

const OUTCOME_COPY: Record<AusRunResponse["outcome"], string> = {
  approve:
    "All configured demo checks passed. This is not a complete underwriting assessment. The lender's underwriter makes the credit decision.",
  refer:
    "One or more credentials could not be validated. Obtain a new verification, then run the AUS again.",
  caution:
    "The credentials passed their checks, but a demo threshold failed. The lender's underwriter must review the loan manually.",
};

/**
 * Neutral finding names by finding code (the rule text is stored in the pod).
 * The name never states the outcome — that is the separate result field.
 */
const FINDING_LABEL: Readonly<Record<string, string>> = {
  EVIDENCE_EMPLOYMENT_INCOME: "Employment credential",
  EVIDENCE_ASSETS: "Asset credential",
  EVIDENCE_CREDIT_SCORE: "Credit-score credential",
  EVIDENCE_APPRAISAL: "Appraisal credential",
  CREDIT_SCORE_MINIMUM: "Credit-score threshold",
  DEBT_TO_INCOME: "Debt-to-income ratio (principal and interest only)",
  LOAN_TO_VALUE: "Loan-to-value ratio (appraised value)",
};

/** The separate result field: a failed credential is "Unable to validate". */
function findingResult(finding: AusFindingView): "Passed" | "Failed" | "Unable to validate" {
  if (finding.pass) return "Passed";
  return finding.category === "evidence" ? "Unable to validate" : "Failed";
}

const OBSERVED_PLAIN: readonly (readonly [string, string])[] = [
  ["failed fail-closed verification", "signature, issuer or status check failed"],
  ["attests a different subject", "names a different person"],
  ["validity window lapsed", "expired"],
  ["credential missing from the granted loan file", "missing from the loan file"],
];

function plainObserved(finding: AusFindingView): string {
  if (finding.category === "evidence" && finding.pass) return "checks passed";
  return OBSERVED_PLAIN.reduce((text, [from, to]) => text.replace(from, to), finding.observed);
}

/**
 * The AUS run console: one click runs the deterministic rules over the
 * caller's OWN granted loan file (decision 0015 — the API derives borrower
 * and pod from the authenticated session; no pod parameter exists) and shows
 * the full findings report from the response payload — the pod receives the
 * decision DOCUMENT (status, recommendation, conditions quoting the failed
 * findings), and the "Saved to the pod" copy below says exactly that. Without an
 * authenticated Solid session (the default in-browser demo) the API answers
 * 401 and the panel says so honestly instead of simulating a run.
 */
export function AusConsole({ apiBase }: AusConsoleProps) {
  const [report, setReport] = useState<AusRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    setAuthRequired(false);
    // Invalidate any prior result so a stale report is never shown beside a
    // fresh error or during the in-flight re-run.
    setReport(null);
    try {
      const response = await fetch(`${apiBase}/aus/run`, { method: "POST" });
      if (response.status === 401) {
        setAuthRequired(true);
        return;
      }
      const body = (await response.json()) as AusRunResponse;
      if (!response.ok) {
        setError(body.detail ?? `the AUS run failed (${response.status})`);
        return;
      }
      setReport(body);
    } catch {
      setError("The AUS run failed. Check that the pod is reachable.");
    } finally {
      setBusy(false);
    }
  }, [apiBase]);

  return (
    <section
      aria-labelledby="aus-run-heading"
      className="rounded-lg border border-border bg-card p-5"
      data-aus-console=""
    >
      <h2 className="text-xl font-semibold text-card-foreground" id="aus-run-heading">
        Run the AUS
      </h2>
      <button
        className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        disabled={busy}
        onClick={run}
        type="button"
      >
        {busy ? "Running…" : report === null ? "Run AUS" : "Run AUS again"}
      </button>

      {authRequired && (
        <p className="mt-3 text-sm text-muted-foreground" data-aus-auth-required="">
          Sign-in is simulated here, so the AUS cannot read a loan file. Running it needs a real
          Solid sign-in.
        </p>
      )}
      {error !== null && (
        <p className="mt-3 text-sm text-accent-foreground" role="alert">
          {error}
        </p>
      )}

      {report !== null && (
        <div className="mt-5" data-aus-result={report.outcome}>
          <p className="text-lg font-semibold text-card-foreground">
            AUS recommendation: {OUTCOME_LABEL[report.outcome]}
            <span className="text-sm font-normal text-muted-foreground">
              {" — illustrative decision, not an offer"}
            </span>
          </p>
          <p className="mt-2 text-sm text-foreground">{OUTCOME_COPY[report.outcome]}</p>

          {report.qualifying.evaluated ? (
            <>
              <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <dt className="text-sm text-muted-foreground">Monthly principal and interest</dt>
                  <dd className="text-sm font-semibold tabular-nums">
                    {report.qualifying.proposedMonthlyPaymentUsd > 0 ? (
                      <IllustrativeFigure>
                        {`$${report.qualifying.proposedMonthlyPaymentUsd.toLocaleString("en-US")} a month`}
                      </IllustrativeFigure>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Debt-to-income (P&amp;I only)</dt>
                  <dd className="text-sm font-semibold tabular-nums">
                    {report.qualifying.dtiPercent ?? "—"}%
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Loan-to-value (appraised value)</dt>
                  <dd className="text-sm font-semibold tabular-nums">
                    {report.qualifying.ltvPercent ?? "—"}%
                  </dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-muted-foreground" data-aus-calculation-note="">
                Simplified demo calculations. Taxes, insurance, assessments and funds needed to
                close are not included.
              </p>
              <p className="mt-2 text-sm text-foreground" data-aus-assets-ratio="">
                Assets ÷ monthly principal and interest:{" "}
                {report.qualifying.assetsToPaymentMonths ?? "—"} months — illustrative. Funds to
                close are not deducted; this is not a reserve assessment.
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground" data-aus-qualifying="unevaluated">
              Not calculated, because a credential could not be validated.
            </p>
          )}

          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Findings
          </h3>
          <ul className="mt-2 list-none divide-y divide-border p-0">
            {report.findings.map((finding) => (
              <li
                className="flex items-start gap-3 py-2"
                data-finding={finding.code}
                key={finding.code}
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                    finding.pass ? "bg-primary" : "bg-accent"
                  }`}
                />
                <div>
                  <p className="text-sm text-card-foreground">
                    {FINDING_LABEL[finding.code] ?? finding.rule}
                    {finding.category === "risk" && (
                      <span className="text-muted-foreground"> ({finding.threshold})</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span
                      className="font-semibold text-card-foreground"
                      data-finding-result={finding.pass ? "pass" : "fail"}
                    >
                      {findingResult(finding)}
                    </span>
                    {" · "}
                    {plainObserved(finding)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Saved to the pod
          </h3>
          <p className="mt-2 break-all text-sm text-muted-foreground" data-aus-decision-iri="">
            The recommendation and conditions are saved at <code>{report.decisionIri}</code>. The
            lender can read them only with the borrower&apos;s permission.
          </p>
        </div>
      )}
    </section>
  );
}
