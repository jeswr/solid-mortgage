/**
 * The application assistant's scripted fallback (used when no language model
 * is available): a few keyword rules over the visitor's free text. Client-safe
 * and pure, so the rules are unit-tested.
 *
 * Submission is never inferred from text: it needs the explicit "Submit
 * application" control (astra-review-2 finding 7), so a refusal such as
 * "Don't submit" can never submit.
 */

export type IntentPhase =
  | "consent"
  | "working"
  | "ask-rent"
  | "review"
  | "submitting"
  | "done"
  | "manual";

export interface ScriptedIntent {
  readonly action: string;
  readonly rent?: number;
}

export function parseAmount(text: string): number | undefined {
  const amount = Number.parseFloat(text.replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) && amount > 0 && amount < 100_000 ? Math.round(amount) : undefined;
}

/** The rent-receipt source, in the displayed terms and the older inbox terms. */
const RECEIPTS = "(rent receipts?|receipts?|rent|email|e-mail|inbox|mail)";
const NEGATION = "(no|not|don't|dont|do not|without|skip|leave out|exclude|except)";

const NEGATED_RECEIPTS = new RegExp(`\\b${NEGATION}\\b.{0,24}\\b${RECEIPTS}\\b`);
const RECEIPTS_ONLY_POD = /\bpod only\b|\bonly (the |my )?pod\b|\bjust (the |my )?pod\b/;
const NEGATED_POD = new RegExp(`\\b${NEGATION}\\b.{0,24}\\bpod\\b`);
const REFUSAL = /\b(no|nope|don't|dont|do not|not|never|stop|cancel|manual|myself|form)\b/;
const AGREEMENT = /\b(yes|yeah|sure|ok|okay|allow|go ahead|fine|please)\b/;
/** An explicit request to include the optional receipts (or every source). */
const INCLUDES_RECEIPTS = new RegExp(`\\b(both|all|everything|${RECEIPTS.slice(1, -1)})\\b`);

export function scriptedAction(phase: IntentPhase, text: string): ScriptedIntent {
  const lower = text.toLowerCase().replace(/[’‘]/g, "'");
  if (phase === "consent") {
    if (NEGATED_POD.test(lower)) return { action: "decline_manual" };
    if (NEGATED_RECEIPTS.test(lower) || RECEIPTS_ONLY_POD.test(lower)) {
      return { action: "allow_pod_only" };
    }
    if (REFUSAL.test(lower)) return { action: "decline_manual" };
    // A plain "yes" agrees to the sources currently ticked; the optional
    // receipts are added only when the visitor names them.
    if (AGREEMENT.test(lower)) {
      return { action: INCLUDES_RECEIPTS.test(lower) ? "allow_all" : "allow_selected" };
    }
  }
  if (phase === "ask-rent") {
    const rent = parseAmount(text);
    if (rent !== undefined) return { action: "provide_rent", rent };
    if (REFUSAL.test(lower)) return { action: "decline_manual" };
  }
  if (phase === "review") {
    const rent = /rent/.test(lower) ? parseAmount(text) : undefined;
    if (rent !== undefined) return { action: "change_rent", rent };
    if (/\b(form|review|edit|myself|manual)\b/.test(lower)) return { action: "open_form" };
    // No "submit" here: only the explicit control submits.
  }
  return { action: "answer_only" };
}
