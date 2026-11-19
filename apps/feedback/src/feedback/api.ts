// AUTHORED-BY Claude Opus 5.5
/**
 * The page's side of /api/feedback/*. Every call omits credentials, has a timeout, and reads
 * only a JSON object: a platform error page, a 404 from the static preview server or a network
 * failure all look the same to the visitor ("not available"), and no upstream body is shown.
 */
import {
  type Answers,
  type AudioReceipt,
  type FeedbackStatus,
  isReceiptFor,
  NOT_CONFIGURED,
  type Question,
  questionById,
  type Submission,
  validateAnswers,
} from "@mortgage/feedback";

const API = "/api/feedback";

async function readJson(response: Response): Promise<Record<string, unknown>> {
  if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("The feedback service did not answer.");
  }
  const value: unknown = await response.json().catch(() => undefined);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("The feedback service's answer was not usable.");
  }
  return value as Record<string, unknown>;
}

/** Whether the interviewer and sending are switched on; both off when the API cannot be reached. */
export async function fetchStatus(signal?: AbortSignal): Promise<FeedbackStatus> {
  try {
    const response = await fetch(`${API}/status`, {
      credentials: "omit",
      signal: signal ?? AbortSignal.timeout(8_000),
    });
    const body = await readJson(response);
    return { interviewer: body.interviewer === true, sending: body.sending === true };
  } catch {
    return NOT_CONFIGURED;
  }
}

export interface TurnResult {
  reply: string;
  answers: Answers;
  question: Question | undefined;
  done: boolean;
}

export async function sendTurn(body: {
  pathway: "guided" | "quick";
  messages: { role: "user" | "assistant"; content: string }[];
  answers: Answers;
  from: string;
}): Promise<TurnResult> {
  const response = await fetch(`${API}/turn`, {
    method: "POST",
    credentials: "omit",
    signal: AbortSignal.timeout(75_000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await readJson(response);
  if (typeof result.reply !== "string" || typeof result.done !== "boolean") {
    throw new Error("The interviewer couldn't reply.");
  }
  // Only a question the page's own guide knows can be shown.
  const id =
    typeof result.question === "object" && result.question !== null
      ? (result.question as { id?: unknown }).id
      : undefined;
  const question = typeof id === "string" ? questionById(id) : undefined;
  if (!result.done && question === undefined) throw new Error("The next question is unavailable.");
  return {
    reply: result.reply,
    answers: validateAnswers(result.answers),
    question,
    done: result.done,
  };
}

export async function uploadRecording(blob: Blob): Promise<AudioReceipt> {
  const response = await fetch(`${API}/audio`, {
    method: "POST",
    credentials: "omit",
    signal: AbortSignal.timeout(45_000),
    headers: { "Content-Type": blob.type },
    body: blob,
  });
  const receipt = await readJson(response);
  if (!isReceiptFor(receipt, blob.size)) throw new Error("The recording receipt is unavailable.");
  return receipt;
}

export async function submitFeedback(
  record: Submission,
  receipts: AudioReceipt[],
): Promise<number> {
  const response = await fetch(`${API}/submit`, {
    method: "POST",
    credentials: "omit",
    signal: AbortSignal.timeout(75_000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ record, receipts }),
  });
  const result = await readJson(response);
  const reference = result.reference;
  if (typeof reference !== "number" || !Number.isSafeInteger(reference) || reference < 1) {
    throw new Error("The feedback reference is unavailable.");
  }
  return reference;
}

/** Save the download archive through the browser. */
export function saveArchive(bytes: Uint8Array, name: string): void {
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
