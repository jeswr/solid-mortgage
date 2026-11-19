/** Client-safe display formatting (no data-model imports here). */

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatUsd(value: number): string {
  return usd.format(value);
}

export function formatPercent(value: number): string {
  return `${value}%`;
}

/** The Reg Z §1026.19(e)(2)(ii) statement, shown beside every quote or loan-terms summary. */
export const QUOTE_CAUTION =
  "Your actual rate, payment, and costs could be higher. Get an official Loan Estimate before choosing a loan.";
