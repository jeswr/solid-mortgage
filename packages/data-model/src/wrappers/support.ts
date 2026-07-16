import {
  LiteralAs,
  LiteralFrom,
  NamedNodeAs,
  NamedNodeFrom,
  OptionalFrom,
  RequiredAs,
  RequiredFrom,
  SetFrom,
  TermAs,
  TermWrapper,
} from "@rdfjs/wrapper";
import { DCTERMS, FIBO, RDF_TYPE, SCHEMA } from "../vocab/external.js";
import { MORT } from "../vocab/mort.js";
import { literalFromXsdDate, literalFromXsdDecimal } from "./mappings.js";

/**
 * Typed accessors over the shared support nodes the resource shapes reference
 * via `sh:node` (shapes/common.ttl). All construction and mutation of these
 * nodes goes through these wrappers - never hand-built quads (house rule).
 *
 * Read discipline: pod RDF is untrusted input, so `validate()` the document
 * (with `expect` + `focusNode`) BEFORE wrapping it; the accessors then throw
 * descriptive errors on any residual malformation rather than guessing.
 */
export class TypedNode extends TermWrapper {
  /** `rdf:type` IRIs as a live, write-through set. */
  get typeIris(): Set<string> {
    return SetFrom.subjectPredicate(this, RDF_TYPE, NamedNodeAs.string, NamedNodeFrom.string);
  }
}

/** `schema:PostalAddress` (mshape:PostalAddressShape - US-format fields). */
export class PostalAddress extends TypedNode {
  get streetAddress(): string {
    return RequiredFrom.subjectPredicate(this, SCHEMA.streetAddress, LiteralAs.string);
  }
  set streetAddress(value: string) {
    RequiredAs.object(this, SCHEMA.streetAddress, value, LiteralFrom.string);
  }

  get addressLocality(): string {
    return RequiredFrom.subjectPredicate(this, SCHEMA.addressLocality, LiteralAs.string);
  }
  set addressLocality(value: string) {
    RequiredAs.object(this, SCHEMA.addressLocality, value, LiteralFrom.string);
  }

  /** Two-letter US state code (shape-enforced pattern). */
  get addressRegion(): string {
    return RequiredFrom.subjectPredicate(this, SCHEMA.addressRegion, LiteralAs.string);
  }
  set addressRegion(value: string) {
    RequiredAs.object(this, SCHEMA.addressRegion, value, LiteralFrom.string);
  }

  /** US ZIP or ZIP+4 (shape-enforced pattern). */
  get postalCode(): string {
    return RequiredFrom.subjectPredicate(this, SCHEMA.postalCode, LiteralAs.string);
  }
  set postalCode(value: string) {
    RequiredAs.object(this, SCHEMA.postalCode, value, LiteralFrom.string);
  }
}

/** `schema:Organization` (mshape:OrganizationShape). */
export class OrganizationNode extends TypedNode {
  get organizationName(): string {
    return RequiredFrom.subjectPredicate(this, SCHEMA.name, LiteralAs.string);
  }
  set organizationName(value: string) {
    RequiredAs.object(this, SCHEMA.name, value, LiteralFrom.string);
  }
}

/** `schema:MonetaryAmount` (mshape:MonetaryAmountShape - USD display money). */
export class MonetaryAmount extends TypedNode {
  /** `schema:value` as a number; written as a well-formed `xsd:decimal`. */
  get amountValue(): number {
    return RequiredFrom.subjectPredicate(this, SCHEMA.value, LiteralAs.number);
  }
  set amountValue(value: number) {
    if (value < 0) {
      throw new RangeError(`MonetaryAmount.amountValue must be >= 0, got ${value}`);
    }
    RequiredAs.object(this, SCHEMA.value, value, literalFromXsdDecimal);
  }

  get currency(): string {
    return RequiredFrom.subjectPredicate(this, SCHEMA.currency, LiteralAs.string);
  }
  set currency(value: string) {
    RequiredAs.object(this, SCHEMA.currency, value, LiteralFrom.string);
  }
}

/**
 * The subject property (URLA section 4a; mshape:PropertyShape). The appraised
 * value is a DISCLOSED display amount, never ZK-proved (decision 0005).
 */
export class RealEstateProperty extends TypedNode {
  get address(): PostalAddress {
    return RequiredFrom.subjectPredicate(this, SCHEMA.address, TermAs.instance(PostalAddress));
  }

  /** `fibo-fnd-arr-asmt:hasEstimatedValue`, required on appraisal credentials. */
  get appraisedValue(): MonetaryAmount | undefined {
    return OptionalFrom.subjectPredicate(
      this,
      FIBO.hasEstimatedValue,
      TermAs.instance(MonetaryAmount),
    );
  }
}

/** `schema:DepositAccount` (mshape:DepositAccountShape - masked display data). */
export class DepositAccount extends TypedNode {
  get provider(): OrganizationNode {
    return RequiredFrom.subjectPredicate(this, SCHEMA.provider, TermAs.instance(OrganizationNode));
  }

  get accountAmount(): MonetaryAmount {
    return RequiredFrom.subjectPredicate(this, SCHEMA.amount, TermAs.instance(MonetaryAmount));
  }

  /** Exactly four digits; the full account number never enters the pod. */
  get accountLast4(): string {
    return RequiredFrom.subjectPredicate(this, MORT.accountLast4, LiteralAs.string);
  }
  set accountLast4(value: string) {
    if (!/^[0-9]{4}$/.test(value)) {
      throw new RangeError(
        `accountLast4 must be exactly four digits, got ${JSON.stringify(value)}`,
      );
    }
    RequiredAs.object(this, MORT.accountLast4, value, LiteralFrom.string);
  }
}

/** `fibo-fnd-arr-asmt:Appraiser` (mshape:AppraiserShape). */
export class Appraiser extends TypedNode {
  get appraiserName(): string {
    return RequiredFrom.subjectPredicate(this, SCHEMA.name, LiteralAs.string);
  }
  set appraiserName(value: string) {
    RequiredAs.object(this, SCHEMA.name, value, LiteralFrom.string);
  }

  get licenseId(): string {
    return RequiredFrom.subjectPredicate(this, MORT.appraiserLicenseId, LiteralAs.string);
  }
  set licenseId(value: string) {
    RequiredAs.object(this, MORT.appraiserLicenseId, value, LiteralFrom.string);
  }
}

/** The FIBO appraisal report linked as `cred:evidence` (mshape:AppraisalEvidenceShape). */
export class AppraisalEvidence extends TypedNode {
  /**
   * The property node this report evaluates. MUST be the same node as the
   * credentialSubject's `mort:subjectProperty` (sh:sparql cross-check).
   */
  get evaluatesProperty(): RealEstateProperty {
    return RequiredFrom.subjectPredicate(this, FIBO.evaluates, TermAs.instance(RealEstateProperty));
  }

  get generatedBy(): Appraiser {
    return RequiredFrom.subjectPredicate(this, FIBO.isGeneratedBy, TermAs.instance(Appraiser));
  }

  get issued(): Date {
    return RequiredFrom.subjectPredicate(this, DCTERMS.issued, LiteralAs.date);
  }
  set issued(value: Date) {
    RequiredAs.object(this, DCTERMS.issued, value, literalFromXsdDate);
  }
}
