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

export { isSmallDollarPage, SMALL_DOLLAR_PAGES, smallDollarPersona } from "./pages.js";

/** The simulated day of a tour step (pages follow it in the guided tour). */
export function dayOfStep(stepId: string | undefined): number | undefined {
  return TOUR.find((step) => step.id === stepId)?.clock?.day;
}
