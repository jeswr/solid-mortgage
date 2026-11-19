import { MORT } from "@mortgage/data-model";
import type { TierAStatement } from "@mortgage/vc-kit";

export const PREQUAL_STATEMENTS = {
  income: { field: MORT.monthlyGrossIncomeUsd, op: "ge", bound: 7000 },
  score: { field: MORT.creditScoreValue, op: "ge", bound: 620 },
} as const satisfies Record<string, TierAStatement>;

export type StatementId = keyof typeof PREQUAL_STATEMENTS;
export const STATEMENT_IDS = Object.keys(PREQUAL_STATEMENTS) as readonly StatementId[];

/** The competing scene-2 quote; every UI rendering uses IllustrativeFigure. */
export const ILLUSTRATIVE_RATE_QUOTE = {
  simulated: true,
  illustrative: true,
  notAnOffer: true,
  product: "30-year fixed (concept demo)",
  interestRatePercent: 6.0,
  aprPercent: 6.19,
  disclaimer: "Illustrative figure, not an offer of credit.",
} as const;
