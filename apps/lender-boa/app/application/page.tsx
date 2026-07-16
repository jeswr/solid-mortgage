import { ApplicationForm } from "../../components/application-form";
import { demoPrefill } from "../../lib/server/prefill";
import { site } from "../site";

export const metadata = {
  title: `Application — Concept Demo (not ${site.organization})`,
};

/**
 * Scene 3: the one-click application. The demo persona backs the form
 * immediately; the client then attempts the AUTHENTICATED pod prefill —
 * decision 0015: the API derives both borrower and pod from the caller's
 * DPoP-bound session, so this page takes NO pod/webid parameters. Every field
 * is demo-locked (R7).
 */
export default function ApplicationPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Scene 3 · one-click application
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        Your application, prefilled from your pod
      </h1>
      <div className="mt-4">
        <ApplicationForm apiBase="/lender-boa/api" demoPrefill={demoPrefill()} />
      </div>
    </main>
  );
}
