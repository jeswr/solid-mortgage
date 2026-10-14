/**
 * Examiner View content (decision 0002; org-map role 11): selected PUBLIC rules, each with
 * what the demo shows and what it does not demonstrate. Unbranded by design —
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
  /** Scene (SPEC §2) where the demo touches the rule. */
  scene: 1 | 2 | 3 | 4 | 5;
  /** Chapter that walks the beat. */
  chapterSlug: string;
  /** What the demo shows for this rule. */
  shows: string;
  /** What the demo does not demonstrate for this rule (H5: never imply compliance). */
  notShown: string;
}

export const examinerChecks: ExaminerCheck[] = [
  {
    chapterSlug: "one-click-application",
    citation: "Regulation Z §1026.19(e)(1)(iii) (TRID)",
    citationUrl: "https://www.consumerfinance.gov/rules-policy/regulations/1026/19/",
    id: "trid-loan-estimate",
    notShown: "Compliant delivery, or a complete Loan Estimate.",
    rule: "Loan Estimate delivered or placed in the mail no later than the third business day after the creditor receives the application (12 CFR 1026.19(e)(1)(iii)).",
    scene: 3,
    shows: "Saving a disclosure copy in Alex's pod, with a timestamp.",
  },
  {
    chapterSlug: "close-and-stay-in-control",
    citation: "Regulation Z §1026.19(f)(1)(ii) (TRID)",
    citationUrl: "https://www.consumerfinance.gov/rules-policy/regulations/1026/19/",
    id: "trid-closing-disclosure",
    notShown: "Receipt and consummation. Those dates are simulated.",
    rule: "Consumer receives the Closing Disclosure no later than three business days before consummation (12 CFR 1026.19(f)(1)(ii)).",
    scene: 5,
    shows: "The required review period, on a simulated timeline.",
  },
  {
    chapterSlug: "nothing-goes-stale",
    citation: "Fannie Mae Selling Guide B3-3.1-04",
    citationUrl: "https://selling-guide.fanniemae.com/sel/b3-3.1-04/verbal-verification-employment",
    id: "voe-freshness",
    notShown: "A new employment confirmation from the employer.",
    rule: "Verbal verification of employment no more than 10 business days before the note date.",
    scene: 4,
    shows: "A check of the employment credential's validity period.",
  },
  {
    chapterSlug: "nothing-goes-stale",
    citation: "Fannie Mae Selling Guide B1-1-03",
    citationUrl:
      "https://selling-guide.fanniemae.com/sel/b1-1-03/allowable-age-credit-documents-and-federal-income-tax-returns",
    id: "credit-document-age",
    notShown: "The age of the underlying information. Credential dates do not establish it.",
    rule: "Credit documents no older than 4 months at the note date.",
    scene: 4,
    shows: "Signed issue dates on each credential.",
  },
  {
    chapterSlug: "close-and-stay-in-control",
    citation: "Regulation X §1024.33(b) (RESPA)",
    citationUrl: "https://www.consumerfinance.gov/rules-policy/regulations/1024/33/",
    id: "respa-servicing-transfer",
    notShown: "Servicing-transfer notices. These are separate and simulated.",
    rule: "Notice of servicing transfer: from the transferor servicer not less than 15 days before the effective date of transfer, and from the transferee servicer not more than 15 days after it (12 CFR 1024.33(b)(3)).",
    scene: 5,
    shows: "Alex's permission changes, each recorded with a consent receipt.",
  },
];
