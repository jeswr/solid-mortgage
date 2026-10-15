import { LedgerView } from "@/components/ledger-view";
import { site } from "../site";

export const metadata = {
  title: `Consent receipts — Concept Demo (not ${site.organization})`,
};

/**
 * Scene 5: every access grant and revocation, recorded as a DPV consent
 * record in Alex's pod — including records written by other apps (decision 0006).
 */
export default function LedgerPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Scene 5 · Close the loan and transfer servicing
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        Consent receipts
      </h1>
      <p className="mt-4 text-muted-foreground">
        Records of permission changes, not a log of every data read. The app that made each change
        wrote its receipt into Alex&apos;s pod.
      </p>
      <LedgerView />
    </main>
  );
}
