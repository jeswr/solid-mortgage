// AUTHORED-BY Claude Opus 5.5
/**
 * Pure view logic for the Castellan console: the findings report as numbered messages, and a
 * check at source lowered to the columns of the source-checks table. No pod access here.
 */
import type { VerifyCredentialResult } from "@mortgage/vc-kit";

export const CASEFILE = "JHL-1001";

export type MessageClass = "recommendation" | "verification" | "condition" | "note";

export interface FindingMessage {
  /** "0001", "0002", … in report order. */
  number: string;
  kind: MessageClass;
  text: string;
}

const CLASSES: [RegExp, MessageClass][] = [
  [/^recommendation\b/i, "recommendation"],
  [/^conditions?\b/i, "condition"],
  [/\b(read at source|signatures? checked|verified)\b/i, "verification"],
];

/**
 * Split a findings summary into the numbered messages of an AUS report. Sentences are split on
 * full stops; a "Conditions:" sentence becomes one message per condition (split on `;`).
 */
export function findingMessages(description: string): FindingMessage[] {
  const sentences = description
    .split(/(?<=\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
  const messages: { kind: MessageClass; text: string }[] = [];
  for (const sentence of sentences) {
    const kind = CLASSES.find(([pattern]) => pattern.test(sentence))?.[1];
    if (kind === "condition") {
      const body = sentence.replace(/^conditions?:\s*/i, "");
      for (const part of body.split(/;\s*/)) {
        const text = part.replace(/[.;]\s*$/, "").trim();
        if (text.length > 0) messages.push({ kind: "condition", text });
      }
    } else {
      messages.push({ kind: kind ?? "note", text: sentence });
    }
  }
  return messages.map((message, index) => ({
    ...message,
    number: String(index + 1).padStart(4, "0"),
  }));
}

/** The recommendation line of a findings summary, e.g. "Approve/Eligible". */
export function recommendationOf(description: string): string | undefined {
  return /recommendation:\s*([^.]+)\./i.exec(description)?.[1]?.trim();
}

export type CheckOutcome = "pass" | "fail";

export interface CheckColumns {
  signature: { outcome: CheckOutcome; text: string };
  status: { outcome: CheckOutcome; text: string };
  validity: { outcome: CheckOutcome; text: string };
  overall: CheckOutcome;
  /** Every error code, for the raw column. */
  codes: string[];
}

const SIGNATURE_CODES = new Set([
  "INVALID_SIGNATURE",
  "NO_PROOF",
  "ISSUER_MISMATCH",
  "UNKNOWN_CRYPTOSUITE",
  "PROOF_PURPOSE_MISMATCH",
  "UNTRUSTED_ISSUER",
  "MALFORMED",
  "SHAPE_VIOLATION",
]);
const STATUS_TEXT: Record<string, string> = {
  STATUS_REVOKED: "revoked by the issuer",
  STATUS_SUSPENDED: "suspended by the issuer",
  STATUS_UNREACHABLE: "status list unreachable",
};

/** Lower a verification result to the table's signature, status and validity columns. */
export function checkColumns(result: VerifyCredentialResult): CheckColumns {
  const codes = result.errors.map((error) => error.code as string);
  const signatureCode = codes.find((code) => SIGNATURE_CODES.has(code));
  const statusCode = codes.find((code) => code.startsWith("STATUS_"));
  const validityCode = codes.find((code) => code === "EXPIRED" || code === "NOT_YET_VALID");
  return {
    codes,
    overall: result.verified ? "pass" : "fail",
    signature: signatureCode
      ? { outcome: "fail", text: signatureCode.toLowerCase().replace(/_/g, " ") }
      : { outcome: "pass", text: "valid, key from the issuer's WebID" },
    status: statusCode
      ? { outcome: "fail", text: STATUS_TEXT[statusCode] ?? statusCode }
      : { outcome: "pass", text: "not revoked (status list read)" },
    validity: validityCode
      ? { outcome: "fail", text: validityCode === "EXPIRED" ? "expired" : "not yet valid" }
      : { outcome: "pass", text: "in its validity window" },
  };
}

/** The pod-relative path of a URL (`/credentials/assets`), dropping `/pods/<owner>`. */
export function podPath(url: string): string {
  return new URL(url).pathname.replace(/^\/pods\/[^/]+/, "");
}

/** The last path segment of a pod URL. */
export function lastSegment(url: string): string {
  const path = new URL(url).pathname.replace(/\/$/, "");
  return path.slice(path.lastIndexOf("/") + 1);
}

export const isoDay = (date: Date | string | undefined): string =>
  date === undefined ? "—" : (typeof date === "string" ? date : date.toISOString()).slice(0, 10);
