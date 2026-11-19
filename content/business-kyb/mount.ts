// AUTHORED-BY Claude Opus 5.5
/**
 * What an app passes to `mountDemo()` on a business KYB page, mirroring `../moving-house/mount.ts`:
 * Northwind's drawers, the K grant handles, the bookkeeping drawers, the caveat under a refusal
 * after the withdrawal, the tour, and the obligations the examiner view checks against the log.
 *
 *   const kyb = isBusinessKybPage(location.pathname, "registry", location.search);
 *   mountDemo({ app, registry: ORGS, holder: BUSINESS_KYB_HOLDER, runtime,
 *     ...(kyb ? { tour: businessKybTour(), lens: businessKybLens(),
 *       ledger: { compliance: [...KYB_COMPLIANCE] } } : mortgage) });
 */

import type { TourStep } from "@mortgage/demo-kit/contracts";
import { HOLDERS, type HolderId } from "@mortgage/demo-kit/holders";
import type { AppSlug } from "@mortgage/demo-kit/registry";
import { appUrl } from "@mortgage/demo-kit/urls";
import { DEMO, PATHS } from "./facts.js";
import { KYB_GRANT_CODES, KYB_GRANTS } from "./grants.js";
import { TOUR } from "./tour.js";

/** The business KYB demo's holder, from the holder registry: Northwind Logistics LLC. */
export const BUSINESS_KYB_HOLDER: Readonly<{ id: HolderId; name: string }> = Object.freeze({
  id: HOLDERS.northwind.id,
  name: HOLDERS.northwind.short,
});

export const BUSINESS_KYB_DRAWERS: readonly { path: string; label: string }[] = Object.freeze([
  { label: "Profile", path: "/profile/" },
  { label: "Credentials", path: `/${PATHS.credentials}` },
  { label: "Inbox", path: `/${PATHS.inbox}` },
  { label: "Policies", path: "/policies/" },
  { label: "Consent records", path: "/consents/" },
]);

/** The caveat under a refused read after a withdrawal (`{org}` and `{holder}` are filled in). */
export const BUSINESS_KYB_REVOKE_CAVEAT =
  "{org} keeps the due diligence records it is required to keep for five years. What has ended is its access to {holder}'s credentials at source.";

export interface BusinessKybLensOptions {
  drawers: { path: string; label: string }[];
  grants: Record<string, { label: string; purpose?: string; until?: string }>;
  recordDrawers: string[];
  revokeCaveat: string;
  grantsHref: string;
  ledgerHref: string;
}

export function businessKybLens(): BusinessKybLensOptions {
  const grants: BusinessKybLensOptions["grants"] = {};
  for (const code of KYB_GRANT_CODES) {
    const spec = KYB_GRANTS[code];
    grants[`/policies/${code.toLowerCase()}`] = {
      label: code,
      purpose: spec.purposeText,
      until: spec.untilLabel,
    };
  }
  return {
    drawers: BUSINESS_KYB_DRAWERS.map((drawer) => ({ ...drawer })),
    grants,
    grantsHref: appUrl("wallet", "kyb/sharing"),
    ledgerHref: appUrl("wallet", "kyb/ledger"),
    recordDrawers: [`/${PATHS.inbox}`, "/policies/", "/consents/"],
    revokeCaveat: BUSINESS_KYB_REVOKE_CAVEAT,
  };
}

/** The tour (`mountDemo({ tour })`), with the holder whose pod it centres on. */
export function businessKybTour(): { demo: string; holder: HolderId; steps: TourStep[] } {
  return { demo: DEMO, holder: BUSINESS_KYB_HOLDER.id, steps: [...TOUR] };
}

const CDD_RULE =
  "https://www.ecfr.gov/current/title-31/subtitle-B/chapter-X/part-1010/subpart-B/section-1010.230";
const BSA_RULE =
  "https://www.ecfr.gov/current/title-31/subtitle-B/chapter-X/part-1020/subpart-B/section-1020.210";

/**
 * The obligations the examiner view (step 12) checks against the log. Each is evidenced only by
 * entries the pods and the banks actually produced; one with no matching entry shows as not
 * evidenced. Patterns are `EvidencePattern`s from `@mortgage/lens` (typed structurally here so
 * content does not depend on the Lens package).
 */
export interface KybComplianceItem {
  id: string;
  obligation: string;
  rule: string;
  source?: string;
  evidence: Record<string, unknown>[];
}

export const KYB_COMPLIANCE: readonly KybComplianceItem[] = Object.freeze([
  {
    evidence: [
      {
        actor: { org: "bank" },
        kind: "read",
        path: `/${PATHS.identity}`,
        pod: "northwind",
        status: 200,
      },
      { kind: "verified", org: "bank" },
    ],
    id: "identify-customer",
    obligation: "Identify and verify the legal entity customer",
    rule: "31 CFR 1010.230(a)",
    source: CDD_RULE,
  },
  {
    evidence: [
      {
        actor: { org: "bank" },
        kind: "read",
        path: `/${PATHS.ownership}`,
        pod: "northwind",
        status: 200,
      },
      { kind: "write", path: "/kyb/cdd/northwind", pod: "bank" },
    ],
    id: "ownership-prong",
    obligation: "Identify each individual owning 25% or more of the business",
    rule: "31 CFR 1010.230(d)(1)",
    source: CDD_RULE,
  },
  {
    evidence: [
      {
        actor: { org: "bank" },
        kind: "read",
        path: `/${PATHS.officers}`,
        pod: "northwind",
        status: 200,
      },
    ],
    id: "control-prong",
    obligation: "Identify one individual who controls the business",
    rule: "31 CFR 1010.230(d)(2)",
    source: CDD_RULE,
  },
  {
    evidence: [
      { kind: "write", path: "/status/list", pod: "registry" },
      {
        actor: { org: "business-lender" },
        kind: "read",
        path: `/${PATHS.ownership}`,
        pod: "northwind",
        status: 200,
      },
    ],
    id: "monitoring",
    obligation: "Keep beneficial ownership information current",
    rule: "31 CFR 1020.210(a)(2)(v)",
    source: BSA_RULE,
  },
  {
    evidence: [
      { kind: "write", path: "/kyb/cdd/northwind", pod: "bank" },
      { actor: { org: "bank" }, kind: "denied", pod: "northwind" },
    ],
    id: "retention",
    obligation: "Keep the due diligence record after the account closes",
    rule: "31 CFR 1010.230(i)",
    source: CDD_RULE,
  },
]);

/** The apps with pages in this demo, and the path prefix those pages live under. */
export const BUSINESS_KYB_PAGES: Readonly<Partial<Record<AppSlug, string>>> = Object.freeze({
  bank: "kyb",
  "business-lender": "",
  registry: "",
  wallet: "kyb",
});

/** The wallet's proving page (the cross-origin isolated route) belongs to this demo too. */
export const BUSINESS_KYB_PROVE_PATH = "prove/kyb";

/**
 * Does this page belong to the business KYB demo? `pathname` is the full path (`/bank/kyb/…`).
 * Every page of the registry and business-lender apps does; in the wallet and the bank, the pages
 * under `kyb/` (and the wallet's `prove/kyb`). A `?tour=` parameter naming this demo also counts.
 */
export function isBusinessKybPage(pathname: string, app: AppSlug, search = ""): boolean {
  const tour = new URLSearchParams(search).get("tour");
  if (tour === DEMO) return true;
  if (tour !== null && tour !== "off") return false;
  const prefix = BUSINESS_KYB_PAGES[app];
  if (prefix === undefined) return false;
  if (prefix === "") return true;
  const inApp = pathname.replace(/^\/[^/]+\/?/, "").replace(/\/$/, "");
  if (app === "wallet" && inApp === BUSINESS_KYB_PROVE_PATH) return true;
  return inApp === prefix || inApp.startsWith(`${prefix}/`);
}

/** The simulated day of a tour step (pages follow it in the guided tour). */
export function dayOfStep(stepId: string | undefined): number | undefined {
  return TOUR.find((step) => step.id === stepId)?.clock?.day;
}
