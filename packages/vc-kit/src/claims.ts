/**
 * Typed claim-graph construction for the six sm-19 credential kinds. Claims are
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

import { MORT } from "@mortgage/data-model";
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

/** The typed claims union - discriminated by the credential kind. */
export type CredentialClaims =
  | EmploymentIncomeClaims
  | AssetClaims
  | CreditScoreClaims
  | AppraisalClaims
  | TitleClearClaims
  | ZkOperandAnchorClaims;

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
    case "zk-operand-anchor": {
      subject.setIri(MORT.field, claims.field, "field");
      subject.setString(MORT.operandEnc, claims.operandEnc);
      return;
    }
    default: {
      const exhaustive: never = claims;
      throw new ClaimInputError(`unsupported claims kind: ${JSON.stringify(exhaustive)}`);
    }
  }
}

export type { CredentialKind };
