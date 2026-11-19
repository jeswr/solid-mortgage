// AUTHORED-BY Claude Opus 5.5
/**
 * Pure view logic for the Loan Desk: which tab belongs to which role, what the loan file's
 * state allows, the pipeline milestones and the employment freshness rule. No pod access here;
 * the screens pass in what they read.
 */
import { businessDaysBetween, type IsoDate } from "@mortgage/demo-kit/calendar";
import type { Persona } from "@mortgage/demo-kit/registry";

export const LOAN_NUMBER = "JHL-1001";

export type Role = "loan officer" | "processor" | "underwriter" | "closer" | "post-closing";

export const ROLES: readonly Role[] = [
  "loan officer",
  "processor",
  "underwriter",
  "closer",
  "post-closing",
];

export interface TabSpec {
  /** URL segment under /loans/JHL-1001/. */
  id: string;
  label: string;
  /** Whose job the actions on this tab are. */
  role: Role;
}

/** The loan file tabs (design.md §b.3), in order. */
export const TABS: readonly TabSpec[] = [
  { id: "summary", label: "Summary", role: "loan officer" },
  { id: "1003", label: "1003", role: "loan officer" },
  { id: "credit", label: "Credit", role: "loan officer" },
  { id: "aus", label: "AUS", role: "loan officer" },
  { id: "verifications", label: "Verifications", role: "processor" },
  { id: "appraisal", label: "Appraisal", role: "processor" },
  { id: "title", label: "Title", role: "processor" },
  { id: "insurance", label: "Insurance", role: "processor" },
  { id: "conditions", label: "Conditions", role: "underwriter" },
  { id: "disclosures", label: "Disclosures", role: "loan officer" },
  { id: "closing", label: "Closing", role: "closer" },
  { id: "post-closing", label: "Post-closing", role: "post-closing" },
];

export function tabById(id: string | undefined): TabSpec | undefined {
  return TABS.find((tab) => tab.id === id);
}

/** The staff member shown for a role: the registry's persona, then its alternates. */
export function personaFor(
  role: Role,
  persona: Persona | null,
  alternates: readonly Persona[] = [],
): Persona | undefined {
  return [persona, ...alternates].find((candidate) => candidate?.role === role) ?? undefined;
}

/** Status of one resource as the screen read it. */
export type ReadState = "ok" | "missing" | "refused" | "error";

/** What the loan file holds, from Juniper's own pod and what partners shared with it. */
export interface FileState {
  application: ReadState;
  creditOrder: "none" | "processing" | "delivered";
  appraisalOrder: "none" | "processing" | "delivered";
  titleOrder: "none" | "processing" | "delivered";
  findings: ReadState;
  decision: ReadState;
  closingRecord: ReadState;
  /** The county's public record of the mortgage. */
  mortgageRecorded: ReadState;
}

export const EMPTY_FILE: FileState = {
  application: "missing",
  appraisalOrder: "none",
  closingRecord: "missing",
  creditOrder: "none",
  decision: "missing",
  findings: "missing",
  mortgageRecorded: "missing",
  titleOrder: "none",
};

export interface Gate {
  allowed: boolean;
  /** Why the action is not available yet (or already done). */
  reason?: string;
}

const ok = (): Gate => ({ allowed: true });
const no = (reason: string): Gate => ({ allowed: false, reason });

export function canPullCredit(file: FileState): Gate {
  if (file.application !== "ok")
    return no("Waiting for the application (submitted in the portal).");
  if (file.creditOrder === "delivered") return no("Credit pulled and underwriting run.");
  return ok();
}

export function canOrderServices(file: FileState): Gate {
  if (file.creditOrder !== "delivered") return no("Pull credit and run underwriting first.");
  if (file.appraisalOrder !== "none") return no("Services ordered.");
  return ok();
}

export function canRefreshAndClear(file: FileState): Gate {
  if (file.appraisalOrder === "none") return no("Order services first.");
  if (file.decision === "ok") return no("Cleared to close.");
  return ok();
}

export function canDeliverLoan(file: FileState): Gate {
  if (file.decision !== "ok") return no("The loan is not cleared to close yet.");
  if (file.mortgageRecorded !== "ok") return no("Waiting for the county to record the mortgage.");
  if (file.closingRecord === "ok") return no("Loan delivered to Castellan.");
  return ok();
}

export function canReadAgain(file: FileState): Gate {
  if (file.application !== "ok") return no("There is no application on file yet.");
  return ok();
}

export type Stage = "done" | "current" | "todo";

/** Pipeline milestones, from what is on file. The first unfinished one is current. */
export function milestones(file: FileState): { label: string; stage: Stage }[] {
  const reached = [
    { done: file.application === "ok", label: "Application" },
    { done: file.creditOrder === "delivered", label: "Credit and AUS" },
    { done: file.appraisalOrder !== "none", label: "Processing" },
    { done: file.decision === "ok", label: "Clear to close" },
    { done: file.mortgageRecorded === "ok", label: "Closed and recorded" },
    { done: file.closingRecord === "ok", label: "Sold" },
  ];
  const current = reached.findIndex((entry) => !entry.done);
  return reached.map((entry, index) => ({
    label: entry.label,
    stage: entry.done ? "done" : index === current ? "current" : "todo",
  }));
}

/** The pipeline's one-word status for the loan. */
export function pipelineStatus(file: FileState): string {
  const current = milestones(file).find((entry) => entry.stage === "current");
  return current === undefined ? "Sold" : current.label;
}

export interface Freshness {
  businessDays: number;
  withinLimit: boolean;
  text: string;
}

/**
 * The verbal-VOE timing rule: employment verified no more than 10 business days before the
 * note date. Freshness is the lender's rule, not the credential's expiry.
 */
export function employmentFreshness(asOf: IsoDate, noteDate: IsoDate, limit = 10): Freshness {
  const businessDays = businessDaysBetween(asOf, noteDate, "general");
  const withinLimit = businessDays >= 0 && businessDays <= limit;
  return {
    businessDays,
    text: withinLimit
      ? `${businessDays} business days before the note date: within the ${limit}-day rule`
      : `${businessDays} business days before the note date: outside the ${limit}-day rule, re-verify`,
    withinLimit,
  };
}

/** A shortened digest for dense tables. */
export function shortDigest(hex: string, size = 12): string {
  return hex.length <= size ? hex : `${hex.slice(0, size)}…`;
}

/** The last path segment of a pod URL, for compact identifiers. */
export function lastSegment(url: string): string {
  const path = new URL(url).pathname.replace(/\/$/, "");
  return path.slice(path.lastIndexOf("/") + 1);
}

/** The pod-relative path of a URL (`/credentials/assets`), dropping `/pods/<owner>`. */
export function podPath(url: string): string {
  return new URL(url).pathname.replace(/^\/pods\/[^/]+/, "");
}

export const usd = (amount: number): string =>
  `$${amount.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;
