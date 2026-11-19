/**
 * Typed claim-graph construction for every credential kind. Claims are
 * lowered to RDF through `@rdfjs/wrapper` typed accessors over the data-model
 * terms - never string-built JSON-LD or hand-concatenated Turtle. The matching
 * SHACL shape is the authority on validity; issue() refuses (fail-closed) any
 * graph the shape rejects, so the guards here only protect structural safety
 * (IRI injection, date lexicals) the RDF layer itself cannot express.
 *
 * KNOWN GOTCHA (workspace memory): `@rdfjs/wrapper` `LiteralFrom.date` emits a
 * malformed `xsd:date` (dateTime lexical form). All `xsd:date` literals here go
 * through `LiteralFrom.datatypeTuple` with a validated `YYYY-MM-DD` lexical;
 * the shapes' `sh:datatype xsd:date` constraints catch any regression.
 */

import {
  type AddressFields,
  type LegalForm,
  MORT,
  type TaxComplianceStatus,
  type TurnoverBand,
  TypedNode,
  writeBeneficialOwnershipClaims,
  writeCashFlowClaims,
  writeEvidenceOfInsuranceClaims,
  writeIdentityClaims,
  writeKycAttestationClaims,
  writeOfficerAuthorisationClaims,
  writeOrganisationalIdentityClaims,
  writeRepaymentHistoryClaims,
  writeTaxComplianceClaims,
  writeTitleCommitmentClaims,
} from "@mortgage/data-model";
import type { DataFactory, DatasetCore, Term } from "@rdfjs/types";
import {
  LiteralFrom,
  NamedNodeFrom,
  RequiredAs,
  SetFrom,
  TermFrom,
  TermWrapper,
} from "@rdfjs/wrapper";
import type { CredentialKind } from "./vocab.js";
import {
  DCTERMS_ISSUED,
  FIBO_APPRAISAL,
  FIBO_APPRAISED_VALUE,
  FIBO_APPRAISER,
  FIBO_EVALUATES,
  FIBO_HAS_ESTIMATED_VALUE,
  FIBO_IS_GENERATED_BY,
  FIBO_REAL_ESTATE,
  RDF_TYPE,
  SCHEMA_ADDRESS,
  SCHEMA_ADDRESS_LOCALITY,
  SCHEMA_ADDRESS_REGION,
  SCHEMA_AMOUNT,
  SCHEMA_BIRTH_DATE,
  SCHEMA_CURRENCY,
  SCHEMA_DEPOSIT_ACCOUNT,
  SCHEMA_JOB_TITLE,
  SCHEMA_MONETARY_AMOUNT,
  SCHEMA_NAME,
  SCHEMA_ORGANIZATION,
  SCHEMA_OWNS,
  SCHEMA_POSTAL_ADDRESS,
  SCHEMA_POSTAL_CODE,
  SCHEMA_PROVIDER,
  SCHEMA_START_DATE,
  SCHEMA_STREET_ADDRESS,
  SCHEMA_VALUE,
  SCHEMA_WORKS_FOR,
  VC_EVIDENCE,
  XSD_DATE,
  XSD_DECIMAL,
} from "./vocab.js";

/** A structured claim-construction failure (thrown BEFORE anything is signed). */
export class ClaimInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaimInputError";
  }
}

/**
 * Reject values that cannot be an absolute IRI reference. `n3.Writer` does not
 * escape IRIs, so an unchecked value could break out of its `<...>` token when
 * the graph is serialised - every IRI entering a claim graph passes this gate.
 */
export function assertAbsoluteIri(value: string, label: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: control characters are exactly what an IRI reference must not contain
  if (/[\u0000-\u0020<>"{}|^`\\]/.test(value) || !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) {
    throw new ClaimInputError(
      `${label} is not an absolute IRI reference: ${JSON.stringify(value)}`,
    );
  }
  return value;
}

/**
 * Validate an `xsd:date` lexical (`YYYY-MM-DD`) - see the LiteralFrom.date
 * gotcha. `Date.parse` alone is insufficient: it silently normalises invalid
 * calendar dates (`2021-02-30` -> March 2nd), so the parsed components must
 * round-trip to the same date.
 */
function assertDateLexical(value: string, label: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match !== null) {
    const [, year, month, day] = match;
    const parsed = new Date(`${value}T00:00:00Z`);
    if (
      !Number.isNaN(parsed.getTime()) &&
      parsed.getUTCFullYear() === Number(year) &&
      parsed.getUTCMonth() + 1 === Number(month) &&
      parsed.getUTCDate() === Number(day)
    ) {
      return value;
    }
  }
  throw new ClaimInputError(`${label} must be an xsd:date lexical (YYYY-MM-DD): ${value}`);
}

/** A whole-USD amount as an `xsd:decimal` lexical with two fraction digits. */
function decimalLexical(value: number, label: string): string {
  if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) {
    throw new ClaimInputError(`${label} must be a finite non-negative number: ${value}`);
  }
  return value.toFixed(2);
}

function assertSafeInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new ClaimInputError(`${label} must be an integer: ${value}`);
  }
  return value;
}

/** An organization node (`mshape:OrganizationShape`). */
export interface OrganizationClaims {
  readonly name: string;
}

/** A US postal address (`mshape:PostalAddressShape`). */
export interface PostalAddressClaims {
  readonly streetAddress: string;
  readonly addressLocality: string;
  /** Two-letter US state code. */
  readonly addressRegion: string;
  /** US ZIP or ZIP+4. */
  readonly postalCode: string;
}

/** The subject property (`mshape:PropertyShape` / `mshape:AppraisedPropertyShape`). */
export interface PropertyClaims {
  readonly address: PostalAddressClaims;
  /** Disclosed appraised value in USD (required for appraisal credentials). */
  readonly appraisedValueUsd?: number;
}

/** Employment + income VC subject (`mshape:EmploymentIncomeSubjectShape`). */
export interface EmploymentIncomeClaims {
  readonly kind: "employment-income-credential";
  readonly employer: OrganizationClaims;
  readonly jobTitle: string;
  /** `xsd:date` lexical, `YYYY-MM-DD`. */
  readonly startDate: string;
  /** Whole USD/month; decision 0005's 4-digit ZK budget (0..9999). */
  readonly monthlyGrossIncomeUsd: number;
  /** Optional IRI of the underlying income-verification report (pod resource). */
  readonly evidence?: string;
}

/** One deposit account of an asset VC (`mshape:DepositAccountShape`). */
export interface DepositAccountClaims {
  readonly provider: OrganizationClaims;
  /** Disclosed balance in USD (no ZK statement over balances, decision 0005). */
  readonly amountUsd: number;
  /** Masked display identifier - exactly four digits. */
  readonly accountLast4: string;
}

/** Asset / bank-balance VC subject (`mshape:AssetSubjectShape`). */
export interface AssetClaims {
  readonly kind: "asset-credential";
  readonly accounts: readonly DepositAccountClaims[];
}

/** Credit-score VC subject (`mshape:CreditScoreSubjectShape`). */
export interface CreditScoreClaims {
  readonly kind: "credit-score-credential";
  /** decision 0005's 3-digit ZK budget (300..850). */
  readonly creditScoreValue: number;
  /** Whole USD/month; decision 0005's 4-digit ZK budget (0..9999). */
  readonly totalMonthlyDebtUsd: number;
  /** Score model concept IRI; defaults to `mort:ScoreModel-FICO8`. */
  readonly scoreModel?: string;
}

/** Appraisal VC subject + evidence (`mshape:AppraisalSubjectShape` etc.). */
export interface AppraisalClaims {
  readonly kind: "appraisal-credential";
  readonly property: PropertyClaims;
  readonly appraiser: {
    readonly name: string;
    readonly licenseId: string;
  };
  /** Report issue date, `xsd:date` lexical `YYYY-MM-DD`. */
  readonly reportIssued: string;
}

/** Title-clear VC subject (`mshape:TitleClearSubjectShape`). */
export interface TitleClearClaims {
  readonly kind: "title-clear-credential";
  readonly property: PropertyClaims;
  /** `mort:TitleStatus-Clear` or `mort:TitleStatus-Clouded`. */
  readonly titleStatus: "clear" | "clouded";
  /** Effective date through which records were searched, `YYYY-MM-DD`. */
  readonly searchedThrough: string;
  /** Optional IRI of the underlying title-search report. */
  readonly evidence?: string;
}

/**
 * ZK operand-anchor VC subject (`mshape:ZkOperandAnchorSubjectShape`,
 * decision 0012): the issuer-signed binding of a hidden field's deterministic
 * sparq term encoding. sm-25 layers the anchor<->proof equality checks on top.
 */
export interface ZkOperandAnchorClaims {
  readonly kind: "zk-operand-anchor";
  /** The anchored field IRI - one of decision 0005's ZK scaled-unit fields. */
  readonly field: string;
  /** `0x`-prefixed lowercase hex field element (the circuit's `operand_enc`). */
  readonly operandEnc: string;
}

/** Identity VC subject (`mshape:IdentitySubjectShape`): never a full tax identifier. */
export interface IdentityClaims {
  readonly kind: "identity-credential";
  readonly name: string;
  /** `YYYY-MM-DD`. */
  readonly birthDate: string;
  readonly address: PostalAddressClaims;
  /** Exactly four digits. */
  readonly taxIdLast4: string;
}

/** Title commitment VC subject (`mshape:TitleCommitmentSubjectShape`). */
export interface TitleCommitmentClaims {
  readonly kind: "title-commitment-credential";
  readonly commitmentNumber: string;
  readonly propertyAddress: PostalAddressClaims;
  /** The commitment date, `YYYY-MM-DD`. */
  readonly searchedThrough: string;
  /** Schedule A. */
  readonly vestedOwner: string;
  readonly proposedInsured: readonly string[];
  readonly ownerPolicyAmountUsd: number;
  readonly loanPolicyAmountUsd: number;
  /** Schedule B, part I. */
  readonly requirements: readonly string[];
  /** Schedule B, part II. */
  readonly exceptions: readonly string[];
}

/** Evidence of insurance VC subject (`mshape:EvidenceOfInsuranceSubjectShape`). */
export interface EvidenceOfInsuranceClaims {
  readonly kind: "evidence-of-insurance-credential";
  readonly policyNumber: string;
  readonly propertyAddress: PostalAddressClaims;
  readonly dwellingCoverageUsd: number;
  readonly annualPremiumUsd: number;
  readonly deductibleUsd: number;
  /** `YYYY-MM-DD`. */
  readonly policyStart: string;
  /** `YYYY-MM-DD`. */
  readonly policyEnd: string;
  readonly mortgageeClause: string;
  readonly loanNumber?: string;
}

/** How a KYC check was performed (mort:IdentityCheckMethodScheme). */
export type IdentityCheckMethod = "documentary" | "non-documentary" | "government-list";

/** An attribute a KYC check can cover. */
export type CheckedAttribute = "name" | "birthDate" | "address" | "taxIdLast4";

/** One check behind a KYC attestation (`mshape:IdentityCheckShape`). */
export interface IdentityCheckClaims {
  readonly method: IdentityCheckMethod;
  /** One to four attributes, without repeats. */
  readonly attributes: readonly CheckedAttribute[];
  /** The day the check was run, `YYYY-MM-DD`. */
  readonly date: string;
  /** One line (at most 200 characters). Never a document number or image. */
  readonly description: string;
}

/**
 * KYC attestation subject (`mshape:KycAttestationSubjectShape`): the verified attributes and
 * the checks behind them. There is deliberately no field for a document image, scan, number
 * or tax identifier, and the closed shape refuses any that is added to the graph.
 */
export interface KycAttestationClaims {
  readonly kind: "kyc-attestation-credential";
  readonly name: string;
  /** `YYYY-MM-DD`. */
  readonly birthDate: string;
  readonly address: PostalAddressClaims;
  /** One to eight checks. */
  readonly checks: readonly IdentityCheckClaims[];
}

const CHECK_METHOD_IRIS: Readonly<Record<IdentityCheckMethod, string>> = {
  documentary: MORT.IdentityCheckMethod_Documentary,
  "government-list": MORT.IdentityCheckMethod_GovernmentList,
  "non-documentary": MORT.IdentityCheckMethod_NonDocumentary,
};

const CHECKED_ATTRIBUTE_IRIS: Readonly<Record<CheckedAttribute, string>> = {
  address: SCHEMA_ADDRESS,
  birthDate: SCHEMA_BIRTH_DATE,
  name: SCHEMA_NAME,
  taxIdLast4: MORT.taxIdLast4,
};

function lookup<T extends string>(
  table: Readonly<Record<T, string>>,
  key: T,
  label: string,
): string {
  if (!Object.hasOwn(table, key)) {
    throw new ClaimInputError(`${label} is not one of ${Object.keys(table).join(", ")}: ${key}`);
  }
  return table[key];
}

/**
 * Cash-flow VC subject (`mshape:CashFlowSubjectShape`; small-dollar lending, ported from
 * jeswr/solid-lending). `nsf90Count` and `cashFlowScoreValue` are ZK-provable fields.
 */
export interface CashFlowClaims {
  readonly kind: "cash-flow-credential";
  readonly bankName: string;
  /** Masked display identifier - exactly four digits. */
  readonly accountLast4: string;
  readonly balanceUsd: number;
  readonly depositStreams: readonly { readonly name: string; readonly monthlyAmountUsd: number }[];
  readonly averageDailyBalanceUsd: number;
  /** 1..36. */
  readonly observationMonths: number;
  /** Returned payments in the last 90 days, 0..99. */
  readonly nsf90Count: number;
  /** 300..850. */
  readonly cashFlowScoreValue: number;
}

/** Repayment history VC subject (`mshape:RepaymentHistorySubjectShape`). */
export interface RepaymentHistoryClaims {
  readonly kind: "repayment-history-credential";
  /** IRI of the loan's disclosure in the borrower's pod. */
  readonly servicedLoan: string;
  readonly loanNumber: string;
  readonly onTime: number;
  readonly late: number;
  readonly scheduled: number;
  /** Reporting period, `YYYY-MM-DD`. */
  readonly start: string;
  /** `YYYY-MM-DD`. */
  readonly end: string;
}

/** Business KYB: the register's organisational identity of an entity (an illustrative LEI). */
export interface OrganisationalIdentityClaims {
  readonly kind: "organisational-identity-credential";
  readonly legalName: string;
  readonly legalForm: LegalForm;
  readonly address: PostalAddressClaims;
  /** Prefix 9999 with valid ISO 7064 check digits; anything else is refused. */
  readonly lei: string;
}

/** Business KYB: the officers and signatories who act for an entity. */
export interface OfficerAuthorisationClaims {
  readonly kind: "officer-authorisation-credential";
  readonly entityName: string;
  readonly officers: readonly { readonly name: string; readonly jobTitle: string }[];
}

/** Business KYB: an entity's direct owners and their shares in basis points. */
export interface BeneficialOwnershipClaims {
  readonly kind: "beneficial-ownership-credential";
  readonly entityName: string;
  readonly owners: readonly { readonly name: string; readonly bps: number }[];
}

/**
 * Small business loan: a revenue department's attestation that a business's filings are up to
 * date, with the band its annual turnover falls in (never the figure itself).
 */
export interface TaxComplianceClaims {
  readonly kind: "tax-compliance-credential";
  readonly entityName: string;
  /** Four digits; anything else is refused. */
  readonly taxIdLast4: string;
  readonly status: TaxComplianceStatus;
  /** The end of the last tax period with every return filed (calendar date, UTC). */
  readonly filingsCurrentThrough: Date;
  readonly turnoverBand: TurnoverBand;
}

/** The typed claims union - discriminated by the credential kind. */
export type CredentialClaims =
  | EmploymentIncomeClaims
  | AssetClaims
  | CreditScoreClaims
  | AppraisalClaims
  | TitleClearClaims
  | IdentityClaims
  | TitleCommitmentClaims
  | EvidenceOfInsuranceClaims
  | KycAttestationClaims
  | ZkOperandAnchorClaims
  | CashFlowClaims
  | RepaymentHistoryClaims
  | OrganisationalIdentityClaims
  | OfficerAuthorisationClaims
  | BeneficialOwnershipClaims
  | TaxComplianceClaims;

/** Base wrapper: typed multi-valued `rdf:type` plus single-valued setters. */
class GraphNode extends TermWrapper {
  get types(): Set<string> {
    return SetFrom.subjectPredicate(this, RDF_TYPE, (term) => term.value, NamedNodeFrom.string);
  }

  setIri(predicate: string, iri: string, label: string): void {
    RequiredAs.object(this, predicate, assertAbsoluteIri(iri, label), NamedNodeFrom.string);
  }

  setString(predicate: string, value: string): void {
    RequiredAs.object(this, predicate, value, LiteralFrom.string);
  }

  setInteger(predicate: string, value: number, label: string): void {
    RequiredAs.object(this, predicate, assertSafeInteger(value, label), LiteralFrom.integer);
  }

  setTypedLiteral(predicate: string, datatype: string, lexical: string): void {
    RequiredAs.object(this, predicate, [datatype, lexical], LiteralFrom.datatypeTuple);
  }

  /** Mint a blank node, link it under `predicate`, and return it wrapped. */
  linkChild<T extends GraphNode>(
    predicate: string,
    ctor: new (term: Term, dataset: DatasetCore, factory: DataFactory) => T,
  ): T {
    const child = this.factory.blankNode();
    RequiredAs.object(this, predicate, child, TermFrom.itself);
    return new ctor(child, this.dataset, this.factory);
  }

  /** Link an EXISTING node under `predicate` (shared blank nodes, IRI children). */
  linkExisting(predicate: string, term: Term): void {
    RequiredAs.object(this, predicate, term, TermFrom.itself);
  }
}

class OrganizationNode extends GraphNode {
  writeClaims(claims: OrganizationClaims): void {
    this.types.add(SCHEMA_ORGANIZATION);
    this.setString(SCHEMA_NAME, claims.name);
  }
}

class PostalAddressNode extends GraphNode {
  writeClaims(claims: PostalAddressClaims): void {
    this.types.add(SCHEMA_POSTAL_ADDRESS);
    this.setString(SCHEMA_STREET_ADDRESS, claims.streetAddress);
    this.setString(SCHEMA_ADDRESS_LOCALITY, claims.addressLocality);
    this.setString(SCHEMA_ADDRESS_REGION, claims.addressRegion);
    this.setString(SCHEMA_POSTAL_CODE, claims.postalCode);
  }
}

class MonetaryAmountNode extends GraphNode {
  writeUsd(value: number, label: string, extraType?: string): void {
    this.types.add(SCHEMA_MONETARY_AMOUNT);
    if (extraType !== undefined) this.types.add(extraType);
    this.setTypedLiteral(SCHEMA_VALUE, XSD_DECIMAL, decimalLexical(value, label));
    this.setString(SCHEMA_CURRENCY, "USD");
  }
}

class PropertyNode extends GraphNode {
  writeClaims(claims: PropertyClaims): void {
    this.types.add(FIBO_REAL_ESTATE);
    this.linkChild(SCHEMA_ADDRESS, PostalAddressNode).writeClaims(claims.address);
    if (claims.appraisedValueUsd !== undefined) {
      this.linkChild(FIBO_HAS_ESTIMATED_VALUE, MonetaryAmountNode).writeUsd(
        claims.appraisedValueUsd,
        "property.appraisedValueUsd",
        FIBO_APPRAISED_VALUE,
      );
    }
  }
}

class DepositAccountNode extends GraphNode {
  writeClaims(claims: DepositAccountClaims): void {
    this.types.add(SCHEMA_DEPOSIT_ACCOUNT);
    this.linkChild(SCHEMA_PROVIDER, OrganizationNode).writeClaims(claims.provider);
    this.linkChild(SCHEMA_AMOUNT, MonetaryAmountNode).writeUsd(
      claims.amountUsd,
      "account.amountUsd",
    );
    this.setString(MORT.accountLast4, claims.accountLast4);
  }
}

class SubjectNode extends GraphNode {
  /** Live multi-valued `schema:owns` (an asset subject may hold several accounts). */
  get ownedAccounts(): Set<DepositAccountNode> {
    return SetFrom.subjectPredicate(
      this,
      SCHEMA_OWNS,
      (term) => new DepositAccountNode(term as Term, this.dataset, this.factory),
      TermFrom.instance,
    );
  }
}

/** The same subject node as a data-model typed node (the data-model writers take one). */
function typedSubject(subject: TermWrapper): TypedNode {
  return new TypedNode(subject as Term, subject.dataset, subject.factory);
}

/** A validated `YYYY-MM-DD` lexical as the UTC midnight the data-model writers expect. */
function dateOf(lexical: string, label: string): Date {
  return new Date(`${assertDateLexical(lexical, label)}T00:00:00Z`);
}

function addressFieldsOf(address: PostalAddressClaims): AddressFields {
  return {
    addressLocality: address.addressLocality,
    addressRegion: address.addressRegion,
    postalCode: address.postalCode,
    streetAddress: address.streetAddress,
  };
}

/** The credential-node claims (evidence links) some kinds carry. */
export interface CredentialNodeClaims {
  readonly evidence?: string;
}

/**
 * Write the kind-specific subject claims for `subjectIri` into the dataset the
 * credential node lives in, plus any credential-node-level claims (evidence).
 * Throws {@link ClaimInputError} on structurally unsafe input; semantic
 * validity is the SHACL shape's job at issue().
 */
export function writeSubjectClaims(
  credentialNode: TermWrapper,
  subjectIri: string,
  claims: CredentialClaims,
): void {
  const factory = credentialNode.factory;
  const dataset = credentialNode.dataset;
  const credential = new GraphNode(credentialNode as Term, dataset, factory);
  const subject = new SubjectNode(
    factory.namedNode(assertAbsoluteIri(subjectIri, "subject WebID")),
    dataset,
    factory,
  );

  switch (claims.kind) {
    case "employment-income-credential": {
      subject.linkChild(SCHEMA_WORKS_FOR, OrganizationNode).writeClaims(claims.employer);
      subject.setString(SCHEMA_JOB_TITLE, claims.jobTitle);
      subject.setTypedLiteral(
        SCHEMA_START_DATE,
        XSD_DATE,
        assertDateLexical(claims.startDate, "startDate"),
      );
      subject.setInteger(
        MORT.monthlyGrossIncomeUsd,
        claims.monthlyGrossIncomeUsd,
        "monthlyGrossIncomeUsd",
      );
      if (claims.evidence !== undefined) {
        credential.setIri(VC_EVIDENCE, claims.evidence, "evidence");
      }
      return;
    }
    case "asset-credential": {
      const owned = subject.ownedAccounts;
      for (const account of claims.accounts) {
        const node = new DepositAccountNode(factory.blankNode(), dataset, factory);
        node.writeClaims(account);
        owned.add(node);
      }
      return;
    }
    case "credit-score-credential": {
      subject.setInteger(MORT.creditScoreValue, claims.creditScoreValue, "creditScoreValue");
      subject.setInteger(
        MORT.totalMonthlyDebtUsd,
        claims.totalMonthlyDebtUsd,
        "totalMonthlyDebtUsd",
      );
      subject.setIri(MORT.scoreModel, claims.scoreModel ?? MORT.ScoreModel_FICO8, "scoreModel");
      return;
    }
    case "appraisal-credential": {
      const property = new PropertyNode(factory.blankNode(), dataset, factory);
      property.writeClaims(claims.property);
      subject.linkExisting(MORT.subjectProperty, property as Term);
      const evidence = new GraphNode(factory.blankNode(), dataset, factory);
      evidence.types.add(FIBO_APPRAISAL);
      // The evidence report evaluates the SAME property node the subject claims
      // (the shape's cross-node SPARQL constraint).
      evidence.linkExisting(FIBO_EVALUATES, property as Term);
      const appraiser = evidence.linkChild(FIBO_IS_GENERATED_BY, GraphNode);
      appraiser.types.add(FIBO_APPRAISER);
      appraiser.setString(SCHEMA_NAME, claims.appraiser.name);
      appraiser.setString(MORT.appraiserLicenseId, claims.appraiser.licenseId);
      evidence.setTypedLiteral(
        DCTERMS_ISSUED,
        XSD_DATE,
        assertDateLexical(claims.reportIssued, "reportIssued"),
      );
      credential.linkExisting(VC_EVIDENCE, evidence as Term);
      return;
    }
    case "title-clear-credential": {
      const property = new PropertyNode(factory.blankNode(), dataset, factory);
      property.writeClaims(claims.property);
      subject.linkExisting(MORT.subjectProperty, property as Term);
      subject.setIri(
        MORT.titleStatus,
        claims.titleStatus === "clear" ? MORT.TitleStatus_Clear : MORT.TitleStatus_Clouded,
        "titleStatus",
      );
      subject.setTypedLiteral(
        MORT.searchedThrough,
        XSD_DATE,
        assertDateLexical(claims.searchedThrough, "searchedThrough"),
      );
      if (claims.evidence !== undefined) {
        credential.setIri(VC_EVIDENCE, claims.evidence, "evidence");
      }
      return;
    }
    case "identity-credential": {
      writeIdentityClaims(typedSubject(subject), {
        address: addressFieldsOf(claims.address),
        birthDate: dateOf(claims.birthDate, "birthDate"),
        name: claims.name,
        taxIdLast4: claims.taxIdLast4,
      });
      return;
    }
    case "title-commitment-credential": {
      writeTitleCommitmentClaims(typedSubject(subject), {
        commitmentNumber: claims.commitmentNumber,
        exceptions: claims.exceptions,
        loanPolicyAmountUsd: claims.loanPolicyAmountUsd,
        ownerPolicyAmountUsd: claims.ownerPolicyAmountUsd,
        propertyAddress: addressFieldsOf(claims.propertyAddress),
        proposedInsured: claims.proposedInsured,
        requirements: claims.requirements,
        searchedThrough: dateOf(claims.searchedThrough, "searchedThrough"),
        vestedOwner: claims.vestedOwner,
      });
      return;
    }
    case "evidence-of-insurance-credential": {
      writeEvidenceOfInsuranceClaims(typedSubject(subject), {
        annualPremiumUsd: claims.annualPremiumUsd,
        deductibleUsd: claims.deductibleUsd,
        dwellingCoverageUsd: claims.dwellingCoverageUsd,
        ...(claims.loanNumber === undefined ? {} : { loanNumber: claims.loanNumber }),
        mortgageeClause: claims.mortgageeClause,
        policyEnd: dateOf(claims.policyEnd, "policyEnd"),
        policyNumber: claims.policyNumber,
        policyStart: dateOf(claims.policyStart, "policyStart"),
        propertyAddress: addressFieldsOf(claims.propertyAddress),
      });
      return;
    }
    case "kyc-attestation-credential": {
      const checks = claims.checks.map((check, index) => ({
        attributes: check.attributes.map((attribute) =>
          lookup(CHECKED_ATTRIBUTE_IRIS, attribute, `checks[${index}].attributes`),
        ),
        date: dateOf(check.date, `checks[${index}].date`),
        description: check.description,
        method: lookup(CHECK_METHOD_IRIS, check.method, `checks[${index}].method`),
      }));
      try {
        writeKycAttestationClaims(typedSubject(subject), {
          address: addressFieldsOf(claims.address),
          birthDate: dateOf(claims.birthDate, "birthDate"),
          checks,
          name: claims.name,
        });
      } catch (error) {
        if (error instanceof RangeError) throw new ClaimInputError(error.message);
        throw error;
      }
      return;
    }
    case "organisational-identity-credential": {
      writeOrganisationalIdentityClaims(typedSubject(subject), {
        address: addressFieldsOf(claims.address),
        legalForm: claims.legalForm,
        legalName: claims.legalName,
        lei: claims.lei,
      });
      return;
    }
    case "officer-authorisation-credential": {
      writeOfficerAuthorisationClaims(typedSubject(subject), {
        entityName: claims.entityName,
        officers: claims.officers,
      });
      return;
    }
    case "beneficial-ownership-credential": {
      writeBeneficialOwnershipClaims(typedSubject(subject), {
        entityName: claims.entityName,
        owners: claims.owners,
      });
      return;
    }
    case "tax-compliance-credential": {
      writeTaxComplianceClaims(typedSubject(subject), {
        entityName: claims.entityName,
        filingsCurrentThrough: claims.filingsCurrentThrough,
        status: claims.status,
        taxIdLast4: claims.taxIdLast4,
        turnoverBand: claims.turnoverBand,
      });
      return;
    }
    case "zk-operand-anchor": {
      subject.setIri(MORT.field, claims.field, "field");
      subject.setString(MORT.operandEnc, claims.operandEnc);
      return;
    }
    case "cash-flow-credential": {
      try {
        writeCashFlowClaims(typedSubject(subject), {
          accountLast4: claims.accountLast4,
          averageDailyBalanceUsd: claims.averageDailyBalanceUsd,
          balanceUsd: claims.balanceUsd,
          bankName: claims.bankName,
          cashFlowScoreValue: claims.cashFlowScoreValue,
          depositStreams: claims.depositStreams,
          nsf90Count: claims.nsf90Count,
          observationMonths: claims.observationMonths,
        });
      } catch (error) {
        throw new ClaimInputError((error as Error).message);
      }
      return;
    }
    case "repayment-history-credential": {
      const start = dateOf(claims.start, "start");
      const end = dateOf(claims.end, "end");
      try {
        writeRepaymentHistoryClaims(typedSubject(subject), {
          end,
          late: claims.late,
          loanNumber: claims.loanNumber,
          onTime: claims.onTime,
          scheduled: claims.scheduled,
          servicedLoan: assertAbsoluteIri(claims.servicedLoan, "servicedLoan"),
          start,
        });
      } catch (error) {
        if (error instanceof ClaimInputError) throw error;
        throw new ClaimInputError((error as Error).message);
      }
      return;
    }
    default: {
      const exhaustive: never = claims;
      throw new ClaimInputError(`unsupported claims kind: ${JSON.stringify(exhaustive)}`);
    }
  }
}

export type { CredentialKind };
