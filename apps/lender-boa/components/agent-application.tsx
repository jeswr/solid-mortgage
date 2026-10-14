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
import { formatPercent, formatUsd } from "../lib/format";
import type { UrlaPrefill } from "../lib/server/prefill";

/**
 * The agentic application (an assistant applies for the borrower): the
 * assistant asks for consent PER SOURCE, reads the borrower's pod through the
 * same authenticated prefill rail the form uses, finds rent receipts in a
 * SIMULATED inbox (or asks for the figure), shows what it will submit, and
 * submits through the same rail on the borrower's "yes".
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
      description: "Alex allows both sources: the Solid pod and the email inbox.",
    },
    {
      id: "allow_pod_only",
      description:
        "Alex allows the Solid pod but not the email inbox (the assistant will ask for the rent).",
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
  review: [
    { id: "submit", description: "Alex clearly confirms the application should be submitted now." },
    { id: "open_form", description: "Alex wants to review or edit the full form manually." },
    { id: "change_rent", description: "Alex corrects the monthly rent (set monthlyRentUsd)." },
  ],
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parseAmount = (text: string) => {
  const amount = Number.parseFloat(text.replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) && amount > 0 && amount < 100_000 ? Math.round(amount) : undefined;
};

/** The fallback when no language model is available: a few keyword rules. */
function scriptedAction(phase: Phase, text: string): { action: string; rent?: number } {
  const lower = text.toLowerCase();
  const no = /\b(no|nope|don't|do not|manual|myself|form)\b/.test(lower);
  if (phase === "consent") {
    if (
      /(no|not|without|skip|leave).{0,20}(email|inbox|mail)/.test(lower) ||
      /pod only/.test(lower)
    ) {
      return { action: "allow_pod_only" };
    }
    if (no) return { action: "decline_manual" };
    if (/\b(yes|yeah|sure|ok|okay|allow|go ahead|fine|please)\b/.test(lower))
      return { action: "allow_all" };
  }
  if (phase === "ask-rent") {
    const rent = parseAmount(text);
    if (rent !== undefined) return { action: "provide_rent", rent };
    if (no) return { action: "decline_manual" };
  }
  if (phase === "review") {
    const rent = /rent/.test(lower) ? parseAmount(text) : undefined;
    if (rent !== undefined) return { action: "change_rent", rent };
    if (/form|review|edit|myself|manual/.test(lower)) return { action: "open_form" };
    if (/\b(yes|yeah|submit|ok|okay|go|sure|looks good|send)\b/.test(lower))
      return { action: "submit" };
  }
  return { action: "answer_only" };
}

const SCRIPTED_HELP: Partial<Record<Phase, string>> = {
  consent: "You can allow your pod and inbox, your pod only, or fill in the form yourself.",
  "ask-rent": "I just need your monthly rent, like 2150.",
  review: "I can submit it now, change the rent, or you can review the full form yourself.",
};

export function AgentApplication({ apiBase, formHref }: { apiBase: string; formHref: string }) {
  const engine = useAssistantEngine();
  const [phase, setPhaseState] = useState<Phase>("consent");
  const phaseRef = useRef<Phase>("consent");
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const history = useRef<AssistantTurn[]>([
    {
      from: "agent",
      text: "Hi Alex. I can complete this mortgage application for you. May I read your Solid pod (profile and credentials) and your email inbox (rent receipts only)?",
    },
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
    if (data !== undefined) {
      lines.push(
        `Application draft: ${data.borrower.name}, ${data.borrower.address}; ${data.employment.jobTitle} at ${data.employment.employerName}, ${formatUsd(data.employment.monthlyGrossIncomeUsd)} a month (verified credential); ${data.assets.accounts.length} verified bank account(s); credit score from a verified credential.`,
      );
    }
    if (housing.current !== undefined) {
      lines.push(
        `Current housing: renting at ${formatUsd(housing.current.monthlyRentUsd)} a month (${housing.current.source === "email" ? "from rent receipts in the simulated inbox" : "stated by Alex"}).`,
      );
    }
    lines.push(`The full application form is also available at ${formHref}.`);
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
          Here is what I will submit to the lender. Every value came from your pod or your inbox:
        </p>
        <ul className="mt-2 list-disc pl-5">
          <li>
            {data.borrower.name}, {data.borrower.address}
          </li>
          <li>
            {data.employment.jobTitle} at {data.employment.employerName},{" "}
            <IllustrativeFigure>
              {formatUsd(data.employment.monthlyGrossIncomeUsd)}
            </IllustrativeFigure>{" "}
            a month (verified credential)
          </li>
          <li>
            {data.assets.accounts.length} bank account
            {data.assets.accounts.length === 1 ? "" : "s"} (verified credential), credit score from
            your credit credential
          </li>
          {housing.current !== undefined && (
            <li>
              Renting at{" "}
              <IllustrativeFigure>{formatUsd(housing.current.monthlyRentUsd)}</IllustrativeFigure> a
              month (
              {housing.current.source === "email" ? "from your rent receipts" : "you told me"})
            </li>
          )}
        </ul>
        <p className="mt-2">Shall I submit it?</p>
      </div>,
      `Here is the draft I will submit: ${facts().join(" ")} Shall I submit it?`,
    );
  }

  /** Hand over to the form; `quiet` when the language model already said why. */
  function manual(text: string, quiet = false) {
    say(
      "agent",
      quiet ? (
        <>{formLink("Open the application form")} (prefilled from your pod).</>
      ) : (
        <>
          {text} {formLink("Open the application form")}; it is prefilled from your pod too.
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
        label: "Read your profile and verified credentials from your pod",
        state: "running",
      },
      {
        id: "email",
        label: email ? "Search your inbox for rent receipts" : "Inbox: not allowed, I'll ask you",
        state: email ? "pending" : "skipped",
      },
      { id: "fill", label: "Fill in the loan application", state: "pending" },
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
            Your pod doesn't have all the verifications a lender needs yet (usually the assets
            credential). Get it from{" "}
            <a className="font-semibold underline" href="/verifications/assets">
              Verification Services
            </a>
            , then come back and allow me again, or {formLink("fill in the form")}.
          </>,
          "Alex's pod is missing a verification (usually the assets credential from Verification Services). Alex can get it and then allow the assistant again, or use the form.",
        );
        return;
      }
      if (!response.ok) throw new Error(`the lender refused the pod read (${response.status})`);
      const data = (await response.json()) as UrlaPrefill;
      if (data.source !== "pod") throw new Error("the lender could not reach your pod");
      prefill.current = data;
      setStep("pod", {
        state: "done",
        detail:
          "Profile, employment and income, assets, and credit score: read through the lender's prefill, with your sign-in.",
      });
    } catch (error) {
      setStep("pod", {
        state: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
      manual("I couldn't read your pod, so the form is the way to go this time.");
      return;
    }

    if (email) {
      setStep("email", { state: "running" });
      await sleep(900);
      const rent = DEMO_RENT_RECEIPTS[0].amountUsd;
      housing.current = { monthlyRentUsd: rent, source: "email" };
      setStep("email", {
        state: "done",
        detail: `Found ${DEMO_RENT_RECEIPTS.length} rent receipts from ${DEMO_RENT_RECEIPTS[0].from} (fictional) in your simulated inbox.`,
      });
    }
    setStep("fill", { state: "running" });
    await sleep(600);
    setStep("fill", {
      state: "done",
      detail: "Borrower, employment, assets and liabilities sections.",
    });
    history.current.push({ from: "agent", text: "I read the pod and filled in the application." });

    if (!email) {
      setPhase("ask-rent");
      say("agent", "What do you pay in rent each month? (Demo: any figure will do.)");
      return;
    }
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
          <p>
            Submitted. The lender wrote your application and its Loan Estimate into your pod, so you
            keep the copies:
          </p>
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
                {formatUsd(body.loanEstimate.monthlyPrincipalAndInterestUsd)}
              </IllustrativeFigure>
            </li>
          </ul>
          <p className="mt-2">A loan officer will review your file next.</p>
        </div>,
        `Submitted. The application and Loan Estimate (${formatUsd(body.loanEstimate.loanAmountUsd)} at ${formatPercent(body.loanEstimate.interestRatePercent)}, illustrative) are in Alex's pod. A loan officer reviews it next.`,
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
      act(decision.action, decision.monthlyRentUsd, decision.reply !== "");
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
          { label: "Yes, submit it", value: "submit" },
          { label: "I'll review the form myself", value: "form" },
        ]
      : phase === "ask-rent"
        ? [{ label: "$2,150", value: "2150" }]
        : [];

  function reply(value: string) {
    if (value === "submit") return choose("Yes, submit it.", "submit");
    if (value === "form") return choose("I'll review the full form myself.", "open_form");
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
              <p>On it. Here is what I'm doing:</p>
              <AgentSteps steps={steps} />
            </div>
          ),
        }
      : message,
  );

  return (
    <div className="flex flex-col gap-4">
      <AgentConversation
        agentName="Your home-buying assistant"
        busy={phase === "working" || phase === "submitting" || thinking}
        {...(engine !== undefined ? { engine } : {})}
        messages={[
          {
            id: "hello",
            from: "agent",
            content: (
              <div>
                <p>
                  Hi Alex. I can complete this mortgage application for you instead of you typing it
                  in. To do that I'd like to read:
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
                          ? "Allow my pod and my email."
                          : "Allow my pod only.",
                        allowed.includes("email") ? "allow_all" : "allow_pod_only",
                      );
                    }}
                    onManual={() => choose("No thanks, I'll fill it in myself.", "decline_manual")}
                    sources={[
                      {
                        id: "pod",
                        name: "Your Solid pod (Data Vault)",
                        reads:
                          "Your profile and your employment, assets and credit credentials. Read by the lender's prefill with your sign-in; nothing is copied anywhere else.",
                      },
                      {
                        id: "email",
                        name: "Your email inbox",
                        note: "simulated",
                        reads: "Only rent receipts, to fill in your current housing costs.",
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
