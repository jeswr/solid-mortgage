// AUTHORED-BY Claude Opus 5.5
/**
 * Pure view logic for Quillon: plain dates and figures, organisation names, the inquiries log,
 * and what the pod's answers mean. A utility writes plainly.
 */
import { ORG_SLUGS, type OrgRegistry, webidFor } from "@mortgage/demo-kit/registry";

/** "2026-08-12": a bureau writes dates the way its forms do. */
export const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

/** "2026-08-12 11:05 UTC". */
export const stamp = (date: Date): string =>
  `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)} UTC`;

export const dollars = (amount: number): string =>
  `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export function lastSegment(url: string): string {
  return new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? "";
}

/** A pod-relative path with a leading slash. */
export function podPath(url: string): string {
  const match = /^\/pods\/[^/]+(\/.*)$/.exec(new URL(url).pathname);
  return match?.[1] ?? new URL(url).pathname;
}

export function credentialLabel(typeIri: string): string {
  const local = typeIri.slice(Math.max(typeIri.lastIndexOf("#"), typeIri.lastIndexOf("/")) + 1);
  const labels: Record<string, string> = {
    CreditScoreCredential: "Consumer credit summary",
    ZkOperandAnchor: "Score anchor (for proofs)",
  };
  return labels[local] ?? local.replace(/([a-z])([A-Z])/g, "$1 $2");
}

/** The organisation a WebID belongs to, by the registry. */
export function organisationOf(webid: string, registry: OrgRegistry, podOrigin: string): string {
  if (webidFor("alex", podOrigin) === webid) return "Alex Rivera (consumer)";
  for (const slug of ORG_SLUGS) {
    const record = registry[slug];
    if (webidFor(record.actsAs, podOrigin) === webid) return record.organisation;
  }
  return webid;
}

export interface Inquiry {
  readonly date: Date;
  readonly who: string;
  readonly kind: "hard" | "soft";
  readonly reason: string;
}

/**
 * The inquiries log: a lender's report order is a hard inquiry; the consumer's own disclosure
 * request is a soft one and does not affect the score. Most recent first.
 */
export function inquiries(
  orders: readonly { received: Date; from: string; report: unknown }[],
  disclosures: readonly { asOf: Date }[],
  nameOf: (webid: string) => string,
): Inquiry[] {
  const list: Inquiry[] = [
    ...orders
      .filter((order) => order.report !== undefined)
      .map((order) => ({
        date: order.received,
        kind: "hard" as const,
        reason: "Mortgage credit application",
        who: nameOf(order.from),
      })),
    ...disclosures.map((disclosure) => ({
      date: disclosure.asOf,
      kind: "soft" as const,
      reason: "Consumer disclosure (your own request)",
      who: "Alex Rivera",
    })),
  ];
  return list.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** What a status the pod answered means. */
export function podAnswer(status: number, what: "slot" | "authorisation"): string {
  if (status === 403) {
    return what === "slot"
      ? "403 Forbidden. Quillon may write this slot, not read it."
      : "403 Forbidden. No consent currently lets Quillon read this authorisation.";
  }
  if (status === 401) return "401 Unauthorized.";
  if (status === 404) return "404 Not Found. Nothing is there.";
  if (status === 200) {
    return what === "authorisation"
      ? "200 OK. The authorisation is readable under Alex's application consent."
      : "200 OK.";
  }
  return `${status}.`;
}
