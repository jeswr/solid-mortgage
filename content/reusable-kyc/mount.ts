// AUTHORED-BY Claude Opus 5.5
/**
 * What an app passes to `mountDemo()` on a reusable-KYC page, mirroring `../moving-house/mount.ts`:
 * Alex's drawers, the Y1 grant handle, the bookkeeping drawers, the caveat under a refusal, and the
 * tour. `isReusableKycPage` tells an app which demo a page belongs to.
 *
 *   const kyc = isReusableKycPage(location.pathname, "bank", location.search);
 *   mountDemo({ app, registry: ORGS, holder: REUSABLE_KYC_HOLDER, runtime,
 *     ...(kyc ? { tour: reusableKycTour(), lens: reusableKycLens() } : mortgage) });
 */

import type { TourStep } from "@mortgage/demo-kit/contracts";
import { HOLDERS, type HolderId } from "@mortgage/demo-kit/holders";
import { appUrl } from "@mortgage/demo-kit/urls";
import { DEMO, GRANT_CODE } from "./facts.js";
import { POLICY_PATH, PURPOSE_TEXT, UNTIL_LABEL } from "./grants.js";
import { TOUR } from "./tour.js";

/** The demo's holder, from the holder registry: Alex. */
export const REUSABLE_KYC_HOLDER: Readonly<{ id: HolderId; name: string }> = Object.freeze({
  id: HOLDERS.alex.id,
  name: HOLDERS.alex.short,
});

export const REUSABLE_KYC_DRAWERS: readonly { path: string; label: string }[] = Object.freeze([
  { label: "Credentials", path: "/credentials/" },
  { label: "Identity", path: "/identity/" },
  { label: "Profile", path: "/profile/" },
  { label: "Inbox", path: "/inbox/" },
  { label: "Policies", path: "/policies/" },
  { label: "Consent records", path: "/consents/" },
]);

/** The caveat under the refused read (`{org}` and `{holder}` are filled in). */
export const REUSABLE_KYC_REVOKE_CAVEAT =
  "{org} keeps its record of the check it made, as it must. What has ended is its access to {holder}'s statement.";

export interface ReusableKycLensOptions {
  drawers: { path: string; label: string }[];
  grants: Record<string, { label: string; purpose?: string; until?: string }>;
  recordDrawers: string[];
  revokeCaveat: string;
  grantsHref: string;
  ledgerHref: string;
}

export function reusableKycLens(): ReusableKycLensOptions {
  return {
    drawers: REUSABLE_KYC_DRAWERS.map((drawer) => ({ ...drawer })),
    grants: {
      [`/${POLICY_PATH}`]: { label: GRANT_CODE, purpose: PURPOSE_TEXT, until: UNTIL_LABEL },
    },
    grantsHref: appUrl("wallet", "kyc"),
    ledgerHref: appUrl("wallet", "kyc/ledger"),
    recordDrawers: ["/inbox/", "/policies/", "/consents/"],
    revokeCaveat: REUSABLE_KYC_REVOKE_CAVEAT,
  };
}

/** The tour (`mountDemo({ tour })`), with the holder whose pod it centres on. */
export function reusableKycTour(): { demo: string; holder: HolderId; steps: TourStep[] } {
  return { demo: DEMO, holder: REUSABLE_KYC_HOLDER.id, steps: [...TOUR] };
}

export { isReusableKycPage, REUSABLE_KYC_PAGES } from "./pages.js";

/** The simulated day of a tour step (pages follow it in the guided tour). */
export function dayOfStep(stepId: string | undefined): number | undefined {
  return TOUR.find((step) => step.id === stepId)?.clock?.day;
}
