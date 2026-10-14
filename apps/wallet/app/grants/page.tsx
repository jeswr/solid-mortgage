import { HonestyPanel } from "@mortgage/ui";
import { GrantsDashboard } from "@/components/grants-dashboard";
import { site } from "../site";

export const metadata = {
  title: `Access permissions — Concept Demo (not ${site.organization})`,
};

/**
 * Scenes 3 and 5: access permissions. Each change writes a real WAC access
 * control document on the pod's /mortgage/ container (decision 0015 L4) and
 * a DPV consent receipt (decision 0006).
 */
export default function GrantsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Scenes 3 and 5 · Apply, close and transfer servicing
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        Access permissions
      </h1>
      <p className="mt-4 text-muted-foreground">
        Choose which organisations can read Alex&apos;s loan file. Each change updates the
        pod&apos;s permission list and writes a consent receipt.
      </p>
      <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-950 text-sm">
        Local demo: permission changes are saved, but requests run as Alex. This mode does not
        demonstrate organisation-level access enforcement.
      </p>

      <GrantsDashboard />

      <section aria-labelledby="honesty-heading" className="mt-10">
        <h2 className="sr-only" id="honesty-heading">
          What is real and what is simulated
        </h2>
        <HonestyPanel
          real={
            <ul className="list-disc pl-5">
              <li>The access control lists these buttons write.</li>
              <li>A consent receipt for each change.</li>
              <li>Revoked access stays revoked.</li>
            </ul>
          }
          simulated={
            <ul className="list-disc pl-5">
              <li>The organisations. No outside party reads the pod.</li>
              <li>Sign-in: you browse as Alex.</li>
            </ul>
          }
        />
      </section>
    </main>
  );
}
