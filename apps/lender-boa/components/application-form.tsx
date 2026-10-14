"use client";

import { DemoLockedField, IllustrativeFigure } from "@mortgage/ui";
import { useEffect, useState } from "react";
import { formatPercent, formatUsd } from "../lib/format";
import type { UrlaPrefill } from "../lib/server/prefill";

/** The LE payload reflected by POST /api/application/submit. */
interface SubmitResponse {
  simulated: true;
  applicationIri: string;
  decisionIri: string;
  decisionStatus: string;
  conditions: readonly string[];
  loanEstimate: {
    product: string;
    loanAmountUsd: number;
    loanTermMonths: number;
    interestRatePercent: number;
    aprPercent: number;
    monthlyPrincipalAndInterestUsd: number;
    estimatedClosingCostsUsd: number;
    tridTiming: string;
  };
}

export interface ApplicationFormProps {
  /** The demo-persona fallback the RSC page renders immediately. */
  demoPrefill: UrlaPrefill;
  /** The app's base path (multi-zone: client fetches must carry it). */
  apiBase: string;
}

/**
 * Scene-3 URLA-subset form: every field is a DemoLockedField (R7 — prefilled
 * from the demo persona or the caller's granted pod, read-only, "do not enter
 * real information"). Decision 0015: the pod prefill is attempted with the
 * BROWSER SESSION'S credentials — the API derives both borrower and pod from
 * the authenticated caller, so no pod/webid ever appears in a request. Without
 * an authenticated Solid session (the default in-browser demo, decision 0011)
 * the API answers 401 and the demo persona stays, with copy saying exactly
 * that.
 */
export function ApplicationForm({ demoPrefill, apiBase }: ApplicationFormProps) {
  const [prefill, setPrefill] = useState<UrlaPrefill>(demoPrefill);
  const [podConnected, setPodConnected] = useState(false);
  const [prefillError, setPrefillError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${apiBase}/application/prefill`);
        // ONLY 401 means "no authenticated session" — the honest demo fallback.
        if (response.status === 401) return;
        if (!response.ok) {
          // An AUTHENTICATED failure (403 binding, 5xx pod/config) is a real
          // error — surface it instead of masquerading as the demo fallback.
          if (!cancelled) {
            setPrefillError(`Pod prefill failed (${response.status}). Showing demo data.`);
          }
          return;
        }
        const body = (await response.json()) as UrlaPrefill;
        if (cancelled || body.source !== "pod") return;
        setPrefill(body);
        setPodConnected(true);
      } catch {
        if (!cancelled) {
          setPrefillError("Pod prefill failed (network). Showing demo data.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  async function submit() {
    if (!podConnected) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/application/submit`, { method: "POST" });
      const body = (await response.json()) as SubmitResponse & { detail?: string };
      if (!response.ok) {
        setError(body.detail ?? `Submission failed (${response.status}).`);
        return;
      }
      setResult(body);
    } catch {
      setError("Submission failed. Is the pod reachable?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-muted-foreground" data-prefill-source={prefill.source}>
        {podConnected
          ? "The lender read these values from Alex's pod. It checked their format and that they belong to Alex. It did not check credential signatures in this step."
          : prefillError !== null
            ? "Showing demo data for Alex. The pod prefill did not complete (details below)."
            : "Showing demo data for Alex. Prefill from the pod needs a signed-in borrower, which this in-browser demo does not have."}
      </p>
      {prefillError !== null && (
        <p className="mt-2 text-sm text-accent" data-prefill-error="" role="alert">
          {prefillError}
        </p>
      )}
      <form
        aria-label="Uniform Residential Loan Application (URLA), sections 1–2, demo"
        className="mt-6"
      >
        <fieldset className="rounded-lg border border-border bg-card p-5">
          <legend className="px-1 text-sm font-semibold text-foreground">
            Section 1 · Borrower information
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <DemoLockedField label="Name" value={prefill.borrower.name} />
            <DemoLockedField label="Date of birth" value={prefill.borrower.birthDate} />
            <DemoLockedField label="Email" value={prefill.borrower.email} />
            <DemoLockedField label="Phone" value={prefill.borrower.telephone} />
            <DemoLockedField label="Marital status" value={prefill.borrower.maritalStatus} />
            <DemoLockedField label="Current address" value={prefill.borrower.address} />
          </div>
        </fieldset>
        <fieldset className="mt-4 rounded-lg border border-border bg-card p-5">
          <legend className="px-1 text-sm font-semibold text-foreground">
            Section 1b · Employment and income
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <DemoLockedField label="Employer" value={prefill.employment.employerName} />
            <DemoLockedField label="Position" value={prefill.employment.jobTitle} />
            <DemoLockedField label="Start date" value={prefill.employment.startDate} />
            <DemoLockedField
              label="Monthly gross income"
              value={formatUsd(prefill.employment.monthlyGrossIncomeUsd)}
            />
          </div>
        </fieldset>
        <fieldset className="mt-4 rounded-lg border border-border bg-card p-5">
          <legend className="px-1 text-sm font-semibold text-foreground">
            Section 2 · Assets and liabilities
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {prefill.assets.accounts.map((account) => (
              <DemoLockedField
                key={`${account.providerName}-${account.accountLast4}`}
                label={`${account.providerName} (…${account.accountLast4})`}
                value={formatUsd(account.amountUsd)}
              />
            ))}
            <DemoLockedField
              label="Total monthly debts"
              value={formatUsd(prefill.credit.totalMonthlyDebtUsd)}
            />
            <DemoLockedField
              label="Credit score (from credit-score credential)"
              value={String(prefill.credit.creditScoreValue)}
            />
          </div>
        </fieldset>
      </form>

      <div className="mt-6">
        {podConnected ? (
          <button
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            disabled={busy || result !== null}
            onClick={submit}
            type="button"
          >
            {busy ? "Submitting…" : "Submit application"}
          </button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Submitting saves the application in Alex's pod, so it needs a signed-in borrower.
          </p>
        )}
        {error !== null && (
          <p className="mt-3 text-sm text-accent" role="alert">
            {error}
          </p>
        )}
      </div>

      {result !== null && (
        <>
          <section
            aria-labelledby="le-heading"
            className="mt-8 rounded-lg border border-border bg-card p-5"
            data-loan-estimate=""
          >
            <h2 id="le-heading" className="text-xl font-semibold text-card-foreground">
              Illustrative loan terms
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Application saved in Alex's pod. This summary is not a Loan Estimate or credit
              approval.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              The lender's Loan Estimate must be {result.loanEstimate.tridTiming} (12 CFR
              1026.19(e)(1)(iii)).
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Loan amount</dt>
                <dd className="font-semibold">
                  <IllustrativeFigure>
                    {formatUsd(result.loanEstimate.loanAmountUsd)}
                  </IllustrativeFigure>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Interest rate</dt>
                <dd className="font-semibold">
                  <IllustrativeFigure>
                    {formatPercent(result.loanEstimate.interestRatePercent)}
                  </IllustrativeFigure>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Monthly principal &amp; interest</dt>
                <dd className="font-semibold">
                  <IllustrativeFigure>
                    {formatUsd(result.loanEstimate.monthlyPrincipalAndInterestUsd)}
                  </IllustrativeFigure>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Estimated closing costs</dt>
                <dd className="font-semibold">
                  <IllustrativeFigure>
                    {formatUsd(result.loanEstimate.estimatedClosingCostsUsd)}
                  </IllustrativeFigure>
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              Saved: <code className="break-all">{result.applicationIri}</code>
            </p>
          </section>
          <section
            aria-labelledby="decision-heading"
            className="mt-4 rounded-lg border border-border bg-card p-5"
            data-underwriting-decision=""
          >
            <h2 id="decision-heading" className="text-xl font-semibold text-card-foreground">
              Underwriter decision (simulated)
            </h2>
            <p className="mt-2 font-semibold">
              <IllustrativeFigure>Approved with conditions</IllustrativeFigure>
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
              {result.conditions.map((condition) => (
                <li key={condition}>{condition}</li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Saved: <code className="break-all">{result.decisionIri}</code>
            </p>
          </section>
        </>
      )}
    </div>
  );
}
