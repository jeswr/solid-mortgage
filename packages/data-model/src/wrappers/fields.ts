// AUTHORED-BY Claude Fable 5.2
import {
  type ITermFromValueMapping,
  type ITermWrapperConstructor,
  LiteralAs,
  LiteralFrom,
  NamedNodeAs,
  NamedNodeFrom,
  OptionalAs,
  OptionalFrom,
  RequiredAs,
  RequiredFrom,
  SetFrom,
  TermAs,
  TermFrom,
  type TermWrapper,
} from "@rdfjs/wrapper";
import { FIBO, SCHEMA, XSD } from "../vocab/external.js";
import { MORT } from "../vocab/mort.js";
import { literalFromXsdDate, literalFromXsdDecimal } from "./mappings.js";
import {
  MonetaryAmount,
  OrganizationNode,
  PostalAddress,
  RealEstateProperty,
  type TypedNode,
} from "./support.js";

/**
 * Field accessors shared by the document wrappers of the static rebuild (documents.ts,
 * policies.ts, records.ts). Each is a thin, named use of an `@rdfjs/wrapper` mapping, so a
 * wrapper class reads as a list of fields and every triple still goes through the wrapper
 * layer (house rule: no hand-built quads).
 *
 * Blank nodes get deterministic labels derived from their parent and predicate, so identical
 * inputs serialise to identical Turtle.
 */

/** An `xsd:boolean` literal (`LiteralFrom` has no boolean mapping in 0.34). */
const literalFromBoolean: ITermFromValueMapping<boolean> = (value, factory) =>
  factory.literal(value ? "true" : "false", factory.namedNode(XSD.boolean));

function asBoolean(term: TermWrapper): boolean {
  if (term.termType !== "Literal" || (term.value !== "true" && term.value !== "false")) {
    throw new TypeError(`expected an xsd:boolean literal, got ${term.termType} "${term.value}"`);
  }
  return term.value === "true";
}

export const str = (node: TermWrapper, p: string): string =>
  RequiredFrom.subjectPredicate(node, p, LiteralAs.string);
export const optStr = (node: TermWrapper, p: string): string | undefined =>
  OptionalFrom.subjectPredicate(node, p, LiteralAs.string);
export const setStr = (node: TermWrapper, p: string, value: string): void =>
  RequiredAs.object(node, p, value, LiteralFrom.string);
export const setOptStr = (node: TermWrapper, p: string, value: string | undefined): void =>
  OptionalAs.object(node, p, value, LiteralFrom.string);
/** A live, write-through set of string literals. */
export const strSet = (node: TermWrapper, p: string): Set<string> =>
  SetFrom.subjectPredicate(node, p, LiteralAs.string, LiteralFrom.string);

export const iri = (node: TermWrapper, p: string): string =>
  RequiredFrom.subjectPredicate(node, p, NamedNodeAs.string);
export const optIri = (node: TermWrapper, p: string): string | undefined =>
  OptionalFrom.subjectPredicate(node, p, NamedNodeAs.string);
export const setIri = (node: TermWrapper, p: string, value: string): void =>
  RequiredAs.object(node, p, value, NamedNodeFrom.string);
export const setOptIri = (node: TermWrapper, p: string, value: string | undefined): void =>
  OptionalAs.object(node, p, value, NamedNodeFrom.string);
/** A live, write-through set of IRIs. */
export const iriSet = (node: TermWrapper, p: string): Set<string> =>
  SetFrom.subjectPredicate(node, p, NamedNodeAs.string, NamedNodeFrom.string);

/** An `xsd:date` field (the calendar date, UTC). */
export const date = (node: TermWrapper, p: string): Date =>
  RequiredFrom.subjectPredicate(node, p, LiteralAs.date);
export const optDate = (node: TermWrapper, p: string): Date | undefined =>
  OptionalFrom.subjectPredicate(node, p, LiteralAs.date);
export const setDate = (node: TermWrapper, p: string, value: Date): void =>
  RequiredAs.object(node, p, value, literalFromXsdDate);
export const setOptDate = (node: TermWrapper, p: string, value: Date | undefined): void =>
  OptionalAs.object(node, p, value, literalFromXsdDate);

/** An `xsd:dateTime` field. */
export const dateTime = date;
export const optDateTime = optDate;
export const setDateTime = (node: TermWrapper, p: string, value: Date): void =>
  RequiredAs.object(node, p, value, LiteralFrom.dateTime);
export const setOptDateTime = (node: TermWrapper, p: string, value: Date | undefined): void =>
  OptionalAs.object(node, p, value, LiteralFrom.dateTime);

export const num = (node: TermWrapper, p: string): number =>
  RequiredFrom.subjectPredicate(node, p, LiteralAs.number);
export const optNum = (node: TermWrapper, p: string): number | undefined =>
  OptionalFrom.subjectPredicate(node, p, LiteralAs.number);
export function setInt(node: TermWrapper, p: string, value: number): void {
  if (!Number.isSafeInteger(value)) throw new RangeError(`${p} must be an integer, got ${value}`);
  RequiredAs.object(node, p, value, LiteralFrom.integer);
}
export function setOptInt(node: TermWrapper, p: string, value: number | undefined): void {
  if (value !== undefined && !Number.isSafeInteger(value)) {
    throw new RangeError(`${p} must be an integer, got ${value}`);
  }
  OptionalAs.object(node, p, value, LiteralFrom.integer);
}
export const setDecimal = (node: TermWrapper, p: string, value: number): void =>
  RequiredAs.object(node, p, value, literalFromXsdDecimal);

export const optBool = (node: TermWrapper, p: string): boolean | undefined =>
  OptionalFrom.subjectPredicate(node, p, asBoolean);
export const setOptBool = (node: TermWrapper, p: string, value: boolean | undefined): void =>
  OptionalAs.object(node, p, value, literalFromBoolean);

/** Wrap the single object of `p` as `ctor`. */
export const child = <T>(node: TermWrapper, p: string, ctor: ITermWrapperConstructor<T>): T =>
  RequiredFrom.subjectPredicate(node, p, TermAs.instance(ctor));
export const optChild = <T>(
  node: TermWrapper,
  p: string,
  ctor: ITermWrapperConstructor<T>,
): T | undefined => OptionalFrom.subjectPredicate(node, p, TermAs.instance(ctor));
/** Wrap every object of `p` as `ctor` (read-only snapshot, in dataset order). */
export function children<T extends TermWrapper>(
  node: TermWrapper,
  p: string,
  ctor: ITermWrapperConstructor<T>,
): T[] {
  return [...SetFrom.subjectPredicate<T>(node, p, TermAs.instance(ctor), TermFrom.instance)];
}

function localName(predicate: string): string {
  return predicate.slice(Math.max(predicate.lastIndexOf("#"), predicate.lastIndexOf("/")) + 1);
}

/**
 * A new blank node linked from `node` by `p`, wrapped as `ctor`. `extra` distinguishes several
 * children under one predicate (line items, permissions).
 */
export function addChild<T extends TermWrapper>(
  node: TermWrapper,
  p: string,
  ctor: ITermWrapperConstructor<T>,
  extra = "",
): T {
  const parent = node.termType === "BlankNode" ? `${node.value}_` : "";
  const term = node.factory.blankNode(`${parent}${localName(p)}${extra}`);
  const set = SetFrom.subjectPredicate<T>(node, p, TermAs.instance(ctor), TermFrom.instance);
  const wrapped = new ctor(term, node.dataset, node.factory);
  set.add(wrapped);
  return wrapped;
}

/** Whole US dollars and cents of a `schema:MonetaryAmount` child. */
export const usd = (node: TermWrapper, p: string): number =>
  child(node, p, MonetaryAmount).amountValue;
export const optUsd = (node: TermWrapper, p: string): number | undefined =>
  optChild(node, p, MonetaryAmount)?.amountValue;
/** Write a `schema:MonetaryAmount` child. Call once per field, when building. */
export function setUsd(node: TermWrapper, p: string, value: number): void {
  const amount = addChild(node, p, MonetaryAmount);
  amount.typeIris.add(SCHEMA.MonetaryAmount);
  amount.amountValue = value;
  amount.currency = "USD";
}

export interface AddressFields {
  streetAddress: string;
  addressLocality: string;
  /** Two-letter US state code. */
  addressRegion: string;
  /** US ZIP or ZIP+4. */
  postalCode: string;
}

/** Write a `schema:PostalAddress` child under `p`. */
export function setAddress(node: TermWrapper, p: string, fields: AddressFields): void {
  const address = addChild(node, p, PostalAddress);
  address.typeIris.add(SCHEMA.PostalAddress);
  address.streetAddress = fields.streetAddress;
  address.addressLocality = fields.addressLocality;
  address.addressRegion = fields.addressRegion;
  address.postalCode = fields.postalCode;
}

/** Write a `schema:Organization` child under `p`. */
export function setOrganization(node: TermWrapper, p: string, name: string): void {
  const organization = addChild(node, p, OrganizationNode);
  organization.typeIris.add(SCHEMA.Organization);
  organization.organizationName = name;
}

/** Write the `mort:subjectProperty` child: a `fibo-fnd-plc-rp:RealEstate` with its address. */
export function setSubjectProperty(node: TermWrapper, address: AddressFields): void {
  const property = addChild(node, MORT.subjectProperty, RealEstateProperty);
  property.typeIris.add(FIBO.RealEstate);
  setAddress(property, SCHEMA.address, address);
}

export const subjectProperty = (node: TermWrapper): RealEstateProperty =>
  child(node, MORT.subjectProperty, RealEstateProperty);
export const optSubjectProperty = (node: TermWrapper): RealEstateProperty | undefined =>
  optChild(node, MORT.subjectProperty, RealEstateProperty);

/** The plain address fields of a wrapped `schema:PostalAddress`. */
export function addressFields(address: PostalAddress): AddressFields {
  return {
    addressLocality: address.addressLocality,
    addressRegion: address.addressRegion,
    postalCode: address.postalCode,
    streetAddress: address.streetAddress,
  };
}

export type { TypedNode };
