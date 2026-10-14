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
        Scene 2 · Prequalify without disclosing income or credit score
      </p>
      <h1 className="mt-1 font-semibold text-3xl text-foreground tracking-tight">
        Compare illustrative rate quotes
      </h1>
      <p className="mt-3 text-muted-foreground">
        Compare two illustrative rate quotes using Alex&apos;s income and credit-score credentials.
        To do it step by step, use the{" "}
        <a className="underline" href="/wallet/prequal">
          prequalification page
        </a>
        .
      </p>
      <div className="mt-6">
        <ShoppingAssistant applyHref="/lender-boa/assistant" manualHref="/wallet/prequal" />
      </div>
    </main>
  );
}
