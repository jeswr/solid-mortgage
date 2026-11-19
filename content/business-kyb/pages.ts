// AUTHORED-BY Claude Opus 5.5
/**
 * Which pages belong to the business KYB demo, without the demo's tour or grants: an app that
 * hosts a few KYB pages imports this on every page and loads `./mount.js` only on those pages,
 * so the demo adds nothing to the first load of its own screens (acceptance test 15).
 * `./mount.js` re-exports these names.
 */

import type { AppSlug } from "@mortgage/demo-kit/registry";
import { DEMO } from "./facts.js";

/** The apps with pages in this demo, and the path prefix those pages live under. */
export const BUSINESS_KYB_PAGES: Readonly<Partial<Record<AppSlug, string>>> = Object.freeze({
  bank: "kyb",
  "business-lender": "",
  registry: "",
  wallet: "kyb",
});

/** The wallet's proving page (the cross-origin isolated route) belongs to this demo too. */
export const BUSINESS_KYB_PROVE_PATH = "prove/kyb";

/**
 * Does this page belong to the business KYB demo? `pathname` is the full path (`/bank/kyb/…`).
 * Every page of the registry and business-lender apps does; in the wallet and the bank, the pages
 * under `kyb/` (and the wallet's `prove/kyb`). A `?tour=` parameter naming this demo also counts.
 */
export function isBusinessKybPage(pathname: string, app: AppSlug, search = ""): boolean {
  const tour = new URLSearchParams(search).get("tour");
  if (tour === DEMO) return true;
  if (tour !== null && tour !== "off") return false;
  const prefix = BUSINESS_KYB_PAGES[app];
  if (prefix === undefined) return false;
  if (prefix === "") return true;
  const inApp = pathname.replace(/^\/[^/]+\/?/, "").replace(/\/$/, "");
  if (app === "wallet" && inApp === BUSINESS_KYB_PROVE_PATH) return true;
  return inApp === prefix || inApp.startsWith(`${prefix}/`);
}
