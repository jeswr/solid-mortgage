import { HonestyPanel } from "@mortgage/ui";
import { AusConsole } from "../../components/aus-console";
import { AUS_THRESHOLDS } from "../../lib/aus/rules";
import { site } from "../site";

export const metadata = {
  title: `Run AUS — Concept Demo (not ${site.organization})`,
};

/**
 * Scenes 3 + 4: the AUS run over the granted loan file, and the re-run after
 * a stale credential is re-issued through the existing grant. The rules are
 * DETERMINISTIC — the thresholds rendered below are the entire model.
 */
export default function UnderwritingPage() {
  const t = AUS_THRESHOLDS;
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Apply · Re-verify
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        Review the AUS recommendation
      </h1>
      <p className="mt-4 text-muted-foreground">
        The AUS checks Alex&apos;s loan file and returns findings. The lender&apos;s underwriter
        makes the credit decision.
      </p>

      <div className="mt-8">
        <AusConsole apiBase="/gse/api" />
        <p className="mt-3 text-xs text-muted-foreground">
          The AUS reads only the signed-in borrower&apos;s pod, and only after the borrower gives it
          access.
        </p>
      </div>

      <section aria-labelledby="aus-model" className="mt-10">
        <h2
          className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          id="aus-model"
        >
          Demo rules (illustrative)
        </h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
          <li>Credit score of {t.minCreditScore} or higher</li>
          <li>
            Debt-to-income ratio of {t.maxDtiPercent}% or lower (rate {t.qualifyingRatePercent}%,
            illustrative)
          </li>
          <li>Loan-to-value ratio of {t.maxLtvPercent}% or lower, against the appraised value</li>
          <li>Assets of at least {t.minReservesMonths} months of principal and interest</li>
        </ul>
        <p className="mt-2 text-sm text-muted-foreground">
          First, every credential must pass its checks. If one fails, the AUS reports “Unable to
          validate” and skips the risk rules.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          These are simplified calculations. Taxes, insurance, assessments and funds needed to close
          are not included. The thresholds are demo assumptions, not GSE rules.
        </p>
      </section>

      <section aria-labelledby="aus-honesty" className="mt-10">
        <h2 className="sr-only" id="aus-honesty">
          What is real and what is simulated
        </h2>
        <HonestyPanel
          real={
            <ul className="list-disc pl-5">
              <li>
                The pod&apos;s permission list controls what the AUS can read. Revoking access stops
                the run.
              </li>
              <li>The credential checks and the rule evaluation.</li>
              <li>The findings saved to the borrower&apos;s pod.</li>
            </ul>
          }
          simulated={
            <ul className="list-disc pl-5">
              <li>The thresholds and calculations. They are not a GSE model.</li>
              <li>The organisations, their branding, and every figure in the loan file.</li>
            </ul>
          }
        />
      </section>
    </main>
  );
}
