// AUTHORED-BY Claude Opus 5.5
/**
 * Support for acceptance test 12: the suite's independent business-day oracle
 * (support/business-days.ts) and demo-kit's calendar must agree, so a clock that passes in the
 * guided run passes under two implementations. Node only; no browser.
 */
import { expect, test } from "@playwright/test";
import {
  addBusinessDays,
  addDays,
  businessDaysBetween,
  closingDisclosureDeadline,
  createDemoCalendar,
  demoDayOne,
  isBusinessDay as kitIsBusinessDay,
  loanEstimateDeadline,
} from "../packages/demo-kit/src/calendar.ts";
import {
  countBusinessDays,
  isBusinessDay,
  legalHolidays,
  nthBusinessDayAfter,
} from "./support/business-days.ts";

test("12 Clocks oracle: the CFPB example (closing Thursday, CD received by Monday)", () => {
  // 12 CFR 1026.19(f)(1)(ii) commentary: consummation on Thursday needs receipt by Monday.
  const thursday = "2026-06-11";
  expect(closingDisclosureDeadline(thursday)).toBe("2026-06-08");
  expect(countBusinessDays("2026-06-08", thursday, "specific")).toBe(3);
  expect(countBusinessDays("2026-06-09", thursday, "specific")).toBe(2);
});

test("12 Clocks oracle: the oracle and demo-kit agree on every day of 2025 to 2027", () => {
  const disagreements: string[] = [];
  for (let d = "2025-01-01"; d <= "2027-12-31"; d = addDays(d, 1)) {
    for (const rule of ["general", "specific"] as const) {
      if (isBusinessDay(d, rule) !== kitIsBusinessDay(d, rule)) disagreements.push(`${d} ${rule}`);
      const later = addDays(d, 17);
      if (countBusinessDays(d, later, rule) !== businessDaysBetween(d, later, rule)) {
        disagreements.push(`${d}..${later} ${rule} count`);
      }
      if (nthBusinessDayAfter(d, 3, rule) !== addBusinessDays(d, 3, rule)) {
        disagreements.push(`${d} +3 ${rule}`);
      }
    }
    if (loanEstimateDeadline(d) !== nthBusinessDayAfter(d, 3, "general"))
      disagreements.push(`${d} LE`);
  }
  expect(disagreements).toEqual([]);
  expect(legalHolidays(2026)).toHaveLength(11);
});

test("12 Clocks oracle: the demo calendar's day 1 is a Monday at least 75 days ago", () => {
  const today = new Date().toISOString().slice(0, 10);
  const dayOne = demoDayOne(today);
  const calendar = createDemoCalendar(dayOne);
  expect(new Date(`${dayOne}T00:00:00Z`).getUTCDay()).toBe(1);
  expect(countBusinessDays(dayOne, today, "specific")).toBeGreaterThan(0);
  expect(addDays(dayOne, 75) <= today).toBe(true);
  expect(calendar.date(72) < today, "day 72 (the revoke) is a real past date").toBe(true);
});
