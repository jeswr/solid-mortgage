// AUTHORED-BY Claude Opus 5.5
/**
 * Northwind's cash flow at Alder Bank (flows.md section 6, steps 1, 4 and 7). Alder writes the
 * record into Northwind's `finance/cash-flow` under S1, a write-only grant: the bank publishes
 * the business's own data to the business, and cannot read it back. Brackenridge reads it at
 * source under S2 (the application) and S3 (each quarterly covenant test).
 *
 * The figures are fictional and fixed, so every run computes the same measures. The months are
 * the calendar months before the step's simulated day, so the record always ends last month.
 */

import {
  buildCashFlowRecord,
  CashFlowRecord,
  type CovenantInit,
  type MonthlyCashFlowInit,
} from "@mortgage/data-model";
import { DataFactory } from "n3";
import {
  at,
  dateOf,
  podUrl,
  putResource,
  readDataset,
  type World,
  webid,
} from "../mortgage/world.js";
import { ACCOUNT_LAST4, COVENANTS, HOLDER, LOAN_PAYMENT, PATHS } from "./facts.js";

/** Monthly inflows (deposits), a year of a regional freight business. */
const INFLOWS = [
  71_200, 74_800, 69_900, 77_300, 80_100, 76_400, 82_500, 79_800, 75_600, 81_900, 84_200, 78_400,
] as const;
/** Monthly operating outflows (payroll, fuel, rent, repairs): everything but debt service. */
const OPERATING = [
  60_100, 62_300, 61_000, 64_200, 66_400, 63_800, 68_200, 66_000, 64_100, 67_700, 69_300, 65_900,
] as const;
/** Existing debt service each month (the lease on the current fleet). */
export const EXISTING_DEBT_SERVICE = 4_200;
/** The operating account's balance before the first month of the record. */
const OPENING_BALANCE = 24_600;

export function cashFlowUrl(world: Pick<World, "podOrigin">): string {
  return podUrl(world, HOLDER, PATHS.cashFlow);
}

/** The first day of the month `offset` months from the month of `date` (UTC). */
function monthStart(date: Date, offset: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
}

/**
 * The months up to the end of the month before `day`, starting twelve months before `fromDay`
 * (the record's first publication). The loan's payment joins the debt service from the month
 * after `fundedDay`, when there is one.
 */
export function monthsUpTo(
  world: Pick<World, "calendar">,
  fromDay: number,
  day: number,
  fundedDay?: number,
): MonthlyCashFlowInit[] {
  const first = monthStart(dateOf(world, fromDay), -12);
  const end = monthStart(dateOf(world, day), 0);
  const funded = fundedDay === undefined ? undefined : monthStart(dateOf(world, fundedDay), 1);
  const months: MonthlyCashFlowInit[] = [];
  let balance = OPENING_BALANCE;
  for (let index = 0; ; index += 1) {
    const periodStart = monthStart(first, index);
    if (periodStart.getTime() >= end.getTime()) break;
    const slot = index % INFLOWS.length;
    const inflowUsd = INFLOWS[slot] ?? 0;
    const debt =
      EXISTING_DEBT_SERVICE +
      (funded !== undefined && periodStart.getTime() >= funded.getTime() ? LOAN_PAYMENT : 0);
    const debtServiceUsd = Math.round(debt * 100) / 100;
    const outflowUsd = Math.round(((OPERATING[slot] ?? 0) + debtServiceUsd) * 100) / 100;
    balance = Math.round((balance + inflowUsd - outflowUsd) * 100) / 100;
    months.push({ closingBalanceUsd: balance, debtServiceUsd, inflowUsd, outflowUsd, periodStart });
  }
  return months;
}

/** The record Alder writes on `day`. */
export function buildRecord(world: World, months: readonly MonthlyCashFlowInit[], time: string) {
  return buildCashFlowRecord({
    accountLast4: ACCOUNT_LAST4,
    bank: webid(world, "bank"),
    holder: webid(world, HOLDER),
    iri: cashFlowUrl(world),
    issued: at(world, time),
    months,
    name: "Operating account cash flow, Alder Bank",
  });
}

/** Alder writes the record into Northwind's pod (a PUT; the pod checks S1). */
export async function publishCashFlow(
  world: World,
  months: readonly MonthlyCashFlowInit[],
  time: string,
): Promise<string> {
  return putResource(world.fetchAs("bank"), buildRecord(world, months, time));
}

/** Read the record as `reader`. A refused read throws `PodRequestError`. */
export async function readCashFlow(
  world: World,
  reader: Parameters<World["fetchAs"]>[0],
): Promise<CashFlowRecord> {
  const url = cashFlowUrl(world);
  const dataset = await readDataset(world.fetchAs(reader), url);
  return new CashFlowRecord(url, dataset, DataFactory);
}

/** Has anything been written there yet? (The wallet reserves the resource empty.) */
export function isEmptyRecord(record: CashFlowRecord): boolean {
  return record.dataset.size === 0;
}

export interface Measures {
  readonly months: number;
  readonly inflowUsd: number;
  /** Inflow less operating outflow (outflow less debt service). */
  readonly netOperatingUsd: number;
  /** Debt service in the months read, plus `extraMonthlyDebt` for each of them. */
  readonly debtServiceUsd: number;
  /** Net operating cash flow over debt service, to two decimals. */
  readonly dscr: number;
  /** The mean closing balance, to the cent. */
  readonly averageBalanceUsd: number;
  /** Annualised inflow (the turnover the months imply). */
  readonly annualisedInflowUsd: number;
}

/**
 * The measures a lender takes from the last `count` months: debt service coverage (with
 * `extraMonthlyDebt` added, e.g. the proposed loan's payment at origination) and the average
 * balance.
 */
export function measure(record: CashFlowRecord, count: number, extraMonthlyDebt = 0): Measures {
  const months = record.months.slice(-count);
  if (months.length === 0) throw new Error("the cash flow record has no months to measure");
  const sum = (pick: (month: (typeof months)[number]) => number) =>
    months.reduce((total, month) => total + pick(month), 0);
  const inflowUsd = sum((month) => month.inflowUsd);
  const netOperatingUsd = sum(
    (month) => month.inflowUsd - (month.outflowUsd - month.debtServiceUsd),
  );
  const debtServiceUsd = sum((month) => month.debtServiceUsd) + extraMonthlyDebt * months.length;
  return {
    annualisedInflowUsd: Math.round((inflowUsd / months.length) * 12),
    averageBalanceUsd:
      Math.round((sum((month) => month.closingBalanceUsd) / months.length) * 100) / 100,
    debtServiceUsd: Math.round(debtServiceUsd * 100) / 100,
    dscr: debtServiceUsd === 0 ? 0 : Math.floor((netOperatingUsd / debtServiceUsd) * 100) / 100,
    inflowUsd,
    months: months.length,
    netOperatingUsd: Math.round(netOperatingUsd * 100) / 100,
  };
}

export interface CovenantResult {
  readonly covenant: CovenantInit;
  readonly value: number;
  readonly met: boolean;
}

/** Each covenant against the measures. */
export function testCovenants(
  measures: Measures,
  covenants: readonly CovenantInit[] = COVENANTS,
): CovenantResult[] {
  return covenants.map((covenant) => {
    const value = covenant.metric === "dscr" ? measures.dscr : measures.averageBalanceUsd;
    return { covenant, met: value >= covenant.threshold, value };
  });
}
