// AUTHORED-BY Claude Opus 5.5
import { describe, expect, it } from "vitest";
import {
  addBusinessDays,
  businessDaysBetween,
  closingDisclosureDeadline,
  createDemoCalendar,
  demoDayOne,
  earliestConsummationAfterClosingDisclosure,
  earliestConsummationAfterLoanEstimate,
  federalHolidayOn,
  federalHolidays,
  isBusinessDay,
  loanEstimateDeadline,
  presumedReceipt,
  weekday,
  withinBusinessDays,
} from "../src/calendar.js";

describe("federal holidays (5 U.S.C. 6103(a))", () => {
  it("lists the eleven 2025 holidays on their statutory dates", () => {
    expect(federalHolidays(2025).map((h) => [h.date, h.observed])).toEqual([
      ["2025-01-01", "2025-01-01"],
      ["2025-01-20", "2025-01-20"],
      ["2025-02-17", "2025-02-17"],
      ["2025-05-26", "2025-05-26"],
      ["2025-06-19", "2025-06-19"],
      ["2025-07-04", "2025-07-04"],
      ["2025-09-01", "2025-09-01"],
      ["2025-10-13", "2025-10-13"],
      ["2025-11-11", "2025-11-11"],
      ["2025-11-27", "2025-11-27"],
      ["2025-12-25", "2025-12-25"],
    ]);
  });

  it("moves a Saturday holiday to Friday and a Sunday holiday to Monday", () => {
    const y2026 = federalHolidays(2026);
    expect(y2026.find((h) => h.name === "Independence Day")?.observed).toBe("2026-07-03");
    const y2027 = federalHolidays(2027);
    expect(y2027.find((h) => h.name === "Juneteenth National Independence Day")?.observed).toBe(
      "2027-06-18",
    );
    expect(y2027.find((h) => h.name === "Christmas Day")?.observed).toBe("2027-12-24");
    const y2028 = federalHolidays(2028);
    expect(y2028.find((h) => h.name === "Independence Day")?.observed).toBe("2028-07-04");
    expect(federalHolidays(2023).find((h) => h.name === "New Year's Day")?.observed).toBe(
      "2023-01-02",
    );
  });

  it("finds New Year's Day observed on 31 December of the year before", () => {
    // 1 January 2028 is a Saturday.
    expect(federalHolidayOn("2027-12-31")?.name).toBe("New Year's Day");
  });

  it("has no Juneteenth before 2021", () => {
    expect(federalHolidays(2020).some((h) => h.name.startsWith("Juneteenth"))).toBe(false);
    expect(federalHolidays(2021)).toHaveLength(11);
  });
});

describe("business days (12 CFR 1026.2(a)(6))", () => {
  it("general: Monday to Friday, closed on observed holidays", () => {
    expect(isBusinessDay("2026-11-16", "general")).toBe(true); // Monday
    expect(isBusinessDay("2026-11-21", "general")).toBe(false); // Saturday
    expect(isBusinessDay("2026-11-26", "general")).toBe(false); // Thanksgiving
    expect(isBusinessDay("2026-07-03", "general")).toBe(false); // Independence Day observed
  });

  it("specific: every day except Sundays and legal public holidays", () => {
    expect(isBusinessDay("2026-11-21", "specific")).toBe(true); // Saturday counts
    expect(isBusinessDay("2026-11-22", "specific")).toBe(false); // Sunday
    expect(isBusinessDay("2026-11-11", "specific")).toBe(false); // Veterans Day
    // 4 July 2026 is a Saturday: the holiday and its observed Friday are both excluded.
    expect(isBusinessDay("2026-07-04", "specific")).toBe(false);
    expect(isBusinessDay("2026-07-03", "specific")).toBe(false);
  });

  it("counts forwards and backwards without counting the start day", () => {
    expect(addBusinessDays("2026-11-16", 0, "general")).toBe("2026-11-16");
    expect(addBusinessDays("2026-11-20", 1, "general")).toBe("2026-11-23"); // Fri → Mon
    expect(addBusinessDays("2026-11-20", 1, "specific")).toBe("2026-11-21"); // Fri → Sat
    expect(addBusinessDays("2026-11-23", -1, "specific")).toBe("2026-11-21"); // Mon → Sat
    expect(addBusinessDays("2026-11-25", 1, "general")).toBe("2026-11-27"); // over Thanksgiving
  });

  it("measures gaps in business days", () => {
    expect(businessDaysBetween("2026-11-16", "2026-11-23", "general")).toBe(5);
    expect(businessDaysBetween("2026-11-16", "2026-11-23", "specific")).toBe(6);
    expect(businessDaysBetween("2026-11-23", "2026-11-16", "general")).toBe(-5);
    // Veterans Day (11 November 2026) is skipped, so the tenth business day is the 17th.
    expect(businessDaysBetween("2026-11-02", "2026-11-17", "general")).toBe(10);
    expect(withinBusinessDays("2026-11-02", "2026-11-17", 10, "general")).toBe(true);
    expect(withinBusinessDays("2026-11-02", "2026-11-18", 10, "general")).toBe(false);
    expect(withinBusinessDays("2026-11-17", "2026-11-02", 10, "general")).toBe(false);
  });

  it("rejects malformed dates", () => {
    expect(() => isBusinessDay("2026-02-30", "general")).toThrow(/calendar date/);
    expect(() => isBusinessDay("16/11/2026", "general")).toThrow(/YYYY-MM-DD/);
  });
});

describe("TRID clocks", () => {
  it("CFPB example: consummation on Thursday ⇒ Closing Disclosure received by Monday", () => {
    // 12 CFR 1026.19(f)(1)(ii) comment 1: "if consummation is scheduled for Thursday, the
    // consumer must receive the disclosures on or before Monday."
    const thursday = "2026-11-19";
    expect(weekday(thursday)).toBe("Thu");
    const deadline = closingDisclosureDeadline(thursday);
    expect(deadline).toBe("2026-11-16");
    expect(weekday(deadline)).toBe("Mon");
    expect(earliestConsummationAfterClosingDisclosure("2026-11-16")).toBe(thursday);
  });

  it("counts Saturday but not Sunday before a Tuesday closing", () => {
    expect(closingDisclosureDeadline("2026-11-24")).toBe("2026-11-20"); // Mon, Sat, Fri
  });

  it("skips a legal holiday inside the waiting period", () => {
    // Veterans Day (Wednesday 11 November 2026) is not a business day.
    expect(closingDisclosureDeadline("2026-11-13")).toBe("2026-11-09");
  });

  it("Loan Estimate: third general business day after application", () => {
    expect(loanEstimateDeadline("2026-11-18")).toBe("2026-11-23"); // Wed → Mon
    expect(loanEstimateDeadline("2026-11-24")).toBe("2026-11-30"); // over Thanksgiving
  });

  it("mailbox rule and the seven-day wait use specific business days", () => {
    expect(presumedReceipt("2026-11-19")).toBe("2026-11-23"); // Thu → Fri, Sat, Mon
    expect(earliestConsummationAfterLoanEstimate("2026-11-02")).toBe("2026-11-10");
  });
});

describe("demo calendar (design.md §d.7)", () => {
  it("day 1 is the latest Monday at least 75 days before today", () => {
    expect(demoDayOne("2026-11-19")).toBe("2026-08-31");
    // 75 days before 2026-11-14 is Monday 2026-08-31 itself.
    expect(demoDayOne("2026-11-14")).toBe("2026-08-31");
    expect(demoDayOne("2026-11-13")).toBe("2026-08-24");
    expect(demoDayOne(new Date("2026-11-19T23:59:00Z"))).toBe("2026-08-31");
  });

  it("maps days to dates, labels and instants", () => {
    const calendar = createDemoCalendar("2026-08-31");
    expect(calendar.date(1)).toBe("2026-08-31");
    expect(calendar.date(12)).toBe("2026-09-11");
    expect(calendar.label(12)).toBe("Day 12 · Fri");
    expect(calendar.dayOf("2026-09-11")).toBe(12);
    expect(calendar.dayOf(calendar.time(38, "14:30"))).toBe(38);
    expect(calendar.time(3)).toBe("2026-09-02T09:00:00.000Z");
    expect(calendar.clock(3).toISOString()).toBe("2026-09-02T09:00:00.000Z");
    expect(() => calendar.date(0)).toThrow();
    expect(() => createDemoCalendar("2026-09-01")).toThrow(/Monday/);
  });

  it("the §d.7 schedule meets the three regulatory clocks for every day 1 over ten years", () => {
    // Days from design.md §d.7: 3 application, 4 Loan Estimate, 31 employment refresh,
    // 32 Closing Disclosure (handed over in person, so received that day), 38 closing.
    let dayOne = "2024-01-01";
    for (let week = 0; week < 52 * 10; week += 1) {
      const c = createDemoCalendar(dayOne);
      expect(c.date(4) <= loanEstimateDeadline(c.date(3)), `LE, day 1 ${dayOne}`).toBe(true);
      expect(c.date(32) <= closingDisclosureDeadline(c.date(38)), `CD, day 1 ${dayOne}`).toBe(true);
      expect(c.date(38) >= earliestConsummationAfterLoanEstimate(c.date(4))).toBe(true);
      expect(withinBusinessDays(c.date(31), c.date(38), 10, "general")).toBe(true);
      dayOne = c.date(8);
    }
  });
});
