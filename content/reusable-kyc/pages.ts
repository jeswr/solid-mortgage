// AUTHORED-BY Claude Opus 5.5
/**
 * Which pages belong to the reusable-KYC demo, without the demo's tour or grants: an app that
 * hosts a few of its pages imports this on every page and loads `./mount.js` only on those pages,
 * so the demo adds nothing to the first load of its own screens (acceptance test 15).
 * `./mount.js` re-exports these names.
 */

import type { AppSlug } from "@mortgage/demo-kit/registry";
import { DEMO } from "./facts.js";

/** The apps with pages in this demo, and the path prefix those pages live under. */
export const REUSABLE_KYC_PAGES: Readonly<Partial<Record<AppSlug, string>>> = Object.freeze({
  bank: "kyc",
  "card-issuer": "",
  wallet: "kyc",
});

/**
 * Does this page belong to the reusable-KYC demo? `pathname` is the full path (`/bank/kyc`).
 * Every page of the card-issuer app does; in the bank and the wallet, the pages under `kyc/`. A
 * `?tour=` parameter naming this demo also counts; one naming another demo does not.
 */
export function isReusableKycPage(pathname: string, app: AppSlug, search = ""): boolean {
  const tour = new URLSearchParams(search).get("tour");
  if (tour === DEMO) return true;
  if (tour !== null && tour !== "off") return false;
  const prefix = REUSABLE_KYC_PAGES[app];
  if (prefix === undefined) return false;
  if (prefix === "") return true;
  const inApp = pathname.replace(/^\/[^/]+\/?/, "");
  return inApp === prefix || inApp.startsWith(`${prefix}/`);
}
