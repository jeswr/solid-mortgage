// AUTHORED-BY Claude Opus 5.5
/**
 * Which pages belong to the small-dollar lending demo, and who is signed in on them, without the
 * demo's tour or grants: an app that hosts a few lending pages imports this on every page and
 * loads `./mount.js` only on those pages, so the demo adds nothing to the first load of its own
 * screens (acceptance test 15).
 * `./mount.js` re-exports these names.
 */

import { HOLDERS } from "@mortgage/demo-kit/holders";
import type { AppSlug } from "@mortgage/demo-kit/registry";
import { DEMO } from "./facts.js";

/** The apps with pages in this demo, and the path prefix those pages live under ("" = all). */
export const SMALL_DOLLAR_PAGES: Readonly<Partial<Record<AppSlug, string>>> = Object.freeze({
  bank: "lending",
  bureau: "lending",
  "fintech-lender": "",
  idv: "",
  payout: "",
  payroll: "lending",
  wallet: "lending",
});

/**
 * Does this page belong to the lending demo? `pathname` is the full path (`/bank/lending/…`).
 * Every page of the three lending apps does; in the other apps, the pages under `lending/`. A
 * `?tour=` parameter naming this demo also counts; one naming another demo does not.
 */
export function isSmallDollarPage(pathname: string, app: AppSlug, search = ""): boolean {
  const tour = new URLSearchParams(search).get("tour");
  if (tour === DEMO) return true;
  if (tour !== null && tour !== "off") return false;
  const prefix = SMALL_DOLLAR_PAGES[app];
  if (prefix === undefined) return false;
  if (prefix === "") return true;
  const inApp = pathname.replace(/^\/[^/]+\/?/, "");
  return inApp === prefix || inApp.startsWith(`${prefix}/`);
}

/**
 * Who an organisation app's trust banner says is signed in on a lending page: Maya, in the role
 * the app gives its consumer ("online banking"), not the app's mortgage persona.
 */
export function smallDollarPersona(role?: string): { name: string; role?: string } {
  return role === undefined ? { name: HOLDERS.maya.name } : { name: HOLDERS.maya.name, role };
}
