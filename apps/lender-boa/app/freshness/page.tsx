import { HonestyPanel } from "@mortgage/ui";
import { FreshnessPanel } from "../../components/freshness-panel";
import { VOE_RULE } from "../../lib/server/freshness";
import { site } from "../site";

export const metadata = {
  title: `Freshness re-check — Concept Demo (not ${site.organization})`,
};

/**
 * Scene 4: nothing goes stale. 30 days after application the employment VC's
 * window is about to lapse (the fixture is seeded backdated — no fake clock);
 * the lender re-checks validity + revocation status and, when stale, the
 * borrower re-issues in one click through the EXISTING grant.
 */
export default async function FreshnessPage({
  searchParams,
}: {
  searchParams: Promise<{ pod?: string }>;
}) {
  const { pod } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Scene 4 · nothing goes stale
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        Pre-close freshness re-check
      </h1>
      <p className="mt-4 text-muted-foreground">
        {VOE_RULE}. Instead of a phone call and a fax, the lender re-checks the employment
        credential's validity window and revocation status directly — and a lapsed credential is
        re-issued in one click through the grant you already gave.
      </p>

      <div className="mt-8">
        {pod !== undefined ? (
          <FreshnessPanel apiBase="/lender-boa/api" pod={pod} />
        ) : (
          <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
            Connect a granted pod (<code>?pod=</code>) to run the live re-check against the
            employment credential in the pod. The credential is seeded near-expiry (validFrom −30
            days, validUntil +14 days), so the beat is genuine — no fake clock.
          </p>
        )}
      </div>

      <section aria-labelledby="freshness-honesty" className="mt-10">
        <h2 id="freshness-honesty" className="sr-only">
          What is real and what is simulated
        </h2>
        <HonestyPanel
          real={
            <ul className="list-disc pl-5">
              <li>The validity-window check and the fail-closed Bitstring status resolution.</li>
              <li>The re-issue path: same claims, fresh window, old status index revoked.</li>
            </ul>
          }
          simulated={
            <ul className="list-disc pl-5">
              <li>The lender and verifier organisations and their branding.</li>
              <li>The employment relationship the credential attests.</li>
            </ul>
          }
        />
      </section>
    </main>
  );
}
