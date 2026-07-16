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
            setPrefillError(
              `live pod prefill failed (${response.status}) — showing the demo persona`,
            );
          }
          return;
        }
        const body = (await response.json()) as UrlaPrefill;
        if (cancelled || body.source !== "pod") return;
        setPrefill(body);
        setPodConnected(true);
      } catch {
        if (!cancelled) {
          setPrefillError("live pod prefill failed (network) — showing the demo persona");
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
        setError(body.detail ?? `submission failed (${response.status})`);
        return;
      }
      setResult(body);
    } catch {
      setError("submission failed — is the pod reachable?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-muted-foreground" data-prefill-source={prefill.source}>
        {podConnected
          ? "These values were read live from your granted pod data — not re-typed into a form. This prefill only checks the data's shape (SHACL) and its subject binding; full credential-signature verification is not yet wired into this demo path (tracked)."
          : prefillError !== null
            ? "Showing the demo persona — the live pod prefill attempt did not complete (details below)."
            : "Showing the demo persona. The live pod prefill requires an authenticated borrower session (hosted mode) — in the default in-browser demo there is no real login, so this rail honestly stays off."}
      </p>
      {prefillError !== null && (
        <p className="mt-2 text-sm text-accent" data-prefill-error="" role="alert">
          {prefillError}
        </p>
      )}
      <form aria-label="Uniform Residential Loan Application (URLA subset, demo)" className="mt-6">
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
            Sections 2–3 · Assets and liabilities
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
              label="Credit score (soft, VC-attested)"
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
            {busy ? "Submitting…" : "Submit application (demo)"}
          </button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Submitting writes the application and the Loan Estimate into YOUR pod, so it needs the
            authenticated borrower session the prefill above explains. Without one, this form shows
            the demo persona.
          </p>
        )}
        {error !== null && (
          <p className="mt-3 text-sm text-accent" role="alert">
            {error}
          </p>
        )}
      </div>

      {result !== null && (
        <section
          aria-labelledby="le-heading"
          className="mt-8 rounded-lg border border-border bg-card p-5"
          data-loan-estimate=""
        >
          <h2 id="le-heading" className="text-xl font-semibold text-card-foreground">
            Loan Estimate
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            TRID requires the Loan Estimate to be {result.loanEstimate.tridTiming}. The application
            and its decision were written to your pod immediately:{" "}
            <code className="break-all">{result.applicationIri}</code> and{" "}
            <code className="break-all">{result.decisionIri}</code>. The estimate figures below are
            derived from that decision (illustrative — not an offer).
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
            <div>
              <dt className="text-sm text-muted-foreground">Decision</dt>
              <dd className="font-semibold">
                <IllustrativeFigure>Approved with conditions</IllustrativeFigure>
              </dd>
            </div>
          </dl>
          <ul className="mt-4 list-disc pl-5 text-sm text-muted-foreground">
            {result.conditions.map((condition) => (
              <li key={condition}>{condition}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
