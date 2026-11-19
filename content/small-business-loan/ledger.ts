// AUTHORED-BY Claude Opus 5.5
/**
 * Step 9's totals, computed from the journey's log (the Lens entries the pod runtime emitted),
 * never typed in: the organisations that put data into Northwind's pod for the loan (the issuers:
 * the bank that wrote the cash flow record, the department that signed the tax credential), the
 * lenders that read it, the decisions written back, the reads and the refusals.
 */

import { FIBO } from "@mortgage/data-model";
import type { LensEntry, PodEvent } from "@mortgage/demo-kit/contracts";
import { HOLDER, PATHS } from "./facts.js";

export interface LoanTotals {
  /** Organisations whose data reached Northwind's cash flow record or tax credential. */
  readonly issuers: number;
  /** Organisations that read Northwind's cash flow record. */
  readonly lenders: number;
  /** Underwriting decisions organisations wrote into Northwind's pod. */
  readonly decisions: number;
  /** Successful reads of Northwind's loan resources by organisations. */
  readonly reads: number;
  /** Reads of Northwind's pod the pod refused. */
  readonly denied: number;
  readonly issuerOrgs: readonly string[];
  readonly lenderOrgs: readonly string[];
}

type Pod = Extract<LensEntry, { source: "pod" }>;

const CASH_FLOW = `/${PATHS.cashFlow}`;
const TAX = `/${PATHS.tax}`;
const LOAN_READS = new Set([`/${PATHS.identity}`, `/${PATHS.ownership}`, TAX, CASH_FLOW]);

const pathOf = (event: PodEvent) => event.path.split("?")[0] ?? event.path;
const ok = (event: PodEvent) => event.status >= 200 && event.status < 300;

/** The pod owner a WebID names (`…/pods/<owner>/profile/card#me`). */
export function ownerOfWebid(webid: string): string | undefined {
  return /\/pods\/([^/]+)\/profile\/card#me$/.exec(webid)?.[1];
}

export function loanTotals(entries: Iterable<LensEntry>): LoanTotals {
  const issuers = new Set<string>();
  const lenders = new Set<string>();
  const decisions = new Set<string>();
  let reads = 0;
  let denied = 0;
  for (const entry of entries) {
    if (entry.source !== "pod" || entry.pod !== HOLDER) continue;
    const event: Pod = entry;
    const path = pathOf(event);
    const byOrg = event.actor.org !== HOLDER;
    if (event.kind === "denied" && byOrg) denied += 1;
    if (!ok(event)) continue;
    if (event.kind === "write") {
      if (path === CASH_FLOW && byOrg) issuers.add(event.actor.org);
      const issuer = event.resource?.credential?.issuer;
      if (path === TAX && issuer !== undefined) {
        const owner = ownerOfWebid(issuer);
        if (owner !== undefined) issuers.add(owner);
      }
      if (byOrg && event.resource?.types.includes(FIBO.UnderwritingDecision)) decisions.add(path);
    }
    if (event.kind === "read" && event.method === "GET" && byOrg && LOAN_READS.has(path)) {
      reads += 1;
      if (path === CASH_FLOW) lenders.add(event.actor.org);
    }
  }
  return {
    decisions: decisions.size,
    denied,
    issuerOrgs: [...issuers].sort(),
    issuers: issuers.size,
    lenderOrgs: [...lenders].sort(),
    lenders: lenders.size,
    reads,
  };
}
