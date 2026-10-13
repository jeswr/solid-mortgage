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
import { type ReactNode, useEffect, useRef, useState } from "react";
import { readProofMaterial } from "@/lib/pod/credentials";
import { useVault } from "@/lib/pod/vault-context";
import { LENDER_TARGETS, type PresentOutcome, presentToLender } from "@/lib/prequal/present";

/**
 * The agentic pre-qualification: the borrower asks their assistant to shop for
 * a rate. After consent it reads the two operand anchors from the pod, proves
 * both thresholds IN THIS BROWSER for each lender (the same real proofs and
 * VP-POST as the manual page), and compares the quotes. Hidden values never
 * leave the device. Scripted, not a language model — and it says so.
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

export function ShoppingAssistant({
  manualHref,
  applyHref,
}: {
  manualHref: string;
  applyHref: string;
}) {
  const vault = useVault();
  const [phase, setPhase] = useState<Phase>("consent");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const quotes = useRef<Quote[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    void import("@mortgage/vc-kit").then(({ prewarmProver }) => prewarmProver()).catch(() => {});
  }, []);

  const say = (from: AgentMessage["from"], content: ReactNode) => {
    nextId.current += 1;
    const id = `m${nextId.current}`;
    setMessages((current) => [...current, { id, from, content }]);
  };
  const setStep = (id: string, patch: Partial<AgentStep>) =>
    setSteps((current) => current.map((step) => (step.id === id ? { ...step, ...patch } : step)));

  async function run(allowed: readonly string[]) {
    if (!allowed.includes("pod") || !allowed.includes("lenders")) {
      say("you", "Not right now.");
      say(
        "agent",
        <>
          Understood. You can still{" "}
          <a className="font-semibold underline" href={manualHref}>
            send the proofs yourself
          </a>
          , one lender at a time.
        </>,
      );
      setPhase("manual");
      return;
    }
    if (vault.status !== "ready") {
      say("agent", "Your vault is still starting. Try again in a moment.");
      return;
    }
    say("you", "Yes, go ahead.");
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
    setMessages((current) => [...current, { id: STEPS_ID, from: "agent", content: null }]);

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
      setPhase("manual");
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
          You qualify with {quotes.current.length} lender{quotes.current.length === 1 ? "" : "s"},
          and neither learned your income or credit score:
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
    );
  }

  function reply(value: string) {
    const text = value.trim().toLowerCase();
    if (value === "apply" || /^(yes|y|ok|sure|apply|start|go)/.test(text)) {
      say("you", "Yes, start the application.");
      setPhase("done");
      say(
        "agent",
        <div data-agent-done="">
          <p>
            Great. Your primary lender has its own assistant that can fill in the application from
            your pod.{" "}
            <a className="font-semibold underline" data-agent-handoff="" href={applyHref}>
              Continue to the application
            </a>
            .
          </p>
        </div>,
      );
      return;
    }
    say("you", value);
    say("agent", "No problem. Your quotes are saved here; you can apply whenever you're ready.");
    setPhase("done");
  }

  const replies: AgentReply[] =
    phase === "choose"
      ? [
          { label: "Yes, start the application", value: "apply" },
          { label: "Not yet", value: "later" },
        ]
      : [];

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
      busy={phase === "working"}
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
                  onAllow={(allowed) => void run(allowed)}
                  onManual={() => {
                    say("you", "I'll do it myself.");
                    say(
                      "agent",
                      <>
                        Sure:{" "}
                        <a className="font-semibold underline" href={manualHref}>
                          open zero-knowledge pre-qualification
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
      onReply={phase === "choose" ? reply : undefined}
      replies={replies}
    />
  );
}
