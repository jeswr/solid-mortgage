// AUTHORED-BY Claude Fable 5.2
import { DataFactory, Store } from "n3";
import type { MortgageResourceKind } from "../shacl.js";
import { AS, CRED, DCTERMS, SCHEMA } from "../vocab/external.js";
import { MORT } from "../vocab/mort.js";
import { applyEnvelope, type CredentialEnvelopeInit } from "./build.js";
import {
  type AddressFields,
  child,
  date,
  dateTime,
  iri,
  iriSet,
  optBool,
  optDateTime,
  optIri,
  optStr,
  setAddress,
  setDate,
  setDateTime,
  setIri,
  setOptBool,
  setOptDateTime,
  setOptIri,
  setOptStr,
  setStr,
  setSubjectProperty,
  setUsd,
  str,
  strSet,
  subjectProperty,
  usd,
} from "./fields.js";
import { CredentialResource, MortgageResource } from "./resources.js";
import { PostalAddress, type RealEstateProperty, TypedNode } from "./support.js";

/**
 * Typed wrappers and builders for (a) what organisations keep in their own stores and send to
 * each other (orders, inbox messages, credential pointers) and (b) the three credential kinds
 * the static rebuild adds (identity, title commitment, evidence of insurance).
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

function assertOneOf(label: string, value: string, allowed: readonly string[]): void {
  if (!allowed.includes(value)) {
    throw new RangeError(`${label} must be one of ${allowed.join(", ")}; got ${value}`);
  }
}

// ── Organisation records ─────────────────────────────────────────────────────────────────

/** Value space of `dcterms:type` on a service order. */
export const SERVICE_KIND_IRIS = [
  MORT.ServiceKind_CreditReport,
  MORT.ServiceKind_Appraisal,
  MORT.ServiceKind_Title,
  MORT.ServiceKind_FloodDetermination,
  MORT.ServiceKind_TaxTranscripts,
] as const;

/** Value space of `schema:orderStatus` on a service order. */
export const ORDER_STATUS_IRIS = [SCHEMA.OrderProcessing, SCHEMA.OrderDelivered] as const;

/** An order in an organisation's own records (mshape:ServiceOrderShape). */
export class ServiceOrder extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "service-order";
  }
  get orderNumber(): string {
    return str(this, SCHEMA.orderNumber);
  }
  /** One of {@link SERVICE_KIND_IRIS}. */
  get serviceKind(): string {
    return iri(this, DCTERMS.type);
  }
  /** The WebID of the organisation that ordered. */
  get customerIri(): string {
    return iri(this, SCHEMA.customer);
  }
  /** The WebID of the organisation that fulfils the order. */
  get sellerIri(): string {
    return iri(this, SCHEMA.seller);
  }
  get orderDate(): Date {
    return date(this, SCHEMA.orderDate);
  }
  /** One of {@link ORDER_STATUS_IRIS}. */
  get orderStatus(): string {
    return iri(this, SCHEMA.orderStatus);
  }
  set orderStatus(value: string) {
    assertOneOf("orderStatus", value, ORDER_STATUS_IRIS);
    setIri(this, SCHEMA.orderStatus, value);
  }
  get loanNumber(): string {
    return str(this, MORT.loanNumber);
  }
  /** The consent record or policy in the borrower's pod that authorised the order. */
  get authorisedByIri(): string | undefined {
    return optIri(this, MORT.authorisedBy);
  }
  get description(): string | undefined {
    return optStr(this, SCHEMA.description);
  }
}

export interface ServiceOrderInit {
  iri: string;
  orderNumber: string;
  serviceKind: string;
  customer: string;
  seller: string;
  orderDate: Date;
  orderStatus: string;
  loanNumber: string;
  authorisedBy?: string;
  description?: string;
}

export function buildServiceOrder(init: ServiceOrderInit): ServiceOrder {
  assertOneOf("serviceKind", init.serviceKind, SERVICE_KIND_IRIS);
  const order = root(ServiceOrder, init.iri);
  order.typeIris.add(SCHEMA.Order);
  setStr(order, SCHEMA.orderNumber, init.orderNumber);
  setIri(order, DCTERMS.type, init.serviceKind);
  setIri(order, SCHEMA.customer, init.customer);
  setIri(order, SCHEMA.seller, init.seller);
  setDate(order, SCHEMA.orderDate, init.orderDate);
  order.orderStatus = init.orderStatus;
  setStr(order, MORT.loanNumber, init.loanNumber);
  setOptIri(order, MORT.authorisedBy, init.authorisedBy);
  setOptStr(order, SCHEMA.description, init.description);
  return order;
}

/** Value space of `dcterms:type` on an inbox message (`mort:MessageKindScheme`). */
export const MESSAGE_KIND_IRIS = [
  MORT.MessageKind_CreditReportOrder,
  MORT.MessageKind_CreditReportDelivery,
  MORT.MessageKind_CasefileSubmission,
  MORT.MessageKind_FindingsDelivery,
  MORT.MessageKind_ServiceOrder,
  MORT.MessageKind_AppraisalDelivery,
  MORT.MessageKind_CommitmentDelivery,
  MORT.MessageKind_RefreshRequest,
  MORT.MessageKind_RefreshDelivery,
  MORT.MessageKind_ClosingInstructions,
  MORT.MessageKind_ClosingConfirmation,
  MORT.MessageKind_RecordingSubmission,
  MORT.MessageKind_RecordingConfirmation,
  MORT.MessageKind_LoanDelivery,
  MORT.MessageKind_PurchaseConfirmation,
  MORT.MessageKind_ServicingBoarding,
  // Motor claim demo (flows.md section 7).
  MORT.MessageKind_RepairReferral,
  MORT.MessageKind_RepairAuthorisation,
  MORT.MessageKind_RepairCompletion,
] as const;

export type MessageKindIri = (typeof MESSAGE_KIND_IRIS)[number];

/**
 * A message one organisation appends to another's `inbox/` (mshape:InboxMessageShape). The
 * server names the resource, so the message's root node is the empty relative IRI `<>` when it
 * is posted; pass the `Location` the server returned as `iri` when reading it back.
 */
export class InboxMessage extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "inbox-message";
  }
  /** One of {@link MESSAGE_KIND_IRIS}. */
  get messageKind(): string {
    return iri(this, DCTERMS.type);
  }
  /** The sender's WebID. */
  get actorIri(): string {
    return iri(this, AS.actor);
  }
  /** The resources the message is about. */
  get objectIris(): Set<string> {
    return iriSet(this, AS.object);
  }
  get summary(): string {
    return str(this, AS.summary);
  }
  get published(): Date {
    return dateTime(this, AS.published);
  }
  get loanNumber(): string | undefined {
    return optStr(this, MORT.loanNumber);
  }
  get inReplyToIri(): string | undefined {
    return optIri(this, AS.inReplyTo);
  }
}

export interface InboxMessageInit {
  /** The message IRI. The inbox URL plus a provisional name is fine: the server renames it. */
  iri: string;
  messageKind: MessageKindIri;
  actor: string;
  objects?: readonly string[];
  summary: string;
  published: Date;
  loanNumber?: string;
  inReplyTo?: string;
}

export function buildInboxMessage(init: InboxMessageInit): InboxMessage {
  assertOneOf("messageKind", init.messageKind, MESSAGE_KIND_IRIS);
  const message = root(InboxMessage, init.iri);
  message.typeIris.add(AS.Announce);
  setIri(message, DCTERMS.type, init.messageKind);
  setIri(message, AS.actor, init.actor);
  for (const object of init.objects ?? []) message.objectIris.add(object);
  setStr(message, AS.summary, init.summary);
  setDateTime(message, AS.published, init.published);
  setOptStr(message, MORT.loanNumber, init.loanNumber);
  setOptIri(message, AS.inReplyTo, init.inReplyTo);
  return message;
}

/** A pointer kept in place of a copy (mshape:CredentialPointerShape). */
export class CredentialPointer extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "credential-pointer";
  }
  /** Where the credential lives in the pod. */
  get url(): string {
    return iri(this, SCHEMA.url);
  }
  /** The credential class, e.g. `mort:EmploymentIncomeCredential`. */
  get credentialType(): string {
    return iri(this, DCTERMS.type);
  }
  /** The issuer's WebID. */
  get issuerIri(): string {
    return iri(this, DCTERMS.creator);
  }
  /** Lower-case hex SHA-256 of the canonical credential. */
  get sha256(): string {
    return str(this, SCHEMA.sha256);
  }
  /** The time the data was true according to its issuer (the credential's validFrom). */
  get asOf(): Date {
    return dateTime(this, MORT.asOf);
  }
  get signatureVerified(): boolean | undefined {
    return optBool(this, MORT.signatureVerified);
  }
  get statusChecked(): boolean | undefined {
    return optBool(this, MORT.statusChecked);
  }
  get checkedAt(): Date | undefined {
    return optDateTime(this, MORT.checkedAt);
  }
  get loanNumber(): string | undefined {
    return optStr(this, MORT.loanNumber);
  }
}

export interface CredentialPointerInit {
  iri: string;
  url: string;
  credentialType: string;
  issuer: string;
  sha256: string;
  asOf: Date;
  signatureVerified?: boolean;
  statusChecked?: boolean;
  checkedAt?: Date;
  loanNumber?: string;
}

export function buildCredentialPointer(init: CredentialPointerInit): CredentialPointer {
  if (!/^[0-9a-f]{64}$/.test(init.sha256)) {
    throw new RangeError("sha256 must be 64 lower-case hex characters");
  }
  const pointer = root(CredentialPointer, init.iri);
  pointer.typeIris.add(MORT.CredentialPointer);
  setIri(pointer, SCHEMA.url, init.url);
  setIri(pointer, DCTERMS.type, init.credentialType);
  setIri(pointer, DCTERMS.creator, init.issuer);
  setStr(pointer, SCHEMA.sha256, init.sha256);
  setDateTime(pointer, MORT.asOf, init.asOf);
  setOptBool(pointer, MORT.signatureVerified, init.signatureVerified);
  setOptBool(pointer, MORT.statusChecked, init.statusChecked);
  setOptDateTime(pointer, MORT.checkedAt, init.checkedAt);
  setOptStr(pointer, MORT.loanNumber, init.loanNumber);
  return pointer;
}

// ── Credentials added by the rebuild ─────────────────────────────────────────────────────

/** Claims node of the identity credential (mshape:IdentitySubjectShape). */
export class IdentitySubject extends TypedNode {
  get name(): string {
    return str(this, SCHEMA.name);
  }
  get birthDate(): Date {
    return date(this, SCHEMA.birthDate);
  }
  get address(): PostalAddress {
    return child(this, SCHEMA.address, PostalAddress);
  }
  /** Masked: the full taxpayer identifier never enters the pod. */
  get taxIdLast4(): string {
    return str(this, MORT.taxIdLast4);
  }
}

export interface IdentityClaimsInit {
  name: string;
  birthDate: Date;
  address: AddressFields;
  taxIdLast4: string;
}

/** Write the identity claims onto a subject node (used by the builder and by vc-kit). */
export function writeIdentityClaims(subject: TypedNode, init: IdentityClaimsInit): void {
  if (!/^[0-9]{4}$/.test(init.taxIdLast4)) {
    throw new RangeError("taxIdLast4 must be exactly four digits");
  }
  setStr(subject, SCHEMA.name, init.name);
  setDate(subject, SCHEMA.birthDate, init.birthDate);
  setAddress(subject, SCHEMA.address, init.address);
  setStr(subject, MORT.taxIdLast4, init.taxIdLast4);
}

/** Identity credential (mshape:IdentityCredentialShape). */
export class IdentityCredential extends CredentialResource {
  override get resourceKind(): MortgageResourceKind {
    return "identity-credential";
  }
  get credentialSubject(): IdentitySubject {
    return new IdentitySubject(
      this.factory.namedNode(iri(this, CRED.credentialSubject)),
      this.dataset,
      this.factory,
    );
  }
}

export interface IdentityCredentialInit extends CredentialEnvelopeInit, IdentityClaimsInit {}

export function buildIdentityCredential(init: IdentityCredentialInit): IdentityCredential {
  const credential = root(IdentityCredential, init.iri);
  applyEnvelope(credential, init, MORT.IdentityCredential);
  writeIdentityClaims(credential.credentialSubject, init);
  return credential;
}

/** Claims node of the title commitment (mshape:TitleCommitmentSubjectShape). */
export class TitleCommitmentSubject extends TypedNode {
  get commitmentNumber(): string {
    return str(this, SCHEMA.identifier);
  }
  get subjectProperty(): RealEstateProperty {
    return subjectProperty(this);
  }
  /** The commitment date: public records were searched through this day. */
  get searchedThrough(): Date {
    return date(this, MORT.searchedThrough);
  }
  /** Schedule A: who holds title now. */
  get vestedOwner(): string {
    return str(this, MORT.vestedOwner);
  }
  /** Schedule A: the proposed insured of the owner's policy and of the loan policy. */
  get proposedInsured(): Set<string> {
    return strSet(this, MORT.proposedInsured);
  }
  get ownerPolicyAmountUsd(): number {
    return usd(this, MORT.ownerPolicyAmount);
  }
  get loanPolicyAmountUsd(): number {
    return usd(this, MORT.loanPolicyAmount);
  }
  /** Schedule B, Part I. */
  get requirements(): Set<string> {
    return strSet(this, MORT.titleRequirement);
  }
  /** Schedule B, Part II. */
  get exceptions(): Set<string> {
    return strSet(this, MORT.titleException);
  }
}

export interface TitleCommitmentClaimsInit {
  commitmentNumber: string;
  propertyAddress: AddressFields;
  searchedThrough: Date;
  vestedOwner: string;
  proposedInsured: readonly string[];
  ownerPolicyAmountUsd: number;
  loanPolicyAmountUsd: number;
  requirements: readonly string[];
  exceptions: readonly string[];
}

export function writeTitleCommitmentClaims(
  subject: TypedNode,
  init: TitleCommitmentClaimsInit,
): void {
  const claims = new TitleCommitmentSubject(subject.value, subject.dataset, subject.factory);
  setStr(claims, SCHEMA.identifier, init.commitmentNumber);
  setSubjectProperty(claims, init.propertyAddress);
  setDate(claims, MORT.searchedThrough, init.searchedThrough);
  setStr(claims, MORT.vestedOwner, init.vestedOwner);
  for (const insured of init.proposedInsured) claims.proposedInsured.add(insured);
  setUsd(claims, MORT.ownerPolicyAmount, init.ownerPolicyAmountUsd);
  setUsd(claims, MORT.loanPolicyAmount, init.loanPolicyAmountUsd);
  for (const requirement of init.requirements) claims.requirements.add(requirement);
  for (const exception of init.exceptions) claims.exceptions.add(exception);
}

/** Title commitment credential (mshape:TitleCommitmentCredentialShape). */
export class TitleCommitmentCredential extends CredentialResource {
  override get resourceKind(): MortgageResourceKind {
    return "title-commitment-credential";
  }
  get credentialSubject(): TitleCommitmentSubject {
    return new TitleCommitmentSubject(
      this.factory.namedNode(iri(this, CRED.credentialSubject)),
      this.dataset,
      this.factory,
    );
  }
}

export interface TitleCommitmentCredentialInit
  extends CredentialEnvelopeInit,
    TitleCommitmentClaimsInit {}

export function buildTitleCommitmentCredential(
  init: TitleCommitmentCredentialInit,
): TitleCommitmentCredential {
  const credential = root(TitleCommitmentCredential, init.iri);
  applyEnvelope(credential, init, MORT.TitleCommitmentCredential);
  writeTitleCommitmentClaims(credential.credentialSubject, init);
  return credential;
}

/** Claims node of the evidence of insurance (mshape:EvidenceOfInsuranceSubjectShape). */
export class EvidenceOfInsuranceSubject extends TypedNode {
  get policyNumber(): string {
    return str(this, SCHEMA.identifier);
  }
  get subjectProperty(): RealEstateProperty {
    return subjectProperty(this);
  }
  get dwellingCoverageUsd(): number {
    return usd(this, MORT.dwellingCoverage);
  }
  get annualPremiumUsd(): number {
    return usd(this, MORT.annualPremium);
  }
  get deductibleUsd(): number {
    return usd(this, MORT.deductible);
  }
  get policyStart(): Date {
    return date(this, SCHEMA.validFrom);
  }
  get policyEnd(): Date {
    return date(this, SCHEMA.validThrough);
  }
  /** Names the lender, its successors and assigns. */
  get mortgageeClause(): string {
    return str(this, MORT.mortgageeClause);
  }
  get loanNumber(): string | undefined {
    return optStr(this, MORT.loanNumber);
  }
}

export interface EvidenceOfInsuranceClaimsInit {
  policyNumber: string;
  propertyAddress: AddressFields;
  dwellingCoverageUsd: number;
  annualPremiumUsd: number;
  deductibleUsd: number;
  policyStart: Date;
  policyEnd: Date;
  mortgageeClause: string;
  loanNumber?: string;
}

export function writeEvidenceOfInsuranceClaims(
  subject: TypedNode,
  init: EvidenceOfInsuranceClaimsInit,
): void {
  setStr(subject, SCHEMA.identifier, init.policyNumber);
  setSubjectProperty(subject, init.propertyAddress);
  setUsd(subject, MORT.dwellingCoverage, init.dwellingCoverageUsd);
  setUsd(subject, MORT.annualPremium, init.annualPremiumUsd);
  setUsd(subject, MORT.deductible, init.deductibleUsd);
  setDate(subject, SCHEMA.validFrom, init.policyStart);
  setDate(subject, SCHEMA.validThrough, init.policyEnd);
  setStr(subject, MORT.mortgageeClause, init.mortgageeClause);
  setOptStr(subject, MORT.loanNumber, init.loanNumber);
}

/** Evidence of insurance credential (mshape:EvidenceOfInsuranceCredentialShape). */
export class EvidenceOfInsuranceCredential extends CredentialResource {
  override get resourceKind(): MortgageResourceKind {
    return "evidence-of-insurance-credential";
  }
  get credentialSubject(): EvidenceOfInsuranceSubject {
    return new EvidenceOfInsuranceSubject(
      this.factory.namedNode(iri(this, CRED.credentialSubject)),
      this.dataset,
      this.factory,
    );
  }
}

export interface EvidenceOfInsuranceCredentialInit
  extends CredentialEnvelopeInit,
    EvidenceOfInsuranceClaimsInit {}

export function buildEvidenceOfInsuranceCredential(
  init: EvidenceOfInsuranceCredentialInit,
): EvidenceOfInsuranceCredential {
  const credential = root(EvidenceOfInsuranceCredential, init.iri);
  applyEnvelope(credential, init, MORT.EvidenceOfInsuranceCredential);
  writeEvidenceOfInsuranceClaims(credential.credentialSubject, init);
  return credential;
}
