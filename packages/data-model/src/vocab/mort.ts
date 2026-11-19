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
  annualPercentageRate: "https://solid-mortgage-vocab.vercel.app/mort#annualPercentageRate",
  annualPremium: "https://solid-mortgage-vocab.vercel.app/mort#annualPremium",
  applicationDate: "https://solid-mortgage-vocab.vercel.app/mort#applicationDate",
  AppraisalCredential: "https://solid-mortgage-vocab.vercel.app/mort#AppraisalCredential",
  appraiserLicenseId: "https://solid-mortgage-vocab.vercel.app/mort#appraiserLicenseId",
  asOf: "https://solid-mortgage-vocab.vercel.app/mort#asOf",
  AssetCredential: "https://solid-mortgage-vocab.vercel.app/mort#AssetCredential",
  authorisedBy: "https://solid-mortgage-vocab.vercel.app/mort#authorisedBy",
  beneficialOwnershipArrayCommitment:
    "https://solid-mortgage-vocab.vercel.app/mort#beneficialOwnershipArrayCommitment",
  BeneficialOwnershipCredential:
    "https://solid-mortgage-vocab.vercel.app/mort#BeneficialOwnershipCredential",
  cashToClose: "https://solid-mortgage-vocab.vercel.app/mort#cashToClose",
  cddCheckDate: "https://solid-mortgage-vocab.vercel.app/mort#cddCheckDate",
  CddDecisionRecord: "https://solid-mortgage-vocab.vercel.app/mort#CddDecisionRecord",
  cddDecisionStatus: "https://solid-mortgage-vocab.vercel.app/mort#cddDecisionStatus",
  CddDecisionStatus_Declined:
    "https://solid-mortgage-vocab.vercel.app/mort#CddDecisionStatus-Declined",
  CddDecisionStatus_Opened: "https://solid-mortgage-vocab.vercel.app/mort#CddDecisionStatus-Opened",
  CddDecisionStatus_PendingReview:
    "https://solid-mortgage-vocab.vercel.app/mort#CddDecisionStatus-PendingReview",
  CddDecisionStatusScheme: "https://solid-mortgage-vocab.vercel.app/mort#CddDecisionStatusScheme",
  checkedAt: "https://solid-mortgage-vocab.vercel.app/mort#checkedAt",
  checkedCredential: "https://solid-mortgage-vocab.vercel.app/mort#checkedCredential",
  closingDate: "https://solid-mortgage-vocab.vercel.app/mort#closingDate",
  ClosingDisclosure: "https://solid-mortgage-vocab.vercel.app/mort#ClosingDisclosure",
  constructionType: "https://solid-mortgage-vocab.vercel.app/mort#constructionType",
  controlPerson: "https://solid-mortgage-vocab.vercel.app/mort#controlPerson",
  CredentialPointer: "https://solid-mortgage-vocab.vercel.app/mort#CredentialPointer",
  CreditReport: "https://solid-mortgage-vocab.vercel.app/mort#CreditReport",
  CreditScoreCredential: "https://solid-mortgage-vocab.vercel.app/mort#CreditScoreCredential",
  CreditScoreNotice: "https://solid-mortgage-vocab.vercel.app/mort#CreditScoreNotice",
  creditScoreValue: "https://solid-mortgage-vocab.vercel.app/mort#creditScoreValue",
  debitDayOfMonth: "https://solid-mortgage-vocab.vercel.app/mort#debitDayOfMonth",
  decisionStatus: "https://solid-mortgage-vocab.vercel.app/mort#decisionStatus",
  DecisionStatus_Approved: "https://solid-mortgage-vocab.vercel.app/mort#DecisionStatus-Approved",
  DecisionStatus_ApprovedWithConditions:
    "https://solid-mortgage-vocab.vercel.app/mort#DecisionStatus-ApprovedWithConditions",
  DecisionStatus_Denied: "https://solid-mortgage-vocab.vercel.app/mort#DecisionStatus-Denied",
  DecisionStatus_Suspended: "https://solid-mortgage-vocab.vercel.app/mort#DecisionStatus-Suspended",
  DecisionStatusScheme: "https://solid-mortgage-vocab.vercel.app/mort#DecisionStatusScheme",
  deductible: "https://solid-mortgage-vocab.vercel.app/mort#deductible",
  disbursementDate: "https://solid-mortgage-vocab.vercel.app/mort#disbursementDate",
  dwellingCoverage: "https://solid-mortgage-vocab.vercel.app/mort#dwellingCoverage",
  earnestMoneyDeposit: "https://solid-mortgage-vocab.vercel.app/mort#earnestMoneyDeposit",
  EmploymentIncomeCredential:
    "https://solid-mortgage-vocab.vercel.app/mort#EmploymentIncomeCredential",
  eNoteReference: "https://solid-mortgage-vocab.vercel.app/mort#eNoteReference",
  EntityLegalForm_Corp: "https://solid-mortgage-vocab.vercel.app/mort#EntityLegalForm-Corp",
  EntityLegalForm_LLC: "https://solid-mortgage-vocab.vercel.app/mort#EntityLegalForm-LLC",
  EntityLegalForm_LLP: "https://solid-mortgage-vocab.vercel.app/mort#EntityLegalForm-LLP",
  EntityLegalFormScheme: "https://solid-mortgage-vocab.vercel.app/mort#EntityLegalFormScheme",
  EscrowAccountStatement: "https://solid-mortgage-vocab.vercel.app/mort#EscrowAccountStatement",
  estimatedTotalMonthlyPayment:
    "https://solid-mortgage-vocab.vercel.app/mort#estimatedTotalMonthlyPayment",
  EvidenceOfInsuranceCredential:
    "https://solid-mortgage-vocab.vercel.app/mort#EvidenceOfInsuranceCredential",
  field: "https://solid-mortgage-vocab.vercel.app/mort#field",
  grantee: "https://solid-mortgage-vocab.vercel.app/mort#grantee",
  GrantEnd_Closing: "https://solid-mortgage-vocab.vercel.app/mort#GrantEnd-Closing",
  GrantEnd_PolicyIssued: "https://solid-mortgage-vocab.vercel.app/mort#GrantEnd-PolicyIssued",
  GrantEnd_PolicyLapses: "https://solid-mortgage-vocab.vercel.app/mort#GrantEnd-PolicyLapses",
  GrantEnd_ReportDelivered: "https://solid-mortgage-vocab.vercel.app/mort#GrantEnd-ReportDelivered",
  GrantEnd_ServicingEnds: "https://solid-mortgage-vocab.vercel.app/mort#GrantEnd-ServicingEnds",
  GrantEndScheme: "https://solid-mortgage-vocab.vercel.app/mort#GrantEndScheme",
  grantor: "https://solid-mortgage-vocab.vercel.app/mort#grantor",
  identifiedBeneficialOwner:
    "https://solid-mortgage-vocab.vercel.app/mort#identifiedBeneficialOwner",
  IdentityCredential: "https://solid-mortgage-vocab.vercel.app/mort#IdentityCredential",
  intentToProceedDate: "https://solid-mortgage-vocab.vercel.app/mort#intentToProceedDate",
  isIllustrativeLei: "https://solid-mortgage-vocab.vercel.app/mort#isIllustrativeLei",
  keyFactor: "https://solid-mortgage-vocab.vercel.app/mort#keyFactor",
  legalDescription: "https://solid-mortgage-vocab.vercel.app/mort#legalDescription",
  lineItem: "https://solid-mortgage-vocab.vercel.app/mort#lineItem",
  LoanEstimate: "https://solid-mortgage-vocab.vercel.app/mort#LoanEstimate",
  loanNumber: "https://solid-mortgage-vocab.vercel.app/mort#loanNumber",
  loanPolicyAmount: "https://solid-mortgage-vocab.vercel.app/mort#loanPolicyAmount",
  loanTermMonths: "https://solid-mortgage-vocab.vercel.app/mort#loanTermMonths",
  LoanTransferNotice: "https://solid-mortgage-vocab.vercel.app/mort#LoanTransferNotice",
  maritalStatus: "https://solid-mortgage-vocab.vercel.app/mort#maritalStatus",
  MaritalStatus_Married: "https://solid-mortgage-vocab.vercel.app/mort#MaritalStatus-Married",
  MaritalStatus_Separated: "https://solid-mortgage-vocab.vercel.app/mort#MaritalStatus-Separated",
  MaritalStatus_Unmarried: "https://solid-mortgage-vocab.vercel.app/mort#MaritalStatus-Unmarried",
  MaritalStatusScheme: "https://solid-mortgage-vocab.vercel.app/mort#MaritalStatusScheme",
  MessageKind_AppraisalDelivery:
    "https://solid-mortgage-vocab.vercel.app/mort#MessageKind-AppraisalDelivery",
  MessageKind_CasefileSubmission:
    "https://solid-mortgage-vocab.vercel.app/mort#MessageKind-CasefileSubmission",
  MessageKind_ClosingConfirmation:
    "https://solid-mortgage-vocab.vercel.app/mort#MessageKind-ClosingConfirmation",
  MessageKind_ClosingInstructions:
    "https://solid-mortgage-vocab.vercel.app/mort#MessageKind-ClosingInstructions",
  MessageKind_CommitmentDelivery:
    "https://solid-mortgage-vocab.vercel.app/mort#MessageKind-CommitmentDelivery",
  MessageKind_CreditReportDelivery:
    "https://solid-mortgage-vocab.vercel.app/mort#MessageKind-CreditReportDelivery",
  MessageKind_CreditReportOrder:
    "https://solid-mortgage-vocab.vercel.app/mort#MessageKind-CreditReportOrder",
  MessageKind_FindingsDelivery:
    "https://solid-mortgage-vocab.vercel.app/mort#MessageKind-FindingsDelivery",
  MessageKind_LoanDelivery: "https://solid-mortgage-vocab.vercel.app/mort#MessageKind-LoanDelivery",
  MessageKind_PurchaseConfirmation:
    "https://solid-mortgage-vocab.vercel.app/mort#MessageKind-PurchaseConfirmation",
  MessageKind_RecordingConfirmation:
    "https://solid-mortgage-vocab.vercel.app/mort#MessageKind-RecordingConfirmation",
  MessageKind_RecordingSubmission:
    "https://solid-mortgage-vocab.vercel.app/mort#MessageKind-RecordingSubmission",
  MessageKind_RefreshDelivery:
    "https://solid-mortgage-vocab.vercel.app/mort#MessageKind-RefreshDelivery",
  MessageKind_RefreshRequest:
    "https://solid-mortgage-vocab.vercel.app/mort#MessageKind-RefreshRequest",
  MessageKind_ServiceOrder: "https://solid-mortgage-vocab.vercel.app/mort#MessageKind-ServiceOrder",
  MessageKind_ServicingBoarding:
    "https://solid-mortgage-vocab.vercel.app/mort#MessageKind-ServicingBoarding",
  MessageKindScheme: "https://solid-mortgage-vocab.vercel.app/mort#MessageKindScheme",
  monthlyEscrowPayment: "https://solid-mortgage-vocab.vercel.app/mort#monthlyEscrowPayment",
  monthlyGrossIncomeUsd: "https://solid-mortgage-vocab.vercel.app/mort#monthlyGrossIncomeUsd",
  monthlyPrincipalAndInterest:
    "https://solid-mortgage-vocab.vercel.app/mort#monthlyPrincipalAndInterest",
  mortgageeClause: "https://solid-mortgage-vocab.vercel.app/mort#mortgageeClause",
  NoticeKind_OwnershipTransfer:
    "https://solid-mortgage-vocab.vercel.app/mort#NoticeKind-OwnershipTransfer",
  NoticeKind_ServicingTransferFromTransferee:
    "https://solid-mortgage-vocab.vercel.app/mort#NoticeKind-ServicingTransferFromTransferee",
  NoticeKind_ServicingTransferFromTransferor:
    "https://solid-mortgage-vocab.vercel.app/mort#NoticeKind-ServicingTransferFromTransferor",
  NoticeKindScheme: "https://solid-mortgage-vocab.vercel.app/mort#NoticeKindScheme",
  OfficerAuthorisationCredential:
    "https://solid-mortgage-vocab.vercel.app/mort#OfficerAuthorisationCredential",
  operandEnc: "https://solid-mortgage-vocab.vercel.app/mort#operandEnc",
  OrganisationalIdentityCredential:
    "https://solid-mortgage-vocab.vercel.app/mort#OrganisationalIdentityCredential",
  ownerPolicyAmount: "https://solid-mortgage-vocab.vercel.app/mort#ownerPolicyAmount",
  ownershipPercentageBps: "https://solid-mortgage-vocab.vercel.app/mort#ownershipPercentageBps",
  parcelNumber: "https://solid-mortgage-vocab.vercel.app/mort#parcelNumber",
  payee: "https://solid-mortgage-vocab.vercel.app/mort#payee",
  PaymentMandate: "https://solid-mortgage-vocab.vercel.app/mort#PaymentMandate",
  paymentProtectionEnds: "https://solid-mortgage-vocab.vercel.app/mort#paymentProtectionEnds",
  permissiblePurpose: "https://solid-mortgage-vocab.vercel.app/mort#permissiblePurpose",
  proposedInsured: "https://solid-mortgage-vocab.vercel.app/mort#proposedInsured",
  PurchaseAgreement: "https://solid-mortgage-vocab.vercel.app/mort#PurchaseAgreement",
  purchasePrice: "https://solid-mortgage-vocab.vercel.app/mort#purchasePrice",
  receivedDate: "https://solid-mortgage-vocab.vercel.app/mort#receivedDate",
  recordedAt: "https://solid-mortgage-vocab.vercel.app/mort#recordedAt",
  recordedInstrument: "https://solid-mortgage-vocab.vercel.app/mort#recordedInstrument",
  RecordedInstrument: "https://solid-mortgage-vocab.vercel.app/mort#RecordedInstrument",
  RecordingReceipt: "https://solid-mortgage-vocab.vercel.app/mort#RecordingReceipt",
  recordingReference: "https://solid-mortgage-vocab.vercel.app/mort#recordingReference",
  roofType: "https://solid-mortgage-vocab.vercel.app/mort#roofType",
  scoreDisclosure: "https://solid-mortgage-vocab.vercel.app/mort#scoreDisclosure",
  scoreModel: "https://solid-mortgage-vocab.vercel.app/mort#scoreModel",
  ScoreModel_ClassicFICO: "https://solid-mortgage-vocab.vercel.app/mort#ScoreModel-ClassicFICO",
  ScoreModel_FICO8: "https://solid-mortgage-vocab.vercel.app/mort#ScoreModel-FICO8",
  ScoreModel_VantageScore4: "https://solid-mortgage-vocab.vercel.app/mort#ScoreModel-VantageScore4",
  ScoreModelScheme: "https://solid-mortgage-vocab.vercel.app/mort#ScoreModelScheme",
  searchedThrough: "https://solid-mortgage-vocab.vercel.app/mort#searchedThrough",
  ServiceKind_Appraisal: "https://solid-mortgage-vocab.vercel.app/mort#ServiceKind-Appraisal",
  ServiceKind_CreditReport: "https://solid-mortgage-vocab.vercel.app/mort#ServiceKind-CreditReport",
  ServiceKind_FloodDetermination:
    "https://solid-mortgage-vocab.vercel.app/mort#ServiceKind-FloodDetermination",
  ServiceKind_TaxTranscripts:
    "https://solid-mortgage-vocab.vercel.app/mort#ServiceKind-TaxTranscripts",
  ServiceKind_Title: "https://solid-mortgage-vocab.vercel.app/mort#ServiceKind-Title",
  ServiceKindScheme: "https://solid-mortgage-vocab.vercel.app/mort#ServiceKindScheme",
  SettlementStatement: "https://solid-mortgage-vocab.vercel.app/mort#SettlementStatement",
  signatureVerified: "https://solid-mortgage-vocab.vercel.app/mort#signatureVerified",
  statusChecked: "https://solid-mortgage-vocab.vercel.app/mort#statusChecked",
  subjectProperty: "https://solid-mortgage-vocab.vercel.app/mort#subjectProperty",
  taxIdLast4: "https://solid-mortgage-vocab.vercel.app/mort#taxIdLast4",
  TitleClearCredential: "https://solid-mortgage-vocab.vercel.app/mort#TitleClearCredential",
  TitleCommitmentCredential:
    "https://solid-mortgage-vocab.vercel.app/mort#TitleCommitmentCredential",
  titleException: "https://solid-mortgage-vocab.vercel.app/mort#titleException",
  titleRequirement: "https://solid-mortgage-vocab.vercel.app/mort#titleRequirement",
  titleStatus: "https://solid-mortgage-vocab.vercel.app/mort#titleStatus",
  TitleStatus_Clear: "https://solid-mortgage-vocab.vercel.app/mort#TitleStatus-Clear",
  TitleStatus_Clouded: "https://solid-mortgage-vocab.vercel.app/mort#TitleStatus-Clouded",
  TitleStatusScheme: "https://solid-mortgage-vocab.vercel.app/mort#TitleStatusScheme",
  titleVesting: "https://solid-mortgage-vocab.vercel.app/mort#titleVesting",
  totalMonthlyDebtUsd: "https://solid-mortgage-vocab.vercel.app/mort#totalMonthlyDebtUsd",
  transferee: "https://solid-mortgage-vocab.vercel.app/mort#transferee",
  transferEffectiveDate: "https://solid-mortgage-vocab.vercel.app/mort#transferEffectiveDate",
  transferor: "https://solid-mortgage-vocab.vercel.app/mort#transferor",
  underwritingCondition: "https://solid-mortgage-vocab.vercel.app/mort#underwritingCondition",
  vestedOwner: "https://solid-mortgage-vocab.vercel.app/mort#vestedOwner",
  ZkOperandAnchor: "https://solid-mortgage-vocab.vercel.app/mort#ZkOperandAnchor",
} as const;

/** Constant keys of the mort vocabulary. */
export type MortTermKey = keyof typeof MORT;

/** Term IRIs of the mort vocabulary. */
export type MortTermIri = (typeof MORT)[MortTermKey];
