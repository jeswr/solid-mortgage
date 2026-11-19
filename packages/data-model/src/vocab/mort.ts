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
  AdverseActionNotice: "https://solid-mortgage-vocab.vercel.app/mort#AdverseActionNotice",
  adverseActionReason: "https://solid-mortgage-vocab.vercel.app/mort#adverseActionReason",
  amountFinanced: "https://solid-mortgage-vocab.vercel.app/mort#amountFinanced",
  annualPercentageRate: "https://solid-mortgage-vocab.vercel.app/mort#annualPercentageRate",
  annualPremium: "https://solid-mortgage-vocab.vercel.app/mort#annualPremium",
  annualTurnoverBand: "https://solid-mortgage-vocab.vercel.app/mort#annualTurnoverBand",
  applicationDate: "https://solid-mortgage-vocab.vercel.app/mort#applicationDate",
  AppraisalCredential: "https://solid-mortgage-vocab.vercel.app/mort#AppraisalCredential",
  appraiserLicenseId: "https://solid-mortgage-vocab.vercel.app/mort#appraiserLicenseId",
  asOf: "https://solid-mortgage-vocab.vercel.app/mort#asOf",
  AssetCredential: "https://solid-mortgage-vocab.vercel.app/mort#AssetCredential",
  authorisedBy: "https://solid-mortgage-vocab.vercel.app/mort#authorisedBy",
  averageBalanceUsd: "https://solid-mortgage-vocab.vercel.app/mort#averageBalanceUsd",
  averageDailyBalance: "https://solid-mortgage-vocab.vercel.app/mort#averageDailyBalance",
  beneficialOwnershipArrayCommitment:
    "https://solid-mortgage-vocab.vercel.app/mort#beneficialOwnershipArrayCommitment",
  BeneficialOwnershipCredential:
    "https://solid-mortgage-vocab.vercel.app/mort#BeneficialOwnershipCredential",
  BusinessLoanTerms: "https://solid-mortgage-vocab.vercel.app/mort#BusinessLoanTerms",
  CashFlowAssessment: "https://solid-mortgage-vocab.vercel.app/mort#CashFlowAssessment",
  CashFlowCredential: "https://solid-mortgage-vocab.vercel.app/mort#CashFlowCredential",
  CashFlowRecord: "https://solid-mortgage-vocab.vercel.app/mort#CashFlowRecord",
  cashFlowScoreValue: "https://solid-mortgage-vocab.vercel.app/mort#cashFlowScoreValue",
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
  checkedAttribute: "https://solid-mortgage-vocab.vercel.app/mort#checkedAttribute",
  checkedCredential: "https://solid-mortgage-vocab.vercel.app/mort#checkedCredential",
  checkMethod: "https://solid-mortgage-vocab.vercel.app/mort#checkMethod",
  ClosedEndCreditDisclosure:
    "https://solid-mortgage-vocab.vercel.app/mort#ClosedEndCreditDisclosure",
  closingBalanceUsd: "https://solid-mortgage-vocab.vercel.app/mort#closingBalanceUsd",
  closingDate: "https://solid-mortgage-vocab.vercel.app/mort#closingDate",
  ClosingDisclosure: "https://solid-mortgage-vocab.vercel.app/mort#ClosingDisclosure",
  constructionType: "https://solid-mortgage-vocab.vercel.app/mort#constructionType",
  controlPerson: "https://solid-mortgage-vocab.vercel.app/mort#controlPerson",
  covenant: "https://solid-mortgage-vocab.vercel.app/mort#covenant",
  covenantMetric: "https://solid-mortgage-vocab.vercel.app/mort#covenantMetric",
  CovenantMetric_DebtServiceCoverage:
    "https://solid-mortgage-vocab.vercel.app/mort#CovenantMetric-DebtServiceCoverage",
  CovenantMetric_MinimumAverageBalance:
    "https://solid-mortgage-vocab.vercel.app/mort#CovenantMetric-MinimumAverageBalance",
  CovenantMetricScheme: "https://solid-mortgage-vocab.vercel.app/mort#CovenantMetricScheme",
  covenantsMet: "https://solid-mortgage-vocab.vercel.app/mort#covenantsMet",
  covenantThreshold: "https://solid-mortgage-vocab.vercel.app/mort#covenantThreshold",
  CredentialPointer: "https://solid-mortgage-vocab.vercel.app/mort#CredentialPointer",
  CreditReport: "https://solid-mortgage-vocab.vercel.app/mort#CreditReport",
  CreditScoreCredential: "https://solid-mortgage-vocab.vercel.app/mort#CreditScoreCredential",
  CreditScoreNotice: "https://solid-mortgage-vocab.vercel.app/mort#CreditScoreNotice",
  creditScoreValue: "https://solid-mortgage-vocab.vercel.app/mort#creditScoreValue",
  debitDayOfMonth: "https://solid-mortgage-vocab.vercel.app/mort#debitDayOfMonth",
  debtServiceCoverageRatio: "https://solid-mortgage-vocab.vercel.app/mort#debtServiceCoverageRatio",
  debtServiceUsd: "https://solid-mortgage-vocab.vercel.app/mort#debtServiceUsd",
  decisionStatus: "https://solid-mortgage-vocab.vercel.app/mort#decisionStatus",
  DecisionStatus_Approved: "https://solid-mortgage-vocab.vercel.app/mort#DecisionStatus-Approved",
  DecisionStatus_ApprovedWithConditions:
    "https://solid-mortgage-vocab.vercel.app/mort#DecisionStatus-ApprovedWithConditions",
  DecisionStatus_Denied: "https://solid-mortgage-vocab.vercel.app/mort#DecisionStatus-Denied",
  DecisionStatus_Suspended: "https://solid-mortgage-vocab.vercel.app/mort#DecisionStatus-Suspended",
  DecisionStatusScheme: "https://solid-mortgage-vocab.vercel.app/mort#DecisionStatusScheme",
  deductible: "https://solid-mortgage-vocab.vercel.app/mort#deductible",
  depositStream: "https://solid-mortgage-vocab.vercel.app/mort#depositStream",
  DepositStream: "https://solid-mortgage-vocab.vercel.app/mort#DepositStream",
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
  filingsCurrentThrough: "https://solid-mortgage-vocab.vercel.app/mort#filingsCurrentThrough",
  financeCharge: "https://solid-mortgage-vocab.vercel.app/mort#financeCharge",
  FinancialCovenant: "https://solid-mortgage-vocab.vercel.app/mort#FinancialCovenant",
  grantee: "https://solid-mortgage-vocab.vercel.app/mort#grantee",
  GrantEnd_Closing: "https://solid-mortgage-vocab.vercel.app/mort#GrantEnd-Closing",
  GrantEnd_LoanRepaid: "https://solid-mortgage-vocab.vercel.app/mort#GrantEnd-LoanRepaid",
  GrantEnd_PolicyIssued: "https://solid-mortgage-vocab.vercel.app/mort#GrantEnd-PolicyIssued",
  GrantEnd_PolicyLapses: "https://solid-mortgage-vocab.vercel.app/mort#GrantEnd-PolicyLapses",
  GrantEnd_ReportDelivered: "https://solid-mortgage-vocab.vercel.app/mort#GrantEnd-ReportDelivered",
  GrantEnd_ServicingEnds: "https://solid-mortgage-vocab.vercel.app/mort#GrantEnd-ServicingEnds",
  GrantEndScheme: "https://solid-mortgage-vocab.vercel.app/mort#GrantEndScheme",
  grantor: "https://solid-mortgage-vocab.vercel.app/mort#grantor",
  identifiedBeneficialOwner:
    "https://solid-mortgage-vocab.vercel.app/mort#identifiedBeneficialOwner",
  identityCheck: "https://solid-mortgage-vocab.vercel.app/mort#identityCheck",
  IdentityCheck: "https://solid-mortgage-vocab.vercel.app/mort#IdentityCheck",
  IdentityCheckMethod_Documentary:
    "https://solid-mortgage-vocab.vercel.app/mort#IdentityCheckMethod-Documentary",
  IdentityCheckMethod_GovernmentList:
    "https://solid-mortgage-vocab.vercel.app/mort#IdentityCheckMethod-GovernmentList",
  IdentityCheckMethod_NonDocumentary:
    "https://solid-mortgage-vocab.vercel.app/mort#IdentityCheckMethod-NonDocumentary",
  IdentityCheckMethodScheme:
    "https://solid-mortgage-vocab.vercel.app/mort#IdentityCheckMethodScheme",
  IdentityCredential: "https://solid-mortgage-vocab.vercel.app/mort#IdentityCredential",
  inflowUsd: "https://solid-mortgage-vocab.vercel.app/mort#inflowUsd",
  intentToProceedDate: "https://solid-mortgage-vocab.vercel.app/mort#intentToProceedDate",
  isIllustrativeLei: "https://solid-mortgage-vocab.vercel.app/mort#isIllustrativeLei",
  keyFactor: "https://solid-mortgage-vocab.vercel.app/mort#keyFactor",
  KycAttestationCredential: "https://solid-mortgage-vocab.vercel.app/mort#KycAttestationCredential",
  latePaymentCount: "https://solid-mortgage-vocab.vercel.app/mort#latePaymentCount",
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
  MessageKind_PayoutConfirmation:
    "https://solid-mortgage-vocab.vercel.app/mort#MessageKind-PayoutConfirmation",
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
  MessageKind_RepaymentFurnishing:
    "https://solid-mortgage-vocab.vercel.app/mort#MessageKind-RepaymentFurnishing",
  MessageKind_ScoreDelivery:
    "https://solid-mortgage-vocab.vercel.app/mort#MessageKind-ScoreDelivery",
  MessageKind_ScoreInquiry: "https://solid-mortgage-vocab.vercel.app/mort#MessageKind-ScoreInquiry",
  MessageKind_ServiceOrder: "https://solid-mortgage-vocab.vercel.app/mort#MessageKind-ServiceOrder",
  MessageKind_ServicingBoarding:
    "https://solid-mortgage-vocab.vercel.app/mort#MessageKind-ServicingBoarding",
  MessageKindScheme: "https://solid-mortgage-vocab.vercel.app/mort#MessageKindScheme",
  monthlyCashFlow: "https://solid-mortgage-vocab.vercel.app/mort#monthlyCashFlow",
  MonthlyCashFlow: "https://solid-mortgage-vocab.vercel.app/mort#MonthlyCashFlow",
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
  nsf90Count: "https://solid-mortgage-vocab.vercel.app/mort#nsf90Count",
  observationMonths: "https://solid-mortgage-vocab.vercel.app/mort#observationMonths",
  OfficerAuthorisationCredential:
    "https://solid-mortgage-vocab.vercel.app/mort#OfficerAuthorisationCredential",
  onTimePaymentCount: "https://solid-mortgage-vocab.vercel.app/mort#onTimePaymentCount",
  operandEnc: "https://solid-mortgage-vocab.vercel.app/mort#operandEnc",
  OrganisationalIdentityCredential:
    "https://solid-mortgage-vocab.vercel.app/mort#OrganisationalIdentityCredential",
  outflowUsd: "https://solid-mortgage-vocab.vercel.app/mort#outflowUsd",
  ownerPolicyAmount: "https://solid-mortgage-vocab.vercel.app/mort#ownerPolicyAmount",
  ownershipPercentageBps: "https://solid-mortgage-vocab.vercel.app/mort#ownershipPercentageBps",
  parcelNumber: "https://solid-mortgage-vocab.vercel.app/mort#parcelNumber",
  payee: "https://solid-mortgage-vocab.vercel.app/mort#payee",
  paymentIntervalDays: "https://solid-mortgage-vocab.vercel.app/mort#paymentIntervalDays",
  PaymentMandate: "https://solid-mortgage-vocab.vercel.app/mort#PaymentMandate",
  paymentProtectionEnds: "https://solid-mortgage-vocab.vercel.app/mort#paymentProtectionEnds",
  paymentRail: "https://solid-mortgage-vocab.vercel.app/mort#paymentRail",
  PaymentRail_PushToCard: "https://solid-mortgage-vocab.vercel.app/mort#PaymentRail-PushToCard",
  PaymentRailScheme: "https://solid-mortgage-vocab.vercel.app/mort#PaymentRailScheme",
  PayoutInstruction: "https://solid-mortgage-vocab.vercel.app/mort#PayoutInstruction",
  periodStart: "https://solid-mortgage-vocab.vercel.app/mort#periodStart",
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
  RepaymentHistoryCredential:
    "https://solid-mortgage-vocab.vercel.app/mort#RepaymentHistoryCredential",
  roofType: "https://solid-mortgage-vocab.vercel.app/mort#roofType",
  scheduledPaymentCount: "https://solid-mortgage-vocab.vercel.app/mort#scheduledPaymentCount",
  scoreDisclosure: "https://solid-mortgage-vocab.vercel.app/mort#scoreDisclosure",
  scoreModel: "https://solid-mortgage-vocab.vercel.app/mort#scoreModel",
  ScoreModel_CashFlowV1: "https://solid-mortgage-vocab.vercel.app/mort#ScoreModel-CashFlowV1",
  ScoreModel_ClassicFICO: "https://solid-mortgage-vocab.vercel.app/mort#ScoreModel-ClassicFICO",
  ScoreModel_FICO8: "https://solid-mortgage-vocab.vercel.app/mort#ScoreModel-FICO8",
  ScoreModel_VantageScore4: "https://solid-mortgage-vocab.vercel.app/mort#ScoreModel-VantageScore4",
  ScoreModelScheme: "https://solid-mortgage-vocab.vercel.app/mort#ScoreModelScheme",
  searchedThrough: "https://solid-mortgage-vocab.vercel.app/mort#searchedThrough",
  servicedLoan: "https://solid-mortgage-vocab.vercel.app/mort#servicedLoan",
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
  TaxComplianceCredential: "https://solid-mortgage-vocab.vercel.app/mort#TaxComplianceCredential",
  taxComplianceStatus: "https://solid-mortgage-vocab.vercel.app/mort#taxComplianceStatus",
  TaxComplianceStatus_Compliant:
    "https://solid-mortgage-vocab.vercel.app/mort#TaxComplianceStatus-Compliant",
  TaxComplianceStatus_NotCompliant:
    "https://solid-mortgage-vocab.vercel.app/mort#TaxComplianceStatus-NotCompliant",
  TaxComplianceStatusScheme:
    "https://solid-mortgage-vocab.vercel.app/mort#TaxComplianceStatusScheme",
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
  totalOfPayments: "https://solid-mortgage-vocab.vercel.app/mort#totalOfPayments",
  transferee: "https://solid-mortgage-vocab.vercel.app/mort#transferee",
  transferEffectiveDate: "https://solid-mortgage-vocab.vercel.app/mort#transferEffectiveDate",
  transferor: "https://solid-mortgage-vocab.vercel.app/mort#transferor",
  TrustedIssuerList: "https://solid-mortgage-vocab.vercel.app/mort#TrustedIssuerList",
  TurnoverBand_1MTo5M: "https://solid-mortgage-vocab.vercel.app/mort#TurnoverBand-1MTo5M",
  TurnoverBand_500kTo1M: "https://solid-mortgage-vocab.vercel.app/mort#TurnoverBand-500kTo1M",
  TurnoverBand_Over5M: "https://solid-mortgage-vocab.vercel.app/mort#TurnoverBand-Over5M",
  TurnoverBand_Under500k: "https://solid-mortgage-vocab.vercel.app/mort#TurnoverBand-Under500k",
  TurnoverBandScheme: "https://solid-mortgage-vocab.vercel.app/mort#TurnoverBandScheme",
  underwritingCondition: "https://solid-mortgage-vocab.vercel.app/mort#underwritingCondition",
  vestedOwner: "https://solid-mortgage-vocab.vercel.app/mort#vestedOwner",
  ZkOperandAnchor: "https://solid-mortgage-vocab.vercel.app/mort#ZkOperandAnchor",
} as const;

/** Constant keys of the mort vocabulary. */
export type MortTermKey = keyof typeof MORT;

/** Term IRIs of the mort vocabulary. */
export type MortTermIri = (typeof MORT)[MortTermKey];
