// Generated from vocab/mort.ttl by scripts/generate-vocab.mjs - DO NOT EDIT.
// Regenerate from packages/data-model: node scripts/generate-vocab.mjs

/** IRI of the mort ontology (the hash-namespace document). */
export const MORT_ONTOLOGY_IRI = "https://solid-mortgage-vocab.vercel.app/mort";

/** Namespace of the mort residue vocabulary. */
export const MORT_NAMESPACE = "https://solid-mortgage-vocab.vercel.app/mort#";

/**
 * IRI constants for every term defined in vocab/mort.ttl
 * (hyphens in SKOS concept local names become underscores).
 */
export const MORT = {
  accountLast4: "https://solid-mortgage-vocab.vercel.app/mort#accountLast4",
  AppraisalCredential: "https://solid-mortgage-vocab.vercel.app/mort#AppraisalCredential",
  appraiserLicenseId: "https://solid-mortgage-vocab.vercel.app/mort#appraiserLicenseId",
  AssetCredential: "https://solid-mortgage-vocab.vercel.app/mort#AssetCredential",
  closingDate: "https://solid-mortgage-vocab.vercel.app/mort#closingDate",
  CreditScoreCredential: "https://solid-mortgage-vocab.vercel.app/mort#CreditScoreCredential",
  creditScoreValue: "https://solid-mortgage-vocab.vercel.app/mort#creditScoreValue",
  decisionStatus: "https://solid-mortgage-vocab.vercel.app/mort#decisionStatus",
  DecisionStatus_Approved: "https://solid-mortgage-vocab.vercel.app/mort#DecisionStatus-Approved",
  DecisionStatus_ApprovedWithConditions:
    "https://solid-mortgage-vocab.vercel.app/mort#DecisionStatus-ApprovedWithConditions",
  DecisionStatus_Denied: "https://solid-mortgage-vocab.vercel.app/mort#DecisionStatus-Denied",
  DecisionStatus_Suspended: "https://solid-mortgage-vocab.vercel.app/mort#DecisionStatus-Suspended",
  DecisionStatusScheme: "https://solid-mortgage-vocab.vercel.app/mort#DecisionStatusScheme",
  EmploymentIncomeCredential:
    "https://solid-mortgage-vocab.vercel.app/mort#EmploymentIncomeCredential",
  field: "https://solid-mortgage-vocab.vercel.app/mort#field",
  loanTermMonths: "https://solid-mortgage-vocab.vercel.app/mort#loanTermMonths",
  maritalStatus: "https://solid-mortgage-vocab.vercel.app/mort#maritalStatus",
  MaritalStatus_Married: "https://solid-mortgage-vocab.vercel.app/mort#MaritalStatus-Married",
  MaritalStatus_Separated: "https://solid-mortgage-vocab.vercel.app/mort#MaritalStatus-Separated",
  MaritalStatus_Unmarried: "https://solid-mortgage-vocab.vercel.app/mort#MaritalStatus-Unmarried",
  MaritalStatusScheme: "https://solid-mortgage-vocab.vercel.app/mort#MaritalStatusScheme",
  monthlyGrossIncomeUsd: "https://solid-mortgage-vocab.vercel.app/mort#monthlyGrossIncomeUsd",
  operandEnc: "https://solid-mortgage-vocab.vercel.app/mort#operandEnc",
  recordingReference: "https://solid-mortgage-vocab.vercel.app/mort#recordingReference",
  scoreModel: "https://solid-mortgage-vocab.vercel.app/mort#scoreModel",
  ScoreModel_FICO8: "https://solid-mortgage-vocab.vercel.app/mort#ScoreModel-FICO8",
  ScoreModelScheme: "https://solid-mortgage-vocab.vercel.app/mort#ScoreModelScheme",
  searchedThrough: "https://solid-mortgage-vocab.vercel.app/mort#searchedThrough",
  subjectProperty: "https://solid-mortgage-vocab.vercel.app/mort#subjectProperty",
  TitleClearCredential: "https://solid-mortgage-vocab.vercel.app/mort#TitleClearCredential",
  titleStatus: "https://solid-mortgage-vocab.vercel.app/mort#titleStatus",
  TitleStatus_Clear: "https://solid-mortgage-vocab.vercel.app/mort#TitleStatus-Clear",
  TitleStatus_Clouded: "https://solid-mortgage-vocab.vercel.app/mort#TitleStatus-Clouded",
  TitleStatusScheme: "https://solid-mortgage-vocab.vercel.app/mort#TitleStatusScheme",
  totalMonthlyDebtUsd: "https://solid-mortgage-vocab.vercel.app/mort#totalMonthlyDebtUsd",
  underwritingCondition: "https://solid-mortgage-vocab.vercel.app/mort#underwritingCondition",
  ZkOperandAnchor: "https://solid-mortgage-vocab.vercel.app/mort#ZkOperandAnchor",
} as const;

/** Constant keys of the mort vocabulary. */
export type MortTermKey = keyof typeof MORT;

/** Term IRIs of the mort vocabulary. */
export type MortTermIri = (typeof MORT)[MortTermKey];
