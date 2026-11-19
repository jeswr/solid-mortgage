// AUTHORED-BY Claude Opus 5.5
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { describe, expect, test } from "vitest";
import { validateTour } from "../../../packages/tour/src/schema.js";
import { DEMO_APPS } from "../../orgs.js";
import { DAY, LOAN } from "../../small-dollar-lending/facts.js";
import { LENDING_GRANT_CODES, LENDING_GRANTS } from "../../small-dollar-lending/grants.js";
import { decide } from "../../small-dollar-lending/journey.js";
import { lendingTotals } from "../../small-dollar-lending/ledger.js";
import {
  dayOfStep,
  isSmallDollarPage,
  SMALL_DOLLAR_HOLDER,
  SMALL_DOLLAR_PAGES,
  SMALL_DOLLAR_REVOKE_CAVEAT,
  smallDollarLens,
  smallDollarTour,
} from "../../small-dollar-lending/mount.js";
import { ACTION_TARGETS, CHAPTERS, TOUR } from "../../small-dollar-lending/tour.js";

const here = dirname(fileURLToPath(import.meta.url));
const narration = readFileSync(
  join(here, "../../../video/small-dollar-lending/narration.md"),
  "utf8",
);

describe("the small-dollar lending tour", () => {
  test("passes the tour engine's own validator (shape, editorial limits)", () => {
    expect(validateTour([...TOUR])).toHaveLength(12);
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

  test("chapters run in order; ten steps on the application day, two at payoff", () => {
    const order = TOUR.map((step) => CHAPTERS.indexOf(step.chapter as (typeof CHAPTERS)[number]));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(TOUR.map((s) => s.clock?.day)).toEqual([
      ...Array(10).fill(DAY.apply),
      DAY.payoff,
      DAY.payoff,
    ]);
    expect(dayOfStep("revoke")).toBe(DAY.payoff);
    expect(dayOfStep("nope")).toBeUndefined();
  });

  test("action targets are unique and never a POST in a done event", () => {
    expect(new Set(ACTION_TARGETS).size).toBe(ACTION_TARGETS.length);
    for (const step of TOUR) expect(step.done.event?.method).not.toBe("POST");
  });

  test("every step is on an app of this demo, and every app of the demo has a step", () => {
    const apps = new Set(TOUR.map((step) => step.app));
    expect([...apps].sort()).toEqual([...DEMO_APPS["small-dollar-lending"]].sort());
    for (const step of TOUR) {
      expect(isSmallDollarPage(`/${step.app}/${step.path}`, step.app as never), step.id).toBe(true);
    }
  });

  test("the headlines are flows.md section 4's", () => {
    expect(TOUR.map((s) => s.lens.headline)).toEqual([
      "An empty pod",
      "Verified once, strongly, and reusable",
      "Same issuer app as the mortgage, different person",
      "The bank's data, in Maya's hands",
      "Both views of Maya now sit side by side",
      "Two quotes. Neither lender holds anything about her",
      "A grant, with a consent record written before the first read",
      "Bureau only: declined. Bureau and cash flow: approved. The disclosure is Maya's to keep",
      "The decline arrives with its reasons, in the pod",
      "The payment rail saw the instruction and nothing else",
      "On-time payments become a credential that builds her file",
      "403. Paid off, access ended",
    ]);
  });
});

describe("the grants", () => {
  test("issuer slots write and never read; L1 lasts 30 days; L2 is one read", () => {
    for (const code of ["S1", "S2", "S3", "S4"] as const) {
      const modes = LENDING_GRANTS[code].permissions.flatMap((p) => [...p.modes]);
      expect(modes).not.toContain("Read");
    }
    expect(LENDING_GRANTS.L1.days).toBe(30);
    expect(LENDING_GRANTS.L1.to).toBe("fintech-lender");
    expect(LENDING_GRANTS.L2.oneTime).toBe(true);
    expect(LENDING_GRANTS.L2.permissions).toEqual([
      { modes: ["Read"], paths: ["banking/payout-instruction"] },
    ]);
    // Finchly never reads the credit summary: the score comes from Quillon, org to org.
    const finchlyReads = LENDING_GRANTS.L1.permissions
      .filter((p) => p.to === undefined && p.modes.includes("Read"))
      .flatMap((p) => [...p.paths]);
    expect(finchlyReads).not.toContain("credentials/credit-summary");
  });
});

describe("the two models", () => {
  const maya = { cashFlowScore: 720, income: 2860, returnedPayments: 0, score: 612 };
  test("bureau only declines Maya; bureau and cash flow approves her", () => {
    const outcome = decide(maya);
    expect(outcome.bureauOnly.approved).toBe(false);
    expect(outcome.withCashFlow.approved).toBe(true);
  });

  test.each([
    ["a returned payment", { returnedPayments: 1 }],
    ["a low cash-flow score", { cashFlowScore: 659 }],
    ["income under $2,200", { income: 2199 }],
  ])("the cash-flow model declines %s", (_label, patch) => {
    expect(decide({ ...maya, ...patch }).withCashFlow.approved).toBe(false);
  });

  test("a score at the cut-off passes the bureau-only model", () => {
    expect(decide({ ...maya, score: 640 }).bureauOnly.approved).toBe(true);
  });

  test("the loan figures are consistent", () => {
    expect(Math.round(LOAN.paymentAmountUsd * LOAN.numberOfPayments * 100) / 100).toBe(
      LOAN.totalOfPaymentsUsd,
    );
    expect(Math.round((LOAN.totalOfPaymentsUsd - LOAN.amountFinancedUsd) * 100) / 100).toBe(
      LOAN.financeChargeUsd,
    );
  });
});

describe("the mountDemo options", () => {
  test("one Lens handle per grant, with its end", () => {
    const lens = smallDollarLens();
    expect(Object.keys(lens.grants)).toEqual(
      LENDING_GRANT_CODES.map((code) => `/policies/${code.toLowerCase()}`),
    );
    expect(lens.grants["/policies/l2"]?.until).toBe("One read, then closed");
    expect(lens.revokeCaveat).toBe(SMALL_DOLLAR_REVOKE_CAVEAT);
    expect(lens.grantsHref).toBe("/wallet/lending/sharing");
    expect(lens.ledgerHref).toBe("/wallet/lending/ledger");
    expect(smallDollarTour()).toMatchObject({ demo: "small-dollar-lending", holder: "maya" });
    expect(SMALL_DOLLAR_HOLDER).toEqual({ id: "maya", name: "Maya" });
  });

  test("tells lending pages from the other demos' pages", () => {
    expect(isSmallDollarPage("/wallet/lending/prove", "wallet")).toBe(true);
    expect(isSmallDollarPage("/wallet/lending", "wallet")).toBe(true);
    expect(isSmallDollarPage("/wallet/lendingly", "wallet")).toBe(false);
    expect(isSmallDollarPage("/wallet/moving", "wallet")).toBe(false);
    expect(isSmallDollarPage("/fintech-lender/", "fintech-lender")).toBe(true);
    expect(isSmallDollarPage("/idv/check", "idv")).toBe(true);
    expect(isSmallDollarPage("/payout/status", "payout")).toBe(true);
    expect(isSmallDollarPage("/bank/", "bank")).toBe(false);
    expect(isSmallDollarPage("/bank/lending/loans", "bank")).toBe(true);
    expect(isSmallDollarPage("/lender/lending", "lender")).toBe(false);
    expect(isSmallDollarPage("/wallet/", "wallet", "?tour=small-dollar-lending")).toBe(true);
    expect(isSmallDollarPage("/wallet/lending", "wallet", "?tour=mortgage")).toBe(false);
    expect(Object.keys(SMALL_DOLLAR_PAGES).sort()).toEqual(
      [...DEMO_APPS["small-dollar-lending"]].sort(),
    );
  });
});

describe("the ledger totals", () => {
  let id = 0;
  const event = (
    org: string,
    pod: string,
    path: string,
    kind = "read",
    method = "GET",
    status = 200,
  ): LensEntry =>
    ({
      actor: { org, viaAgent: false, webid: `https://pods.test/pods/${org}/profile/card#me` },
      at: "2026-07-06T10:00:00.000Z",
      id: ++id,
      kind,
      method,
      path,
      pod,
      source: "pod",
      status,
    }) as LensEntry;

  test("count issuers, lenders and payment services from pod requests only", () => {
    const totals = lendingTotals([
      event("idv", "maya", "/credentials/identity", "write", "PUT", 201),
      event("payroll", "maya", "/credentials/employment-income", "write", "PUT", 201),
      event("payroll", "maya", "/credentials/employment-income-anchor", "write", "PUT", 201),
      event("maya", "maya", "/credentials/identity"),
      event("maya", "fintech-lender", "/inbox/prequalification-1", "write", "POST", 201),
      event("maya", "bank", "/inbox/prequalification-2", "write", "POST", 201),
      event("payout", "maya", "/banking/payout-instruction"),
      event("payout", "maya", "/banking/payout-instruction", "denied", "GET", 403),
      event("fintech-lender", "maya", "/credentials/cash-flow"),
      event("bureau", "alex", "/credentials/credit-summary", "write", "PUT", 201),
    ]);
    expect(totals).toMatchObject({
      credentials: 2,
      denied: 1,
      issuers: 2,
      lenders: 2,
      paymentServices: 1,
      reads: 2,
    });
    expect(totals.readers).toEqual({ "fintech-lender": 1, payout: 1 });
  });

  test("are zero for an empty log", () => {
    expect(lendingTotals([])).toMatchObject({ issuers: 0, lenders: 0, paymentServices: 0 });
  });
});
