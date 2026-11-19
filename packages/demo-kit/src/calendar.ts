// AUTHORED-BY Claude Opus 5.5
/**
 * The demo calendar (design.md §d.7) and the business-day arithmetic behind the TRID clocks.
 *
 * Dates are calendar dates written `YYYY-MM-DD` (`IsoDate`) and computed in UTC, so no result
 * depends on the visitor's time zone. Demo times (`demoTime`) are UTC instants on those dates.
 *
 * Two business-day definitions, both from 12 CFR 1026.2(a)(6):
 *
 * - `general`: a day on which the creditor's offices are open to the public for carrying on
 *   substantially all of its business functions. Every organisation in the demo is open Monday
 *   to Friday and closed on the observed federal holidays, so that is what `general` means here.
 *   It governs the Loan Estimate deadline (1026.19(e)(1)(iii)) and the employment re-verification
 *   window.
 * - `specific`: all calendar days except Sundays and the legal public holidays in 5 U.S.C.
 *   6103(a). It governs Closing Disclosure receipt (1026.19(f)(1)(ii)), the mailbox rule
 *   (1026.19(e)(1)(iv), (f)(1)(iii)) and the seven-day wait after the Loan Estimate
 *   (1026.19(e)(1)(iii)(B)). When a holiday falls on a weekend this module excludes both the
 *   holiday itself and the weekday on which it is observed. Excluding more days only moves a
 *   deadline in the cautious direction for every rule above, so the demo's dates comply under
 *   either reading of how weekend holidays are counted.
 */

/** A calendar date, `YYYY-MM-DD`. */
export type IsoDate = string;

export type BusinessDayRule = "general" | "specific";

export interface FederalHoliday {
  name: string;
  /** The date fixed by 5 U.S.C. 6103(a). */
  date: IsoDate;
  /** The weekday it is observed on (Saturday → Friday before, Sunday → Monday after). */
  observed: IsoDate;
}

const DAY_MS = 86_400_000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function toUtc(date: IsoDate): number {
  const match = ISO_DATE.exec(date);
  if (match === null) throw new Error(`not a YYYY-MM-DD date: ${date}`);
  const [, y, m, d] = match;
  const time = Date.UTC(Number(y), Number(m) - 1, Number(d));
  if (fromUtc(time) !== date) throw new Error(`not a calendar date: ${date}`);
  return time;
}

function fromUtc(time: number): IsoDate {
  return new Date(time).toISOString().slice(0, 10);
}

/** The UTC calendar date of a `Date` or an ISO date-time string. */
export function isoDate(value: Date | string): IsoDate {
  if (typeof value === "string" && ISO_DATE.test(value)) {
    toUtc(value);
    return value;
  }
  const time = typeof value === "string" ? Date.parse(value) : value.getTime();
  if (Number.isNaN(time)) throw new Error(`not a date: ${String(value)}`);
  return fromUtc(time);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtc(toUtc(date) + days * DAY_MS);
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(date: IsoDate): number {
  return new Date(toUtc(date)).getUTCDay();
}

export function weekday(date: IsoDate): Weekday {
  return WEEKDAYS[dayOfWeek(date)] as Weekday;
}

function ymd(year: number, month: number, day: number): IsoDate {
  return fromUtc(Date.UTC(year, month - 1, day));
}

/** The `n`th given weekday of a month (n = 1…4), or the last one when `n` is -1. */
function nthWeekday(year: number, month: number, dow: number, n: number): IsoDate {
  if (n === -1) {
    const last = ymd(year, month + 1, 0);
    return addDays(last, -((dayOfWeek(last) - dow + 7) % 7));
  }
  const first = ymd(year, month, 1);
  return addDays(first, ((dow - dayOfWeek(first) + 7) % 7) + (n - 1) * 7);
}

function observedDate(date: IsoDate): IsoDate {
  const dow = dayOfWeek(date);
  if (dow === 6) return addDays(date, -1);
  if (dow === 0) return addDays(date, 1);
  return date;
}

/** The legal public holidays of 5 U.S.C. 6103(a) for one year, in date order. */
export function federalHolidays(year: number): FederalHoliday[] {
  if (!Number.isInteger(year) || year < 1971 || year > 9999) {
    throw new Error(`holiday table covers 1971 onwards: ${year}`);
  }
  const fixed: Array<[string, IsoDate]> = [
    ["New Year's Day", ymd(year, 1, 1)],
    ["Birthday of Martin Luther King, Jr.", nthWeekday(year, 1, 1, 3)],
    ["Washington's Birthday", nthWeekday(year, 2, 1, 3)],
    ["Memorial Day", nthWeekday(year, 5, 1, -1)],
    ["Independence Day", ymd(year, 7, 4)],
    ["Labor Day", nthWeekday(year, 9, 1, 1)],
    ["Columbus Day", nthWeekday(year, 10, 1, 2)],
    ["Veterans Day", ymd(year, 11, 11)],
    ["Thanksgiving Day", nthWeekday(year, 11, 4, 4)],
    ["Christmas Day", ymd(year, 12, 25)],
  ];
  if (year < 1986) fixed.splice(1, 1); // King's birthday became a holiday in 1986
  if (year >= 2021)
    fixed.splice(fixed.length - 6, 0, ["Juneteenth National Independence Day", ymd(year, 6, 19)]);
  return fixed
    .map(([name, date]) => ({ date, name, observed: observedDate(date) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const holidayCache = new Map<number, Map<IsoDate, FederalHoliday>>();

/** Holidays whose actual or observed date falls in `year` (New Year's Day can be observed on 31 December). */
function holidayIndex(year: number): Map<IsoDate, FederalHoliday> {
  let index = holidayCache.get(year);
  if (index === undefined) {
    index = new Map();
    for (const y of [year - 1, year, year + 1]) {
      if (y < 1971) continue;
      for (const holiday of federalHolidays(y)) {
        if (holiday.date.startsWith(`${year}-`)) index.set(holiday.date, holiday);
        if (holiday.observed.startsWith(`${year}-`) && !index.has(holiday.observed)) {
          index.set(holiday.observed, holiday);
        }
      }
    }
    holidayCache.set(year, index);
  }
  return index;
}

/** The federal holiday that falls or is observed on `date`, if any. */
export function federalHolidayOn(date: IsoDate): FederalHoliday | undefined {
  return holidayIndex(Number(date.slice(0, 4))).get(isoDate(date));
}

/** Is `date` a business day under the given TRID definition? (See the module comment.) */
export function isBusinessDay(date: IsoDate, rule: BusinessDayRule): boolean {
  const dow = dayOfWeek(date);
  const holiday = federalHolidayOn(date);
  if (rule === "general") {
    if (dow === 0 || dow === 6) return false;
    return holiday === undefined || holiday.observed !== date;
  }
  if (dow === 0) return false;
  return holiday === undefined;
}

/**
 * Move `count` business days from `date`: forward when positive, backward when negative. The
 * start date itself is never counted, so `addBusinessDays(d, 3, r)` is "the third business day
 * after d".
 */
export function addBusinessDays(date: IsoDate, count: number, rule: BusinessDayRule): IsoDate {
  if (!Number.isInteger(count)) throw new Error(`business-day count must be an integer: ${count}`);
  const step = count < 0 ? -1 : 1;
  let cursor = isoDate(date);
  for (let remaining = Math.abs(count); remaining > 0; ) {
    cursor = addDays(cursor, step);
    if (isBusinessDay(cursor, rule)) remaining -= 1;
  }
  return cursor;
}

/** Business days after `from` up to and including `to` (negative when `to` is earlier). */
export function businessDaysBetween(from: IsoDate, to: IsoDate, rule: BusinessDayRule): number {
  const sign = daysBetween(from, to) < 0 ? -1 : 1;
  const [start, end] = sign === 1 ? [from, to] : [to, from];
  let count = 0;
  for (let cursor = addDays(start, 1); cursor <= end; cursor = addDays(cursor, 1)) {
    if (isBusinessDay(cursor, rule)) count += 1;
  }
  return sign * count;
}

// --- TRID clocks -------------------------------------------------------------------------------

/** Last day to deliver or mail the Loan Estimate: the third general business day after application. */
export function loanEstimateDeadline(application: IsoDate): IsoDate {
  return addBusinessDays(application, 3, "general");
}

/** When a disclosure sent by mail (or other non-in-person means) is presumed received. */
export function presumedReceipt(sent: IsoDate): IsoDate {
  return addBusinessDays(sent, 3, "specific");
}

/** Latest day the consumer may receive the Closing Disclosure for consummation on `consummation`. */
export function closingDisclosureDeadline(consummation: IsoDate): IsoDate {
  return addBusinessDays(consummation, -3, "specific");
}

/** Earliest consummation date when the Closing Disclosure is received on `received`. */
export function earliestConsummationAfterClosingDisclosure(received: IsoDate): IsoDate {
  return addBusinessDays(received, 3, "specific");
}

/** Earliest consummation date when the Loan Estimate is delivered or mailed on `delivered`. */
export function earliestConsummationAfterLoanEstimate(delivered: IsoDate): IsoDate {
  return addBusinessDays(delivered, 7, "specific");
}

/** True when `later` is no more than `count` business days after `earlier` (and not before it). */
export function withinBusinessDays(
  earlier: IsoDate,
  later: IsoDate,
  count: number,
  rule: BusinessDayRule,
): boolean {
  const gap = businessDaysBetween(earlier, later, rule);
  return gap >= 0 && gap <= count;
}

// --- The demo calendar -------------------------------------------------------------------------

/** How far back day 1 sits, so every demo date is a real past date (design.md §d.7). */
export const DAY_ONE_MIN_DAYS_BEFORE_TODAY = 75;

/** Day 1: the latest Monday at least 75 days before `today`. */
export function demoDayOne(today: Date | IsoDate = new Date()): IsoDate {
  const candidate = addDays(isoDate(today), -DAY_ONE_MIN_DAYS_BEFORE_TODAY);
  return addDays(candidate, -((dayOfWeek(candidate) + 6) % 7));
}

export interface DemoCalendar {
  /** The date of day 1 (a Monday). */
  readonly dayOne: IsoDate;
  /** The calendar date of demo day `day` (day 1 is `dayOne`). */
  date(day: number): IsoDate;
  /** The demo day number of a date (or ISO date-time). */
  dayOf(date: Date | string): number;
  /** "Day 12 · Fri", as the Lens shows it. */
  label(day: number): string;
  /** An ISO instant on demo day `day` at `time` (`HH:MM`, UTC), for `PodEvent.at` and credential dates. */
  time(day: number, time?: string): string;
  /** The same instant as a `Date`, for libraries that take a clock (vc-kit's `now`). */
  clock(day: number, time?: string): Date;
}

/** A calendar anchored on `dayOne` (by default the one `demoDayOne()` gives for today). */
export function createDemoCalendar(dayOne: IsoDate = demoDayOne()): DemoCalendar {
  if (dayOfWeek(dayOne) !== 1) throw new Error(`day 1 must be a Monday: ${dayOne}`);
  const date = (day: number): IsoDate => {
    if (!Number.isInteger(day) || day < 1) throw new Error(`demo days start at 1: ${day}`);
    return addDays(dayOne, day - 1);
  };
  const time = (day: number, at = "09:00"): string => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(at)) throw new Error(`time must be HH:MM: ${at}`);
    return `${date(day)}T${at}:00.000Z`;
  };
  return Object.freeze({
    clock: (day: number, at?: string) => new Date(time(day, at)),
    date,
    dayOf: (value: Date | string) => daysBetween(dayOne, isoDate(value)) + 1,
    dayOne,
    label: (day: number) => `Day ${day} · ${weekday(date(day))}`,
    time,
  });
}
