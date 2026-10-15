/**
 * The demo assistants' LANGUAGE MODEL, for local runs: the visitor's message is
 * interpreted by Claude through the Claude Code CLI installed on this machine
 * (`claude -p`, headless, no tools), signed in with the operator's own Claude
 * Code login — so every turn counts against that account's usage. Local only:
 * a public deployment would need an API key instead.
 *
 * The model never acts. It picks ONE of the actions the app says are allowed at
 * this point in the conversation (or `answer_only`) and writes the reply; the app
 * itself performs the action through its normal, authenticated calls.
 */
import { execFile } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const ASSISTANT_MODEL = process.env.DEMO_LLM_MODEL ?? "claude-opus-5-5";
const TIMEOUT_MS = 90_000;
const MAX_MESSAGE = 2000;
const MAX_HISTORY = 16;

export interface AssistantRequest {
  /** Which assistant: its fixed role prompt is chosen here, never by the page. */
  readonly assistant: "lender-application" | "rate-shopping";
  readonly phase: string;
  readonly actions: readonly { readonly id: string; readonly description: string }[];
  /** Short facts the assistant may use to answer (no hidden ZK values). */
  readonly context: readonly string[];
  readonly history: readonly { readonly from: "agent" | "you"; readonly text: string }[];
  readonly message: string;
}

export interface AssistantDecision {
  readonly reply: string;
  readonly action: string;
  readonly monthlyRentUsd?: number;
  readonly model: string;
}

const ROLES: Record<AssistantRequest["assistant"], string> = {
  "lender-application":
    "You are Alex Rivera's personal home-buying assistant, working inside a mortgage lender's website (a concept demo; all data is fictional). You can prepare Alex's mortgage application, but only with consent: you may read Alex's Solid pod (profile, employment and income, assets and credit credentials) and, optionally, the demo rent receipts (simulated). Alex can allow the pod with or without the rent receipts, or neither, and can always fill in the form manually instead. You cannot submit the application: only Alex's press of the Submit application button submits it.",
  "rate-shopping":
    "You are Alex Rivera's personal home-buying assistant inside Alex's Data Vault (a concept demo; all data is fictional). You can shop for a mortgage pre-qualification: with consent you read two signed anchors from Alex's Solid pod, build zero-knowledge proofs in Alex's browser that income is at least $7,000 a month and the credit score at least 620, and send only the proofs to two lenders; the exact figures are not sent, although the prototype's encoding may let a lender guess them. You do not know Alex's actual income or score and must never guess them.",
};

const RULES = `Rules:
- Choose exactly one action id from the allowed list for this phase, or "answer_only" when the message is a question, small talk, unclear, or asks for something not on the list.
- Only choose an action the message clearly asks for or agrees to. When in doubt, choose "answer_only" and ask a short clarifying question.
- A refusal or negation is never agreement: "don't", "do not", "not", "no" or "without" next to an action or source means Alex does NOT want it (for example "Allow pod, not rent receipts" allows the pod only).
- If the action needs a monthly rent figure, put it in monthlyRentUsd as a number.
- Reply in plain, friendly English, at most three short sentences. Do not use markdown. Do not invent data, rates or results: the app reports results itself after you act.
- This is a demonstration: never ask for real personal or financial information.`;

const SCHEMA = (actions: readonly string[]) =>
  JSON.stringify({
    type: "object",
    properties: {
      reply: { type: "string" },
      action: { type: "string", enum: [...actions, "answer_only"] },
      monthlyRentUsd: { type: "number" },
    },
    required: ["reply", "action"],
    additionalProperties: false,
  });

const workdir = mkdtempSync(join(tmpdir(), "solid-demo-assistant-"));
let available: Promise<boolean> | undefined;

function runClaude(args: readonly string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "claude",
      [...args],
      { cwd: workdir, timeout: TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024, env: process.env },
      (error, stdout) => (error ? reject(error) : resolve(stdout)),
    );
  });
}

/** Whether the Claude Code CLI is installed and the demo has not opted out (DEMO_LLM=off). */
export function assistantAvailable(): Promise<boolean> {
  if (process.env.DEMO_LLM === "off") return Promise.resolve(false);
  available ??= runClaude(["--version"]).then(
    () => true,
    () => false,
  );
  return available;
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text);

export function validateRequest(body: unknown): AssistantRequest | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const candidate = body as Partial<AssistantRequest>;
  if (candidate.assistant !== "lender-application" && candidate.assistant !== "rate-shopping") {
    return undefined;
  }
  if (typeof candidate.phase !== "string" || typeof candidate.message !== "string")
    return undefined;
  if (!Array.isArray(candidate.actions) || candidate.actions.length > 12) return undefined;
  const actions = candidate.actions.filter(
    (action): action is { id: string; description: string } =>
      typeof action?.id === "string" &&
      /^[a-z_]{1,40}$/.test(action.id) &&
      typeof action.description === "string",
  );
  const context = Array.isArray(candidate.context)
    ? candidate.context.filter((line): line is string => typeof line === "string").slice(0, 12)
    : [];
  const history = Array.isArray(candidate.history)
    ? candidate.history
        .filter(
          (entry): entry is { from: "agent" | "you"; text: string } =>
            (entry?.from === "agent" || entry?.from === "you") && typeof entry.text === "string",
        )
        .slice(-MAX_HISTORY)
    : [];
  return {
    assistant: candidate.assistant,
    phase: clip(candidate.phase, 40),
    actions: actions.map((action) => ({
      id: action.id,
      description: clip(action.description, 300),
    })),
    context: context.map((line) => clip(line, 300)),
    history: history.map((entry) => ({ from: entry.from, text: clip(entry.text, 600) })),
    message: clip(candidate.message, MAX_MESSAGE),
  };
}

export async function decide(request: AssistantRequest): Promise<AssistantDecision> {
  const actionIds = request.actions.map((action) => action.id);
  const prompt = [
    `Current phase: ${request.phase}`,
    "Allowed actions:",
    ...request.actions.map((action) => `- ${action.id}: ${action.description}`),
    "- answer_only: reply without taking an action.",
    request.context.length > 0
      ? `What you know:\n${request.context.map((line) => `- ${line}`).join("\n")}`
      : "",
    request.history.length > 0
      ? `Conversation so far:\n${request.history.map((entry) => `${entry.from === "you" ? "Alex" : "Assistant"}: ${entry.text}`).join("\n")}`
      : "",
    `Alex's new message: ${request.message}`,
  ]
    .filter((part) => part !== "")
    .join("\n\n");

  const stdout = await runClaude([
    "-p",
    prompt,
    "--model",
    ASSISTANT_MODEL,
    "--output-format",
    "json",
    "--json-schema",
    SCHEMA(actionIds),
    "--tools",
    "",
    "--strict-mcp-config",
    "--no-session-persistence",
    "--system-prompt",
    `${ROLES[request.assistant]}\n\n${RULES}`,
  ]);
  const envelope = JSON.parse(stdout) as {
    is_error?: boolean;
    structured_output?: { reply?: unknown; action?: unknown; monthlyRentUsd?: unknown };
  };
  const output = envelope.structured_output;
  if (envelope.is_error === true || output === undefined) throw new Error("no structured reply");
  const action =
    typeof output.action === "string" && actionIds.includes(output.action)
      ? output.action
      : "answer_only";
  const reply =
    typeof output.reply === "string" && output.reply.trim() !== "" ? output.reply.trim() : "";
  const rent =
    typeof output.monthlyRentUsd === "number" &&
    Number.isFinite(output.monthlyRentUsd) &&
    output.monthlyRentUsd > 0 &&
    output.monthlyRentUsd < 100_000
      ? Math.round(output.monthlyRentUsd)
      : undefined;
  return {
    reply: clip(reply, 800),
    action,
    ...(rent !== undefined ? { monthlyRentUsd: rent } : {}),
    model: ASSISTANT_MODEL,
  };
}
