// AUTHORED-BY Claude Opus 5.5
import { readFileSync } from "node:fs";
import path from "node:path";
import { DataFactory, Parser, Store } from "n3";
import { describe, expect, test } from "vitest";
import { validate } from "../src/shacl.js";
import { MORT } from "../src/vocab/mort.js";
import {
  AdverseActionNotice,
  buildAdverseActionNotice,
  buildCashFlowCredential,
  buildClosedEndCreditDisclosure,
  buildPayoutInstruction,
  buildRepaymentHistoryCredential,
  CashFlowCredential,
  ClosedEndCreditDisclosure,
  PayoutInstruction,
  RepaymentHistoryCredential,
} from "../src/wrappers/lending.js";
import { resourceToTurtle, ShapeViolationError } from "../src/wrappers/serialize.js";

const POD = "https://maya.pod.example/";
const MAYA = `${POD}profile/card#me`;
const BANK = "https://bank.example/profile/card#me";
const FINCHLY = "https://fintech-lender.example/profile/card#me";

const ENVELOPE = {
  credentialStatus: "https://bank.example/status/1#7",
  credentialSubject: MAYA,
  issuer: BANK,
  validFrom: new Date("2026-11-02T10:00:00Z"),
  validUntil: new Date("2027-02-02T10:00:00Z"),
};

export const CASH_FLOW = {
  ...ENVELOPE,
  accountLast4: "3318",
  averageDailyBalanceUsd: 940,
  balanceUsd: 1210.4,
  bankName: "Alder Bank",
  cashFlowScoreValue: 720,
  depositStreams: [
    { monthlyAmountUsd: 2380, name: "Brightline Staffing payroll" },
    { monthlyAmountUsd: 480, name: "Weekend delivery platform payouts" },
  ],
  iri: `${POD}credentials/cash-flow`,
  nsf90Count: 0,
  observationMonths: 6,
};

const REPAYMENT = {
  ...ENVELOPE,
  credentialStatus: "https://fintech-lender.example/status/1#3",
  end: new Date("2026-11-30T00:00:00Z"),
  iri: `${POD}credentials/repayment-history`,
  issuer: FINCHLY,
  late: 0,
  loanNumber: "FL-2048",
  onTime: 2,
  scheduled: 4,
  servicedLoan: `${POD}loans/finchly/disclosure`,
  start: new Date("2026-11-02T00:00:00Z"),
};

const DISCLOSURE = {
  amountFinancedUsd: 2000,
  annualPercentageRate: 32.9,
  borrower: MAYA,
  creator: FINCHLY,
  description: "You are not required to complete this agreement merely because you received it.",
  financeChargeUsd: 64.28,
  iri: `${POD}loans/finchly/disclosure`,
  issued: new Date("2026-11-02T14:20:00Z"),
  loanNumber: "FL-2048",
  name: "Closed-end credit disclosure",
  numberOfPayments: 4,
  paymentAmountUsd: 516.07,
  paymentIntervalDays: 14,
  totalOfPaymentsUsd: 2064.28,
};

const NOTICE = {
  borrower: MAYA,
  creator: BANK,
  description:
    "The federal Equal Credit Opportunity Act prohibits creditors from discriminating against credit applicants.",
  iri: `${POD}loans/alder/adverse-action`,
  issued: new Date("2026-11-02T15:00:00Z"),
  name: "Notice of action taken: personal loan",
  reasons: ["Length of credit history", "Limited number of credit accounts"],
  score: {
    created: new Date("2026-11-02T00:00:00Z"),
    keyFactors: ["Length of time accounts have been established"],
    score: 612,
    scoreModel: MORT.ScoreModel_FICO8,
    source: "Quillon",
  },
};

const PAYOUT = {
  accountLast4: "3318",
  amountUsd: 2000,
  cardIssuer: "Alder Bank",
  creator: MAYA,
  iri: `${POD}banking/payout-instruction`,
  issued: new Date("2026-11-02T14:40:00Z"),
  loanNumber: "FL-2048",
  name: "Pay my loan to my debit card",
};

function parse(turtle: string, base: string): Store {
  return new Store(new Parser({ baseIRI: base, format: "text/turtle" }).parse(turtle));
}

const fixture = (name: string) =>
  readFileSync(path.join(import.meta.dirname, "fixtures", `${name}.ttl`), "utf8");

describe("cash-flow credential", () => {
  test("round-trips through the shape-checked serializer", async () => {
    const turtle = await resourceToTurtle(buildCashFlowCredential(CASH_FLOW));
    const read = new CashFlowCredential(CASH_FLOW.iri, parse(turtle, CASH_FLOW.iri), DataFactory);
    const subject = read.credentialSubject;
    expect(read.issuer).toBe(BANK);
    expect(subject.cashFlowScoreValue).toBe(720);
    expect(subject.nsf90Count).toBe(0);
    expect(subject.observationMonths).toBe(6);
    expect(subject.averageDailyBalanceUsd).toBe(940);
    expect(subject.scoreModelIri).toBe(MORT.ScoreModel_CashFlowV1);
    expect(subject.account.accountLast4).toBe("3318");
    expect(subject.depositStreams.map((stream) => stream.name).sort()).toEqual([
      "Brightline Staffing payroll",
      "Weekend delivery platform payouts",
    ]);
    expect(subject.depositStreams.reduce((sum, stream) => sum + stream.monthlyAmountUsd, 0)).toBe(
      2860,
    );
  });

  test("matches the committed conforming fixture", async () => {
    const report = await validate(parse(fixture("cash-flow-credential.valid"), CASH_FLOW.iri), {
      expect: "cash-flow-credential",
    });
    expect(report.conforms).toBe(true);
  });

  test.each([
    ["accountLast4", { accountLast4: "33" }],
    ["observationMonths", { observationMonths: 0 }],
    ["nsf90Count", { nsf90Count: 100 }],
    ["cashFlowScoreValue", { cashFlowScoreValue: 299 }],
    ["depositStreams", { depositStreams: [] }],
  ])("refuses a bad %s before building", (_label, patch) => {
    expect(() => buildCashFlowCredential({ ...CASH_FLOW, ...patch })).toThrow(RangeError);
  });
});

describe("repayment history credential", () => {
  test("round-trips", async () => {
    const turtle = await resourceToTurtle(buildRepaymentHistoryCredential(REPAYMENT));
    const read = new RepaymentHistoryCredential(
      REPAYMENT.iri,
      parse(turtle, REPAYMENT.iri),
      DataFactory,
    );
    const history = read.credentialSubject.paymentHistory;
    expect(history.onTime).toBe(2);
    expect(history.late).toBe(0);
    expect(history.scheduled).toBe(4);
    expect(history.servicedLoanIri).toBe(REPAYMENT.servicedLoan);
    expect(history.loanNumber).toBe("FL-2048");
    expect(history.end.toISOString().slice(0, 10)).toBe("2026-11-30");
  });

  test("refuses more payments than were scheduled", () => {
    expect(() => buildRepaymentHistoryCredential({ ...REPAYMENT, late: 1, onTime: 4 })).toThrow(
      /exceed/,
    );
  });

  test("the shape refuses a period that ends before it starts", async () => {
    const built = buildRepaymentHistoryCredential({
      ...REPAYMENT,
      end: new Date("2026-11-01T00:00:00Z"),
    });
    await expect(resourceToTurtle(built)).rejects.toBeInstanceOf(ShapeViolationError);
  });
});

describe("closed-end credit disclosure", () => {
  test("round-trips", async () => {
    const turtle = await resourceToTurtle(buildClosedEndCreditDisclosure(DISCLOSURE));
    const read = new ClosedEndCreditDisclosure(
      DISCLOSURE.iri,
      parse(turtle, DISCLOSURE.iri),
      DataFactory,
    );
    expect(read.annualPercentageRate).toBe(32.9);
    expect(read.amountFinancedUsd).toBe(2000);
    expect(read.financeChargeUsd).toBe(64.28);
    expect(read.totalOfPaymentsUsd).toBe(2064.28);
    expect(read.numberOfPayments).toBe(4);
    expect(read.paymentAmountUsd).toBe(516.07);
    expect(read.paymentIntervalDays).toBe(14);
    expect(read.borrowerIri).toBe(MAYA);
    expect(read.creatorIri).toBe(FINCHLY);
  });

  test("refuses an APR above 36%", () => {
    expect(() =>
      buildClosedEndCreditDisclosure({ ...DISCLOSURE, annualPercentageRate: 36.5 }),
    ).toThrow(RangeError);
  });
});

describe("adverse action notice", () => {
  test("round-trips with its reasons and the score used", async () => {
    const turtle = await resourceToTurtle(buildAdverseActionNotice(NOTICE));
    const read = new AdverseActionNotice(NOTICE.iri, parse(turtle, NOTICE.iri), DataFactory);
    expect([...read.reasons].sort()).toEqual([...NOTICE.reasons].sort());
    expect(read.score?.score).toBe(612);
    expect(read.creatorIri).toBe(BANK);
  });

  test("needs one to four reasons", () => {
    expect(() => buildAdverseActionNotice({ ...NOTICE, reasons: [] })).toThrow(RangeError);
    expect(() =>
      buildAdverseActionNotice({ ...NOTICE, reasons: ["a", "b", "c", "d", "e"] }),
    ).toThrow(RangeError);
  });
});

describe("payout instruction", () => {
  test("round-trips; the card is named by its last four digits only", async () => {
    const turtle = await resourceToTurtle(buildPayoutInstruction(PAYOUT));
    const read = new PayoutInstruction(PAYOUT.iri, parse(turtle, PAYOUT.iri), DataFactory);
    expect(read.paymentRailIri).toBe(MORT.PaymentRail_PushToCard);
    expect(read.accountLast4).toBe("3318");
    expect(read.cardIssuer).toBe("Alder Bank");
    expect(read.amountUsd).toBe(2000);
    expect(read.creatorIri).toBe(MAYA);
  });

  test("refuses a full card number", () => {
    expect(() => buildPayoutInstruction({ ...PAYOUT, accountLast4: "4111111111111111" })).toThrow(
      RangeError,
    );
  });
});

export const LENDING_FIXTURE_INPUTS = {
  "adverse-action-notice": () => buildAdverseActionNotice(NOTICE),
  "cash-flow-credential": () => buildCashFlowCredential(CASH_FLOW),
  "closed-end-disclosure": () => buildClosedEndCreditDisclosure(DISCLOSURE),
  "payout-instruction": () => buildPayoutInstruction(PAYOUT),
  "repayment-history-credential": () => buildRepaymentHistoryCredential(REPAYMENT),
};
