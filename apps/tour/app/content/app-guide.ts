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
    purpose: "See Alex's pod and control who can read it.",
    pages: [
      { path: "/wallet", label: "Home", tryThis: "See Alex's profile, read from the pod." },
      {
        path: "/wallet/credentials",
        label: "Credentials",
        tryThis: "Check each credential's issuer, signature and dates.",
      },
      {
        path: "/wallet/prequal",
        label: "Prequalify",
        tryThis: "Send threshold proofs to two lenders.",
      },
      {
        path: "/wallet/grants",
        label: "Access permissions",
        tryThis: "Grant or revoke an organisation's access.",
      },
      {
        path: "/wallet/ledger",
        label: "Consent receipts",
        tryThis: "Review each access change.",
      },
      {
        path: "/wallet/assistant",
        label: "Assistant",
        tryThis: "Compare two illustrative rate quotes.",
      },
    ],
  },
  verifications: {
    youAre: "a verification provider",
    purpose: "Issue simulated employment, asset and credit-score credentials into Alex's pod.",
    pages: [
      {
        path: "/verifications/employment",
        label: "Employment and income",
        tryThis: "Issue a replacement credential.",
      },
      {
        path: "/verifications/assets",
        label: "Assets",
        tryThis: "Save the asset credential.",
      },
      {
        path: "/verifications/credit",
        label: "Credit score",
        tryThis: "Check the credit-score credential's status.",
      },
    ],
  },
  "lender-boa": {
    youAre: "the lender",
    purpose: "Prefill Alex's application from the pod and track the loan to closing.",
    pages: [
      {
        path: "/lender-boa/prequal",
        label: "Prequalification",
        tryThis: "Check a zero-knowledge proof.",
      },
      {
        path: "/lender-boa/assistant",
        label: "Apply with an assistant",
        tryThis: "Prepare the application from selected sources.",
      },
      {
        path: "/lender-boa/application",
        label: "Apply",
        tryThis: "Review and submit the prefilled application.",
      },
      {
        path: "/lender-boa/pipeline",
        label: "Loan pipeline",
        tryThis: "Review conditions and mark clear to close.",
      },
      {
        path: "/lender-boa/freshness",
        label: "Re-verification",
        tryThis: "Check the employment credential's validity.",
      },
    ],
  },
  "lender-53": {
    youAre: "the second lender",
    purpose: "Check prequalification proofs without seeing income or credit score.",
    pages: [
      {
        path: "/lender-53",
        label: "Prequalification criteria",
        tryThis: "See what the lender receives.",
      },
    ],
  },
  gse: {
    youAre: "the automated underwriting service",
    purpose: "Check the loan file and return findings. The lender's underwriter decides.",
    pages: [
      {
        path: "/gse/underwriting",
        label: "Run AUS",
        tryThis: "Run the AUS and read each finding.",
      },
    ],
  },
  property: {
    youAre: "the appraisal and title providers",
    purpose: "Issue the appraisal and title search records for the property.",
    pages: [
      { path: "/property", label: "Overview", tryThis: "See both records." },
      {
        path: "/property/appraisal",
        label: "Appraisal",
        tryThis: "Review the appraisal.",
      },
      { path: "/property/title", label: "Title", tryThis: "Review the title search result." },
    ],
  },
  closing: {
    youAre: "the eClosing platform and the new servicer",
    purpose: "Sign the closing documents, then change who can read the closing record.",
    pages: [
      {
        path: "/closing",
        label: "Closing",
        tryThis: "eSign, grant servicer access, then revoke the lender's access.",
      },
    ],
  },
};
