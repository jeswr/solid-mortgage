// AUTHORED-BY Claude Fable 5.2
/**
 * The mortgage scenario's fixed facts (design.md section a). Everything here is fictional:
 * the people, the organisations, the address and every figure.
 */

export const DEMO_ID = "mortgage";

/** Shown beside every money figure in the apps. */
export const FIGURE_TAG = "illustrative figure, not an offer";

export const BORROWER = {
  birthDate: "1991-04-12",
  emails: ["alex.rivera@example.org"],
  name: "Alex Rivera",
  /** The identity credential carries the last four digits only. */
  taxIdLast4: "4417",
  telephone: "+1-614-555-0142",
  /** How Alex will hold title, read by the title agent. */
  titleVesting: "Alex Rivera, an unmarried person",
} as const;

/** Where Alex lives now (the contact address until closing). */
export const CURRENT_ADDRESS = {
  addressLocality: "Marlow",
  addressRegion: "OH",
  postalCode: "43004",
  streetAddress: "208 Fenwick Street, Apt 3",
} as const;

export const PROPERTY = {
  address: {
    addressLocality: "Marlow",
    addressRegion: "OH",
    postalCode: "43004",
    streetAddress: "14 Larch Lane",
  },
  bathrooms: 2,
  bedrooms: 3,
  constructionType: "Wood frame",
  floorSizeSqFt: 1850,
  legalDescription: "Lot 22, Larch Meadow Subdivision, Plat Book 41, Page 17, Marlow County, Ohio",
  parcelNumber: "010-204417-00",
  roofType: "Asphalt shingle",
  yearBuilt: 1998,
} as const;

export const SELLER_NAME = "Jordan Whitfield";

export const EMPLOYMENT = {
  employerName: "Northfield Engineering",
  jobTitle: "Structural engineer",
  /** Whole US dollars a month. One of the two hidden values in the proof. */
  monthlyGrossIncomeUsd: 8500,
  startDate: "2019-06-03",
} as const;

export const ACCOUNTS = [
  { accountLast4: "2291", balanceUsd: 18_400, providerName: "Alder Bank" },
  { accountLast4: "7730", balanceUsd: 96_250, providerName: "Alder Bank" },
] as const;

export const CREDIT = {
  /** The score in the consumer's own credit summary. The other hidden value in the proof. */
  consumerSummaryScore: 742,
  /** The three scores on the lender's tri-merge report. The lender uses the middle one. */
  triMerge: [
    { score: 748, source: "Quillon Credit Bureau" },
    { score: 742, source: "Repository B (fictional)" },
    { score: 735, source: "Repository C (fictional)" },
  ],
  totalMonthlyDebtUsd: 1180,
} as const;

/** The thresholds both lenders publish for pre-qualification. */
export const PREQUALIFICATION = {
  minimumCreditScore: 620,
  minimumMonthlyIncomeUsd: 7000,
} as const;

export const LOAN = {
  aprPercent: 6.62,
  cashToCloseUsd: 86_350,
  closingCostsUsd: 9850,
  downPaymentUsd: 85_000,
  earnestMoneyDepositUsd: 8500,
  /** Principal and interest plus escrow for taxes and insurance. */
  estimatedTotalMonthlyPaymentUsd: 2659.03,
  interestRatePercent: 6.5,
  loanNumber: "JHL-1001",
  loanTermMonths: 360,
  monthlyEscrowPaymentUsd: 510,
  monthlyPrincipalAndInterestUsd: 2149.03,
  principalUsd: 340_000,
  purchasePriceUsd: 425_000,
} as const;

export const APPRAISAL = {
  appraisedValueUsd: 428_000,
  appraiserLicenseId: "OH-CR-2019004417",
  appraiserName: "Sam Reyes",
  orderNumber: "PV-7731",
} as const;

export const TITLE_FILE = {
  commitmentNumber: "STE-2026-0417",
  exceptions: [
    "Utility easement along the rear ten feet of the lot, Plat Book 41, Page 17",
    "Taxes and assessments for the current year, not yet due and payable",
  ],
  requirements: [
    "Pay off and release the existing mortgage from Jordan Whitfield to Harbourline Savings",
    "Record a warranty deed from Jordan Whitfield to Alex Rivera",
    "Record the mortgage from Alex Rivera to Juniper Home Loans",
  ],
} as const;

export const INSURANCE = {
  annualPremiumUsd: 1620,
  deductibleUsd: 1000,
  dwellingCoverageUsd: 410_000,
  mortgageeClause: "Juniper Home Loans, its successors and/or assigns",
  policyNumber: "WM-HO-558120",
} as const;

export const ESCROW = {
  annualInsuranceUsd: 1620,
  annualPropertyTaxUsd: 4500,
} as const;

/** The simulated calendar days of design.md section d.7. */
export const DAY = {
  application: 3,
  appraisal: 12,
  clearToClose: 31,
  closing: 38,
  closingDisclosure: 32,
  credentials: 1,
  insurance: 16,
  loanEstimate: 4,
  orders: 5,
  revoke: 72,
  sale: 45,
  servicingTransfer: 70,
  titleCommitment: 14,
  transferNotice: 52,
} as const;

/** How long each issuer's signed status list stays valid: the whole story and a margin. */
export const STATUS_LIST_LIFETIME_DAYS = 400;
