// AUTHORED-BY Claude Opus 5.5
import { DataFactory, Parser, Store } from "n3";
import { describe, expect, test } from "vitest";
import {
  BusinessLoanTerms,
  buildAccessRequest,
  buildBusinessLoanTerms,
  buildCashFlowAssessment,
  buildCashFlowRecord,
  CashFlowAssessment,
  CashFlowRecord,
  DPV,
  MORT,
  permissionInits,
  resourceToTurtle,
  TaxComplianceCredential,
  validate,
  writeTaxComplianceClaims,
} from "../src/index.js";
import { applyEnvelope } from "../src/wrappers/build.js";
import { AccessRequest } from "../src/wrappers/policies.js";

const POD = "https://pods.example/northwind/";
const SUBJECT = `${POD}profile/card#me`;
const BANK = "https://pods.example/bank/profile/card#me";
const LENDER = "https://pods.example/business-lender/profile/card#me";

const reparse = (turtle: string) => new Store(new Parser({ format: "text/turtle" }).parse(turtle));

const MONTHS = [
  {
    closingBalanceUsd: 48_250,
    debtServiceUsd: 4200,
    inflowUsd: 78_400,
    outflowUsd: 66_100,
    periodStart: new Date("2026-08-01T00:00:00Z"),
  },
  {
    closingBalanceUsd: 41_150.5,
    debtServiceUsd: 4200,
    inflowUsd: 72_000,
    outflowUsd: 64_900,
    periodStart: new Date("2026-07-01T00:00:00Z"),
  },
];

function taxCredential(): TaxComplianceCredential {
  const credential = new TaxComplianceCredential(
    DataFactory.namedNode(`${POD}credentials/tax-compliance`),
    new Store(),
    DataFactory,
  );
  applyEnvelope(
    credential,
    {
      credentialStatus: "https://pods.example/state/status/list#2",
      credentialSubject: SUBJECT,
      iri: credential.value,
      issuer: "https://pods.example/state/profile/card#me",
      validFrom: new Date("2026-09-20T09:00:00Z"),
      validUntil: new Date("2027-03-20T09:00:00Z"),
    },
    MORT.TaxComplianceCredential,
  );
  return credential;
}

// SHACL validation pays comunica's cold start on its first run (over 5 s on a loaded machine).
describe("tax compliance credential", { timeout: 60_000 }, () => {
  test("writes, validates and reads back the subject", async () => {
    const credential = taxCredential();
    writeTaxComplianceClaims(credential.credentialSubject, {
      entityName: "Northwind Logistics LLC",
      filingsCurrentThrough: new Date("2026-06-30T00:00:00Z"),
      status: "compliant",
      taxIdLast4: "4417",
      turnoverBand: "500k-1m",
    });
    const turtle = await resourceToTurtle(credential);
    const back = new TaxComplianceCredential(credential.value, reparse(turtle), DataFactory);
    const subject = back.credentialSubject;
    expect(subject.entityName).toBe("Northwind Logistics LLC");
    expect(subject.status).toBe("compliant");
    expect(subject.turnoverBand).toBe("500k-1m");
    expect(subject.taxIdLast4).toBe("4417");
    expect(subject.filingsCurrentThrough.toISOString().slice(0, 10)).toBe("2026-06-30");
  });

  test.each([
    [{ taxIdLast4: "44171" }, /four digits/],
    [{ taxIdLast4: "44a7" }, /four digits/],
    [{ entityName: "  " }, /entity name/],
    [{ status: "late" }, /unknown tax compliance status/],
    [{ turnoverBand: "huge" }, /unknown turnover band/],
    [{ turnoverBand: "toString" }, /unknown turnover band/],
    [{ filingsCurrentThrough: new Date("nope") }, /valid date/],
  ])("refuses %o", (override, message) => {
    const credential = taxCredential();
    expect(() =>
      writeTaxComplianceClaims(credential.credentialSubject, {
        entityName: "Northwind Logistics LLC",
        filingsCurrentThrough: new Date("2026-06-30T00:00:00Z"),
        status: "compliant",
        taxIdLast4: "4417",
        turnoverBand: "500k-1m",
        ...(override as object),
      }),
    ).toThrow(message);
  });
});

describe("cash flow record", { timeout: 60_000 }, () => {
  const init = {
    accountLast4: "2210",
    bank: BANK,
    holder: SUBJECT,
    iri: `${POD}finance/cash-flow`,
    issued: new Date("2026-09-19T10:00:00Z"),
    months: MONTHS,
    name: "Operating account cash flow",
  };

  test("round-trips with months oldest first", async () => {
    const turtle = await resourceToTurtle(buildCashFlowRecord(init));
    const back = new CashFlowRecord(init.iri, reparse(turtle), DataFactory);
    expect(back.holder).toBe(SUBJECT);
    expect(back.bank).toBe(BANK);
    expect(back.accountLast4).toBe("2210");
    expect(back.months.map((month) => month.periodStart.toISOString().slice(0, 7))).toEqual([
      "2026-07",
      "2026-08",
    ]);
    expect(back.months[0]?.closingBalanceUsd).toBe(41_150.5);
    expect(back.months[1]?.debtServiceUsd).toBe(4200);
  });

  test.each([
    [{ months: [] }, /between 1 and 36/],
    [{ months: new Array(37).fill(MONTHS[0]) }, /between 1 and 36/],
    [{ accountLast4: "22" }, /four digits/],
    [{ months: [MONTHS[0], MONTHS[0]] }, /appears twice/],
    [{ months: [{ ...MONTHS[0], periodStart: new Date("2026-08-02T00:00:00Z") }] }, /first day/],
    [{ months: [{ ...MONTHS[0], inflowUsd: -1 }] }, /inflowUsd/],
    [{ months: [{ ...MONTHS[0], outflowUsd: Number.NaN }] }, /outflowUsd/],
    [{ months: [{ ...MONTHS[0], debtServiceUsd: 70_000 }] }, /exceeds outflow/],
    [{ months: [{ ...MONTHS[0], closingBalanceUsd: Number.POSITIVE_INFINITY }] }, /closing/],
  ])("refuses %#", (override, message) => {
    expect(() => buildCashFlowRecord({ ...init, ...(override as object) })).toThrow(message);
  });

  test("an overdrawn month is allowed (a negative closing balance)", async () => {
    const record = buildCashFlowRecord({
      ...init,
      months: [{ ...MONTHS[0], closingBalanceUsd: -350 }],
    });
    const report = await validate(await resourceToTurtle(record), { expect: "cash-flow-record" });
    expect(report.conforms).toBe(true);
  });
});

describe("business loan terms", { timeout: 60_000 }, () => {
  const init = {
    borrower: SUBJECT,
    covenants: [
      { metric: "average-balance" as const, name: "Average balance", threshold: 40_000 },
      { metric: "dscr" as const, name: "Debt service coverage", threshold: 1.25 },
    ],
    interestRate: 8.25,
    iri: `${POD}loans/brackenridge/terms`,
    issued: new Date("2026-09-24T15:00:00Z"),
    lender: LENDER,
    loanNumber: "BRK-EQ-0417",
    monthlyPaymentUsd: 3059.41,
    name: "Equipment term loan",
    principalUsd: 150_000,
    termMonths: 60,
  };

  test("round-trips with coverage first", async () => {
    const turtle = await resourceToTurtle(buildBusinessLoanTerms(init));
    const back = new BusinessLoanTerms(init.iri, reparse(turtle), DataFactory);
    expect(back.principalUsd).toBe(150_000);
    expect(back.interestRate).toBe(8.25);
    expect(back.termMonths).toBe(60);
    expect(back.monthlyPaymentUsd).toBe(3059.41);
    expect(back.borrower).toBe(SUBJECT);
    expect(back.lender).toBe(LENDER);
    expect(back.covenants.map((covenant) => [covenant.metric, covenant.threshold])).toEqual([
      ["dscr", 1.25],
      ["average-balance", 40_000],
    ]);
  });

  test("refuses no covenants, an unknown metric and a fractional term", () => {
    expect(() => buildBusinessLoanTerms({ ...init, covenants: [] })).toThrow(/covenant/);
    expect(() =>
      buildBusinessLoanTerms({
        ...init,
        covenants: [{ metric: "ebitda" as never, name: "x", threshold: 1 }],
      }),
    ).toThrow(/unknown covenant metric/);
    expect(() => buildBusinessLoanTerms({ ...init, termMonths: 60.5 })).toThrow(/integer/);
  });

  test("a rate the shape refuses never serialises", async () => {
    await expect(
      resourceToTurtle(buildBusinessLoanTerms({ ...init, interestRate: 40 })),
    ).rejects.toThrow();
  });
});

describe("cash flow assessment", { timeout: 60_000 }, () => {
  test("round-trips sorted sources and the outcome", async () => {
    const iri = "https://pods.example/business-lender/credit/northwind/assessment";
    const turtle = await resourceToTurtle(
      buildCashFlowAssessment({
        averageBalanceUsd: 44_700.25,
        borrower: SUBJECT,
        checkedAt: new Date("2026-09-24T14:00:00Z"),
        covenantsMet: false,
        debtServiceCoverageRatio: 1.08,
        iri,
        lender: LENDER,
        name: "Covenant test",
        sources: [`${POD}finance/cash-flow`, `${POD}credentials/org-identity`],
      }),
    );
    const back = new CashFlowAssessment(iri, reparse(turtle), DataFactory);
    expect(back.sources).toEqual([`${POD}credentials/org-identity`, `${POD}finance/cash-flow`]);
    expect(back.debtServiceCoverageRatio).toBe(1.08);
    expect(back.averageBalanceUsd).toBe(44_700.25);
    expect(back.covenantsMet).toBe(false);
  });

  test("refuses an assessment with no sources", () => {
    expect(() =>
      buildCashFlowAssessment({
        averageBalanceUsd: 1,
        borrower: SUBJECT,
        checkedAt: new Date(),
        covenantsMet: true,
        debtServiceCoverageRatio: 1,
        iri: `${POD}x`,
        lender: LENDER,
        name: "x",
        sources: [],
      }),
    ).toThrow(/names what it read/);
  });
});

describe("a standing grant's ODRL timeInterval", { timeout: 60_000 }, () => {
  const init = {
    assignee: LENDER,
    assigner: SUBJECT,
    description: "Covenant monitoring",
    grantCode: "S3",
    iri: `${POD}inbox/request-s3`,
    issued: new Date("2026-09-24T15:00:00Z"),
    name: "Covenant monitoring",
    permissions: [
      {
        assignee: LENDER,
        end: { event: MORT.GrantEnd_LoanRepaid },
        interval: "P3M",
        modes: ["Read" as const],
        purpose: DPV.CreditChecking,
        targets: [`${POD}finance/cash-flow`],
      },
    ],
  };

  test("validates and reads back the interval and the loan-repaid end", async () => {
    const turtle = await resourceToTurtle(buildAccessRequest(init));
    expect(turtle).toContain("timeInterval");
    expect(turtle).toContain('"P3M"^^');
    const request = new AccessRequest(init.iri, reparse(turtle), DataFactory);
    expect(request.permissions[0]?.interval).toBe("P3M");
    expect(request.permissions[0]?.end).toEqual({ event: MORT.GrantEnd_LoanRepaid });
    expect(permissionInits(request)[0]?.interval).toBe("P3M");
  });

  test.each(["3M", "P", "PT3H", "P3W", "P-3M", "P3M "])("refuses the interval %j", (interval) => {
    expect(() =>
      buildAccessRequest({
        ...init,
        permissions: [{ ...init.permissions[0], interval } as (typeof init.permissions)[0]],
      }),
    ).toThrow(/xsd:duration/);
  });

  test("a permission without an interval reads back none", async () => {
    const plain = { ...init.permissions[0] } as Partial<(typeof init.permissions)[0]>;
    delete plain.interval;
    const turtle = await resourceToTurtle(
      buildAccessRequest({ ...init, permissions: [plain as (typeof init.permissions)[0]] }),
    );
    const request = new AccessRequest(init.iri, reparse(turtle), DataFactory);
    expect(request.permissions[0]?.interval).toBeUndefined();
    expect(permissionInits(request)[0]).not.toHaveProperty("interval");
  });
});
