/**
 * The scene-2 pre-qualification statements this lender advertises (decision
 * 0005: ZK appears ONLY at pre-qualification; both statements are `>=`
 * thresholds over decision-0005 budgeted fields).
 */
import { MORT } from "@mortgage/data-model";
import type { TierAStatement } from "@mortgage/vc-kit";

export const PREQUAL_STATEMENTS = {
  income: {
    field: MORT.monthlyGrossIncomeUsd,
    op: "ge",
    bound: 7000,
  },
  score: {
    field: MORT.creditScoreValue,
    op: "ge",
    bound: 620,
  },
} as const satisfies Record<string, TierAStatement>;

export type StatementId = keyof typeof PREQUAL_STATEMENTS;

export const STATEMENT_IDS = Object.keys(PREQUAL_STATEMENTS) as readonly StatementId[];

export function isStatementId(value: string): value is StatementId {
  return Object.hasOwn(PREQUAL_STATEMENTS, value);
}

/**
 * The illustrative rate quote returned on a fully verified presentation.
 * R5 (decision 0002): every rendered figure derived from this object MUST be
 * wrapped in `IllustrativeFigure`; the payload itself carries the tags too so
 * an API consumer cannot mistake it for an offer.
 */
export const ILLUSTRATIVE_RATE_QUOTE = {
  simulated: true,
  illustrative: true,
  notAnOffer: true,
  product: "30-year fixed (concept demo)",
  interestRatePercent: 6.125,
  aprPercent: 6.31,
  disclaimer: "Illustrative figure, not an offer of credit.",
} as const;
