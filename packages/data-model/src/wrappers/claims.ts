// AUTHORED-BY Claude Opus 5.5
import { DataFactory, Store } from "n3";
import type { MortgageResourceKind } from "../shacl.js";
import { CRED, DCTERMS, SCHEMA } from "../vocab/external.js";
import { MORT } from "../vocab/mort.js";
import { applyEnvelope, type CredentialEnvelopeInit } from "./build.js";
import { LineItem, type LineItemInit } from "./documents.js";
import {
  addChild,
  child,
  children,
  date,
  dateTime,
  iri,
  iriSet,
  optIri,
  optStr,
  setDate,
  setDateTime,
  setDecimal,
  setIri,
  setOptIri,
  setOptStr,
  setStr,
  setUsd,
  str,
  strSet,
  usd,
} from "./fields.js";
import { CredentialResource, MortgageResource } from "./resources.js";
import { TypedNode } from "./support.js";

/**
 * Typed wrappers and builders for the motor claim demo (flows.md section 7): the claim file in
 * the claimant's pod (incident report, other party's details, damage report, estimate, invoice),
 * the motor policy credential, and the case record each organisation keeps in its own store.
 *
 * Terms are schema.org first; `mort:` adds only what schema.org lacks. ACORD publishes no RDF
 * vocabulary: the field mapping to ACORD first-notice-of-loss data is documentation
 * (content/motor-claim/README.md). Every builder's output is checked against its SHACL shape by
 * `resourceToTurtle()` / the content package's `putResource` before it is written.
 */

const SCHEMA_NS = "https://schema.org/";
const ODRL_HAS_POLICY = "http://www.w3.org/ns/odrl/2/hasPolicy";

/** schema.org terms these documents use beyond the shared `SCHEMA` constants. */
export const CLAIM_SCHEMA = Object.freeze({
  ActiveActionStatus: `${SCHEMA_NS}ActiveActionStatus`,
  Car: `${SCHEMA_NS}Car`,
  CompletedActionStatus: `${SCHEMA_NS}CompletedActionStatus`,
  Invoice: `${SCHEMA_NS}Invoice`,
  acceptedOffer: `${SCHEMA_NS}acceptedOffer`,
  actionStatus: `${SCHEMA_NS}actionStatus`,
  color: `${SCHEMA_NS}color`,
  image: `${SCHEMA_NS}image`,
  location: `${SCHEMA_NS}location`,
  referencesOrder: `${SCHEMA_NS}referencesOrder`,
  totalPaymentDue: `${SCHEMA_NS}totalPaymentDue`,
  vehicleIdentificationNumber: `${SCHEMA_NS}vehicleIdentificationNumber`,
});

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

/** Whole cents, so a total is the exact sum of its line items. */
function sumUsd(items: readonly LineItemInit[]): number {
  return items.reduce((total, item) => total + Math.round(item.amountUsd * 100), 0) / 100;
}

function addLineItems(parent: MortgageResource, items: readonly LineItemInit[]): void {
  if (items.length === 0) throw new RangeError("at least one line item is required");
  items.forEach((init, index) => {
    if (!Number.isFinite(init.amountUsd) || init.amountUsd < 0) {
      throw new RangeError(`line item ${init.name} must be a non-negative amount`);
    }
    const item = addChild(parent, MORT.lineItem, LineItem, String(index + 1));
    item.typeIris.add(SCHEMA.MonetaryAmount);
    setStr(item, SCHEMA.name, init.name);
    setDecimal(item, SCHEMA.value, init.amountUsd);
    setStr(item, SCHEMA.currency, "USD");
  });
}

// ── Vehicle ──────────────────────────────────────────────────────────────────────────────

/** A vehicle (mshape:VehicleShape). */
export class Vehicle extends TypedNode {
  /** Make and model, e.g. "Larkspur Tern". */
  get name(): string {
    return str(this, SCHEMA.name);
  }
  get vin(): string | undefined {
    return optStr(this, CLAIM_SCHEMA.vehicleIdentificationNumber);
  }
  /** The registration plate. */
  get plate(): string | undefined {
    return optStr(this, SCHEMA.identifier);
  }
  get color(): string | undefined {
    return optStr(this, CLAIM_SCHEMA.color);
  }
}

export interface VehicleInit {
  name: string;
  vin?: string;
  plate?: string;
  color?: string;
}

function setVehicle(node: TypedNode, init: VehicleInit): void {
  const vehicle = addChild(node, MORT.vehicle, Vehicle);
  vehicle.typeIris.add(CLAIM_SCHEMA.Car);
  setStr(vehicle, SCHEMA.name, init.name);
  setOptStr(vehicle, CLAIM_SCHEMA.vehicleIdentificationNumber, init.vin);
  setOptStr(vehicle, SCHEMA.identifier, init.plate);
  setOptStr(vehicle, CLAIM_SCHEMA.color, init.color);
}

const vehicleOf = (node: TypedNode): Vehicle => child(node, MORT.vehicle, Vehicle);

/** The fields common to a document someone wrote into the claim file. */
interface Authored {
  /** The author's WebID. */
  creator: string;
  created: Date;
}

function setAuthored(node: TypedNode, init: Authored): void {
  setIri(node, DCTERMS.creator, init.creator);
  setDateTime(node, DCTERMS.created, init.created);
}

/** A document someone wrote into a claim file: who wrote it, and when. */
abstract class AuthoredDocument extends MortgageResource {
  get creatorIri(): string {
    return iri(this, DCTERMS.creator);
  }
  get created(): Date {
    return dateTime(this, DCTERMS.created);
  }
}

// ── Motor policy credential ──────────────────────────────────────────────────────────────

/** Claims node of a motor policy credential (mshape:MotorPolicySubjectShape). */
export class MotorPolicySubject extends TypedNode {
  get policyNumber(): string {
    return str(this, SCHEMA.identifier);
  }
  get vehicle(): Vehicle {
    return vehicleOf(this);
  }
  get coverages(): string[] {
    return [...strSet(this, MORT.coverage)].sort();
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
}

export interface MotorPolicyClaimsInit {
  policyNumber: string;
  vehicle: VehicleInit;
  coverages: readonly string[];
  deductibleUsd: number;
  policyStart: Date;
  policyEnd: Date;
}

export function writeMotorPolicyClaims(subject: TypedNode, init: MotorPolicyClaimsInit): void {
  if (init.coverages.length === 0) throw new RangeError("a motor policy names a coverage");
  setStr(subject, SCHEMA.identifier, init.policyNumber);
  setVehicle(subject, init.vehicle);
  const coverages = strSet(subject, MORT.coverage);
  for (const coverage of init.coverages) coverages.add(coverage);
  setUsd(subject, MORT.deductible, init.deductibleUsd);
  setDate(subject, SCHEMA.validFrom, init.policyStart);
  setDate(subject, SCHEMA.validThrough, init.policyEnd);
}

/** Motor policy credential (mshape:MotorPolicyCredentialShape). */
export class MotorPolicyCredential extends CredentialResource {
  override get resourceKind(): MortgageResourceKind {
    return "motor-policy-credential";
  }
  get credentialSubject(): MotorPolicySubject {
    return new MotorPolicySubject(
      this.factory.namedNode(iri(this, CRED.credentialSubject)),
      this.dataset,
      this.factory,
    );
  }
}

export interface MotorPolicyCredentialInit extends CredentialEnvelopeInit, MotorPolicyClaimsInit {}

export function buildMotorPolicyCredential(init: MotorPolicyCredentialInit): MotorPolicyCredential {
  const credential = root(MotorPolicyCredential, init.iri);
  applyEnvelope(credential, init, MORT.MotorPolicyCredential);
  writeMotorPolicyClaims(credential.credentialSubject, init);
  return credential;
}

// ── The claim file ───────────────────────────────────────────────────────────────────────

/** `claims/<claim>/incident` (mshape:MotorIncidentReportShape). */
export class MotorIncidentReport extends AuthoredDocument {
  override get resourceKind(): MortgageResourceKind {
    return "motor-incident-report";
  }
  get claimNumber(): string {
    return str(this, SCHEMA.identifier);
  }
  get name(): string {
    return str(this, SCHEMA.name);
  }
  get description(): string {
    return str(this, SCHEMA.description);
  }
  get occurredAt(): Date {
    return dateTime(this, MORT.occurredAt);
  }
  get location(): string {
    return str(this, CLAIM_SCHEMA.location);
  }
  get vehicle(): Vehicle {
    return vehicleOf(this);
  }
  get photos(): string[] {
    return [...iriSet(this, CLAIM_SCHEMA.image)].sort();
  }
  get otherPartyIri(): string | undefined {
    return optIri(this, MORT.otherParty);
  }
}

export interface MotorIncidentReportInit extends Authored {
  iri: string;
  claimNumber: string;
  name: string;
  description: string;
  occurredAt: Date;
  location: string;
  vehicle: VehicleInit;
  photos: readonly string[];
  otherParty?: string;
}

export function buildMotorIncidentReport(init: MotorIncidentReportInit): MotorIncidentReport {
  const report = root(MotorIncidentReport, init.iri);
  report.typeIris.add(MORT.MotorIncidentReport);
  setStr(report, SCHEMA.identifier, init.claimNumber);
  setStr(report, SCHEMA.name, init.name);
  setStr(report, SCHEMA.description, init.description);
  setDateTime(report, MORT.occurredAt, init.occurredAt);
  setStr(report, CLAIM_SCHEMA.location, init.location);
  setVehicle(report, init.vehicle);
  const photos = iriSet(report, CLAIM_SCHEMA.image);
  for (const photo of init.photos) photos.add(photo);
  setOptIri(report, MORT.otherParty, init.otherParty);
  setAuthored(report, init);
  return report;
}

/** `claims/<claim>/other-party` (mshape:OtherPartyDetailsShape). */
export class OtherPartyDetails extends AuthoredDocument {
  override get resourceKind(): MortgageResourceKind {
    return "other-party-details";
  }
  get name(): string {
    return str(this, SCHEMA.name);
  }
  get telephone(): string {
    return str(this, SCHEMA.telephone);
  }
  get insurerName(): string {
    return str(this, MORT.insurerName);
  }
  get policyNumber(): string {
    return str(this, SCHEMA.identifier);
  }
  get vehicle(): Vehicle {
    return vehicleOf(this);
  }
}

export interface OtherPartyDetailsInit extends Authored {
  iri: string;
  name: string;
  /** Only the 555-0100 to 555-0199 range kept for fiction passes the shape. */
  telephone: string;
  insurerName: string;
  policyNumber: string;
  vehicle: VehicleInit;
}

export function buildOtherPartyDetails(init: OtherPartyDetailsInit): OtherPartyDetails {
  const details = root(OtherPartyDetails, init.iri);
  details.typeIris.add(MORT.OtherPartyDetails);
  setStr(details, SCHEMA.name, init.name);
  setStr(details, SCHEMA.telephone, init.telephone);
  setStr(details, MORT.insurerName, init.insurerName);
  setStr(details, SCHEMA.identifier, init.policyNumber);
  setVehicle(details, init.vehicle);
  setAuthored(details, init);
  return details;
}

/** `claims/<claim>/damage-report` (mshape:DamageReportShape). */
export class DamageReport extends AuthoredDocument {
  override get resourceKind(): MortgageResourceKind {
    return "damage-report";
  }
  get name(): string {
    return str(this, SCHEMA.name);
  }
  /** The incident report it assesses. */
  get aboutIri(): string {
    return iri(this, SCHEMA.about);
  }
  get vehicle(): Vehicle {
    return vehicleOf(this);
  }
  get damage(): string[] {
    return [...strSet(this, MORT.damageItem)].sort();
  }
  get photos(): string[] {
    return [...iriSet(this, CLAIM_SCHEMA.image)].sort();
  }
  get description(): string | undefined {
    return optStr(this, SCHEMA.description);
  }
}

export interface DamageReportInit extends Authored {
  iri: string;
  name: string;
  about: string;
  vehicle: VehicleInit;
  damage: readonly string[];
  photos: readonly string[];
  description?: string;
}

export function buildDamageReport(init: DamageReportInit): DamageReport {
  const report = root(DamageReport, init.iri);
  report.typeIris.add(MORT.DamageReport);
  setStr(report, SCHEMA.name, init.name);
  setIri(report, SCHEMA.about, init.about);
  setVehicle(report, init.vehicle);
  const damage = strSet(report, MORT.damageItem);
  for (const item of init.damage) damage.add(item);
  const photos = iriSet(report, CLAIM_SCHEMA.image);
  for (const photo of init.photos) photos.add(photo);
  setOptStr(report, SCHEMA.description, init.description);
  setAuthored(report, init);
  return report;
}

/** `claims/<claim>/estimate` (mshape:RepairEstimateShape). */
export class RepairEstimate extends AuthoredDocument {
  override get resourceKind(): MortgageResourceKind {
    return "repair-estimate";
  }
  get name(): string {
    return str(this, SCHEMA.name);
  }
  get estimateNumber(): string {
    return str(this, SCHEMA.identifier);
  }
  /** The damage report it prices. */
  get aboutIri(): string {
    return iri(this, SCHEMA.about);
  }
  get lineItems(): LineItem[] {
    return children(this, MORT.lineItem, LineItem).sort((a, b) => a.value.localeCompare(b.value));
  }
  get totalUsd(): number {
    return usd(this, MORT.totalAmount);
  }
}

export interface RepairEstimateInit extends Authored {
  iri: string;
  name: string;
  estimateNumber: string;
  about: string;
  lineItems: readonly LineItemInit[];
}

/** The total is the sum of the line items, computed here, never typed in. */
export function buildRepairEstimate(init: RepairEstimateInit): RepairEstimate {
  const estimate = root(RepairEstimate, init.iri);
  estimate.typeIris.add(MORT.RepairEstimate);
  setStr(estimate, SCHEMA.name, init.name);
  setStr(estimate, SCHEMA.identifier, init.estimateNumber);
  setIri(estimate, SCHEMA.about, init.about);
  addLineItems(estimate, init.lineItems);
  setUsd(estimate, MORT.totalAmount, sumUsd(init.lineItems));
  setAuthored(estimate, init);
  return estimate;
}

/** `claims/<claim>/invoice` (mshape:RepairInvoiceShape). */
export class RepairInvoice extends AuthoredDocument {
  override get resourceKind(): MortgageResourceKind {
    return "repair-invoice";
  }
  get name(): string {
    return str(this, SCHEMA.name);
  }
  get invoiceNumber(): string {
    return str(this, SCHEMA.identifier);
  }
  /** The estimate it invoices. */
  get estimateIri(): string {
    return iri(this, CLAIM_SCHEMA.referencesOrder);
  }
  get lineItems(): LineItem[] {
    return children(this, MORT.lineItem, LineItem).sort((a, b) => a.value.localeCompare(b.value));
  }
  get totalUsd(): number {
    return usd(this, CLAIM_SCHEMA.totalPaymentDue);
  }
}

export interface RepairInvoiceInit extends Authored {
  iri: string;
  name: string;
  invoiceNumber: string;
  estimate: string;
  lineItems: readonly LineItemInit[];
}

export function buildRepairInvoice(init: RepairInvoiceInit): RepairInvoice {
  const invoice = root(RepairInvoice, init.iri);
  invoice.typeIris.add(CLAIM_SCHEMA.Invoice);
  setStr(invoice, SCHEMA.name, init.name);
  setStr(invoice, SCHEMA.identifier, init.invoiceNumber);
  setIri(invoice, CLAIM_SCHEMA.referencesOrder, init.estimate);
  addLineItems(invoice, init.lineItems);
  setUsd(invoice, CLAIM_SCHEMA.totalPaymentDue, sumUsd(init.lineItems));
  setAuthored(invoice, init);
  return invoice;
}

// ── An organisation's own case record ────────────────────────────────────────────────────

/** Value space of `dcterms:type` on a claim case (`mort:CaseKindScheme`). */
export const CASE_KIND_IRIS = [MORT.CaseKind_InsuranceClaim, MORT.CaseKind_RepairJob] as const;
export type CaseKindIri = (typeof CASE_KIND_IRIS)[number];

/** Value space of `schema:actionStatus` on a claim case. */
export const CASE_STATUS_IRIS = [
  CLAIM_SCHEMA.ActiveActionStatus,
  CLAIM_SCHEMA.CompletedActionStatus,
] as const;
export type CaseStatusIri = (typeof CASE_STATUS_IRIS)[number];

/** An organisation's own record of its part in a claim (mshape:ClaimCaseShape). */
export class ClaimCase extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "claim-case";
  }
  get claimNumber(): string {
    return str(this, SCHEMA.identifier);
  }
  get caseKind(): string {
    return iri(this, DCTERMS.type);
  }
  /** The claimant's WebID. */
  get customerIri(): string {
    return iri(this, SCHEMA.customer);
  }
  /** The claim file in the claimant's pod. */
  get claimFileIri(): string {
    return iri(this, SCHEMA.about);
  }
  get status(): string {
    return iri(this, CLAIM_SCHEMA.actionStatus);
  }
  get completed(): boolean {
    return this.status === CLAIM_SCHEMA.CompletedActionStatus;
  }
  get modified(): Date {
    return dateTime(this, "http://purl.org/dc/terms/modified");
  }
  /** The estimate the insurer approved. */
  get acceptedEstimateIri(): string | undefined {
    return optIri(this, CLAIM_SCHEMA.acceptedOffer);
  }
  /** The grant the organisation works under. */
  get policyIri(): string | undefined {
    return optIri(this, ODRL_HAS_POLICY);
  }
  get description(): string | undefined {
    return optStr(this, SCHEMA.description);
  }
}

export interface ClaimCaseInit {
  iri: string;
  claimNumber: string;
  caseKind: CaseKindIri;
  customer: string;
  claimFile: string;
  status: CaseStatusIri;
  modified: Date;
  acceptedEstimate?: string;
  policy?: string;
  description?: string;
}

export function buildClaimCase(init: ClaimCaseInit): ClaimCase {
  assertOneOf("caseKind", init.caseKind, CASE_KIND_IRIS);
  assertOneOf("status", init.status, CASE_STATUS_IRIS);
  const record = root(ClaimCase, init.iri);
  record.typeIris.add(MORT.ClaimCase);
  setStr(record, SCHEMA.identifier, init.claimNumber);
  setIri(record, DCTERMS.type, init.caseKind);
  setIri(record, SCHEMA.customer, init.customer);
  setIri(record, SCHEMA.about, init.claimFile);
  setIri(record, CLAIM_SCHEMA.actionStatus, init.status);
  setDateTime(record, "http://purl.org/dc/terms/modified", init.modified);
  setOptIri(record, CLAIM_SCHEMA.acceptedOffer, init.acceptedEstimate);
  setOptIri(record, ODRL_HAS_POLICY, init.policy);
  setOptStr(record, SCHEMA.description, init.description);
  return record;
}
