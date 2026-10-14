"use client";

import { cn } from "@jeswr/app-shell";
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";

/**
 * Building blocks for the demo's ASSISTANT flows: the borrower talks to their own agent,
 * which asks for consent per data source before it reads anything, offers a manual
 * fallback, then shows each action it takes. The agents in this demo are SCRIPTED (no
 * language model): `AgentConversation` always says so, and every action they take is a
 * real call the visitor could have made by hand.
 */

export type AgentSpeaker = "agent" | "you";

export interface AgentMessage {
  readonly id: string;
  readonly from: AgentSpeaker;
  readonly content: ReactNode;
}

export interface AgentReply {
  readonly label: string;
  readonly value: string;
}

export interface AgentConversationProps {
  /** e.g. "Your home-buying assistant". */
  readonly agentName: string;
  readonly messages: readonly AgentMessage[];
  /** Suggested replies shown under the conversation. */
  readonly replies?: readonly AgentReply[];
  /** Called with a reply's value, or with free text the visitor typed. */
  readonly onReply?: (value: string) => void;
  /** Disable input while the agent is working. */
  readonly busy?: boolean;
  /** What answers the visitor, e.g. "Claude Opus 5.5 (your local Claude Code)". Default: scripted. */
  readonly engine?: string;
  readonly className?: string;
}

export function AgentConversation({
  agentName,
  messages,
  replies = [],
  onReply,
  busy = false,
  engine,
  className,
}: AgentConversationProps) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const count = messages.length;

  useEffect(() => {
    if (count > 0) endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [count]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (text === "" || onReply === undefined) return;
    setDraft("");
    onReply(text);
  }

  return (
    <section
      aria-label={agentName}
      className={cn("flex flex-col rounded-xl border border-border bg-card shadow-sm", className)}
      data-agent-conversation=""
    >
      <header className="flex items-center gap-3 border-border border-b px-5 py-3">
        <span
          aria-hidden="true"
          className="flex size-9 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground text-sm"
        >
          AI
        </span>
        <div>
          <p className="font-semibold text-card-foreground">{agentName}</p>
          <p className="text-muted-foreground text-xs">
            {engine === undefined
              ? "Scripted demo assistant. It acts only after you say yes."
              : `Answered by ${engine}. It acts only after you say yes.`}
          </p>
        </div>
      </header>
      <ol aria-live="polite" className="flex flex-col gap-3 px-5 py-4">
        {messages.map((message) => (
          <li
            className={cn(
              "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
              message.from === "agent"
                ? "self-start rounded-tl-sm bg-muted text-foreground"
                : "self-end rounded-tr-sm bg-primary text-primary-foreground",
            )}
            data-agent-message={message.from}
            key={message.id}
          >
            {message.content}
          </li>
        ))}
        {busy && (
          <li className="self-start text-muted-foreground text-xs" data-agent-busy="">
            {agentName} is working…
          </li>
        )}
      </ol>
      <div ref={endRef} />
      {onReply !== undefined && (
        <div className="border-border border-t px-5 py-3">
          {replies.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {replies.map((reply) => (
                <button
                  className="rounded-full border border-border bg-background px-3 py-1.5 font-medium text-foreground text-sm hover:bg-muted disabled:opacity-50"
                  data-agent-reply={reply.value}
                  disabled={busy}
                  key={reply.value}
                  onClick={() => onReply(reply.value)}
                  type="button"
                >
                  {reply.label}
                </button>
              ))}
            </div>
          )}
          <form className="flex gap-2" onSubmit={submit}>
            <label className="sr-only" htmlFor="agent-input">
              Message {agentName}
            </label>
            <input
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              disabled={busy}
              id="agent-input"
              onChange={(event) => setDraft(event.target.value)}
              aria-describedby="agent-input-hint"
              placeholder={engine === undefined ? "Type a reply" : "Ask your assistant"}
              value={draft}
            />
            <button
              className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground text-sm disabled:opacity-50"
              disabled={busy || draft.trim() === ""}
              type="submit"
            >
              Send
            </button>
          </form>
          <p className="mt-2 text-muted-foreground text-xs" id="agent-input-hint">
            Use demo information only.
          </p>
        </div>
      )}
    </section>
  );
}

export interface ConsentSource {
  readonly id: string;
  /** e.g. "Your Solid pod (Data Vault)". */
  readonly name: string;
  /** Exactly what will be read, in plain language. */
  readonly reads: string;
  /** Shown as a tag, e.g. "simulated" for the demo inbox. */
  readonly note?: string;
  /** Optional sources start unselected; the visitor opts in (astra-review-1 M10). */
  readonly optional?: boolean;
}

export interface ConsentRequestProps {
  readonly sources: readonly ConsentSource[];
  /** Called with the ids the visitor allowed (possibly none). */
  readonly onAllow: (allowed: readonly string[]) => void;
  readonly onManual: () => void;
  readonly manualLabel?: string;
  readonly disabled?: boolean;
}

/** A per-source consent request: the visitor can allow some sources and not others. */
export function ConsentRequest({
  sources,
  onAllow,
  onManual,
  manualLabel = "No thanks, I'll do it myself",
  disabled = false,
}: ConsentRequestProps) {
  const [allowed, setAllowed] = useState<readonly string[]>(
    sources.filter((source) => source.optional !== true).map((source) => source.id),
  );
  const toggle = (id: string) =>
    setAllowed((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  return (
    <div
      className="mt-2 rounded-xl border border-border bg-card p-4 text-card-foreground"
      data-consent-request=""
    >
      <p className="font-semibold text-sm">Choose data sources</p>
      <ul className="mt-2 flex flex-col gap-2">
        {sources.map((source) => (
          <li key={source.id}>
            <label className="flex items-start gap-3 text-sm">
              <input
                checked={allowed.includes(source.id)}
                className="mt-1"
                data-consent-source={source.id}
                disabled={disabled}
                onChange={() => toggle(source.id)}
                type="checkbox"
              />
              <span>
                <span className="font-medium">{source.name}</span>
                {source.optional === true && (
                  <span className="ml-2 text-muted-foreground text-xs">optional</span>
                )}
                {source.note !== undefined && (
                  <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
                    {source.note}
                  </span>
                )}
                <span className="block text-muted-foreground">{source.reads}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground text-sm disabled:opacity-50"
          data-consent-allow=""
          disabled={disabled}
          onClick={() => onAllow(allowed)}
          type="button"
        >
          {allowed.length === 0 ? "Allow none" : "Allow selected sources"}
        </button>
        <button
          className="rounded-lg border border-border px-4 py-2 font-semibold text-sm disabled:opacity-50"
          data-consent-manual=""
          disabled={disabled}
          onClick={onManual}
          type="button"
        >
          {manualLabel}
        </button>
      </div>
    </div>
  );
}

export type AgentStepState = "pending" | "running" | "done" | "skipped" | "failed";

export interface AgentStep {
  readonly id: string;
  readonly label: string;
  readonly state: AgentStepState;
  readonly detail?: ReactNode;
}

const STEP_ICON: Record<AgentStepState, string> = {
  pending: "○",
  running: "◐",
  done: "✓",
  skipped: "–",
  failed: "✕",
};

/** The agent's visible action log: what it is doing, step by step. */
export function AgentSteps({ steps }: { readonly steps: readonly AgentStep[] }) {
  return (
    <ol className="mt-2 flex flex-col gap-1.5 text-sm" data-agent-steps="">
      {steps.map((step) => (
        <li className="flex gap-2" data-agent-step={step.id} data-state={step.state} key={step.id}>
          <span
            aria-hidden="true"
            className={cn(
              "w-4 shrink-0 text-center font-semibold",
              step.state === "done" && "text-primary",
              step.state === "failed" && "text-red-700",
              step.state === "running" && "animate-pulse",
            )}
          >
            {STEP_ICON[step.state]}
          </span>
          <span>
            <span className={step.state === "pending" ? "text-muted-foreground" : ""}>
              {step.label}
            </span>
            <span className="sr-only"> ({step.state})</span>
            {step.detail !== undefined && (
              <span className="block text-muted-foreground text-xs">{step.detail}</span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
