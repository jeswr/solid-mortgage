/**
 * The three branded issuer flows (sm-29; SPEC scene 1 "Fill the vault").
 * Each flow names WHAT it issues (credential kind + pod path + validity
 * window + optional ZK operand anchor) and the PINNED demo-persona claims it
 * signs — claims are NEVER accepted from a request (an issue route signing
 * caller-supplied values would be a signing oracle), so the route body only
 * ever selects a flow id.
 *
 * Claim values are the vc-kit CANONICAL demo inputs (income $8,500/mo, score
 * 742): exactly the values whose GENUINE sparq term encodings were captured
 * for the operand anchors (decision 0012: a bare filter proof is forgeable,
 * so every ZK-provable field ships an issuer-signed anchor). The factories
 * are copied VERBATIM from `@mortgage/vc-kit/seed-tooling`'s demo module —
 * that subpath is node-only (it reaches the sparq native helper) and cannot
 * enter a Next bundle, the same constraint that shaped
 * apps/wallet/lib/pod/seed.ts — and test/flows.test.ts deep-compares them
 * against the canonical factories so they can never drift.
 *
 * Validity windows follow the wallet Mode-1 seed so scene 4 ("Nothing goes
 * stale") is demonstrable without a fake clock: the employment VC is
 * genuinely near-expiry (validFrom −30d / validUntil +14d — decision 0012).
 */
import { MORT, RESOURCE_POD_PATHS } from "@mortgage/data-model";
import type {
  AssetClaims,
  CredentialClaims,
  CredentialKind,
  CreditScoreClaims,
  EmploymentIncomeClaims,
} from "@mortgage/vc-kit";
import type { IssuerFlowId } from "./config";

/** vc-kit canonical demo employment claims (see the module-header provenance). */
export function demoEmploymentClaims(): EmploymentIncomeClaims {
  return {
    employer: { name: "Ridgeline Analytics LLC" },
    jobTitle: "Senior Data Engineer",
    kind: "employment-income-credential",
    monthlyGrossIncomeUsd: 8500,
    startDate: "2021-03-01",
  };
}

/** vc-kit canonical demo asset claims (see the module-header provenance). */
export function demoAssetClaims(): AssetClaims {
  return {
    accounts: [
      {
        accountLast4: "4821",
        amountUsd: 64_000,
        provider: { name: "First Example Bank" },
      },
    ],
    kind: "asset-credential",
  };
}

/** vc-kit canonical demo credit-score claims (see the module-header provenance). */
export function demoCreditScoreClaims(): CreditScoreClaims {
  return {
    creditScoreValue: 742,
    kind: "credit-score-credential",
    totalMonthlyDebtUsd: 1180,
  };
}

/**
 * PROVENANCE: genuine sparq term encodings of `"<value>"^^xsd:integer` from
 * `sparq_zk_compose::build::encode_int_literal` at sparq commit 947480b0,
 * captured programmatically by packages/vc-kit/scripts/capture-fixtures.mjs
 * (fixtures/operand-enc.json + PROVENANCE.json). The same consuming pattern
 * as apps/wallet/lib/pod/seed.ts and apps/lender-boa/test/support.ts (the
 * shared `./testing` hoist is a filed follow-up). NEVER hand-edit; an operand
 * encoding is never fabricated — recapture with the native toolchain instead.
 */
export const CAPTURED_OPERAND_ENC: Readonly<Record<number, string>> = {
  742: "0x23b9c0f1ac8b90f9b1fd5d567d6994644332ac788d4254d76cc9ca025c7543f1",
  8500: "0x205f3625597a2bc55792ed23304c85f878e5caa3d3d1decdd94fb477ef6ff6bc",
};

/** Borrower-only anchor paths (the wallet Mode-1 seed's pod layout). */
export const ANCHOR_POD_PATHS = {
  credit: "/mortgage/zk/anchor-score",
  employment: "/mortgage/zk/anchor-income",
} as const;

/** The ZK operand anchor a flow issues beside its credential (decision 0012). */
export interface FlowAnchorSpec {
  /** The hidden field IRI (a decision-0005 ZK budget field). */
  readonly field: string;
  /** Pod-root-relative path the anchor credential lands at. */
  readonly path: string;
}

export interface IssuerFlowDefinition {
  readonly id: IssuerFlowId;
  /** Role-first display label (R1 framing — never "by {Org}"). */
  readonly label: string;
  /** The modelled organisation (matches `orgThemes` `modelledOn`). */
  readonly modelledOn: string;
  /** The journey role (matches `orgThemes` `role`). */
  readonly role: string;
  /** The `@mortgage/ui` org-theme id for this flow's branded surfaces. */
  readonly themeId: "verifications-employment" | "verifications-assets" | "verifications-credit";
  readonly kind: CredentialKind;
  /** Pod-root-relative credential path (the sm-20 pod layout). */
  readonly credentialPath: string;
  /** Validity window offsets from the issue instant, in days. */
  readonly validFromDays: number;
  readonly validUntilDays: number;
  /** Replacement-window length for a scene-4 re-issue, in days from `now`. */
  readonly reissueDays: number;
  /** The PINNED demo claims this flow signs (never request-supplied). */
  readonly claims: () => CredentialClaims;
  /** The operand anchor issued beside the credential, when the kind has one. */
  readonly anchor?: FlowAnchorSpec;
}

/**
 * Scene-1 flow table. The asset flow issues NO anchor: decision 0005 scopes
 * ZK statements to income and credit fields only (no proofs over balances).
 */
export const ISSUER_FLOWS: Readonly<Record<IssuerFlowId, IssuerFlowDefinition>> = {
  assets: {
    anchor: undefined,
    claims: demoAssetClaims,
    credentialPath: RESOURCE_POD_PATHS["asset-credential"],
    id: "assets",
    kind: "asset-credential",
    label: "Asset verification — modelled on Mastercard Finicity",
    modelledOn: "Mastercard Finicity",
    reissueDays: 30,
    role: "financial account data aggregator",
    themeId: "verifications-assets",
    validFromDays: -14,
    validUntilDays: 16,
  },
  credit: {
    anchor: { field: MORT.creditScoreValue, path: ANCHOR_POD_PATHS.credit },
    claims: demoCreditScoreClaims,
    credentialPath: RESOURCE_POD_PATHS["credit-score-credential"],
    id: "credit",
    kind: "credit-score-credential",
    label: "Credit-score verification — modelled on Equifax",
    modelledOn: "Equifax",
    reissueDays: 90,
    role: "credit reporting agency",
    themeId: "verifications-credit",
    validFromDays: -10,
    validUntilDays: 80,
  },
  employment: {
    anchor: { field: MORT.monthlyGrossIncomeUsd, path: ANCHOR_POD_PATHS.employment },
    claims: demoEmploymentClaims,
    credentialPath: RESOURCE_POD_PATHS["employment-income-credential"],
    id: "employment",
    kind: "employment-income-credential",
    label: "Employment + income verification — modelled on The Work Number (Equifax)",
    modelledOn: "The Work Number (Equifax)",
    reissueDays: 14,
    role: "employment and income verifier",
    themeId: "verifications-employment",
    validFromDays: -30,
    validUntilDays: 14,
  },
};

/**
 * The pinned claim value a flow's anchor attests — read off the SAME typed
 * claims object the issuance gate signs (fail-closed: an anchor on a flow
 * with no anchorable claim throws before anything reaches a signer).
 */
export function anchoredClaimValue(flow: IssuerFlowDefinition): number {
  const claims = flow.claims();
  switch (claims.kind) {
    case "employment-income-credential":
      return claims.monthlyGrossIncomeUsd;
    case "credit-score-credential":
      return claims.creditScoreValue;
    default:
      throw new Error(`flow ${flow.id} has no anchorable claim`);
  }
}
