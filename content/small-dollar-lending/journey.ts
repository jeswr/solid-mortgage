// AUTHORED-BY Claude Opus 5.5
/**
 * What each of the twelve steps of flows.md section 4 does to the pods, as plain functions over a
 * `World`. The pages call them (the wallet as Maya; Trueline, Ledgerly, Alder, Quillon, Finchly and
 * Swiftline as themselves); Finchly's back office reacts to the withdrawal through `agents.ts`; the
 * headless test runs them in order against the real wasm. Copy lives in `tour.ts`.
 *
 * Every step that writes is idempotent: run again, it finds its result in the pods and stops.
 */

import {
  buildAdverseActionNotice,
  buildClosedEndCreditDisclosure,
  buildDeliveredDocument,
  buildPayoutInstruction,
  CashFlowCredential,
  ClosedEndCreditDisclosure,
  DeliveredDocument,
  DPV,
  EmploymentIncomeCredential,
  MORT,
  PayoutInstruction,
} from "@mortgage/data-model";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import { DataFactory } from "n3";
import { membersOf } from "../mortgage/grants.js";
import { checkAtSource } from "../mortgage/issuers.js";
import { shareInOwnPod } from "../mortgage/messages.js";
import {
  at,
  dateOf,
  PodRequestError,
  podUrl,
  putResource,
  readDataset,
  statusOf,
  type World,
  webid,
} from "../mortgage/world.js";
import { inquireScore, send } from "./exchange.js";
import {
  CASH_FLOW,
  CREDIT,
  DAY,
  EMPLOYMENT,
  INCOME_STREAMS,
  LOAN,
  MAYA,
  PAYOUT,
  PERSON,
  POLICY,
  usd,
  VALID_DAYS,
} from "./facts.js";
import {
  askAndApprove,
  CREDENTIAL_PATHS,
  DOCUMENT_PATHS,
  endLendingGrant,
  isActive,
  type LendingGrantCode,
  lendingGrantRecords,
  mayaUrl,
  withdrawLendingGrant,
} from "./grants.js";
import { anchorField, issueToMaya } from "./issuers.js";
import { prepareSmallDollarLending } from "./prepare.js";
import {
  type LendingQuote,
  openChallenge,
  PREQUALIFYING_LENDERS,
  presentProofs,
  verifyQuote,
} from "./prequalification.js";

const maya = (world: World) => world.fetchAs(MAYA);
const has = async (world: World, owner: PodOwner, url: string) =>
  (await statusOf(world.fetchAs(owner), url)) === 200;

// --- Step 1 --------------------------------------------------------------------------------------

export interface VaultView {
  /** The drawers in Maya's pod. */
  readonly drawers: readonly string[];
  /** What `credentials/` holds. */
  readonly credentials: readonly string[];
}

/** Step 1. Maya opens her wallet: the pod and its drawers. Prepares the story the first time. */
export async function openVault(world: World): Promise<VaultView> {
  await prepareSmallDollarLending(world);
  const root = mayaUrl(world);
  const drawers = (await membersOf(maya(world), root)).map((url) => url.slice(root.length));
  const credentials = (await membersOf(maya(world), mayaUrl(world, "credentials/"))).map((url) =>
    url.slice(root.length),
  );
  return { credentials, drawers };
}

// --- Steps 2 to 5: the issuers -------------------------------------------------------------------

/** One issuer's slot is asked for and approved, then the credential (and its anchors) written. */
async function deliver(
  world: World,
  code: LendingGrantCode,
  path: string,
  times: readonly [string, string, string],
  issue: () => Promise<void>,
): Promise<boolean> {
  await askAndApprove(world, code, [times[0], times[1]]);
  if (await has(world, MAYA, mayaUrl(world, path))) return false;
  await issue();
  return true;
}

/** Step 2. Trueline Identity checks Maya once and writes an identity credential to her pod. */
export function verifyIdentity(world: World): Promise<boolean> {
  return deliver(world, "S1", CREDENTIAL_PATHS.identity, ["09:00", "09:02", "09:05"], async () => {
    await issueToMaya(world, {
      claims: {
        address: PERSON.address,
        birthDate: PERSON.birthDate,
        kind: "identity-credential",
        name: PERSON.name,
        taxIdLast4: PERSON.taxIdLast4,
      },
      issuer: "idv",
      kind: "identity-credential",
      path: CREDENTIAL_PATHS.identity,
      record: "maya-identity",
      time: "09:05",
      validDays: VALID_DAYS.identity,
    });
  });
}

/** Step 3. Ledgerly states Maya's income, and signs the anchor of its hidden value. */
export function shareIncome(world: World): Promise<boolean> {
  return deliver(world, "S2", CREDENTIAL_PATHS.income, ["09:20", "09:22", "09:25"], async () => {
    const credential = await issueToMaya(world, {
      claims: {
        employer: { name: EMPLOYMENT.employerName },
        jobTitle: EMPLOYMENT.jobTitle,
        kind: "employment-income-credential",
        monthlyGrossIncomeUsd: EMPLOYMENT.monthlyGrossIncomeUsd,
        startDate: EMPLOYMENT.startDate,
      },
      issuer: "payroll",
      kind: "employment-income-credential",
      path: CREDENTIAL_PATHS.income,
      record: "maya-employment-income",
      time: "09:25",
      validDays: VALID_DAYS.income,
    });
    await anchorField(
      world,
      "payroll",
      credential,
      MORT.monthlyGrossIncomeUsd,
      CREDENTIAL_PATHS.incomeAnchor,
      { record: "maya-employment-income-anchor", time: "09:25", validDays: VALID_DAYS.income },
    );
  });
}

/** Step 4. Alder Bank summarises Maya's account, and anchors the score and the returned payments. */
export function shareCashFlow(world: World): Promise<boolean> {
  return deliver(world, "S3", CREDENTIAL_PATHS.cashFlow, ["09:40", "09:42", "09:45"], async () => {
    const credential = await issueToMaya(world, {
      claims: {
        accountLast4: CASH_FLOW.accountLast4,
        averageDailyBalanceUsd: CASH_FLOW.averageDailyBalanceUsd,
        balanceUsd: CASH_FLOW.balanceUsd,
        bankName: CASH_FLOW.bankName,
        cashFlowScoreValue: CASH_FLOW.cashFlowScoreValue,
        depositStreams: INCOME_STREAMS.map((stream) => ({ ...stream })),
        kind: "cash-flow-credential",
        nsf90Count: CASH_FLOW.nsf90Count,
        observationMonths: CASH_FLOW.observationMonths,
      },
      issuer: "bank",
      kind: "cash-flow-credential",
      path: CREDENTIAL_PATHS.cashFlow,
      record: "maya-cash-flow",
      time: "09:45",
      validDays: VALID_DAYS.cashFlow,
    });
    const options = { time: "09:45", validDays: VALID_DAYS.cashFlow };
    await anchorField(
      world,
      "bank",
      credential,
      MORT.cashFlowScoreValue,
      CREDENTIAL_PATHS.cashFlowAnchor,
      { ...options, record: "maya-cash-flow-score-anchor" },
    );
    await anchorField(
      world,
      "bank",
      credential,
      MORT.nsf90Count,
      CREDENTIAL_PATHS.returnedPaymentsAnchor,
      { ...options, record: "maya-returned-payments-anchor" },
    );
  });
}

/** Step 5. Quillon adds its view: a score of 612 from a thin file. */
export function shareCreditSummary(world: World): Promise<boolean> {
  return deliver(
    world,
    "S4",
    CREDENTIAL_PATHS.creditSummary,
    ["10:00", "10:02", "10:05"],
    async () => {
      await issueToMaya(world, {
        claims: {
          creditScoreValue: CREDIT.creditScoreValue,
          kind: "credit-score-credential",
          totalMonthlyDebtUsd: CREDIT.totalMonthlyDebtUsd,
        },
        issuer: "bureau",
        kind: "credit-score-credential",
        path: CREDENTIAL_PATHS.creditSummary,
        record: "maya-credit-summary",
        time: "10:05",
        validDays: VALID_DAYS.credit,
      });
    },
  );
}

// --- Step 6 --------------------------------------------------------------------------------------

/**
 * Step 6. Both lenders open a challenge; Maya's wallet proves each lender's thresholds; each lender
 * checks the proofs and keeps a quote in its own pod. Alder's model includes a credit check, so its
 * pre-qualification also carries grant A1 (Quillon may read Maya's authorisation for Alder; Alder
 * may deliver its decision into `loans/alder/`). Returns the two quotes.
 */
export async function proveToTwoLenders(world: World): Promise<LendingQuote[]> {
  const quotes: LendingQuote[] = [];
  for (const [index, lender] of PREQUALIFYING_LENDERS.entries()) {
    await openChallenge(world, lender);
    const presentation = await presentProofs(world, lender);
    const quote = await verifyQuote(world, lender, presentation, index === 0 ? "10:20" : "10:22");
    if (!quote.qualified) throw new Error(`${lender}: ${quote.errors.join("; ")}`);
    quotes.push(quote);
  }
  await askAndApprove(world, "A1", ["10:23", "10:24"]);
  return quotes;
}

// --- Step 7 --------------------------------------------------------------------------------------

/**
 * Step 7. Maya applies to Finchly: Finchly asks for grant L1, Maya approves it in her wallet. The
 * agreement, the consent record and the credit-check authorisation are written before the ACL
 * change that lets Finchly read anything.
 */
export async function applyToFinchly(world: World): Promise<boolean> {
  return (await askAndApprove(world, "L1", ["10:40", "10:42"])) !== undefined;
}

// --- Step 8 --------------------------------------------------------------------------------------

export interface ModelOutcome {
  readonly approved: boolean;
  /** The inputs the model used, as shown on the decision screen. */
  readonly inputs: readonly { label: string; value: string }[];
}

export interface FinchlyDecision {
  /** The bureau score alone, against the 640 cut-off. */
  readonly bureauOnly: ModelOutcome;
  /** The score with income and cash flow. */
  readonly withCashFlow: ModelOutcome;
  /** Finchly's own record of the decision. */
  readonly record: string;
}

const decisionUrl = (world: Pick<World, "podOrigin">) =>
  podUrl(world, "fintech-lender", "loans/fl-2048-decision");

/** The two models, as plain rules over the values Finchly read. */
export function decide(input: {
  score: number;
  income: number;
  cashFlowScore: number;
  returnedPayments: number;
}): { bureauOnly: ModelOutcome; withCashFlow: ModelOutcome } {
  const bureauOnly = input.score >= POLICY.bureauMinimumScore;
  const withCashFlow =
    input.income >= POLICY.minimumMonthlyIncomeUsd &&
    input.cashFlowScore >= POLICY.minimumCashFlowScore &&
    input.returnedPayments <= POLICY.maximumReturnedPayments;
  return {
    bureauOnly: {
      approved: bureauOnly,
      inputs: [
        { label: "Credit score (FICO 8)", value: String(input.score) },
        { label: "Cut-off", value: String(POLICY.bureauMinimumScore) },
      ],
    },
    withCashFlow: {
      approved: withCashFlow,
      inputs: [
        { label: "Credit score (FICO 8)", value: String(input.score) },
        { label: "Monthly income", value: usd(input.income) },
        { label: "Cash-flow score", value: String(input.cashFlowScore) },
        { label: "Returned payments, 90 days", value: String(input.returnedPayments) },
      ],
    },
  };
}

/**
 * Step 8, when Finchly's decision screen opens: Finchly checks the three credentials at source
 * (it reads them under L1), asks Quillon for the score, and runs both models. Finchly keeps the
 * outcome in its own pod. Without L1 the pod refuses the first read, and the refusal is thrown.
 */
export async function finchlyDecides(world: World): Promise<FinchlyDecision> {
  const fetcher = world.fetchAs("fintech-lender");
  const checks = [
    { issuer: "idv", kind: "identity-credential", path: CREDENTIAL_PATHS.identity },
    { issuer: "payroll", kind: "employment-income-credential", path: CREDENTIAL_PATHS.income },
    { issuer: "bank", kind: "cash-flow-credential", path: CREDENTIAL_PATHS.cashFlow },
  ] as const;
  for (const check of checks) {
    const outcome = await checkAtSource(
      world,
      "fintech-lender",
      mayaUrl(world, check.path),
      check.kind,
      [check.issuer],
      "11:00",
    );
    if (!outcome.result.verified) {
      throw new Error(
        `${check.path} failed its check at source: ${outcome.result.errors.map((e) => e.code).join(", ")}`,
      );
    }
  }
  const income = new EmploymentIncomeCredential(
    mayaUrl(world, CREDENTIAL_PATHS.income),
    await readDataset(fetcher, mayaUrl(world, CREDENTIAL_PATHS.income)),
    DataFactory,
  ).credentialSubject.monthlyGrossIncomeUsd;
  const cashFlow = new CashFlowCredential(
    mayaUrl(world, CREDENTIAL_PATHS.cashFlow),
    await readDataset(fetcher, mayaUrl(world, CREDENTIAL_PATHS.cashFlow)),
    DataFactory,
  ).credentialSubject;
  const report = await inquireScore(world, "fintech-lender", ["11:02", "11:03"]);
  const score = report.scores[0]?.score;
  if (score === undefined) throw new Error("Quillon's report holds no score");
  const models = decide({
    cashFlowScore: cashFlow.cashFlowScoreValue,
    income,
    returnedPayments: cashFlow.nsf90Count,
    score,
  });
  const record = await putResource(
    fetcher,
    buildDeliveredDocument({
      creator: webid(world, "fintech-lender"),
      description: `Bureau only: ${models.bureauOnly.approved ? "approved" : "declined"} (score ${score}, cut-off ${POLICY.bureauMinimumScore}). Bureau and cash flow: ${models.withCashFlow.approved ? "approved" : "declined"} (income ${usd(income)}, cash-flow score ${cashFlow.cashFlowScoreValue}, ${cashFlow.nsf90Count} returned payments in 90 days).`,
      identifier: LOAN.loanNumber,
      iri: decisionUrl(world),
      issued: at(world, "11:04"),
      loanNumber: LOAN.loanNumber,
      name: "Credit decision",
    }),
  );
  return { ...models, record };
}

/** Step 8, "Accept": Finchly writes the closed-end credit disclosure into Maya's pod (Reg Z). */
export async function acceptLoan(world: World): Promise<string> {
  const url = mayaUrl(world, DOCUMENT_PATHS.disclosure);
  const fetcher = world.fetchAs("fintech-lender");
  if ((await statusOf(fetcher, url)) === 200) return url;
  if (!(await has(world, "fintech-lender", decisionUrl(world)))) {
    throw new Error("Finchly has not decided yet");
  }
  return putResource(
    fetcher,
    buildClosedEndCreditDisclosure({
      amountFinancedUsd: LOAN.amountFinancedUsd,
      annualPercentageRate: LOAN.annualPercentageRate,
      borrower: webid(world, MAYA),
      creator: webid(world, "fintech-lender"),
      description:
        "Truth in Lending disclosure. You are not required to complete this agreement merely because you have received these disclosures. Late payment: none charged in this demonstration.",
      financeChargeUsd: LOAN.financeChargeUsd,
      iri: url,
      issued: at(world, "11:10"),
      loanNumber: LOAN.loanNumber,
      name: "Closed-end credit disclosure",
      numberOfPayments: LOAN.numberOfPayments,
      paymentAmountUsd: LOAN.paymentAmountUsd,
      paymentIntervalDays: LOAN.paymentIntervalDays,
      totalOfPaymentsUsd: LOAN.totalOfPaymentsUsd,
    }),
  );
}

/** Maya reads the disclosure in her own pod. */
export async function readDisclosure(world: World): Promise<ClosedEndCreditDisclosure | undefined> {
  const url = mayaUrl(world, DOCUMENT_PATHS.disclosure);
  if (!(await has(world, MAYA, url))) return undefined;
  return new ClosedEndCreditDisclosure(url, await readDataset(maya(world), url), DataFactory);
}

// --- Step 9 --------------------------------------------------------------------------------------

export const ADVERSE_ACTION_REASONS = Object.freeze([
  "Length of credit history",
  "Limited number of credit accounts",
]);

const alderDecisionUrl = (world: Pick<World, "podOrigin">) =>
  podUrl(world, "bank", "decisions/maya");

/**
 * Step 9, when Alder's Personal loans page opens: Alder's model checks the credit file only. It
 * asks Quillon for the score under Maya's authorisation, declines below 640, and delivers a notice
 * of adverse action with its reasons and the score it used into `loans/alder/` (grant A1). Returns
 * the notice's URL, or `undefined` when the model approves.
 */
export async function alderDecides(world: World): Promise<string | undefined> {
  const notice = mayaUrl(world, DOCUMENT_PATHS.adverseAction);
  const fetcher = world.fetchAs("bank");
  if (await has(world, "bank", alderDecisionUrl(world))) {
    const record = new DeliveredDocument(
      alderDecisionUrl(world),
      await readDataset(fetcher, alderDecisionUrl(world)),
      DataFactory,
    );
    return record.description.startsWith("Declined") ? notice : undefined;
  }
  const report = await inquireScore(world, "bank", ["11:20", "11:21"]);
  const score = report.scores[0];
  if (score === undefined) throw new Error("Quillon's report holds no score");
  const approved = score.score >= POLICY.bureauMinimumScore;
  if (!approved) {
    await putResource(
      fetcher,
      buildAdverseActionNotice({
        borrower: webid(world, MAYA),
        creator: webid(world, "bank"),
        description:
          "The federal Equal Credit Opportunity Act prohibits creditors from discriminating against credit applicants. You have the right to a free copy of your credit report from Quillon within 60 days, and to dispute anything in it.",
        iri: notice,
        issued: at(world, "11:22"),
        name: "Notice of action taken: personal loan",
        reasons: [...ADVERSE_ACTION_REASONS],
        score: {
          created: score.created,
          keyFactors: [...score.keyFactors],
          score: score.score,
          scoreModel: MORT.ScoreModel_FICO8,
          source: "Quillon",
        },
      }),
    );
  }
  await putResource(
    fetcher,
    buildDeliveredDocument({
      creator: webid(world, "bank"),
      description: `${approved ? "Approved" : "Declined"}: bureau score ${score.score}, cut-off ${POLICY.bureauMinimumScore}. The cash-flow summary is not part of this model.`,
      iri: alderDecisionUrl(world),
      issued: at(world, "11:22"),
      loanNumber: LOAN.loanNumber,
      name: "Personal loan decision",
    }),
  );
  return approved ? undefined : notice;
}

// --- Step 10 -------------------------------------------------------------------------------------

const receiptUrl = (world: Pick<World, "podOrigin">) => podUrl(world, "payout", "payouts/fl-2048");

export interface PayoutOutcome {
  readonly instruction: string;
  readonly receipt: string;
  readonly confirmation?: string;
}

/**
 * Step 10, "Authorise the payout": Maya's wallet writes the payout instruction and gives Swiftline
 * the one-time grant L2; Swiftline reads the instruction once (the runtime closes the grant after
 * that read), pays the card, keeps its receipt and confirms to Finchly. Maya's wallet then records
 * the grant as used.
 */
export async function authorisePayout(world: World): Promise<PayoutOutcome> {
  const instruction = mayaUrl(world, DOCUMENT_PATHS.payoutInstruction);
  if (await has(world, "payout", receiptUrl(world))) {
    return { instruction, receipt: receiptUrl(world) };
  }
  if (!(await has(world, MAYA, instruction))) {
    await putResource(
      maya(world),
      buildPayoutInstruction({
        accountLast4: PAYOUT.accountLast4,
        amountUsd: LOAN.amountFinancedUsd,
        cardIssuer: PAYOUT.cardIssuer,
        creator: webid(world, MAYA),
        iri: instruction,
        issued: at(world, "11:40"),
        loanNumber: LOAN.loanNumber,
        name: "Pay my loan to my debit card",
      }),
    );
  }
  await askAndApprove(world, "L2", ["11:41", "11:42"]);
  return swiftlinePays(world);
}

/** Swiftline's half: one read of the instruction, the payment, the receipt and the confirmation. */
export async function swiftlinePays(world: World): Promise<PayoutOutcome> {
  const fetcher = world.fetchAs("payout");
  const instruction = mayaUrl(world, DOCUMENT_PATHS.payoutInstruction);
  const read = new PayoutInstruction(
    instruction,
    await readDataset(fetcher, instruction),
    DataFactory,
  );
  const receipt = await putResource(
    fetcher,
    buildDeliveredDocument({
      about: instruction,
      creator: webid(world, "payout"),
      description: `Paid ${usd(read.amountUsd)} by push to card to the ${read.cardIssuer} card ending ${read.accountLast4}. Swiftline read one record, once: the payout instruction.`,
      identifier: read.loanNumber,
      iri: receiptUrl(world),
      issued: at(world, "11:45"),
      loanNumber: read.loanNumber,
      name: "Payout receipt",
    }),
  );
  await shareInOwnPod(world, "payout", "payouts/fl-2048", ["fintech-lender"]);
  const confirmation = await send(world, {
    from: "payout",
    kind: MORT.MessageKind_PayoutConfirmation,
    objects: [receipt],
    summary: `Loan ${LOAN.loanNumber}: ${usd(read.amountUsd)} paid out to the card ending ${read.accountLast4}`,
    time: "11:46",
    to: "fintech-lender",
  });
  if (await isActive(world, "L2")) {
    // The runtime already removed Swiftline's rule after its read; the wallet records the end.
    await endLendingGrant(world, "L2", DPV.ConsentExpired, "used", "11:47", false);
  }
  return { confirmation, instruction, receipt };
}

/** Swiftline tries the instruction again: the one-time grant is closed, so the pod refuses. */
export function swiftlineReadsAgain(world: World): Promise<number> {
  return statusOf(world.fetchAs("payout"), mayaUrl(world, DOCUMENT_PATHS.payoutInstruction));
}

/** Swiftline's receipt, as it keeps it (undefined before step 10). */
export async function readPayoutReceipt(world: World): Promise<DeliveredDocument | undefined> {
  if (!(await has(world, "payout", receiptUrl(world)))) return undefined;
  return new DeliveredDocument(
    receiptUrl(world),
    await readDataset(world.fetchAs("payout"), receiptUrl(world)),
    DataFactory,
  );
}

// --- Step 11 -------------------------------------------------------------------------------------

const furnishingUrl = (world: Pick<World, "podOrigin">) =>
  podUrl(world, "fintech-lender", "loans/fl-2048-furnishing");

/** The two scheduled payments, on the days they were made. */
export const PAYMENTS = Object.freeze([
  { amountUsd: LOAN.paymentAmountUsd, day: DAY.firstPayment },
  { amountUsd: LOAN.paymentAmountUsd, day: DAY.payoff },
]);

/**
 * Step 11, "Make the payments": both payments are made on time. Finchly furnishes the history to
 * Quillon, then writes a repayment history credential into Maya's pod (under L1) and keeps its
 * pointer.
 */
export async function makePayments(world: World): Promise<boolean> {
  if (await has(world, MAYA, mayaUrl(world, CREDENTIAL_PATHS.repayment))) return false;
  const start = dateOf(world, DAY.apply);
  const end = dateOf(world, DAY.payoff);
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const lender = world.fetchAs("fintech-lender");
  const furnishing = await putResource(
    lender,
    buildDeliveredDocument({
      creator: webid(world, "fintech-lender"),
      description: `Repayment history for loan ${LOAN.loanNumber}: ${PAYMENTS.length} of ${LOAN.numberOfPayments} scheduled payments made on time, none late. Paid in full on ${world.calendar.date(DAY.payoff)}.`,
      identifier: LOAN.loanNumber,
      iri: furnishingUrl(world),
      issued: at(world, "09:06"),
      loanNumber: LOAN.loanNumber,
      name: "Repayment furnishing",
    }),
  );
  await shareInOwnPod(world, "fintech-lender", "loans/fl-2048-furnishing", ["bureau"]);
  await send(world, {
    from: "fintech-lender",
    kind: MORT.MessageKind_RepaymentFurnishing,
    objects: [furnishing],
    summary: `Loan ${LOAN.loanNumber} paid in full, every payment on time: reported to Quillon`,
    time: "09:07",
    to: "bureau",
  });
  // The credential is written last: its issuance record ends the step.
  await issueToMaya(world, {
    claims: {
      end: iso(end),
      kind: "repayment-history-credential",
      late: 0,
      loanNumber: LOAN.loanNumber,
      onTime: PAYMENTS.length,
      scheduled: LOAN.numberOfPayments,
      servicedLoan: mayaUrl(world, DOCUMENT_PATHS.disclosure),
      start: iso(start),
    },
    issuer: "fintech-lender",
    kind: "repayment-history-credential",
    path: CREDENTIAL_PATHS.repayment,
    record: "maya-repayment-history",
    time: "09:10",
    validDays: VALID_DAYS.repayment,
  });
  return true;
}

// --- Step 12 -------------------------------------------------------------------------------------

/** Step 12. Maya withdraws Finchly's grant; Finchly's inbox gets the withdrawal. */
export async function withdrawFinchly(world: World): Promise<string[]> {
  if (!(await isActive(world, "L1"))) return [];
  return (await withdrawLendingGrant(world, "L1", "16:00")).acls;
}

const accessEndedUrl = (world: Pick<World, "podOrigin">) =>
  podUrl(world, "fintech-lender", "loans/fl-2048-access-ended");

/**
 * Finchly asks for Maya's cash-flow summary again (its servicing file would refresh it). Returns
 * the status. After the withdrawal the pod refuses (403), and Finchly notes that its access ended;
 * its own loan records stay.
 */
export async function finchlyReadsAgain(world: World, time = "16:05"): Promise<number> {
  const status = await statusOf(
    world.fetchAs("fintech-lender"),
    mayaUrl(world, CREDENTIAL_PATHS.cashFlow),
  );
  if (status === 403 && !(await has(world, "fintech-lender", accessEndedUrl(world)))) {
    await putResource(
      world.fetchAs("fintech-lender"),
      buildDeliveredDocument({
        creator: webid(world, "fintech-lender"),
        description:
          "Maya withdrew grant L1. Her pod refused our read of her cash-flow summary (403). We keep the loan records the law requires; we no longer read anything in her pod.",
        identifier: LOAN.loanNumber,
        iri: accessEndedUrl(world),
        issued: at(world, time),
        loanNumber: LOAN.loanNumber,
        name: "Access ended",
      }),
    );
  }
  return status;
}

// --- Reads for the pages ---------------------------------------------------------------------------

/** What Maya's wallet shows of one credential: its issuer and what it says, read from her pod. */
export interface CredentialCard {
  readonly path: string;
  readonly issuer: string;
  readonly lines: readonly string[];
}

/** The credentials in Maya's pod, read by Maya (anchors left out: they say nothing readable). */
export async function readCredentials(world: World): Promise<CredentialCard[]> {
  const fetcher = maya(world);
  const cards: CredentialCard[] = [];
  const read = async (path: string) => readDataset(fetcher, mayaUrl(world, path));
  if (await has(world, MAYA, mayaUrl(world, CREDENTIAL_PATHS.identity))) {
    await read(CREDENTIAL_PATHS.identity);
    cards.push({
      issuer: "idv",
      lines: [PERSON.name, `Born ${PERSON.birthDate}`, `Tax id ending ${PERSON.taxIdLast4}`],
      path: CREDENTIAL_PATHS.identity,
    });
  }
  if (await has(world, MAYA, mayaUrl(world, CREDENTIAL_PATHS.income))) {
    const income = new EmploymentIncomeCredential(
      mayaUrl(world, CREDENTIAL_PATHS.income),
      await read(CREDENTIAL_PATHS.income),
      DataFactory,
    ).credentialSubject;
    cards.push({
      issuer: "payroll",
      lines: [
        `${usd(income.monthlyGrossIncomeUsd)} a month, two income streams`,
        ...INCOME_STREAMS.map((stream) => `${stream.name}: ${usd(stream.monthlyAmountUsd)}`),
      ],
      path: CREDENTIAL_PATHS.income,
    });
  }
  if (await has(world, MAYA, mayaUrl(world, CREDENTIAL_PATHS.cashFlow))) {
    const subject = new CashFlowCredential(
      mayaUrl(world, CREDENTIAL_PATHS.cashFlow),
      await read(CREDENTIAL_PATHS.cashFlow),
      DataFactory,
    ).credentialSubject;
    cards.push({
      issuer: "bank",
      lines: [
        `Cash-flow score ${subject.cashFlowScoreValue}`,
        `${subject.nsf90Count} returned payments in 90 days`,
        `Average daily balance ${usd(subject.averageDailyBalanceUsd)} over ${subject.observationMonths} months`,
      ],
      path: CREDENTIAL_PATHS.cashFlow,
    });
  }
  if (await has(world, MAYA, mayaUrl(world, CREDENTIAL_PATHS.creditSummary))) {
    await read(CREDENTIAL_PATHS.creditSummary);
    cards.push({
      issuer: "bureau",
      lines: [
        `Credit score ${CREDIT.creditScoreValue} (FICO 8)`,
        `Thin file: ${CREDIT.tradeLines} accounts`,
      ],
      path: CREDENTIAL_PATHS.creditSummary,
    });
  }
  if (await has(world, MAYA, mayaUrl(world, CREDENTIAL_PATHS.repayment))) {
    await read(CREDENTIAL_PATHS.repayment);
    cards.push({
      issuer: "fintech-lender",
      lines: [
        `Loan ${LOAN.loanNumber}: ${PAYMENTS.length} of ${LOAN.numberOfPayments} payments on time`,
        "Paid in full",
      ],
      path: CREDENTIAL_PATHS.repayment,
    });
  }
  return cards;
}

/** The grants on Maya's record, with their states, for the sharing screen and the ledger. */
export async function readGrants(
  world: World,
): Promise<{ code: string; state: string; to: string }[]> {
  return (await lendingGrantRecords(world)).map((record) => ({
    code: record.code,
    state: record.state,
    to: record.agreement.assigneeIri,
  }));
}

export { PodRequestError };
