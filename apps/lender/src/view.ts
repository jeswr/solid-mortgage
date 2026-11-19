// AUTHORED-BY Claude Opus 5.5
/**
 * Pure view logic for Juniper's borrower portal: formatting, the six-item checklist, the
 * Social Security number check and the TRID date rows of each disclosure. No pod access here;
 * the screens pass in what they read.
 */
import { ORGS } from "@mortgage/content/orgs";
import {
  businessDaysBetween,
  closingDisclosureDeadline,
  type DemoCalendar,
  earliestConsummationAfterClosingDisclosure,
  earliestConsummationAfterLoanEstimate,
  isoDate,
  loanEstimateDeadline,
} from "@mortgage/demo-kit/calendar";
import { ORG_SLUGS, type OrgRecord } from "@mortgage/demo-kit/registry";

const USD = new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" });
const USD_WHOLE = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

/** "$340,000" for whole amounts, "$2,149.03" otherwise. */
export function usd(amount: number): string {
  return Number.isInteger(amount) ? USD_WHOLE.format(amount) : USD.format(amount);
}

const DATE = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  weekday: "short",
  year: "numeric",
});

/** "Thu, Aug 6, 2026" for a `YYYY-MM-DD` date or a `Date` (read in UTC). */
export function longDate(value: Date | string): string {
  return DATE.format(new Date(`${isoDate(value)}T00:00:00Z`));
}

/** A date with its place on the demo calendar: "Thu, Aug 6, 2026 (Day 4 · Thu)". */
export function demoDate(calendar: DemoCalendar, value: Date | string): string {
  const day = calendar.dayOf(value);
  return day >= 1 ? `${longDate(value)} (Day ${day})` : longDate(value);
}

/** The organisation whose WebID this is (`…/pods/<owner>/profile/card#me`), if any. */
export function organisationOf(webid: string): OrgRecord | undefined {
  let owner: string | undefined;
  try {
    owner = /^\/pods\/([^/]+)\/profile\/card$/.exec(new URL(webid).pathname)?.[1];
  } catch {
    return undefined;
  }
  if (owner === undefined) return undefined;
  const slug = ORG_SLUGS.find((candidate) => ORGS[candidate].actsAs === owner);
  return slug === undefined ? undefined : ORGS[slug];
}

/** The display name of the organisation behind a WebID, or the WebID itself. */
export function issuerName(webid: string): string {
  return organisationOf(webid)?.organisation ?? webid;
}

// --- Social Security number -------------------------------------------------------------------

export interface SsnCheck {
  readonly ok: boolean;
  readonly message: string;
}

/**
 * The number is typed into the form and never stored. Juniper checks its format and that its
 * last four digits match the identity credential in the pod.
 */
export function checkSsn(input: string, last4: string | undefined): SsnCheck {
  const digits = input.replace(/[\s-]/g, "");
  if (digits === "") return { message: "Enter your Social Security number.", ok: false };
  if (!/^\d{9}$/.test(digits)) return { message: "Use nine digits, as 123-45-6789.", ok: false };
  if (last4 === undefined)
    return { message: "Waiting for the identity credential to compare with.", ok: false };
  if (digits.slice(5) !== last4)
    return {
      message: "The last four digits do not match the identity credential in your pod.",
      ok: false,
    };
  return {
    message: "Last four digits match your identity credential. The number is not stored.",
    ok: true,
  };
}

/**
 * The demo fills in a number for the visitor: the 900 area is never issued as a Social Security
 * number, so it cannot be anyone's. Its last four digits come from the pod.
 */
export function demoSsn(last4: string): string {
  return `900-00-${last4}`;
}

// --- The six items (12 CFR 1026.2(a)(3)(ii)) ---------------------------------------------------

export interface SixItemInputs {
  readonly name?: string;
  readonly monthlyIncomeUsd?: number;
  readonly ssnOk: boolean;
  readonly propertyAddress?: string;
  readonly estimatedValueUsd?: number;
  readonly loanAmountUsd?: number;
}

export interface ChecklistItem {
  readonly item: string;
  readonly source: string;
  readonly done: boolean;
}

/** `items` is SIX_ITEMS from the journey (its order and wording); `done` comes from the form. */
export function sixItemChecklist(
  items: readonly { readonly item: string; readonly source: string }[],
  inputs: SixItemInputs,
): ChecklistItem[] {
  const done: Record<string, boolean> = {
    "Estimated value of the property": (inputs.estimatedValueUsd ?? 0) > 0,
    Income: (inputs.monthlyIncomeUsd ?? 0) > 0,
    "Loan amount sought": (inputs.loanAmountUsd ?? 0) > 0,
    Name: (inputs.name ?? "").trim() !== "",
    "Property address": (inputs.propertyAddress ?? "").trim() !== "",
    "Social Security number": inputs.ssnOk,
  };
  return items.map((entry) => ({ ...entry, done: done[entry.item] ?? false }));
}

// --- Disclosure dates ----------------------------------------------------------------------------

export interface DateRow {
  readonly label: string;
  readonly value: string;
  readonly note?: string;
}

export interface LoanEstimateDates {
  readonly applicationDate: Date;
  readonly issued: Date;
  readonly expires: Date;
  readonly intentToProceedDate?: Date | undefined;
}

/** The TRID clock of a Loan Estimate as rows for the screen. */
export function loanEstimateRows(calendar: DemoCalendar, le: LoanEstimateDates): DateRow[] {
  const applied = isoDate(le.applicationDate);
  const delivered = isoDate(le.issued);
  const deadline = loanEstimateDeadline(applied);
  const businessDay = businessDaysBetween(applied, delivered, "general");
  const rows: DateRow[] = [
    {
      label: "Application date",
      note: "All six items received",
      value: demoDate(calendar, applied),
    },
    {
      label: "Delivered to your pod",
      note:
        delivered <= deadline
          ? `Business day ${businessDay} of 3: on time`
          : `Business day ${businessDay}: later than the 3-business-day limit`,
      value: demoDate(calendar, delivered),
    },
    {
      label: "Latest delivery date",
      note: "3 business days after the application",
      value: demoDate(calendar, deadline),
    },
    {
      label: "Earliest closing",
      note: "7 business days after delivery",
      value: demoDate(calendar, earliestConsummationAfterLoanEstimate(delivered)),
    },
    {
      label: "Say you intend to proceed by",
      note: "After this the estimate may be revised",
      value: demoDate(calendar, le.expires),
    },
  ];
  if (le.intentToProceedDate !== undefined) {
    rows.push({
      label: "You said you intend to proceed",
      value: demoDate(calendar, le.intentToProceedDate),
    });
  }
  return rows;
}

export interface ClosingDisclosureDates {
  readonly issued: Date;
  readonly closingDate: Date;
  readonly receivedDate?: Date | undefined;
}

/** The TRID clock of a Closing Disclosure as rows for the screen. */
export function closingDisclosureRows(
  calendar: DemoCalendar,
  cd: ClosingDisclosureDates,
): DateRow[] {
  const closing = isoDate(cd.closingDate);
  const mustReceiveBy = closingDisclosureDeadline(closing);
  const rows: DateRow[] = [
    { label: "Delivered to your pod", value: demoDate(calendar, cd.issued) },
    {
      label: "Must be received by",
      note: "3 business days before closing, counting every day but Sundays and federal holidays",
      value: demoDate(calendar, mustReceiveBy),
    },
    { label: "Closing date", value: demoDate(calendar, closing) },
  ];
  if (cd.receivedDate !== undefined) {
    const received = isoDate(cd.receivedDate);
    const earliest = earliestConsummationAfterClosingDisclosure(received);
    rows.splice(1, 0, {
      label: "You confirmed receipt",
      note:
        received <= mustReceiveBy
          ? "In time for the closing date"
          : "Too late for the closing date",
      value: demoDate(calendar, received),
    });
    rows.push({
      label: "Earliest closing after receipt",
      note: closing >= earliest ? "Closing date respects the waiting period" : "Closing must move",
      value: demoDate(calendar, earliest),
    });
  }
  return rows;
}

/** The loan terms both disclosures repeat, for a side-by-side comparison. */
export interface LoanTerms {
  readonly principalUsd: number;
  readonly interestRatePercent: number;
  readonly aprPercent: number;
  readonly loanTermMonths: number;
  readonly monthlyPrincipalAndInterestUsd: number;
  readonly estimatedTotalMonthlyPaymentUsd: number;
  readonly closingCostsUsd: number;
  readonly cashToCloseUsd: number;
}

export interface TermRow {
  readonly label: string;
  readonly estimate: string;
  readonly final?: string;
  readonly changed: boolean;
}

const TERM_LABELS: readonly [keyof LoanTerms, string, (value: number) => string][] = [
  ["principalUsd", "Loan amount", usd],
  ["interestRatePercent", "Interest rate", (value) => `${value}%`],
  ["aprPercent", "Annual percentage rate (APR)", (value) => `${value}%`],
  ["loanTermMonths", "Loan term", (value) => `${value / 12} years`],
  ["monthlyPrincipalAndInterestUsd", "Monthly principal and interest", usd],
  ["estimatedTotalMonthlyPaymentUsd", "Estimated total monthly payment", usd],
  ["closingCostsUsd", "Closing costs", usd],
  ["cashToCloseUsd", "Cash to close", usd],
];

export function termRows(estimate: LoanTerms, final?: LoanTerms): TermRow[] {
  return TERM_LABELS.map(([key, label, format]) => ({
    changed: final !== undefined && final[key] !== estimate[key],
    estimate: format(estimate[key]),
    label,
    ...(final === undefined ? {} : { final: format(final[key]) }),
  }));
}

// --- Milestones ------------------------------------------------------------------------------------

export interface LoanFileState {
  readonly applied: boolean;
  readonly estimateDelivered: boolean;
  readonly intentToProceed: boolean;
  readonly appraisalOrdered: boolean;
  readonly titleOrdered: boolean;
  readonly insured: boolean;
  readonly clearToClose: boolean;
  readonly closingDisclosureReceived: boolean;
  readonly closed: boolean;
}

export interface Milestone {
  readonly label: string;
  readonly done: boolean;
  /** Present while the milestone is waiting on the borrower. */
  readonly yourMove?: string;
}

export function milestones(state: LoanFileState): Milestone[] {
  return [
    {
      done: state.applied,
      label: "Application submitted",
      ...(state.applied ? {} : { yourMove: "Apply with your pod" }),
    },
    {
      done: state.estimateDelivered && state.intentToProceed,
      label: "Loan Estimate and intent to proceed",
      ...(state.estimateDelivered && !state.intentToProceed
        ? { yourMove: "Tell us you intend to proceed" }
        : {}),
    },
    { done: state.appraisalOrdered && state.titleOrdered, label: "Appraisal and title ordered" },
    { done: state.insured, label: "Homeowner's insurance on file" },
    { done: state.clearToClose, label: "Clear to close" },
    {
      done: state.closingDisclosureReceived,
      label: "Closing Disclosure received",
      ...(state.clearToClose && !state.closingDisclosureReceived
        ? { yourMove: "Confirm you received the Closing Disclosure" }
        : {}),
    },
    { done: state.closed, label: "Closed" },
  ];
}
