// AUTHORED-BY Claude Opus 5.5
/**
 * Which pages belong to the small business loan demo, without the demo's tour or grants: an app
 * that hosts a few of its pages imports this on every page and loads `./mount.js` only on those
 * pages, so the demo adds nothing to the first load of its own screens (acceptance test 15).
 * `./mount.js` re-exports these names.
 *
 * Check it BEFORE `isBusinessKybPage`: demo 3 claims every page of the business-lender app.
 */

import type { AppSlug } from "@mortgage/demo-kit/registry";
import { DEMO } from "./facts.js";

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
