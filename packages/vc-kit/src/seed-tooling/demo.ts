/**
 * sm-26 - the CANONICAL demo-persona seed inputs, shared by the test suite
 * and `scripts/capture-fixtures.mjs` so fixtures and tests can never drift
 * (one source of truth; extract-repeated-logic rule). Values respect the
 * decision-0005 digit budgets (M5) and the sm-20 persona fixtures. No real
 * PII - demo personas only.
 */

import type { AssetClaims, CreditScoreClaims, EmploymentIncomeClaims } from "../claims.js";
import type { ZkStatusEntry } from "./dual-sign.js";

export const DAY_MS = 24 * 60 * 60 * 1000;
/** The suite's fixed "wall clock" - explicit everywhere, never ambient. */
export const DEMO_NOW = new Date("2026-07-15T12:00:00Z");
/** Scene-4 backdated window (decision 0012): -30d .. +14d around now. */
export const DEMO_BACKDATED_VALIDITY = {
  validFrom: new Date(DEMO_NOW.getTime() - 30 * DAY_MS),
  validUntil: new Date(DEMO_NOW.getTime() + 14 * DAY_MS),
};

export const DEMO_ISSUER = "https://issuer.example/org";
export const DEMO_SUBJECT = "https://alex.example/profile/card#me";
export const DEMO_INCOME_CREDENTIAL_ID = "https://alex.example/credentials/income";
export const DEMO_ASSET_CREDENTIAL_ID = "https://alex.example/credentials/asset";
export const DEMO_SCORE_CREDENTIAL_ID = "https://alex.example/credentials/credit-score";
export const DEMO_STATUS_LIST_URL = "https://issuer.example/status/employment";

/**
 * Deterministic DEMO Schnorr issuer seeds (sparq `SecretKey::from_seed` -
 * test/tooling keys, never production). The array order IS the hidden-issuer
 * key-set leaf order; `hidden_issuer_d4` admits <= 16 keys.
 */
export const DEMO_ISSUER_SEEDS = Object.freeze({
  creditBureau: 4001,
  employer: 4101,
  bank: 4202,
  lender: 4303,
});
export const DEMO_ISSUER_KEY_SET: readonly number[] = Object.freeze([
  DEMO_ISSUER_SEEDS.creditBureau,
  DEMO_ISSUER_SEEDS.employer,
  DEMO_ISSUER_SEEDS.bank,
  DEMO_ISSUER_SEEDS.lender,
]);

/** The ZK rail's own Schnorr-bound status entries (decision 0012). */
export const DEMO_ZK_STATUS = Object.freeze({
  employment: {
    listIri: "https://issuer.example/status/zk-employment",
    index: 42,
    version: 1,
  } satisfies ZkStatusEntry,
  asset: {
    listIri: "https://bank.example/status/zk-asset",
    index: 7,
    version: 1,
  } satisfies ZkStatusEntry,
});
/** Snapshot shape for revoke_unset_d10 fixtures: 1024 bits, two revoked decoys. */
export const DEMO_ZK_STATUS_LIST_SIZE = 1024;
export const DEMO_ZK_REVOKED_DECOYS: readonly number[] = Object.freeze([3, 999]);

export function demoEmploymentClaims(
  overrides: Partial<EmploymentIncomeClaims> = {},
): EmploymentIncomeClaims {
  return {
    kind: "employment-income-credential",
    employer: { name: "Ridgeline Analytics LLC" },
    jobTitle: "Senior Data Engineer",
    startDate: "2021-03-01",
    monthlyGrossIncomeUsd: 8500,
    ...overrides,
  };
}

export function demoAssetClaims(): AssetClaims {
  return {
    kind: "asset-credential",
    accounts: [
      {
        provider: { name: "First Example Bank" },
        amountUsd: 64_000,
        accountLast4: "4821",
      },
    ],
  };
}

export function demoCreditScoreClaims(
  overrides: Partial<CreditScoreClaims> = {},
): CreditScoreClaims {
  return {
    kind: "credit-score-credential",
    creditScoreValue: 742,
    totalMonthlyDebtUsd: 1180,
    ...overrides,
  };
}

/**
 * Every integer whose sparq term encoding the fixture set captures: the
 * decision-0005 statement operands/bounds the zk tests exercise, the hidden
 * demo values (income 8500, score 742, debt 1180), and 30 (the sparq
 * car-hire age-gate cross-check vector).
 */
export const DEMO_OPERAND_VALUES: readonly number[] = Object.freeze([
  30, 619, 620, 700, 742, 1180, 6500, 7000, 8500, 9999,
]);
