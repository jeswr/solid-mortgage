import { HonestyPanel } from "@mortgage/ui";
import { FreshnessPanel } from "../../components/freshness-panel";
import { VOE_RULE } from "../../lib/server/freshness";
import { site } from "../site";

export const metadata = {
  title: `Employment re-verification — Concept Demo (not ${site.organization})`,
};

/**
 * Scene 4: pre-closing re-verification. 30 days after application the
 * employment VC's validity period is near its end (the fixture is seeded
 * backdated — no fake clock); the lender re-checks validity + revocation
 * status and, when expired, the borrower re-issues through the EXISTING access.
 */
export default function FreshnessPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Scene 4 · Re-verify employment before closing
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        Employment re-verification
      </h1>
      <p className="mt-4 text-muted-foreground">
        Before closing, the lender checks that Alex's employment credential is still valid.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Rule: {VOE_RULE}. This check covers the credential's validity period and status. It does not
        contact the employer.
      </p>

      <div className="mt-8">
        <FreshnessPanel apiBase="/lender-boa/api" />
        <p className="mt-3 text-xs text-muted-foreground">
          The demo credential was issued 30 days ago and expires in 14 days.
        </p>
      </div>

      <section aria-labelledby="freshness-honesty" className="mt-10">
        <h2 id="freshness-honesty" className="sr-only">
          What is real and what is simulated
        </h2>
        <HonestyPanel
          real={
            <ul className="list-disc pl-5">
              <li>The validity-period check and the credential status check.</li>
              <li>Re-issue: same claims, new validity period, old credential revoked.</li>
            </ul>
          }
          simulated={
            <ul className="list-disc pl-5">
              <li>The lender, the verification provider and their branding.</li>
              <li>Alex's employment. No employer is contacted.</li>
            </ul>
          }
        />
      </section>
    </main>
  );
}
