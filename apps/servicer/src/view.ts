// AUTHORED-BY Claude Opus 5.5
/** Pure view logic for Marigold's portal: no React, no requests. */
import { GRANTS } from "@mortgage/content/mortgage/grants";
import type { EscrowAccountStatement, PaymentMandate } from "@mortgage/data-model";
import { appUrl } from "@mortgage/demo-kit/urls";
import { hasWritten, hasWrittenUnder, type PodLog } from "./log.ts";

export const TABS = [
  { label: "Welcome", path: "/" },
  { label: "Connect", path: "/connect" },
  { label: "Account", path: "/account" },
  { label: "Escrow", path: "/escrow" },
  { label: "Insurance", path: "/insurance" },
] as const;

export const TRANSFER_NOTICE_PATH = "mortgage/servicing/transfer-notice";
export const ESCROW_PATH = "mortgage/servicing/escrow-statement";
export const CONTACT_PATH = "profile/contact";
export const MANDATE_PATH = "banking/payment-mandate";
export const EVIDENCE_PATH = "insurance/evidence-of-insurance";
/** Juniper's own notice that servicing will move (step 20, second beat). */
export const JUNIPER_NOTICE_PATH = "mortgage/juniper/servicing-transfer-notice";
/** Something Marigold never asked for, for the free-play check. */
export const NOT_ASKED_PATH = "credentials/employment-income";

export const usd = (amount: number, cents = true): string =>
  amount.toLocaleString("en-US", {
    currency: "USD",
    maximumFractionDigits: cents ? 2 : 0,
    minimumFractionDigits: cents ? 2 : 0,
    style: "currency",
  });

/** `2026-10-12` → "October 12, 2026", in UTC like the demo calendar. */
export const longDate = (date: Date): string =>
  date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });

export type Connection =
  /** Juniper has not yet said that servicing moves. */
  | "awaiting-notice"
  /** Marigold may ask. */
  | "ready"
  /** Marigold asked; Alex has not answered in the wallet. */
  | "requested"
  /** Alex approved G8; Marigold has not finished setting up the account. */
  | "approved"
  /** Notice and escrow statement delivered. */
  | "connected"
  /** G8 was withdrawn or ended. */
  | "ended";

/** Where the connection stands, from what the pods have answered. */
export function connection(log: PodLog): Connection {
  if (hasWritten(log, "alex", "/consents/g8-withdrawn")) return "ended";
  if (hasWritten(log, "alex", "/consents/g8-expired")) return "ended";
  if (hasWritten(log, "alex", `/${TRANSFER_NOTICE_PATH}`)) return "connected";
  if (hasWritten(log, "alex", "/consents/g8-given")) return "approved";
  if (hasWrittenUnder(log, "alex", "/inbox/request-g8")) return "requested";
  if (hasWritten(log, "alex", `/${JUNIPER_NOTICE_PATH}`)) return "ready";
  return "awaiting-notice";
}

/** True while G8 lets Marigold read. */
export const canRead = (state: Connection): boolean =>
  state === "approved" || state === "connected";

/** The pod path of Marigold's pending request, when one was posted. */
export function pendingRequestPath(log: PodLog): string | undefined {
  const key = [...log.written].find((entry) => entry.startsWith("alex:/inbox/request-g8"));
  return key?.slice("alex:".length);
}

/** What G8 asks for, from the grant's specification, in plain words. */
export function requestedItems(): { label: string; path: string; access: string }[] {
  const items: { label: string; path: string; access: string }[] = [];
  for (const permission of GRANTS.G8.permissions)
    for (const path of permission.paths)
      items.push({ access: permission.modes.join(" and "), label: describePath(path), path });
  return items;
}

export function describePath(path: string): string {
  switch (path) {
    case CONTACT_PATH:
      return "Contact details";
    case "insurance/":
      return "Proof of homeowner's insurance";
    case MANDATE_PATH:
      return "Autopay instruction";
    case "mortgage/servicing/":
      return "Your servicing drawer, for our notices";
    default:
      return path;
  }
}

/** The next debit on `debitDay` on or after `today` (`YYYY-MM-DD`). */
export function nextDebit(today: string, debitDay: number): Date {
  const [year, month, day] = today.split("-").map(Number) as [number, number, number];
  const thisMonth = new Date(Date.UTC(year, month - 1, debitDay));
  return day <= debitDay ? thisMonth : new Date(Date.UTC(year, month, debitDay));
}

export interface EscrowRow {
  readonly name: string;
  readonly yearly: number;
  readonly monthly: number;
}

/** The statement's line items with each one's monthly share, and the yearly total. */
export function escrowRows(statement: EscrowAccountStatement): {
  rows: EscrowRow[];
  yearly: number;
} {
  const rows = statement.lineItems.map((item) => ({
    monthly: Math.round((item.amountUsd / 12) * 100) / 100,
    name: item.name,
    yearly: item.amountUsd,
  }));
  return { rows, yearly: rows.reduce((sum, row) => sum + row.yearly, 0) };
}

/** True when the mandate lets Marigold collect (its payee is Marigold's WebID). */
export const mandateNamesUs = (mandate: PaymentMandate, ourWebid: string): boolean =>
  mandate.payeeIri === ourWebid;

/**
 * The hand-off to Alex's wallet (design.md §d.4): the request's URL and where to come back to.
 * Nothing else travels in the URL.
 */
export function handoffUrl(requestUrl: string): string {
  return appUrl("wallet", "requests", {
    request: requestUrl,
    return: appUrl("servicer", "connect", { from: "wallet" }),
  });
}
