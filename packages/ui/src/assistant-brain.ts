"use client";

import { useEffect, useState } from "react";

/**
 * Client for the local demo server's assistant endpoint (`/__demo/assistant`):
 * when the demo runs locally with the Claude Code CLI available, the visitor's free
 * text is interpreted by a language model that picks one of the actions the page
 * allows. Loopback-only; everywhere else (and on any failure) the assistants stay
 * scripted.
 */

export interface AssistantAction {
  readonly id: string;
  readonly description: string;
}

export interface AssistantTurn {
  readonly from: "agent" | "you";
  readonly text: string;
}

export interface AssistantAsk {
  readonly assistant: "lender-application" | "rate-shopping";
  readonly phase: string;
  readonly actions: readonly AssistantAction[];
  readonly context?: readonly string[];
  readonly history?: readonly AssistantTurn[];
  readonly message: string;
}

export interface AssistantDecision {
  readonly reply: string;
  readonly action: string;
  readonly monthlyRentUsd?: number;
  readonly model: string;
}

const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);
const MODEL_NAMES: Record<string, string> = { "claude-opus-5-5": "Claude Opus 5.5" };

const loopback = () => typeof location !== "undefined" && LOOPBACK.has(location.hostname);

export async function askAssistant(ask: AssistantAsk): Promise<AssistantDecision | undefined> {
  if (!loopback()) return undefined;
  try {
    const response = await fetch("/__demo/assistant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ context: [], history: [], ...ask }),
    });
    if (!response.ok) return undefined;
    return (await response.json()) as AssistantDecision;
  } catch {
    return undefined;
  }
}

/** The engine label to show, or `undefined` when the assistant is scripted. */
export function useAssistantEngine(): string | undefined {
  const [engine, setEngine] = useState<string | undefined>();
  useEffect(() => {
    if (!loopback()) return;
    let active = true;
    fetch("/__demo/assistant", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : undefined))
      .then((status: { available?: boolean; model?: string } | undefined) => {
        if (!active || status?.available !== true || typeof status.model !== "string") return;
        setEngine(`${MODEL_NAMES[status.model] ?? status.model} through your local Claude Code`);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return engine;
}
