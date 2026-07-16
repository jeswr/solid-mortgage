import type { Term } from "@rdfjs/types";
import { type ITermWrapperConstructor, RequiredAs, TermFrom } from "@rdfjs/wrapper";
import { DataFactory, Store } from "n3";
import { CRED, DPV, FIBO, SCHEMA } from "../vocab/external.js";
import { MORT } from "../vocab/mort.js";
import {
  AppraisalCredential,
  AssetCredential,
  BorrowerProfile,
  ClosingRecord,
  ConsentReceipt,
  type CredentialResource,
  CreditScoreCredential,
  EmploymentIncomeCredential,
  LoanApplication,
  TitleClearCredential,
  UnderwritingDecision,
  ZkOperandAnchor,
} from "./resources.js";
import {
  Appraiser,
  DepositAccount,
  MonetaryAmount,
  OrganizationNode,
  PostalAddress,
  RealEstateProperty,
  type TypedNode,
} from "./support.js";

/**
 * Build functions: plain init objects in, shape-conforming wrapper instances
 * out. Every triple is created through the `@rdfjs/wrapper` accessors (house
 * rule - no hand-built quads, no string Turtle), into a fresh `n3.Store` with
 * one shared `DataFactory`.
 *
 * Determinism: blank nodes carry explicit, per-document-unique labels and
 * every builder adds triples in a fixed order, so identical inits serialise
 * to byte-identical Turtle (the persona fixtures rely on this).
 */

function newDocument(rootIri: string): { store: Store; root: Term } {
  const store = new Store();
  return { store, root: DataFactory.namedNode(rootIri) };
}

/** Link `parent --predicate--> node` through the wrapper layer. */
function link(parent: TypedNode, predicate: string, node: Term): void {
  RequiredAs.object(parent, predicate, node, TermFrom.itself);
}

function blank(label: string): Term {
  return DataFactory.blankNode(label);
}

function wrap<T>(ctor: ITermWrapperConstructor<T>, term: Term, anchor: TypedNode): T {
  return new ctor(term, anchor.dataset, anchor.factory);
}

export interface PostalAddressInit {
  streetAddress: string;
  addressLocality: string;
  /** Two-letter US state code. */
  addressRegion: string;
  /** US ZIP or ZIP+4. */
  postalCode: string;
}

function addPostalAddress(
  parent: TypedNode,
  predicate: string,
  init: PostalAddressInit,
  label: string,
): void {
  const node = blank(label);
  link(parent, predicate, node);
  const address = wrap(PostalAddress, node, parent);
  address.typeIris.add(SCHEMA.PostalAddress);
  address.streetAddress = init.streetAddress;
  address.addressLocality = init.addressLocality;
  address.addressRegion = init.addressRegion;
  address.postalCode = init.postalCode;
}

function addMonetaryAmount(
  parent: TypedNode,
  predicate: string,
  usd: number,
  label: string,
  extraTypes: readonly string[] = [],
): void {
  const node = blank(label);
  link(parent, predicate, node);
  const amount = wrap(MonetaryAmount, node, parent);
  for (const extra of extraTypes) amount.typeIris.add(extra);
  amount.typeIris.add(SCHEMA.MonetaryAmount);
  amount.amountValue = usd;
  amount.currency = "USD";
}

function addOrganization(
  parent: TypedNode,
  predicate: string,
  name: string,
  label: string,
  extraTypes: readonly string[] = [],
): void {
  const node = blank(label);
  link(parent, predicate, node);
  const organization = wrap(OrganizationNode, node, parent);
  organization.typeIris.add(SCHEMA.Organization);
  for (const extra of extraTypes) organization.typeIris.add(extra);
  organization.organizationName = name;
}

export interface PropertyInit {
  address: PostalAddressInit;
  /** Required on appraisal credentials, optional elsewhere. */
  appraisedValueUsd?: number;
}

function addProperty(
  parent: TypedNode,
  predicate: string,
  init: PropertyInit,
  labelPrefix: string,
): RealEstateProperty {
  const node = blank(`${labelPrefix}Property`);
  link(parent, predicate, node);
  const property = wrap(RealEstateProperty, node, parent);
  property.typeIris.add(FIBO.RealEstate);
  addPostalAddress(property, SCHEMA.address, init.address, `${labelPrefix}PropertyAddress`);
  if (init.appraisedValueUsd !== undefined) {
    addMonetaryAmount(
      property,
      FIBO.hasEstimatedValue,
      init.appraisedValueUsd,
      `${labelPrefix}AppraisedValue`,
      [FIBO.AppraisedValue],
    );
  }
  return property;
}

/** The W3C VC 2.0 envelope shared by the credential builders. */
export interface CredentialEnvelopeInit {
  /** The credential's own pod resource IRI. */
  iri: string;
  /** Issuer identity IRI. */
  issuer: string;
  validFrom: Date;
  validUntil?: Date;
  /** Status-list entry IRI (decision 0012). */
  credentialStatus: string;
  /** The borrower WebID (holder binding, decision 0012). */
  credentialSubject: string;
}

function applyEnvelope(
  credential: CredentialResource,
  init: CredentialEnvelopeInit,
  mortType: string,
): void {
  credential.typeIris.add(CRED.VerifiableCredential);
  credential.typeIris.add(mortType);
  credential.issuer = init.issuer;
  credential.validFrom = init.validFrom;
  if (init.validUntil !== undefined) credential.validUntil = init.validUntil;
  credential.credentialStatusIri = init.credentialStatus;
  credential.credentialSubjectIri = init.credentialSubject;
}

export interface BorrowerProfileInit {
  /** The borrower WebID - the document's root node. */
  webId: string;
  name: string;
  birthDate: Date;
  emails: readonly string[];
  telephone?: string;
  address: PostalAddressInit;
  /** One of {@link MARITAL_STATUS_IRIS}. */
  maritalStatus: string;
}

export function buildBorrowerProfile(init: BorrowerProfileInit): BorrowerProfile {
  const { store, root } = newDocument(init.webId);
  const profile = new BorrowerProfile(root, store, DataFactory);
  profile.typeIris.add(SCHEMA.Person);
  profile.typeIris.add(FIBO.Borrower);
  profile.personName = init.name;
  profile.birthDate = init.birthDate;
  for (const email of init.emails) profile.emails.add(email);
  if (init.telephone !== undefined) profile.telephone = init.telephone;
  addPostalAddress(profile, SCHEMA.address, init.address, "borrowerAddress");
  profile.maritalStatus = init.maritalStatus;
  return profile;
}

export interface EmploymentIncomeCredentialInit extends CredentialEnvelopeInit {
  employerName: string;
  jobTitle: string;
  startDate: Date;
  /** ZK field: whole USD/month inside decision 0005's 4-digit budget. */
  monthlyGrossIncomeUsd: number;
  /** Optional external income-verification report IRI. */
  evidence?: string;
}

export function buildEmploymentIncomeCredential(
  init: EmploymentIncomeCredentialInit,
): EmploymentIncomeCredential {
  const { store, root } = newDocument(init.iri);
  const credential = new EmploymentIncomeCredential(root, store, DataFactory);
  applyEnvelope(credential, init, MORT.EmploymentIncomeCredential);
  if (init.evidence !== undefined) credential.evidenceIri = init.evidence;
  const subject = credential.credentialSubject;
  addOrganization(subject, SCHEMA.worksFor, init.employerName, "employer");
  subject.jobTitle = init.jobTitle;
  subject.startDate = init.startDate;
  subject.monthlyGrossIncomeUsd = init.monthlyGrossIncomeUsd;
  return credential;
}

export interface DepositAccountInit {
  providerName: string;
  balanceUsd: number;
  /** Exactly four digits - the full account number never enters the pod. */
  accountLast4: string;
}

export interface AssetCredentialInit extends CredentialEnvelopeInit {
  accounts: readonly DepositAccountInit[];
}

export function buildAssetCredential(init: AssetCredentialInit): AssetCredential {
  const { store, root } = newDocument(init.iri);
  const credential = new AssetCredential(root, store, DataFactory);
  applyEnvelope(credential, init, MORT.AssetCredential);
  const subject = credential.credentialSubject;
  init.accounts.forEach((accountInit, index) => {
    const node = blank(`account${index}`);
    link(subject, SCHEMA.owns, node);
    const account = wrap(DepositAccount, node, subject);
    account.typeIris.add(SCHEMA.DepositAccount);
    addOrganization(account, SCHEMA.provider, accountInit.providerName, `accountProvider${index}`);
    addMonetaryAmount(account, SCHEMA.amount, accountInit.balanceUsd, `accountBalance${index}`);
    account.accountLast4 = accountInit.accountLast4;
  });
  return credential;
}

export interface CreditScoreCredentialInit extends CredentialEnvelopeInit {
  /** ZK field inside decision 0005's 3-digit budget (300..850). */
  creditScoreValue: number;
  /** ZK field: whole USD/month inside decision 0005's 4-digit budget. */
  totalMonthlyDebtUsd: number;
  /** One of {@link SCORE_MODEL_IRIS}; defaults to FICO 8. */
  scoreModel?: string;
}

export function buildCreditScoreCredential(init: CreditScoreCredentialInit): CreditScoreCredential {
  const { store, root } = newDocument(init.iri);
  const credential = new CreditScoreCredential(root, store, DataFactory);
  applyEnvelope(credential, init, MORT.CreditScoreCredential);
  const subject = credential.credentialSubject;
  subject.creditScoreValue = init.creditScoreValue;
  subject.totalMonthlyDebtUsd = init.totalMonthlyDebtUsd;
  subject.scoreModel = init.scoreModel ?? MORT.ScoreModel_FICO8;
  return credential;
}

export interface AppraisalCredentialInit extends CredentialEnvelopeInit {
  property: PropertyInit & { appraisedValueUsd: number };
  appraiserName: string;
  appraiserLicenseId: string;
  /** The report's `dcterms:issued` date. */
  reportIssued: Date;
}

export function buildAppraisalCredential(init: AppraisalCredentialInit): AppraisalCredential {
  const { store, root } = newDocument(init.iri);
  const credential = new AppraisalCredential(root, store, DataFactory);
  applyEnvelope(credential, init, MORT.AppraisalCredential);
  const subject = credential.credentialSubject;
  const property = addProperty(subject, MORT.subjectProperty, init.property, "appraised");
  // The evidence report must evaluate the SAME property node the subject
  // claims (sh:sparql cross-check in the shape), so the term is shared.
  const evidenceNode = blank("appraisalReport");
  link(credential, CRED.evidence, evidenceNode);
  const evidence = credential.evidence;
  evidence.typeIris.add(FIBO.Appraisal);
  RequiredAs.object(evidence, FIBO.evaluates, property, TermFrom.instance);
  const appraiserNode = blank("appraiser");
  link(evidence, FIBO.isGeneratedBy, appraiserNode);
  const appraiser = wrap(Appraiser, appraiserNode, evidence);
  appraiser.typeIris.add(FIBO.Appraiser);
  appraiser.appraiserName = init.appraiserName;
  appraiser.licenseId = init.appraiserLicenseId;
  evidence.issued = init.reportIssued;
  return credential;
}

export interface TitleClearCredentialInit extends CredentialEnvelopeInit {
  property: PropertyInit;
  /** One of {@link TITLE_STATUS_IRIS}; defaults to clear. */
  titleStatus?: string;
  /** Effective date through which public records were searched. */
  searchedThrough: Date;
  /** Optional title-search report IRI. */
  evidence?: string;
}

export function buildTitleClearCredential(init: TitleClearCredentialInit): TitleClearCredential {
  const { store, root } = newDocument(init.iri);
  const credential = new TitleClearCredential(root, store, DataFactory);
  applyEnvelope(credential, init, MORT.TitleClearCredential);
  if (init.evidence !== undefined) credential.evidenceIri = init.evidence;
  const subject = credential.credentialSubject;
  addProperty(subject, MORT.subjectProperty, init.property, "title");
  subject.titleStatus = init.titleStatus ?? MORT.TitleStatus_Clear;
  subject.searchedThrough = init.searchedThrough;
  return credential;
}

export interface LoanApplicationInit {
  /** The application's own pod resource IRI. */
  iri: string;
  /** URLA application date. */
  created: Date;
  /** The borrower WebID. */
  submittedBy: string;
  requestedAmountUsd: number;
  loanTermMonths: number;
  property: PropertyInit;
  /** One of {@link LOAN_PURPOSE_IRIS}. */
  loanPurpose: string;
  /** One of {@link PROPERTY_USAGE_IRIS}. */
  occupancy: string;
  /** One of {@link AMORTIZATION_TYPE_IRIS}. */
  amortizationType: string;
  /** One of {@link CASH_OUT_STATUS_IRIS} - refinance applications only. */
  cashOutStatus?: string;
}

export function buildLoanApplication(init: LoanApplicationInit): LoanApplication {
  const { store, root } = newDocument(init.iri);
  const application = new LoanApplication(root, store, DataFactory);
  application.typeIris.add(FIBO.LoanApplication);
  application.created = init.created;
  application.submittedByIri = init.submittedBy;
  addMonetaryAmount(
    application,
    FIBO.hasRequestedAmount,
    init.requestedAmountUsd,
    "requestedAmount",
  );
  application.loanTermMonths = init.loanTermMonths;
  addProperty(application, MORT.subjectProperty, init.property, "application");
  application.loanPurpose = init.loanPurpose;
  application.occupancy = init.occupancy;
  application.amortizationType = init.amortizationType;
  if (init.cashOutStatus !== undefined) application.cashOutStatus = init.cashOutStatus;
  return application;
}

export interface UnderwritingDecisionInit {
  /** The decision's own pod resource IRI. */
  iri: string;
  /** The loan-application pod resource this decision evaluates. */
  evaluates: string;
  /** One of {@link DECISION_STATUS_IRIS}. */
  decisionStatus: string;
  conditions?: readonly string[];
  approvedAmountUsd?: number;
  /** One of {@link AUS_RECOMMENDATION_IRIS}. */
  ausRecommendation?: string;
  issued: Date;
  /** The deciding lender (or AUS) WebID. */
  creator: string;
}

export function buildUnderwritingDecision(init: UnderwritingDecisionInit): UnderwritingDecision {
  const { store, root } = newDocument(init.iri);
  const decision = new UnderwritingDecision(root, store, DataFactory);
  decision.typeIris.add(FIBO.UnderwritingDecision);
  decision.evaluatesIri = init.evaluates;
  decision.decisionStatus = init.decisionStatus;
  for (const condition of init.conditions ?? []) decision.conditions.add(condition);
  if (init.approvedAmountUsd !== undefined) {
    addMonetaryAmount(decision, FIBO.hasApprovedAmount, init.approvedAmountUsd, "approvedAmount");
  }
  if (init.ausRecommendation !== undefined) decision.ausRecommendation = init.ausRecommendation;
  decision.issued = init.issued;
  decision.creatorIri = init.creator;
  return decision;
}

export interface ClosingRecordInit {
  /** The closing record's own pod resource IRI. */
  iri: string;
  /** The borrower WebID. */
  borrower: string;
  property: PropertyInit;
  principalUsd: number;
  closingCostsUsd?: number;
  /** Display note rate in percent (e.g. 6.125). */
  interestRatePercent: number;
  loanTermMonths: number;
  closingDate: Date;
  recordingReference: string;
  /** Borrower-facing simulated registry reference; never the authoritative eNote. */
  eNoteReference: string;
  servicerName: string;
}

export function buildClosingRecord(init: ClosingRecordInit): ClosingRecord {
  const { store, root } = newDocument(init.iri);
  const record = new ClosingRecord(root, store, DataFactory);
  record.typeIris.add(FIBO.Mortgage);
  record.borrowerIri = init.borrower;
  addProperty(record, MORT.subjectProperty, init.property, "closing");
  addMonetaryAmount(record, FIBO.hasPrincipalAmount, init.principalUsd, "principalAmount");
  if (init.closingCostsUsd !== undefined) {
    addMonetaryAmount(record, FIBO.hasTotalClosingCosts, init.closingCostsUsd, "closingCosts");
  }
  record.interestRatePercent = init.interestRatePercent;
  record.loanTermMonths = init.loanTermMonths;
  record.closingDate = init.closingDate;
  record.recordingReference = init.recordingReference;
  record.eNoteReference = init.eNoteReference;
  addOrganization(record, FIBO.isServicedBy, init.servicerName, "servicer", [FIBO.Servicer]);
  return record;
}

export interface ConsentReceiptInit {
  iri: string;
  dataSubject: string;
  dataController: string;
  target: string;
  /** One of `CONSENT_STATUS_IRIS`. */
  consentStatus: string;
  issued: Date;
}

/** Build one SHACL-validated app-level consent receipt (decision 0006). */
export function buildConsentReceipt(init: ConsentReceiptInit): ConsentReceipt {
  const { store, root } = newDocument(init.iri);
  const receipt = new ConsentReceipt(root, store, DataFactory);
  receipt.typeIris.add(DPV.ConsentReceipt);
  receipt.dataSubjectIri = init.dataSubject;
  receipt.dataControllerIri = init.dataController;
  receipt.targetIri = init.target;
  receipt.consentStatus = init.consentStatus;
  receipt.issued = init.issued;
  return receipt;
}

export interface ZkOperandAnchorInit extends CredentialEnvelopeInit {
  /** One of decision 0005's ZK field IRIs (ZK_ANCHORABLE_FIELD_IRIS). */
  field: string;
  /** Deterministic sparq operand encoding (0x-prefixed lowercase hex). */
  operandEnc: string;
}

export function buildZkOperandAnchor(init: ZkOperandAnchorInit): ZkOperandAnchor {
  const { store, root } = newDocument(init.iri);
  const anchor = new ZkOperandAnchor(root, store, DataFactory);
  applyEnvelope(anchor, init, MORT.ZkOperandAnchor);
  const subject = anchor.credentialSubject;
  subject.fieldIri = init.field;
  subject.operandEnc = init.operandEnc;
  return anchor;
}
