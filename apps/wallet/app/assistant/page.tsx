import { ShoppingAssistant } from "@/components/shopping-assistant";
import { site } from "../site";

export const metadata = {
  title: `Your assistant — Concept Demo (not ${site.organization})`,
};

/**
 * Scene 2, agentic variant: the borrower's assistant shops for a pre-qualification
 * with the same in-browser zero-knowledge proofs as the manual page, after consent.
 */
export default function AssistantPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
        Scene 2 · shop without undressing, with an assistant
      </p>
      <h1 className="mt-1 font-semibold text-3xl text-foreground tracking-tight">
        Ask your assistant to find you a rate
      </h1>
      <p className="mt-3 text-muted-foreground">
        Your assistant works from your vault. It asks before it reads anything, proves what lenders
        need to know without revealing your numbers, and brings the quotes back to you. The{" "}
        <a className="underline" href="/wallet/prequal">
          pre-qualification page
        </a>{" "}
        explains the cryptography and its honest limits.
      </p>
      <div className="mt-6">
        <ShoppingAssistant applyHref="/lender-boa/assistant" manualHref="/wallet/prequal" />
      </div>
    </main>
  );
}
