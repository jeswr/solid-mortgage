// AUTHORED-BY Claude Opus 5.5
import { ACCOUNTS } from "@mortgage/content/mortgage/facts";
import { describe, expect, it } from "vitest";
import {
  averageBalance,
  bankDate,
  credentialLabel,
  largeDeposits,
  ledger,
  money,
  NET_PAY_USD,
  namedAccounts,
  podAnswer,
  podPath,
  splitMoney,
} from "../src/view.ts";

const calendar = { dayOne: "2026-11-16" };
const [checking, savings] = namedAccounts(ACCOUNTS) as [
  ReturnType<typeof namedAccounts>[number],
  ReturnType<typeof namedAccounts>[number],
];

describe("money and dates in the bank's style", () => {
  it("shows cents and a true minus sign", () => {
    expect(money(18_400)).toBe("$18,400.00");
    expect(money(-142.18)).toBe("−$142.18");
    expect(splitMoney(96_250.5)).toEqual({ cents: "50", dollars: "$96,250" });
  });

  it("writes US dates", () => {
    expect(bankDate("2026-08-12")).toBe("Aug 12, 2026");
  });

  it("names the credentials it issues and the slot paths", () => {
    expect(credentialLabel("https://example.org/mort#AssetCredential")).toBe(
      "Verified account summary",
    );
    expect(podPath("https://site.test/pods/alex/credentials/assets")).toBe("/credentials/assets");
  });
});

describe("the bank's own ledger", () => {
  it("names the two accounts from the scenario's facts", () => {
    expect(checking).toMatchObject({ kind: "checking", last4: "2291", name: "Everyday Checking" });
    expect(savings).toMatchObject({ kind: "savings", last4: "7730", name: "Reserve Savings" });
  });

  it("ends at the balance the bank signs, most recent first", () => {
    for (const account of [checking, savings]) {
      const entries = ledger(calendar, account);
      expect(entries.length).toBeGreaterThan(2);
      expect(entries[0]?.balanceUsd).toBe(account.balanceUsd);
      const dates = entries.map((entry) => entry.date);
      expect(dates).toEqual([...dates].sort().reverse());
      // Each balance is the next older balance plus this entry's amount.
      for (let i = 0; i + 1 < entries.length; i++) {
        const newer = entries[i] as (typeof entries)[number];
        const older = entries[i + 1] as (typeof entries)[number];
        expect(newer.balanceUsd).toBeCloseTo(older.balanceUsd + newer.amountUsd, 2);
      }
    }
  });

  it("covers the sixty days before day one and nothing after", () => {
    const entries = ledger(calendar, checking);
    expect(entries.every((entry) => entry.date < calendar.dayOne)).toBe(true);
    expect(entries.every((entry) => entry.date >= "2026-09-17")).toBe(true);
  });

  it("pays net salary into checking and moves savings across on payday", () => {
    const pay = ledger(calendar, checking).filter((e) =>
      e.description.startsWith("Direct deposit"),
    );
    expect(pay.length).toBe(2);
    expect(pay.every((e) => e.amountUsd === NET_PAY_USD)).toBe(true);
    const transfers = ledger(calendar, savings).filter((e) => e.description.startsWith("Transfer"));
    expect(transfers.length).toBe(pay.length);
  });

  it("computes a 60-day average and finds no large deposits to explain", () => {
    const average = averageBalance(calendar, savings);
    expect(average).toBeLessThan(savings.balanceUsd);
    expect(average).toBeGreaterThan(savings.balanceUsd - 10_000);
    expect(largeDeposits([...ledger(calendar, checking), ...ledger(calendar, savings)])).toEqual(
      [],
    );
  });

  it("flags a large deposit that is not pay or an own transfer", () => {
    const gift = { amountUsd: 15_000, balanceUsd: 0, date: "2026-10-02", description: "Wire in" };
    expect(largeDeposits([gift])).toEqual([gift]);
  });
});

describe("what a pod's answer means", () => {
  it("tells a write-only slot from no access at all", () => {
    expect(podAnswer(403, "write-only")).toMatch(/write it, not read it/);
    expect(podAnswer(403, "none")).toMatch(/no access/);
    expect(podAnswer(404, "none")).toMatch(/Nothing is there/);
  });
});
