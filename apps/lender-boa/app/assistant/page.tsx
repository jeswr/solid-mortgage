import { AgentApplication } from "../../components/agent-application";
import { site } from "../site";

export const metadata = {
  title: `Apply with your assistant — Concept Demo (not ${site.organization})`,
};

/**
 * Scene 3, agentic variant: the borrower's own assistant fills in and submits the
 * application through the same authenticated rail as the form, after per-source consent.
 */
export default function AssistantPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
        Scene 3 · one-click application, with an assistant
      </p>
      <h1 className="mt-1 font-semibold text-3xl text-foreground tracking-tight">
        Let your assistant apply for you
      </h1>
      <p className="mt-3 text-muted-foreground">
        Instead of filling in a form, ask your assistant. It asks before it reads anything, shows
        you exactly what it will send, and only submits when you say yes.
      </p>
      <div className="mt-6">
        <AgentApplication apiBase="/lender-boa/api" formHref="/lender-boa/application" />
      </div>
    </main>
  );
}
