import { HonestyPanel } from "@mortgage/ui";
import { FreshnessPanel } from "../../components/freshness-panel";
import { VOE_RULE } from "../../lib/server/freshness";
import { site } from "../site";

export const metadata = {
  title: `Check the employment credential — Concept Demo (not ${site.organization})`,
};

/**
 * Scene 4: before closing, the lender checks the employment credential's
 * signature, status and validity period (the fixture is seeded backdated — no
 * fake clock). This is a credential check, not employment re-verification:
 * no employer is contacted.
 */
export default function FreshnessPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Scene 4 · Before closing
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        Check the employment credential
      </h1>
      <p className="mt-4 text-muted-foreground">
        Check its signature, status and validity period. This demo does not reconfirm employment
        with an employer.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{VOE_RULE}.</p>

      <div className="mt-8">
        <FreshnessPanel apiBase="/lender-boa/api" />
      </div>

      <section aria-labelledby="freshness-honesty" className="mt-10">
        <h2 id="freshness-honesty" className="sr-only">
          What is real and what is simulated
        </h2>
        <HonestyPanel
          real={
            <ul className="list-disc pl-5">
              <li>The validity-period check and the credential status check.</li>
              <li>Replacement: same claims, new validity period, previous credential revoked.</li>
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
