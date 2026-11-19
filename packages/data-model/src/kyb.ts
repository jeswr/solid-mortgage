// AUTHORED-BY Claude Opus 5.5
/**
 * Business KYB (demo 3, flows.md section 3): the typed RDF layer for a legal entity's three
 * register credentials and a bank's due diligence record. Ported from `jeswr/solid-kyb`'s
 * data model (its `kyb:` terms now live in `vocab/mort.ttl`, its `kybshape:` shapes in
 * `shapes/kyb-*.ttl`).
 *
 * - Organisational identity: legal name, legal form, registered address, illustrative LEI.
 * - Officer authorisation: the corporate officers and signatories (the control person).
 * - Beneficial ownership: one FIBO `EntityOwnership` per direct owner, with the share as a
 *   decimal percentage and as whole basis points (the integer the ZK circuits take).
 * - CDD decision record: what a bank checked and decided, kept in the bank's own pod.
 *
 * Every LEI is fictional: ISO 17442-shaped and ISO 7064 MOD 97-10 valid, under the
 * never-accredited prefix `9999`, and flagged `mort:isIllustrativeLei true`.
 */

import { DataFactory, Store } from "n3";
import type { MortgageResourceKind } from "./shacl.js";
import { DCTERMS, SCHEMA } from "./vocab/external.js";
import { MORT } from "./vocab/mort.js";
import {
  type AddressFields,
  addChild,
  child,
  children,
  date,
  iri,
  iriSet,
  num,
  optBool,
  setAddress,
  setDate,
  setDecimal,
  setInt,
  setIri,
  setOptBool,
  setStr,
  str,
  strSet,
} from "./wrappers/fields.js";
import { CredentialResource, MortgageResource } from "./wrappers/resources.js";
import { PostalAddress, TypedNode } from "./wrappers/support.js";

// ── External terms (FIBO Business Entities, OMG Commons) ─────────────────────────────────

const FIBO_BE = "https://spec.edmcouncil.org/fibo/ontology/BE/";

/** The FIBO BE and OMG Commons terms the KYB shapes use. */
export const KYB_TERMS = Object.freeze({
  BusinessEntity: `${FIBO_BE}LegalEntities/LegalPersons/BusinessEntity`,
  CorporateOfficer: `${FIBO_BE}OwnershipAndControl/Executives/CorporateOfficer`,
  EntityOwnership: `${FIBO_BE}OwnershipAndControl/OwnershipParties/EntityOwnership`,
  hasCorporateOfficer: `${FIBO_BE}OwnershipAndControl/Executives/hasCorporateOfficer`,
  hasDirectOwnership: `${FIBO_BE}OwnershipAndControl/OwnershipParties/hasDirectOwnership`,
  hasLegalForm: `${FIBO_BE}LegalEntities/LEIEntities/hasLegalForm`,
  hasOwningEntity: `${FIBO_BE}OwnershipAndControl/OwnershipParties/hasOwningEntity`,
  hasOwnershipPercentage: `${FIBO_BE}LegalEntities/LEIEntities/hasOwnershipPercentage`,
  hasTextValue: "https://www.omg.org/spec/Commons/TextDatatype/hasTextValue",
  isIdentifiedBy: "https://www.omg.org/spec/Commons/Identifiers/isIdentifiedBy",
  LegalEntityIdentifier: `${FIBO_BE}LegalEntities/LEIEntities/LegalEntityIdentifier`,
  LEIRegisteredEntity: `${FIBO_BE}LegalEntities/LEIEntities/LEIRegisteredEntity`,
  Person: "https://schema.org/Person",
  Signatory: `${FIBO_BE}OwnershipAndControl/Executives/Signatory`,
});

/** The register's legal forms, as `mort:` concepts. */
export const LEGAL_FORMS = Object.freeze({
  Corp: MORT.EntityLegalForm_Corp,
  LLC: MORT.EntityLegalForm_LLC,
  LLP: MORT.EntityLegalForm_LLP,
});
export type LegalForm = keyof typeof LEGAL_FORMS;

/** A bank's due diligence outcomes, as `mort:` concepts. */
export const CDD_DECISIONS = Object.freeze({
  declined: MORT.CddDecisionStatus_Declined,
  opened: MORT.CddDecisionStatus_Opened,
  "pending-review": MORT.CddDecisionStatus_PendingReview,
});
export type CddDecision = keyof typeof CDD_DECISIONS;

/** The CDD Rule's beneficial-owner threshold, 25 percent, in basis points. */
export const BENEFICIAL_OWNER_THRESHOLD_BPS = 2500;

/** At most this many direct owners: the completeness circuit's fixed array width. */
export const MAX_DIRECT_OWNERS = 8;

// ── Illustrative LEIs (ISO 17442, ISO 7064 MOD 97-10) ────────────────────────────────────

/** The LOU prefix of every demo LEI. GLEIF has never accredited a `9999` LOU. */
export const ILLUSTRATIVE_LOU_PREFIX = "9999";

function mod97(numerals: string): bigint {
  let remainder = 0n;
  for (const digit of numerals) remainder = (remainder * 10n + BigInt(digit)) % 97n;
  return remainder;
}

function numeralsOf(alphanumeric: string): string {
  let numerals = "";
  for (const char of alphanumeric) {
    if (/[0-9]/.test(char)) numerals += char;
    else if (/[A-Z]/.test(char)) numerals += (char.charCodeAt(0) - 55).toString();
    else throw new RangeError(`not an uppercase alphanumeric character: ${char}`);
  }
  return numerals;
}

/** The two ISO 7064 MOD 97-10 check digits of an 18-character LEI base. */
export function leiCheckDigits(base18: string): string {
  if (!/^[0-9A-Z]{18}$/.test(base18)) {
    throw new RangeError(
      `an LEI base is 18 uppercase alphanumerics, got ${JSON.stringify(base18)}`,
    );
  }
  return (98n - mod97(`${numeralsOf(base18)}00`)).toString().padStart(2, "0");
}

/** Is `lei` 20 characters with valid check digits? (Says nothing about who issued it.) */
export function isValidLei(lei: string): boolean {
  return /^[0-9A-Z]{18}[0-9]{2}$/.test(lei) && mod97(numeralsOf(lei)) === 1n;
}

/** Is `lei` a valid demo LEI under the illustrative prefix? */
export function isIllustrativeLei(lei: string): boolean {
  return lei.startsWith(ILLUSTRATIVE_LOU_PREFIX) && isValidLei(lei);
}

/** A checksum-valid illustrative LEI from an entity stem (letters and digits; 14 are used). */
export function buildIllustrativeLei(entityStem: string): string {
  const stem = entityStem
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .slice(0, 14)
    .padEnd(14, "0");
  const base = `${ILLUSTRATIVE_LOU_PREFIX}${stem}`;
  return `${base}${leiCheckDigits(base)}`;
}

// ── Typed nodes ──────────────────────────────────────────────────────────────────────────

/** `fibo-be-le-lei:LegalEntityIdentifier` (mshape:LegalEntityIdentifierShape). */
export class LegalEntityIdentifierNode extends TypedNode {
  get text(): string {
    return str(this, KYB_TERMS.hasTextValue);
  }
  get illustrative(): boolean {
    return optBool(this, MORT.isIllustrativeLei) === true;
  }
}

/** A person node: an owner or an officer. */
export class PersonNode extends TypedNode {
  get personName(): string {
    return str(this, SCHEMA.name);
  }
}

/** An authorised officer (mshape:AuthorisedOfficerShape). */
export class OfficerNode extends PersonNode {
  get jobTitle(): string {
    return str(this, SCHEMA.jobTitle);
  }
}

/** One direct ownership (mshape:EntityOwnershipShape). */
export class EntityOwnershipNode extends TypedNode {
  get owner(): PersonNode {
    return child(this, KYB_TERMS.hasOwningEntity, PersonNode);
  }
  get percentage(): number {
    return num(this, KYB_TERMS.hasOwnershipPercentage);
  }
  get bps(): number {
    return num(this, MORT.ownershipPercentageBps);
  }
}

/** Subject of the organisational identity credential. */
export class OrganisationalIdentitySubject extends TypedNode {
  get legalName(): string {
    return str(this, SCHEMA.name);
  }
  get address(): PostalAddress {
    return child(this, SCHEMA.address, PostalAddress);
  }
  get lei(): LegalEntityIdentifierNode {
    return child(this, KYB_TERMS.isIdentifiedBy, LegalEntityIdentifierNode);
  }
  get legalFormIri(): string {
    return iri(this, KYB_TERMS.hasLegalForm);
  }
}

/** Subject of the officer authorisation credential. */
export class OfficerAuthorisationSubject extends TypedNode {
  get entityName(): string {
    return str(this, SCHEMA.name);
  }
  get officers(): OfficerNode[] {
    return children(this, KYB_TERMS.hasCorporateOfficer, OfficerNode).sort((a, b) =>
      a.personName.localeCompare(b.personName),
    );
  }
}

/** Subject of the beneficial ownership credential. */
export class BeneficialOwnershipSubject extends TypedNode {
  get entityName(): string {
    return str(this, SCHEMA.name);
  }
  /** The direct owners, largest share first (then by name): the canonical owner order. */
  get ownerships(): EntityOwnershipNode[] {
    return children(this, KYB_TERMS.hasDirectOwnership, EntityOwnershipNode).sort(
      (a, b) => b.bps - a.bps || a.owner.personName.localeCompare(b.owner.personName),
    );
  }
}

export class OrganisationalIdentityCredential extends CredentialResource {
  override get resourceKind(): MortgageResourceKind {
    return "organisational-identity-credential";
  }
  get credentialSubject(): OrganisationalIdentitySubject {
    return new OrganisationalIdentitySubject(
      this.factory.namedNode(this.credentialSubjectIri),
      this.dataset,
      this.factory,
    );
  }
}

export class OfficerAuthorisationCredential extends CredentialResource {
  override get resourceKind(): MortgageResourceKind {
    return "officer-authorisation-credential";
  }
  get credentialSubject(): OfficerAuthorisationSubject {
    return new OfficerAuthorisationSubject(
      this.factory.namedNode(this.credentialSubjectIri),
      this.dataset,
      this.factory,
    );
  }
}

export class BeneficialOwnershipCredential extends CredentialResource {
  override get resourceKind(): MortgageResourceKind {
    return "beneficial-ownership-credential";
  }
  get credentialSubject(): BeneficialOwnershipSubject {
    return new BeneficialOwnershipSubject(
      this.factory.namedNode(this.credentialSubjectIri),
      this.dataset,
      this.factory,
    );
  }
}

// ── Claim writers (vc-kit signs what these write) ────────────────────────────────────────

export interface OrganisationalIdentityClaimsInit {
  legalName: string;
  legalForm: LegalForm;
  address: AddressFields;
  /** Must be an illustrative LEI (prefix 9999, valid check digits). */
  lei: string;
}

export function writeOrganisationalIdentityClaims(
  subject: TypedNode,
  init: OrganisationalIdentityClaimsInit,
): void {
  if (!isIllustrativeLei(init.lei)) {
    throw new RangeError(`${init.lei} is not an illustrative LEI (prefix 9999, valid checksum)`);
  }
  if (!Object.hasOwn(LEGAL_FORMS, init.legalForm)) {
    throw new RangeError(`unknown legal form ${init.legalForm}`);
  }
  subject.typeIris.add(KYB_TERMS.LEIRegisteredEntity);
  subject.typeIris.add(KYB_TERMS.BusinessEntity);
  subject.typeIris.add(SCHEMA.Organization);
  setStr(subject, SCHEMA.name, init.legalName);
  setAddress(subject, SCHEMA.address, init.address);
  const lei = addChild(subject, KYB_TERMS.isIdentifiedBy, LegalEntityIdentifierNode);
  lei.typeIris.add(KYB_TERMS.LegalEntityIdentifier);
  setStr(lei, KYB_TERMS.hasTextValue, init.lei);
  setOptBool(lei, MORT.isIllustrativeLei, true);
  setIri(subject, KYB_TERMS.hasLegalForm, LEGAL_FORMS[init.legalForm]);
}

export interface OfficerInit {
  name: string;
  jobTitle: string;
}

export interface OfficerAuthorisationClaimsInit {
  entityName: string;
  officers: readonly OfficerInit[];
}

export function writeOfficerAuthorisationClaims(
  subject: TypedNode,
  init: OfficerAuthorisationClaimsInit,
): void {
  if (init.officers.length === 0) throw new RangeError("at least one officer");
  setStr(subject, SCHEMA.name, init.entityName);
  init.officers.forEach((officer, index) => {
    const node = addChild(subject, KYB_TERMS.hasCorporateOfficer, OfficerNode, String(index + 1));
    node.typeIris.add(KYB_TERMS.CorporateOfficer);
    node.typeIris.add(KYB_TERMS.Signatory);
    node.typeIris.add(KYB_TERMS.Person);
    setStr(node, SCHEMA.name, officer.name);
    setStr(node, SCHEMA.jobTitle, officer.jobTitle);
  });
}

export interface OwnerInit {
  name: string;
  /** Whole basis points, 0 to 10000. */
  bps: number;
}

export interface BeneficialOwnershipClaimsInit {
  entityName: string;
  owners: readonly OwnerInit[];
}

export function writeBeneficialOwnershipClaims(
  subject: TypedNode,
  init: BeneficialOwnershipClaimsInit,
): void {
  if (init.owners.length === 0 || init.owners.length > MAX_DIRECT_OWNERS) {
    throw new RangeError(`between 1 and ${MAX_DIRECT_OWNERS} owners, got ${init.owners.length}`);
  }
  const total = init.owners.reduce((sum, owner) => sum + owner.bps, 0);
  if (total > 10_000) throw new RangeError(`owner shares add up to ${total} bps, over 10000`);
  setStr(subject, SCHEMA.name, init.entityName);
  init.owners.forEach((owner, index) => {
    if (!Number.isSafeInteger(owner.bps) || owner.bps < 0 || owner.bps > 10_000) {
      throw new RangeError(`${owner.name}: bps must be a whole number from 0 to 10000`);
    }
    const ownership = addChild(
      subject,
      KYB_TERMS.hasDirectOwnership,
      EntityOwnershipNode,
      String(index + 1),
    );
    ownership.typeIris.add(KYB_TERMS.EntityOwnership);
    const person = addChild(ownership, KYB_TERMS.hasOwningEntity, PersonNode);
    person.typeIris.add(KYB_TERMS.Person);
    setStr(person, SCHEMA.name, owner.name);
    setDecimal(ownership, KYB_TERMS.hasOwnershipPercentage, owner.bps / 100);
    setInt(ownership, MORT.ownershipPercentageBps, owner.bps);
  });
}

// ── The bank's CDD decision record ───────────────────────────────────────────────────────

export class CddDecisionRecord extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "cdd-decision-record";
  }
  get name(): string {
    return str(this, SCHEMA.name);
  }
  get customer(): string {
    return iri(this, DCTERMS.subject);
  }
  get bank(): string {
    return iri(this, DCTERMS.creator);
  }
  get decisionIri(): string {
    return iri(this, MORT.cddDecisionStatus);
  }
  get decision(): CddDecision | undefined {
    const value = this.decisionIri;
    return (Object.keys(CDD_DECISIONS) as CddDecision[]).find(
      (key) => CDD_DECISIONS[key] === value,
    );
  }
  get checkDate(): Date {
    return date(this, MORT.cddCheckDate);
  }
  get checkedCredentials(): string[] {
    return [...iriSet(this, MORT.checkedCredential)].sort();
  }
  get beneficialOwners(): string[] {
    return [...strSet(this, MORT.identifiedBeneficialOwner)].sort();
  }
  get controlPerson(): string {
    return str(this, MORT.controlPerson);
  }
}

export interface CddDecisionRecordInit {
  iri: string;
  name: string;
  customer: string;
  bank: string;
  decision: CddDecision;
  checkDate: Date;
  checkedCredentials: readonly string[];
  beneficialOwners: readonly string[];
  controlPerson: string;
}

export function buildCddDecisionRecord(init: CddDecisionRecordInit): CddDecisionRecord {
  const record = new CddDecisionRecord(DataFactory.namedNode(init.iri), new Store(), DataFactory);
  record.typeIris.add(MORT.CddDecisionRecord);
  setStr(record, SCHEMA.name, init.name);
  setIri(record, DCTERMS.subject, init.customer);
  setIri(record, DCTERMS.creator, init.bank);
  setIri(record, MORT.cddDecisionStatus, CDD_DECISIONS[init.decision]);
  setDate(record, MORT.cddCheckDate, init.checkDate);
  const checked = iriSet(record, MORT.checkedCredential);
  for (const credential of init.checkedCredentials) checked.add(credential);
  const owners = strSet(record, MORT.identifiedBeneficialOwner);
  for (const owner of init.beneficialOwners) owners.add(owner);
  setStr(record, MORT.controlPerson, init.controlPerson);
  return record;
}
