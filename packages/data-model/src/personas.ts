import type { DatasetCore } from "@rdfjs/types";
import type { MortgageResourceKind } from "./shacl.js";
import { FIBO } from "./vocab/external.js";
import { MORT } from "./vocab/mort.js";
import {
  buildAppraisalCredential,
  buildAssetCredential,
  buildBorrowerProfile,
  buildClosingRecord,
  buildCreditScoreCredential,
  buildEmploymentIncomeCredential,
  buildLoanApplication,
  buildTitleClearCredential,
  buildUnderwritingDecision,
  type CredentialEnvelopeInit,
  type PostalAddressInit,
  type PropertyInit,
} from "./wrappers/build.js";
import type { MortgageResource } from "./wrappers/resources.js";
import { resourceToTurtle } from "./wrappers/serialize.js";

/**
 * Demo persona fixtures (research-gaps M5; bead sm-20).
 *
 * Fair-lending posture: a mortgage demo must not stereotype protected
 * classes, so both personas use given/family names that do not point at one
 * ethnicity, sex or age bracket; addresses are neutral suburban streets in a
 * single metro (Columbus, OH); the only demographic field is the URLA-required
 * birth date; and both profiles carry equally strong, approval-worthy
 * finances - neither persona is the "weak applicant".
 *
 * Value discipline: every ZK-provable value fits its decision 0005 digit
 * budget and clears the scene-2 demo thresholds (income >= $7,000/month,
 * score >= 620, recast DTI: debts <= floor(0.43 x income)); the loan never
 * exceeds the appraised value. Alex's figures are the canonical captured
 * journey values (income $8,500/month, score 742, debts $1,180/month,
 * assets $64,000, loan $340,000). Closing costs are an ILLUSTRATIVE itemised
 * demo schedule (`closingCostItems`; the total is their sum) - never an
 * industry statistic such as the cost to originate a loan.
 *
 * Determinism: `personas()` never reads the clock (decision 0012) - all
 * validity windows derive from the caller's `now` - and the same `now` +
 * `seed` produce byte-identical Turtle. The employment VC is seeded
 * near-expiry (validFrom now-30d / validUntil now+14d) for the scene-4
 * freshness beat.
 */

export type PersonaId = "alex-rivera" | "jordan-avery";

/** Resource kinds present in a deterministic persona seed (action receipts are written later). */
export type PersonaResourceKind = Exclude<
  MortgageResourceKind,
  "consent-receipt" | "zk-operand-anchor"
>;

/**
 * Pod-root-relative resource paths (SPEC section 3 pod layout: profile and
 * application documents beside the access-controlled `/mortgage/credentials/`
 * subtree; the per-resource paths follow vocab.md section 5 and the seeder
 * design). The ZK operand anchor is excluded: anchors are minted by the
 * sm-26 seed tooling, which owns operand_enc.
 */
export const RESOURCE_POD_PATHS: Readonly<Record<PersonaResourceKind, string>> = {
  "borrower-profile": "/mortgage/profile",
  "employment-income-credential": "/mortgage/credentials/income",
  "asset-credential": "/mortgage/credentials/assets",
  "credit-score-credential": "/mortgage/credentials/credit",
  "appraisal-credential": "/mortgage/credentials/appraisal",
  "title-clear-credential": "/mortgage/credentials/title",
  "loan-application": "/mortgage/application",
  "underwriting-decision": "/mortgage/decision",
  "closing-record": "/mortgage/closing",
};

/** Issuer identity IRIs, overridable when seeding against deployed org pods. */
export interface PersonaIssuers {
  employmentVerifier: string;
  bank: string;
  creditBureau: string;
  appraisalManagement: string;
  titleCompany: string;
  lender: string;
}

const DEFAULT_ISSUERS: PersonaIssuers = {
  employmentVerifier: "https://verifications.example/orgs/employment-verifier#id",
  bank: "https://bank.example/orgs/summit-federal#id",
  creditBureau: "https://bureau.example/orgs/credit-bureau#id",
  appraisalManagement: "https://amc.example/orgs/appraisal-management#id",
  titleCompany: "https://title.example/orgs/title-company#id",
  lender: "https://lender.example/orgs/underwriting#id",
};

export interface PersonaFactoryOptions {
  /**
   * The demo reference instant. REQUIRED: fixtures never read the clock
   * (decision 0012) - credential windows are offsets from this value.
   */
  now: Date;
  /** Varies the incidental identifiers (status entries, last4, recording ref). */
  seed?: string;
  /** Per-persona pod base IRI override (must end with `/`). */
  podBases?: Partial<Record<PersonaId, string>>;
  /**
   * Per-persona WebID override for identities NOT rooted in the pod (e.g. a dev-issuer
   * WebID in e2e). Defaults to the pod-rooted convention `${podBase}profile/card#me`.
   * The profile focus node and every credential's `credentialSubject` follow it, so the
   * decision-0015 subject binding (`credentialSubject == token WebID`) holds for
   * issuer-hosted identities too.
   */
  webIds?: Partial<Record<PersonaId, string>>;
  /** Issuer identity overrides for seeding against deployed org pods. */
  issuers?: Partial<PersonaIssuers>;
}

/** One seeded pod resource: dataset + validated deterministic Turtle. */
export interface PersonaResource {
  kind: PersonaResourceKind;
  /** Pod-root-relative path (RESOURCE_POD_PATHS). */
  path: string;
  /** Absolute resource IRI (podBase + path). */
  iri: string;
  /** Root node for `validate({ expect, focusNode })`. */
  focusNode: string;
  dataset: DatasetCore;
  /** Shape-validated, byte-deterministic Turtle. */
  turtle: string;
}

export interface Persona {
  id: PersonaId;
  role: "primary" | "secondary";
  displayName: string;
  webId: string;
  podBase: string;
  resources: readonly PersonaResource[];
  /** The same resources keyed by pod path (the seed-layer manifest). */
  byPath: ReadonlyMap<string, PersonaResource>;
}

/** One line of an illustrative demo closing-cost schedule. */
export interface ClosingCostItem {
  readonly label: string;
  readonly amountUsd: number;
}

/** Alex's illustrative itemised demo closing costs (total $4,340). */
export const ALEX_CLOSING_COST_ITEMS: readonly ClosingCostItem[] = [
  { label: "Origination charge", amountUsd: 1700 },
  { label: "Appraisal fee", amountUsd: 575 },
  { label: "Credit report fee", amountUsd: 45 },
  { label: "Title services and lender's title policy", amountUsd: 1880 },
  { label: "Recording fees", amountUsd: 140 },
];

const JORDAN_CLOSING_COST_ITEMS: readonly ClosingCostItem[] = [
  { label: "Origination charge", amountUsd: 1240 },
  { label: "Appraisal fee", amountUsd: 575 },
  { label: "Credit report fee", amountUsd: 45 },
  { label: "Title services and lender's title policy", amountUsd: 1510 },
  { label: "Recording fees", amountUsd: 140 },
];

/** Total of an itemised closing-cost schedule. */
export function closingCostTotalUsd(items: readonly ClosingCostItem[]): number {
  return items.reduce((total, item) => total + item.amountUsd, 0);
}

/** The plain values one persona is built from (exported for test assertions). */
export interface PersonaValues {
  id: PersonaId;
  role: "primary" | "secondary";
  name: string;
  birthDate: string;
  email: string;
  telephone: string;
  maritalStatus: string;
  homeAddress: PostalAddressInit;
  employerName: string;
  jobTitle: string;
  employmentStartDate: string;
  /** ZK d4 field; must clear the scene-2 $7,000 threshold. */
  monthlyGrossIncomeUsd: number;
  /** ZK d3 field; must clear the scene-2 620 threshold. */
  creditScoreValue: number;
  /** ZK d4 field; must satisfy the recast DTI bound (decision 0005). */
  totalMonthlyDebtUsd: number;
  bankName: string;
  bankBalanceUsd: number;
  subjectPropertyAddress: PostalAddressInit;
  /** Disclosed display value (never ZK-proved); loan amount must not exceed it. */
  appraisedValueUsd: number;
  appraiserName: string;
  appraiserLicenseId: string;
  requestedLoanUsd: number;
  approvedLoanUsd: number;
  loanTermMonths: number;
  interestRatePercent: number;
  /** Illustrative itemised demo closing costs (no real fee schedule). */
  closingCostItems: readonly ClosingCostItem[];
  /** Sum of `closingCostItems` - the only closing-cost total any app shows. */
  closingCostsUsd: number;
  underwritingConditions: readonly string[];
  ausRecommendation: string;
  recordingCounty: string;
  servicerName: string;
}

/** URLA-realistic, digit-budget-conforming values (see module docblock). */
export const PERSONA_VALUES: readonly PersonaValues[] = [
  {
    id: "alex-rivera",
    role: "primary",
    name: "Alex Rivera",
    birthDate: "1992-04-17",
    email: "alex.rivera@mail.example",
    telephone: "+1-555-0142",
    maritalStatus: MORT.MaritalStatus_Unmarried,
    homeAddress: {
      streetAddress: "418 Cedar Grove Lane",
      addressLocality: "Columbus",
      addressRegion: "OH",
      postalCode: "43004",
    },
    employerName: "Ridgeline Analytics LLC",
    jobTitle: "Senior Data Engineer",
    employmentStartDate: "2021-03-01",
    monthlyGrossIncomeUsd: 8500,
    creditScoreValue: 742,
    totalMonthlyDebtUsd: 1180,
    bankName: "Summit Federal Credit Union",
    bankBalanceUsd: 64000,
    subjectPropertyAddress: {
      streetAddress: "1121 Maple Hollow Court",
      addressLocality: "Columbus",
      addressRegion: "OH",
      postalCode: "43230",
    },
    appraisedValueUsd: 425000,
    appraiserName: "Morgan Ellis",
    appraiserLicenseId: "OH-CG-2025-118342",
    requestedLoanUsd: 340000,
    approvedLoanUsd: 340000,
    loanTermMonths: 360,
    interestRatePercent: 6.125,
    closingCostItems: ALEX_CLOSING_COST_ITEMS,
    closingCostsUsd: closingCostTotalUsd(ALEX_CLOSING_COST_ITEMS),
    underwritingConditions: [
      "Obtain a verbal verification of employment (VOE) before the note date, within the timing Fannie Mae Selling Guide B3-3.1-04 sets for the option used (often 10 business days).",
    ],
    ausRecommendation: FIBO.UnderwritingDecision_Approve,
    recordingCounty: "Franklin County",
    servicerName: "Demo servicer",
  },
  {
    id: "jordan-avery",
    role: "secondary",
    name: "Jordan Avery",
    birthDate: "1988-11-03",
    email: "jordan.avery@mail.example",
    telephone: "+1-555-0178",
    maritalStatus: MORT.MaritalStatus_Married,
    homeAddress: {
      streetAddress: "2408 Birchfield Drive",
      addressLocality: "Westerville",
      addressRegion: "OH",
      postalCode: "43081",
    },
    employerName: "Harborview Logistics Inc.",
    jobTitle: "Operations Manager",
    employmentStartDate: "2019-06-15",
    monthlyGrossIncomeUsd: 7400,
    creditScoreValue: 701,
    totalMonthlyDebtUsd: 860,
    bankName: "Summit Federal Credit Union",
    bankBalanceUsd: 71300,
    subjectPropertyAddress: {
      streetAddress: "87 Juniper Field Road",
      addressLocality: "Westerville",
      addressRegion: "OH",
      postalCode: "43082",
    },
    appraisedValueUsd: 310000,
    appraiserName: "Morgan Ellis",
    appraiserLicenseId: "OH-CG-2025-118342",
    requestedLoanUsd: 248000,
    approvedLoanUsd: 248000,
    loanTermMonths: 360,
    interestRatePercent: 6.375,
    closingCostItems: JORDAN_CLOSING_COST_ITEMS,
    closingCostsUsd: closingCostTotalUsd(JORDAN_CLOSING_COST_ITEMS),
    underwritingConditions: [],
    ausRecommendation: FIBO.UnderwritingDecision_Eligible,
    recordingCounty: "Delaware County",
    servicerName: "Demo servicer",
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function daysFrom(now: Date, days: number): Date {
  return new Date(now.getTime() + days * DAY_MS);
}

/** FNV-1a 32-bit: tiny, dependency-free deterministic hash for identifiers. */
function fnv1a32(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function utcDateStem(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function statusEntry(issuer: string, list: string, index: number): string {
  return `${new URL(issuer).origin}/status/${list}#${index}`;
}

async function personaResource(
  kind: PersonaResourceKind,
  podBase: string,
  focusNode: string,
  resource: MortgageResource,
): Promise<PersonaResource> {
  const path = RESOURCE_POD_PATHS[kind];
  return {
    kind,
    path,
    iri: `${podBase}${path.slice(1)}`,
    focusNode,
    dataset: resource.dataset,
    turtle: await resourceToTurtle(resource),
  };
}

async function buildPersona(
  values: PersonaValues,
  options: PersonaFactoryOptions,
  issuers: PersonaIssuers,
): Promise<Persona> {
  const { now } = options;
  const seed = options.seed ?? "solid-mortgage-demo";
  const podStem = values.id.split("-")[0] ?? values.id;
  const podBase = options.podBases?.[values.id] ?? `https://${podStem}.pod.example/`;
  if (!podBase.endsWith("/")) {
    throw new RangeError(`podBase must end with "/": ${podBase}`);
  }
  const webId = options.webIds?.[values.id] ?? `${podBase}profile/card#me`;
  const resourceIri = (kind: PersonaResourceKind): string =>
    `${podBase}${RESOURCE_POD_PATHS[kind].slice(1)}`;
  const derived = (label: string, modulus: number): number =>
    fnv1a32(`${seed}:${values.id}:${label}`) % modulus;
  const envelope = (
    kind: PersonaResourceKind,
    issuer: string,
    list: string,
    validFromDays: number,
    validUntilDays: number,
  ): CredentialEnvelopeInit => ({
    iri: resourceIri(kind),
    issuer,
    validFrom: daysFrom(now, validFromDays),
    validUntil: daysFrom(now, validUntilDays),
    credentialStatus: statusEntry(issuer, list, derived(list, 1024)),
    credentialSubject: webId,
  });

  const property: PropertyInit = { address: values.subjectPropertyAddress };
  const closingDate = now;

  const profile = buildBorrowerProfile({
    webId,
    name: values.name,
    birthDate: new Date(`${values.birthDate}T00:00:00Z`),
    emails: [values.email],
    telephone: values.telephone,
    address: values.homeAddress,
    maritalStatus: values.maritalStatus,
  });

  // Scene-4 freshness beat (decision 0012): genuinely near-expiry, no fake clock.
  const employment = buildEmploymentIncomeCredential({
    ...envelope("employment-income-credential", issuers.employmentVerifier, "employment", -30, 14),
    employerName: values.employerName,
    jobTitle: values.jobTitle,
    startDate: new Date(`${values.employmentStartDate}T00:00:00Z`),
    monthlyGrossIncomeUsd: values.monthlyGrossIncomeUsd,
    evidence: `${podBase}reports/income-verification`,
  });

  const assets = buildAssetCredential({
    ...envelope("asset-credential", issuers.bank, "assets", -14, 16),
    accounts: [
      {
        providerName: values.bankName,
        balanceUsd: values.bankBalanceUsd,
        accountLast4: String(derived("accountLast4", 10000)).padStart(4, "0"),
      },
    ],
  });

  const credit = buildCreditScoreCredential({
    ...envelope("credit-score-credential", issuers.creditBureau, "credit", -10, 80),
    creditScoreValue: values.creditScoreValue,
    totalMonthlyDebtUsd: values.totalMonthlyDebtUsd,
  });

  const appraisal = buildAppraisalCredential({
    ...envelope("appraisal-credential", issuers.appraisalManagement, "appraisal", -7, 177),
    property: { ...property, appraisedValueUsd: values.appraisedValueUsd },
    appraiserName: values.appraiserName,
    appraiserLicenseId: values.appraiserLicenseId,
    reportIssued: daysFrom(now, -8),
  });

  const title = buildTitleClearCredential({
    ...envelope("title-clear-credential", issuers.titleCompany, "title", -5, 87),
    property,
    searchedThrough: daysFrom(now, -6),
    evidence: `${podBase}reports/title-search`,
  });

  const application = buildLoanApplication({
    iri: resourceIri("loan-application"),
    created: daysFrom(now, -3),
    submittedBy: webId,
    requestedAmountUsd: values.requestedLoanUsd,
    loanTermMonths: values.loanTermMonths,
    property,
    loanPurpose: FIBO.MortgageLoanPurpose_RealPropertyPurchase,
    occupancy: FIBO.PropertyUsage_primaryResidence,
    amortizationType: FIBO.AmortizationType_fixedRate,
  });

  const decision = buildUnderwritingDecision({
    iri: resourceIri("underwriting-decision"),
    evaluates: resourceIri("loan-application"),
    decisionStatus:
      values.underwritingConditions.length > 0
        ? MORT.DecisionStatus_ApprovedWithConditions
        : MORT.DecisionStatus_Approved,
    conditions: values.underwritingConditions,
    approvedAmountUsd: values.approvedLoanUsd,
    ausRecommendation: values.ausRecommendation,
    issued: daysFrom(now, -1),
    creator: issuers.lender,
  });

  const closing = buildClosingRecord({
    iri: resourceIri("closing-record"),
    borrower: webId,
    property,
    principalUsd: values.approvedLoanUsd,
    closingCostsUsd: values.closingCostsUsd,
    interestRatePercent: values.interestRatePercent,
    loanTermMonths: values.loanTermMonths,
    closingDate,
    recordingReference: `${values.recordingCounty} Instrument ${utcDateStem(closingDate)}${String(
      derived("recording", 100000),
    ).padStart(5, "0")}`,
    eNoteReference: `SIMULATED-ENOTE-${utcDateStem(closingDate)}-${String(
      derived("enote", 100000),
    ).padStart(5, "0")}`,
    servicerName: values.servicerName,
  });

  const resources = await Promise.all([
    personaResource("borrower-profile", podBase, webId, profile),
    personaResource("employment-income-credential", podBase, employment.value, employment),
    personaResource("asset-credential", podBase, assets.value, assets),
    personaResource("credit-score-credential", podBase, credit.value, credit),
    personaResource("appraisal-credential", podBase, appraisal.value, appraisal),
    personaResource("title-clear-credential", podBase, title.value, title),
    personaResource("loan-application", podBase, application.value, application),
    personaResource("underwriting-decision", podBase, decision.value, decision),
    personaResource("closing-record", podBase, closing.value, closing),
  ]);

  return {
    id: values.id,
    role: values.role,
    displayName: values.name,
    webId,
    podBase,
    resources,
    byPath: new Map(resources.map((resource) => [resource.path, resource])),
  };
}

/**
 * Build the demo personas: primary borrower Alex Rivera plus secondary
 * borrower Jordan Avery, each with all nine pod resources built through the
 * typed wrappers, validated against their SHACL shapes, and serialised to
 * deterministic Turtle. Same `now` + `seed` => byte-identical output.
 */
export async function personas(options: PersonaFactoryOptions): Promise<readonly Persona[]> {
  const issuers: PersonaIssuers = { ...DEFAULT_ISSUERS, ...options.issuers };
  return Promise.all(PERSONA_VALUES.map((values) => buildPersona(values, options, issuers)));
}
