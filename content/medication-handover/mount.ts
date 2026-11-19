// AUTHORED-BY Claude Opus 5.5
/**
 * What an app passes to `mountDemo()` on a medication-handover page, mirroring
 * `../moving-house/mount.ts`: Rosa's drawers, the M grant handles, the bookkeeping drawers, the
 * caveat under a refusal after the revoke, and the tour. `isMedicationPage` tells an app which
 * demo a page belongs to.
 *
 * Flows.md puts Rosa's records under one `health/` container. The Lens groups a pod by its
 * first-level drawers, and its Not shared view (step 5) has to show the pharmacy reading
 * medicines and allergies but not the discharge summary, so each of the three is a drawer of its
 * own: `medications/`, `allergies/` and `discharge/`.
 */

import type { TourStep } from "@mortgage/demo-kit/contracts";
import { HOLDERS, type HolderId } from "@mortgage/demo-kit/holders";
import type { AppSlug } from "@mortgage/demo-kit/registry";
import { appUrl } from "@mortgage/demo-kit/urls";
import { DEMO } from "./facts.js";
import { M1_UNTIL_LABEL, MED_CODES, MED_GRANTS, UNTIL_WITHDRAWN } from "./grants.js";
import { TOUR } from "./tour.js";

/** The demo's holder, from the holder registry: Rosa. */
export const MEDICATION_HOLDER: Readonly<{ id: HolderId; name: string }> = Object.freeze({
  id: HOLDERS.rosa.id,
  name: HOLDERS.rosa.short,
});

export const MEDICATION_DRAWERS: readonly { path: string; label: string }[] = Object.freeze([
  { label: "Medicines", path: "/medications/" },
  { label: "Allergies", path: "/allergies/" },
  { label: "Discharge summary", path: "/discharge/" },
  { label: "Inbox", path: "/inbox/" },
  { label: "Policies", path: "/policies/" },
  { label: "Consent records", path: "/consents/" },
]);

/** The caveat under a refused read after a withdrawal (`{org}` and `{holder}` are filled in). */
export const MEDICATION_REVOKE_CAVEAT =
  "{org} keeps the dispensing records it is required to keep. What has ended is its access to {holder}'s live medication list.";

export interface MedicationLensOptions {
  drawers: { path: string; label: string }[];
  grants: Record<string, { label: string; purpose?: string; until?: string }>;
  recordDrawers: string[];
  revokeCaveat: string;
  grantsHref: string;
  ledgerHref: string;
}

export function medicationLens(): MedicationLensOptions {
  const grants: MedicationLensOptions["grants"] = {};
  for (const code of MED_CODES) {
    grants[`/policies/${code.toLowerCase()}`] = {
      label: code,
      purpose: MED_GRANTS[code].purpose,
      until: code === "M1" ? M1_UNTIL_LABEL : UNTIL_WITHDRAWN,
    };
  }
  return {
    drawers: MEDICATION_DRAWERS.map((drawer) => ({ ...drawer })),
    grants,
    grantsHref: appUrl("wallet", "health/sharing"),
    ledgerHref: appUrl("wallet", "health/ledger"),
    recordDrawers: ["/inbox/", "/policies/", "/consents/"],
    revokeCaveat: MEDICATION_REVOKE_CAVEAT,
  };
}

/** The tour (`mountDemo({ tour })`), with the holder whose pod it centres on. */
export function medicationTour(): { demo: string; holder: HolderId; steps: TourStep[] } {
  return { demo: DEMO, holder: MEDICATION_HOLDER.id, steps: [...TOUR] };
}

/** The apps with pages in this demo, and the path prefix those pages live under. */
export const MEDICATION_PAGES: Readonly<Partial<Record<AppSlug, string>>> = Object.freeze({
  clinic: "",
  hospital: "",
  pharmacy: "",
  wallet: "health",
});

/**
 * Does this page belong to the medication handover? `pathname` is the full path
 * (`/wallet/health/…`). Every page of the hospital, pharmacy and clinic apps does; in the wallet,
 * the pages under `health/`. A `?tour=` parameter naming this demo also counts.
 */
export function isMedicationPage(pathname: string, app: AppSlug, search = ""): boolean {
  const tour = new URLSearchParams(search).get("tour");
  if (tour === DEMO) return true;
  if (tour !== null && tour !== "off") return false;
  const prefix = MEDICATION_PAGES[app];
  if (prefix === undefined) return false;
  if (prefix === "") return true;
  const inApp = pathname.replace(/^\/[^/]+\/?/, "");
  return inApp === prefix || inApp.startsWith(`${prefix}/`);
}

/** The simulated day of a tour step (pages follow it in the guided tour). */
export function dayOfStep(stepId: string | undefined): number | undefined {
  return TOUR.find((step) => step.id === stepId)?.clock?.day;
}
