"use client";

import {
  AgentConversation,
  type AgentMessage,
  type AgentReply,
  type AgentStep,
  AgentSteps,
  type AssistantAction,
  type AssistantTurn,
  askAssistant,
  ConsentRequest,
  IllustrativeFigure,
  useAssistantEngine,
} from "@mortgage/ui";
import { type ReactNode, useRef, useState } from "react";
import { scriptedAction } from "../lib/assistant-intent";
import { formatPercent, formatUsd, QUOTE_CAUTION } from "../lib/format";
import type { DemoLoanSummary } from "../lib/server/loan";
import type { UrlaPrefill } from "../lib/server/prefill";

/**
 * The agentic application (an assistant applies for the borrower): the
 * assistant asks for consent PER SOURCE, reads the borrower's pod through the
 * same authenticated prefill rail the form uses, finds rent receipts in a
 * SIMULATED inbox (or asks for the figure), shows what it will submit, and
 * submits through the same rail only when the borrower presses the explicit
 * "Submit application" control (never from free text).
 *
 * Free text at every step: when the local demo server offers a language model
 * (`/__demo/assistant`, Claude through the operator's Claude Code), it picks one
 * of the actions allowed in the current phase and writes the reply; otherwise a
 * small scripted interpreter does. Either way the APP performs the action.
 */

/** The demo inbox the assistant may search (fictional sender, illustrative amounts). */
const DEMO_RENT_RECEIPTS = [
  { month: "October 2026", from: "Maple Court Apartments", amountUsd: 2150 },
  { month: "September 2026", from: "Maple Court Apartments", amountUsd: 2150 },
  { month: "August 2026", from: "Maple Court Apartments", amountUsd: 2150 },
] as const;

interface SubmitResponse {
  applicationIri: string;
  decisionIri: string;
  loanEstimate: {
    loanAmountUsd: number;
    interestRatePercent: number;
    monthlyPrincipalAndInterestUsd: number;
  };
}

type Phase = "consent" | "working" | "ask-rent" | "review" | "submitting" | "done" | "manual";

const STEPS_ID = "agent-steps";

const ACTIONS: Partial<Record<Phase, readonly AssistantAction[]>> = {
  consent: [
    {
      id: "allow_all",
      description: "Alex allows both sources: the pod and the simulated rent receipts.",
    },
    {
      id: "allow_pod_only",
      description:
        "Alex allows the pod but not the rent receipts (the current rent is left blank).",
    },
    {
      id: "decline_manual",
      description:
        "Alex does not want the assistant to read the pod, or wants to fill in the form manually.",
    },
  ],
  "ask-rent": [
    { id: "provide_rent", description: "Alex states the monthly rent (set monthlyRentUsd)." },
    { id: "decline_manual", description: "Alex would rather fill in the form manually." },
  ],
  // No "submit" action: submission needs the explicit "Submit application" button.
  review: [
    { id: "open_form", description: "Alex wants to review or edit the application form manually." },
    { id: "change_rent", description: "Alex corrects the monthly rent (set monthlyRentUsd)." },
  ],
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const SCRIPTED_HELP: Partial<Record<Phase, string>> = {
  consent: "Allow your pod, optionally with the demo rent receipts, or use the form.",
  "ask-rent": "What is your monthly rent? For example, 2150.",
  review:
    "To submit, use the Submit application button. I can also change the rent, or you can open the form.",
};

const totalAssets = (data: UrlaPrefill) =>
  data.assets.accounts.reduce((sum, account) => sum + account.amountUsd, 0);

const GREETING = "Prepare Alex's application from the pod. Review it before submitting.";

export function AgentApplication({
  apiBase,
  formHref,
  loan,
}: {
  apiBase: string;
  formHref: string;
  loan: DemoLoanSummary;
}) {
  const engine = useAssistantEngine();
  const [phase, setPhaseState] = useState<Phase>("consent");
  const phaseRef = useRef<Phase>("consent");
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const history = useRef<AssistantTurn[]>([
    { from: "agent", text: `${GREETING} Choose the data sources I may read.` },
  ]);
  const prefill = useRef<UrlaPrefill | undefined>(undefined);
  const housing = useRef<{ monthlyRentUsd: number; source: "email" | "manual" } | undefined>(
    undefined,
  );
  const nextId = useRef(0);

  const setPhase = (next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  };

  /** Add a message; `text` is what the language model sees of it. */
  const say = (from: AgentMessage["from"], content: ReactNode, text?: string) => {
    nextId.current += 1;
    const id = `m${nextId.current}`;
    setMessages((current) => [...current, { id, from, content }]);
    const plain = text ?? (typeof content === "string" ? content : undefined);
    if (plain !== undefined) history.current.push({ from, text: plain });
  };

  const setStep = (id: string, patch: Partial<AgentStep>) =>
    setSteps((current) => current.map((step) => (step.id === id ? { ...step, ...patch } : step)));

  const formLink = (text: string) => (
    <a className="font-semibold underline" href={formHref}>
      {text}
    </a>
  );

  function facts(): string[] {
    const data = prefill.current;
    const lines: string[] = [];
    lines.push(
      `Loan request: ${formatUsd(loan.requestedLoanUsd)} for ${loan.subjectProperty}, estimated value ${formatUsd(loan.estimatedValueUsd)} (illustrative).`,
    );
    if (data !== undefined) {
      lines.push(
        `Application draft: ${data.borrower.name}, ${data.borrower.address}; ${data.employment.jobTitle} at ${data.employment.employerName}, ${formatUsd(data.employment.monthlyGrossIncomeUsd)} a month; monthly debts ${formatUsd(data.credit.totalMonthlyDebtUsd)}; assets ${formatUsd(totalAssets(data))}; credit score ${data.credit.creditScoreValue}. All from Alex's pod; credential signatures are not checked in this step.`,
      );
    }
    if (housing.current !== undefined) {
      lines.push(
        `Current housing: renting at ${formatUsd(housing.current.monthlyRentUsd)} a month (${housing.current.source === "email" ? "from rent receipts in the simulated inbox" : "stated by Alex"}).`,
      );
    }
    lines.push(
      `Submitting needs the Submit application button; the assistant cannot submit. The application form is at ${formHref}.`,
    );
    return lines;
  }

  function review() {
    const data = prefill.current;
    if (data === undefined) return;
    setPhase("review");
    say(
      "agent",
      <div data-agent-review="">
        <p>
          Review the demo application fields. {formLink("Open the application form")} to check every
          field.
        </p>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="text-muted-foreground">Borrower</dt>
          <dd className="m-0">
            {data.borrower.name}, {data.borrower.address}
          </dd>
          <dt className="text-muted-foreground">Subject property</dt>
          <dd className="m-0">{loan.subjectProperty}</dd>
          <dt className="text-muted-foreground">Requested loan</dt>
          <dd className="m-0">
            <IllustrativeFigure>{formatUsd(loan.requestedLoanUsd)}</IllustrativeFigure>
          </dd>
          <dt className="text-muted-foreground">Estimated value</dt>
          <dd className="m-0">
            <IllustrativeFigure>{formatUsd(loan.estimatedValueUsd)}</IllustrativeFigure>
          </dd>
          <dt className="text-muted-foreground">Employment</dt>
          <dd className="m-0">
            {data.employment.jobTitle} at {data.employment.employerName}
          </dd>
          <dt className="text-muted-foreground">Gross income</dt>
          <dd className="m-0">
            <IllustrativeFigure>
              {`${formatUsd(data.employment.monthlyGrossIncomeUsd)} a month`}
            </IllustrativeFigure>
          </dd>
          <dt className="text-muted-foreground">Monthly debts</dt>
          <dd className="m-0">
            <IllustrativeFigure>
              {`${formatUsd(data.credit.totalMonthlyDebtUsd)} a month`}
            </IllustrativeFigure>
          </dd>
          <dt className="text-muted-foreground">Assets</dt>
          <dd className="m-0">
            <IllustrativeFigure>{formatUsd(totalAssets(data))}</IllustrativeFigure> in{" "}
            {data.assets.accounts.length} bank account
            {data.assets.accounts.length === 1 ? "" : "s"}
          </dd>
          <dt className="text-muted-foreground">Credit score</dt>
          <dd className="m-0">{data.credit.creditScoreValue}</dd>
          <dt className="text-muted-foreground">Current housing</dt>
          <dd className="m-0">
            {housing.current === undefined ? (
              "Not provided"
            ) : (
              <>
                Renting,{" "}
                <IllustrativeFigure>
                  {`${formatUsd(housing.current.monthlyRentUsd)} a month`}
                </IllustrativeFigure>{" "}
                ({housing.current.source === "email" ? "from demo rent receipts" : "you told me"})
              </>
            )}
          </dd>
          <dt className="text-muted-foreground">Not included</dt>
          <dd className="m-0">
            Declarations, demographic information and real identifiers. Never enter a real Social
            Security number.
          </dd>
        </dl>
        <p className="mt-2">
          From the pod; credential signatures are not checked in this step. Use Submit application
          when you are ready.
        </p>
      </div>,
      `Application summary: ${facts().join(" ")} Alex submits with the Submit application button.`,
    );
  }

  /** Hand over to the form; `quiet` when the language model already said why. */
  function manual(text: string, quiet = false) {
    say(
      "agent",
      quiet ? (
        <>{formLink("Open the application form")}.</>
      ) : (
        <>
          {text} {formLink("Open the application form")}.
        </>
      ),
      text,
    );
    setPhase("manual");
  }

  async function run(allowed: readonly string[]) {
    const email = allowed.includes("email");
    setPhase("working");
    setSteps([
      {
        id: "pod",
        label: "Read your profile and verification records from your pod",
        state: "running",
      },
      {
        id: "email",
        label: email
          ? "Find rent receipts in the simulated inbox"
          : "Demo rent receipts: not selected. Current rent left blank.",
        state: email ? "pending" : "skipped",
      },
      { id: "fill", label: "Fill in the application", state: "pending" },
    ]);
    // One live action log, moved to the end on a retry.
    setMessages((current) => [
      ...current.filter((message) => message.id !== STEPS_ID),
      { id: STEPS_ID, from: "agent", content: null },
    ]);

    try {
      const response = await fetch(`${apiBase}/application/prefill`, { cache: "no-store" });
      if (response.status === 404) {
        // A document the application needs is not in the pod yet (e.g. scene 1 skipped).
        setStep("pod", {
          state: "failed",
          detail: "A verification the lender needs is not in your pod yet.",
        });
        setPhase("consent");
        say(
          "agent",
          <>
            Your pod is missing a verification the lender needs, usually the asset credential. Get
            it from{" "}
            <a className="font-semibold underline" href="/verifications/assets">
              Verification Services
            </a>
            , then come back and allow me again, or {formLink("fill in the form")}.
          </>,
          "Alex's pod is missing a verification (usually the asset credential from Verification Services). Alex can get it and allow the assistant again, or use the form.",
        );
        return;
      }
      if (!response.ok) throw new Error(`The lender could not read your pod (${response.status})`);
      const data = (await response.json()) as UrlaPrefill;
      if (data.source !== "pod") throw new Error("The lender could not reach your pod");
      prefill.current = data;
      setStep("pod", {
        state: "done",
        detail:
          "Profile, employment and income, assets and credit score, read by the lender's prefill with your sign-in.",
      });
    } catch (error) {
      setStep("pod", {
        state: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
      manual("I couldn't read your pod. Please use the form.");
      return;
    }

    if (email) {
      setStep("email", { state: "running" });
      await sleep(900);
      const rent = DEMO_RENT_RECEIPTS[0].amountUsd;
      housing.current = { monthlyRentUsd: rent, source: "email" };
      setStep("email", {
        state: "done",
        detail: `Found ${DEMO_RENT_RECEIPTS.length} rent receipts from ${DEMO_RENT_RECEIPTS[0].from} (fictional).`,
      });
    }
    setStep("fill", { state: "running" });
    await sleep(600);
    setStep("fill", {
      state: "done",
      detail: "Borrower, employment, assets and liabilities sections.",
    });
    history.current.push({ from: "agent", text: "I read the pod and filled in the application." });

    // Without the optional receipts the current rent stays "Not provided";
    // Alex can add it from the review.
    review();
  }

  async function submit() {
    setPhase("submitting");
    try {
      const response = await fetch(`${apiBase}/application/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel: "assistant", housing: housing.current }),
      });
      const body = (await response.json()) as SubmitResponse & { detail?: string };
      if (!response.ok) throw new Error(body.detail ?? `submission failed (${response.status})`);
      setPhase("done");
      say(
        "agent",
        <div data-agent-done="">
          <p>Application saved. Review the illustrative loan terms below.</p>
          <ul className="mt-2 list-disc pl-5">
            <li>
              Loan amount{" "}
              <IllustrativeFigure>{formatUsd(body.loanEstimate.loanAmountUsd)}</IllustrativeFigure>
            </li>
            <li>
              Rate{" "}
              <IllustrativeFigure>
                {formatPercent(body.loanEstimate.interestRatePercent)}
              </IllustrativeFigure>
            </li>
            <li>
              Monthly principal and interest{" "}
              <IllustrativeFigure>
                {`${formatUsd(body.loanEstimate.monthlyPrincipalAndInterestUsd)} a month`}
              </IllustrativeFigure>
            </li>
          </ul>
          <p className="mt-2">
            This summary is not a Loan Estimate or credit approval. The lender reviews your file
            next.
          </p>
          <p className="mt-2 text-xs" data-quote-caution="">
            {QUOTE_CAUTION}
          </p>
        </div>,
        `Application saved in Alex's pod. Illustrative loan terms: ${formatUsd(body.loanEstimate.loanAmountUsd)} at ${formatPercent(body.loanEstimate.interestRatePercent)}. This is not a Loan Estimate or credit approval. The lender reviews the file next.`,
      );
    } catch (error) {
      setPhase("review");
      say("agent", `That didn't work: ${error instanceof Error ? error.message : String(error)}.`);
    }
  }

  /** Perform an action the visitor chose (by button, or as interpreted from their text). */
  function act(action: string, rent?: number, quiet = false) {
    const current = phaseRef.current;
    if (current === "consent") {
      if (action === "allow_all") return void run(["pod", "email"]);
      if (action === "allow_pod_only") return void run(["pod"]);
      if (action === "decline_manual")
        return manual("No problem, you can fill it in yourself.", quiet);
    }
    if (current === "ask-rent") {
      if (action === "provide_rent" && rent !== undefined) {
        housing.current = { monthlyRentUsd: rent, source: "manual" };
        return review();
      }
      if (action === "decline_manual") return manual("Sure, you can finish it in the form.", quiet);
    }
    if (current === "review") {
      if (action === "submit") return void submit();
      if (action === "open_form") return manual("Sure, review everything in the form.", quiet);
      if (action === "change_rent" && rent !== undefined) {
        housing.current = { monthlyRentUsd: rent, source: "manual" };
        return review();
      }
    }
  }

  /** A button press: echo the visitor's choice, then act. */
  function choose(label: string, action: string, rent?: number) {
    say("you", label);
    act(action, rent);
  }

  /** Free text: the language model (or the scripted fallback) picks the action. */
  async function converse(text: string) {
    const current = phaseRef.current;
    say("you", text);
    setThinking(true);
    const decision = engine
      ? await askAssistant({
          assistant: "lender-application",
          phase: current,
          actions: ACTIONS[current] ?? [],
          context: facts(),
          history: history.current.slice(0, -1),
          message: text,
        })
      : undefined;
    setThinking(false);
    if (decision !== undefined) {
      if (decision.reply !== "") say("agent", decision.reply);
      // Free text never submits: only the "Submit application" control does.
      if (decision.action !== "submit") {
        act(decision.action, decision.monthlyRentUsd, decision.reply !== "");
      }
      return;
    }
    const scripted = scriptedAction(current, text);
    if (scripted.action === "answer_only") {
      say("agent", SCRIPTED_HELP[current] ?? "I'm here if you need anything else.");
      return;
    }
    act(scripted.action, scripted.rent);
  }

  const replies: AgentReply[] =
    phase === "review"
      ? [
          { label: "Submit application", value: "submit" },
          ...(housing.current === undefined
            ? [{ label: "Add current rent", value: "add-rent" }]
            : []),
          { label: "Open the application form", value: "form" },
        ]
      : phase === "ask-rent"
        ? [{ label: "$2,150", value: "2150" }]
        : [];

  function reply(value: string) {
    if (value === "submit") return choose("Submit the application.", "submit");
    if (value === "form") return choose("I'll check the application form myself.", "open_form");
    if (value === "add-rent" && phaseRef.current === "review") {
      say("you", "Add my current rent.");
      setPhase("ask-rent");
      say("agent", "What is your monthly rent? Any demo figure will do.");
      return;
    }
    if (value === "2150" && phaseRef.current === "ask-rent") {
      return choose("$2,150 a month.", "provide_rent", 2150);
    }
    void converse(value);
  }

  // The action log renders inside the conversation and updates in place.
  const rendered = messages.map((message) =>
    message.id === STEPS_ID
      ? {
          ...message,
          content: (
            <div>
              <AgentSteps heading={phase === "done" ? "Application saved" : "auto"} steps={steps} />
            </div>
          ),
        }
      : message,
  );

  return (
    <div className="flex flex-col gap-4">
      <AgentConversation
        agentName="Your assistant"
        busy={phase === "working" || phase === "submitting" || thinking}
        {...(engine !== undefined ? { engine } : {})}
        messages={[
          {
            id: "hello",
            from: "agent",
            content: (
              <div>
                <p>{GREETING}</p>
                <p className="mt-2 text-xs" data-agent-disclosure="">
                  When AI replies are enabled, application details are sent to the assistant
                  service.
                </p>
                {phase === "consent" && (
                  <ConsentRequest
                    onAllow={(allowed) => {
                      if (!allowed.includes("pod")) {
                        choose("Don't read my pod.", "decline_manual");
                        return;
                      }
                      choose(
                        allowed.includes("email")
                          ? "Allow my pod and rent receipts."
                          : "Allow my pod only.",
                        allowed.includes("email") ? "allow_all" : "allow_pod_only",
                      );
                    }}
                    onManual={() => choose("No thanks, I'll fill it in myself.", "decline_manual")}
                    sources={[
                      {
                        id: "pod",
                        name: "Alex's pod (Data Vault)",
                        reads: "Use Alex's pod to prepare the application.",
                      },
                      {
                        id: "email",
                        name: "Demo rent receipts",
                        note: "simulated",
                        optional: true,
                        reads: "Optional: read simulated rent receipts to fill the current rent.",
                      },
                    ]}
                  />
                )}
              </div>
            ),
          },
          ...rendered,
        ]}
        onReply={phase === "working" || phase === "submitting" ? undefined : reply}
        replies={replies}
      />
    </div>
  );
}
