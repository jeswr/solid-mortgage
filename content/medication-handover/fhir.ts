// AUTHORED-BY Claude Opus 5.5
/**
 * Typed FHIR R5 RDF wrappers for the medication handover (https://hl7.org/fhir/R5/rdf.html).
 *
 * The documents in Rosa's pod are FHIR resources in their RDF form: `MedicationStatement` (one
 * per medicine on her list), `MedicationRequest` (a discharge prescription), `MedicationDispense`
 * (a supply), `AllergyIntolerance`, `Composition` (the discharge summary) and `Provenance` (who
 * changed the list, on whose behalf, and why). The practice keeps an `Encounter` in its own pod.
 *
 * FHIR's RDF form puts each primitive on its own node (`fhir:v`) and each repeating element in an
 * RDF collection. Every node and every collection here is made through `@rdfjs/wrapper` mappings
 * (`RequiredAs`, a list-cell wrapper); `toTurtle` checks the SHACL shape in `@mortgage/data-model` before
 * anything is written. Everything clinical is fictional and is not clinical guidance.
 */

import { MortgageResource, type MortgageResourceKind } from "@mortgage/data-model";
import type { DatasetCore, Term } from "@rdfjs/types";
import {
  LiteralAs,
  LiteralFrom,
  NamedNodeAs,
  NamedNodeFrom,
  OptionalFrom,
  RequiredAs,
  RequiredFrom,
  TermAs,
  TermFrom,
  TermWrapper,
} from "@rdfjs/wrapper";
import { DataFactory, Store } from "n3";
import { type Medicine, RXNORM } from "./facts.js";

const FHIR_NS = "http://hl7.org/fhir/";
const RDF_NS = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const XSD_DECIMAL = "http://www.w3.org/2001/XMLSchema#decimal";

/** The FHIR terms these documents use. */
export const FHIR = Object.freeze({
  AllergyIntolerance: `${FHIR_NS}AllergyIntolerance`,
  Composition: `${FHIR_NS}Composition`,
  Encounter: `${FHIR_NS}Encounter`,
  MedicationDispense: `${FHIR_NS}MedicationDispense`,
  MedicationRequest: `${FHIR_NS}MedicationRequest`,
  MedicationStatement: `${FHIR_NS}MedicationStatement`,
  Provenance: `${FHIR_NS}Provenance`,
  activity: `${FHIR_NS}activity`,
  actor: `${FHIR_NS}actor`,
  actualPeriod: `${FHIR_NS}actualPeriod`,
  adherence: `${FHIR_NS}adherence`,
  agent: `${FHIR_NS}agent`,
  author: `${FHIR_NS}author`,
  authoredOn: `${FHIR_NS}authoredOn`,
  authorizingPrescription: `${FHIR_NS}authorizingPrescription`,
  category: `${FHIR_NS}category`,
  clinicalStatus: `${FHIR_NS}clinicalStatus`,
  code: `${FHIR_NS}code`,
  coding: `${FHIR_NS}coding`,
  concept: `${FHIR_NS}concept`,
  criticality: `${FHIR_NS}criticality`,
  date: `${FHIR_NS}date`,
  dateAsserted: `${FHIR_NS}dateAsserted`,
  display: `${FHIR_NS}display`,
  dosage: `${FHIR_NS}dosage`,
  dosageInstruction: `${FHIR_NS}dosageInstruction`,
  entry: `${FHIR_NS}entry`,
  id: `${FHIR_NS}id`,
  intent: `${FHIR_NS}intent`,
  link: `${FHIR_NS}link`,
  medication: `${FHIR_NS}medication`,
  nodeRole: `${FHIR_NS}nodeRole`,
  note: `${FHIR_NS}note`,
  onBehalfOf: `${FHIR_NS}onBehalfOf`,
  patient: `${FHIR_NS}patient`,
  performer: `${FHIR_NS}performer`,
  quantity: `${FHIR_NS}quantity`,
  reason: `${FHIR_NS}reason`,
  recorded: `${FHIR_NS}recorded`,
  recordedDate: `${FHIR_NS}recordedDate`,
  reference: `${FHIR_NS}reference`,
  requester: `${FHIR_NS}requester`,
  section: `${FHIR_NS}section`,
  serviceProvider: `${FHIR_NS}serviceProvider`,
  start: `${FHIR_NS}start`,
  status: `${FHIR_NS}status`,
  subject: `${FHIR_NS}subject`,
  system: `${FHIR_NS}system`,
  target: `${FHIR_NS}target`,
  text: `${FHIR_NS}text`,
  title: `${FHIR_NS}title`,
  treeRoot: `${FHIR_NS}treeRoot`,
  type: `${FHIR_NS}type`,
  unit: `${FHIR_NS}unit`,
  v: `${FHIR_NS}v`,
  value: `${FHIR_NS}value`,
  verificationStatus: `${FHIR_NS}verificationStatus`,
  who: `${FHIR_NS}who`,
  whenHandedOver: `${FHIR_NS}whenHandedOver`,
  why: `${FHIR_NS}why`,
});

/** The FHIR and HL7 terminology code systems these documents use. */
export const CODE_SYSTEMS = Object.freeze({
  adherence: "http://hl7.org/fhir/CodeSystem/medication-statement-adherence",
  allergyClinical: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
  allergyVerification: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification",
  dataOperation: "http://terminology.hl7.org/CodeSystem/v3-DataOperation",
  loinc: "http://loinc.org",
  participantType: "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
  rxnorm: RXNORM,
});

/** LOINC 18842-5, "Discharge summary". */
export const DISCHARGE_SUMMARY_LOINC = "18842-5";

const RDF_TYPE = `${RDF_NS}type`;
const RDF_FIRST = `${RDF_NS}first`;
const RDF_REST = `${RDF_NS}rest`;
const RDF_NIL = `${RDF_NS}nil`;

/** One cell of an RDF collection (`rdf:first`, `rdf:rest`). */
class ListCell extends TermWrapper {
  get first(): Term | undefined {
    return OptionalFrom.subjectPredicate(this, RDF_FIRST, TermAs.term);
  }
  set first(value: Term) {
    RequiredAs.object(this, RDF_FIRST, value, TermFrom.itself);
  }
  get rest(): Term | undefined {
    return OptionalFrom.subjectPredicate(this, RDF_REST, TermAs.term);
  }
  set rest(value: Term) {
    RequiredAs.object(this, RDF_REST, value, TermFrom.itself);
  }
}

// ---------------------------------------------------------------------------------------------
// Node helpers. Each makes or reads one FHIR element through @rdfjs/wrapper mappings.

const wrap = (term: Term, on: TermWrapper): TermWrapper =>
  new TermWrapper(term, on.dataset, on.factory);

/** Attach a new blank node to `on` at `p` and return it. */
function child(on: TermWrapper, p: string): TermWrapper {
  const node = on.factory.blankNode();
  RequiredAs.object(on, p, node, TermFrom.itself);
  return wrap(node, on);
}

/** The node at `p`, or `undefined`. */
function childOf(on: TermWrapper, p: string): TermWrapper | undefined {
  return OptionalFrom.subjectPredicate(on, p, TermAs.instance(TermWrapper));
}

function requiredChild(on: TermWrapper, p: string): TermWrapper {
  return RequiredFrom.subjectPredicate(on, p, TermAs.instance(TermWrapper));
}

/** A FHIR string primitive: `on p [ fhir:v "value" ]`. */
function setString(on: TermWrapper, p: string, value: string): void {
  RequiredAs.object(child(on, p), FHIR.v, value, LiteralFrom.string);
}
function setDateTime(on: TermWrapper, p: string, value: Date): void {
  RequiredAs.object(child(on, p), FHIR.v, value, LiteralFrom.dateTime);
}
function setUri(on: TermWrapper, p: string, value: string): void {
  RequiredAs.object(child(on, p), FHIR.v, value, LiteralFrom.anyUriString);
}
function setDecimal(on: TermWrapper, p: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`not a quantity: ${value}`);
  RequiredAs.object(child(on, p), FHIR.v, value, (number, factory) =>
    factory.literal(
      Number.isInteger(number) ? `${number}.0` : String(number),
      factory.namedNode(XSD_DECIMAL),
    ),
  );
}

function stringOf(on: TermWrapper, p: string): string {
  return RequiredFrom.subjectPredicate(requiredChild(on, p), FHIR.v, LiteralAs.string);
}
function optStringOf(on: TermWrapper, p: string): string | undefined {
  const node = childOf(on, p);
  return node === undefined
    ? undefined
    : RequiredFrom.subjectPredicate(node, FHIR.v, LiteralAs.string);
}
function dateTimeOf(on: TermWrapper, p: string): Date {
  return RequiredFrom.subjectPredicate(requiredChild(on, p), FHIR.v, LiteralAs.date);
}
function numberOf(on: TermWrapper, p: string): number {
  return RequiredFrom.subjectPredicate(requiredChild(on, p), FHIR.v, LiteralAs.number);
}

/**
 * A repeating element: an RDF collection of `count` new blank nodes at `p`, returned in order.
 * Each cell is a `ListCell` wrapper, so `rdf:first`/`rdf:rest` go through the wrapper too.
 */
function list(on: TermWrapper, p: string, count: number): TermWrapper[] {
  const { factory } = on;
  const nil = factory.namedNode(RDF_NIL);
  const cells = Array.from({ length: count }, () => factory.blankNode());
  const members = Array.from({ length: count }, () => factory.blankNode());
  RequiredAs.object(on, p, cells[0] ?? nil, TermFrom.itself);
  cells.forEach((cell, index) => {
    const item = new ListCell(cell, on.dataset, factory);
    item.first = members[index] as Term;
    item.rest = cells[index + 1] ?? nil;
  });
  return members.map((member) => wrap(member, on));
}

/** The members of the collection at `p` (empty when there is none). */
function listOf(on: TermWrapper, p: string): TermWrapper[] {
  let cell = OptionalFrom.subjectPredicate(on, p, TermAs.term);
  const members: TermWrapper[] = [];
  const seen = new Set<string>();
  while (cell !== undefined && cell.value !== RDF_NIL) {
    if (seen.has(cell.value)) throw new Error(`${p}: the collection loops`);
    seen.add(cell.value);
    const item = new ListCell(cell, on.dataset, on.factory);
    const first = item.first;
    if (first === undefined) throw new Error(`${p}: a collection cell has no rdf:first`);
    members.push(wrap(first, on));
    cell = item.rest;
    if (cell === undefined) throw new Error(`${p}: a collection cell has no rdf:rest`);
  }
  return members;
}

// ---------------------------------------------------------------------------------------------
// Data types.

export interface CodingValue {
  readonly system: string;
  readonly code: string;
  readonly display?: string;
}

function writeCoding(node: TermWrapper, coding: CodingValue): void {
  setUri(node, FHIR.system, coding.system);
  setString(node, FHIR.code, coding.code);
  if (coding.display !== undefined) setString(node, FHIR.display, coding.display);
}

function writeConcept(node: TermWrapper, codings: readonly CodingValue[], text?: string): void {
  if (codings.length > 0) {
    list(node, FHIR.coding, codings.length).forEach((coding, index) => {
      writeCoding(coding, codings[index] as CodingValue);
    });
  }
  if (text !== undefined) setString(node, FHIR.text, text);
}

function readCodings(concept: TermWrapper): CodingValue[] {
  return listOf(concept, FHIR.coding).map((coding) => {
    const display = optStringOf(coding, FHIR.display);
    return {
      code: stringOf(coding, FHIR.code),
      system: stringOf(coding, FHIR.system),
      ...(display === undefined ? {} : { display }),
    };
  });
}

/** The first code from `system` on the concept at `p`. */
function codeOf(on: TermWrapper, p: string, system: string): string | undefined {
  const concept = childOf(on, p);
  if (concept === undefined) return undefined;
  return readCodings(concept).find((coding) => coding.system === system)?.code;
}

/** A coded medicine: the RxNorm ingredient code, plus the product and strength as text. */
export interface MedicineCode {
  readonly rxcui: string;
  readonly ingredient: string;
  readonly product: string;
}

function writeRxNormConcept(node: TermWrapper, medicine: MedicineCode): void {
  writeConcept(
    node,
    [{ code: medicine.rxcui, display: medicine.ingredient, system: RXNORM }],
    medicine.product,
  );
}

function readRxNormConcept(concept: TermWrapper): MedicineCode {
  const coding = readCodings(concept).find((candidate) => candidate.system === RXNORM);
  if (coding === undefined) throw new Error("the medicine has no RxNorm coding");
  return {
    ingredient: coding.display ?? coding.code,
    product: stringOf(concept, FHIR.text),
    rxcui: coding.code,
  };
}

/** A Reference: a display name and, when it resolves, the IRI it points at. */
export interface ReferenceValue {
  readonly display: string;
  /** The resource or WebID it resolves to (written as `fhir:link` and `fhir:reference`). */
  readonly iri?: string;
}

function writeReference(node: TermWrapper, reference: ReferenceValue): void {
  if (reference.iri !== undefined) {
    setString(node, FHIR.reference, reference.iri);
    RequiredAs.object(node, FHIR.link, reference.iri, NamedNodeFrom.string);
  }
  setString(node, FHIR.display, reference.display);
}

function readReference(node: TermWrapper): ReferenceValue {
  const iri = OptionalFrom.subjectPredicate(node, FHIR.link, NamedNodeAs.string);
  return { display: stringOf(node, FHIR.display), ...(iri === undefined ? {} : { iri }) };
}

function setReference(on: TermWrapper, p: string, reference: ReferenceValue): void {
  writeReference(child(on, p), reference);
}

function referenceOf(on: TermWrapper, p: string): ReferenceValue {
  return readReference(requiredChild(on, p));
}

function writeDosages(on: TermWrapper, p: string, texts: readonly string[]): void {
  list(on, p, texts.length).forEach((dosage, index) => {
    setString(dosage, FHIR.text, texts[index] as string);
  });
}

function dosagesOf(on: TermWrapper, p: string): string[] {
  return listOf(on, p).map((dosage) => stringOf(dosage, FHIR.text));
}

function writeNotes(on: TermWrapper, notes: readonly string[]): void {
  if (notes.length === 0) return;
  list(on, FHIR.note, notes.length).forEach((note, index) => {
    setString(note, FHIR.text, notes[index] as string);
  });
}

function notesOf(on: TermWrapper): string[] {
  return listOf(on, FHIR.note).map((note) => stringOf(note, FHIR.text));
}

// ---------------------------------------------------------------------------------------------
// Resources.

type Ctor<T> = new (term: string, dataset: DatasetCore, factory: typeof DataFactory) => T;

function root<T extends FhirResource>(ctor: Ctor<T>, iri: string, type: string, id: string): T {
  const resource = new ctor(iri, new Store(), DataFactory);
  RequiredAs.object(resource, RDF_TYPE, type, NamedNodeFrom.string);
  RequiredAs.object(resource, FHIR.nodeRole, FHIR.treeRoot, NamedNodeFrom.string);
  setString(resource, FHIR.id, id);
  return resource;
}

/** The last path segment of a resource IRI: its FHIR `id`. */
export function idOf(iri: string): string {
  const path = new URL(iri).pathname;
  return decodeURIComponent(path.slice(path.lastIndexOf("/") + 1));
}

/** Common to every FHIR resource document. */
export abstract class FhirResource extends MortgageResource {
  get fhirId(): string {
    return stringOf(this, FHIR.id);
  }
  get status(): string {
    return stringOf(this, FHIR.status);
  }
}

// MedicationStatement --------------------------------------------------------------------------

export type Adherence = "taking-as-directed" | "stopped-as-directed";

/** One medicine on Rosa's list (`mshape:MedicationStatementShape`). */
export class MedicationStatement extends FhirResource {
  override get resourceKind(): MortgageResourceKind {
    return "medication-statement";
  }
  get medicine(): MedicineCode {
    return readRxNormConcept(requiredChild(requiredChild(this, FHIR.medication), FHIR.concept));
  }
  get patient(): ReferenceValue {
    return referenceOf(this, FHIR.subject);
  }
  get dateAsserted(): Date {
    return dateTimeOf(this, FHIR.dateAsserted);
  }
  get dosage(): string {
    return dosagesOf(this, FHIR.dosage)[0] ?? "";
  }
  get adherence(): Adherence {
    const code = codeOf(requiredChild(this, FHIR.adherence), FHIR.code, CODE_SYSTEMS.adherence);
    if (code !== "taking-as-directed" && code !== "stopped-as-directed") {
      throw new Error(`unexpected adherence code ${String(code)}`);
    }
    return code;
  }
  /** Why the medicine was stopped, when it was (the adherence reason's text). */
  get stopReason(): string | undefined {
    const reason = childOf(requiredChild(this, FHIR.adherence), FHIR.reason);
    return reason === undefined ? undefined : optStringOf(reason, FHIR.text);
  }
  get isActive(): boolean {
    return this.adherence === "taking-as-directed";
  }
}

export interface MedicationStatementInit {
  readonly iri: string;
  readonly medicine: Medicine;
  readonly subject: ReferenceValue;
  readonly dateAsserted: Date;
  readonly adherence: Adherence;
  readonly stopReason?: string;
}

export function buildMedicationStatement(init: MedicationStatementInit): MedicationStatement {
  const statement = root(MedicationStatement, init.iri, FHIR.MedicationStatement, idOf(init.iri));
  setString(statement, FHIR.status, "recorded");
  writeRxNormConcept(child(child(statement, FHIR.medication), FHIR.concept), init.medicine);
  setReference(statement, FHIR.subject, init.subject);
  setDateTime(statement, FHIR.dateAsserted, init.dateAsserted);
  writeDosages(statement, FHIR.dosage, [init.medicine.dosage]);
  const adherence = child(statement, FHIR.adherence);
  writeConcept(child(adherence, FHIR.code), [
    { code: init.adherence, system: CODE_SYSTEMS.adherence },
  ]);
  if (init.stopReason !== undefined)
    writeConcept(child(adherence, FHIR.reason), [], init.stopReason);
  return statement;
}

// MedicationRequest ----------------------------------------------------------------------------

/** A discharge prescription (`mshape:MedicationRequestShape`). */
export class MedicationRequest extends FhirResource {
  override get resourceKind(): MortgageResourceKind {
    return "medication-request";
  }
  get intent(): string {
    return stringOf(this, FHIR.intent);
  }
  get medicine(): MedicineCode {
    return readRxNormConcept(requiredChild(requiredChild(this, FHIR.medication), FHIR.concept));
  }
  get authoredOn(): Date {
    return dateTimeOf(this, FHIR.authoredOn);
  }
  get requester(): ReferenceValue {
    return referenceOf(this, FHIR.requester);
  }
  get dosage(): string {
    return dosagesOf(this, FHIR.dosageInstruction)[0] ?? "";
  }
}

export interface MedicationRequestInit {
  readonly iri: string;
  readonly medicine: Medicine;
  readonly subject: ReferenceValue;
  readonly authoredOn: Date;
  readonly requester: ReferenceValue;
}

export function buildMedicationRequest(init: MedicationRequestInit): MedicationRequest {
  const request = root(MedicationRequest, init.iri, FHIR.MedicationRequest, idOf(init.iri));
  setString(request, FHIR.status, "active");
  setString(request, FHIR.intent, "order");
  writeRxNormConcept(child(child(request, FHIR.medication), FHIR.concept), init.medicine);
  setReference(request, FHIR.subject, init.subject);
  setDateTime(request, FHIR.authoredOn, init.authoredOn);
  setReference(request, FHIR.requester, init.requester);
  writeDosages(request, FHIR.dosageInstruction, [init.medicine.dosage]);
  return request;
}

// MedicationDispense ---------------------------------------------------------------------------

/** A supply (`mshape:MedicationDispenseShape`), in Rosa's pod or the pharmacy's own records. */
export class MedicationDispense extends FhirResource {
  override get resourceKind(): MortgageResourceKind {
    return "medication-dispense";
  }
  get medicine(): MedicineCode {
    return readRxNormConcept(requiredChild(requiredChild(this, FHIR.medication), FHIR.concept));
  }
  get patient(): ReferenceValue {
    return referenceOf(this, FHIR.subject);
  }
  get performer(): ReferenceValue {
    const first = listOf(this, FHIR.performer)[0];
    if (first === undefined) throw new Error("the dispense has no performer");
    return referenceOf(first, FHIR.actor);
  }
  get quantity(): number {
    return numberOf(requiredChild(this, FHIR.quantity), FHIR.value);
  }
  get unit(): string | undefined {
    return optStringOf(requiredChild(this, FHIR.quantity), FHIR.unit);
  }
  get whenHandedOver(): Date {
    return dateTimeOf(this, FHIR.whenHandedOver);
  }
  get prescriptions(): ReferenceValue[] {
    return listOf(this, FHIR.authorizingPrescription).map(readReference);
  }
  get dosage(): string | undefined {
    return dosagesOf(this, FHIR.dosageInstruction)[0];
  }
}

export interface MedicationDispenseInit {
  readonly iri: string;
  readonly medicine: Medicine;
  readonly subject: ReferenceValue;
  readonly performer: ReferenceValue;
  readonly quantity: number;
  readonly whenHandedOver: Date;
  readonly prescriptions?: readonly ReferenceValue[];
}

export function buildMedicationDispense(init: MedicationDispenseInit): MedicationDispense {
  const dispense = root(MedicationDispense, init.iri, FHIR.MedicationDispense, idOf(init.iri));
  setString(dispense, FHIR.status, "completed");
  writeRxNormConcept(child(child(dispense, FHIR.medication), FHIR.concept), init.medicine);
  setReference(dispense, FHIR.subject, init.subject);
  const [performer] = list(dispense, FHIR.performer, 1);
  if (performer !== undefined) setReference(performer, FHIR.actor, init.performer);
  const prescriptions = init.prescriptions ?? [];
  if (prescriptions.length > 0) {
    list(dispense, FHIR.authorizingPrescription, prescriptions.length).forEach((node, index) => {
      writeReference(node, prescriptions[index] as ReferenceValue);
    });
  }
  const quantity = child(dispense, FHIR.quantity);
  setDecimal(quantity, FHIR.value, init.quantity);
  setString(quantity, FHIR.unit, "tablets");
  setDateTime(dispense, FHIR.whenHandedOver, init.whenHandedOver);
  writeDosages(dispense, FHIR.dosageInstruction, [init.medicine.dosage]);
  return dispense;
}

// AllergyIntolerance ---------------------------------------------------------------------------

/** An allergy (`mshape:AllergyIntoleranceShape`). */
export class AllergyIntolerance extends FhirResource {
  override get resourceKind(): MortgageResourceKind {
    return "allergy-intolerance";
  }
  get substance(): MedicineCode {
    return readRxNormConcept(requiredChild(this, FHIR.code));
  }
  get clinicalStatus(): string | undefined {
    return codeOf(this, FHIR.clinicalStatus, CODE_SYSTEMS.allergyClinical);
  }
  get criticality(): string | undefined {
    return optStringOf(this, FHIR.criticality);
  }
  get recordedDate(): Date {
    return dateTimeOf(this, FHIR.recordedDate);
  }
  get notes(): string[] {
    return notesOf(this);
  }
}

export interface AllergyIntoleranceInit {
  readonly iri: string;
  readonly substance: MedicineCode;
  readonly patient: ReferenceValue;
  readonly recordedDate: Date;
  readonly note?: string;
}

export function buildAllergyIntolerance(init: AllergyIntoleranceInit): AllergyIntolerance {
  const allergy = root(AllergyIntolerance, init.iri, FHIR.AllergyIntolerance, idOf(init.iri));
  writeConcept(child(allergy, FHIR.clinicalStatus), [
    { code: "active", system: CODE_SYSTEMS.allergyClinical },
  ]);
  writeConcept(child(allergy, FHIR.verificationStatus), [
    { code: "confirmed", system: CODE_SYSTEMS.allergyVerification },
  ]);
  const [category] = list(allergy, FHIR.category, 1);
  if (category !== undefined) RequiredAs.object(category, FHIR.v, "medication", LiteralFrom.string);
  setString(allergy, FHIR.criticality, "low");
  writeRxNormConcept(child(allergy, FHIR.code), init.substance);
  setReference(allergy, FHIR.patient, init.patient);
  setDateTime(allergy, FHIR.recordedDate, init.recordedDate);
  writeNotes(allergy, init.note === undefined ? [] : [init.note]);
  return allergy;
}

// Provenance -----------------------------------------------------------------------------------

export type ProvenanceActivity = "CREATE" | "UPDATE";

/**
 * Who changed the list, on whose behalf, and why (`mshape:ProvenanceRecordShape`). The pod's own
 * history (the Lens's `resourceHistory`) shows that a document changed and which WebID wrote it;
 * this record carries what the pod cannot know: the clinician's name and the reason.
 */
export class ProvenanceRecord extends FhirResource {
  override get resourceKind(): MortgageResourceKind {
    return "provenance-record";
  }
  /** The documents this record is about. */
  get targets(): ReferenceValue[] {
    return listOf(this, FHIR.target).map(readReference);
  }
  get recorded(): Date {
    return dateTimeOf(this, FHIR.recorded);
  }
  get why(): string {
    return stringOf(this, FHIR.why);
  }
  get activity(): ProvenanceActivity {
    const code = codeOf(this, FHIR.activity, CODE_SYSTEMS.dataOperation);
    if (code !== "CREATE" && code !== "UPDATE") throw new Error(`unexpected activity ${code}`);
    return code;
  }
  /** The person who made the change. */
  get author(): string {
    const agent = listOf(this, FHIR.agent)[0];
    if (agent === undefined) throw new Error("the provenance record has no agent");
    return referenceOf(agent, FHIR.who).display;
  }
  /** The organisation the person acted for. */
  get onBehalfOf(): ReferenceValue {
    const agent = listOf(this, FHIR.agent)[0];
    if (agent === undefined) throw new Error("the provenance record has no agent");
    return referenceOf(agent, FHIR.onBehalfOf);
  }
}

export interface ProvenanceRecordInit {
  readonly iri: string;
  readonly target: ReferenceValue;
  readonly recorded: Date;
  readonly why: string;
  readonly activity: ProvenanceActivity;
  readonly patient: ReferenceValue;
  /** The clinician's name and role. */
  readonly author: string;
  readonly onBehalfOf: ReferenceValue;
}

export function buildProvenanceRecord(init: ProvenanceRecordInit): ProvenanceRecord {
  const record = root(ProvenanceRecord, init.iri, FHIR.Provenance, idOf(init.iri));
  const [target] = list(record, FHIR.target, 1);
  if (target !== undefined) writeReference(target, init.target);
  setDateTime(record, FHIR.recorded, init.recorded);
  setString(record, FHIR.why, init.why);
  writeConcept(child(record, FHIR.activity), [
    { code: init.activity, system: CODE_SYSTEMS.dataOperation },
  ]);
  setReference(record, FHIR.patient, init.patient);
  const [agent] = list(record, FHIR.agent, 1);
  if (agent !== undefined) {
    writeConcept(child(agent, FHIR.type), [
      { code: "author", system: CODE_SYSTEMS.participantType },
    ]);
    setReference(agent, FHIR.who, { display: init.author });
    setReference(agent, FHIR.onBehalfOf, init.onBehalfOf);
  }
  return record;
}

// Composition (discharge summary) --------------------------------------------------------------

export interface SummarySection {
  readonly title: string;
  readonly entries: readonly ReferenceValue[];
}

/** The discharge summary (`mshape:DischargeSummaryShape`, LOINC 18842-5). */
export class DischargeSummary extends FhirResource {
  override get resourceKind(): MortgageResourceKind {
    return "discharge-summary";
  }
  get title(): string {
    return stringOf(this, FHIR.title);
  }
  get date(): Date {
    return dateTimeOf(this, FHIR.date);
  }
  get author(): string {
    const first = listOf(this, FHIR.author)[0];
    if (first === undefined) throw new Error("the summary has no author");
    return readReference(first).display;
  }
  get sections(): SummarySection[] {
    return listOf(this, FHIR.section).map((section) => ({
      entries: listOf(section, FHIR.entry).map(readReference),
      title: stringOf(section, FHIR.title),
    }));
  }
  get notes(): string[] {
    return notesOf(this);
  }
}

export interface DischargeSummaryInit {
  readonly iri: string;
  readonly subject: ReferenceValue;
  readonly date: Date;
  readonly author: string;
  readonly title: string;
  readonly sections: readonly SummarySection[];
  readonly notes: readonly string[];
}

export function buildDischargeSummary(init: DischargeSummaryInit): DischargeSummary {
  const summary = root(DischargeSummary, init.iri, FHIR.Composition, idOf(init.iri));
  setString(summary, FHIR.status, "final");
  writeConcept(child(summary, FHIR.type), [
    { code: DISCHARGE_SUMMARY_LOINC, display: "Discharge summary", system: CODE_SYSTEMS.loinc },
  ]);
  const [subject] = list(summary, FHIR.subject, 1);
  if (subject !== undefined) writeReference(subject, init.subject);
  setDateTime(summary, FHIR.date, init.date);
  const [author] = list(summary, FHIR.author, 1);
  if (author !== undefined) writeReference(author, { display: init.author });
  setString(summary, FHIR.title, init.title);
  writeNotes(summary, init.notes);
  list(summary, FHIR.section, init.sections.length).forEach((node, index) => {
    const section = init.sections[index] as SummarySection;
    setString(node, FHIR.title, section.title);
    if (section.entries.length > 0) {
      list(node, FHIR.entry, section.entries.length).forEach((entry, at) => {
        writeReference(entry, section.entries[at] as ReferenceValue);
      });
    }
  });
  return summary;
}

// Encounter ------------------------------------------------------------------------------------

/** The practice's own record of the consultation (`mshape:EncounterRecordShape`). */
export class EncounterRecord extends FhirResource {
  override get resourceKind(): MortgageResourceKind {
    return "encounter-record";
  }
  get patient(): ReferenceValue {
    return referenceOf(this, FHIR.subject);
  }
  get serviceProvider(): ReferenceValue {
    return referenceOf(this, FHIR.serviceProvider);
  }
  get start(): Date {
    return dateTimeOf(requiredChild(this, FHIR.actualPeriod), FHIR.start);
  }
}

export interface EncounterRecordInit {
  readonly iri: string;
  readonly subject: ReferenceValue;
  readonly serviceProvider: ReferenceValue;
  readonly start: Date;
}

export function buildEncounterRecord(init: EncounterRecordInit): EncounterRecord {
  const encounter = root(EncounterRecord, init.iri, FHIR.Encounter, idOf(init.iri));
  setString(encounter, FHIR.status, "completed");
  setReference(encounter, FHIR.subject, init.subject);
  setReference(encounter, FHIR.serviceProvider, init.serviceProvider);
  setDateTime(child(encounter, FHIR.actualPeriod), FHIR.start, init.start);
  return encounter;
}
