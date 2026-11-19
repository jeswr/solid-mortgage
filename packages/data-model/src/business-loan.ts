// AUTHORED-BY Claude Opus 5.5
/**
 * Small business loan (demo 6, flows.md section 6): the typed RDF layer for
 *
 * - the tax compliance credential a state revenue department issues to a business (filings up
 *   to date, the turnover band; the figure itself is never disclosed);
 * - the cash flow record a bank writes into the business's pod under a write-only grant;
 * - the business loan terms with their financial covenants, which the lender sends to the
 *   borrower's pod;
 * - the lender's own cash flow assessment, kept in the lender's pod.
 *
 * Every write goes through these wrappers and `resourceToTurtle()`, which validates against
 * `shapes/small-business-loan.ttl` before any bytes leave the process.
 */

import { DataFactory, Store } from "n3";
import type { MortgageResourceKind } from "./shacl.js";
import { DCTERMS, FIBO, SCHEMA } from "./vocab/external.js";
import { MORT } from "./vocab/mort.js";
import {
  addChild,
  children,
  date,
  dateTime,
  iri,
  iriSet,
  num,
  optBool,
  setDate,
  setDateTime,
  setDecimal,
  setInt,
  setIri,
  setOptBool,
  setStr,
  setUsd,
  str,
  usd,
} from "./wrappers/fields.js";
import { CredentialResource, MortgageResource } from "./wrappers/resources.js";
import { TypedNode } from "./wrappers/support.js";

/** Whether a business's filings are up to date, as `mort:` concepts. */
export const TAX_COMPLIANCE_STATUSES = Object.freeze({
  compliant: MORT.TaxComplianceStatus_Compliant,
  "not-compliant": MORT.TaxComplianceStatus_NotCompliant,
});
export type TaxComplianceStatus = keyof typeof TAX_COMPLIANCE_STATUSES;

/** The bands of gross annual revenues, as `mort:` concepts. */
export const TURNOVER_BANDS = Object.freeze({
  "1m-5m": MORT.TurnoverBand_1MTo5M,
  "500k-1m": MORT.TurnoverBand_500kTo1M,
  "over-5m": MORT.TurnoverBand_Over5M,
  "under-500k": MORT.TurnoverBand_Under500k,
});
export type TurnoverBand = keyof typeof TURNOVER_BANDS;

/** What a financial covenant measures, as `mort:` concepts. */
export const COVENANT_METRICS = Object.freeze({
  "average-balance": MORT.CovenantMetric_MinimumAverageBalance,
  dscr: MORT.CovenantMetric_DebtServiceCoverage,
});
export type CovenantMetric = keyof typeof COVENANT_METRICS;

/** Most months one cash flow record holds (mshape:CashFlowRecordShape). */
export const MAX_CASH_FLOW_MONTHS = 36;

function keyOf<K extends string>(table: Readonly<Record<K, string>>, value: string): K | undefined {
  return (Object.keys(table) as K[]).find((key) => table[key] === value);
}

function member<K extends string>(
  label: string,
  table: Readonly<Record<K, string>>,
  key: K,
): string {
  if (!Object.hasOwn(table, key)) throw new RangeError(`unknown ${label} ${key}`);
  return table[key];
}

function finite(label: string, value: number, min = Number.NEGATIVE_INFINITY): number {
  if (!Number.isFinite(value) || value < min) {
    throw new RangeError(`${label} must be a finite number of at least ${min}, got ${value}`);
  }
  return value;
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

// ── Tax compliance credential ────────────────────────────────────────────────────────────

/** Subject of the tax compliance credential (mshape:TaxComplianceSubjectShape). */
export class TaxComplianceSubject extends TypedNode {
  get entityName(): string {
    return str(this, SCHEMA.name);
  }
  get taxIdLast4(): string {
    return str(this, MORT.taxIdLast4);
  }
  get statusIri(): string {
    return iri(this, MORT.taxComplianceStatus);
  }
  get status(): TaxComplianceStatus | undefined {
    return keyOf(TAX_COMPLIANCE_STATUSES, this.statusIri);
  }
  get filingsCurrentThrough(): Date {
    return date(this, MORT.filingsCurrentThrough);
  }
  get turnoverBandIri(): string {
    return iri(this, MORT.annualTurnoverBand);
  }
  get turnoverBand(): TurnoverBand | undefined {
    return keyOf(TURNOVER_BANDS, this.turnoverBandIri);
  }
}

export class TaxComplianceCredential extends CredentialResource {
  override get resourceKind(): MortgageResourceKind {
    return "tax-compliance-credential";
  }
  get credentialSubject(): TaxComplianceSubject {
    return new TaxComplianceSubject(
      this.factory.namedNode(this.credentialSubjectIri),
      this.dataset,
      this.factory,
    );
  }
}

export interface TaxComplianceClaimsInit {
  entityName: string;
  /** The last four digits of the employer identification number. */
  taxIdLast4: string;
  status: TaxComplianceStatus;
  /** The end of the last tax period with every return filed. */
  filingsCurrentThrough: Date;
  turnoverBand: TurnoverBand;
}

/** Write the tax compliance claims onto a credential subject (vc-kit signs what this writes). */
export function writeTaxComplianceClaims(subject: TypedNode, init: TaxComplianceClaimsInit): void {
  if (init.entityName.trim() === "") throw new RangeError("an entity name is required");
  if (!/^[0-9]{4}$/.test(init.taxIdLast4)) {
    throw new RangeError(`taxIdLast4 is four digits, got ${JSON.stringify(init.taxIdLast4)}`);
  }
  if (Number.isNaN(init.filingsCurrentThrough.getTime())) {
    throw new RangeError("filingsCurrentThrough must be a valid date");
  }
  const status = member("tax compliance status", TAX_COMPLIANCE_STATUSES, init.status);
  const band = member("turnover band", TURNOVER_BANDS, init.turnoverBand);
  subject.typeIris.add(SCHEMA.Organization);
  setStr(subject, SCHEMA.name, init.entityName);
  setStr(subject, MORT.taxIdLast4, init.taxIdLast4);
  setIri(subject, MORT.taxComplianceStatus, status);
  setDate(subject, MORT.filingsCurrentThrough, init.filingsCurrentThrough);
  setIri(subject, MORT.annualTurnoverBand, band);
}

// ── Cash flow record ─────────────────────────────────────────────────────────────────────

/** One month of a cash flow record (mshape:MonthlyCashFlowShape). */
export class MonthlyCashFlowNode extends TypedNode {
  get periodStart(): Date {
    return date(this, MORT.periodStart);
  }
  get inflowUsd(): number {
    return num(this, MORT.inflowUsd);
  }
  get outflowUsd(): number {
    return num(this, MORT.outflowUsd);
  }
  get debtServiceUsd(): number {
    return num(this, MORT.debtServiceUsd);
  }
  get closingBalanceUsd(): number {
    return num(this, MORT.closingBalanceUsd);
  }
}

export class CashFlowRecord extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "cash-flow-record";
  }
  get name(): string {
    return str(this, SCHEMA.name);
  }
  /** The account holder's WebID. */
  get holder(): string {
    return iri(this, DCTERMS.subject);
  }
  /** The bank's WebID. */
  get bank(): string {
    return iri(this, DCTERMS.creator);
  }
  get issued(): Date {
    return dateTime(this, DCTERMS.issued);
  }
  get accountLast4(): string {
    return str(this, MORT.accountLast4);
  }
  /** The months, oldest first. */
  get months(): MonthlyCashFlowNode[] {
    return children(this, MORT.monthlyCashFlow, MonthlyCashFlowNode).sort(
      (a, b) => a.periodStart.getTime() - b.periodStart.getTime(),
    );
  }
}

export interface MonthlyCashFlowInit {
  /** The first day of the month (UTC). */
  periodStart: Date;
  inflowUsd: number;
  /** Everything paid out, debt service included. */
  outflowUsd: number;
  /** The part of the outflow that repaid existing debt. */
  debtServiceUsd: number;
  closingBalanceUsd: number;
}

export interface CashFlowRecordInit {
  iri: string;
  name: string;
  holder: string;
  bank: string;
  issued: Date;
  accountLast4: string;
  months: readonly MonthlyCashFlowInit[];
}

export function buildCashFlowRecord(init: CashFlowRecordInit): CashFlowRecord {
  if (init.months.length === 0 || init.months.length > MAX_CASH_FLOW_MONTHS) {
    throw new RangeError(`between 1 and ${MAX_CASH_FLOW_MONTHS} months, got ${init.months.length}`);
  }
  if (!/^[0-9]{4}$/.test(init.accountLast4)) {
    throw new RangeError(`accountLast4 is four digits, got ${JSON.stringify(init.accountLast4)}`);
  }
  const seen = new Set<string>();
  const record = root(CashFlowRecord, init.iri);
  record.typeIris.add(MORT.CashFlowRecord);
  setStr(record, SCHEMA.name, init.name);
  setIri(record, DCTERMS.subject, init.holder);
  setIri(record, DCTERMS.creator, init.bank);
  setDateTime(record, DCTERMS.issued, init.issued);
  setStr(record, MORT.accountLast4, init.accountLast4);
  init.months.forEach((month, index) => {
    const period = month.periodStart.toISOString().slice(0, 10);
    if (!period.endsWith("-01")) throw new RangeError(`a month starts on its first day: ${period}`);
    if (seen.has(period)) throw new RangeError(`month ${period} appears twice`);
    seen.add(period);
    const outflow = finite("outflowUsd", month.outflowUsd, 0);
    const debtService = finite("debtServiceUsd", month.debtServiceUsd, 0);
    if (debtService > outflow) {
      throw new RangeError(`${period}: debt service ${debtService} exceeds outflow ${outflow}`);
    }
    const node = addChild(record, MORT.monthlyCashFlow, MonthlyCashFlowNode, String(index + 1));
    node.typeIris.add(MORT.MonthlyCashFlow);
    setDate(node, MORT.periodStart, month.periodStart);
    setDecimal(node, MORT.inflowUsd, finite("inflowUsd", month.inflowUsd, 0));
    setDecimal(node, MORT.outflowUsd, outflow);
    setDecimal(node, MORT.debtServiceUsd, debtService);
    setDecimal(node, MORT.closingBalanceUsd, finite("closingBalanceUsd", month.closingBalanceUsd));
  });
  return record;
}

// ── Business loan terms and covenants ────────────────────────────────────────────────────

/** One financial covenant (mshape:FinancialCovenantShape). */
export class FinancialCovenantNode extends TypedNode {
  get name(): string {
    return str(this, SCHEMA.name);
  }
  get metricIri(): string {
    return iri(this, MORT.covenantMetric);
  }
  get metric(): CovenantMetric | undefined {
    return keyOf(COVENANT_METRICS, this.metricIri);
  }
  get threshold(): number {
    return num(this, MORT.covenantThreshold);
  }
}

export class BusinessLoanTerms extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "business-loan-terms";
  }
  get name(): string {
    return str(this, SCHEMA.name);
  }
  get loanNumber(): string {
    return str(this, MORT.loanNumber);
  }
  get borrower(): string {
    return iri(this, FIBO.hasBorrower);
  }
  get lender(): string {
    return iri(this, DCTERMS.creator);
  }
  get issued(): Date {
    return dateTime(this, DCTERMS.issued);
  }
  get principalUsd(): number {
    return usd(this, FIBO.hasPrincipalAmount);
  }
  /** The note rate in percent. */
  get interestRate(): number {
    return num(this, SCHEMA.interestRate);
  }
  get termMonths(): number {
    return num(this, MORT.loanTermMonths);
  }
  get monthlyPaymentUsd(): number {
    return usd(this, MORT.monthlyPrincipalAndInterest);
  }
  /** The covenants, in metric order (coverage first). */
  get covenants(): FinancialCovenantNode[] {
    return children(this, MORT.covenant, FinancialCovenantNode).sort((a, b) =>
      (b.metric ?? "").localeCompare(a.metric ?? ""),
    );
  }
}

export interface CovenantInit {
  name: string;
  metric: CovenantMetric;
  threshold: number;
}

export interface BusinessLoanTermsInit {
  iri: string;
  name: string;
  loanNumber: string;
  borrower: string;
  lender: string;
  issued: Date;
  principalUsd: number;
  /** The note rate in percent, e.g. 8.25. */
  interestRate: number;
  termMonths: number;
  monthlyPaymentUsd: number;
  covenants: readonly CovenantInit[];
}

export function buildBusinessLoanTerms(init: BusinessLoanTermsInit): BusinessLoanTerms {
  if (init.covenants.length === 0) throw new RangeError("a business loan needs a covenant");
  const terms = root(BusinessLoanTerms, init.iri);
  terms.typeIris.add(MORT.BusinessLoanTerms);
  setStr(terms, SCHEMA.name, init.name);
  setStr(terms, MORT.loanNumber, init.loanNumber);
  setIri(terms, FIBO.hasBorrower, init.borrower);
  setIri(terms, DCTERMS.creator, init.lender);
  setDateTime(terms, DCTERMS.issued, init.issued);
  setUsd(terms, FIBO.hasPrincipalAmount, finite("principalUsd", init.principalUsd, 0));
  setDecimal(terms, SCHEMA.interestRate, finite("interestRate", init.interestRate, 0));
  setInt(terms, MORT.loanTermMonths, init.termMonths);
  setUsd(
    terms,
    MORT.monthlyPrincipalAndInterest,
    finite("monthlyPaymentUsd", init.monthlyPaymentUsd, 0),
  );
  init.covenants.forEach((covenant, index) => {
    const node = addChild(terms, MORT.covenant, FinancialCovenantNode, String(index + 1));
    node.typeIris.add(MORT.FinancialCovenant);
    setStr(node, SCHEMA.name, covenant.name);
    setIri(node, MORT.covenantMetric, member("covenant metric", COVENANT_METRICS, covenant.metric));
    setDecimal(node, MORT.covenantThreshold, finite("threshold", covenant.threshold, 0));
  });
  return terms;
}

// ── The lender's cash flow assessment ────────────────────────────────────────────────────

export class CashFlowAssessment extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "cash-flow-assessment";
  }
  get name(): string {
    return str(this, SCHEMA.name);
  }
  get borrower(): string {
    return iri(this, DCTERMS.subject);
  }
  get lender(): string {
    return iri(this, DCTERMS.creator);
  }
  get checkedAt(): Date {
    return dateTime(this, MORT.checkedAt);
  }
  /** The pod resources the measures were taken from, sorted. */
  get sources(): string[] {
    return [...iriSet(this, DCTERMS.source)].sort();
  }
  get debtServiceCoverageRatio(): number {
    return num(this, MORT.debtServiceCoverageRatio);
  }
  get averageBalanceUsd(): number {
    return num(this, MORT.averageBalanceUsd);
  }
  get covenantsMet(): boolean {
    return optBool(this, MORT.covenantsMet) === true;
  }
}

export interface CashFlowAssessmentInit {
  iri: string;
  name: string;
  borrower: string;
  lender: string;
  checkedAt: Date;
  sources: readonly string[];
  debtServiceCoverageRatio: number;
  averageBalanceUsd: number;
  covenantsMet: boolean;
}

export function buildCashFlowAssessment(init: CashFlowAssessmentInit): CashFlowAssessment {
  if (init.sources.length === 0) throw new RangeError("an assessment names what it read");
  const assessment = root(CashFlowAssessment, init.iri);
  assessment.typeIris.add(MORT.CashFlowAssessment);
  setStr(assessment, SCHEMA.name, init.name);
  setIri(assessment, DCTERMS.subject, init.borrower);
  setIri(assessment, DCTERMS.creator, init.lender);
  setDateTime(assessment, MORT.checkedAt, init.checkedAt);
  const sources = iriSet(assessment, DCTERMS.source);
  for (const source of init.sources) sources.add(source);
  setDecimal(
    assessment,
    MORT.debtServiceCoverageRatio,
    finite("debtServiceCoverageRatio", init.debtServiceCoverageRatio),
  );
  setDecimal(
    assessment,
    MORT.averageBalanceUsd,
    finite("averageBalanceUsd", init.averageBalanceUsd),
  );
  setOptBool(assessment, MORT.covenantsMet, init.covenantsMet);
  return assessment;
}
