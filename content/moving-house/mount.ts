// AUTHORED-BY Claude Opus 5.5
/**
 * What an app passes to `mountDemo()` on a moving-house page, mirroring `../mortgage/mount.ts`:
 * Alex's drawers, the H grant handles, the bookkeeping drawers, the caveat under a refusal after
 * the revoke, and the tour. `isMovingHousePage` tells an app which demo a page belongs to.
 *
 *   const moving = isMovingHousePage(location.pathname, "county");
 *   mountDemo({ app, registry: ORGS, holder: MOVING_HOUSE_HOLDER, runtime,
 *     ...(moving ? { tour: movingHouseTour(), lens: movingHouseLens() } : mortgage) });
 */

import type { TourStep } from "@mortgage/demo-kit/contracts";
import type { AppSlug } from "@mortgage/demo-kit/registry";
import { appUrl } from "@mortgage/demo-kit/urls";
import { DEMO } from "./facts.js";
import { HOLDER_CODES, HOLDER_GRANTS, PURPOSE_TEXT, UNTIL_LABEL } from "./grants.js";
import { TOUR } from "./tour.js";

export const MOVING_HOUSE_HOLDER = Object.freeze({ name: "Alex" });

export const MOVING_HOUSE_DRAWERS: readonly { path: string; label: string }[] = Object.freeze([
  { label: "Profile", path: "/profile/" },
  { label: "Identity", path: "/identity/" },
  { label: "Mortgage", path: "/mortgage/" },
  { label: "Inbox", path: "/inbox/" },
  { label: "Policies", path: "/policies/" },
  { label: "Consent records", path: "/consents/" },
]);

/** The caveat under a refused read after a withdrawal (`{org}` and `{holder}` are filled in). */
export const MOVING_HOUSE_REVOKE_CAVEAT =
  "{org} keeps the records it is required to keep. What has ended is its access to {holder}'s address at source.";

export interface MovingHouseLensOptions {
  drawers: { path: string; label: string }[];
  grants: Record<string, { label: string; purpose?: string; until?: string }>;
  recordDrawers: string[];
  revokeCaveat: string;
  grantsHref: string;
  ledgerHref: string;
}

export function movingHouseLens(): MovingHouseLensOptions {
  const grants: MovingHouseLensOptions["grants"] = {};
  for (const code of HOLDER_CODES) {
    grants[`/policies/${code.toLowerCase()}`] = {
      label: code,
      purpose: `${PURPOSE_TEXT}: ${HOLDER_GRANTS[code].use.toLowerCase()}`,
      until: UNTIL_LABEL,
    };
  }
  return {
    drawers: MOVING_HOUSE_DRAWERS.map((drawer) => ({ ...drawer })),
    grants,
    grantsHref: appUrl("wallet", "moving/sharing"),
    ledgerHref: appUrl("wallet", "moving/ledger"),
    recordDrawers: ["/inbox/", "/policies/", "/consents/"],
    revokeCaveat: MOVING_HOUSE_REVOKE_CAVEAT,
  };
}

export function movingHouseTour(): { demo: string; steps: TourStep[] } {
  return { demo: DEMO, steps: [...TOUR] };
}

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

/** The simulated day of a tour step (pages follow it in the guided tour). */
export function dayOfStep(stepId: string | undefined): number | undefined {
  return TOUR.find((step) => step.id === stepId)?.clock?.day;
}
