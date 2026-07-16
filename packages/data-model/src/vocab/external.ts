/**
 * IRI constants for the real, dereferenceable external vocabularies the mortgage
 * mortgage resources use (SPEC section 5; decision 0010: no minted IRIs -
 * project residue terms live in ./mort.js, generated from vocab/mort.ttl).
 *
 * Only terms the typed wrappers actually read or write are bound here; the
 * SHACL shapes in shapes/*.ttl remain the authority on each term's role.
 */

export const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

const XSD_NS = "http://www.w3.org/2001/XMLSchema#";

/** XSD datatypes needed by the custom literal mappings in wrappers/mappings.ts. */
export const XSD = {
  date: `${XSD_NS}date`,
  decimal: `${XSD_NS}decimal`,
} as const;

const SCHEMA_NS = "https://schema.org/";

/** schema.org terms (person/address/org/money display fields, vocab.md section 3). */
export const SCHEMA = {
  DepositAccount: `${SCHEMA_NS}DepositAccount`,
  MonetaryAmount: `${SCHEMA_NS}MonetaryAmount`,
  Organization: `${SCHEMA_NS}Organization`,
  Person: `${SCHEMA_NS}Person`,
  PostalAddress: `${SCHEMA_NS}PostalAddress`,
  address: `${SCHEMA_NS}address`,
  addressLocality: `${SCHEMA_NS}addressLocality`,
  addressRegion: `${SCHEMA_NS}addressRegion`,
  amount: `${SCHEMA_NS}amount`,
  birthDate: `${SCHEMA_NS}birthDate`,
  currency: `${SCHEMA_NS}currency`,
  email: `${SCHEMA_NS}email`,
  interestRate: `${SCHEMA_NS}interestRate`,
  jobTitle: `${SCHEMA_NS}jobTitle`,
  name: `${SCHEMA_NS}name`,
  owns: `${SCHEMA_NS}owns`,
  postalCode: `${SCHEMA_NS}postalCode`,
  provider: `${SCHEMA_NS}provider`,
  startDate: `${SCHEMA_NS}startDate`,
  streetAddress: `${SCHEMA_NS}streetAddress`,
  telephone: `${SCHEMA_NS}telephone`,
  value: `${SCHEMA_NS}value`,
  worksFor: `${SCHEMA_NS}worksFor`,
} as const;

const CRED_NS = "https://www.w3.org/2018/credentials#";

/** W3C VC 2.0 terms (decision 0004: VC rails). */
export const CRED = {
  VerifiableCredential: `${CRED_NS}VerifiableCredential`,
  credentialSchema: `${CRED_NS}credentialSchema`,
  credentialStatus: `${CRED_NS}credentialStatus`,
  credentialSubject: `${CRED_NS}credentialSubject`,
  evidence: `${CRED_NS}evidence`,
  issuer: `${CRED_NS}issuer`,
  validFrom: `${CRED_NS}validFrom`,
  validUntil: `${CRED_NS}validUntil`,
} as const;

const DCTERMS_NS = "http://purl.org/dc/terms/";

/**
 * Dublin Core terms standing in where FIBO's own properties require OMG
 * Commons nodes whose term IRIs do not dereference (see shapes/*.ttl notes).
 */
export const DCTERMS = {
  created: `${DCTERMS_NS}created`,
  creator: `${DCTERMS_NS}creator`,
  issued: `${DCTERMS_NS}issued`,
  type: `${DCTERMS_NS}type`,
} as const;

const DPV_NS = "https://w3id.org/dpv#";

/** DPV consent-receipt terms (decision 0006 app-level ledger). */
export const DPV = {
  ConsentGiven: `${DPV_NS}ConsentGiven`,
  ConsentReceipt: `${DPV_NS}ConsentReceipt`,
  ConsentWithdrawn: `${DPV_NS}ConsentWithdrawn`,
  hasConsentStatus: `${DPV_NS}hasConsentStatus`,
  hasDataController: `${DPV_NS}hasDataController`,
  hasDataSubject: `${DPV_NS}hasDataSubject`,
} as const;

const ODRL_NS = "http://www.w3.org/ns/odrl/2/";

/** ODRL relation used to identify the pod resource covered by a receipt. */
export const ODRL = {
  target: `${ODRL_NS}target`,
} as const;

const FIBO_NS = "https://spec.edmcouncil.org/fibo/ontology/";
const FBC_DEBT = `${FIBO_NS}FBC/DebtAndEquities/Debt/`;
const LOAN_APP = `${FIBO_NS}LOAN/LoansGeneral/LoanApplications/`;
const LOAN_LOANS = `${FIBO_NS}LOAN/LoansGeneral/Loans/`;
const LOAN_MTG = `${FIBO_NS}LOAN/RealEstateLoans/Mortgages/`;
const LOAN_ORIG = `${FIBO_NS}LOAN/RealEstateLoans/MortgageOrigination/`;
const FND_ASMT = `${FIBO_NS}FND/Arrangements/Assessments/`;
const FND_REP = `${FIBO_NS}FND/Arrangements/Reporting/`;
const FND_RP = `${FIBO_NS}FND/Places/RealProperty/`;
const FND_REL = `${FIBO_NS}FND/Relations/Relations/`;

/** FIBO classes, properties and URLA-aligned named individuals (SPEC section 5). */
export const FIBO = {
  // Classes
  Appraisal: `${FND_ASMT}Appraisal`,
  AppraisedValue: `${FND_ASMT}AppraisedValue`,
  Appraiser: `${FND_ASMT}Appraiser`,
  Borrower: `${FBC_DEBT}Borrower`,
  LoanApplication: `${LOAN_APP}LoanApplication`,
  Mortgage: `${LOAN_MTG}Mortgage`,
  RealEstate: `${FND_RP}RealEstate`,
  Servicer: `${LOAN_LOANS}Servicer`,
  UnderwritingDecision: `${LOAN_APP}UnderwritingDecision`,
  // Properties
  evaluates: `${FND_REL}evaluates`,
  hasApprovedAmount: `${LOAN_APP}hasApprovedAmount`,
  hasBorrower: `${FBC_DEBT}hasBorrower`,
  hasEstimatedValue: `${FND_ASMT}hasEstimatedValue`,
  hasPrincipalAmount: `${LOAN_LOANS}hasPrincipalAmount`,
  hasRequestedAmount: `${LOAN_APP}hasRequestedAmount`,
  hasTotalClosingCosts: `${LOAN_LOANS}hasTotalClosingCosts`,
  isGeneratedBy: `${FND_REL}isGeneratedBy`,
  isServicedBy: `${LOAN_LOANS}isServicedBy`,
  isSubmittedBy: `${FND_REP}isSubmittedBy`,
  // URLA section 4a controlled vocabularies (FIBO named individuals)
  MortgageLoanPurpose_BusinessOrCommercial: `${LOAN_ORIG}MortgageLoanPurpose-BusinessOrCommercial`,
  MortgageLoanPurpose_DwellingConstruction: `${LOAN_ORIG}MortgageLoanPurpose-DwellingConstruction`,
  MortgageLoanPurpose_HomeImprovement: `${LOAN_ORIG}MortgageLoanPurpose-HomeImprovement`,
  MortgageLoanPurpose_LoanRefinancing: `${LOAN_ORIG}MortgageLoanPurpose-LoanRefinancing`,
  MortgageLoanPurpose_MortgageModification: `${LOAN_ORIG}MortgageLoanPurpose-MortgageModification`,
  MortgageLoanPurpose_RealPropertyPurchase: `${LOAN_ORIG}MortgageLoanPurpose-RealPropertyPurchase`,
  PropertyUsage_investment: `${LOAN_ORIG}PropertyUsage-investment`,
  PropertyUsage_primaryResidence: `${LOAN_ORIG}PropertyUsage-primaryResidence`,
  PropertyUsage_secondHome: `${LOAN_ORIG}PropertyUsage-secondHome`,
  AmortizationType_adjustableRate: `${LOAN_ORIG}AmortizationType-adjustableRate`,
  AmortizationType_fixedRate: `${LOAN_ORIG}AmortizationType-fixedRate`,
  AmortizationType_graduatedPayment: `${LOAN_ORIG}AmortizationType-graduatedPayment`,
  AmortizationType_graduatedPaymentAdjustable: `${LOAN_ORIG}AmortizationType-graduatedPaymentAdjustable`,
  AmortizationType_growingEquity: `${LOAN_ORIG}AmortizationType-growingEquity`,
  AmortizationType_rateImprovement: `${LOAN_ORIG}AmortizationType-rateImprovement`,
  AmortizationType_step: `${LOAN_ORIG}AmortizationType-step`,
  CashOutStatus_CashOut: `${LOAN_ORIG}CashOutStatus-CashOut`,
  CashOutStatus_LimitedCashOut: `${LOAN_ORIG}CashOutStatus-LimitedCashOut`,
  CashOutStatus_NoCashOut: `${LOAN_ORIG}CashOutStatus-NoCashOut`,
  // AUS recommendation codes (FIBO named individuals, scene 4)
  UnderwritingDecision_Approve: `${LOAN_APP}UnderwritingDecision-Approve`,
  UnderwritingDecision_Deny: `${LOAN_APP}UnderwritingDecision-Deny`,
  UnderwritingDecision_Eligible: `${LOAN_APP}UnderwritingDecision-Eligible`,
  UnderwritingDecision_Ineligible: `${LOAN_APP}UnderwritingDecision-Ineligible`,
  UnderwritingDecision_Refer: `${LOAN_APP}UnderwritingDecision-Refer`,
  UnderwritingDecision_UnableToDetermine: `${LOAN_APP}UnderwritingDecision-UnableToDetermine`,
} as const;

/** Prefix map for Turtle serialisation of the mortgage resources. */
export const TURTLE_PREFIXES: Readonly<Record<string, string>> = {
  cred: CRED_NS,
  dcterms: DCTERMS_NS,
  dpv: DPV_NS,
  "fibo-fbc-dae-dbt": FBC_DEBT,
  "fibo-fnd-arr-asmt": FND_ASMT,
  "fibo-fnd-arr-rep": FND_REP,
  "fibo-fnd-plc-rp": FND_RP,
  "fibo-fnd-rel-rel": FND_REL,
  "fibo-loan-ln-app": LOAN_APP,
  "fibo-loan-ln-ln": LOAN_LOANS,
  "fibo-loan-reln-mtg": LOAN_MTG,
  "fibo-loan-reln-org": LOAN_ORIG,
  mort: "https://solid-mortgage-vocab.vercel.app/mort#",
  odrl: ODRL_NS,
  schema: SCHEMA_NS,
  xsd: XSD_NS,
};
