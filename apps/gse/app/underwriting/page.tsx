import { HonestyPanel } from "@mortgage/ui";
import { AusConsole } from "../../components/aus-console";
import { AUS_THRESHOLDS } from "../../lib/aus/rules";
import { site } from "../site";

export const metadata = {
  title: `Underwriting console — Concept Demo (not ${site.organization})`,
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
        Scenes 3 + 4 · underwrite from granted data
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        Underwriting console
      </h1>
      <p className="mt-4 text-muted-foreground">
        The {site.role} role in the GSE model: read the loan file the borrower granted, verify every
        credential (signature, trusted issuer, validity window, revocation status, shape), run the
        deterministic rules, return the full findings report to the requesting party, and write the
        decision document — status, recommendation, and conditions quoting every failed finding —
        back into the borrower's pod for the lender to pick up. Unverifiable or stale evidence
        refers the file: the risk rules are not even evaluated on numbers the verifier could not
        trust.
      </p>

      <div className="mt-8">
        <AusConsole apiBase="/gse/api" />
        <p className="mt-3 text-xs text-muted-foreground">
          The run reads YOUR granted pod — the AUS derives your identity and pod from your
          authenticated session (never from a page parameter), and its own service identity must
          appear in your grant before the pod lets a single byte out.
        </p>
      </div>

      <section aria-labelledby="aus-model" className="mt-10">
        <h2
          className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          id="aus-model"
        >
          The whole model, in four rules
        </h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
          <li>Representative credit score ≥ {t.minCreditScore}</li>
          <li>
            Back-end debt-to-income ≤ {t.maxDtiPercent}% (qualifying rate {t.qualifyingRatePercent}
            %, illustrative)
          </li>
          <li>Loan-to-value ≤ {t.maxLtvPercent}% of the appraised value</li>
          <li>Liquid reserves ≥ {t.minReservesMonths} months of the proposed payment</li>
        </ul>
        <p className="mt-2 text-sm text-muted-foreground">
          Plus the evidence gate ahead of them: every credential must verify, attest the applicant,
          and be within its validity window — otherwise the run refers instead of scoring numbers it
          cannot trust.
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
                The grant boundary: the pod's access control decides what this service can read, and
                a revoked grant genuinely shuts the run off.
              </li>
              <li>
                The fail-closed credential verification (signature, trusted issuer, validity window,
                revocation status, shape) and the deterministic rule evaluation.
              </li>
              <li>The decision document written back into the pod, shape-validated.</li>
            </ul>
          }
          simulated={
            <ul className="list-disc pl-5">
              <li>The underwriting thresholds — published stand-ins, not any GSE's real model.</li>
              <li>The organisations, their branding, and every figure in the loan file.</li>
            </ul>
          }
        />
      </section>
    </main>
  );
}
