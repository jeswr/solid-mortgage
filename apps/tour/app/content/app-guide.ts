/**
 * What a visitor can DO in each app when they open it on its own (the `/apps` launcher).
 * Keyed by the service-registry slug, so names and paths still come from `services.ts`.
 */
import type { DemoAppSlug } from "./services";

export interface AppGuide {
  /** Who the visitor is in this app. */
  readonly youAre: string;
  /** One or two sentences: what the app is for. */
  readonly purpose: string;
  /** Pages worth opening, with the thing to try on each. */
  readonly pages: readonly {
    readonly path: string;
    readonly label: string;
    readonly tryThis: string;
  }[];
}

export const appGuides: Partial<Record<DemoAppSlug, AppGuide>> = {
  wallet: {
    youAre: "Alex Rivera, the borrower",
    purpose:
      "Alex's Data Vault: everything in the pod, every credential verified on view, and the controls for who else can read it.",
    pages: [
      { path: "/wallet", label: "Vault home", tryThis: "See the profile read live from the pod." },
      {
        path: "/wallet/assistant",
        label: "Assistant",
        tryThis:
          "Ask your assistant to shop for a rate; it asks for consent before it reads anything.",
      },
      {
        path: "/wallet/credentials",
        label: "Credentials",
        tryThis: "Each signed credential is re-verified every time you open it.",
      },
      {
        path: "/wallet/prequal",
        label: "Zero-knowledge pre-qualification",
        tryThis: "Prove income and credit thresholds to two lenders without revealing the numbers.",
      },
      {
        path: "/wallet/grants",
        label: "Access grants",
        tryThis: "Grant or revoke a party's access and watch the access rules change.",
      },
      {
        path: "/wallet/ledger",
        label: "Consent receipts",
        tryThis: "Every grant and revocation, receipted.",
      },
    ],
  },
  verifications: {
    youAre: "an employment, bank-data or credit verifier",
    purpose:
      "Issuers that sign verification results as credentials and deliver them straight into the borrower's pod.",
    pages: [
      {
        path: "/verifications/employment",
        label: "Employment and income",
        tryThis: "Re-issue the employment credential when it is about to go stale.",
      },
      {
        path: "/verifications/assets",
        label: "Assets",
        tryThis: "Issue the bank assets credential into the pod.",
      },
      {
        path: "/verifications/credit",
        label: "Credit score",
        tryThis: "See the credit credential's status.",
      },
    ],
  },
  "lender-boa": {
    youAre: "the primary mortgage lender",
    purpose:
      "A full origination portal that prefills the application from the borrower's pod and writes its Loan Estimate back.",
    pages: [
      {
        path: "/lender-boa/prequal",
        label: "Pre-qualification",
        tryThis: "How the lender verifies a zero-knowledge proof.",
      },
      {
        path: "/lender-boa/assistant",
        label: "Apply with your assistant",
        tryThis: "Let an assistant fill in and submit the application, with per-source consent.",
      },
      {
        path: "/lender-boa/application",
        label: "Application form",
        tryThis: "Or submit the pod-prefilled form yourself and get a Loan Estimate.",
      },
      {
        path: "/lender-boa/pipeline",
        label: "Loan officer pipeline",
        tryThis: "The lender's side: review files read live from the pod and clear them to close.",
      },
      {
        path: "/lender-boa/freshness",
        label: "Freshness check",
        tryThis: "Check whether the employment verification is still within its window.",
      },
    ],
  },
  "lender-53": {
    youAre: "a competing lender",
    purpose:
      "Gives a rate quote from a zero-knowledge proof, without seeing income or credit score.",
    pages: [
      {
        path: "/lender-53",
        label: "Rate quote",
        tryThis: "See what a proof-only lender receives.",
      },
    ],
  },
  gse: {
    youAre: "the automated underwriting service",
    purpose:
      "Underwrites from the loan file and credentials the borrower granted, checking every signature.",
    pages: [
      {
        path: "/gse/underwriting",
        label: "Underwriting",
        tryThis: "Run automated underwriting and read each finding.",
      },
    ],
  },
  property: {
    youAre: "the appraisal and title providers",
    purpose: "Appraisal and title results delivered as reusable credentials in the borrower's pod.",
    pages: [
      { path: "/property", label: "Overview", tryThis: "The property file at a glance." },
      {
        path: "/property/appraisal",
        label: "Appraisal",
        tryThis: "The appraised value credential.",
      },
      { path: "/property/title", label: "Title", tryThis: "The title-clear credential." },
    ],
  },
  closing: {
    youAre: "the digital closing platform and the incoming servicer",
    purpose:
      "eSigns the closing package into the pod, then moves access from the lender to the servicer, with receipts.",
    pages: [
      {
        path: "/closing",
        label: "Closing",
        tryThis: "eSign, approve the servicer, revoke the lender, then read the receipt ledger.",
      },
    ],
  },
};
