// AUTHORED-BY Claude Fable 5.2
import {
  addDays,
  businessDaysBetween,
  createDemoCalendar,
  earliestConsummationAfterClosingDisclosure,
  earliestConsummationAfterLoanEstimate,
  loanEstimateDeadline,
} from "@mortgage/demo-kit/calendar";
import { TOUR_STEP_LIMITS } from "@mortgage/demo-kit/contracts";
import { ORG_SLUGS } from "@mortgage/demo-kit/registry";
import { describe, expect, test } from "vitest";
import { DAY } from "../../mortgage/facts.js";
import { JOURNEY } from "../../mortgage/journey.js";
import { CHAPTERS, SOURCE_IDS, TOUR } from "../../mortgage/tour.js";

const words = (text: string) => text.trim().split(/\s+/).length;

describe("tour content", () => {
  test("there are 24 steps with unique ids, in chapter order", () => {
    expect(TOUR).toHaveLength(24);
    expect(new Set(TOUR.map((step) => step.id)).size).toBe(24);
    const order = TOUR.map((step) => CHAPTERS.indexOf(step.chapter as (typeof CHAPTERS)[number]));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  test.each(TOUR.map((step) => [step.id, step] as const))(
    "%s keeps the editorial limits",
    (_, step) => {
      expect(words(step.title)).toBeLessThanOrEqual(TOUR_STEP_LIMITS.titleWords);
      expect(words(step.body)).toBeLessThanOrEqual(TOUR_STEP_LIMITS.bodyWords);
      expect(step.lens.headline.length).toBeGreaterThan(0);
      expect(step.lens.chips.length).toBeGreaterThan(0);
      expect(step.realWorld.stage.length).toBeGreaterThan(0);
      expect(step.expect.length).toBeGreaterThan(0);
      expect(step.clock?.day).toBeGreaterThanOrEqual(1);
      expect(step.app === "welcome" || (ORG_SLUGS as readonly string[]).includes(step.app)).toBe(
        true,
      );
      expect(step.path.startsWith("/")).toBe(true);
      // An interactive step has a button; a summary step finishes when its panel is on screen.
      if (step.mode === "interactive") expect(step.action).toBeDefined();
      else expect(step.done.target).toBeDefined();
      for (const text of [step.title, step.body, step.lens.headline, step.realWorld.rule ?? ""]) {
        expect(text).not.toMatch(/—|\betc\b|\be\.g\.|\bi\.e\./);
      }
    },
  );

  test("every cited source is in the design's list", () => {
    for (const step of TOUR) {
      if (step.realWorld.source !== undefined) expect(SOURCE_IDS).toContain(step.realWorld.source);
    }
  });

  test("data-tour names are unique and well formed", () => {
    const targets = TOUR.flatMap((step) => [step.action?.target, step.done.target]).filter(
      (target): target is string => target !== undefined,
    );
    expect(new Set(targets).size).toBe(targets.length);
    for (const target of targets) expect(target).toMatch(/^[a-z][a-z0-9-]*$/);
  });

  test("the journey has a beat for every step, on the step's day, in tour order", () => {
    const ids = TOUR.map((step) => step.id);
    expect([...new Set(JOURNEY.map((beat) => beat.step))]).toEqual(ids);
    for (const step of TOUR) {
      const first = JOURNEY.find((beat) => beat.step === step.id);
      expect(first?.day).toBe(step.clock?.day);
    }
    const days = JOURNEY.map((beat) => beat.day);
    expect(days).toEqual([...days].sort((a, b) => a - b));
  });

  test("only Juniper's refused read completes the denied-read step", () => {
    const denied = TOUR.find((step) => step.id === "denied-read");
    expect(denied?.done.event?.actor).toEqual({ org: "lender" });
  });

  test("the revoke caveat is the sentence the design fixes", () => {
    const denied = TOUR.find((step) => step.id === "denied-read");
    expect(denied?.realWorld.rule).toBe(
      "Juniper still holds the loan file it is required to keep. What has ended is its access to Alex's data at source.",
    );
  });
});

describe("the regulatory clocks hold whichever Monday the demo starts on", () => {
  // Day 1 moves with today's date, so holidays fall differently. Three years of Mondays.
  const mondays = Array.from({ length: 157 }, (_, week) => addDays("2025-01-06", week * 7));

  test.each(mondays)("day 1 = %s", (dayOne) => {
    const calendar = createDemoCalendar(dayOne);
    const application = calendar.date(DAY.application);
    const estimate = calendar.date(DAY.loanEstimate);
    const refreshed = calendar.date(DAY.clearToClose);
    const disclosure = calendar.date(DAY.closingDisclosure);
    const closing = calendar.date(DAY.closing);
    // Loan Estimate: within three business days of the application (12 CFR 1026.19(e)(1)(iii)(A)).
    expect(estimate <= loanEstimateDeadline(application)).toBe(true);
    // ... and at least seven business days before consummation ((e)(1)(iii)(B)).
    expect(closing >= earliestConsummationAfterLoanEstimate(estimate)).toBe(true);
    // Closing Disclosure: received at least three business days before consummation ((f)(1)(ii)(A)).
    expect(closing >= earliestConsummationAfterClosingDisclosure(disclosure)).toBe(true);
    // Employment re-verified within 10 business days before the note date.
    expect(businessDaysBetween(refreshed, closing, "general")).toBeLessThanOrEqual(10);
    // The transferor's servicing notice goes out at least 15 days before the transfer.
    expect(DAY.servicingTransfer - DAY.transferNotice).toBeGreaterThanOrEqual(15);
  });
});
