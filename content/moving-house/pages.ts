// AUTHORED-BY Claude Opus 5.5
/**
 * Which pages belong to the moving-house demo, without the demo's tour or grants: an app that
 * hosts a few moving-house pages imports this on every page and loads `./mount.js` only on
 * those pages, so the demo adds nothing to the first load of its own screens (acceptance
 * test 15). `./mount.js` re-exports both names.
 */

import type { AppSlug } from "@mortgage/demo-kit/registry";
import { DEMO } from "./facts.js";

/** The apps with pages in this demo, and the path prefix those pages live under. */
export const MOVING_HOUSE_PAGES: Readonly<Partial<Record<AppSlug, string>>> = Object.freeze({
  bank: "moving",
  county: "moving",
  insurer: "moving",
  payroll: "moving",
  servicer: "moving",
  state: "",
  wallet: "moving",
});

/**
 * Does this page belong to the moving-house demo? `pathname` is the full path (`/county/moving/…`).
 * Every page of the state app does; in the other apps, the pages under `moving/`. A `?tour=`
 * parameter naming this demo also counts.
 */
export function isMovingHousePage(pathname: string, app: AppSlug, search = ""): boolean {
  const tour = new URLSearchParams(search).get("tour");
  if (tour === DEMO) return true;
  if (tour !== null && tour !== "off") return false;
  const prefix = MOVING_HOUSE_PAGES[app];
  if (prefix === undefined) return false;
  if (prefix === "") return true;
  const inApp = pathname.replace(/^\/[^/]+\/?/, "");
  return inApp === prefix || inApp.startsWith(`${prefix}/`);
}
