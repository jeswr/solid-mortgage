// AUTHORED-BY Claude Opus 5.5
import { SIX_ITEMS } from "@mortgage/content/mortgage/journey";
import { createDemoCalendar } from "@mortgage/demo-kit/calendar";
import { describe, expect, it } from "vitest";
import {
  checkSsn,
  closingDisclosureRows,
  demoSsn,
  issuerName,
  loanEstimateRows,
  milestones,
  organisationOf,
  sixItemChecklist,
  termRows,
  usd,
} from "../src/view.ts";

// A fixed Monday, so the TRID arithmetic below is checked against known dates.
const calendar = createDemoCalendar("2026-08-03");
const day = (n: number) => new Date(`${calendar.date(n)}T00:00:00Z`);

describe("Social Security number", () => {
  it("accepts nine digits whose last four match the identity credential", () => {
    expect(checkSsn("900-00-4417", "4417").ok).toBe(true);
    expect(checkSsn("900004417", "4417").ok).toBe(true);
  });

  it("refuses a mismatch, a short number and an empty field", () => {
    expect(checkSsn("900-00-1234", "4417")).toMatchObject({ ok: false });
    expect(checkSsn("900-00-441", "4417")).toMatchObject({ ok: false });
    expect(checkSsn("", "4417")).toMatchObject({ ok: false });
    expect(checkSsn("900-00-4417", undefined)).toMatchObject({ ok: false });
  });

  it("fills in a never-issued 900-range number ending in the pod's last four", () => {
    expect(demoSsn("4417")).toBe("900-00-4417");
    expect(checkSsn(demoSsn("4417"), "4417").ok).toBe(true);
  });
});

describe("six-item checklist", () => {
  const complete = {
    estimatedValueUsd: 425_000,
    loanAmountUsd: 340_000,
    monthlyIncomeUsd: 8_500,
    name: "Alex Rivera",
    propertyAddress: "14 Larch Lane",
    ssnOk: true,
  };

  it("keeps the journey's six items in order and ticks each from the form", () => {
    const list = sixItemChecklist(SIX_ITEMS, complete);
    expect(list.map((item) => item.item)).toEqual(SIX_ITEMS.map((item) => item.item));
    expect(list.every((item) => item.done)).toBe(true);
  });

  it("is incomplete without a valid Social Security number", () => {
    const list = sixItemChecklist(SIX_ITEMS, { ...complete, ssnOk: false });
    expect(list.filter((item) => !item.done).map((item) => item.item)).toEqual([
      "Social Security number",
    ]);
  });
});

describe("Loan Estimate dates", () => {
  it("counts delivery on day 4 as business day 1 of 3 after a day-3 application", () => {
    const rows = loanEstimateRows(calendar, {
      applicationDate: day(3),
      expires: day(18),
      issued: day(4),
    });
    const delivered = rows.find((row) => row.label === "Delivered to your pod");
    expect(delivered?.note).toBe("Business day 1 of 3: on time");
    expect(rows.find((row) => row.label === "Latest delivery date")?.value).toContain("Day 8");
    expect(rows.some((row) => row.label === "You said you intend to proceed")).toBe(false);
  });

  it("adds the intent-to-proceed date once given", () => {
    const rows = loanEstimateRows(calendar, {
      applicationDate: day(3),
      expires: day(18),
      intentToProceedDate: day(4),
      issued: day(4),
    });
    expect(rows.at(-1)).toMatchObject({ label: "You said you intend to proceed" });
  });
});

describe("Closing Disclosure dates", () => {
  it("shows the receipt deadline before closing, then the waiting period after receipt", () => {
    const before = closingDisclosureRows(calendar, { closingDate: day(38), issued: day(32) });
    expect(before.map((row) => row.label)).toEqual([
      "Delivered to your pod",
      "Must be received by",
      "Closing date",
    ]);
    const after = closingDisclosureRows(calendar, {
      closingDate: day(38),
      issued: day(32),
      receivedDate: day(32),
    });
    expect(after.find((row) => row.label === "You confirmed receipt")?.note).toBe(
      "In time for the closing date",
    );
    expect(after.find((row) => row.label === "Earliest closing after receipt")?.note).toBe(
      "Closing date respects the waiting period",
    );
  });
});

describe("terms and milestones", () => {
  const terms = {
    aprPercent: 6.62,
    cashToCloseUsd: 86_350,
    closingCostsUsd: 9_850,
    estimatedTotalMonthlyPaymentUsd: 2659.03,
    interestRatePercent: 6.5,
    loanTermMonths: 360,
    monthlyPrincipalAndInterestUsd: 2149.03,
    principalUsd: 340_000,
  };

  it("flags a term that changed between estimate and final", () => {
    const rows = termRows(terms, { ...terms, cashToCloseUsd: 86_000 });
    expect(rows.filter((row) => row.changed).map((row) => row.label)).toEqual(["Cash to close"]);
    expect(rows.find((row) => row.label === "Loan term")?.estimate).toBe("30 years");
  });

  it("formats money", () => {
    expect(usd(340_000)).toBe("$340,000");
    expect(usd(2149.03)).toBe("$2,149.03");
  });

  it("asks the borrower for intent once the estimate is in", () => {
    const list = milestones({
      applied: true,
      appraisalOrdered: false,
      clearToClose: false,
      closed: false,
      closingDisclosureReceived: false,
      estimateDelivered: true,
      insured: false,
      intentToProceed: false,
      titleOrdered: false,
    });
    expect(list.filter((m) => m.yourMove).map((m) => m.yourMove)).toEqual([
      "Tell us you intend to proceed",
    ]);
  });
});

describe("issuers", () => {
  it("names the organisation behind a WebID and leaves anything else as it is", () => {
    expect(issuerName("http://127.0.0.1:4000/pods/payroll/profile/card#me")).toBe(
      "Ledgerly Payroll",
    );
    expect(organisationOf("http://127.0.0.1:4000/pods/lender/profile/card#me")?.slug).toBe(
      "lender",
    );
    expect(issuerName("https://elsewhere.example/me")).toBe("https://elsewhere.example/me");
  });
});
