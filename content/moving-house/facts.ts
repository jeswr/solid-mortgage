// AUTHORED-BY Claude Opus 5.5
/**
 * The moving-house scenario's fixed facts (flows.md section 2). Alex closed on 14 Larch Lane in
 * the mortgage demo; this story starts the day after closing. Everything here is fictional.
 */
import { DAY as MORTGAGE_DAY, PROPERTY } from "../mortgage/facts.js";

/** The tour's demo id (`?tour=moving-house`, `PodEvent.tour.demo`). */
export const DEMO = "moving-house";

/** Simulated days on the mortgage demo's calendar: the day after closing, and a week later. */
export const DAY = Object.freeze({
  moved: MORTGAGE_DAY.closing + 1,
  correction: MORTGAGE_DAY.closing + 8,
});

/** A US postal address as the address record holds it. */
export interface AddressValue {
  /** Building number (`locn:locatorDesignator`). */
  readonly number: string;
  /** Street name (`locn:thoroughfare`). */
  readonly street: string;
  /** Apartment, suite or unit (`locn:locatorName`), when there is one. */
  readonly unit?: string;
  readonly locality: string;
  /** Two-letter state code. */
  readonly region: string;
  readonly postalCode: string;
  /** ISO 3166 alpha-2. */
  readonly country: string;
}

/** Where Alex lived until closing: the mortgage demo's contact address. */
export const OLD_ADDRESS: AddressValue = Object.freeze({
  country: "US",
  locality: "Marlow",
  number: "208",
  postalCode: "43004",
  region: "OH",
  street: "Fenwick Street",
  unit: "Apt 3",
});

/** When the old address took effect (before the story; a fixed fictional date). */
export const OLD_ADDRESS_FROM = "2021-07-01";

/**
 * The new address as Alex first saves it: the street from the recorded deed, and the old flat's
 * unit still in the unit field. Step 9 corrects it to {@link NEW_ADDRESS}.
 */
export const NEW_ADDRESS_AS_SAVED: AddressValue = Object.freeze({
  country: "US",
  locality: PROPERTY.address.addressLocality,
  number: "14",
  postalCode: PROPERTY.address.postalCode,
  region: PROPERTY.address.addressRegion,
  street: "Larch Lane",
  unit: OLD_ADDRESS.unit,
});

/** The corrected address: 14 Larch Lane has no unit. */
export const NEW_ADDRESS: AddressValue = Object.freeze({
  country: NEW_ADDRESS_AS_SAVED.country,
  locality: NEW_ADDRESS_AS_SAVED.locality,
  number: NEW_ADDRESS_AS_SAVED.number,
  postalCode: NEW_ADDRESS_AS_SAVED.postalCode,
  region: NEW_ADDRESS_AS_SAVED.region,
  street: NEW_ADDRESS_AS_SAVED.street,
});

/** The first line: "14 Larch Lane, Apt 3". */
export function streetLine(address: AddressValue): string {
  const line = `${address.number} ${address.street}`;
  return address.unit === undefined ? line : `${line}, ${address.unit}`;
}

/** The whole address on one line: "14 Larch Lane, Marlow, OH 43004, US". */
export function fullAddress(address: AddressValue): string {
  return `${streetLine(address)}, ${address.locality}, ${address.region} ${address.postalCode}, ${address.country}`;
}

/** Same premises (number, street, town, state, ZIP): what a recorded deed can prove. */
export function samePremises(a: AddressValue, b: AddressValue): boolean {
  return (
    a.number === b.number &&
    a.street.toLowerCase() === b.street.toLowerCase() &&
    a.locality.toLowerCase() === b.locality.toLowerCase() &&
    a.region === b.region &&
    a.postalCode.slice(0, 5) === b.postalCode.slice(0, 5)
  );
}

export function sameAddress(a: AddressValue, b: AddressValue): boolean {
  return samePremises(a, b) && (a.unit ?? "") === (b.unit ?? "") && a.country === b.country;
}

/** The recorded deed from the mortgage demo (Marlow County's public register). */
export const DEED_REFERENCE = "2026-0048113";
export const MORTGAGE_REFERENCE = "2026-0048114";
