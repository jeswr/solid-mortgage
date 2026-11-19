// AUTHORED-BY Claude Opus 5.5
/** Pure view logic for Ledgerly: formatting, the status-list entry of an issuance, payslips. */
import type { DemoCalendar } from "@mortgage/demo-kit/calendar";
import { ORG_SLUGS, type OrgRegistry, webidFor } from "@mortgage/demo-kit/registry";

export const usd = (amount: number): string =>
  `$${amount.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;

/** "12 Aug 2026" from a Date or an ISO date. */
export function shortDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(`${value.slice(0, 10)}T12:00:00Z`) : value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  });
}

/** The last segment of a URL's path: the name a record was filed under. */
export function lastSegment(url: string): string {
  return new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? "";
}

/** A pod-relative path with a leading slash, e.g. `/credentials/employment-income`. */
export function podPath(url: string): string {
  const match = /^\/pods\/[^/]+(\/.*)$/.exec(new URL(url).pathname);
  return match?.[1] ?? new URL(url).pathname;
}

/**
 * The seed the issuer used for a credential's status-list index. A first issuance uses the
 * credential's URL; a re-issue on day N files its record as `<name>-refresh-day-N` and uses
 * `<url>#refresh-day-N`, so the old and new credentials have separate entries.
 */
export function statusSeed(recordName: string, credentialUrl: string): string {
  const refresh = /-refresh-day-(\d+)$/.exec(recordName);
  return refresh === null ? credentialUrl : `${credentialUrl}#refresh-day-${refresh[1]}`;
}

/** The plain name of a credential class IRI (`…#EmploymentIncomeCredential`). */
export function credentialLabel(typeIri: string): string {
  const local = typeIri.slice(Math.max(typeIri.lastIndexOf("#"), typeIri.lastIndexOf("/")) + 1);
  const labels: Record<string, string> = {
    AssetCredential: "Asset verification",
    CreditScoreCredential: "Credit summary",
    EmploymentIncomeCredential: "Employment and income verification",
    IdentityCredential: "Identity credential",
    ZkOperandAnchor: "Proof anchor",
  };
  return labels[local] ?? local.replace(/([a-z])([A-Z])/g, "$1 $2");
}

/** Which organisation a WebID belongs to, by the registry. */
export function organisationOf(webid: string, registry: OrgRegistry, podOrigin: string): string {
  // Cairn is Alex's own app and acts as Alex: the WebID is the person, not the app.
  if (webidFor("alex", podOrigin) === webid) return "Alex Rivera";
  for (const slug of ORG_SLUGS) {
    const record = registry[slug];
    if (webidFor(record.actsAs, podOrigin) === webid) return record.organisation;
  }
  return webid;
}

export interface Payslip {
  readonly period: string;
  readonly payDate: string;
  readonly grossUsd: number;
}

/**
 * Monthly payslips from Northfield Engineering's payroll record: paid on the last business day
 * of each month, the most recent first. These are Ledgerly's own records; they never go to a pod.
 */
export function payslips(
  calendar: Pick<DemoCalendar, "dayOne">,
  monthlyGrossUsd: number,
  count = 6,
): Payslip[] {
  const [year, month] = calendar.dayOne.split("-").map(Number) as [number, number];
  const slips: Payslip[] = [];
  for (let back = 1; back <= count; back++) {
    const first = new Date(Date.UTC(year, month - 1 - back, 1));
    const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
    while (last.getUTCDay() === 0 || last.getUTCDay() === 6) last.setUTCDate(last.getUTCDate() - 1);
    slips.push({
      grossUsd: monthlyGrossUsd,
      payDate: last.toISOString().slice(0, 10),
      period: first.toLocaleDateString("en-GB", {
        month: "long",
        timeZone: "UTC",
        year: "numeric",
      }),
    });
  }
  return slips;
}

/** What a status a pod answered means, in Ledgerly's words. */
export function refusalText(status: number): string {
  if (status === 403)
    return "403 Forbidden: the pod refused. Ledgerly's grant lets it write this slot, not read it.";
  if (status === 401) return "401 Unauthorized: the pod refused an anonymous request.";
  if (status === 404) return "404 Not Found: nothing is there yet.";
  if (status >= 200 && status < 300) return `${status}: the pod answered.`;
  return `${status}: the pod could not answer.`;
}
