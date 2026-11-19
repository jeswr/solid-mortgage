// AUTHORED-BY Claude Opus 5.5
/**
 * The facts of the small business loan demo (flows.md section 6). Everyone here is fictional:
 * Northwind Logistics LLC (demo 3's business, run by Jordan Blake), Alder Bank (its bank), the
 * state's Department of Revenue (State Online Services) and Brackenridge Bank (the lender).
 *
 * The story starts after demo 3: Northwind already holds the register's identity, officer and
 * ownership credentials. `prepare.ts` puts them there when a visitor starts here cold.
 */

import type { CovenantInit, TurnoverBand } from "@mortgage/data-model";
import { DAY as KYB_DAY } from "../business-kyb/facts.js";

/** The tour's demo id (`?tour=small-business-loan`, `PodEvent.tour.demo`). */
export const DEMO = "small-business-loan";

/** The holder: Northwind's pod, operated in the wallet by Jordan Blake. */
export const HOLDER = "northwind" as const;

/** The days between the loan's decision and its first quarterly covenant test (at least P3M). */
export const QUARTER_DAYS = 92;

/** Simulated days, after the business KYB story on the same calendar. */
export const DAY = Object.freeze({
  /** Demo 3's register day: when the reused credentials were issued. */
  register: KYB_DAY.register,
  cashFlow: KYB_DAY.sale + 10,
  tax: KYB_DAY.sale + 11,
  apply: KYB_DAY.sale + 13,
  decision: KYB_DAY.sale + 14,
  quarter: KYB_DAY.sale + 14 + QUARTER_DAYS,
  repaid: KYB_DAY.sale + 14 + QUARTER_DAYS + 21,
});

/** Where things live in Northwind's pod. */
export const PATHS = Object.freeze({
  cashFlow: "finance/cash-flow",
  credentials: "credentials/",
  decision: "loans/brackenridge/decision",
  finance: "finance/",
  identity: "credentials/org-identity",
  inbox: "inbox/",
  loans: "loans/",
  notice: "loans/brackenridge/notice-of-action",
  ownership: "credentials/beneficial-ownership",
  tax: "credentials/tax-compliance",
  terms: "loans/brackenridge/terms",
  thisLoan: "loans/brackenridge/",
});

/** Where Brackenridge keeps its own credit file (its pod, not Northwind's). */
export const LENDER_PATHS = Object.freeze({
  assessment: "credit/northwind/assessment",
  covenantTest: (quarter: number) => `credit/northwind/covenant-test-q${quarter}`,
  credit: "credit/",
  file: "credit/northwind/",
});

/** Northwind's operating account at Alder Bank (display-safe last four). */
export const ACCOUNT_LAST4 = "2210";

/** What the Department of Revenue attests. */
export const TAX = Object.freeze({
  /** The last four digits of Northwind's (fictional) employer identification number. */
  taxIdLast4: "4417",
  turnoverBand: "500k-1m" as TurnoverBand,
  /** How long the tax compliance credential is valid. */
  validDays: 180,
});

/** The loan Northwind applies for. */
export const LOAN = Object.freeze({
  loanNumber: "BRK-EQ-0417",
  name: "Equipment term loan",
  principalUsd: 150_000,
  /** The note rate in percent. */
  interestRate: 8.25,
  termMonths: 60,
  purpose: "Two refrigerated box trucks",
});

/** The covenants the loan carries, tested every quarter while it is open. */
export const COVENANTS: readonly CovenantInit[] = Object.freeze([
  { metric: "dscr", name: "Debt service coverage of at least 1.25x", threshold: 1.25 },
  {
    metric: "average-balance",
    name: "Average monthly balance of at least $40,000",
    threshold: 40_000,
  },
]);

/** The monthly payment of a fully amortising loan, to the cent. */
export function monthlyPayment(principalUsd: number, ratePercent: number, months: number): number {
  const rate = ratePercent / 100 / 12;
  const payment =
    rate === 0 ? principalUsd / months : (principalUsd * rate) / (1 - (1 + rate) ** -months);
  return Math.round(payment * 100) / 100;
}

export const LOAN_PAYMENT = monthlyPayment(LOAN.principalUsd, LOAN.interestRate, LOAN.termMonths);

export const usd = (value: number) =>
  value.toLocaleString("en-US", { currency: "USD", maximumFractionDigits: 0, style: "currency" });
