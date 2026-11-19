// AUTHORED-BY Claude Opus 5.5
import { describe, expect, it } from "vitest";
import { canCommit, canSign, checklist, type FileFlags, longDate, usd } from "../src/view.ts";

const blank: FileFlags = { closed: false, committed: false, ordered: false, recorded: false };

describe("checklist", () => {
  it("lists the escrow officer's work in order, all open at first", () => {
    const items = checklist(blank);
    expect(items.map((item) => item.label)).toEqual([
      "Order received from the lender",
      "Title searched, commitment issued",
      "Closing held, documents signed",
      "Funds disbursed from escrow",
      "Deed and mortgage recorded",
    ]);
    expect(items.every((item) => !item.done)).toBe(true);
  });

  it("ticks signing and disbursement together, at the closing", () => {
    const done = checklist({ closed: true, committed: true, ordered: true, recorded: false }).map(
      (item) => item.done,
    );
    expect(done).toEqual([true, true, true, true, false]);
  });
});

describe("what may happen next", () => {
  it("offers the commitment once ordered, and only once", () => {
    expect(canCommit(blank)).toBe(false);
    expect(canCommit({ ...blank, ordered: true })).toBe(true);
    expect(canCommit({ ...blank, committed: true, ordered: true })).toBe(false);
  });

  it("offers signing after the commitment, and only once", () => {
    expect(canSign({ ...blank, ordered: true })).toBe(false);
    expect(canSign({ ...blank, committed: true, ordered: true })).toBe(true);
    expect(canSign({ ...blank, closed: true, committed: true, ordered: true })).toBe(false);
  });
});

describe("formats", () => {
  it("spells out negative amounts for screen readers", () => {
    expect(usd(428000)).toBe("$428,000");
    expect(usd(-342400)).toBe("minus $342,400");
  });

  it("writes long dates in UTC", () => {
    expect(longDate(new Date("2026-04-14T23:59:00Z"))).toBe("April 14, 2026");
  });
});
