/**
 * The five scene chapters (SPEC §2) as pure data, mirroring the presenter script in
 * docs/sales/master-narrative.md §4. Editorial limits are machine-enforced by
 * test/chapters.test.ts (showcase-patterns §1): word budgets per lead, step and sentence, a
 * "How it works" panel on scenes 1/2/4, and a try-this-live deep link on every step.
 *
 * Lives under `app/` so `scripts/check-insignia.mjs` scans this copy (R2/R3).
 */
import type { DemoAppSlug } from "./services";

/**
 * Hard editorial budgets (docs/glossary.md §1; .review/astra-review-1.md §3): a lead is one
 * or two plain sentences, a step reads in seconds, and no sentence runs past ~25 words.
 */
export const MAX_LEAD_WORDS = 22;
export const MAX_STEP_WORDS = 28;
export const MAX_SENTENCE_WORDS = 25;

export function countWords(text: string): number {
  return text.split(/\s+/u).filter((word) => word.length > 0).length;
}

/** Split copy into sentences (full stop, question or exclamation mark, then whitespace). */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

export interface TryLive {
  app: DemoAppSlug;
  /** Route inside the app, e.g. "/application" (appended to the app's path). Omit for the app root. */
  path?: string;
  label: string;
}

export interface ChapterStep {
  title: string;
  body: string;
  tryLive: TryLive;
}

export interface Chapter {
  slug: string;
  scene: 1 | 2 | 3 | 4 | 5;
  title: string;
  /** The rule or standard the scene relates to (SPEC §2). */
  anchor: string;
  lead: string;
  steps: ChapterStep[];
  /** Plain-English "How it works" points — required for scenes 1, 2, and 4. */
  underneath?: string[];
}

/** Scenes that must carry the "How it works" panel (the credential and proof scenes). */
export const UNDERNEATH_REQUIRED_SCENES: ReadonlyArray<Chapter["scene"]> = [1, 2, 4];

/*
 * Slugs are kept from the earlier scene names: they are used in URLs, scripts/demo and
 * e2e/. Rename them only together with those (docs/glossary.md §3).
 */
export const chapters: Chapter[] = [
  {
    anchor:
      "Fannie Mae and Freddie Mac accept digital verification reports from approved providers.",
    lead: "Three verification providers save signed credentials in Alex's pod, a personal data store Alex controls. Alex decides who may read them.",
    scene: 1,
    slug: "fill-the-vault",
    steps: [
      {
        body: "The employment verification provider, modelled on The Work Number (Equifax), saves a signed employment and income credential in Alex's pod.",
        title: "Verify employment and income",
        tryLive: {
          app: "verifications",
          label: "Open employment verification",
          path: "/employment",
        },
      },
      {
        body: "The asset verification provider (modelled on Mastercard Finicity) and the credit bureau (modelled on Equifax) add their credentials.",
        title: "Verify assets and credit",
        tryLive: { app: "verifications", label: "Open asset verification", path: "/assets" },
      },
      {
        body: "The Data Vault app shows all three credentials and checks each signature, issuer and validity period.",
        title: "Check the credentials",
        tryLive: { app: "wallet", label: "Open Alex's credentials", path: "/credentials" },
      },
    ],
    title: "Verify income, assets and credit",
    underneath: [
      "Each credential is a W3C Verifiable Credential: a signed report that anyone can check without calling the issuer.",
      "The pod's permission list (Web Access Control) lets each provider write its credential. No one else can read it until Alex grants access.",
      "The income and credit-score credentials are signed twice, so scene 2 can use them in zero-knowledge proofs.",
    ],
  },
  {
    anchor: "Reg B comment 2(f)-3 explains when a prequalification request becomes an application.",
    lead: "Alex checks two lenders' prequalification criteria without sending exact income or credit score.",
    scene: 2,
    slug: "shop-without-undressing",
    steps: [
      {
        body: "The lender, modelled on Bank of America, receives proofs that Alex's income is at least $7,000 a month and credit score 620 or higher.",
        title: "Send proofs to the lender",
        tryLive: {
          app: "lender-boa",
          label: "Open the lender's prequalification",
          path: "/prequal",
        },
      },
      {
        body: "The second lender, modelled on Fifth Third Bank, checks the same proofs. Each lender returns an illustrative rate quote, not an offer of credit.",
        title: "Get a second quote",
        tryLive: { app: "lender-53", label: "Open the second lender" },
      },
      {
        body: "Alex meets both lenders' prequalification criteria. To apply, Alex must share actual figures, so scene 3 uses access permissions.",
        title: "Choose a lender",
        tryLive: { app: "wallet", label: "Compare illustrative quotes", path: "/prequal" },
      },
    ],
    title: "Prequalify without disclosing income or credit score",
    underneath: [
      "A zero-knowledge proof shows that a figure meets a threshold without revealing the figure. The proofs run in the browser.",
      "Each proof is tied to issuer-signed data. Some combined proofs are precomputed and labelled “proved offline · verified live”.",
      "Limitations: not independently audited. A lender may be able to guess values with few possibilities, such as a credit score.",
    ],
  },
  {
    anchor:
      "Reg Z 12 CFR 1026.19(e)(1)(iii): the Loan Estimate is delivered or mailed within three business days after application.",
    lead: "Alex gives the lender access to named items in the pod, and the lender prefills the application.",
    scene: 3,
    slug: "one-click-application",
    steps: [
      {
        body: "In the Data Vault, Alex lets the lender read the profile and three credentials. Each change gets a consent receipt.",
        title: "Grant access",
        tryLive: { app: "wallet", label: "Open access permissions", path: "/grants" },
      },
      {
        body: "The lender prefills the Uniform Residential Loan Application (URLA) from the pod. Alex reviews and submits it.",
        title: "Review the prefilled application",
        tryLive: { app: "lender-boa", label: "Open the application", path: "/application" },
      },
      {
        body: "The lender saves illustrative loan terms in Alex's pod. This summary is not a complete Loan Estimate.",
        title: "Receive the loan terms",
        tryLive: { app: "lender-boa", label: "View the loan terms", path: "/application" },
      },
    ],
    title: "Apply with data from the pod",
  },
  {
    anchor:
      "Fannie Mae Selling Guide B3-3.1-04: verbal verification of employment (VOE) within 10 business days before the note date.",
    lead: "The lender re-verifies Alex's employment before closing, and the automated underwriting service runs again.",
    scene: 4,
    slug: "nothing-goes-stale",
    steps: [
      {
        body: "Alex's employment credential is 30 days old, outside the 10-business-day VOE window. The lender asks for a newer verification.",
        title: "Check the employment credential",
        tryLive: { app: "lender-boa", label: "Check credential validity", path: "/freshness" },
      },
      {
        body: "The provider issues a replacement through the access Alex already gave. The employment data is simulated, not re-confirmed with an employer.",
        title: "Issue a replacement credential",
        tryLive: {
          app: "verifications",
          label: "Issue replacement credential",
          path: "/employment",
        },
      },
      {
        body: "The automated underwriting service (AUS), modelled on Freddie Mac, returns findings. The lender's underwriter makes the credit decision.",
        title: "Run the AUS again",
        tryLive: { app: "gse", label: "Run the AUS", path: "/underwriting" },
      },
    ],
    title: "Re-verify employment before closing",
    underneath: [
      "The credential's validity period runs from 30 days ago to 14 days ahead. These are real credential dates, not a simulated clock.",
      "Revoking a credential is a separate act that uses a status list. It is not part of this scene.",
      "The replacement uses Alex's existing access permission, so Alex does not grant access again.",
    ],
  },
  {
    anchor:
      "Reg Z 12 CFR 1026.19(f)(1)(ii): Closing Disclosure three business days before consummation. Reg X 12 CFR 1024.33(b): servicing-transfer notices, simulated here.",
    lead: "Alex signs the closing documents and gives the new servicer access. The Data Vault shows every access change.",
    scene: 5,
    slug: "close-and-stay-in-control",
    steps: [
      {
        body: "On the eClosing platform, modelled on Wolters Kluwer (eOriginal), Alex eSigns. The platform saves the closing record in Alex's pod.",
        title: "Sign the closing documents",
        tryLive: { app: "closing", label: "Open eClosing" },
      },
      {
        body: "The servicer, modelled on Truist, asks to read the closing record. Alex grants it and revokes the lender's access, which does not delete the lender's copies.",
        title: "Manage access after servicing transfers",
        tryLive: { app: "closing", label: "Grant servicer access" },
      },
      {
        body: "The Data Vault lists each consent receipt: every access given or revoked. It does not log every read.",
        title: "Review the access history",
        tryLive: { app: "wallet", label: "View consent receipts", path: "/ledger" },
      },
    ],
    title: "Close the loan and transfer servicing",
  },
];

export function chapterBySlug(slug: string): Chapter | undefined {
  return chapters.find((chapter) => chapter.slug === slug);
}
