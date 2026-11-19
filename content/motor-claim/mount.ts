// AUTHORED-BY Claude Opus 5.5
/**
 * What an app passes to `mountDemo()` on a motor-claim page, mirroring `../moving-house/mount.ts`:
 * Alex's drawers, the grant handles (P1, C1, C2), the bookkeeping drawers, the caveat under a
 * refusal after the claim closes, and the tour. `isMotorClaimPage` tells an app which demo a page
 * belongs to.
 *
 *   const motor = isMotorClaimPage(location.pathname, "repairer", location.search);
 *   mountDemo({ app, registry: ORGS, holder: MOTOR_CLAIM_HOLDER, runtime,
 *     ...(motor ? { tour: motorClaimTour(), lens: motorClaimLens() } : other) });
 */

import type { TourStep } from "@mortgage/demo-kit/contracts";
import { HOLDERS, type HolderId } from "@mortgage/demo-kit/holders";
import type { AppSlug } from "@mortgage/demo-kit/registry";
import { appUrl } from "@mortgage/demo-kit/urls";
import { DEMO } from "./facts.js";
import { MOTOR_CODES, MOTOR_GRANTS } from "./grants.js";
import { TOUR } from "./tour.js";

/** The motor claim's holder, from the holder registry: Alex. */
export const MOTOR_CLAIM_HOLDER: Readonly<{ id: HolderId; name: string }> = Object.freeze({
  id: HOLDERS.alex.id,
  name: HOLDERS.alex.short,
});

export const MOTOR_CLAIM_DRAWERS: readonly { path: string; label: string }[] = Object.freeze([
  { label: "Identity", path: "/identity/" },
  { label: "Insurance", path: "/insurance/" },
  { label: "Claims", path: "/claims/" },
  { label: "Inbox", path: "/inbox/" },
  { label: "Policies", path: "/policies/" },
  { label: "Consent records", path: "/consents/" },
]);

/** The caveat under a refused read after a grant ended (`{org}` and `{holder}` are filled in). */
export const MOTOR_CLAIM_REVOKE_CAVEAT =
  "{org} keeps the records it is required to keep about the job. What has ended is its access to {holder}'s claim file at source.";

export interface MotorClaimLensOptions {
  drawers: { path: string; label: string }[];
  grants: Record<string, { label: string; purpose?: string; until?: string }>;
  recordDrawers: string[];
  revokeCaveat: string;
  grantsHref: string;
  ledgerHref: string;
}

export function motorClaimLens(): MotorClaimLensOptions {
  const grants: MotorClaimLensOptions["grants"] = {};
  for (const code of MOTOR_CODES) {
    const spec = MOTOR_GRANTS[code];
    grants[`/policies/${code.toLowerCase()}`] = {
      label: code,
      purpose: spec.description,
      until: spec.endLabel,
    };
  }
  return {
    drawers: MOTOR_CLAIM_DRAWERS.map((drawer) => ({ ...drawer })),
    grants,
    grantsHref: appUrl("wallet", "claim/sharing"),
    ledgerHref: appUrl("wallet", "claim/sharing"),
    recordDrawers: ["/inbox/", "/policies/", "/consents/"],
    revokeCaveat: MOTOR_CLAIM_REVOKE_CAVEAT,
  };
}

/** The tour (`mountDemo({ tour })`), with the holder whose pod it centres on. */
export function motorClaimTour(): { demo: string; holder: HolderId; steps: TourStep[] } {
  return { demo: DEMO, holder: MOTOR_CLAIM_HOLDER.id, steps: [...TOUR] };
}

/** The apps with pages in this demo, and the path prefix those pages live under. */
export const MOTOR_CLAIM_PAGES: Readonly<Partial<Record<AppSlug, string>>> = Object.freeze({
  insurer: "claims",
  repairer: "",
  wallet: "claim",
});

/**
 * Does this page belong to the motor-claim demo? `pathname` is the full path (`/insurer/claims/…`).
 * Every page of the repairer app does; in the wallet and the insurer, the pages under their
 * prefix. A `?tour=` parameter naming this demo also counts.
 */
export function isMotorClaimPage(pathname: string, app: AppSlug, search = ""): boolean {
  const tour = new URLSearchParams(search).get("tour");
  if (tour === DEMO) return true;
  if (tour !== null && tour !== "off") return false;
  const prefix = MOTOR_CLAIM_PAGES[app];
  if (prefix === undefined) return false;
  if (prefix === "") return true;
  const inApp = pathname.replace(/^\/[^/]+\/?/, "");
  return inApp === prefix || inApp.startsWith(`${prefix}/`);
}

/** The simulated day of a tour step (pages follow it in the guided tour). */
export function dayOfStep(stepId: string | undefined): number | undefined {
  return TOUR.find((step) => step.id === stepId)?.clock?.day;
}
