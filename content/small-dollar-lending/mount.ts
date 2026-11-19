// AUTHORED-BY Claude Opus 5.5
/**
 * What an app passes to `mountDemo()` on a lending page, mirroring `../moving-house/mount.ts`:
 * Maya's drawers, the grant handles, the bookkeeping drawers, the caveat under a refusal after the
 * withdrawal, and the tour. `isSmallDollarPage` tells an app which demo a page belongs to.
 *
 *   const lending = isSmallDollarPage(location.pathname, "bank", location.search);
 *   mountDemo({ app, registry: ORGS, runtime,
 *     ...(lending ? { holder: SMALL_DOLLAR_HOLDER, tour: smallDollarTour(),
 *       lens: smallDollarLens() } : mortgage) });
 */

import type { TourStep } from "@mortgage/demo-kit/contracts";
import { HOLDERS, type HolderId } from "@mortgage/demo-kit/holders";
import type { AppSlug } from "@mortgage/demo-kit/registry";
import { appUrl } from "@mortgage/demo-kit/urls";
import { DEMO } from "./facts.js";
import { LENDING_GRANT_CODES, LENDING_GRANTS } from "./grants.js";
import { TOUR } from "./tour.js";

/** The lending demo's holder, from the holder registry: Maya Torres. */
export const SMALL_DOLLAR_HOLDER: Readonly<{ id: HolderId; name: string }> = Object.freeze({
  id: HOLDERS.maya.id,
  name: HOLDERS.maya.short,
});

export const SMALL_DOLLAR_DRAWERS: readonly { path: string; label: string }[] = Object.freeze([
  { label: "Profile", path: "/profile/" },
  { label: "Credentials", path: "/credentials/" },
  { label: "Loans", path: "/loans/" },
  { label: "Banking", path: "/banking/" },
  { label: "Inbox", path: "/inbox/" },
  { label: "Policies", path: "/policies/" },
  { label: "Consent records", path: "/consents/" },
]);

/** The caveat under a refused read after the withdrawal (`{org}` and `{holder}` are filled in). */
export const SMALL_DOLLAR_REVOKE_CAVEAT =
  "{org} keeps the loan records the law requires. What has ended is its access to {holder}'s pod.";

export interface SmallDollarLensOptions {
  drawers: { path: string; label: string }[];
  grants: Record<string, { label: string; purpose?: string; until?: string }>;
  recordDrawers: string[];
  revokeCaveat: string;
  grantsHref: string;
  ledgerHref: string;
}

export function smallDollarLens(): SmallDollarLensOptions {
  const grants: SmallDollarLensOptions["grants"] = {};
  for (const code of LENDING_GRANT_CODES) {
    const spec = LENDING_GRANTS[code];
    grants[`/policies/${code.toLowerCase()}`] = {
      label: code,
      purpose: spec.description,
      until: spec.endLabel,
    };
  }
  return {
    drawers: SMALL_DOLLAR_DRAWERS.map((drawer) => ({ ...drawer })),
    grants,
    grantsHref: appUrl("wallet", "lending/sharing"),
    ledgerHref: appUrl("wallet", "lending/ledger"),
    recordDrawers: ["/inbox/", "/policies/", "/consents/", "/banking/"],
    revokeCaveat: SMALL_DOLLAR_REVOKE_CAVEAT,
  };
}

/** The tour (`mountDemo({ tour })`), with the holder whose pod it centres on. */
export function smallDollarTour(): { demo: string; holder: HolderId; steps: TourStep[] } {
  return { demo: DEMO, holder: SMALL_DOLLAR_HOLDER.id, steps: [...TOUR] };
}

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

/** The simulated day of a tour step (pages follow it in the guided tour). */
export function dayOfStep(stepId: string | undefined): number | undefined {
  return TOUR.find((step) => step.id === stepId)?.clock?.day;
}
