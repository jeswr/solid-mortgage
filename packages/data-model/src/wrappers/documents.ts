// AUTHORED-BY Claude Fable 5.2
import { DataFactory, Store } from "n3";
import type { MortgageResourceKind } from "../shacl.js";
import { DCTERMS, FIBO, FOAF, SCHEMA, SOLID_TERMS } from "../vocab/external.js";
import { MORT } from "../vocab/mort.js";
import {
  type AddressFields,
  addChild,
  child,
  children,
  date,
  dateTime,
  iri,
  iriSet,
  num,
  optDate,
  optIri,
  optNum,
  optStr,
  optSubjectProperty,
  optUsd,
  setAddress,
  setDate,
  setDateTime,
  setDecimal,
  setInt,
  setIri,
  setOptDate,
  setOptInt,
  setOptIri,
  setOptStr,
  setOrganization,
  setStr,
  setSubjectProperty,
  setUsd,
  str,
  strSet,
  subjectProperty,
  usd,
} from "./fields.js";
import { MortgageResource } from "./resources.js";
import { OrganizationNode, PostalAddress, type RealEstateProperty, TypedNode } from "./support.js";

/**
 * Typed wrappers and builders for the documents of the static rebuild (decision 0017,
 * design.md §b.4): what is seeded into the pod and what organisations deliver to it. One class
 * and one `build…` function per SHACL shape in shapes/. Reading and building both go through
 * these classes; `resourceToTurtle()` validates the document against its shape before any
 * bytes leave the process.
 */

function root<T>(
  ctor: new (
    term: ReturnType<typeof DataFactory.namedNode>,
    store: Store,
    factory: typeof DataFactory,
  ) => T,
  resourceIri: string,
): T {
  return new ctor(DataFactory.namedNode(resourceIri), new Store(), DataFactory);
}

/** Value space of `mort:scoreModel`. */
export const DISCLOSED_SCORE_MODEL_IRIS = [
  MORT.ScoreModel_FICO8,
  MORT.ScoreModel_ClassicFICO,
  MORT.ScoreModel_VantageScore4,
] as const;

/** Value space of `dcterms:type` on a loan transfer notice. */
export const NOTICE_KIND_IRIS = [
  MORT.NoticeKind_ServicingTransferFromTransferor,
  MORT.NoticeKind_ServicingTransferFromTransferee,
  MORT.NoticeKind_OwnershipTransfer,
] as const;

function assertOneOf(label: string, value: string, allowed: readonly string[]): void {
  if (!allowed.includes(value)) {
    throw new RangeError(`${label} must be one of ${allowed.join(", ")}; got ${value}`);
  }
}

// ── Profile and contact ──────────────────────────────────────────────────────────────────

/** The person or organisation a WebID profile describes (mshape:AgentShape). */
export class ProfileAgent extends TypedNode {
  get name(): string {
    return str(this, SCHEMA.name);
  }
  set name(value: string) {
    setStr(this, SCHEMA.name, value);
  }
  get inboxIri(): string | undefined {
    return optIri(this, SOLID_TERMS.inbox);
  }
  set inboxIri(value: string | undefined) {
    setOptIri(this, SOLID_TERMS.inbox, value);
  }
  get storageIri(): string | undefined {
    return optIri(this, SOLID_TERMS.storage);
  }
  set storageIri(value: string | undefined) {
    setOptIri(this, SOLID_TERMS.storage, value);
  }
  /** How the person will hold title (read by the title agent under G6). */
  get titleVesting(): string | undefined {
    return optStr(this, MORT.titleVesting);
  }
  set titleVesting(value: string | undefined) {
    setOptStr(this, MORT.titleVesting, value);
  }
}

/** A WebID profile document, `profile/card` (mshape:AgentProfileShape). */
export class AgentProfile extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "agent-profile";
  }
  /** The WebID. */
  get primaryTopicIri(): string {
    return iri(this, FOAF.primaryTopic);
  }
  get agent(): ProfileAgent {
    return child(this, FOAF.primaryTopic, ProfileAgent);
  }
}

export interface AgentProfileInit {
  /** The profile document IRI (the WebID without its fragment). */
  iri: string;
  /** The WebID. */
  webId: string;
  kind: "person" | "organisation";
  name: string;
  inbox?: string;
  storage?: string;
  titleVesting?: string;
}

export function buildAgentProfile(init: AgentProfileInit): AgentProfile {
  const profile = root(AgentProfile, init.iri);
  profile.typeIris.add(FOAF.PersonalProfileDocument);
  setIri(profile, FOAF.primaryTopic, init.webId);
  const agent = profile.agent;
  agent.typeIris.add(init.kind === "person" ? SCHEMA.Person : SCHEMA.Organization);
  agent.name = init.name;
  agent.inboxIri = init.inbox;
  agent.storageIri = init.storage;
  agent.titleVesting = init.titleVesting;
  return profile;
}

/** `profile/contact` (mshape:ContactDetailsShape). */
export class ContactDetails extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "contact-details";
  }
  get emails(): Set<string> {
    return strSet(this, SCHEMA.email);
  }
  get telephone(): string | undefined {
    return optStr(this, SCHEMA.telephone);
  }
  set telephone(value: string | undefined) {
    setOptStr(this, SCHEMA.telephone, value);
  }
  get address(): PostalAddress {
    return child(this, SCHEMA.address, PostalAddress);
  }
}

export interface ContactDetailsInit {
  iri: string;
  emails: readonly string[];
  telephone?: string;
  address: AddressFields;
}

export function buildContactDetails(init: ContactDetailsInit): ContactDetails {
  const contact = root(ContactDetails, init.iri);
  contact.typeIris.add(SCHEMA.ContactPoint);
  for (const email of init.emails) contact.emails.add(email);
  contact.telephone = init.telephone;
  setAddress(contact, SCHEMA.address, init.address);
  return contact;
}

// ── Property ─────────────────────────────────────────────────────────────────────────────

/** A party known only by name (mshape:NamedPartyShape). */
export class NamedParty extends TypedNode {
  get name(): string {
    return str(this, SCHEMA.name);
  }
  set name(value: string) {
    setStr(this, SCHEMA.name, value);
  }
}

/** `property/purchase-agreement` (mshape:PurchaseAgreementShape). */
export class PurchaseAgreement extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "purchase-agreement";
  }
  get name(): string {
    return str(this, SCHEMA.name);
  }
  get buyerIri(): string {
    return iri(this, SCHEMA.buyer);
  }
  get sellerName(): string {
    return child(this, SCHEMA.seller, NamedParty).name;
  }
  get purchasePriceUsd(): number {
    return usd(this, MORT.purchasePrice);
  }
  get earnestMoneyDepositUsd(): number | undefined {
    return optUsd(this, MORT.earnestMoneyDeposit);
  }
  get subjectProperty(): RealEstateProperty {
    return subjectProperty(this);
  }
  /** The date the contract was fully signed. */
  get issued(): Date {
    return date(this, DCTERMS.issued);
  }
  /** The closing date the contract schedules. */
  get closingDate(): Date {
    return date(this, MORT.closingDate);
  }
}

export interface PurchaseAgreementInit {
  iri: string;
  name: string;
  /** The buyer's WebID. */
  buyer: string;
  sellerName: string;
  purchasePriceUsd: number;
  earnestMoneyDepositUsd?: number;
  propertyAddress: AddressFields;
  issued: Date;
  closingDate: Date;
}

export function buildPurchaseAgreement(init: PurchaseAgreementInit): PurchaseAgreement {
  const agreement = root(PurchaseAgreement, init.iri);
  agreement.typeIris.add(MORT.PurchaseAgreement);
  setStr(agreement, SCHEMA.name, init.name);
  setIri(agreement, SCHEMA.buyer, init.buyer);
  const seller = addChild(agreement, SCHEMA.seller, NamedParty);
  seller.typeIris.add(SCHEMA.Person);
  seller.name = init.sellerName;
  setUsd(agreement, MORT.purchasePrice, init.purchasePriceUsd);
  if (init.earnestMoneyDepositUsd !== undefined) {
    setUsd(agreement, MORT.earnestMoneyDeposit, init.earnestMoneyDepositUsd);
  }
  setSubjectProperty(agreement, init.propertyAddress);
  setDate(agreement, DCTERMS.issued, init.issued);
  setDate(agreement, MORT.closingDate, init.closingDate);
  return agreement;
}

/** Living area (mshape:FloorSizeShape): square feet. */
class FloorSize extends TypedNode {}

/** `property/subject-property` (mshape:SubjectPropertyShape). */
export class SubjectProperty extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "subject-property";
  }
  get address(): PostalAddress {
    return child(this, SCHEMA.address, PostalAddress);
  }
  get yearBuilt(): number {
    return num(this, SCHEMA.yearBuilt);
  }
  /** Living area in square feet. */
  get floorSizeSqFt(): number {
    return num(child(this, SCHEMA.floorSize, FloorSize), SCHEMA.value);
  }
  get bedrooms(): number | undefined {
    return optNum(this, SCHEMA.numberOfBedrooms);
  }
  get bathrooms(): number | undefined {
    return optNum(this, SCHEMA.numberOfBathroomsTotal);
  }
  get constructionType(): string {
    return str(this, MORT.constructionType);
  }
  get roofType(): string {
    return str(this, MORT.roofType);
  }
  get parcelNumber(): string {
    return str(this, MORT.parcelNumber);
  }
  get legalDescription(): string | undefined {
    return optStr(this, MORT.legalDescription);
  }
}

export interface SubjectPropertyInit {
  iri: string;
  address: AddressFields;
  yearBuilt: number;
  floorSizeSqFt: number;
  bedrooms?: number;
  bathrooms?: number;
  constructionType: string;
  roofType: string;
  parcelNumber: string;
  legalDescription?: string;
}

export function buildSubjectProperty(init: SubjectPropertyInit): SubjectProperty {
  const property = root(SubjectProperty, init.iri);
  property.typeIris.add(SCHEMA.SingleFamilyResidence);
  property.typeIris.add(FIBO.RealEstate);
  setAddress(property, SCHEMA.address, init.address);
  setInt(property, SCHEMA.yearBuilt, init.yearBuilt);
  const size = addChild(property, SCHEMA.floorSize, FloorSize);
  size.typeIris.add(SCHEMA.QuantitativeValue);
  setDecimal(size, SCHEMA.value, init.floorSizeSqFt);
  setStr(size, SCHEMA.unitCode, "FTK");
  setOptInt(property, SCHEMA.numberOfBedrooms, init.bedrooms);
  setOptInt(property, SCHEMA.numberOfBathroomsTotal, init.bathrooms);
  setStr(property, MORT.constructionType, init.constructionType);
  setStr(property, MORT.roofType, init.roofType);
  setStr(property, MORT.parcelNumber, init.parcelNumber);
  setOptStr(property, MORT.legalDescription, init.legalDescription);
  return property;
}

// ── Loan documents ───────────────────────────────────────────────────────────────────────

/** Fields every loan document carries: the loan number, the borrower and who wrote it. */
export abstract class LoanDocument extends MortgageResource {
  get loanNumber(): string {
    return str(this, MORT.loanNumber);
  }
  /** The borrower's WebID. */
  get borrowerIri(): string {
    return iri(this, FIBO.hasBorrower);
  }
  /** The WebID of the organisation that wrote the document. */
  get creatorIri(): string {
    return iri(this, DCTERMS.creator);
  }
  /** The document date (`dcterms:issued`, a calendar date). */
  get issued(): Date {
    return date(this, DCTERMS.issued);
  }
}

export interface LoanDocumentInit {
  iri: string;
  loanNumber: string;
  borrower: string;
  creator: string;
  issued: Date;
}

function applyLoanDocument(document: LoanDocument, init: LoanDocumentInit, type: string): void {
  document.typeIris.add(type);
  setStr(document, MORT.loanNumber, init.loanNumber);
  setIri(document, FIBO.hasBorrower, init.borrower);
  setIri(document, DCTERMS.creator, init.creator);
  setDate(document, DCTERMS.issued, init.issued);
}

/** The loan terms shared by the Loan Estimate and the Closing Disclosure. */
export interface LoanTermsInit {
  principalUsd: number;
  /** Note rate in percent, e.g. 6.5. */
  interestRatePercent: number;
  loanTermMonths: number;
  /** Annual percentage rate in percent. */
  aprPercent: number;
  monthlyPrincipalAndInterestUsd: number;
  estimatedTotalMonthlyPaymentUsd: number;
  closingCostsUsd: number;
  cashToCloseUsd: number;
  propertyAddress: AddressFields;
}

/** A TRID disclosure summary: the Loan Estimate or the Closing Disclosure. */
export abstract class LoanDisclosure extends LoanDocument {
  get name(): string {
    return str(this, SCHEMA.name);
  }
  get principalUsd(): number {
    return usd(this, FIBO.hasPrincipalAmount);
  }
  get interestRatePercent(): number {
    return num(this, SCHEMA.interestRate);
  }
  get loanTermMonths(): number {
    return num(this, MORT.loanTermMonths);
  }
  get aprPercent(): number {
    return num(this, MORT.annualPercentageRate);
  }
  get monthlyPrincipalAndInterestUsd(): number {
    return usd(this, MORT.monthlyPrincipalAndInterest);
  }
  get estimatedTotalMonthlyPaymentUsd(): number {
    return usd(this, MORT.estimatedTotalMonthlyPayment);
  }
  get closingCostsUsd(): number {
    return usd(this, FIBO.hasTotalClosingCosts);
  }
  get cashToCloseUsd(): number {
    return usd(this, MORT.cashToClose);
  }
  get subjectProperty(): RealEstateProperty {
    return subjectProperty(this);
  }
}

function applyLoanTerms(disclosure: LoanDisclosure, terms: LoanTermsInit): void {
  setUsd(disclosure, FIBO.hasPrincipalAmount, terms.principalUsd);
  setDecimal(disclosure, SCHEMA.interestRate, terms.interestRatePercent);
  setInt(disclosure, MORT.loanTermMonths, terms.loanTermMonths);
  setDecimal(disclosure, MORT.annualPercentageRate, terms.aprPercent);
  setUsd(disclosure, MORT.monthlyPrincipalAndInterest, terms.monthlyPrincipalAndInterestUsd);
  setUsd(disclosure, MORT.estimatedTotalMonthlyPayment, terms.estimatedTotalMonthlyPaymentUsd);
  setUsd(disclosure, FIBO.hasTotalClosingCosts, terms.closingCostsUsd);
  setUsd(disclosure, MORT.cashToClose, terms.cashToCloseUsd);
  setSubjectProperty(disclosure, terms.propertyAddress);
}

/** `mortgage/juniper/loan-estimate` (mshape:LoanEstimateShape). `issued` is the delivery date. */
export class LoanEstimate extends LoanDisclosure {
  override get resourceKind(): MortgageResourceKind {
    return "loan-estimate";
  }
  /** The date the creditor had the six items (12 CFR 1026.2(a)(3)(ii)). */
  get applicationDate(): Date {
    return date(this, MORT.applicationDate);
  }
  /** The date the estimate lapses without an intent to proceed. */
  get expires(): Date {
    return date(this, SCHEMA.expires);
  }
  /** Set when the consumer says they intend to proceed. */
  get intentToProceedDate(): Date | undefined {
    return optDate(this, MORT.intentToProceedDate);
  }
  set intentToProceedDate(value: Date | undefined) {
    setOptDate(this, MORT.intentToProceedDate, value);
  }
}

export interface LoanEstimateInit extends LoanDocumentInit, LoanTermsInit {
  name: string;
  applicationDate: Date;
  expires: Date;
  intentToProceedDate?: Date;
}

export function buildLoanEstimate(init: LoanEstimateInit): LoanEstimate {
  const estimate = root(LoanEstimate, init.iri);
  applyLoanDocument(estimate, init, MORT.LoanEstimate);
  setStr(estimate, SCHEMA.name, init.name);
  setDate(estimate, MORT.applicationDate, init.applicationDate);
  setDate(estimate, SCHEMA.expires, init.expires);
  estimate.intentToProceedDate = init.intentToProceedDate;
  applyLoanTerms(estimate, init);
  return estimate;
}

/** `mortgage/juniper/closing-disclosure` (mshape:ClosingDisclosureShape). */
export class ClosingDisclosure extends LoanDisclosure {
  override get resourceKind(): MortgageResourceKind {
    return "closing-disclosure";
  }
  /** Set when the consumer acknowledges receipt. */
  get receivedDate(): Date | undefined {
    return optDate(this, MORT.receivedDate);
  }
  set receivedDate(value: Date | undefined) {
    setOptDate(this, MORT.receivedDate, value);
  }
  /** The scheduled consummation date. */
  get closingDate(): Date {
    return date(this, MORT.closingDate);
  }
  get disbursementDate(): Date | undefined {
    return optDate(this, MORT.disbursementDate);
  }
}

export interface ClosingDisclosureInit extends LoanDocumentInit, LoanTermsInit {
  name: string;
  receivedDate?: Date;
  closingDate: Date;
  disbursementDate?: Date;
}

export function buildClosingDisclosure(init: ClosingDisclosureInit): ClosingDisclosure {
  const disclosure = root(ClosingDisclosure, init.iri);
  applyLoanDocument(disclosure, init, MORT.ClosingDisclosure);
  setStr(disclosure, SCHEMA.name, init.name);
  disclosure.receivedDate = init.receivedDate;
  setDate(disclosure, MORT.closingDate, init.closingDate);
  setOptDate(disclosure, MORT.disbursementDate, init.disbursementDate);
  applyLoanTerms(disclosure, init);
  return disclosure;
}

/** One disclosed credit score (mshape:ScoreDisclosureShape). */
export class ScoreDisclosure extends TypedNode {
  get score(): number {
    return num(this, MORT.creditScoreValue);
  }
  /** One of {@link DISCLOSED_SCORE_MODEL_IRIS}. */
  get scoreModel(): string {
    return iri(this, MORT.scoreModel);
  }
  /** The consumer reporting agency file the score came from. */
  get source(): string {
    return str(this, SCHEMA.name);
  }
  get created(): Date {
    return date(this, DCTERMS.created);
  }
  get keyFactors(): Set<string> {
    return strSet(this, MORT.keyFactor);
  }
}

export interface ScoreDisclosureInit {
  score: number;
  scoreModel: string;
  source: string;
  created: Date;
  keyFactors?: readonly string[];
}

export function addScoreDisclosures(
  parent: MortgageResource,
  scores: readonly ScoreDisclosureInit[],
): void {
  scores.forEach((init, index) => {
    assertOneOf("scoreModel", init.scoreModel, DISCLOSED_SCORE_MODEL_IRIS);
    if (!Number.isSafeInteger(init.score) || init.score < 300 || init.score > 850) {
      throw new RangeError(`a credit score must be an integer in 300..850, got ${init.score}`);
    }
    const score = addChild(parent, MORT.scoreDisclosure, ScoreDisclosure, String(index + 1));
    setInt(score, MORT.creditScoreValue, init.score);
    setIri(score, MORT.scoreModel, init.scoreModel);
    setStr(score, SCHEMA.name, init.source);
    setDate(score, DCTERMS.created, init.created);
    for (const factor of init.keyFactors ?? []) score.keyFactors.add(factor);
  });
}

/** `mortgage/juniper/score-notice` (mshape:CreditScoreNoticeShape). */
export class CreditScoreNotice extends LoanDocument {
  override get resourceKind(): MortgageResourceKind {
    return "score-notice";
  }
  get name(): string {
    return str(this, SCHEMA.name);
  }
  get scores(): ScoreDisclosure[] {
    return children(this, MORT.scoreDisclosure, ScoreDisclosure);
  }
  /** The notice to the home loan applicant, in words. */
  get description(): string | undefined {
    return optStr(this, SCHEMA.description);
  }
}

export interface CreditScoreNoticeInit extends LoanDocumentInit {
  name: string;
  scores: readonly ScoreDisclosureInit[];
  description?: string;
}

export function buildCreditScoreNotice(init: CreditScoreNoticeInit): CreditScoreNotice {
  const notice = root(CreditScoreNotice, init.iri);
  applyLoanDocument(notice, init, MORT.CreditScoreNotice);
  setStr(notice, SCHEMA.name, init.name);
  addScoreDisclosures(notice, init.scores);
  setOptStr(notice, SCHEMA.description, init.description);
  return notice;
}

/** The lender's record of the merged report it ordered (mshape:CreditReportShape). */
export class CreditReport extends LoanDocument {
  override get resourceKind(): MortgageResourceKind {
    return "credit-report";
  }
  get reportNumber(): string {
    return str(this, SCHEMA.identifier);
  }
  get permissiblePurpose(): string {
    return str(this, MORT.permissiblePurpose);
  }
  /** The borrower's consent record for the hard inquiry. */
  get authorisedByIri(): string {
    return iri(this, MORT.authorisedBy);
  }
  get scores(): ScoreDisclosure[] {
    return children(this, MORT.scoreDisclosure, ScoreDisclosure);
  }
  get totalMonthlyDebtUsd(): number | undefined {
    return optNum(this, MORT.totalMonthlyDebtUsd);
  }
}

export interface CreditReportInit extends LoanDocumentInit {
  reportNumber: string;
  permissiblePurpose: string;
  authorisedBy: string;
  scores: readonly ScoreDisclosureInit[];
  totalMonthlyDebtUsd?: number;
}

export function buildCreditReport(init: CreditReportInit): CreditReport {
  const report = root(CreditReport, init.iri);
  applyLoanDocument(report, init, MORT.CreditReport);
  setStr(report, SCHEMA.identifier, init.reportNumber);
  setStr(report, MORT.permissiblePurpose, init.permissiblePurpose);
  setIri(report, MORT.authorisedBy, init.authorisedBy);
  addScoreDisclosures(report, init.scores);
  setOptInt(report, MORT.totalMonthlyDebtUsd, init.totalMonthlyDebtUsd);
  return report;
}

// ── Closing ──────────────────────────────────────────────────────────────────────────────

/** One named amount (mshape:LineItemShape). A credit to the borrower is negative. */
export class LineItem extends TypedNode {
  get name(): string {
    return str(this, SCHEMA.name);
  }
  get amountUsd(): number {
    return num(this, SCHEMA.value);
  }
}

export interface LineItemInit {
  name: string;
  amountUsd: number;
}

function addLineItems(parent: MortgageResource, items: readonly LineItemInit[]): void {
  items.forEach((init, index) => {
    const item = addChild(parent, MORT.lineItem, LineItem, String(index + 1));
    item.typeIris.add(SCHEMA.MonetaryAmount);
    setStr(item, SCHEMA.name, init.name);
    setDecimal(item, SCHEMA.value, init.amountUsd);
    setStr(item, SCHEMA.currency, "USD");
  });
}

/** `mortgage/closing/settlement-statement` (mshape:SettlementStatementShape). */
export class SettlementStatement extends LoanDocument {
  override get resourceKind(): MortgageResourceKind {
    return "settlement-statement";
  }
  get name(): string {
    return str(this, SCHEMA.name);
  }
  get fileNumber(): string {
    return str(this, SCHEMA.identifier);
  }
  get closingDate(): Date {
    return date(this, MORT.closingDate);
  }
  get disbursementDate(): Date {
    return date(this, MORT.disbursementDate);
  }
  get purchasePriceUsd(): number {
    return usd(this, MORT.purchasePrice);
  }
  get principalUsd(): number {
    return usd(this, FIBO.hasPrincipalAmount);
  }
  get lineItems(): LineItem[] {
    return children(this, MORT.lineItem, LineItem);
  }
  get cashToCloseUsd(): number {
    return usd(this, MORT.cashToClose);
  }
  get subjectProperty(): RealEstateProperty {
    return subjectProperty(this);
  }
}

export interface SettlementStatementInit extends LoanDocumentInit {
  name: string;
  fileNumber: string;
  closingDate: Date;
  disbursementDate: Date;
  purchasePriceUsd: number;
  principalUsd: number;
  lineItems: readonly LineItemInit[];
  cashToCloseUsd: number;
  propertyAddress: AddressFields;
}

export function buildSettlementStatement(init: SettlementStatementInit): SettlementStatement {
  const statement = root(SettlementStatement, init.iri);
  applyLoanDocument(statement, init, MORT.SettlementStatement);
  setStr(statement, SCHEMA.name, init.name);
  setStr(statement, SCHEMA.identifier, init.fileNumber);
  setDate(statement, MORT.closingDate, init.closingDate);
  setDate(statement, MORT.disbursementDate, init.disbursementDate);
  setUsd(statement, MORT.purchasePrice, init.purchasePriceUsd);
  setUsd(statement, FIBO.hasPrincipalAmount, init.principalUsd);
  addLineItems(statement, init.lineItems);
  setUsd(statement, MORT.cashToClose, init.cashToCloseUsd);
  setSubjectProperty(statement, init.propertyAddress);
  return statement;
}

/** `mortgage/closing/recording-receipt` (mshape:RecordingReceiptShape). */
export class RecordingReceipt extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "recording-receipt";
  }
  get name(): string {
    return str(this, SCHEMA.name);
  }
  /** The settlement agent's WebID. */
  get creatorIri(): string {
    return iri(this, DCTERMS.creator);
  }
  get issued(): Date {
    return dateTime(this, DCTERMS.issued);
  }
  /** Links to the county's public records. */
  get recordedInstrumentIris(): Set<string> {
    return iriSet(this, MORT.recordedInstrument);
  }
  /** The instrument numbers the county assigned. */
  get recordingReferences(): Set<string> {
    return strSet(this, MORT.recordingReference);
  }
  get subjectProperty(): RealEstateProperty | undefined {
    return optSubjectProperty(this);
  }
}

export interface RecordingReceiptInit {
  iri: string;
  name: string;
  creator: string;
  issued: Date;
  recordedInstruments: readonly string[];
  recordingReferences: readonly string[];
  propertyAddress?: AddressFields;
}

export function buildRecordingReceipt(init: RecordingReceiptInit): RecordingReceipt {
  const receipt = root(RecordingReceipt, init.iri);
  receipt.typeIris.add(MORT.RecordingReceipt);
  setStr(receipt, SCHEMA.name, init.name);
  setIri(receipt, DCTERMS.creator, init.creator);
  setDateTime(receipt, DCTERMS.issued, init.issued);
  for (const instrument of init.recordedInstruments) receipt.recordedInstrumentIris.add(instrument);
  for (const reference of init.recordingReferences) receipt.recordingReferences.add(reference);
  if (init.propertyAddress !== undefined) setSubjectProperty(receipt, init.propertyAddress);
  return receipt;
}

/** A public land record in the county's own store (mshape:RecordedInstrumentShape). */
export class RecordedInstrument extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "recorded-instrument";
  }
  get name(): string {
    return str(this, SCHEMA.name);
  }
  /** The instrument number. */
  get recordingReference(): string {
    return str(this, MORT.recordingReference);
  }
  get recordedAt(): Date {
    return dateTime(this, MORT.recordedAt);
  }
  get grantors(): Set<string> {
    return strSet(this, MORT.grantor);
  }
  get grantees(): Set<string> {
    return strSet(this, MORT.grantee);
  }
  get parcelNumber(): string {
    return str(this, MORT.parcelNumber);
  }
  /** The WebID of the organisation that submitted it. */
  get creatorIri(): string | undefined {
    return optIri(this, DCTERMS.creator);
  }
}

export interface RecordedInstrumentInit {
  iri: string;
  name: string;
  recordingReference: string;
  recordedAt: Date;
  grantors: readonly string[];
  grantees: readonly string[];
  parcelNumber: string;
  creator?: string;
}

export function buildRecordedInstrument(init: RecordedInstrumentInit): RecordedInstrument {
  const instrument = root(RecordedInstrument, init.iri);
  instrument.typeIris.add(MORT.RecordedInstrument);
  setStr(instrument, SCHEMA.name, init.name);
  setStr(instrument, MORT.recordingReference, init.recordingReference);
  setDateTime(instrument, MORT.recordedAt, init.recordedAt);
  for (const grantor of init.grantors) instrument.grantors.add(grantor);
  for (const grantee of init.grantees) instrument.grantees.add(grantee);
  setStr(instrument, MORT.parcelNumber, init.parcelNumber);
  setOptIri(instrument, DCTERMS.creator, init.creator);
  return instrument;
}

// ── After closing ────────────────────────────────────────────────────────────────────────

/** A servicing or ownership transfer notice (mshape:LoanTransferNoticeShape). */
export class LoanTransferNotice extends LoanDocument {
  override get resourceKind(): MortgageResourceKind {
    return "servicing-notice";
  }
  get name(): string {
    return str(this, SCHEMA.name);
  }
  /** One of {@link NOTICE_KIND_IRIS}. */
  get noticeKind(): string {
    return iri(this, DCTERMS.type);
  }
  get transferEffectiveDate(): Date {
    return date(this, MORT.transferEffectiveDate);
  }
  get transferorName(): string {
    return child(this, MORT.transferor, OrganizationNode).organizationName;
  }
  get transfereeName(): string {
    return child(this, MORT.transferee, OrganizationNode).organizationName;
  }
  /** Last day of the 60-day misdirected-payment protection (servicing transfers only). */
  get paymentProtectionEnds(): Date | undefined {
    return optDate(this, MORT.paymentProtectionEnds);
  }
  get telephone(): string | undefined {
    return optStr(this, SCHEMA.telephone);
  }
  get description(): string | undefined {
    return optStr(this, SCHEMA.description);
  }
}

export interface LoanTransferNoticeInit extends LoanDocumentInit {
  name: string;
  noticeKind: string;
  transferEffectiveDate: Date;
  transferorName: string;
  transfereeName: string;
  paymentProtectionEnds?: Date;
  telephone?: string;
  description?: string;
}

export function buildLoanTransferNotice(init: LoanTransferNoticeInit): LoanTransferNotice {
  assertOneOf("noticeKind", init.noticeKind, NOTICE_KIND_IRIS);
  const notice = root(LoanTransferNotice, init.iri);
  applyLoanDocument(notice, init, MORT.LoanTransferNotice);
  setStr(notice, SCHEMA.name, init.name);
  setIri(notice, DCTERMS.type, init.noticeKind);
  setDate(notice, MORT.transferEffectiveDate, init.transferEffectiveDate);
  setOrganization(notice, MORT.transferor, init.transferorName);
  setOrganization(notice, MORT.transferee, init.transfereeName);
  setOptDate(notice, MORT.paymentProtectionEnds, init.paymentProtectionEnds);
  setOptStr(notice, SCHEMA.telephone, init.telephone);
  setOptStr(notice, SCHEMA.description, init.description);
  return notice;
}

/** `mortgage/servicing/escrow-statement` (mshape:EscrowAccountStatementShape). */
export class EscrowAccountStatement extends LoanDocument {
  override get resourceKind(): MortgageResourceKind {
    return "escrow-statement";
  }
  get name(): string {
    return str(this, SCHEMA.name);
  }
  get monthlyEscrowPaymentUsd(): number {
    return usd(this, MORT.monthlyEscrowPayment);
  }
  /** What the escrow account pays for in a year (taxes, insurance). */
  get lineItems(): LineItem[] {
    return children(this, MORT.lineItem, LineItem);
  }
}

export interface EscrowAccountStatementInit extends LoanDocumentInit {
  name: string;
  monthlyEscrowPaymentUsd: number;
  lineItems: readonly LineItemInit[];
}

export function buildEscrowAccountStatement(
  init: EscrowAccountStatementInit,
): EscrowAccountStatement {
  const statement = root(EscrowAccountStatement, init.iri);
  applyLoanDocument(statement, init, MORT.EscrowAccountStatement);
  setStr(statement, SCHEMA.name, init.name);
  setUsd(statement, MORT.monthlyEscrowPayment, init.monthlyEscrowPaymentUsd);
  addLineItems(statement, init.lineItems);
  return statement;
}

/** `banking/payment-mandate` (mshape:PaymentMandateShape). */
export class PaymentMandate extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "payment-mandate";
  }
  /** The borrower's WebID. */
  get creatorIri(): string {
    return iri(this, DCTERMS.creator);
  }
  /** The WebID of the organisation allowed to collect. */
  get payeeIri(): string {
    return iri(this, MORT.payee);
  }
  get accountLast4(): string {
    return str(this, MORT.accountLast4);
  }
  get bankName(): string {
    return child(this, SCHEMA.provider, OrganizationNode).organizationName;
  }
  get amountUsd(): number | undefined {
    return optUsd(this, SCHEMA.amount);
  }
  get debitDayOfMonth(): number {
    return num(this, MORT.debitDayOfMonth);
  }
  get issued(): Date {
    return dateTime(this, DCTERMS.issued);
  }
  get loanNumber(): string {
    return str(this, MORT.loanNumber);
  }
}

export interface PaymentMandateInit {
  iri: string;
  creator: string;
  payee: string;
  accountLast4: string;
  bankName: string;
  amountUsd?: number;
  debitDayOfMonth: number;
  issued: Date;
  loanNumber: string;
}

export function buildPaymentMandate(init: PaymentMandateInit): PaymentMandate {
  if (!/^[0-9]{4}$/.test(init.accountLast4)) {
    throw new RangeError("accountLast4 must be exactly four digits");
  }
  const mandate = root(PaymentMandate, init.iri);
  mandate.typeIris.add(MORT.PaymentMandate);
  setIri(mandate, DCTERMS.creator, init.creator);
  setIri(mandate, MORT.payee, init.payee);
  setStr(mandate, MORT.accountLast4, init.accountLast4);
  setOrganization(mandate, SCHEMA.provider, init.bankName);
  if (init.amountUsd !== undefined) setUsd(mandate, SCHEMA.amount, init.amountUsd);
  setInt(mandate, MORT.debitDayOfMonth, init.debitDayOfMonth);
  setDateTime(mandate, DCTERMS.issued, init.issued);
  setStr(mandate, MORT.loanNumber, init.loanNumber);
  return mandate;
}

/** A delivered document with no summary of its own (mshape:DocumentShape). */
export class DeliveredDocument extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "document";
  }
  get name(): string {
    return str(this, SCHEMA.name);
  }
  /** The embedded summary. */
  get description(): string {
    return str(this, SCHEMA.description);
  }
  get creatorIri(): string {
    return iri(this, DCTERMS.creator);
  }
  get issued(): Date {
    return dateTime(this, DCTERMS.issued);
  }
  get identifier(): string | undefined {
    return optStr(this, SCHEMA.identifier);
  }
  get aboutIri(): string | undefined {
    return optIri(this, SCHEMA.about);
  }
  get loanNumber(): string | undefined {
    return optStr(this, MORT.loanNumber);
  }
  get subjectProperty(): RealEstateProperty | undefined {
    return optSubjectProperty(this);
  }
}

export interface DeliveredDocumentInit {
  iri: string;
  name: string;
  description: string;
  creator: string;
  issued: Date;
  identifier?: string;
  about?: string;
  loanNumber?: string;
  propertyAddress?: AddressFields;
}

export function buildDeliveredDocument(init: DeliveredDocumentInit): DeliveredDocument {
  const document = root(DeliveredDocument, init.iri);
  document.typeIris.add(SCHEMA.DigitalDocument);
  setStr(document, SCHEMA.name, init.name);
  setStr(document, SCHEMA.description, init.description);
  setIri(document, DCTERMS.creator, init.creator);
  setDateTime(document, DCTERMS.issued, init.issued);
  setOptStr(document, SCHEMA.identifier, init.identifier);
  setOptIri(document, SCHEMA.about, init.about);
  setOptStr(document, MORT.loanNumber, init.loanNumber);
  if (init.propertyAddress !== undefined) setSubjectProperty(document, init.propertyAddress);
  return document;
}
