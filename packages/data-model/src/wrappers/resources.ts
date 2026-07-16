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
  TermAs,
} from "@rdfjs/wrapper";
import type { MortgageResourceKind } from "../shacl.js";
import { CRED, DCTERMS, FIBO, SCHEMA } from "../vocab/external.js";
import { MORT } from "../vocab/mort.js";
import { fitsZkBudget, ZK_ANCHORABLE_FIELD_IRIS } from "../zk-budgets.js";
import { literalFromXsdDate, literalFromXsdDecimal } from "./mappings.js";
import {
  AppraisalEvidence,
  DepositAccount,
  MonetaryAmount,
  OrganizationNode,
  PostalAddress,
  RealEstateProperty,
  TypedNode,
} from "./support.js";

/**
 * Typed accessors over the nine mortgage resources plus the ZK operand anchor
 * (SPEC section 5; shapes/*.ttl). Reading AND building go through these
 * wrappers - app code never walks datasets or concatenates Turtle. Setters
 * enforce the cheap invariants early (ZK digit budgets of decision 0005,
 * controlled-vocabulary membership); `resourceToTurtle()` then validates the
 * full document against the matching SHACL shape before any bytes leave the
 * process.
 */
export abstract class MortgageResource extends TypedNode {
  /** The shapes/validate() kind this wrapper's document must conform to. */
  abstract get resourceKind(): MortgageResourceKind;
}

function assertMember(label: string, value: string, allowed: readonly string[]): void {
  if (!allowed.includes(value)) {
    throw new RangeError(`${label} must be one of ${allowed.join(", ")}; got ${value}`);
  }
}

/** Value space of `mort:maritalStatus` (URLA section 1a). */
export const MARITAL_STATUS_IRIS = [
  MORT.MaritalStatus_Married,
  MORT.MaritalStatus_Separated,
  MORT.MaritalStatus_Unmarried,
] as const;

/** Value space of `mort:titleStatus`. */
export const TITLE_STATUS_IRIS = [MORT.TitleStatus_Clear, MORT.TitleStatus_Clouded] as const;

/** Value space of `mort:decisionStatus` (lender-facing outcome). */
export const DECISION_STATUS_IRIS = [
  MORT.DecisionStatus_Approved,
  MORT.DecisionStatus_ApprovedWithConditions,
  MORT.DecisionStatus_Denied,
  MORT.DecisionStatus_Suspended,
] as const;

/** Value space of `mort:scoreModel`. */
export const SCORE_MODEL_IRIS = [MORT.ScoreModel_FICO8] as const;

/** URLA loan-purpose facet (FIBO named individuals, exactly one required). */
export const LOAN_PURPOSE_IRIS = [
  FIBO.MortgageLoanPurpose_BusinessOrCommercial,
  FIBO.MortgageLoanPurpose_DwellingConstruction,
  FIBO.MortgageLoanPurpose_HomeImprovement,
  FIBO.MortgageLoanPurpose_LoanRefinancing,
  FIBO.MortgageLoanPurpose_MortgageModification,
  FIBO.MortgageLoanPurpose_RealPropertyPurchase,
] as const;

/** URLA occupancy facet (exactly one required). */
export const PROPERTY_USAGE_IRIS = [
  FIBO.PropertyUsage_investment,
  FIBO.PropertyUsage_primaryResidence,
  FIBO.PropertyUsage_secondHome,
] as const;

/** URLA amortization-type facet (exactly one required). */
export const AMORTIZATION_TYPE_IRIS = [
  FIBO.AmortizationType_adjustableRate,
  FIBO.AmortizationType_fixedRate,
  FIBO.AmortizationType_graduatedPayment,
  FIBO.AmortizationType_graduatedPaymentAdjustable,
  FIBO.AmortizationType_growingEquity,
  FIBO.AmortizationType_rateImprovement,
  FIBO.AmortizationType_step,
] as const;

/** URLA cash-out facet (exactly one on refinance applications, none otherwise). */
export const CASH_OUT_STATUS_IRIS = [
  FIBO.CashOutStatus_CashOut,
  FIBO.CashOutStatus_LimitedCashOut,
  FIBO.CashOutStatus_NoCashOut,
] as const;

/** AUS recommendation codes (FIBO named individuals, optional on decisions). */
export const AUS_RECOMMENDATION_IRIS = [
  FIBO.UnderwritingDecision_Approve,
  FIBO.UnderwritingDecision_Deny,
  FIBO.UnderwritingDecision_Eligible,
  FIBO.UnderwritingDecision_Ineligible,
  FIBO.UnderwritingDecision_Refer,
  FIBO.UnderwritingDecision_UnableToDetermine,
] as const;

/**
 * Resource 1: the `/mortgage/profile` borrower document the wallet writes
 * (mshape:BorrowerProfileShape). The root node is the borrower's WebID; this
 * wrapper governs that document only, NOT the WebID profile document.
 */
export class BorrowerProfile extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "borrower-profile";
  }

  get personName(): string {
    return RequiredFrom.subjectPredicate(this, SCHEMA.name, LiteralAs.string);
  }
  set personName(value: string) {
    RequiredAs.object(this, SCHEMA.name, value, LiteralFrom.string);
  }

  get birthDate(): Date {
    return RequiredFrom.subjectPredicate(this, SCHEMA.birthDate, LiteralAs.date);
  }
  set birthDate(value: Date) {
    RequiredAs.object(this, SCHEMA.birthDate, value, literalFromXsdDate);
  }

  /** `schema:email` values (at least one; live write-through set). */
  get emails(): Set<string> {
    return SetFrom.subjectPredicate(this, SCHEMA.email, LiteralAs.string, LiteralFrom.string);
  }

  get telephone(): string | undefined {
    return OptionalFrom.subjectPredicate(this, SCHEMA.telephone, LiteralAs.string);
  }
  set telephone(value: string | undefined) {
    OptionalAs.object(this, SCHEMA.telephone, value, LiteralFrom.string);
  }

  get address(): PostalAddress {
    return RequiredFrom.subjectPredicate(this, SCHEMA.address, TermAs.instance(PostalAddress));
  }

  get maritalStatus(): string {
    return RequiredFrom.subjectPredicate(this, MORT.maritalStatus, NamedNodeAs.string);
  }
  set maritalStatus(value: string) {
    assertMember("maritalStatus", value, MARITAL_STATUS_IRIS);
    RequiredAs.object(this, MORT.maritalStatus, value, NamedNodeFrom.string);
  }
}

/**
 * Shared accessors of the five credential resources plus the operand anchor
 * (W3C VC 2.0 envelope). `validUntil` is optional here because anchors revoke
 * rather than expire; the per-kind shape enforces requiredness at serialize.
 */
export abstract class CredentialResource extends MortgageResource {
  get issuer(): string {
    return RequiredFrom.subjectPredicate(this, CRED.issuer, NamedNodeAs.string);
  }
  set issuer(value: string) {
    RequiredAs.object(this, CRED.issuer, value, NamedNodeFrom.string);
  }

  get validFrom(): Date {
    return RequiredFrom.subjectPredicate(this, CRED.validFrom, LiteralAs.date);
  }
  set validFrom(value: Date) {
    RequiredAs.object(this, CRED.validFrom, value, LiteralFrom.dateTime);
  }

  get validUntil(): Date | undefined {
    return OptionalFrom.subjectPredicate(this, CRED.validUntil, LiteralAs.date);
  }
  set validUntil(value: Date | undefined) {
    OptionalAs.object(this, CRED.validUntil, value, LiteralFrom.dateTime);
  }

  /**
   * The status-list entry IRI (Bitstring Status List per issuer, decision
   * 0012). The shapes also admit a blank node; this accessor covers the IRI
   * form the suite's issuers emit and throws on anything else.
   */
  get credentialStatusIri(): string {
    return RequiredFrom.subjectPredicate(this, CRED.credentialStatus, NamedNodeAs.string);
  }
  set credentialStatusIri(value: string) {
    RequiredAs.object(this, CRED.credentialStatus, value, NamedNodeFrom.string);
  }

  /** The borrower WebID (holder binding, decision 0012). */
  get credentialSubjectIri(): string {
    return RequiredFrom.subjectPredicate(this, CRED.credentialSubject, NamedNodeAs.string);
  }
  set credentialSubjectIri(value: string) {
    RequiredAs.object(this, CRED.credentialSubject, value, NamedNodeFrom.string);
  }

  /** `cred:credentialSchema` IRIs (unbounded; live write-through set). */
  get credentialSchemaIris(): Set<string> {
    return SetFrom.subjectPredicate(
      this,
      CRED.credentialSchema,
      NamedNodeAs.string,
      NamedNodeFrom.string,
    );
  }
}

/** Claims node of the employment + income VC (mshape:EmploymentIncomeSubjectShape). */
export class EmploymentIncomeSubject extends TypedNode {
  get worksFor(): OrganizationNode {
    return RequiredFrom.subjectPredicate(this, SCHEMA.worksFor, TermAs.instance(OrganizationNode));
  }

  get jobTitle(): string {
    return RequiredFrom.subjectPredicate(this, SCHEMA.jobTitle, LiteralAs.string);
  }
  set jobTitle(value: string) {
    RequiredAs.object(this, SCHEMA.jobTitle, value, LiteralFrom.string);
  }

  get startDate(): Date {
    return RequiredFrom.subjectPredicate(this, SCHEMA.startDate, LiteralAs.date);
  }
  set startDate(value: Date) {
    RequiredAs.object(this, SCHEMA.startDate, value, literalFromXsdDate);
  }

  /** ZK field (decision 0005): whole USD/month, 4-digit budget, filter_int_d4. */
  get monthlyGrossIncomeUsd(): number {
    return RequiredFrom.subjectPredicate(this, MORT.monthlyGrossIncomeUsd, LiteralAs.number);
  }
  set monthlyGrossIncomeUsd(value: number) {
    if (!fitsZkBudget(MORT.monthlyGrossIncomeUsd, value)) {
      throw new RangeError(
        `monthlyGrossIncomeUsd ${value} breaks decision 0005's 4-digit budget (0..9999 whole USD/month)`,
      );
    }
    RequiredAs.object(this, MORT.monthlyGrossIncomeUsd, value, LiteralFrom.integer);
  }
}

/** Resource 2: employment + income VC (mshape:EmploymentIncomeCredentialShape). */
export class EmploymentIncomeCredential extends CredentialResource {
  override get resourceKind(): MortgageResourceKind {
    return "employment-income-credential";
  }

  get credentialSubject(): EmploymentIncomeSubject {
    return RequiredFrom.subjectPredicate(
      this,
      CRED.credentialSubject,
      TermAs.instance(EmploymentIncomeSubject),
    );
  }

  /** Optional external income-verification report reference. */
  get evidenceIri(): string | undefined {
    return OptionalFrom.subjectPredicate(this, CRED.evidence, NamedNodeAs.string);
  }
  set evidenceIri(value: string | undefined) {
    OptionalAs.object(this, CRED.evidence, value, NamedNodeFrom.string);
  }
}

/** Claims node of the asset VC (mshape:AssetSubjectShape). */
export class AssetSubject extends TypedNode {
  /** Owned deposit accounts (at least one; live write-through set). */
  get accounts(): Set<DepositAccount> {
    return SetFrom.subjectPredicate(
      this,
      SCHEMA.owns,
      TermAs.instance(DepositAccount),
      (value, _factory) => TermAs.term(value),
    );
  }
}

/** Resource 3: asset / bank-balance VC (mshape:AssetCredentialShape). */
export class AssetCredential extends CredentialResource {
  override get resourceKind(): MortgageResourceKind {
    return "asset-credential";
  }

  get credentialSubject(): AssetSubject {
    return RequiredFrom.subjectPredicate(
      this,
      CRED.credentialSubject,
      TermAs.instance(AssetSubject),
    );
  }
}

/** Claims node of the credit-score VC (mshape:CreditScoreSubjectShape). */
export class CreditScoreSubject extends TypedNode {
  /** ZK field (decision 0005): 3-digit budget (FICO-family 300..850), filter_int_d3. */
  get creditScoreValue(): number {
    return RequiredFrom.subjectPredicate(this, MORT.creditScoreValue, LiteralAs.number);
  }
  set creditScoreValue(value: number) {
    if (!fitsZkBudget(MORT.creditScoreValue, value)) {
      throw new RangeError(
        `creditScoreValue ${value} breaks decision 0005's 3-digit budget (300..850)`,
      );
    }
    RequiredAs.object(this, MORT.creditScoreValue, value, LiteralFrom.integer);
  }

  /** ZK field (decision 0005): whole USD/month, 4-digit budget, filter_int_d4. */
  get totalMonthlyDebtUsd(): number {
    return RequiredFrom.subjectPredicate(this, MORT.totalMonthlyDebtUsd, LiteralAs.number);
  }
  set totalMonthlyDebtUsd(value: number) {
    if (!fitsZkBudget(MORT.totalMonthlyDebtUsd, value)) {
      throw new RangeError(
        `totalMonthlyDebtUsd ${value} breaks decision 0005's 4-digit budget (0..9999 whole USD/month)`,
      );
    }
    RequiredAs.object(this, MORT.totalMonthlyDebtUsd, value, LiteralFrom.integer);
  }

  get scoreModel(): string {
    return RequiredFrom.subjectPredicate(this, MORT.scoreModel, NamedNodeAs.string);
  }
  set scoreModel(value: string) {
    assertMember("scoreModel", value, SCORE_MODEL_IRIS);
    RequiredAs.object(this, MORT.scoreModel, value, NamedNodeFrom.string);
  }
}

/** Resource 4: credit-score VC (mshape:CreditScoreCredentialShape). */
export class CreditScoreCredential extends CredentialResource {
  override get resourceKind(): MortgageResourceKind {
    return "credit-score-credential";
  }

  get credentialSubject(): CreditScoreSubject {
    return RequiredFrom.subjectPredicate(
      this,
      CRED.credentialSubject,
      TermAs.instance(CreditScoreSubject),
    );
  }
}

/** Claims node of the appraisal VC (mshape:AppraisalSubjectShape). */
export class AppraisalSubject extends TypedNode {
  get subjectProperty(): RealEstateProperty {
    return RequiredFrom.subjectPredicate(
      this,
      MORT.subjectProperty,
      TermAs.instance(RealEstateProperty),
    );
  }
}

/** Resource 5: appraisal-value VC (mshape:AppraisalCredentialShape). */
export class AppraisalCredential extends CredentialResource {
  override get resourceKind(): MortgageResourceKind {
    return "appraisal-credential";
  }

  get credentialSubject(): AppraisalSubject {
    return RequiredFrom.subjectPredicate(
      this,
      CRED.credentialSubject,
      TermAs.instance(AppraisalSubject),
    );
  }

  /** The FIBO appraisal report (required; must evaluate the subject property). */
  get evidence(): AppraisalEvidence {
    return RequiredFrom.subjectPredicate(this, CRED.evidence, TermAs.instance(AppraisalEvidence));
  }
}

/** Claims node of the title-clear VC (mshape:TitleClearSubjectShape). */
export class TitleClearSubject extends TypedNode {
  get subjectProperty(): RealEstateProperty {
    return RequiredFrom.subjectPredicate(
      this,
      MORT.subjectProperty,
      TermAs.instance(RealEstateProperty),
    );
  }

  get titleStatus(): string {
    return RequiredFrom.subjectPredicate(this, MORT.titleStatus, NamedNodeAs.string);
  }
  set titleStatus(value: string) {
    assertMember("titleStatus", value, TITLE_STATUS_IRIS);
    RequiredAs.object(this, MORT.titleStatus, value, NamedNodeFrom.string);
  }

  /** Effective date through which public records were searched. */
  get searchedThrough(): Date {
    return RequiredFrom.subjectPredicate(this, MORT.searchedThrough, LiteralAs.date);
  }
  set searchedThrough(value: Date) {
    RequiredAs.object(this, MORT.searchedThrough, value, literalFromXsdDate);
  }
}

/** Resource 6: title-clear VC (mshape:TitleClearCredentialShape). */
export class TitleClearCredential extends CredentialResource {
  override get resourceKind(): MortgageResourceKind {
    return "title-clear-credential";
  }

  get credentialSubject(): TitleClearSubject {
    return RequiredFrom.subjectPredicate(
      this,
      CRED.credentialSubject,
      TermAs.instance(TitleClearSubject),
    );
  }

  /** Optional reference to the underlying title search report. */
  get evidenceIri(): string | undefined {
    return OptionalFrom.subjectPredicate(this, CRED.evidence, NamedNodeAs.string);
  }
  set evidenceIri(value: string | undefined) {
    OptionalAs.object(this, CRED.evidence, value, NamedNodeFrom.string);
  }
}

function facetOf(typeIris: ReadonlySet<string>, facet: readonly string[]): string | undefined {
  let found: string | undefined;
  for (const iri of typeIris) {
    if (!facet.includes(iri)) continue;
    if (found !== undefined) {
      throw new RangeError(`multiple values of one URLA facet present: ${found}, ${iri}`);
    }
    found = iri;
  }
  return found;
}

/** Resource 7: the URLA-subset loan application (mshape:LoanApplicationShape). */
export class LoanApplication extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "loan-application";
  }

  /** URLA application date (`dcterms:created`, xsd:date). */
  get created(): Date {
    return RequiredFrom.subjectPredicate(this, DCTERMS.created, LiteralAs.date);
  }
  set created(value: Date) {
    RequiredAs.object(this, DCTERMS.created, value, literalFromXsdDate);
  }

  /** The borrower WebID. */
  get submittedByIri(): string {
    return RequiredFrom.subjectPredicate(this, FIBO.isSubmittedBy, NamedNodeAs.string);
  }
  set submittedByIri(value: string) {
    RequiredAs.object(this, FIBO.isSubmittedBy, value, NamedNodeFrom.string);
  }

  get requestedAmount(): MonetaryAmount {
    return RequiredFrom.subjectPredicate(
      this,
      FIBO.hasRequestedAmount,
      TermAs.instance(MonetaryAmount),
    );
  }

  get loanTermMonths(): number {
    return RequiredFrom.subjectPredicate(this, MORT.loanTermMonths, LiteralAs.number);
  }
  set loanTermMonths(value: number) {
    if (!Number.isSafeInteger(value) || value < 12 || value > 480) {
      throw new RangeError(`loanTermMonths must be an integer in 12..480, got ${value}`);
    }
    RequiredAs.object(this, MORT.loanTermMonths, value, LiteralFrom.integer);
  }

  get subjectProperty(): RealEstateProperty {
    return RequiredFrom.subjectPredicate(
      this,
      MORT.subjectProperty,
      TermAs.instance(RealEstateProperty),
    );
  }

  /** All URLA facet individuals attached via `dcterms:type` (write-through set). */
  get urlaTypeIris(): Set<string> {
    return SetFrom.subjectPredicate(this, DCTERMS.type, NamedNodeAs.string, NamedNodeFrom.string);
  }

  private setFacet(facet: readonly string[], value: string | undefined, label: string): void {
    if (value !== undefined) assertMember(label, value, facet);
    const types = this.urlaTypeIris;
    for (const iri of [...types]) {
      if (facet.includes(iri)) types.delete(iri);
    }
    if (value !== undefined) types.add(value);
  }

  /** URLA section 4a loan purpose (exactly one; shape-enforced). */
  get loanPurpose(): string | undefined {
    return facetOf(this.urlaTypeIris, LOAN_PURPOSE_IRIS);
  }
  set loanPurpose(value: string | undefined) {
    this.setFacet(LOAN_PURPOSE_IRIS, value, "loanPurpose");
  }

  /** URLA section 4a occupancy (exactly one; shape-enforced). */
  get occupancy(): string | undefined {
    return facetOf(this.urlaTypeIris, PROPERTY_USAGE_IRIS);
  }
  set occupancy(value: string | undefined) {
    this.setFacet(PROPERTY_USAGE_IRIS, value, "occupancy");
  }

  /** Amortization type (exactly one; shape-enforced). */
  get amortizationType(): string | undefined {
    return facetOf(this.urlaTypeIris, AMORTIZATION_TYPE_IRIS);
  }
  set amortizationType(value: string | undefined) {
    this.setFacet(AMORTIZATION_TYPE_IRIS, value, "amortizationType");
  }

  /** Cash-out status: exactly one on refinance applications, none otherwise. */
  get cashOutStatus(): string | undefined {
    return facetOf(this.urlaTypeIris, CASH_OUT_STATUS_IRIS);
  }
  set cashOutStatus(value: string | undefined) {
    this.setFacet(CASH_OUT_STATUS_IRIS, value, "cashOutStatus");
  }
}

/** Resource 8: the underwriting decision (mshape:UnderwritingDecisionShape). */
export class UnderwritingDecision extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "underwriting-decision";
  }

  /** The loan-application pod resource this decision evaluates. */
  get evaluatesIri(): string {
    return RequiredFrom.subjectPredicate(this, FIBO.evaluates, NamedNodeAs.string);
  }
  set evaluatesIri(value: string) {
    RequiredAs.object(this, FIBO.evaluates, value, NamedNodeFrom.string);
  }

  get decisionStatus(): string {
    return RequiredFrom.subjectPredicate(this, MORT.decisionStatus, NamedNodeAs.string);
  }
  set decisionStatus(value: string) {
    assertMember("decisionStatus", value, DECISION_STATUS_IRIS);
    RequiredAs.object(this, MORT.decisionStatus, value, NamedNodeFrom.string);
  }

  /** Human-readable conditions (live write-through set; may be empty). */
  get conditions(): Set<string> {
    return SetFrom.subjectPredicate(
      this,
      MORT.underwritingCondition,
      LiteralAs.string,
      LiteralFrom.string,
    );
  }

  get approvedAmount(): MonetaryAmount | undefined {
    return OptionalFrom.subjectPredicate(
      this,
      FIBO.hasApprovedAmount,
      TermAs.instance(MonetaryAmount),
    );
  }

  /** Optional AUS recommendation code (`dcterms:type`, FIBO named individual). */
  get ausRecommendation(): string | undefined {
    return OptionalFrom.subjectPredicate(this, DCTERMS.type, NamedNodeAs.string);
  }
  set ausRecommendation(value: string | undefined) {
    if (value !== undefined) assertMember("ausRecommendation", value, AUS_RECOMMENDATION_IRIS);
    OptionalAs.object(this, DCTERMS.type, value, NamedNodeFrom.string);
  }

  get issued(): Date {
    return RequiredFrom.subjectPredicate(this, DCTERMS.issued, LiteralAs.date);
  }
  set issued(value: Date) {
    RequiredAs.object(this, DCTERMS.issued, value, LiteralFrom.dateTime);
  }

  /** The deciding lender (or AUS) WebID. */
  get creatorIri(): string {
    return RequiredFrom.subjectPredicate(this, DCTERMS.creator, NamedNodeAs.string);
  }
  set creatorIri(value: string) {
    RequiredAs.object(this, DCTERMS.creator, value, NamedNodeFrom.string);
  }
}

/** Resource 9: the executed-mortgage closing record (mshape:ClosingRecordShape). */
export class ClosingRecord extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "closing-record";
  }

  get borrowerIri(): string {
    return RequiredFrom.subjectPredicate(this, FIBO.hasBorrower, NamedNodeAs.string);
  }
  set borrowerIri(value: string) {
    RequiredAs.object(this, FIBO.hasBorrower, value, NamedNodeFrom.string);
  }

  get subjectProperty(): RealEstateProperty {
    return RequiredFrom.subjectPredicate(
      this,
      MORT.subjectProperty,
      TermAs.instance(RealEstateProperty),
    );
  }

  get principalAmount(): MonetaryAmount {
    return RequiredFrom.subjectPredicate(
      this,
      FIBO.hasPrincipalAmount,
      TermAs.instance(MonetaryAmount),
    );
  }

  get totalClosingCosts(): MonetaryAmount | undefined {
    return OptionalFrom.subjectPredicate(
      this,
      FIBO.hasTotalClosingCosts,
      TermAs.instance(MonetaryAmount),
    );
  }

  /** Display note rate in percent (e.g. 6.125). */
  get interestRatePercent(): number {
    return RequiredFrom.subjectPredicate(this, SCHEMA.interestRate, LiteralAs.number);
  }
  set interestRatePercent(value: number) {
    if (!Number.isFinite(value) || value < 0 || value > 25) {
      throw new RangeError(`interestRatePercent must be in 0..25, got ${value}`);
    }
    RequiredAs.object(this, SCHEMA.interestRate, value, literalFromXsdDecimal);
  }

  get loanTermMonths(): number {
    return RequiredFrom.subjectPredicate(this, MORT.loanTermMonths, LiteralAs.number);
  }
  set loanTermMonths(value: number) {
    if (!Number.isSafeInteger(value) || value < 12 || value > 480) {
      throw new RangeError(`loanTermMonths must be an integer in 12..480, got ${value}`);
    }
    RequiredAs.object(this, MORT.loanTermMonths, value, LiteralFrom.integer);
  }

  /** Consummation date (`mort:closingDate`, xsd:date). */
  get closingDate(): Date {
    return RequiredFrom.subjectPredicate(this, MORT.closingDate, LiteralAs.date);
  }
  set closingDate(value: Date) {
    RequiredAs.object(this, MORT.closingDate, value, literalFromXsdDate);
  }

  get recordingReference(): string {
    return RequiredFrom.subjectPredicate(this, MORT.recordingReference, LiteralAs.string);
  }
  set recordingReference(value: string) {
    RequiredAs.object(this, MORT.recordingReference, value, LiteralFrom.string);
  }

  /** The servicer of record after the scene 5 transfer. */
  get servicer(): OrganizationNode {
    return RequiredFrom.subjectPredicate(
      this,
      FIBO.isServicedBy,
      TermAs.instance(OrganizationNode),
    );
  }
}

/** Claims node of the operand anchor (mshape:ZkOperandAnchorSubjectShape). */
export class ZkOperandAnchorSubject extends TypedNode {
  /** The anchored ZK field IRI (decision 0005 scaled-unit fields only). */
  get fieldIri(): string {
    return RequiredFrom.subjectPredicate(this, MORT.field, NamedNodeAs.string);
  }
  set fieldIri(value: string) {
    assertMember("fieldIri", value, ZK_ANCHORABLE_FIELD_IRIS);
    RequiredAs.object(this, MORT.field, value, NamedNodeFrom.string);
  }

  /** Deterministic salt-free sparq operand encoding (0x-prefixed lowercase hex). */
  get operandEnc(): string {
    return RequiredFrom.subjectPredicate(this, MORT.operandEnc, LiteralAs.string);
  }
  set operandEnc(value: string) {
    if (!/^0x[0-9a-f]{1,64}$/.test(value)) {
      throw new RangeError("operandEnc must be a 0x-prefixed lowercase hex field element");
    }
    RequiredAs.object(this, MORT.operandEnc, value, LiteralFrom.string);
  }
}

/**
 * The issuer-signed operand-anchor VC that makes Tier A live filter proofs
 * forgery-resistant (decision 0012; mshape:ZkOperandAnchorShape). Never ship
 * a Tier A surface without the anchor check.
 */
export class ZkOperandAnchor extends CredentialResource {
  override get resourceKind(): MortgageResourceKind {
    return "zk-operand-anchor";
  }

  get credentialSubject(): ZkOperandAnchorSubject {
    return RequiredFrom.subjectPredicate(
      this,
      CRED.credentialSubject,
      TermAs.instance(ZkOperandAnchorSubject),
    );
  }
}
