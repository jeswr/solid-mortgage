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
  /** Section id on the target page, e.g. "closing-access" (appended as a #fragment). */
  hash?: string;
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
      "A credential is a signed verification record: a W3C Verifiable Credential that anyone can check without calling the issuer.",
      "The pod's permission list (Web Access Control) lets each provider write its credential. Permission changes are saved. This local demo makes requests as Alex; it does not enforce separate organisation permissions.",
      "The income and credit-score credentials are signed twice, so scene 2 can use them in zero-knowledge proofs.",
    ],
  },
  {
    anchor: "Reg B comment 2(f)-3 explains when a prequalification request becomes an application.",
    lead: "Alex checks two lenders' prequalification criteria using proofs derived from Alex's credentials.",
    scene: 2,
    slug: "shop-without-undressing",
    steps: [
      {
        body: "The lender, modelled on Bank of America, checks proofs that Alex's income is at least $7,000 a month and credit score 620 or higher.",
        title: "Send proofs to the lender",
        tryLive: {
          app: "lender-boa",
          label: "Open the lender's prequalification",
          path: "/prequal",
        },
      },
      {
        body: "The second lender, modelled on Fifth Third Bank, checks a new proof derived from the same credentials. Each lender shows an illustrative rate quote, not an offer.",
        title: "Get a second quote",
        tryLive: { app: "lender-53", label: "Open the second lender" },
      },
      {
        body: "Alex meets both lenders' prequalification criteria. To apply, Alex must share actual figures, so scene 3 uses access permissions.",
        title: "Choose a lender",
        tryLive: { app: "wallet", label: "Compare illustrative quotes", path: "/prequal" },
      },
    ],
    title: "Check prequalification criteria",
    underneath: [
      "A zero-knowledge proof shows that a figure meets a threshold without sending the figure directly. The proofs run in the browser.",
      "Each proof is tied to an issuer-signed value encoding. Some combined proofs are precomputed and labelled “proved offline · verified live”.",
      "Prototype limitation: encoded values may reveal the underlying figures through guessing. The cryptography has not been independently audited.",
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
        body: "In the Data Vault, Alex lets the lender read the profile and three credentials. Each change gets a consent receipt. Local requests run as Alex.",
        title: "Grant access",
        tryLive: { app: "wallet", label: "Open access permissions", path: "/grants" },
      },
      {
        body: "The lender prefills demo fields of the Uniform Residential Loan Application (URLA) from the pod. Alex reviews and submits them.",
        title: "Review the prefilled application",
        tryLive: { app: "lender-boa", label: "Open the application", path: "/application" },
      },
      {
        body: "The lender saves the application and shows illustrative loan terms. This summary is not a Loan Estimate.",
        title: "See illustrative loan terms",
        tryLive: { app: "lender-boa", label: "Open the demo application", path: "/application" },
      },
    ],
    title: "Apply with data from the pod",
  },
  {
    anchor:
      "Fannie Mae Selling Guide B3-3.1-04 sets when employment must be verbally verified before the note date. The timing depends on the option used.",
    lead: "Check its signature, status and validity period. This demo does not reconfirm employment with an employer.",
    scene: 4,
    slug: "nothing-goes-stale",
    steps: [
      {
        body: "The lender checks the credential's signature, status and validity period. Passing these checks does not confirm current employment.",
        title: "Check the employment credential",
        tryLive: { app: "lender-boa", label: "Check credential validity", path: "/freshness" },
      },
      {
        body: "The provider issues a replacement with the same simulated data and new dates, and revokes the previous credential on its status list.",
        title: "Issue a replacement demo credential",
        tryLive: {
          app: "verifications",
          label: "Issue replacement credential",
          path: "/employment",
        },
      },
      {
        body: "The underwriter marks the employment condition satisfied, a simulated decision. The lender then sets the closing status to clear to close.",
        title: "Mark the loan clear to close",
        tryLive: { app: "lender-boa", label: "Open the loan pipeline", path: "/pipeline" },
      },
    ],
    title: "Check the employment credential",
    underneath: [
      "The check reads the credential's real issue and expiry dates, not a simulated clock. A valid credential does not establish current employment.",
      "The replacement revokes the previous credential on the issuer's status list. Revoking a credential is different from revoking access.",
      "The replacement uses Alex's existing access permission, so Alex does not grant access again.",
    ],
  },
  {
    anchor:
      "Reg Z 12 CFR 1026.19(f)(1)(ii): Closing Disclosure three business days before consummation. Reg X 12 CFR 1024.33(b): servicing-transfer notices, simulated here.",
    lead: "Alex completes a simulated signing, then gives the new servicer access. The Data Vault shows every access change.",
    scene: 5,
    slug: "close-and-stay-in-control",
    steps: [
      {
        body: "On the eClosing platform, modelled on Wolters Kluwer (eOriginal), Alex completes a simulated signing. The platform saves a demo closing record in Alex's pod.",
        title: "Simulate signing",
        tryLive: { app: "closing", label: "Open eClosing" },
      },
      {
        body: "The servicer, modelled on Truist, asks to read the closing record. Alex grants it and removes the lender's access; the lender's copies remain. Local requests run as Alex.",
        title: "Manage access after servicing transfers",
        tryLive: { app: "closing", hash: "closing-access", label: "Grant servicer access" },
      },
      {
        body: "The Data Vault lists each consent receipt: every access given or removed. It does not log every read.",
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
