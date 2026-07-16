"use client";

import { DemoLockedField, IllustrativeFigure } from "@mortgage/ui";
import { useState } from "react";
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
  prefill: UrlaPrefill;
  /** Present only when a granted pod backs the page (`?pod=&webid=`). */
  pod?: string;
  webid?: string;
  /** The app's base path (multi-zone: client fetches must carry it). */
  apiBase: string;
}

/**
 * Scene-3 URLA-subset form: every field is a DemoLockedField (R7 — prefilled
 * from the demo persona or the granted pod, read-only, "do not enter real
 * information"). Submitting delivers the Loan Estimate back into the pod.
 */
export function ApplicationForm({ prefill, pod, webid, apiBase }: ApplicationFormProps) {
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (pod === undefined || webid === undefined) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/application/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pod, webid }),
      });
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
      <form aria-label="Uniform Residential Loan Application (URLA subset, demo)">
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
        {pod !== undefined && webid !== undefined ? (
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
            Connect a granted pod (<code>?pod=&amp;webid=</code>) to submit and receive the Loan
            Estimate into the pod. Without one, this form shows the demo persona.
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
            Loan Estimate — delivered to your pod
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            TRID requires the Loan Estimate to be {result.loanEstimate.tridTiming}. Here it landed
            in your pod immediately: <code className="break-all">{result.applicationIri}</code> and{" "}
            <code className="break-all">{result.decisionIri}</code>.
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
