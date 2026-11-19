// AUTHORED-BY Claude Opus 5.5
/** Pure view logic for Wrenfield's funnel: no React, no requests. */
import { GRANTS } from "@mortgage/content/mortgage/grants";
import type { AppraisalCredential, SubjectProperty } from "@mortgage/data-model";
import { hasWritten, type PodLog } from "./log.ts";

/** The funnel, one question per screen. */
export const FUNNEL = [
  { label: "Start", path: "/" },
  { label: "Your home", path: "/property" },
  { label: "Your quote", path: "/quote" },
  { label: "Covered", path: "/evidence" },
] as const;

export function funnelIndex(path: string): number {
  const index = FUNNEL.findIndex((stage) => stage.path === path);
  return index === -1 ? 0 : index;
}

export const usd = (amount: number, cents = false): string =>
  amount.toLocaleString("en-US", {
    currency: "USD",
    maximumFractionDigits: cents ? 2 : 0,
    minimumFractionDigits: cents ? 2 : 0,
    style: "currency",
  });

export const PROPERTY_PATH = "property/subject-property";
export const APPRAISAL_PATH = "mortgage/juniper/appraisal";
export const EVIDENCE_PATH = "insurance/evidence-of-insurance";
/** Wrenfield's own record of the evidence it issued (its `issued/` drawer). */
export const ISSUED_PATH = "issued/evidence-of-insurance";

export interface Fact {
  readonly label: string;
  readonly value: string;
  /** Where the value came from, in plain words. */
  readonly source: string;
}

/** What the property record in Alex's pod says, each line with its source. */
export function propertyFacts(property: SubjectProperty): Fact[] {
  const source = "Alex's pod · property record";
  const address = property.address;
  const facts: Fact[] = [
    {
      label: "Address",
      source,
      value: `${address.streetAddress}, ${address.addressLocality}, ${address.addressRegion} ${address.postalCode}`,
    },
    { label: "Year built", source, value: String(property.yearBuilt) },
    {
      label: "Living area",
      source,
      value: `${property.floorSizeSqFt.toLocaleString("en-US")} sq ft`,
    },
    { label: "Construction", source, value: property.constructionType },
    { label: "Roof", source, value: property.roofType },
  ];
  if (property.bedrooms !== undefined)
    facts.push({ label: "Bedrooms", source, value: String(property.bedrooms) });
  return facts;
}

/** What the appraisal copy adds: the appraised value and who signed it. */
export function appraisalFacts(appraisal: AppraisalCredential): Fact[] {
  const evidence = appraisal.evidence;
  const signer = evidence.generatedBy.appraiserName;
  const source = `Appraisal by ${signer}, ${evidence.issued.toISOString().slice(0, 10)}`;
  const value = appraisal.credentialSubject.subjectProperty.appraisedValue?.amountValue;
  return value === undefined ? [] : [{ label: "Appraised value", source, value: usd(value) }];
}

/** What G7 lets Wrenfield read and write, from the grant's specification. */
export function grantScope(): { reads: string[]; writes: string[] } {
  const reads: string[] = [];
  const writes: string[] = [];
  for (const permission of GRANTS.G7.permissions) {
    const into = permission.modes.includes("Read") ? reads : writes;
    into.push(...permission.paths);
  }
  return { reads, writes };
}

/** Plain words for a resource Wrenfield asks to read. */
export function describePath(path: string): string {
  if (path === PROPERTY_PATH) return "Your property record";
  if (path === APPRAISAL_PATH) return "Your copy of the appraisal";
  if (path === "insurance/") return "Your insurance drawer";
  return path;
}

export type BindState = "waiting-for-appraisal" | "ready" | "bound";

/**
 * Whether Bind makes sense now. The quote reads the appraisal copy, so it waits until Juniper has
 * delivered one; once the evidence is in the pod, the policy is bound.
 */
export function bindState(log: PodLog): BindState {
  if (hasWritten(log, "alex", `/${EVIDENCE_PATH}`)) return "bound";
  if (hasWritten(log, "alex", `/${APPRAISAL_PATH}`)) return "ready";
  return "waiting-for-appraisal";
}
