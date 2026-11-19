// AUTHORED-BY Claude Opus 5.5
import { DataFactory, Store } from "n3";
import type { MortgageResourceKind } from "../shacl.js";
import { CRED, DCTERMS, FIBO, SCHEMA } from "../vocab/external.js";
import { MORT } from "../vocab/mort.js";
import { applyEnvelope, type CredentialEnvelopeInit } from "./build.js";
import { addScoreDisclosures, ScoreDisclosure, type ScoreDisclosureInit } from "./documents.js";
import {
  addChild,
  child,
  children,
  date,
  dateTime,
  iri,
  num,
  optStr,
  setDate,
  setDateTime,
  setDecimal,
  setInt,
  setIri,
  setOptStr,
  setOrganization,
  setStr,
  setUsd,
  str,
  strSet,
  usd,
} from "./fields.js";
import { CredentialResource, MortgageResource } from "./resources.js";
import { DepositAccount, TypedNode } from "./support.js";

/**
 * Typed wrappers and builders for the small-dollar lending demo (docs/rebuild/flows.md section
 * 4): the bank's cash-flow credential, the lender's repayment history credential, and the three
 * documents delivered to the borrower's pod (the closed-end credit disclosure, the adverse action
 * notice) or written by the borrower (the payout instruction). Ported from jeswr/solid-lending's
 * data model, whose `urn:example:lend#` terms now live in the mort vocabulary.
 */

const FIBO_LOANS = "https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/Loans/";
/** `fibo-loan-ln-ln:PaymentHistory`, the record a repayment history credential carries. */
export const FIBO_PAYMENT_HISTORY = `${FIBO_LOANS}PaymentHistory`;
/** `fibo-loan-ln-ln:hasPaymentHistory`. */
export const FIBO_HAS_PAYMENT_HISTORY = `${FIBO_LOANS}hasPaymentHistory`;

const SCHEMA_END_DATE = "https://schema.org/endDate";
const SCHEMA_NUMBER_OF_LOAN_PAYMENTS = "https://schema.org/numberOfLoanPayments";
const SCHEMA_LOAN_PAYMENT_AMOUNT = "https://schema.org/loanPaymentAmount";

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

function assertIntegerIn(label: string, value: number, min: number, max: number): void {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new RangeError(`${label} must be an integer in ${min}..${max}, got ${value}`);
  }
}

function assertLast4(value: string): void {
  if (!/^[0-9]{4}$/.test(value)) throw new RangeError("accountLast4 must be exactly four digits");
}

// ── Cash-flow credential ─────────────────────────────────────────────────────────────────

/** One recurring income stream (mshape:DepositStreamShape). */
export class DepositStream extends TypedNode {
  get name(): string {
    return str(this, SCHEMA.name);
  }
  /** The typical monthly amount, whole US dollars and cents. */
  get monthlyAmountUsd(): number {
    return usd(this, SCHEMA.amount);
  }
}

/** Claims node of the cash-flow credential (mshape:CashFlowSubjectShape). */
export class CashFlowSubject extends TypedNode {
  get account(): DepositAccount {
    return child(this, SCHEMA.owns, DepositAccount);
  }
  get depositStreams(): DepositStream[] {
    return children(this, MORT.depositStream, DepositStream);
  }
  get averageDailyBalanceUsd(): number {
    return usd(this, MORT.averageDailyBalance);
  }
  get observationMonths(): number {
    return num(this, MORT.observationMonths);
  }
  /** Payments returned for insufficient funds in the last 90 days (ZK-provable). */
  get nsf90Count(): number {
    return num(this, MORT.nsf90Count);
  }
  /** Cash-flow score, 300 to 850 (ZK-provable). */
  get cashFlowScoreValue(): number {
    return num(this, MORT.cashFlowScoreValue);
  }
  get scoreModelIri(): string {
    return iri(this, MORT.scoreModel);
  }
}

export interface DepositStreamInit {
  name: string;
  monthlyAmountUsd: number;
}

export interface CashFlowClaimsInit {
  bankName: string;
  accountLast4: string;
  /** The account's current balance. */
  balanceUsd: number;
  depositStreams: readonly DepositStreamInit[];
  averageDailyBalanceUsd: number;
  observationMonths: number;
  nsf90Count: number;
  cashFlowScoreValue: number;
}

/** Write the cash-flow claims onto a subject node (used by the builder and by vc-kit). */
export function writeCashFlowClaims(subject: TypedNode, init: CashFlowClaimsInit): void {
  assertLast4(init.accountLast4);
  assertIntegerIn("observationMonths", init.observationMonths, 1, 36);
  assertIntegerIn("nsf90Count", init.nsf90Count, 0, 99);
  assertIntegerIn("cashFlowScoreValue", init.cashFlowScoreValue, 300, 850);
  if (init.depositStreams.length < 1 || init.depositStreams.length > 8) {
    throw new RangeError("a cash-flow summary names one to eight deposit streams");
  }
  const account = addChild(subject, SCHEMA.owns, DepositAccount);
  account.typeIris.add(SCHEMA.DepositAccount);
  setOrganization(account, SCHEMA.provider, init.bankName);
  setUsd(account, SCHEMA.amount, init.balanceUsd);
  account.accountLast4 = init.accountLast4;
  init.depositStreams.forEach((stream, index) => {
    const node = addChild(subject, MORT.depositStream, DepositStream, String(index + 1));
    node.typeIris.add(MORT.DepositStream);
    setStr(node, SCHEMA.name, stream.name);
    setUsd(node, SCHEMA.amount, stream.monthlyAmountUsd);
  });
  setUsd(subject, MORT.averageDailyBalance, init.averageDailyBalanceUsd);
  setInt(subject, MORT.observationMonths, init.observationMonths);
  setInt(subject, MORT.nsf90Count, init.nsf90Count);
  setInt(subject, MORT.cashFlowScoreValue, init.cashFlowScoreValue);
  setIri(subject, MORT.scoreModel, MORT.ScoreModel_CashFlowV1);
}

/** Cash-flow credential (mshape:CashFlowCredentialShape). */
export class CashFlowCredential extends CredentialResource {
  override get resourceKind(): MortgageResourceKind {
    return "cash-flow-credential";
  }
  get credentialSubject(): CashFlowSubject {
    return new CashFlowSubject(
      this.factory.namedNode(iri(this, CRED.credentialSubject)),
      this.dataset,
      this.factory,
    );
  }
}

export interface CashFlowCredentialInit extends CredentialEnvelopeInit, CashFlowClaimsInit {}

export function buildCashFlowCredential(init: CashFlowCredentialInit): CashFlowCredential {
  const credential = root(CashFlowCredential, init.iri);
  applyEnvelope(credential, init, MORT.CashFlowCredential);
  writeCashFlowClaims(credential.credentialSubject, init);
  return credential;
}

// ── Repayment history credential ─────────────────────────────────────────────────────────

/** The payment record (mshape:PaymentHistoryShape). */
export class PaymentHistory extends TypedNode {
  /** The loan's disclosure in the borrower's pod. */
  get servicedLoanIri(): string {
    return iri(this, MORT.servicedLoan);
  }
  get loanNumber(): string {
    return str(this, MORT.loanNumber);
  }
  get onTime(): number {
    return num(this, MORT.onTimePaymentCount);
  }
  get late(): number {
    return num(this, MORT.latePaymentCount);
  }
  get scheduled(): number {
    return num(this, MORT.scheduledPaymentCount);
  }
  get start(): Date {
    return date(this, SCHEMA.startDate);
  }
  get end(): Date {
    return date(this, SCHEMA_END_DATE);
  }
}

/** Claims node of the repayment history credential (mshape:RepaymentHistorySubjectShape). */
export class RepaymentHistorySubject extends TypedNode {
  get paymentHistory(): PaymentHistory {
    return child(this, FIBO_HAS_PAYMENT_HISTORY, PaymentHistory);
  }
}

export interface RepaymentHistoryClaimsInit {
  servicedLoan: string;
  loanNumber: string;
  onTime: number;
  late: number;
  scheduled: number;
  start: Date;
  end: Date;
}

/** Write the repayment history claims onto a subject node (used by the builder and by vc-kit). */
export function writeRepaymentHistoryClaims(
  subject: TypedNode,
  init: RepaymentHistoryClaimsInit,
): void {
  assertIntegerIn("onTime", init.onTime, 0, 999);
  assertIntegerIn("late", init.late, 0, 999);
  assertIntegerIn("scheduled", init.scheduled, 1, 999);
  if (init.onTime + init.late > init.scheduled) {
    throw new RangeError("on-time and late payments together cannot exceed the scheduled count");
  }
  const history = addChild(subject, FIBO_HAS_PAYMENT_HISTORY, PaymentHistory);
  history.typeIris.add(FIBO_PAYMENT_HISTORY);
  setIri(history, MORT.servicedLoan, init.servicedLoan);
  setStr(history, MORT.loanNumber, init.loanNumber);
  setInt(history, MORT.onTimePaymentCount, init.onTime);
  setInt(history, MORT.latePaymentCount, init.late);
  setInt(history, MORT.scheduledPaymentCount, init.scheduled);
  setDate(history, SCHEMA.startDate, init.start);
  setDate(history, SCHEMA_END_DATE, init.end);
}

/** Repayment history credential (mshape:RepaymentHistoryCredentialShape). */
export class RepaymentHistoryCredential extends CredentialResource {
  override get resourceKind(): MortgageResourceKind {
    return "repayment-history-credential";
  }
  get credentialSubject(): RepaymentHistorySubject {
    return new RepaymentHistorySubject(
      this.factory.namedNode(iri(this, CRED.credentialSubject)),
      this.dataset,
      this.factory,
    );
  }
}

export interface RepaymentHistoryCredentialInit
  extends CredentialEnvelopeInit,
    RepaymentHistoryClaimsInit {}

export function buildRepaymentHistoryCredential(
  init: RepaymentHistoryCredentialInit,
): RepaymentHistoryCredential {
  const credential = root(RepaymentHistoryCredential, init.iri);
  applyEnvelope(credential, init, MORT.RepaymentHistoryCredential);
  writeRepaymentHistoryClaims(credential.credentialSubject, init);
  return credential;
}

// ── Documents ────────────────────────────────────────────────────────────────────────────

/** `loans/<lender>/disclosure` (mshape:ClosedEndCreditDisclosureShape). */
export class ClosedEndCreditDisclosure extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "closed-end-disclosure";
  }
  get name(): string {
    return str(this, SCHEMA.name);
  }
  get loanNumber(): string {
    return str(this, MORT.loanNumber);
  }
  get borrowerIri(): string {
    return iri(this, FIBO.hasBorrower);
  }
  get creatorIri(): string {
    return iri(this, DCTERMS.creator);
  }
  get issued(): Date {
    return dateTime(this, DCTERMS.issued);
  }
  get amountFinancedUsd(): number {
    return usd(this, MORT.amountFinanced);
  }
  get financeChargeUsd(): number {
    return usd(this, MORT.financeCharge);
  }
  get totalOfPaymentsUsd(): number {
    return usd(this, MORT.totalOfPayments);
  }
  get annualPercentageRate(): number {
    return num(this, MORT.annualPercentageRate);
  }
  get numberOfPayments(): number {
    return num(this, SCHEMA_NUMBER_OF_LOAN_PAYMENTS);
  }
  get paymentAmountUsd(): number {
    return usd(this, SCHEMA_LOAN_PAYMENT_AMOUNT);
  }
  get paymentIntervalDays(): number {
    return num(this, MORT.paymentIntervalDays);
  }
  get description(): string | undefined {
    return optStr(this, SCHEMA.description);
  }
}

export interface ClosedEndCreditDisclosureInit {
  iri: string;
  name: string;
  loanNumber: string;
  borrower: string;
  creator: string;
  issued: Date;
  amountFinancedUsd: number;
  financeChargeUsd: number;
  totalOfPaymentsUsd: number;
  annualPercentageRate: number;
  numberOfPayments: number;
  paymentAmountUsd: number;
  paymentIntervalDays: number;
  description?: string;
}

export function buildClosedEndCreditDisclosure(
  init: ClosedEndCreditDisclosureInit,
): ClosedEndCreditDisclosure {
  assertIntegerIn("numberOfPayments", init.numberOfPayments, 1, 60);
  assertIntegerIn("paymentIntervalDays", init.paymentIntervalDays, 1, 31);
  if (!(init.annualPercentageRate >= 0 && init.annualPercentageRate <= 36)) {
    throw new RangeError("annualPercentageRate must be in 0..36");
  }
  const disclosure = root(ClosedEndCreditDisclosure, init.iri);
  disclosure.typeIris.add(MORT.ClosedEndCreditDisclosure);
  setStr(disclosure, SCHEMA.name, init.name);
  setStr(disclosure, MORT.loanNumber, init.loanNumber);
  setIri(disclosure, FIBO.hasBorrower, init.borrower);
  setIri(disclosure, DCTERMS.creator, init.creator);
  setDateTime(disclosure, DCTERMS.issued, init.issued);
  setUsd(disclosure, MORT.amountFinanced, init.amountFinancedUsd);
  setUsd(disclosure, MORT.financeCharge, init.financeChargeUsd);
  setUsd(disclosure, MORT.totalOfPayments, init.totalOfPaymentsUsd);
  setDecimal(disclosure, MORT.annualPercentageRate, init.annualPercentageRate);
  setInt(disclosure, SCHEMA_NUMBER_OF_LOAN_PAYMENTS, init.numberOfPayments);
  setUsd(disclosure, SCHEMA_LOAN_PAYMENT_AMOUNT, init.paymentAmountUsd);
  setInt(disclosure, MORT.paymentIntervalDays, init.paymentIntervalDays);
  setOptStr(disclosure, SCHEMA.description, init.description);
  return disclosure;
}

/** `loans/<creditor>/adverse-action` (mshape:AdverseActionNoticeShape). */
export class AdverseActionNotice extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "adverse-action-notice";
  }
  get name(): string {
    return str(this, SCHEMA.name);
  }
  get borrowerIri(): string {
    return iri(this, FIBO.hasBorrower);
  }
  get creatorIri(): string {
    return iri(this, DCTERMS.creator);
  }
  get issued(): Date {
    return dateTime(this, DCTERMS.issued);
  }
  get reasons(): Set<string> {
    return strSet(this, MORT.adverseActionReason);
  }
  get score(): ScoreDisclosure | undefined {
    return children(this, MORT.scoreDisclosure, ScoreDisclosure)[0];
  }
  /** The ECOA notice, in words. */
  get description(): string {
    return str(this, SCHEMA.description);
  }
}

export interface AdverseActionNoticeInit {
  iri: string;
  name: string;
  borrower: string;
  creator: string;
  issued: Date;
  reasons: readonly string[];
  score?: ScoreDisclosureInit;
  description: string;
}

export function buildAdverseActionNotice(init: AdverseActionNoticeInit): AdverseActionNotice {
  if (init.reasons.length < 1 || init.reasons.length > 4) {
    throw new RangeError("an adverse action notice gives one to four principal reasons");
  }
  const notice = root(AdverseActionNotice, init.iri);
  notice.typeIris.add(MORT.AdverseActionNotice);
  setStr(notice, SCHEMA.name, init.name);
  setIri(notice, FIBO.hasBorrower, init.borrower);
  setIri(notice, DCTERMS.creator, init.creator);
  setDateTime(notice, DCTERMS.issued, init.issued);
  for (const reason of init.reasons) notice.reasons.add(reason);
  if (init.score !== undefined) addScoreDisclosures(notice, [init.score]);
  setStr(notice, SCHEMA.description, init.description);
  return notice;
}

/** Value space of `mort:paymentRail`. */
export const PAYMENT_RAIL_IRIS = [MORT.PaymentRail_PushToCard] as const;

/** `banking/payout-instruction` (mshape:PayoutInstructionShape). */
export class PayoutInstruction extends MortgageResource {
  override get resourceKind(): MortgageResourceKind {
    return "payout-instruction";
  }
  get name(): string {
    return str(this, SCHEMA.name);
  }
  get creatorIri(): string {
    return iri(this, DCTERMS.creator);
  }
  get paymentRailIri(): string {
    return iri(this, MORT.paymentRail);
  }
  get cardIssuer(): string {
    return str(child(this, SCHEMA.provider, TypedNode), SCHEMA.name);
  }
  get accountLast4(): string {
    return str(this, MORT.accountLast4);
  }
  get amountUsd(): number {
    return usd(this, SCHEMA.amount);
  }
  get loanNumber(): string {
    return str(this, MORT.loanNumber);
  }
  get issued(): Date {
    return dateTime(this, DCTERMS.issued);
  }
}

export interface PayoutInstructionInit {
  iri: string;
  name: string;
  creator: string;
  cardIssuer: string;
  accountLast4: string;
  amountUsd: number;
  loanNumber: string;
  issued: Date;
}

export function buildPayoutInstruction(init: PayoutInstructionInit): PayoutInstruction {
  assertLast4(init.accountLast4);
  const instruction = root(PayoutInstruction, init.iri);
  instruction.typeIris.add(MORT.PayoutInstruction);
  setStr(instruction, SCHEMA.name, init.name);
  setIri(instruction, DCTERMS.creator, init.creator);
  setIri(instruction, MORT.paymentRail, MORT.PaymentRail_PushToCard);
  setOrganization(instruction, SCHEMA.provider, init.cardIssuer);
  setStr(instruction, MORT.accountLast4, init.accountLast4);
  setUsd(instruction, SCHEMA.amount, init.amountUsd);
  setStr(instruction, MORT.loanNumber, init.loanNumber);
  setDateTime(instruction, DCTERMS.issued, init.issued);
  return instruction;
}
