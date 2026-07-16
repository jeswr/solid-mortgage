import { LedgerView } from "@/components/ledger-view";
import { site } from "../site";

export const metadata = {
  title: `Consent-receipt ledger — Concept Demo (not ${site.organization})`,
};

/**
 * The scene-5 payoff (decision 0006): every access grant and revocation,
 * receipted as DPV consent records in the borrower's own pod — including
 * records written by other apps in the journey (the closing ceremony).
 */
export default function LedgerPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Scene 5 · close and stay in control
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        Consent-receipt ledger
      </h1>
      <p className="mt-4 text-muted-foreground">
        Every grant and every revocation across the journey, written into your pod as a DPV consent
        record by the application that made the change. WAC and the Solid protocol do not provide
        this audit ledger — it is an application-level record kept where you can always read it
        (decision 0006).
      </p>
      <LedgerView />
    </main>
  );
}
