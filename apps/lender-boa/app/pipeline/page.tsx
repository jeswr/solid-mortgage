import { PERSONA_VALUES } from "@mortgage/data-model";
import { IllustrativeFigure } from "@mortgage/ui";
import { formatUsd } from "../../lib/format";
import { site } from "../site";

export const metadata = {
  title: `Loan-officer pipeline — Concept Demo (not ${site.organization})`,
};

const STAGES: Readonly<Record<string, string>> = {
  "alex-rivera": "Conditional approval — pre-close re-verification due",
  "jordan-avery": "Underwriting — evidence complete",
};

/**
 * The loan-officer view of the same journey (demo data: the two persona
 * fixtures). Every figure is illustrative; evidence arrives as verifiable
 * credentials under the borrower's grant, so there is nothing to re-collect.
 */
export default function PipelinePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Lender view · origination pipeline
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        Loan-officer pipeline
      </h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Each file's evidence is the borrower's own verified credentials, read under a revocable
        grant — no document chasing, no stale verifications, full audit trail.
      </p>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Demo pipeline of loan applications (all data simulated)
          </caption>
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4 font-medium" scope="col">
                Borrower (demo persona)
              </th>
              <th className="py-2 pr-4 font-medium" scope="col">
                Requested loan
              </th>
              <th className="py-2 pr-4 font-medium" scope="col">
                DTI evidence
              </th>
              <th className="py-2 pr-4 font-medium" scope="col">
                Stage
              </th>
              <th className="py-2 font-medium" scope="col">
                Decision
              </th>
            </tr>
          </thead>
          <tbody>
            {PERSONA_VALUES.map((persona) => (
              <tr key={persona.id} className="border-b border-border align-top">
                <th className="py-3 pr-4 font-semibold text-foreground" scope="row">
                  {persona.name}
                </th>
                <td className="py-3 pr-4">
                  <IllustrativeFigure>{formatUsd(persona.requestedLoanUsd)}</IllustrativeFigure>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  debts {formatUsd(persona.totalMonthlyDebtUsd)} / income{" "}
                  {formatUsd(persona.monthlyGrossIncomeUsd)} per month (VC-attested)
                </td>
                <td className="py-3 pr-4 text-muted-foreground">{STAGES[persona.id]}</td>
                <td className="py-3 font-semibold">
                  <IllustrativeFigure>Approved with conditions</IllustrativeFigure>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
