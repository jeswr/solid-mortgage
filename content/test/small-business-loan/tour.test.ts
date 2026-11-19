// AUTHORED-BY Claude Opus 5.5
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { validateTour } from "../../../packages/tour/src/schema.js";
import { isBusinessKybPage } from "../../business-kyb/mount.js";
import {
  DAY,
  LOAN,
  LOAN_PAYMENT,
  monthlyPayment,
  QUARTER_DAYS,
} from "../../small-business-loan/facts.js";
import { LOAN_GRANT_CODES, LOAN_GRANTS } from "../../small-business-loan/grants.js";
import { loanTotals, ownerOfWebid } from "../../small-business-loan/ledger.js";
import {
  dayOfStep,
  isSmallBusinessLoanPage,
  LOAN_COMPLIANCE,
  SMALL_BUSINESS_LOAN_HOLDER,
  smallBusinessLoanLens,
  smallBusinessLoanTour,
} from "../../small-business-loan/mount.js";
import { ACTION_TARGETS, CHAPTERS, TOUR } from "../../small-business-loan/tour.js";

const here = dirname(fileURLToPath(import.meta.url));
const narration = readFileSync(
  join(here, "../../../video/small-business-loan/narration.md"),
  "utf8",
);

describe("the small business loan tour", () => {
  test("passes the tour engine's own validator (shape, editorial limits)", () => {
    expect(validateTour([...TOUR])).toHaveLength(9);
  });

  test("its step ids are the narration's, in the narration's order", () => {
    const declared = /^steps:\s*(.+)$/m
      .exec(narration)?.[1]
      ?.split(",")
      .map((s) => s.trim());
    expect(TOUR.map((step) => step.id)).toEqual(declared);
    const shown = [...narration.matchAll(/\[do: step ([a-z-]+)\]/g)].map((m) => m[1]);
    expect(shown).toEqual(declared);
  });

  test("the narration acts exactly on the steps that have an action", () => {
    const acted: string[] = [];
    let current = "";
    for (const line of narration.split("\n")) {
      const step = /\[do: step ([a-z-]+)\]/.exec(line)?.[1];
      if (step) current = step;
      if (/\[do: act\]/.test(line)) acted.push(current);
    }
    expect(acted).toEqual(TOUR.filter((s) => s.action).map((s) => s.id));
  });

  test("chapters run in order and the days never go back; the quarter is at least P3M", () => {
    const order = TOUR.map((step) => CHAPTERS.indexOf(step.chapter as (typeof CHAPTERS)[number]));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    const days = TOUR.map((s) => s.clock?.day ?? 0);
    expect(days).toEqual([...days].sort((a, b) => a - b));
    expect(DAY.quarter - DAY.decision).toBe(QUARTER_DAYS);
    expect(QUARTER_DAYS).toBeGreaterThanOrEqual(92);
    expect(DAY.quarter - DAY.apply).toBeGreaterThan(30); // S2 has expired by the quarter
    expect(dayOfStep("quarter")).toBe(DAY.quarter);
    expect(dayOfStep("nope")).toBeUndefined();
  });

  test("action targets are unique and never a POST in a done event", () => {
    expect(new Set(ACTION_TARGETS).size).toBe(ACTION_TARGETS.length);
    for (const step of TOUR) expect(step.done.event?.method).not.toBe("POST");
  });

  test("the tour centres on Northwind; the Lens names every S grant", () => {
    expect(smallBusinessLoanTour().holder).toBe(SMALL_BUSINESS_LOAN_HOLDER.id);
    expect(SMALL_BUSINESS_LOAN_HOLDER.id).toBe("northwind");
    const lens = smallBusinessLoanLens();
    expect(Object.values(lens.grants).map((g) => g.label)).toEqual([...LOAN_GRANT_CODES]);
    expect(lens.revokeCaveat).toContain("{org}");
    expect(LOAN_COMPLIANCE.length).toBeGreaterThan(2);
  });
});

describe("which pages belong to the demo", () => {
  test.each([
    ["/bank/business", "bank", "", true],
    ["/bank/business/", "bank", "", true],
    ["/bank/kyb", "bank", "", false],
    ["/state/revenue", "state", "", true],
    ["/state/", "state", "", false],
    ["/business-lender/loan/decision", "business-lender", "", true],
    ["/business-lender/deal", "business-lender", "", false],
    ["/wallet/loan/requests", "wallet", "", true],
    ["/wallet/kyb/requests", "wallet", "", false],
    ["/wallet/", "wallet", "?tour=small-business-loan", true],
    ["/bank/business", "bank", "?tour=business-kyb", false],
    ["/registry/", "registry", "", false],
  ] as const)("%s%s in %s", (path, app, search, expected) => {
    expect(isSmallBusinessLoanPage(path, app, search)).toBe(expected);
  });

  test("demo 3 claims every business-lender page, so apps check this demo first", () => {
    expect(isBusinessKybPage("/business-lender/loan", "business-lender")).toBe(true);
    expect(isSmallBusinessLoanPage("/business-lender/loan", "business-lender")).toBe(true);
    expect(
      isBusinessKybPage("/business-lender/loan", "business-lender", "?tour=small-business-loan"),
    ).toBe(false);
  });
});

describe("the loan's facts and grants", () => {
  test("the payment is the amortising payment to the cent", () => {
    expect(LOAN_PAYMENT).toBe(3059.44);
    expect(monthlyPayment(LOAN.principalUsd, 0, 60)).toBe(2500);
  });

  test("S1 writes one resource; S2 reads four for 30 days; S3 is quarterly until repaid", () => {
    expect(LOAN_GRANTS.S1.permissions).toEqual([
      { modes: ["Write"], paths: ["finance/cash-flow"] },
    ]);
    expect(LOAN_GRANTS.S2.permissions[0]?.paths).toHaveLength(4);
    expect(LOAN_GRANTS.S2.validDays).toBe(30);
    expect(LOAN_GRANTS.S3.interval).toBe("P3M");
    expect(LOAN_GRANTS.S3.validDays).toBeUndefined();
  });

  test("the ledger reads owners from WebIDs and ignores Northwind's own writes", () => {
    expect(ownerOfWebid("https://pods.demo.test/pods/state/profile/card#me")).toBe("state");
    expect(ownerOfWebid("https://example.test/other")).toBeUndefined();
    expect(
      loanTotals([
        {
          actor: { org: "northwind", viaAgent: false, webid: "" },
          at: "",
          id: 1,
          kind: "write",
          method: "PUT",
          path: "/finance/cash-flow",
          pod: "northwind",
          source: "pod",
          status: 201,
        },
      ]),
    ).toMatchObject({ decisions: 0, issuers: 0, lenders: 0 });
  });
});
