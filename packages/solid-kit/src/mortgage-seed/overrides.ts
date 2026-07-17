/**
 * sm-65 — the SCRIPTED-PERSONA OVERRIDE layer of the seeder design
 * (docs/research/seeder-design.md §5.1): the ONE source of the pinned demo
 * credential inputs every consumption point seeds — the dev-server harness,
 * the e2e global-setup and the Mode-1 in-browser pod (apps/wallet) all read
 * these values, so the ZK operand encodings, claim values, validity windows
 * and pod paths can never drift between apps again.
 *
 * Value provenance:
 * - Claim values follow the established wallet Mode-1 seed
 *   (apps/wallet/lib/pod/seed.ts): the sm-20 persona's employer/role/assets
 *   with the vc-kit CANONICAL ZK demo values for the two anchored fields
 *   (income $8,500/mo, score 742) — exactly the values whose GENUINE sparq
 *   term encodings were captured ({@link CAPTURED_OPERAND_ENC}).
 * - The employment credential is BACKDATED (validFrom −30d / validUntil
 *   +14d from the caller's `now`) — decision 0012's genuinely-near-expiry
 *   scene-4 credential, no fake clock anywhere.
 *
 * Browser-safe: plain data + `@mortgage/data-model` term IRIs only. The
 * claim interfaces STRUCTURALLY mirror `@mortgage/vc-kit`'s `CredentialClaims`
 * (solid-kit cannot depend on vc-kit — vc-kit's test rig dev-depends on this
 * package, and a package cycle would break the turbo task graph); the
 * root-level integration suite type-checks and issues these specs through
 * the real vc-kit, so a structural drift fails the gate.
 */

import { MORT, type PersonaValues } from "@mortgage/data-model";

/** Pod paths of the five signed credentials (the sm-20 layout). */
export const MORTGAGE_CREDENTIAL_POD_PATHS = {
  income: "/mortgage/credentials/income",
  assets: "/mortgage/credentials/assets",
  credit: "/mortgage/credentials/credit",
  appraisal: "/mortgage/credentials/appraisal",
  title: "/mortgage/credentials/title",
} as const;

/** Borrower-only ZK operand-anchor paths (decision 0012). */
export const MORTGAGE_ANCHOR_POD_PATHS = {
  income: "/mortgage/zk/anchor-income",
  score: "/mortgage/zk/anchor-score",
} as const;

/** Borrower-only ZK witness paths (native dual-sign rail, decision 0012). */
export const MORTGAGE_WITNESS_POD_PATHS = {
  income: "/mortgage/zk/witness-income",
  score: "/mortgage/zk/witness-score",
} as const;

/**
 * PROVENANCE: genuine sparq term encodings of `"<value>"^^xsd:integer` from
 * `sparq_zk_compose::build::encode_int_literal` at sparq commit 947480b0,
 * captured programmatically by packages/vc-kit/scripts/capture-fixtures.mjs
 * (packages/vc-kit/test/fixtures/operand-enc.json + PROVENANCE.json). This is
 * the FULL captured table (the decision-0005 statement operands/bounds plus
 * the hidden demo values); apps previously copied two-entry subsets
 * (apps/wallet, apps/verifications) — this export is the canonical copy.
 * NEVER hand-edit; an operand encoding is never fabricated — recapture with
 * the native toolchain instead (`pnpm --filter @mortgage/vc-kit run
 * capture:fixtures`).
 */
export const CAPTURED_OPERAND_ENC: Readonly<Record<number, string>> = {
  30: "0x132fa587351bf3f12fd3cbed64d5526f28791099d1d40870f94595873c78fa72",
  619: "0x2e9210f8e3a6de858e7adc2884f8d0fc9a8c5984388fd6bbf25115096ff351e2",
  620: "0x09b16305ec3bec27eafb59084b1d9467a9ed4e410350afa4cd19958892bab4db",
  700: "0x05263ee44f48dfe07f3d25739db12b4cd1a9ef2386779bb11db1aab10b43e345",
  742: "0x23b9c0f1ac8b90f9b1fd5d567d6994644332ac788d4254d76cc9ca025c7543f1",
  1180: "0x1b2fdf40ae7e09daa977f4ef78c957a8ad8d9eb6c9f26d226746f97f11416b78",
  6500: "0x0512ecf0649dbd68336fbbf4edb3f9d70b40a7bbf41da0667487bd10205c48ae",
  7000: "0x205e4dd0c2526b48ae2a94bfcdbbe30e19de4e8b85ce29ec0e7b35cba051b053",
  8500: "0x205f3625597a2bc55792ed23304c85f878e5caa3d3d1decdd94fb477ef6ff6bc",
  9999: "0x0ad5c5f2163a0400c5cd2a1a80fb43229689797c2b53ac9f93c6af28930e3c91",
};

/** The two ZK-provable pinned demo values (vc-kit canonical demo inputs). */
export const DEMO_MONTHLY_INCOME_USD = 8500;
export const DEMO_CREDIT_SCORE = 742;

/** The five demo issuer roles (role-first labels; `.example` per sm-20). */
export const MORTGAGE_SEED_ISSUER_ROLES = {
  employment: {
    docPath: "/issuers/employment-verifier",
    statusPath: "/status/employment",
    label: "employment and income verifier",
  },
  bank: {
    docPath: "/issuers/bank",
    statusPath: "/status/assets",
    label: "depository institution",
  },
  bureau: {
    docPath: "/issuers/credit-bureau",
    statusPath: "/status/credit",
    label: "credit bureau",
  },
  appraisal: {
    docPath: "/issuers/appraisal-management",
    statusPath: "/status/appraisal",
    label: "appraisal management company",
  },
  title: {
    docPath: "/issuers/title-company",
    statusPath: "/status/title",
    label: "title company",
  },
} as const;

export type MortgageSeedIssuerRole = keyof typeof MORTGAGE_SEED_ISSUER_ROLES;

/**
 * Deterministic DEMO Schnorr issuer seeds for the native dual-sign rail —
 * the vc-kit seed-tooling canon (`DEMO_ISSUER_SEEDS`, sparq
 * `SecretKey::from_seed`; test/tooling keys, never production).
 */
export const MORTGAGE_SCHNORR_ISSUER_SEEDS: Readonly<
  Partial<Record<MortgageSeedIssuerRole, number>>
> = {
  employment: 4101,
  bureau: 4001,
};

// ── Structural mirrors of @mortgage/vc-kit `CredentialClaims` (see header) ──

export interface SeedOrganizationClaims {
  readonly name: string;
}

export interface SeedPostalAddressClaims {
  readonly streetAddress: string;
  readonly addressLocality: string;
  readonly addressRegion: string;
  readonly postalCode: string;
}

export interface SeedEmploymentIncomeClaims {
  readonly kind: "employment-income-credential";
  readonly employer: SeedOrganizationClaims;
  readonly jobTitle: string;
  readonly startDate: string;
  readonly monthlyGrossIncomeUsd: number;
  readonly evidence?: string;
}

export interface SeedAssetClaims {
  readonly kind: "asset-credential";
  readonly accounts: readonly {
    readonly provider: SeedOrganizationClaims;
    readonly amountUsd: number;
    readonly accountLast4: string;
  }[];
}

export interface SeedCreditScoreClaims {
  readonly kind: "credit-score-credential";
  readonly creditScoreValue: number;
  readonly totalMonthlyDebtUsd: number;
}

export interface SeedAppraisalClaims {
  readonly kind: "appraisal-credential";
  readonly property: {
    readonly address: SeedPostalAddressClaims;
    readonly appraisedValueUsd?: number;
  };
  readonly appraiser: { readonly name: string; readonly licenseId: string };
  readonly reportIssued: string;
}

export interface SeedTitleClearClaims {
  readonly kind: "title-clear-credential";
  readonly property: { readonly address: SeedPostalAddressClaims };
  readonly titleStatus: "clear" | "clouded";
  readonly searchedThrough: string;
  readonly evidence?: string;
}

export type ScriptedCredentialClaims =
  | SeedEmploymentIncomeClaims
  | SeedAssetClaims
  | SeedCreditScoreClaims
  | SeedAppraisalClaims
  | SeedTitleClearClaims;

/** The ZK rail's own status entry (vc-kit seed-tooling `ZkStatusEntry`). */
export interface SeedZkStatusEntry {
  readonly listIri: string;
  readonly index: number;
  readonly version: number;
}

/** One pinned operand anchor beside a scripted credential (decision 0012). */
export interface ScriptedAnchorSeed {
  /** Pod path of the issuer-signed `mort:ZkOperandAnchor` credential. */
  readonly path: string;
  /** Pod path of the borrower-only native dual-sign witness (when minted). */
  readonly witnessPath: string;
  /** The anchored hidden-field IRI (a decision-0005 budget field). */
  readonly field: string;
  /** The pinned hidden value the credential claims. */
  readonly value: number;
  /** The CAPTURED genuine sparq term encoding of {@link value}. */
  readonly operandEnc: string;
  /** Bitstring status index of the anchor VC on its issuer's list. */
  readonly statusIndex: number;
  /** The ZK rail's Schnorr-bound status entry (vc-kit seed-tooling canon). */
  readonly zkStatus: SeedZkStatusEntry;
}

/** One scripted credential of the seeded borrower pod. */
export interface ScriptedCredentialSeed {
  readonly id: keyof typeof MORTGAGE_CREDENTIAL_POD_PATHS;
  /** vc-kit `CredentialKind` token. */
  readonly kind: ScriptedCredentialClaims["kind"];
  readonly path: string;
  readonly issuerRole: MortgageSeedIssuerRole;
  /** Bitstring status index on the issuer's list (standards rail). */
  readonly statusIndex: number;
  readonly validFrom: Date;
  readonly validUntil: Date;
  readonly claims: ScriptedCredentialClaims;
  readonly anchor?: ScriptedAnchorSeed;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysFrom(now: Date, days: number): Date {
  return new Date(now.getTime() + days * DAY_MS);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function capturedEncoding(value: number): string {
  const encoding = CAPTURED_OPERAND_ENC[value];
  if (encoding === undefined) {
    throw new Error(
      `no captured operand encoding for ${value} — recapture with the native toolchain ` +
        "(packages/vc-kit/scripts/capture-fixtures.mjs); encodings are never fabricated",
    );
  }
  return encoding;
}

/**
 * The five scripted credential seeds for one persona, pinned to the demo
 * canon (see the module header). `now` is the caller's clock — validity
 * windows are offsets from it (income −30d/+14d: the scene-4 backdated VC).
 */
export function scriptedCredentialSeeds(
  values: Pick<
    PersonaValues,
    | "employerName"
    | "jobTitle"
    | "employmentStartDate"
    | "totalMonthlyDebtUsd"
    | "bankName"
    | "bankBalanceUsd"
    | "subjectPropertyAddress"
    | "appraisedValueUsd"
    | "appraiserName"
    | "appraiserLicenseId"
  >,
  now: Date,
): readonly ScriptedCredentialSeed[] {
  const window = (validFromDays: number, validUntilDays: number) => ({
    validFrom: daysFrom(now, validFromDays),
    validUntil: daysFrom(now, validUntilDays),
  });
  return [
    {
      id: "income",
      kind: "employment-income-credential",
      path: MORTGAGE_CREDENTIAL_POD_PATHS.income,
      issuerRole: "employment",
      statusIndex: 42,
      // Scene-4 freshness beat (decision 0012): genuinely near-expiry.
      ...window(-30, 14),
      claims: {
        kind: "employment-income-credential",
        employer: { name: values.employerName },
        jobTitle: values.jobTitle,
        startDate: values.employmentStartDate,
        monthlyGrossIncomeUsd: DEMO_MONTHLY_INCOME_USD,
      },
      anchor: {
        path: MORTGAGE_ANCHOR_POD_PATHS.income,
        witnessPath: MORTGAGE_WITNESS_POD_PATHS.income,
        field: MORT.monthlyGrossIncomeUsd,
        value: DEMO_MONTHLY_INCOME_USD,
        operandEnc: capturedEncoding(DEMO_MONTHLY_INCOME_USD),
        statusIndex: 43,
        // vc-kit seed-tooling canon (DEMO_ZK_STATUS.employment).
        zkStatus: { listIri: "https://issuer.example/status/zk-employment", index: 42, version: 1 },
      },
    },
    {
      id: "assets",
      kind: "asset-credential",
      path: MORTGAGE_CREDENTIAL_POD_PATHS.assets,
      issuerRole: "bank",
      statusIndex: 7,
      ...window(-14, 16),
      claims: {
        kind: "asset-credential",
        accounts: [
          {
            provider: { name: values.bankName },
            amountUsd: values.bankBalanceUsd,
            accountLast4: "4821",
          },
        ],
      },
    },
    {
      id: "credit",
      kind: "credit-score-credential",
      path: MORTGAGE_CREDENTIAL_POD_PATHS.credit,
      issuerRole: "bureau",
      statusIndex: 11,
      ...window(-10, 80),
      claims: {
        kind: "credit-score-credential",
        creditScoreValue: DEMO_CREDIT_SCORE,
        totalMonthlyDebtUsd: values.totalMonthlyDebtUsd,
      },
      anchor: {
        path: MORTGAGE_ANCHOR_POD_PATHS.score,
        witnessPath: MORTGAGE_WITNESS_POD_PATHS.score,
        field: MORT.creditScoreValue,
        value: DEMO_CREDIT_SCORE,
        operandEnc: capturedEncoding(DEMO_CREDIT_SCORE),
        statusIndex: 12,
        // vc-kit seed-tooling canon list shape (bureau-owned ZK list).
        zkStatus: { listIri: "https://issuer.example/status/zk-credit", index: 11, version: 1 },
      },
    },
    {
      id: "appraisal",
      kind: "appraisal-credential",
      path: MORTGAGE_CREDENTIAL_POD_PATHS.appraisal,
      issuerRole: "appraisal",
      statusIndex: 5,
      ...window(-7, 177),
      claims: {
        kind: "appraisal-credential",
        property: {
          address: values.subjectPropertyAddress,
          appraisedValueUsd: values.appraisedValueUsd,
        },
        appraiser: { name: values.appraiserName, licenseId: values.appraiserLicenseId },
        reportIssued: isoDate(daysFrom(now, -8)),
      },
    },
    {
      id: "title",
      kind: "title-clear-credential",
      path: MORTGAGE_CREDENTIAL_POD_PATHS.title,
      issuerRole: "title",
      statusIndex: 9,
      ...window(-5, 87),
      claims: {
        kind: "title-clear-credential",
        property: { address: values.subjectPropertyAddress },
        titleStatus: "clear",
        searchedThrough: isoDate(daysFrom(now, -6)),
      },
    },
  ];
}

/** Validity window of every seeded operand anchor (the wallet convention). */
export function anchorValidity(now: Date): { validFrom: Date; validUntil: Date } {
  return { validFrom: daysFrom(now, -1), validUntil: daysFrom(now, 14) };
}
