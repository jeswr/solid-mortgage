import { PERSONA_VALUES } from "@mortgage/data-model";
import { IllustrativeFigure } from "@mortgage/ui";
import { LivePipeline } from "../../components/live-pipeline";
import { formatUsd } from "../../lib/format";
import { site } from "../site";

export const metadata = {
  title: `Loan pipeline — Concept Demo (not ${site.organization})`,
};

/** Alex's file appears in the live queue, so the static sample shows only the others. */
const SAMPLE_FILES = PERSONA_VALUES.filter((persona) => persona.id !== "alex-rivera");

/**
 * The lender's view of the same journey. The live queue reads submitted files
 * from the borrower's pod; the sample table is illustrative persona data.
 */
export default function PipelinePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Lender view
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Loan pipeline</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        The lender reads each application from the borrower's pod, with the borrower's permission.
      </p>
      <p className="mt-2 max-w-2xl text-muted-foreground text-sm">
        The automated underwriting system (AUS) returns a recommendation. The underwriter approves
        with conditions, then marks the loan clear to close when the conditions are met.
      </p>
      <section aria-labelledby="queue-heading" className="mt-8">
        <h2 className="font-semibold text-foreground text-xl" id="queue-heading">
          Queue
        </h2>
        <LivePipeline apiBase="/lender-boa/api" />
      </section>
      <h2 className="mt-12 font-semibold text-foreground text-xl">Sample files (simulated)</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Sample loan applications (all data simulated)</caption>
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4 font-medium" scope="col">
                Borrower
              </th>
              <th className="py-2 pr-4 font-medium" scope="col">
                Requested loan
              </th>
              <th className="py-2 pr-4 font-medium" scope="col">
                Debts and income
              </th>
              <th className="py-2 font-medium" scope="col">
                Underwriter decision
              </th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_FILES.map((persona) => (
              <tr key={persona.id} className="border-b border-border align-top">
                <th className="py-3 pr-4 font-semibold text-foreground" scope="row">
                  {persona.name}
                </th>
                <td className="py-3 pr-4">
                  <IllustrativeFigure>{formatUsd(persona.requestedLoanUsd)}</IllustrativeFigure>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  Debts {formatUsd(persona.totalMonthlyDebtUsd)} and income{" "}
                  {formatUsd(persona.monthlyGrossIncomeUsd)} a month, from credentials
                </td>
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
