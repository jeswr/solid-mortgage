// AUTHORED-BY Claude Opus 5.5
/**
 * What every mortgage app passes to `mountDemo()` (`@mortgage/tour/mount`), so the Lens reads the
 * same in every app: Alex's drawers in order, the grant handles, the bookkeeping drawers, the
 * caveat under a refusal after the revoke, and the tour itself.
 *
 * The objects are typed structurally: content does not depend on the tour or Lens packages.
 *
 *   mountDemo({ app, registry: ORGS, holder: MORTGAGE_HOLDER, runtime, tour: mortgageTour(),
 *     lens: mortgageLens() });
 */

import type { TourStep } from "@mortgage/demo-kit/contracts";
import { appUrl } from "@mortgage/demo-kit/urls";
import { GRANT_CODES, GRANTS } from "./grants.js";
import { DEMO, SOURCE_IDS, TOUR } from "./tour.js";

export const MORTGAGE_HOLDER = Object.freeze({ name: "Alex" });

/** The top-level drawers of Alex's pod (design.md section b.4), in cabinet order. */
export const MORTGAGE_DRAWERS: readonly { path: string; label: string }[] = Object.freeze([
  { label: "Profile", path: "/profile/" },
  { label: "Identity", path: "/identity/" },
  { label: "Credentials", path: "/credentials/" },
  { label: "Property", path: "/property/" },
  { label: "Mortgage", path: "/mortgage/" },
  { label: "Insurance", path: "/insurance/" },
  { label: "Banking", path: "/banking/" },
  { label: "Inbox", path: "/inbox/" },
  { label: "Policies", path: "/policies/" },
  { label: "Consent records", path: "/consents/" },
]);

export interface MortgageLensOptions {
  drawers: { path: string; label: string }[];
  grants: Record<string, { label: string; purpose?: string; until?: string }>;
  recordDrawers: string[];
  revokeCaveat: string;
  grantsHref: string;
  ledgerHref: string;
}

/** The Lens options (`mountDemo({ lens })`). */
export function mortgageLens(): MortgageLensOptions {
  const grants: MortgageLensOptions["grants"] = {};
  for (const code of GRANT_CODES) {
    const spec = GRANTS[code];
    grants[`/policies/${code.toLowerCase()}`] = {
      label: code,
      purpose: spec.description,
      until: spec.endLabel,
    };
  }
  return {
    drawers: MORTGAGE_DRAWERS.map((drawer) => ({ ...drawer })),
    grants,
    // Access requests, agreements and consent records are bookkeeping, not documents.
    recordDrawers: ["/inbox/", "/policies/", "/consents/"],
    revokeCaveat:
      "{org} keeps the records the law requires it to keep. {holder}'s withdrawal stops any further reads of the pod.",
    grantsHref: appUrl("wallet", "sharing"),
    ledgerHref: appUrl("welcome", "journey"),
  };
}

/** The tour (`mountDemo({ tour })`). */
export function mortgageTour(): { demo: string; steps: TourStep[]; sources: string[] } {
  return { demo: DEMO, sources: [...SOURCE_IDS], steps: [...TOUR] };
}
