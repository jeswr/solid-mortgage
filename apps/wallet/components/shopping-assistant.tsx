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
import { LENDER_TARGETS, type PresentOutcome, presentToLender } from "@/lib/prequal/present";

/**
 * The agentic pre-qualification: the borrower asks their assistant to shop for
 * a rate. After consent it reads the two operand anchors from the pod, proves
 * both thresholds IN THIS BROWSER for each lender (the same real proofs and
 * VP-POST as the manual page), and compares the quotes. Hidden values never
 * leave the device — and are never shown to the language model either.
 *
 * Free text at every step: with the local demo server's language model
 * (`/__demo/assistant`) the visitor's words pick one of the allowed actions;
 * otherwise a small scripted interpreter does. The APP performs the action.
 */

const STEPS_ID = "agent-steps";

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
        "Alex agrees: read the two anchors from the pod and send zero-knowledge proofs to both lenders.",
    },
    { id: "decline_manual", description: "Alex declines, or wants to send the proofs manually." },
  ],
  choose: [
    { id: "apply", description: "Alex wants to start an application with the primary lender." },
    { id: "not_now", description: "Alex does not want to apply yet." },
  ],
};

function scriptedAction(phase: Phase, text: string): string {
  const lower = text.toLowerCase();
  const no = /\b(no|nope|not|don't|do not|later|manual|myself)\b/.test(lower);
  const yes = /\b(yes|yeah|sure|ok|okay|allow|go|go ahead|please|apply|start)\b/.test(lower);
  if (phase === "consent") return no ? "decline_manual" : yes ? "allow" : "answer_only";
  if (phase === "choose") return no ? "not_now" : yes ? "apply" : "answer_only";
  return "answer_only";
}

const SCRIPTED_HELP: Partial<Record<Phase, string>> = {
  consent:
    "I'd read two signed anchors from your pod and send each lender a proof only. Shall I go ahead, or would you rather do it yourself?",
  choose: "I can start an application with your primary lender now, or we can wait.",
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
      text: "Hi Alex. Want me to shop for a mortgage pre-qualification? I can show two lenders you meet their income and credit-score thresholds without telling them your numbers.",
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
      "The proofs reveal only that income ≥ $7,000/month and credit score ≥ 620; you do not know the actual figures.",
      `The manual pre-qualification page is ${manualHref}.`,
    ];
    if (quotes.current.length > 0) {
      lines.push(
        `Quotes received (illustrative, not offers): ${quotes.current
          .map((quote) => `${quote.label}: ${quote.rate}% (${quote.apr}% APR)`)
          .join("; ")}. Only the primary lender offers a full application in this demo.`,
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
      say("agent", "Your vault is still starting. Try again in a moment.");
      return;
    }
    setPhase("working");
    const session = vault.connection.session;
    setSteps([
      {
        id: "anchors",
        label: "Read your income and credit-score anchors from your pod",
        state: "running",
      },
      ...LENDER_TARGETS.map((lender) => ({
        id: lender.id,
        label: `Prove the thresholds to: ${lender.label}`,
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
        detail:
          "Issuer-signed anchors read from your pod. Your actual figures stay in this browser.",
      });
    } catch (error) {
      setStep("anchors", {
        state: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
      manual("I couldn't read the anchors from your pod.");
      return;
    }

    quotes.current = [];
    for (const lender of LENDER_TARGETS) {
      setStep(lender.id, { state: "running", detail: "Requesting a single-use challenge…" });
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
                ? "Building a zero-knowledge proof in your browser…"
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
          detail: `Qualified. ${outcome.proofs.length} proofs sent; no figures disclosed.`,
        });
      } else {
        setStep(lender.id, {
          state: "failed",
          detail: "detail" in outcome ? outcome.detail : "not qualified",
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
    setPhase("choose");
    say(
      "agent",
      <div data-agent-quotes="">
        <p>
          You qualify with {quotes.current.length} lender
          {quotes.current.length === 1 ? "" : "s"}, and neither learned your income or credit score:
        </p>
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
        <p className="mt-2">Shall I start an application with your primary lender?</p>
      </div>,
      `You qualify with ${quotes.current.length} lenders. ${facts()[2] ?? ""} Shall I start an application with the primary lender?`,
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
              {quiet ? "" : "Great. "}Your primary lender has its own assistant that can fill in the
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
        if (!quiet) say("agent", "No problem. Your quotes stay here; apply whenever you're ready.");
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
          { label: "Yes, start the application", value: "apply" },
          { label: "Not yet", value: "later" },
        ]
      : [];

  function reply(value: string) {
    if (value === "apply") return choose("Yes, start the application.", "apply");
    if (value === "later") return choose("Not yet.", "not_now");
    void converse(value);
  }

  const rendered = messages.map((message) =>
    message.id === STEPS_ID
      ? {
          ...message,
          content: (
            <div>
              <p>Working on it:</p>
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
              <p>
                Hi Alex. Want me to shop for a mortgage pre-qualification? I can show two lenders
                that you meet their income and credit-score thresholds without telling them your
                actual numbers. For that I need:
              </p>
              {phase === "consent" && (
                <ConsentRequest
                  disabled={vault.status !== "ready"}
                  manualLabel="No thanks, I'll do it myself"
                  onAllow={(allowed) =>
                    allowed.includes("pod") && allowed.includes("lenders")
                      ? choose("Yes, go ahead.", "allow")
                      : choose("Not right now.", "decline_manual")
                  }
                  onManual={() => choose("I'll do it myself.", "decline_manual")}
                  sources={[
                    {
                      id: "pod",
                      name: "Your Solid pod (Data Vault)",
                      reads:
                        "Your income and credit-score credentials and their signed anchors, to build the proofs in this browser.",
                    },
                    {
                      id: "lenders",
                      name: "Contact two lenders for you",
                      reads:
                        "Send each one a proof only. No figures, no documents, no credit pull.",
                    },
                  ]}
                />
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
