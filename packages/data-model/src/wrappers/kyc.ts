// AUTHORED-BY Claude Opus 5.5
import { DataFactory, Store } from "n3";
import type { MortgageResourceKind } from "../shacl.js";
import { CRED, DCTERMS, SCHEMA } from "../vocab/external.js";
import { MORT } from "../vocab/mort.js";
import { applyEnvelope, type CredentialEnvelopeInit } from "./build.js";
import {
  type AddressFields,
  addChild,
  child,
  children,
  date,
  dateTime,
  iri,
  iriSet,
  optDateTime,
  setAddress,
  setDate,
  setDateTime,
  setIri,
  setOptDateTime,
  setOrganization,
  setStr,
  str,
} from "./fields.js";
import { CredentialResource, MortgageResource } from "./resources.js";
import { OrganizationNode, PostalAddress, TypedNode } from "./support.js";

/**
 * Typed wrappers for the reusable KYC demo (flows.md section 8): the KYC attestation a bank
 * issues (what it verified, how and when; never a document image or number) and a reliance
 * scheme's published list of trusted issuers. vc-kit writes the attestation claims through
 * {@link writeKycAttestationClaims} and reads the list through {@link TrustedIssuerList}.
 */

/** Value space of `mort:checkMethod` (mort:IdentityCheckMethodScheme). */
export const IDENTITY_CHECK_METHOD_IRIS = [
  MORT.IdentityCheckMethod_Documentary,
  MORT.IdentityCheckMethod_NonDocumentary,
  MORT.IdentityCheckMethod_GovernmentList,
] as const;

/** Value space of `mort:checkedAttribute`: the attributes a check can cover. */
export const CHECKED_ATTRIBUTE_IRIS = [
  SCHEMA.name,
  SCHEMA.birthDate,
  SCHEMA.address,
  MORT.taxIdLast4,
] as const;

/** The most checks one attestation may name (mshape:KycAttestationSubjectShape). */
export const MAX_IDENTITY_CHECKS = 8;

function assertOneOf(label: string, value: string, allowed: readonly string[]): void {
  if (!allowed.includes(value)) {
    throw new RangeError(`${label} must be one of ${allowed.join(", ")}; got ${value}`);
  }
}

function assertValidDate(label: string, value: Date): void {
  if (Number.isNaN(value.getTime())) throw new RangeError(`${label} is not a valid date`);
}

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

// ── KYC attestation ──────────────────────────────────────────────────────────────────────

/** One check the issuer ran (mshape:IdentityCheckShape). */
export class IdentityCheck extends TypedNode {
  /** One of {@link IDENTITY_CHECK_METHOD_IRIS}. */
  get method(): string {
    return iri(this, MORT.checkMethod);
  }
  /** The attribute properties the check covered (subset of {@link CHECKED_ATTRIBUTE_IRIS}). */
  get checkedAttributes(): Set<string> {
    return iriSet(this, MORT.checkedAttribute);
  }
  /** The day the check was run. */
  get date(): Date {
    return date(this, DCTERMS.date);
  }
  get description(): string {
    return str(this, SCHEMA.description);
  }
}

/** Claims node of a KYC attestation (mshape:KycAttestationSubjectShape). */
export class KycAttestationSubject extends TypedNode {
  get name(): string {
    return str(this, SCHEMA.name);
  }
  get birthDate(): Date {
    return date(this, SCHEMA.birthDate);
  }
  get address(): PostalAddress {
    return child(this, SCHEMA.address, PostalAddress);
  }
  get checks(): IdentityCheck[] {
    return children(this, MORT.identityCheck, IdentityCheck);
  }
}

export interface IdentityCheckInit {
  /** One of {@link IDENTITY_CHECK_METHOD_IRIS}. */
  method: string;
  /** One to four of {@link CHECKED_ATTRIBUTE_IRIS}, without repeats. */
  attributes: readonly string[];
  /** The day the check was run (UTC midnight). */
  date: Date;
  /** One line, at most 200 characters. Never a document number. */
  description: string;
}

export interface KycAttestationClaimsInit {
  name: string;
  birthDate: Date;
  address: AddressFields;
  checks: readonly IdentityCheckInit[];
}

/**
 * Write the attestation claims onto a subject node (used by the builder and by vc-kit). Throws
 * a RangeError on input the shape would refuse, so nothing malformed reaches a signature.
 */
export function writeKycAttestationClaims(
  subject: TypedNode,
  init: KycAttestationClaimsInit,
): void {
  if (init.name.length === 0) throw new RangeError("name must not be empty");
  assertValidDate("birthDate", init.birthDate);
  if (init.checks.length === 0 || init.checks.length > MAX_IDENTITY_CHECKS) {
    throw new RangeError(`an attestation names 1 to ${MAX_IDENTITY_CHECKS} checks`);
  }
  for (const [index, check] of init.checks.entries()) {
    const label = `checks[${index}]`;
    assertOneOf(`${label}.method`, check.method, IDENTITY_CHECK_METHOD_IRIS);
    if (check.attributes.length === 0 || check.attributes.length > CHECKED_ATTRIBUTE_IRIS.length) {
      throw new RangeError(`${label}.attributes must name 1 to 4 attributes`);
    }
    if (new Set(check.attributes).size !== check.attributes.length) {
      throw new RangeError(`${label}.attributes must not repeat`);
    }
    for (const attribute of check.attributes) {
      assertOneOf(`${label}.attributes`, attribute, CHECKED_ATTRIBUTE_IRIS);
    }
    assertValidDate(`${label}.date`, check.date);
    if (check.description.length === 0 || check.description.length > 200) {
      throw new RangeError(`${label}.description must be 1 to 200 characters`);
    }
  }
  setStr(subject, SCHEMA.name, init.name);
  setDate(subject, SCHEMA.birthDate, init.birthDate);
  setAddress(subject, SCHEMA.address, init.address);
  init.checks.forEach((init, index) => {
    const check = addChild(subject, MORT.identityCheck, IdentityCheck, String(index + 1));
    check.typeIris.add(MORT.IdentityCheck);
    setIri(check, MORT.checkMethod, init.method);
    for (const attribute of init.attributes) check.checkedAttributes.add(attribute);
    setDate(check, DCTERMS.date, init.date);
    setStr(check, SCHEMA.description, init.description);
  });
}

/** KYC attestation credential (mshape:KycAttestationCredentialShape). */
export class KycAttestationCredential extends CredentialResource {
  override get resourceKind(): MortgageResourceKind {
    return "kyc-attestation-credential";
  }
  get credentialSubject(): KycAttestationSubject {
    return new KycAttestationSubject(
      this.factory.namedNode(iri(this, CRED.credentialSubject)),
      this.dataset,
      this.factory,
    );
  }
}

export interface KycAttestationCredentialInit
  extends CredentialEnvelopeInit,
    KycAttestationClaimsInit {}

export function buildKycAttestationCredential(
  init: KycAttestationCredentialInit,
): KycAttestationCredential {
  const credential = root(KycAttestationCredential, init.iri);
  applyEnvelope(credential, init, MORT.KycAttestationCredential);
  writeKycAttestationClaims(credential.credentialSubject, init);
  return credential;
}

// ── Trusted-issuer list ──────────────────────────────────────────────────────────────────

/** One listed issuer (mshape:TrustedIssuerEntryShape). */
export class TrustedIssuerEntry extends TypedNode {
  /** The issuer's WebID. */
  get issuer(): string {
    return iri(this, SCHEMA.item);
  }
  get name(): string {
    return str(this, SCHEMA.name);
  }
  /** The reference of the reliance agreement behind the entry. */
  get agreement(): string {
    return str(this, SCHEMA.identifier);
  }
  get validFrom(): Date {
    return dateTime(this, SCHEMA.validFrom);
  }
  get validThrough(): Date | undefined {
    return optDateTime(this, SCHEMA.validThrough);
  }
}

/** A scheme's trusted-issuer list (mshape:TrustedIssuerListShape). */
export class TrustedIssuerList extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "trusted-issuer-list";
  }
  get name(): string {
    return str(this, SCHEMA.name);
  }
  get publisher(): OrganizationNode {
    return child(this, SCHEMA.publisher, OrganizationNode);
  }
  /** The credential class the list's entries are trusted to attest. */
  get about(): string {
    return iri(this, SCHEMA.about);
  }
  get datePublished(): Date {
    return dateTime(this, SCHEMA.datePublished);
  }
  get validThrough(): Date {
    return dateTime(this, SCHEMA.validThrough);
  }
  get entries(): TrustedIssuerEntry[] {
    return children(this, SCHEMA.itemListElement, TrustedIssuerEntry);
  }
}

export interface TrustedIssuerEntryInit {
  issuer: string;
  name: string;
  agreement: string;
  validFrom: Date;
  validThrough?: Date;
}

export interface TrustedIssuerListInit {
  /** The list's own resource IRI. */
  iri: string;
  name: string;
  publisherName: string;
  /** The credential class the entries are trusted to attest. */
  about: string;
  datePublished: Date;
  validThrough: Date;
  entries: readonly TrustedIssuerEntryInit[];
}

export function buildTrustedIssuerList(init: TrustedIssuerListInit): TrustedIssuerList {
  if (init.entries.length > 64) throw new RangeError("a list holds at most 64 entries");
  const list = root(TrustedIssuerList, init.iri);
  list.typeIris.add(MORT.TrustedIssuerList);
  list.typeIris.add(SCHEMA.ItemList);
  setStr(list, SCHEMA.name, init.name);
  setOrganization(list, SCHEMA.publisher, init.publisherName);
  setIri(list, SCHEMA.about, init.about);
  setDateTime(list, SCHEMA.datePublished, init.datePublished);
  setDateTime(list, SCHEMA.validThrough, init.validThrough);
  init.entries.forEach((entryInit, index) => {
    const entry = addChild(list, SCHEMA.itemListElement, TrustedIssuerEntry, String(index + 1));
    entry.typeIris.add(SCHEMA.ListItem);
    setIri(entry, SCHEMA.item, entryInit.issuer);
    setStr(entry, SCHEMA.name, entryInit.name);
    setStr(entry, SCHEMA.identifier, entryInit.agreement);
    setDateTime(entry, SCHEMA.validFrom, entryInit.validFrom);
    setOptDateTime(entry, SCHEMA.validThrough, entryInit.validThrough);
  });
  return list;
}
