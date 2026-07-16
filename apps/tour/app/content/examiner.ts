/**
 * Examiner View content (decision 0002; org-map role 11): the journey's TRID/RESPA timing
 * beats rendered as an examiner-facing checklist over PUBLIC rules. Unbranded by design —
 * no agency name in the chrome, explicit CFPB non-affiliation, neutral styling.
 *
 * Lives under `app/` so `scripts/check-insignia.mjs` scans this copy (R2).
 */

export const EXAMINER_NON_AFFILIATION =
  "This view is illustrative. It is not affiliated with, or endorsed by, the Consumer Financial Protection Bureau (CFPB) or any government agency.";

export interface ExaminerCheck {
  id: string;
  /** The public rule, in examiner-facing plain English. */
  rule: string;
  /** Public citation label. */
  citation: string;
  /** Public, dereferenceable source for the rule. */
  citationUrl: string;
  /** Scene (SPEC §2) where the demo dramatizes the rule. */
  scene: 1 | 2 | 3 | 4 | 5;
  /** Chapter that walks the beat. */
  chapterSlug: string;
  /** What the examiner-facing view checks in the demo journey. */
  observe: string;
}

export const examinerChecks: ExaminerCheck[] = [
  {
    chapterSlug: "one-click-application",
    citation: "Regulation Z §1026.19(e)(1)(iii) (TRID)",
    citationUrl: "https://www.consumerfinance.gov/rules-policy/regulations/1026/19/",
    id: "trid-loan-estimate",
    observe:
      "The demo delivers the Loan Estimate straight into the borrower's pod with a receipted timestamp — a delivery mechanism that goes beyond the rule's delivered-or-mailed minimum — so timing against the application date is enumerable from the consent-receipt ledger rather than reconstructed from mail logs.",
    rule: "Loan Estimate delivered or placed in the mail no later than the third business day after the creditor receives the application (12 CFR 1026.19(e)(1)(iii)).",
    scene: 3,
  },
  {
    chapterSlug: "close-and-stay-in-control",
    citation: "Regulation Z §1026.19(f)(1)(ii) (TRID)",
    citationUrl: "https://www.consumerfinance.gov/rules-policy/regulations/1026/19/",
    id: "trid-closing-disclosure",
    observe:
      "The Closing Disclosure lands in the pod three business days before consummation; the borrower-held copy and its receipt make the review window verifiable from the borrower's side.",
    rule: "Consumer receives the Closing Disclosure no later than three business days before consummation (12 CFR 1026.19(f)(1)(ii)).",
    scene: 5,
  },
  {
    chapterSlug: "nothing-goes-stale",
    citation: "Fannie Mae Selling Guide B3-3.1-04",
    citationUrl: "https://selling-guide.fanniemae.com/sel/b3-3.1-04/verbal-verification-employment",
    id: "voe-freshness",
    observe:
      "The employment credential's validity window enforces the freshness rule mechanically: a lapsed credential blocks the pre-close check until the issuer re-attests through the existing grant.",
    rule: "Verbal verification of employment no more than 10 business days before the note date.",
    scene: 4,
  },
  {
    chapterSlug: "nothing-goes-stale",
    citation: "Fannie Mae Selling Guide B1-1-03",
    citationUrl:
      "https://selling-guide.fanniemae.com/sel/b1-1-03/allowable-age-credit-documents-and-federal-income-tax-returns",
    id: "credit-document-age",
    observe:
      "Credential issuance dates are first-class, signed data — document age is checkable in seconds without re-collection, and a stale credential is re-issued rather than re-gathered.",
    rule: "Credit documents no older than 4 months at the note date.",
    scene: 4,
  },
  {
    chapterSlug: "close-and-stay-in-control",
    citation: "Regulation X §1024.33(b) (RESPA)",
    citationUrl: "https://www.consumerfinance.gov/rules-policy/regulations/1024/33/",
    id: "respa-servicing-transfer",
    observe:
      "The servicing transfer is a borrower-approved access grant plus a revocation of the prior servicer — both receipted, so the transfer trail an examiner reviews already exists as structured data.",
    rule: "Notice of servicing transfer: from the transferor servicer not less than 15 days before the effective date of transfer, and from the transferee servicer not more than 15 days after it (12 CFR 1024.33(b)(3)).",
    scene: 5,
  },
];
