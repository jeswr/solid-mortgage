// AUTHORED-BY Claude Opus 5.5
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { validateTour } from "../../../packages/tour/src/schema.js";
import { DAY, OWNERS_AFTER, OWNERS_BEFORE, THRESHOLD_BPS } from "../../business-kyb/facts.js";
import { KYB_GRANT_CODES } from "../../business-kyb/grants.js";
import {
  BUSINESS_KYB_HOLDER,
  BUSINESS_KYB_REVOKE_CAVEAT,
  businessKybLens,
  businessKybTour,
  dayOfStep,
  isBusinessKybPage,
  KYB_COMPLIANCE,
} from "../../business-kyb/mount.js";
import { ACTION_TARGETS, CHAPTERS, TOUR } from "../../business-kyb/tour.js";

const here = dirname(fileURLToPath(import.meta.url));
const narration = readFileSync(join(here, "../../../video/business-kyb/narration.md"), "utf8");

describe("the business KYB tour", () => {
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

  test("chapters run in order; days are register, onboarding, credit, then the sale", () => {
    const order = TOUR.map((step) => CHAPTERS.indexOf(step.chapter as (typeof CHAPTERS)[number]));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(TOUR.map((s) => s.clock?.day)).toEqual([
      ...Array(4).fill(DAY.register),
      ...Array(2).fill(DAY.onboarding),
      ...Array(2).fill(DAY.credit),
      ...Array(4).fill(DAY.sale),
    ]);
    expect(dayOfStep("proof")).toBe(DAY.credit);
    expect(dayOfStep("nope")).toBeUndefined();
  });

  test("action targets are unique and never a POST in a done event", () => {
    expect(new Set(ACTION_TARGETS).size).toBe(ACTION_TARGETS.length);
    for (const step of TOUR) expect(step.done.event?.method).not.toBe("POST");
  });

  test("the proof step names what was not shared", () => {
    const proof = TOUR.find((step) => step.id === "proof");
    expect(proof?.lens.notShared?.length).toBeGreaterThan(0);
    expect(proof?.path).toBe("prove/kyb");
  });
});

describe("the story's facts", () => {
  test("two owners at 25% or more before the sale, two after; shares add up", () => {
    const total = (owners: typeof OWNERS_BEFORE) => owners.reduce((sum, o) => sum + o.bps, 0);
    expect(total(OWNERS_BEFORE)).toBe(10000);
    expect(total(OWNERS_AFTER)).toBe(10000);
    expect(OWNERS_BEFORE.filter((o) => o.bps >= THRESHOLD_BPS)).toHaveLength(2);
    expect(OWNERS_AFTER.filter((o) => o.bps >= THRESHOLD_BPS)).toHaveLength(2);
  });
});

describe("the mountDemo options", () => {
  test("one Lens handle per grant, the holder is Northwind", () => {
    const lens = businessKybLens();
    expect(Object.keys(lens.grants)).toEqual(
      KYB_GRANT_CODES.map((code) => `/policies/${code.toLowerCase()}`),
    );
    expect(lens.grants["/policies/k1"]?.until).toBe("1 year");
    expect(lens.grants["/policies/k2"]?.until).toBe("90 days");
    expect(lens.revokeCaveat).toBe(BUSINESS_KYB_REVOKE_CAVEAT);
    expect(lens.grantsHref).toBe("/wallet/kyb/sharing");
    expect(lens.ledgerHref).toBe("/wallet/kyb/ledger");
    expect(businessKybTour()).toMatchObject({ demo: "business-kyb", holder: "northwind" });
    expect(BUSINESS_KYB_HOLDER).toEqual({ id: "northwind", name: "Northwind" });
  });

  test("every obligation cites a rule and has evidence", () => {
    for (const item of KYB_COMPLIANCE) {
      expect(item.rule).toMatch(/^31 CFR 10[12]0\./);
      expect(item.evidence.length).toBeGreaterThan(0);
    }
  });

  test("tells business KYB pages from other demos' pages", () => {
    expect(isBusinessKybPage("/wallet/kyb", "wallet")).toBe(true);
    expect(isBusinessKybPage("/wallet/kyb/requests", "wallet")).toBe(true);
    expect(isBusinessKybPage("/wallet/prove/kyb", "wallet")).toBe(true);
    expect(isBusinessKybPage("/wallet/prove", "wallet")).toBe(false);
    expect(isBusinessKybPage("/wallet/kybx", "wallet")).toBe(false);
    expect(isBusinessKybPage("/wallet/moving", "wallet")).toBe(false);
    expect(isBusinessKybPage("/registry/", "registry")).toBe(true);
    expect(isBusinessKybPage("/business-lender/deal", "business-lender")).toBe(true);
    expect(isBusinessKybPage("/bank/kyb/due-diligence", "bank")).toBe(true);
    expect(isBusinessKybPage("/bank/", "bank")).toBe(false);
    expect(isBusinessKybPage("/lender/kyb", "lender")).toBe(false);
    expect(isBusinessKybPage("/wallet/", "wallet", "?tour=business-kyb")).toBe(true);
    expect(isBusinessKybPage("/wallet/kyb", "wallet", "?tour=mortgage")).toBe(false);
  });
});
