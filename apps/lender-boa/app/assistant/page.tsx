import { AgentApplication } from "../../components/agent-application";
import { site } from "../site";

export const metadata = {
  title: `Apply with an assistant — Concept Demo (not ${site.organization})`,
};

/**
 * Scene 3, agentic variant: the borrower's own assistant fills in and submits the
 * application through the same authenticated path as the form, after per-source consent.
 */
export default function AssistantPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
        Scene 3 · Apply with data from the pod
      </p>
      <h1 className="mt-1 font-semibold text-3xl text-foreground tracking-tight">
        Apply with an assistant
      </h1>
      <p className="mt-3 text-muted-foreground">
        The assistant prepares Alex's application from the sources Alex selects. It submits only
        when Alex confirms.
      </p>
      <div className="mt-6">
        <AgentApplication apiBase="/lender-boa/api" formHref="/lender-boa/application" />
      </div>
    </main>
  );
}
