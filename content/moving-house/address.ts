// AUTHORED-BY Claude Opus 5.5
/**
 * The two documents this demo adds to Alex's pod, and the copy each organisation keeps:
 *
 * - `profile/address`: the one authoritative address (schema.org `PostalAddress` and the W3C Core
 *   Location Vocabulary `locn:Address`, with an effective date and a link to its evidence). An
 *   organisation's copy uses the same shape, plus where it was read from, under which policy, and
 *   when it stopped being current.
 * - `profile/address.dprod`: the address described as a data product (DPROD): owner, purpose,
 *   output port and the policies of its consumers.
 *
 * Every triple goes through `@rdfjs/wrapper` mappings; `toTurtle` checks the SHACL shape
 * (`mshape:AddressRecordShape`, `mshape:DataProductShape`) before anything is written.
 */

import {
  DCTERMS,
  type MortgageResourceKind,
  MortgageResource,
  ODRL,
  SCHEMA,
} from "@mortgage/data-model";
import {
  LiteralAs,
  LiteralFrom,
  NamedNodeAs,
  NamedNodeFrom,
  OptionalAs,
  OptionalFrom,
  RequiredAs,
  RequiredFrom,
  SetFrom,
  TermWrapper,
} from "@rdfjs/wrapper";
import type { DatasetCore } from "@rdfjs/types";
import { DataFactory, Store } from "n3";
import { type AddressValue, fullAddress, streetLine } from "./facts.js";

const LOCN_NS = "http://www.w3.org/ns/locn#";
const PROV_NS = "http://www.w3.org/ns/prov#";
const DPROD_NS = "https://ekgf.github.io/dprod/";
const DCAT_NS = "http://www.w3.org/ns/dcat#";
const DPV_NS = "https://w3id.org/dpv#";

export const LOCN = Object.freeze({
  Address: `${LOCN_NS}Address`,
  fullAddress: `${LOCN_NS}fullAddress`,
  locatorDesignator: `${LOCN_NS}locatorDesignator`,
  locatorName: `${LOCN_NS}locatorName`,
  postCode: `${LOCN_NS}postCode`,
  postName: `${LOCN_NS}postName`,
  thoroughfare: `${LOCN_NS}thoroughfare`,
});

export const PROV = Object.freeze({
  generatedAtTime: `${PROV_NS}generatedAtTime`,
  invalidatedAtTime: `${PROV_NS}invalidatedAtTime`,
  wasDerivedFrom: `${PROV_NS}wasDerivedFrom`,
});

export const DPROD = Object.freeze({
  DataProduct: `${DPROD_NS}DataProduct`,
  dataProductOwner: `${DPROD_NS}dataProductOwner`,
  outputPort: `${DPROD_NS}outputPort`,
  purpose: `${DPROD_NS}purpose`,
});

export const DCAT = Object.freeze({
  DataService: `${DCAT_NS}DataService`,
  endpointURL: `${DCAT_NS}endpointURL`,
});

const DPV_HAS_PURPOSE = `${DPV_NS}hasPurpose`;
const SCHEMA_NS = "https://schema.org/";
const SCHEMA_ADDRESS_COUNTRY = `${SCHEMA_NS}addressCountry`;

/** Prefixes for writing these documents with `n3.Writer`. */
export const ADDRESS_PREFIXES: Readonly<Record<string, string>> = Object.freeze({
  dcat: DCAT_NS,
  dprod: DPROD_NS,
  locn: LOCN_NS,
  prov: PROV_NS,
});

const str = (node: TermWrapper, p: string): string =>
  RequiredFrom.subjectPredicate(node, p, LiteralAs.string);
const setStr = (node: TermWrapper, p: string, value: string): void =>
  RequiredAs.object(node, p, value, LiteralFrom.string);
const optStr = (node: TermWrapper, p: string): string | undefined =>
  OptionalFrom.subjectPredicate(node, p, LiteralAs.string);
const setOptStr = (node: TermWrapper, p: string, value: string | undefined): void =>
  OptionalAs.object(node, p, value, LiteralFrom.string);
const iri = (node: TermWrapper, p: string): string =>
  RequiredFrom.subjectPredicate(node, p, NamedNodeAs.string);
const setIri = (node: TermWrapper, p: string, value: string): void =>
  RequiredAs.object(node, p, value, NamedNodeFrom.string);
const optIri = (node: TermWrapper, p: string): string | undefined =>
  OptionalFrom.subjectPredicate(node, p, NamedNodeAs.string);
const setOptIri = (node: TermWrapper, p: string, value: string | undefined): void =>
  OptionalAs.object(node, p, value, NamedNodeFrom.string);
const iriSet = (node: TermWrapper, p: string): Set<string> =>
  SetFrom.subjectPredicate(node, p, NamedNodeAs.string, NamedNodeFrom.string);
const dateTime = (node: TermWrapper, p: string): Date =>
  RequiredFrom.subjectPredicate(node, p, LiteralAs.date);
const setDateTime = (node: TermWrapper, p: string, value: Date): void =>
  RequiredAs.object(node, p, value, LiteralFrom.dateTime);
const optDateTime = (node: TermWrapper, p: string): Date | undefined =>
  OptionalFrom.subjectPredicate(node, p, LiteralAs.date);
const setOptDateTime = (node: TermWrapper, p: string, value: Date | undefined): void =>
  OptionalAs.object(node, p, value, LiteralFrom.dateTime);

/** `YYYY-MM-DD` as an `xsd:date` literal (the shape wants a plain calendar date). */
const setXsdDate = (node: TermWrapper, p: string, value: string): void => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError(`not a calendar date: ${value}`);
  RequiredAs.object(node, p, value, (text, factory) =>
    factory.literal(text, factory.namedNode("http://www.w3.org/2001/XMLSchema#date")),
  );
};
const xsdDate = (node: TermWrapper, p: string): string =>
  RequiredFrom.subjectPredicate(node, p, LiteralAs.string);

/**
 * An address record (`mshape:AddressRecordShape`): Alex's own `profile/address`, or the copy an
 * organisation keeps of it.
 */
export class AddressRecord extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "address-record";
  }
  get number(): string {
    return str(this, LOCN.locatorDesignator);
  }
  get street(): string {
    return str(this, LOCN.thoroughfare);
  }
  get unit(): string | undefined {
    return optStr(this, LOCN.locatorName);
  }
  get streetAddress(): string {
    return str(this, SCHEMA.streetAddress);
  }
  get locality(): string {
    return str(this, SCHEMA.addressLocality);
  }
  get region(): string {
    return str(this, SCHEMA.addressRegion);
  }
  get postalCode(): string {
    return str(this, SCHEMA.postalCode);
  }
  get country(): string {
    return str(this, SCHEMA_ADDRESS_COUNTRY);
  }
  get fullAddress(): string {
    return str(this, LOCN.fullAddress);
  }
  /** The day the address takes effect, `YYYY-MM-DD`. */
  get validFrom(): string {
    return xsdDate(this, SCHEMA.validFrom);
  }
  get modified(): Date {
    return dateTime(this, DCTERMS.modified);
  }
  /** Evidence (Alex's record) or the source read (an organisation's copy). */
  get derivedFrom(): Set<string> {
    return iriSet(this, PROV.wasDerivedFrom);
  }
  /** When an organisation read the source. */
  get generatedAt(): Date | undefined {
    return optDateTime(this, PROV.generatedAtTime);
  }
  set generatedAt(value: Date | undefined) {
    setOptDateTime(this, PROV.generatedAtTime, value);
  }
  /** When an organisation learned its copy is no longer current and could not read the source. */
  get invalidatedAt(): Date | undefined {
    return optDateTime(this, PROV.invalidatedAtTime);
  }
  set invalidatedAt(value: Date | undefined) {
    setOptDateTime(this, PROV.invalidatedAtTime, value);
  }
  /** The ODRL agreement an organisation's copy was read under. */
  get policy(): string | undefined {
    return optIri(this, ODRL.hasPolicy);
  }
  set policy(value: string | undefined) {
    setOptIri(this, ODRL.hasPolicy, value);
  }
  /** The address as a plain value. */
  get value(): AddressValue {
    const unit = this.unit;
    return {
      country: this.country,
      locality: this.locality,
      number: this.number,
      postalCode: this.postalCode,
      region: this.region,
      street: this.street,
      ...(unit === undefined ? {} : { unit }),
    };
  }
}

export interface AddressRecordInit {
  readonly iri: string;
  readonly address: AddressValue;
  /** `YYYY-MM-DD`. */
  readonly validFrom: string;
  readonly modified: Date;
  readonly derivedFrom?: readonly string[];
  readonly generatedAt?: Date;
  readonly invalidatedAt?: Date;
  readonly policy?: string;
}

function root<T>(
  ctor: new (term: string, dataset: DatasetCore, factory: typeof DataFactory) => T,
  resourceIri: string,
): T {
  return new ctor(resourceIri, new Store(), DataFactory);
}

export function buildAddressRecord(init: AddressRecordInit): AddressRecord {
  const record = root(AddressRecord, init.iri);
  record.typeIris.add(SCHEMA.PostalAddress);
  record.typeIris.add(LOCN.Address);
  const a = init.address;
  setStr(record, SCHEMA.streetAddress, streetLine(a));
  setStr(record, SCHEMA.addressLocality, a.locality);
  setStr(record, SCHEMA.addressRegion, a.region);
  setStr(record, SCHEMA.postalCode, a.postalCode);
  setStr(record, SCHEMA_ADDRESS_COUNTRY, a.country);
  setStr(record, LOCN.fullAddress, fullAddress(a));
  setStr(record, LOCN.locatorDesignator, a.number);
  setStr(record, LOCN.thoroughfare, a.street);
  setOptStr(record, LOCN.locatorName, a.unit);
  setStr(record, LOCN.postName, a.locality);
  setStr(record, LOCN.postCode, a.postalCode);
  setXsdDate(record, SCHEMA.validFrom, init.validFrom);
  setDateTime(record, DCTERMS.modified, init.modified);
  for (const source of init.derivedFrom ?? []) record.derivedFrom.add(source);
  record.generatedAt = init.generatedAt;
  record.invalidatedAt = init.invalidatedAt;
  record.policy = init.policy;
  return record;
}

/** A data product description (`mshape:DataProductShape`). */
export class DataProduct extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "data-product";
  }
  get title(): string {
    return str(this, DCTERMS.title);
  }
  get description(): string {
    return str(this, DCTERMS.description);
  }
  get owner(): string {
    return iri(this, DPROD.dataProductOwner);
  }
  get purpose(): string {
    return str(this, DPROD.purpose);
  }
  get purposeIri(): string {
    return iri(this, DPV_HAS_PURPOSE);
  }
  /** The resource the product is served from (its output port's endpoint). */
  get endpoint(): string {
    const port = RequiredFrom.subjectPredicate(this, DPROD.outputPort, NamedNodeAs.string);
    return iri(new TermWrapper(port, this.dataset, this.factory), DCAT.endpointURL);
  }
  /** The consumers' agreements. */
  get policies(): Set<string> {
    return iriSet(this, ODRL.hasPolicy);
  }
  get modified(): Date {
    return dateTime(this, DCTERMS.modified);
  }
}

export interface DataProductInit {
  readonly iri: string;
  readonly title: string;
  readonly description: string;
  readonly owner: string;
  readonly purpose: string;
  readonly purposeIri: string;
  readonly endpoint: string;
  readonly policies: readonly string[];
  readonly modified: Date;
}

export function buildDataProduct(init: DataProductInit): DataProduct {
  const product = root(DataProduct, init.iri);
  product.typeIris.add(DPROD.DataProduct);
  setStr(product, DCTERMS.title, init.title);
  setStr(product, DCTERMS.description, init.description);
  setIri(product, DPROD.dataProductOwner, init.owner);
  setStr(product, DPROD.purpose, init.purpose);
  setIri(product, DPV_HAS_PURPOSE, init.purposeIri);
  // The output port is a node in the description's own document.
  const portIri = `${init.iri}#output-port`;
  setIri(product, DPROD.outputPort, portIri);
  const port = new TermWrapper(portIri, product.dataset, product.factory);
  RequiredAs.object(port, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", DCAT.DataService, NamedNodeFrom.string);
  setIri(port, DCAT.endpointURL, init.endpoint);
  for (const policy of init.policies) product.policies.add(policy);
  setDateTime(product, DCTERMS.modified, init.modified);
  return product;
}
