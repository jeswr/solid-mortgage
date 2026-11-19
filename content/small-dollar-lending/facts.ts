// AUTHORED-BY Claude Opus 5.5
/**
 * The small-dollar lending scenario's fixed facts (flows.md section 4). Maya Torres needs $2,000
 * this week for a car repair. Everything here is fictional: the people, the employer, the
 * accounts, the lenders and the payment service. Ported from jeswr/solid-lending's personas and
 * loan terms, rescaled to a two-payment loan that is repaid inside one 30-day grant.
 */

import { HOLDERS } from "@mortgage/demo-kit/holders";

/** The tour's demo id (`?tour=small-dollar-lending`, `PodEvent.tour.demo`). */
export const DEMO = "small-dollar-lending";

/** The pod at the centre of the story. */
export const MAYA = HOLDERS.maya.id;

/** Simulated days: the application day, the first payment, and the payoff (both payments made). */
export const DAY = Object.freeze({
  apply: 1,
  firstPayment: 15,
  payoff: 29,
});

export const PERSON = Object.freeze({
  address: Object.freeze({
    addressLocality: "Marlow",
    addressRegion: "OH",
    postalCode: "43004",
    streetAddress: "61 Quarry Road, Apt 2B",
  }),
  birthDate: "1994-03-17",
  name: HOLDERS.maya.name,
  short: HOLDERS.maya.short,
  taxIdLast4: "4417",
});

/** The two income streams, both paid through Ledgerly. Their sum is the stated monthly income. */
export const INCOME_STREAMS: readonly {
  readonly name: string;
  readonly monthlyAmountUsd: number;
}[] = Object.freeze([
  Object.freeze({ monthlyAmountUsd: 2380, name: "Brightline Staffing payroll" }),
  Object.freeze({ monthlyAmountUsd: 480, name: "Weekend delivery platform payouts" }),
]);

export const EMPLOYMENT = Object.freeze({
  employerName: "Brightline Staffing",
  jobTitle: "Warehouse team lead",
  monthlyGrossIncomeUsd: INCOME_STREAMS.reduce((sum, stream) => sum + stream.monthlyAmountUsd, 0),
  startDate: "2023-02-06",
});

/** Alder Bank's summary of Maya's checking account over six months. */
export const CASH_FLOW = Object.freeze({
  accountLast4: "3318",
  averageDailyBalanceUsd: 940,
  balanceUsd: 1210.4,
  bankName: "Alder Bank",
  cashFlowScoreValue: 720,
  nsf90Count: 0,
  observationMonths: 6,
});

/** Quillon's view: a thin file. */
export const CREDIT = Object.freeze({
  creditScoreValue: 612,
  keyFactors: Object.freeze([
    "Length of time accounts have been established",
    "Too few accounts currently paid as agreed",
  ]),
  /** The trade lines on file, for the copy. */
  tradeLines: 2,
  totalMonthlyDebtUsd: 140,
});

/** The pre-qualification thresholds (step 6) and the decision cut-offs (steps 8 and 9). */
export const POLICY = Object.freeze({
  /** Both lenders' bureau-only cut-off. */
  bureauMinimumScore: 640,
  maximumReturnedPayments: 0,
  /** Finchly's cash-flow model. */
  minimumCashFlowScore: 660,
  minimumMonthlyIncomeUsd: 2200,
});

/**
 * The loan: $2,000 at 32.9% APR, two payments 14 days apart. The figures follow from the
 * actuarial method at a periodic rate of 32.9% x 14 / 365 (Regulation Z, appendix J).
 */
export const LOAN = Object.freeze({
  amountFinancedUsd: 2000,
  annualPercentageRate: 32.9,
  financeChargeUsd: 37.94,
  loanNumber: "FL-2048",
  numberOfPayments: 2,
  paymentAmountUsd: 1018.97,
  paymentIntervalDays: 14,
  totalOfPaymentsUsd: 2037.94,
});

/** The payout goes to Maya's Alder Bank debit card, named by its last four digits only. */
export const PAYOUT = Object.freeze({
  accountLast4: CASH_FLOW.accountLast4,
  cardIssuer: CASH_FLOW.bankName,
});

/** How long the credentials the issuers sign stay valid, in days. */
export const VALID_DAYS = Object.freeze({
  cashFlow: 60,
  credit: 60,
  identity: 365,
  income: 60,
  repayment: 365,
});

/** "$2,000" or, with cents, "$1,018.97". */
export function usd(amount: number, cents = false): string {
  return `$${amount.toLocaleString("en-US", {
    maximumFractionDigits: cents ? 2 : 0,
    minimumFractionDigits: cents ? 2 : 0,
  })}`;
}
