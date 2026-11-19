// AUTHORED-BY Claude Opus 5.5
/** Pure view logic for Copperfield: statements in words, the outcome, an illustrative quote. */
import { ORGS } from "@mortgage/content/orgs";
import { MORT } from "@mortgage/data-model";
import { ORG_SLUGS } from "@mortgage/demo-kit/registry";

const USD = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

export interface Statement {
  readonly field: string;
  readonly op: string;
  readonly bound: number;
}

const OPS: Record<string, string> = {
  ge: "at least",
  gt: "more than",
  le: "at most",
  lt: "less than",
};

/** "Monthly gross income is at least $7,000". */
export function statementText(statement: Statement): string {
  const op = OPS[statement.op] ?? statement.op;
  if (statement.field === MORT.monthlyGrossIncomeUsd)
    return `Monthly gross income is ${op} ${USD.format(statement.bound)}`;
  if (statement.field === MORT.creditScoreValue) return `Credit score is ${op} ${statement.bound}`;
  if (statement.field === MORT.totalMonthlyDebtUsd)
    return `Monthly debt payments are ${op} ${USD.format(statement.bound)}`;
  return `${statement.field} is ${op} ${statement.bound}`;
}

/** The organisation behind a WebID (`…/pods/<owner>/profile/card#me`), by name. */
export function organisationName(webid: string): string {
  let owner: string | undefined;
  try {
    owner = /^\/pods\/([^/]+)\/profile\/card$/.exec(new URL(webid).pathname)?.[1];
  } catch {
    return webid;
  }
  const slug = ORG_SLUGS.find((candidate) => ORGS[candidate].actsAs === owner);
  return slug === undefined ? webid : ORGS[slug].organisation;
}

/**
 * Copperfield's own result record says "Pre-qualified, …" or "Not pre-qualified: …" (written by
 * the verifier in content/mortgage/prequalification.ts).
 */
export function isQualified(description: string): boolean {
  return description.startsWith("Pre-qualified");
}

/** Every key path in a JSON value, so the screen can list exactly what arrived. */
export function keyPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    const inner = value.flatMap((item) => keyPaths(item, `${prefix}[]`));
    return [...new Set(inner.length === 0 ? [`${prefix}[]`] : inner)];
  }
  if (value !== null && typeof value === "object") {
    return [
      ...new Set(
        Object.entries(value).flatMap(([key, item]) => {
          const path = prefix === "" ? key : `${prefix}.${key}`;
          return item !== null && typeof item === "object" ? keyPaths(item, path) : [path];
        }),
      ),
    ];
  }
  return prefix === "" ? [] : [prefix];
}

/** Monthly principal and interest for an illustrative example. */
export function monthlyPayment(principal: number, ratePercent: number, months: number): number {
  const rate = ratePercent / 100 / 12;
  if (rate === 0) return principal / months;
  return (principal * rate) / (1 - (1 + rate) ** -months);
}

export function usd(amount: number): string {
  return USD.format(amount);
}
