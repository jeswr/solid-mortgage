"use client";

import {
  AgentConversation,
  type AgentMessage,
  type AgentReply,
  type AgentStep,
  AgentSteps,
  ConsentRequest,
  IllustrativeFigure,
} from "@mortgage/ui";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { formatPercent, formatUsd } from "../lib/format";
import type { UrlaPrefill } from "../lib/server/prefill";

/**
 * The agentic application (an assistant applies for the borrower): the
 * assistant asks for consent PER SOURCE, reads the borrower's pod through the
 * same authenticated prefill rail the form uses, finds rent receipts in a
 * SIMULATED inbox (or asks for the figure), shows what it will submit, and
 * submits through the same rail on the borrower's "yes". Scripted, not a
 * language model — and it says so.
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function AgentApplication({ apiBase, formHref }: { apiBase: string; formHref: string }) {
  const [phase, setPhase] = useState<Phase>("consent");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const prefill = useRef<UrlaPrefill | undefined>(undefined);
  const housing = useRef<{ monthlyRentUsd: number; source: "email" | "manual" } | undefined>(
    undefined,
  );
  const nextId = useRef(0);

  const say = useCallback((from: AgentMessage["from"], content: ReactNode) => {
    nextId.current += 1;
    const id = `m${nextId.current}`;
    setMessages((current) => [...current, { id, from, content }]);
  }, []);

  const setStep = (id: string, patch: Partial<AgentStep>) =>
    setSteps((current) => current.map((step) => (step.id === id ? { ...step, ...patch } : step)));

  const review = useCallback(() => {
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
    );
  }, [say]);

  async function run(allowed: readonly string[]) {
    const pod = allowed.includes("pod");
    const email = allowed.includes("email");
    say(
      "you",
      pod ? `Allow ${email ? "my pod and my email" : "my pod only"}.` : "Don't read my pod.",
    );
    if (!pod) {
      say(
        "agent",
        <>
          No problem. I need your pod to fill in the application, so you can{" "}
          <a className="font-semibold underline" href={formHref}>
            fill in the form yourself
          </a>{" "}
          instead.
        </>,
      );
      setPhase("manual");
      return;
    }
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
    setMessages((current) => [...current, { id: STEPS_ID, from: "agent", content: null }]);

    try {
      const response = await fetch(`${apiBase}/application/prefill`, { cache: "no-store" });
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
      say(
        "agent",
        <>
          I couldn't read your pod. You can{" "}
          <a className="font-semibold underline" href={formHref}>
            use the form
          </a>{" "}
          instead.
        </>,
      );
      setPhase("manual");
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

    if (!email) {
      setPhase("ask-rent");
      say("agent", "What do you pay in rent each month? (Demo: any figure will do.)");
      return;
    }
    review();
  }

  async function submit() {
    setPhase("submitting");
    say("you", "Yes, submit it.");
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
      );
    } catch (error) {
      setPhase("review");
      say("agent", `That didn't work: ${error instanceof Error ? error.message : String(error)}.`);
    }
  }

  function reply(value: string) {
    const text = value.trim().toLowerCase();
    if (phase === "ask-rent") {
      const amount = Number.parseFloat(text.replace(/[^0-9.]/g, ""));
      say("you", value);
      if (!Number.isFinite(amount) || amount <= 0) {
        say("agent", "Sorry, I need a monthly amount, like 2150.");
        return;
      }
      housing.current = { monthlyRentUsd: Math.round(amount), source: "manual" };
      review();
      return;
    }
    if (phase === "review") {
      if (/^(yes|y|submit|ok|go|sure|looks good)/.test(text) || value === "submit") {
        void submit();
        return;
      }
      if (value === "form" || /form|review|myself|manual/.test(text)) {
        say("you", "I'll review the full form myself.");
        say(
          "agent",
          <>
            Sure:{" "}
            <a className="font-semibold underline" href={formHref}>
              open the application form
            </a>
            . It is prefilled from your pod too.
          </>,
        );
        return;
      }
      say("you", value);
      say("agent", "I can submit it now, or you can review the full form yourself.");
    }
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
        busy={phase === "working" || phase === "submitting"}
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
                    onAllow={(allowed) => void run(allowed)}
                    onManual={() => {
                      say("you", "No thanks, I'll fill it in myself.");
                      say(
                        "agent",
                        <>
                          Of course:{" "}
                          <a className="font-semibold underline" href={formHref}>
                            open the application form
                          </a>
                          .
                        </>,
                      );
                      setPhase("manual");
                    }}
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
        onReply={phase === "review" || phase === "ask-rent" ? reply : undefined}
        replies={replies}
      />
    </div>
  );
}
