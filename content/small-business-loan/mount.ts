// AUTHORED-BY Claude Opus 5.5
/**
 * What an app passes to `mountDemo()` on a small business loan page, mirroring
 * `../business-kyb/mount.ts`: Northwind's drawers, the S grant handles, the bookkeeping drawers,
 * the caveat under a refusal after the withdrawal, the tour, and the obligations the examiner view
 * checks against the log.
 *
 *   const loan = isSmallBusinessLoanPage(location.pathname, "bank", location.search);
 *   mountDemo({ app, registry: ORGS, holder: SMALL_BUSINESS_LOAN_HOLDER, runtime,
 *     ...(loan ? { tour: smallBusinessLoanTour(), lens: smallBusinessLoanLens(),
 *       ledger: { compliance: [...LOAN_COMPLIANCE] } } : other) });
 *
 * Check it BEFORE `isBusinessKybPage`: demo 3 claims every page of the business-lender app.
 */

import type { TourStep } from "@mortgage/demo-kit/contracts";
import { HOLDERS, type HolderId } from "@mortgage/demo-kit/holders";
import type { AppSlug } from "@mortgage/demo-kit/registry";
import { appUrl } from "@mortgage/demo-kit/urls";
import { DEMO, PATHS } from "./facts.js";
import { LOAN_GRANT_CODES, LOAN_GRANTS } from "./grants.js";
import { TOUR } from "./tour.js";

/** The demo's holder, from the holder registry: Northwind Logistics LLC. */
export const SMALL_BUSINESS_LOAN_HOLDER: Readonly<{ id: HolderId; name: string }> = Object.freeze({
  id: HOLDERS.northwind.id,
  name: HOLDERS.northwind.short,
});

export const SMALL_BUSINESS_LOAN_DRAWERS: readonly { path: string; label: string }[] =
  Object.freeze([
    { label: "Profile", path: "/profile/" },
    { label: "Credentials", path: `/${PATHS.credentials}` },
    { label: "Finance", path: `/${PATHS.finance}` },
    { label: "Loans", path: `/${PATHS.loans}` },
    { label: "Inbox", path: `/${PATHS.inbox}` },
    { label: "Policies", path: "/policies/" },
    { label: "Consent records", path: "/consents/" },
  ]);

/** The caveat under a refused read after a withdrawal (`{org}` and `{holder}` are filled in). */
export const SMALL_BUSINESS_LOAN_REVOKE_CAVEAT =
  "{org} keeps its own credit file, as lenders must. What has ended is its access to {holder}'s cash flow at source.";

export interface SmallBusinessLoanLensOptions {
  drawers: { path: string; label: string }[];
  grants: Record<string, { label: string; purpose?: string; until?: string }>;
  recordDrawers: string[];
  revokeCaveat: string;
  grantsHref: string;
  ledgerHref: string;
}

export function smallBusinessLoanLens(): SmallBusinessLoanLensOptions {
  const grants: SmallBusinessLoanLensOptions["grants"] = {};
  for (const code of LOAN_GRANT_CODES) {
    const spec = LOAN_GRANTS[code];
    grants[`/policies/${code.toLowerCase()}`] = {
      label: code,
      purpose: spec.purposeText,
      until: spec.untilLabel,
    };
  }
  return {
    drawers: SMALL_BUSINESS_LOAN_DRAWERS.map((drawer) => ({ ...drawer })),
    grants,
    grantsHref: appUrl("wallet", "loan/sharing"),
    ledgerHref: appUrl("wallet", "loan/ledger"),
    recordDrawers: [`/${PATHS.inbox}`, "/policies/", "/consents/"],
    revokeCaveat: SMALL_BUSINESS_LOAN_REVOKE_CAVEAT,
  };
}

/** The tour (`mountDemo({ tour })`), with the holder whose pod it centres on. */
export function smallBusinessLoanTour(): { demo: string; holder: HolderId; steps: TourStep[] } {
  return { demo: DEMO, holder: SMALL_BUSINESS_LOAN_HOLDER.id, steps: [...TOUR] };
}

const REG_B = "https://www.ecfr.gov/current/title-12/chapter-X/part-1002/section-1002.9";
const REG_B_RECORDS = "https://www.ecfr.gov/current/title-12/chapter-X/part-1002/section-1002.12";

/** An obligation the examiner view checks against the log (see `../business-kyb/mount.ts`). */
export interface LoanComplianceItem {
  id: string;
  obligation: string;
  rule: string;
  source?: string;
  evidence: Record<string, unknown>[];
}

export const LOAN_COMPLIANCE: readonly LoanComplianceItem[] = Object.freeze([
  {
    evidence: [
      { kind: "write", path: `/${PATHS.decision}`, pod: "northwind" },
      { kind: "write", path: `/${PATHS.notice}`, pod: "northwind" },
    ],
    id: "notice-of-action",
    obligation: "Notify the applicant of the action taken on a completed application",
    rule: "12 CFR 1002.9(a)(1)(i)",
    source: REG_B,
  },
  {
    evidence: [
      { kind: "write", path: "/credit/northwind/assessment", pod: "business-lender" },
      { kind: "write", path: `/${PATHS.terms}`, pod: "northwind" },
    ],
    id: "retain-records",
    obligation: "Retain the application records and the notice",
    rule: "12 CFR 1002.12(b)",
    source: REG_B_RECORDS,
  },
  {
    evidence: [
      { actor: { org: "business-lender" }, kind: "read", path: `/${PATHS.cashFlow}`, status: 200 },
      { kind: "write", path: "/credit/northwind/covenant-test-q1", pod: "business-lender" },
    ],
    id: "covenant-monitoring",
    obligation: "Test the loan's financial covenants each quarter",
    rule: "Loan agreement, covenants",
  },
  {
    evidence: [
      { kind: "write", path: "/consents/s3-withdrawn", pod: "northwind" },
      { actor: { org: "business-lender" }, kind: "denied", path: `/${PATHS.cashFlow}` },
    ],
    id: "access-ends",
    obligation: "Stop reading the borrower's data once the loan is repaid",
    rule: "Grant S3, ends on repayment",
  },
]);

/** The apps with pages in this demo, and the path prefix those pages live under. */
export const SMALL_BUSINESS_LOAN_PAGES: Readonly<Partial<Record<AppSlug, string>>> = Object.freeze({
  bank: "business",
  "business-lender": "loan",
  state: "revenue",
  wallet: "loan",
});

/**
 * Does this page belong to the small business loan demo? `pathname` is the full path
 * (`/bank/business/…`). A `?tour=` parameter naming this demo also counts; one naming another
 * demo does not.
 */
export function isSmallBusinessLoanPage(pathname: string, app: AppSlug, search = ""): boolean {
  const tour = new URLSearchParams(search).get("tour");
  if (tour === DEMO) return true;
  if (tour !== null && tour !== "off") return false;
  const prefix = SMALL_BUSINESS_LOAN_PAGES[app];
  if (prefix === undefined) return false;
  const inApp = pathname.replace(/^\/[^/]+\/?/, "").replace(/\/$/, "");
  return inApp === prefix || inApp.startsWith(`${prefix}/`);
}

/** The simulated day of a tour step (pages follow it in the guided tour). */
export function dayOfStep(stepId: string | undefined): number | undefined {
  return TOUR.find((step) => step.id === stepId)?.clock?.day;
}

export { DEMO };
