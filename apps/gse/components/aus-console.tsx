"use client";

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
  qualifying: {
    qualifyingRatePercent: number;
    proposedMonthlyPaymentUsd: number;
    dtiPercent: number | null;
    ltvPercent: number | null;
    reservesMonths: number | null;
  };
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

const OUTCOME_COPY: Record<AusRunResponse["outcome"], string> = {
  approve:
    "Approve — every credential verified and every risk rule passed. The decision and findings were written into the borrower's pod.",
  refer:
    "Refer — the evidence cannot be relied on (a credential failed verification, attests a different subject, or its validity window lapsed). Re-verify through the existing grant, then re-run.",
  caution:
    "Caution — the evidence verifies, but a risk threshold failed. Not eligible for automated approval; route to manual underwriting.",
};

/**
 * The AUS run console: one click runs the deterministic rules over the
 * caller's OWN granted loan file (decision 0015 — the API derives borrower
 * and pod from the authenticated session; no pod parameter exists) and shows
 * the findings exactly as they were written into the pod. Without an
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
      setError("the AUS run failed — is the pod reachable?");
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
        Automated underwriting run
      </h2>
      <button
        className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        disabled={busy}
        onClick={run}
        type="button"
      >
        {busy ? "Running…" : report === null ? "Run automated underwriting" : "Re-run"}
      </button>

      {authRequired && (
        <p className="mt-3 text-sm text-muted-foreground" data-aus-auth-required="">
          The run reads YOUR granted loan file, so it requires an authenticated borrower session
          (hosted mode). The default in-browser demo has no real login — the rail honestly stays off
          rather than simulating a security property it does not have.
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
            Recommendation: {report.recommendation}
            <span className="text-sm font-normal text-muted-foreground">
              {" — illustrative decision, not an offer"}
            </span>
          </p>
          <p className="mt-2 text-sm text-foreground">{OUTCOME_COPY[report.outcome]}</p>

          <dl className="mt-4 grid gap-3 sm:grid-cols-4">
            <div>
              <dt className="text-sm text-muted-foreground">Qualifying payment</dt>
              <dd className="text-sm font-semibold tabular-nums">
                {report.qualifying.proposedMonthlyPaymentUsd > 0
                  ? `$${report.qualifying.proposedMonthlyPaymentUsd.toLocaleString("en-US")}/mo`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Debt-to-income</dt>
              <dd className="text-sm font-semibold tabular-nums">
                {report.qualifying.dtiPercent ?? "—"}%
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Loan-to-value</dt>
              <dd className="text-sm font-semibold tabular-nums">
                {report.qualifying.ltvPercent ?? "—"}%
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Reserves</dt>
              <dd className="text-sm font-semibold tabular-nums">
                {report.qualifying.reservesMonths ?? "—"} months
              </dd>
            </div>
          </dl>

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
                    {finding.rule}{" "}
                    <span className="text-muted-foreground">({finding.threshold})</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {finding.pass ? "pass" : "fail"} · observed: {finding.observed}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Delivered
          </h3>
          <p className="mt-2 break-all text-sm text-muted-foreground" data-aus-decision-iri="">
            Decision + findings written to <code>{report.decisionIri}</code> — readable by the
            borrower and by every party the borrower's grant names.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{report.rule}</p>
        </div>
      )}
    </section>
  );
}
