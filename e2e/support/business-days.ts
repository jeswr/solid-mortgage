// AUTHORED-BY Claude Opus 5.5
/**
 * An independent business-day oracle for the regulatory clocks (acceptance test 12). It shares
 * no code with packages/demo-kit/src/calendar.ts: holidays are found by scanning each month's
 * days rather than by weekday arithmetic, so the two implementations can check each other.
 *
 * 12 CFR 1026.2(a)(6):
 * - general: days the creditor is open, taken as Monday to Friday except the weekday on which a
 *   federal holiday is observed;
 * - specific: every day except Sundays and the legal public holidays of 5 U.S.C. 6103(a). Like
 *   demo-kit, the cautious reading is used: a weekend holiday excludes both its own date and the
 *   weekday it is observed on.
 */

const DAY = 86_400_000;

const parse = (date: string): number => {
  const ms = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(ms)) throw new Error(`bad date ${date}`);
  return ms;
};
const format = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
const weekday = (date: string): number => new Date(parse(date)).getUTCDay();

/** Every day of `month` (1–12) in `year` that falls on `dow`, in order. */
function daysOn(year: number, month: number, dow: number): string[] {
  const out: string[] = [];
  for (let d = 1; d <= 31; d++) {
    const ms = Date.UTC(year, month - 1, d);
    if (new Date(ms).getUTCMonth() !== month - 1) break;
    if (new Date(ms).getUTCDay() === dow) out.push(format(ms));
  }
  return out;
}

/** Legal public holidays (5 U.S.C. 6103(a)) for `year`: actual dates. */
export function legalHolidays(year: number): string[] {
  const mondays = (m: number) => daysOn(year, m, 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fixed = (m: number, d: number) => `${year}-${pad(m)}-${pad(d)}`;
  const list = [
    fixed(1, 1),
    mondays(1)[2], // third Monday of January
    mondays(2)[2], // third Monday of February
    mondays(5).at(-1), // last Monday of May
    fixed(7, 4),
    mondays(9)[0], // first Monday of September
    mondays(10)[1], // second Monday of October
    fixed(11, 11),
    daysOn(year, 11, 4)[3], // fourth Thursday of November
    fixed(12, 25),
  ];
  if (year >= 2021) list.push(fixed(6, 19));
  return list.filter((d): d is string => d !== undefined).sort();
}

/** The weekday a holiday is observed on (Saturday → Friday, Sunday → Monday). */
function observed(date: string): string {
  const dow = weekday(date);
  if (dow === 6) return format(parse(date) - DAY);
  if (dow === 0) return format(parse(date) + DAY);
  return date;
}

function holidaySets(year: number): { actual: Set<string>; observed: Set<string> } {
  const actual = new Set<string>();
  const obs = new Set<string>();
  for (const y of [year - 1, year, year + 1]) {
    for (const h of legalHolidays(y)) {
      actual.add(h);
      obs.add(observed(h));
    }
  }
  return { actual, observed: obs };
}

export type Rule = "general" | "specific";

export function isBusinessDay(date: string, rule: Rule): boolean {
  const { actual, observed: obs } = holidaySets(Number(date.slice(0, 4)));
  const dow = weekday(date);
  if (rule === "general") return dow !== 0 && dow !== 6 && !obs.has(date);
  return dow !== 0 && !actual.has(date) && !obs.has(date);
}

/** Business days strictly after `from`, up to and including `to` (negative if `to` is earlier). */
export function countBusinessDays(from: string, to: string, rule: Rule): number {
  const a = parse(from);
  const b = parse(to);
  const [lo, hi, sign] = a <= b ? [a, b, 1] : [b, a, -1];
  let n = 0;
  for (let ms = lo + DAY; ms <= hi; ms += DAY) if (isBusinessDay(format(ms), rule)) n++;
  return sign * n;
}

/** The `n`th business day after `date` (n ≥ 1). */
export function nthBusinessDayAfter(date: string, n: number, rule: Rule): string {
  let ms = parse(date);
  for (let left = n; left > 0; ) {
    ms += DAY;
    if (isBusinessDay(format(ms), rule)) left--;
  }
  return format(ms);
}

/** UTC calendar date of an ISO date-time. */
export const dateOf = (iso: string): string => format(Date.parse(iso));
