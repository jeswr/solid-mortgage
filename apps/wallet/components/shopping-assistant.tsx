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
import { type ReactNode, useEffect, useRef, useState } from "react";
import { readProofMaterial } from "@/lib/pod/credentials";
import { useVault } from "@/lib/pod/vault-context";
import {
  describeOutcome,
  LENDER_TARGETS,
  type PresentOutcome,
  presentToLender,
} from "@/lib/prequal/present";

/**
 * The agentic pre-qualification: the borrower asks their assistant to shop for
 * a rate. After consent it reads the two value encodings from the pod, proves
 * both thresholds IN THIS BROWSER for each lender (the same real proofs and
 * VP-POST as the manual page), and compares the quotes. The exact figures are
 * not sent directly to the lenders, and never to the language model.
 *
 * Free text at every step: with the local demo server's language model
 * (`/__demo/assistant`) the visitor's words pick one of the allowed actions;
 * otherwise a small scripted interpreter does. The APP performs the action.
 */

const STEPS_ID = "agent-steps";

// astra-review-2 finding 16: one short greeting; no promises about what lenders learn (H2).
const GREETING = "Check two lenders' criteria using Alex's income and credit-score credentials.";
const QUOTE_STATEMENT =
  "Your actual rate, payment, and costs could be higher. Get an official Loan Estimate before choosing a loan.";
const NOT_APPROVAL = "Prequalification is not credit approval or a commitment to lend.";
// Review M11: say plainly why the demo continues with the primary lender.
const HANDOFF =
  "Only the primary lender has an application in this demo, so we continue there. Continue?";

interface Quote {
  readonly lender: string;
  readonly label: string;
  readonly product?: string;
  readonly rate?: number;
  readonly apr?: number;
}

type Phase = "consent" | "working" | "choose" | "done" | "manual";

const ACTIONS: Partial<Record<Phase, readonly AssistantAction[]>> = {
  consent: [
    {
      id: "allow",
      description:
        "Alex agrees: read the income and credit-score credentials and send proofs to both lenders.",
    },
    { id: "decline_manual", description: "Alex declines, or wants to send the proofs manually." },
  ],
  choose: [
    { id: "apply", description: "Alex wants to continue to the primary lender's application." },
    { id: "not_now", description: "Alex does not want to apply yet." },
  ],
};

function scriptedAction(phase: Phase, text: string): string {
  const lower = text.toLowerCase();
  const no = /\b(no|nope|not|don't|do not|later|manual|myself)\b/.test(lower);
  const yes = /\b(yes|yeah|sure|ok|okay|allow|go|go ahead|please|apply|start|continue)\b/.test(
    lower,
  );
  if (phase === "consent") return no ? "decline_manual" : yes ? "allow" : "answer_only";
  if (phase === "choose") return no ? "not_now" : yes ? "apply" : "answer_only";
  return "answer_only";
}

const SCRIPTED_HELP: Partial<Record<Phase, string>> = {
  consent:
    "I'd read your income and credit-score credentials from your pod and send each lender proofs derived from them. Shall I go ahead?",
  choose: "I can take you to the primary lender's application now, or we can wait.",
};

export function ShoppingAssistant({
  manualHref,
  applyHref,
}: {
  manualHref: string;
  applyHref: string;
}) {
  const vault = useVault();
  const engine = useAssistantEngine();
  const [phase, setPhaseState] = useState<Phase>("consent");
  const phaseRef = useRef<Phase>("consent");
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const quotes = useRef<Quote[]>([]);
  const history = useRef<AssistantTurn[]>([
    {
      from: "agent",
      text: GREETING,
    },
  ]);
  const nextId = useRef(0);

  useEffect(() => {
    void import("@mortgage/vc-kit").then(({ prewarmProver }) => prewarmProver()).catch(() => {});
  }, []);

  const setPhase = (next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  };
  const say = (from: AgentMessage["from"], content: ReactNode, text?: string) => {
    nextId.current += 1;
    const id = `m${nextId.current}`;
    setMessages((current) => [...current, { id, from, content }]);
    const plain = text ?? (typeof content === "string" ? content : undefined);
    if (plain !== undefined) history.current.push({ from, text: plain });
  };
  const setStep = (id: string, patch: Partial<AgentStep>) =>
    setSteps((current) => current.map((step) => (step.id === id ? { ...step, ...patch } : step)));

  function facts(): string[] {
    const lines = [
      "The proofs show only that income is at least $7,000 a month and the credit score is at least 620. You do not know the actual figures.",
      `The manual prequalification page is ${manualHref}.`,
    ];
    if (quotes.current.length > 0) {
      lines.push(
        `Quotes received (illustrative, not offers): ${quotes.current
          .map((quote) => `${quote.label}: ${quote.rate}% (${quote.apr}% APR)`)
          .join(
            "; ",
          )}. Only the primary lender has an application in this demo, so the demo continues there.`,
      );
    }
    return lines;
  }

  function manual(text: string, quiet = false) {
    const link = (
      <a className="font-semibold underline" href={manualHref}>
        send the proofs yourself
      </a>
    );
    say(
      "agent",
      quiet ? (
        <>You can {link} at any time.</>
      ) : (
        <>
          {text} You can {link}, one lender at a time.
        </>
      ),
      text,
    );
    setPhase("manual");
  }

  async function run() {
    if (vault.status !== "ready") {
      say("agent", "Your pod is still starting. Try again in a moment.");
      return;
    }
    setPhase("working");
    const session = vault.connection.session;
    setSteps([
      {
        id: "anchors",
        label: "Read your income and credit-score credentials",
        state: "running",
      },
      ...LENDER_TARGETS.map((lender) => ({
        id: lender.id,
        label: `Send proofs: ${lender.label}`,
        state: "pending" as const,
      })),
      { id: "compare", label: "Compare the quotes", state: "pending" },
    ]);
    // One live action log, moved to the end on a retry.
    setMessages((current) => [
      ...current.filter((message) => message.id !== STEPS_ID),
      { id: STEPS_ID, from: "agent", content: null },
    ]);

    let material: Awaited<ReturnType<typeof readProofMaterial>>;
    try {
      material = await readProofMaterial(session.authFetch);
      setStep("anchors", {
        state: "done",
        detail: "Read from your pod.",
      });
    } catch (error) {
      setStep("anchors", {
        state: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
      manual("I couldn't read your credentials from your pod.");
      return;
    }

    quotes.current = [];
    for (const lender of LENDER_TARGETS) {
      setStep(lender.id, { state: "running", detail: "Getting a challenge from the lender…" });
      let outcome: PresentOutcome;
      try {
        outcome = await presentToLender({
          lender,
          anchors: material.anchors,
          hiddenValues: material.hiddenValues,
          fetch: session.publicFetch,
          onStage: (stage) =>
            setStep(lender.id, {
              state: "running",
              detail: stage.startsWith("prove")
                ? "Building a proof in your browser…"
                : "Sending the proofs…",
            }),
        });
      } catch (error) {
        setStep(lender.id, {
          state: "failed",
          detail: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
      if (outcome.kind === "qualified") {
        const rate = outcome.rateQuote as
          | { product?: string; interestRatePercent?: number; aprPercent?: number }
          | undefined;
        quotes.current.push({
          lender: lender.id,
          label: lender.label,
          ...(rate?.product !== undefined ? { product: rate.product } : {}),
          ...(rate?.interestRatePercent !== undefined ? { rate: rate.interestRatePercent } : {}),
          ...(rate?.aprPercent !== undefined ? { apr: rate.aprPercent } : {}),
        });
        setStep(lender.id, {
          state: "done",
          detail: `Meets the demo criteria. ${outcome.proofs.length} proofs sent; exact figures are not sent directly.`,
        });
      } else {
        setStep(lender.id, {
          state: "failed",
          detail: describeOutcome(outcome).title,
        });
      }
    }
    setStep("compare", { state: "done" });

    if (quotes.current.length === 0) {
      say("agent", "No lender returned a quote this time.");
      setPhase("manual");
      return;
    }
    const sorted = [...quotes.current].sort((a, b) => (a.apr ?? 99) - (b.apr ?? 99));
    const met =
      quotes.current.length === LENDER_TARGETS.length
        ? "You meet both lenders' demo prequalification criteria."
        : `You meet ${quotes.current.length} lender's demo prequalification criteria.`;
    setPhase("choose");
    say(
      "agent",
      <div data-agent-quotes="">
        <p>{met}</p>
        <p className="mt-2 text-xs">{QUOTE_STATEMENT}</p>
        <ul className="mt-2 list-disc pl-5">
          {sorted.map((quote) => (
            <li key={quote.lender}>
              {quote.label}:{" "}
              <IllustrativeFigure>
                {quote.product ?? "rate"} {quote.rate}% ({quote.apr}% APR)
              </IllustrativeFigure>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs">{NOT_APPROVAL}</p>
        <p className="mt-2">{HANDOFF}</p>
      </div>,
      `${met} ${facts()[2] ?? ""} Continue with the primary lender?`,
    );
  }

  function act(action: string, quiet = false) {
    const current = phaseRef.current;
    if (current === "consent") {
      if (action === "allow") return void run();
      if (action === "decline_manual") return manual("Understood.", quiet);
    }
    if (current === "choose") {
      if (action === "apply") {
        setPhase("done");
        say(
          "agent",
          <div data-agent-done="">
            <p>
              {quiet ? "" : "Great. "}The primary lender&apos;s assistant can prefill the
              application from your pod.{" "}
              <a className="font-semibold underline" data-agent-handoff="" href={applyHref}>
                Continue to the application
              </a>
              .
            </p>
          </div>,
          "Handing over to the primary lender's application assistant.",
        );
        return;
      }
      if (action === "not_now") {
        setPhase("done");
        if (!quiet) say("agent", "No problem. The quotes stay here until you're ready.");
      }
    }
  }

  function choose(label: string, action: string) {
    say("you", label);
    act(action);
  }

  async function converse(text: string) {
    const current = phaseRef.current;
    say("you", text);
    setThinking(true);
    const decision = engine
      ? await askAssistant({
          assistant: "rate-shopping",
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
      act(decision.action, decision.reply !== "");
      return;
    }
    const action = scriptedAction(current, text);
    if (action === "answer_only") {
      say("agent", SCRIPTED_HELP[current] ?? "I'm here if you need anything else.");
      return;
    }
    act(action);
  }

  const replies: AgentReply[] =
    phase === "choose"
      ? [
          { label: "Continue with primary lender", value: "apply" },
          { label: "Not yet", value: "later" },
        ]
      : [];

  function reply(value: string) {
    if (value === "apply") return choose("Continue with the primary lender.", "apply");
    if (value === "later") return choose("Not yet.", "not_now");
    void converse(value);
  }

  const rendered = messages.map((message) =>
    message.id === STEPS_ID
      ? {
          ...message,
          content: (
            <div>
              <p>{phase === "working" ? "Working on it:" : "Checks complete:"}</p>
              <AgentSteps steps={steps} />
            </div>
          ),
        }
      : message,
  );

  return (
    <AgentConversation
      agentName="Your home-buying assistant"
      busy={phase === "working" || thinking}
      {...(engine !== undefined ? { engine } : {})}
      messages={[
        {
          id: "hello",
          from: "agent",
          content: (
            <div>
              <p>{GREETING}</p>
              {phase === "consent" && (
                // Review finding 7: recipients are not data sources — the lenders are
                // listed apart from the one source Alex chooses to allow.
                <p className="mt-2 text-sm" data-consent-recipients="">
                  <span className="font-medium">Send proofs to:</span> two lenders. Exact figures
                  are not sent directly; no documents and no credit inquiry.
                </p>
              )}
              {phase === "consent" && (
                <ConsentRequest
                  disabled={vault.status !== "ready"}
                  manualLabel="No thanks, I'll do it myself"
                  onAllow={(allowed) =>
                    allowed.includes("pod")
                      ? choose("Yes, go ahead.", "allow")
                      : choose("Not right now.", "decline_manual")
                  }
                  onManual={() => choose("I'll do it myself.", "decline_manual")}
                  sources={[
                    {
                      id: "pod",
                      name: "Read from: Alex's pod",
                      reads:
                        "Income and credit-score credentials, used to build proofs in this browser.",
                    },
                  ]}
                />
              )}
              {phase === "consent" && engine !== undefined && (
                <p className="mt-2 text-xs" data-agent-ai-notice="">
                  AI replies are on: your messages and the quotes go to the assistant service.
                </p>
              )}
            </div>
          ),
        },
        ...rendered,
      ]}
      onReply={phase === "working" ? undefined : reply}
      replies={replies}
    />
  );
}
