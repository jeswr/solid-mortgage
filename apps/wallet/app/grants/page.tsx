import { HonestyPanel } from "@mortgage/ui";
import { GrantsDashboard } from "@/components/grants-dashboard";
import { site } from "../site";

export const metadata = {
  title: `Access grants — Concept Demo (not ${site.organization})`,
};

/**
 * Scenes 3 + 5: the access-grant dashboard. Grants are REAL WAC access-control
 * documents on the pod's /mortgage/ container (decision 0015 L4 — enforcement
 * lives at the pod, not in any app), and every change writes a DPV consent
 * receipt (decision 0006).
 */
export default function GrantsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Scenes 3 &amp; 5 · consented, receipted access
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Access grants</h1>
      <p className="mt-4 text-muted-foreground">
        You decide who reads your mortgage file. A grant writes a Web Access Control rule into your
        pod naming that organisation&apos;s service identity — the pod enforces it, not the
        organisation. Revoking removes the rule. Both write a consent receipt to the ledger, and a
        revoked organisation is <strong>never silently re-granted</strong>.
      </p>

      <GrantsDashboard />

      <section aria-labelledby="honesty-heading" className="mt-10">
        <h2 className="sr-only" id="honesty-heading">
          What is real and what is simulated
        </h2>
        <HonestyPanel
          real={
            <ul className="list-disc pl-5">
              <li>The WAC access-control documents these buttons write into the pod.</li>
              <li>The DPV consent receipts, one per grant or revocation.</li>
              <li>
                The revocation policy: a withdrawn organisation cannot be re-granted, and repeat
                actions change nothing.
              </li>
            </ul>
          }
          simulated={
            <ul className="list-disc pl-5">
              <li>
                The organisations and their service identities — in this in-browser demo the pod is
                yours alone, so no external party actually reads it. On the hosted rail the SAME
                engine materialises grants that real lender services consume, enforced by a WAC pod
                (that path is what the test suite drives with real authenticated reads).
              </li>
              <li>The login and persona.</li>
            </ul>
          }
        />
      </section>
    </main>
  );
}
