import { ShoppingAssistant } from "@/components/shopping-assistant";
import { site } from "../site";

export const metadata = {
  title: `Rate quote assistant — Concept Demo (not ${site.organization})`,
};

/**
 * Scene 2, assistant variant: the same in-browser proofs as the manual page,
 * run by an assistant after Alex allows each data source.
 */
export default function AssistantPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
        Scene 2 · Prequalification
      </p>
      <h1 className="mt-1 font-semibold text-3xl text-foreground tracking-tight">
        Compare illustrative rate quotes
      </h1>
      <p className="mt-3 text-muted-foreground">
        Check two lenders&apos; prequalification criteria using proofs derived from Alex&apos;s
        credentials. To do it step by step, use the{" "}
        <a className="underline" href="/wallet/prequal">
          prequalification page
        </a>
        .
      </p>
      <p className="mt-4 rounded-lg border border-border bg-card p-4 text-sm" data-zk-limitation="">
        <strong>Prototype limitation:</strong> encoded values may reveal the underlying figures
        through guessing. The cryptography has not been independently audited.
      </p>
      <div className="mt-6">
        <ShoppingAssistant applyHref="/lender-boa/assistant" manualHref="/wallet/prequal" />
      </div>
    </main>
  );
}
