/**
 * Copy-ready demo identity (showcase-patterns §1): the scripted borrower persona a
 * presenter or stakeholder can lift values from in seconds.
 *
 * Values are pinned to decision 0005's ZK encodings so every scene-2 statement holds:
 * income is whole USD/month inside the 4-digit budget and ≥ $7,000; the credit score is
 * 3-digit and ≥ 620; monthly debts satisfy the recast DTI bound
 * (debts ≤ floor(0.43 × income)).
 *
 * DEPENDENCY (noted in the sm-35 PR): the canonical persona fixtures land with sm-20
 * (packages/data-model). When that merges, this card must import the fixture values
 * instead of pinning its own — tracked as a follow-up bead.
 */

export interface DemoPersona {
  name: string;
  descriptor: string;
  /** Whole USD per month — decision 0005 4-digit budget, ≥ the $7,000 scene-2 threshold. */
  monthlyGrossIncomeUsd: number;
  /** 3-digit — ≥ the 620 scene-2 threshold. */
  creditScore: number;
  /** Whole USD per month — must satisfy debts ≤ floor(0.43 × income). */
  monthlyDebtsUsd: number;
  /** Whole USD — verified asset balance for the Finicity-modelled attestation. */
  verifiedAssetsUsd: number;
  /** Whole USD — the loan amount Alex applies for. */
  requestedLoanUsd: number;
  employer: string;
}

/**
 * Pinned to the values the verification providers issue (apps/verifications/lib/server/flows.ts,
 * the vc-kit canonical demo claims), so the card matches the credentials on screen
 * (astra-review-1 H11).
 */
export const demoPersona: DemoPersona = {
  creditScore: 742,
  descriptor: "First-time homebuyer. Fictional; all data simulated.",
  employer: "Ridgeline Analytics LLC (fictional employer)",
  monthlyDebtsUsd: 1180,
  monthlyGrossIncomeUsd: 8500,
  name: "Alex Rivera",
  requestedLoanUsd: 340000,
  verifiedAssetsUsd: 64000,
};

/** Scene-2 thresholds (decision 0005) — shown beside the values so the proof statement reads itself. */
export const zkThresholds = {
  creditScoreMin: 620,
  dtiRatioMax: 0.43,
  monthlyIncomeMinUsd: 7000,
} as const;
