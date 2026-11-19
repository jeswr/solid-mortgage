// AUTHORED-BY Claude Opus 5.5
/**
 * Pure view logic for Alder Bank: money and dates in the bank's style, the bank's own ledger for
 * Alex's two accounts, and what the pod's answers mean. The ledger is the bank's record: it never
 * goes to a pod. Every figure is illustrative.
 */
import type { DemoCalendar } from "@mortgage/demo-kit/calendar";

/** "$18,400.00": a bank shows cents. */
export const money = (amount: number): string =>
  `${amount < 0 ? "−" : ""}$${Math.abs(amount).toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;

/** Whole dollars and cents apart, for the large serif numerals on an account card. */
export function splitMoney(amount: number): { dollars: string; cents: string } {
  const [dollars, cents] = money(amount).split(".") as [string, string];
  return { cents, dollars };
}

/** "Aug 12, 2026": US banking style, from an ISO date or a Date. */
export function bankDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(`${value.slice(0, 10)}T12:00:00Z`) : value;
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  });
}

export function lastSegment(url: string): string {
  return new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? "";
}

/** A pod-relative path with a leading slash, e.g. `/credentials/assets`. */
export function podPath(url: string): string {
  const match = /^\/pods\/[^/]+(\/.*)$/.exec(new URL(url).pathname);
  return match?.[1] ?? new URL(url).pathname;
}

/** The plain name of a credential class IRI. */
export function credentialLabel(typeIri: string): string {
  const local = typeIri.slice(Math.max(typeIri.lastIndexOf("#"), typeIri.lastIndexOf("/")) + 1);
  const labels: Record<string, string> = {
    AssetCredential: "Verified account summary",
    IdentityCredential: "Verified identity",
  };
  return labels[local] ?? local.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export interface Account {
  readonly last4: string;
  readonly name: string;
  readonly kind: "checking" | "savings";
  readonly balanceUsd: number;
}

/** The two accounts, named as the bank names them. Balances come from the scenario's facts. */
export function namedAccounts(
  accounts: readonly { accountLast4: string; balanceUsd: number }[],
): Account[] {
  return accounts.map((account, index) => ({
    balanceUsd: account.balanceUsd,
    kind: index === 0 ? "checking" : "savings",
    last4: account.accountLast4,
    name: index === 0 ? "Everyday Checking" : "Reserve Savings",
  }));
}

export interface Transaction {
  readonly date: string;
  readonly description: string;
  readonly amountUsd: number;
  /** The balance after this transaction. */
  readonly balanceUsd: number;
}

const DAY_MS = 86_400_000;
const iso = (date: Date) => date.toISOString().slice(0, 10);

function lastBusinessDay(year: number, month: number): Date {
  const last = new Date(Date.UTC(year, month + 1, 0));
  while (last.getUTCDay() === 0 || last.getUTCDay() === 6) last.setUTCDate(last.getUTCDate() - 1);
  return last;
}

/** Net pay from Northfield Engineering, after tax and deductions (illustrative). */
export const NET_PAY_USD = 6214.32;
export const SAVINGS_TRANSFER_USD = 2000;

/**
 * Sixty days of the bank's ledger for one account, ending the day before the demo's day one, the
 * most recent first. The running balance ends at the account's balance, so the summary the bank
 * signs agrees with the ledger it keeps.
 */
export function ledger(calendar: Pick<DemoCalendar, "dayOne">, account: Account): Transaction[] {
  const end = new Date(`${calendar.dayOne}T12:00:00Z`).getTime() - DAY_MS;
  const start = end - 59 * DAY_MS;
  const entries: { date: string; description: string; amountUsd: number }[] = [];
  for (let time = start; time <= end; time += DAY_MS) {
    const date = new Date(time);
    const day = date.getUTCDate();
    const payday = lastBusinessDay(date.getUTCFullYear(), date.getUTCMonth());
    const isPayday = iso(payday) === iso(date);
    if (account.kind === "checking") {
      if (isPayday) {
        entries.push({
          amountUsd: NET_PAY_USD,
          date: iso(date),
          description: "Direct deposit · Northfield Engineering payroll",
        });
        entries.push({
          amountUsd: -SAVINGS_TRANSFER_USD,
          date: iso(date),
          description: "Transfer to Reserve Savings ··7730",
        });
      }
      if (day === 1) {
        entries.push({
          amountUsd: -1650,
          date: iso(date),
          description: "Rent · 208 Fenwick Street",
        });
      }
      if (day === 6) {
        entries.push({
          amountUsd: -142.18,
          date: iso(date),
          description: "Marlow Power and Water",
        });
      }
      if (day === 12) {
        entries.push({ amountUsd: -415, date: iso(date), description: "Auto loan payment" });
      }
      if (date.getUTCDay() === 6) {
        entries.push({ amountUsd: -126.4, date: iso(date), description: "Larch Market groceries" });
      }
      if (day === 20) {
        entries.push({
          amountUsd: -280,
          date: iso(date),
          description: "Card payment · Alder Rewards card",
        });
      }
    } else {
      if (isPayday) {
        entries.push({
          amountUsd: SAVINGS_TRANSFER_USD,
          date: iso(date),
          description: "Transfer from Everyday Checking ··2291",
        });
      }
      if (day === 28) {
        entries.push({ amountUsd: 141.6, date: iso(date), description: "Interest paid" });
      }
    }
  }
  // Walk back from today's balance to give each entry its balance after.
  let balance = account.balanceUsd;
  const newestFirst = entries.reverse();
  return newestFirst.map((entry) => {
    const after = round(balance);
    balance -= entry.amountUsd;
    return { ...entry, balanceUsd: after };
  });
}

const round = (amount: number) => Math.round(amount * 100) / 100;

/** The average end-of-day balance over the ledger's sixty days. The bank keeps this; it is not signed. */
export function averageBalance(
  calendar: Pick<DemoCalendar, "dayOne">,
  account: Account,
  transactions: readonly Transaction[] = ledger(calendar, account),
): number {
  const end = new Date(`${calendar.dayOne}T12:00:00Z`).getTime() - DAY_MS;
  // Oldest first; the balance before the first entry is the first entry's balance less its amount.
  const ordered = [...transactions].reverse();
  let balance =
    ordered.length === 0
      ? account.balanceUsd
      : (ordered[0] as Transaction).balanceUsd - (ordered[0] as Transaction).amountUsd;
  let total = 0;
  let index = 0;
  for (let day = 59; day >= 0; day--) {
    const date = iso(new Date(end - day * DAY_MS));
    while (index < ordered.length && (ordered[index] as Transaction).date === date) {
      balance = (ordered[index] as Transaction).balanceUsd;
      index++;
    }
    total += balance;
  }
  return round(total / 60);
}

/**
 * Deposits a lender would ask about: anything over half of a month's net pay that is not the pay
 * itself or a transfer between Alex's own accounts.
 */
export function largeDeposits(transactions: readonly Transaction[]): Transaction[] {
  return transactions.filter(
    (entry) =>
      entry.amountUsd > NET_PAY_USD / 2 &&
      !entry.description.startsWith("Direct deposit") &&
      !entry.description.startsWith("Transfer from"),
  );
}

/** What a status a pod answered means, in the bank's words. */
export function podAnswer(status: number, grant: "write-only" | "none"): string {
  if (status === 403) {
    return grant === "write-only"
      ? "403 Forbidden. Our access to this slot lets us write it, not read it."
      : "403 Forbidden. We have no access to this part of the pod at all.";
  }
  if (status === 401) return "401 Unauthorized. The pod refused an anonymous request.";
  if (status === 404) return "404 Not Found. Nothing is there yet.";
  if (status >= 200 && status < 300) return `${status}. The pod answered.`;
  return `${status}. The pod could not answer.`;
}
