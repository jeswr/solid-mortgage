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
  boolean: `${XSD_NS}boolean`,
  date: `${XSD_NS}date`,
  dateTime: `${XSD_NS}dateTime`,
  decimal: `${XSD_NS}decimal`,
} as const;

const SCHEMA_NS = "https://schema.org/";

/** schema.org terms (person/address/org/money display fields, vocab.md section 3). */
export const SCHEMA = {
  ContactPoint: `${SCHEMA_NS}ContactPoint`,
  DepositAccount: `${SCHEMA_NS}DepositAccount`,
  DigitalDocument: `${SCHEMA_NS}DigitalDocument`,
  MonetaryAmount: `${SCHEMA_NS}MonetaryAmount`,
  Order: `${SCHEMA_NS}Order`,
  OrderDelivered: `${SCHEMA_NS}OrderDelivered`,
  OrderProcessing: `${SCHEMA_NS}OrderProcessing`,
  Organization: `${SCHEMA_NS}Organization`,
  Person: `${SCHEMA_NS}Person`,
  PostalAddress: `${SCHEMA_NS}PostalAddress`,
  QuantitativeValue: `${SCHEMA_NS}QuantitativeValue`,
  SingleFamilyResidence: `${SCHEMA_NS}SingleFamilyResidence`,
  about: `${SCHEMA_NS}about`,
  address: `${SCHEMA_NS}address`,
  addressLocality: `${SCHEMA_NS}addressLocality`,
  addressRegion: `${SCHEMA_NS}addressRegion`,
  amount: `${SCHEMA_NS}amount`,
  birthDate: `${SCHEMA_NS}birthDate`,
  buyer: `${SCHEMA_NS}buyer`,
  currency: `${SCHEMA_NS}currency`,
  customer: `${SCHEMA_NS}customer`,
  description: `${SCHEMA_NS}description`,
  email: `${SCHEMA_NS}email`,
  expires: `${SCHEMA_NS}expires`,
  floorSize: `${SCHEMA_NS}floorSize`,
  identifier: `${SCHEMA_NS}identifier`,
  interestRate: `${SCHEMA_NS}interestRate`,
  jobTitle: `${SCHEMA_NS}jobTitle`,
  name: `${SCHEMA_NS}name`,
  numberOfBathroomsTotal: `${SCHEMA_NS}numberOfBathroomsTotal`,
  numberOfBedrooms: `${SCHEMA_NS}numberOfBedrooms`,
  orderDate: `${SCHEMA_NS}orderDate`,
  orderNumber: `${SCHEMA_NS}orderNumber`,
  orderStatus: `${SCHEMA_NS}orderStatus`,
  owns: `${SCHEMA_NS}owns`,
  postalCode: `${SCHEMA_NS}postalCode`,
  provider: `${SCHEMA_NS}provider`,
  seller: `${SCHEMA_NS}seller`,
  sha256: `${SCHEMA_NS}sha256`,
  startDate: `${SCHEMA_NS}startDate`,
  streetAddress: `${SCHEMA_NS}streetAddress`,
  telephone: `${SCHEMA_NS}telephone`,
  unitCode: `${SCHEMA_NS}unitCode`,
  url: `${SCHEMA_NS}url`,
  validFrom: `${SCHEMA_NS}validFrom`,
  validThrough: `${SCHEMA_NS}validThrough`,
  value: `${SCHEMA_NS}value`,
  worksFor: `${SCHEMA_NS}worksFor`,
  yearBuilt: `${SCHEMA_NS}yearBuilt`,
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
  description: `${DCTERMS_NS}description`,
  issued: `${DCTERMS_NS}issued`,
  source: `${DCTERMS_NS}source`,
  type: `${DCTERMS_NS}type`,
} as const;

const DPV_NS = "https://w3id.org/dpv#";

/** DPV consent-receipt terms (decision 0006 app-level ledger). */
export const DPV = {
  ConsentExpired: `${DPV_NS}ConsentExpired`,
  ConsentGiven: `${DPV_NS}ConsentGiven`,
  ConsentReceipt: `${DPV_NS}ConsentReceipt`,
  ConsentWithdrawn: `${DPV_NS}ConsentWithdrawn`,
  CreditChecking: `${DPV_NS}CreditChecking`,
  IdentityVerification: `${DPV_NS}IdentityVerification`,
  ServiceProvision: `${DPV_NS}ServiceProvision`,
  hasConsentStatus: `${DPV_NS}hasConsentStatus`,
  hasDataController: `${DPV_NS}hasDataController`,
  hasDataSubject: `${DPV_NS}hasDataSubject`,
  hasPolicy: `${DPV_NS}hasPolicy`,
  hasPurpose: `${DPV_NS}hasPurpose`,
} as const;

const ODRL_NS = "http://www.w3.org/ns/odrl/2/";

/** ODRL terms: the receipt's target, and the request and agreement policies of a grant. */
export const ODRL = {
  Agreement: `${ODRL_NS}Agreement`,
  Request: `${ODRL_NS}Request`,
  action: `${ODRL_NS}action`,
  append: `${ODRL_NS}append`,
  assignee: `${ODRL_NS}assignee`,
  assigner: `${ODRL_NS}assigner`,
  constraint: `${ODRL_NS}constraint`,
  dateTime: `${ODRL_NS}dateTime`,
  eq: `${ODRL_NS}eq`,
  event: `${ODRL_NS}event`,
  leftOperand: `${ODRL_NS}leftOperand`,
  lt: `${ODRL_NS}lt`,
  lteq: `${ODRL_NS}lteq`,
  operator: `${ODRL_NS}operator`,
  permission: `${ODRL_NS}permission`,
  purpose: `${ODRL_NS}purpose`,
  read: `${ODRL_NS}read`,
  rightOperand: `${ODRL_NS}rightOperand`,
  target: `${ODRL_NS}target`,
  write: `${ODRL_NS}write`,
} as const;

const AS_NS = "https://www.w3.org/ns/activitystreams#";

/** ActivityStreams 2.0 terms for organisation-to-organisation inbox messages. */
export const AS = {
  Announce: `${AS_NS}Announce`,
  actor: `${AS_NS}actor`,
  inReplyTo: `${AS_NS}inReplyTo`,
  object: `${AS_NS}object`,
  published: `${AS_NS}published`,
  summary: `${AS_NS}summary`,
} as const;

const FOAF_NS = "http://xmlns.com/foaf/0.1/";

/** FOAF terms of a WebID profile document. */
export const FOAF = {
  Agent: `${FOAF_NS}Agent`,
  PersonalProfileDocument: `${FOAF_NS}PersonalProfileDocument`,
  primaryTopic: `${FOAF_NS}primaryTopic`,
} as const;

/** Solid / LDP terms of a WebID profile. */
export const SOLID_TERMS = {
  inbox: "http://www.w3.org/ns/ldp#inbox",
  storage: "http://www.w3.org/ns/pim/space#storage",
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
  as: AS_NS,
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
  foaf: FOAF_NS,
  ldp: "http://www.w3.org/ns/ldp#",
  mort: "https://solid-mortgage-vocab.vercel.app/mort#",
  odrl: ODRL_NS,
  pim: "http://www.w3.org/ns/pim/space#",
  schema: SCHEMA_NS,
  xsd: XSD_NS,
};
