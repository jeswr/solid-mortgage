/**
 * Single service registry (SPEC §4, showcase-patterns §1): ONE module drives the ecosystem
 * map, the launcher dock, and every try-this-live link, so names, roles, and one-liners
 * never drift between surfaces.
 *
 * Lives under `app/` (not `lib/`) deliberately: `scripts/check-insignia.mjs` scans
 * `apps/<app>/app`, and this copy must stay inside the R2/R3 bright-line guard.
 */

/** The launchable demo surfaces. Zone apps resolve through the shell's multi-zone rewrites. */
export interface DemoApp {
  slug: DemoAppSlug;
  appName: string;
  modelledOn: string;
  /** In-shell path (multi-zones rewrite prefix, or a tour-local route). */
  path: string;
  /** Server-side env var the shell rewrite for this zone reads (apps/tour/next.config.ts). */
  zoneEnv?: string;
  /** Same-origin health probe target. Tour-local surfaces probe the tour's own route. */
  healthPath: string;
}

export type DemoAppSlug =
  | "tour"
  | "wallet"
  | "verifications"
  | "lender-boa"
  | "lender-53"
  | "gse"
  | "property"
  | "closing"
  | "examiner";

export const demoApps: Record<DemoAppSlug, DemoApp> = {
  closing: {
    appName: "Digital Closing and Servicing",
    healthPath: "/closing/api/health",
    modelledOn: "Wolters Kluwer (eOriginal) and Truist",
    path: "/closing",
    slug: "closing",
    zoneEnv: "MORTGAGE_CLOSING_ZONE_URL",
  },
  examiner: {
    appName: "Examiner View",
    healthPath: "/api/health",
    modelledOn: "Unbranded — no agency affiliation",
    path: "/examiner",
    slug: "examiner",
  },
  gse: {
    appName: "Automated Underwriting Service",
    healthPath: "/gse/api/health",
    modelledOn: "Freddie Mac",
    path: "/gse",
    slug: "gse",
    zoneEnv: "MORTGAGE_UNDERWRITING_ZONE_URL",
  },
  "lender-53": {
    appName: "Mortgage Pre-qualification",
    healthPath: "/lender-53/api/health",
    modelledOn: "Fifth Third Bank",
    path: "/lender-53",
    slug: "lender-53",
    zoneEnv: "MORTGAGE_COMPARISON_LENDER_ZONE_URL",
  },
  "lender-boa": {
    appName: "Mortgage Origination",
    healthPath: "/lender-boa/api/health",
    modelledOn: "Bank of America",
    path: "/lender-boa",
    slug: "lender-boa",
    zoneEnv: "MORTGAGE_PRIMARY_LENDER_ZONE_URL",
  },
  property: {
    appName: "Property Services",
    healthPath: "/property/api/health",
    modelledOn: "Cotality and First American",
    path: "/property",
    slug: "property",
    zoneEnv: "MORTGAGE_PROPERTY_ZONE_URL",
  },
  tour: {
    appName: "Solid Mortgage Tour",
    healthPath: "/api/health",
    modelledOn: "EDMA Solid Community of Practice",
    path: "/",
    slug: "tour",
  },
  verifications: {
    appName: "Verification Services",
    healthPath: "/verifications/api/health",
    modelledOn: "The Work Number (Equifax), Mastercard Finicity, and Equifax",
    path: "/verifications",
    slug: "verifications",
    zoneEnv: "MORTGAGE_VERIFICATIONS_ZONE_URL",
  },
  wallet: {
    appName: "Data Vault",
    healthPath: "/wallet/api/health",
    modelledOn: "Verizon",
    path: "/wallet",
    slug: "wallet",
    zoneEnv: "MORTGAGE_WALLET_ZONE_URL",
  },
};

/** Dock order: the shell first, then the journey order the five scenes visit the apps in. */
export const launcherApps: DemoApp[] = [
  demoApps.tour,
  demoApps.wallet,
  demoApps.verifications,
  demoApps["lender-boa"],
  demoApps["lender-53"],
  demoApps.gse,
  demoApps.property,
  demoApps.closing,
];

/**
 * The twelve value-chain roles (docs/research/org-map.md, the product-phase mapping) plus
 * the borrower's own vault at the centre. Roles without a demo app yet are shown honestly
 * as recruitment/product-phase seats.
 */
export interface Service {
  slug: string;
  /** org-map role number 1–12. The borrower's vault is the centre, not a numbered role. */
  roleNumber?: number;
  role: string;
  modelledOn: string;
  membership: string;
  summary: string;
  /** Scene (SPEC §2) where this seat is on screen, if any. */
  scene?: 1 | 2 | 3 | 4 | 5;
  /** Demo apps this role launches into. Empty = mapped seat, no app in this demo. */
  apps: DemoAppSlug[];
  center?: boolean;
}

export const services: Service[] = [
  {
    apps: ["wallet"],
    center: true,
    membership: "EDMA member",
    modelledOn: "Verizon",
    role: "Borrower data vault",
    scene: 1,
    slug: "vault",
    summary:
      "Alex Rivera's pod: profile, credential wallet, access grants, revocation, and the consent-receipt ledger. Every other seat works against data the borrower controls here.",
  },
  {
    apps: ["lender-boa", "lender-53"],
    membership: "EDMA member",
    modelledOn: "Bank of America",
    role: "Lender / originator",
    roleNumber: 1,
    scene: 3,
    slug: "lender",
    summary:
      "Full origination portal: ZK pre-qual verification, pod-prefilled application, Loan Estimate and Closing Disclosure timeline. A second, competing lender — modelled on Fifth Third Bank, a Data Excellence Program founder — verifies the same proof in scene 2.",
  },
  {
    apps: ["gse"],
    membership: "EDMA member · DEP founder",
    modelledOn: "Freddie Mac",
    role: "GSE / automated underwriting",
    roleNumber: 2,
    scene: 4,
    slug: "aus",
    summary:
      "Automated underwriting over the granted loan file: decision plus findings, re-run in seconds when a credential is refreshed. The GSEs' own data-validation programmes are the demo's cost anchor.",
  },
  {
    apps: ["verifications"],
    membership: "External approach",
    modelledOn: "Equifax",
    role: "Credit bureau",
    roleNumber: 3,
    scene: 1,
    slug: "credit-bureau",
    summary:
      "Issues the credit-score credential into the vault. One issuance replaces a fresh per-lender pull — a tri-merge report runs about $200 each time today.",
  },
  {
    apps: ["verifications"],
    membership: "External approach",
    modelledOn: "The Work Number (Equifax)",
    role: "Income / employment verification",
    roleNumber: 4,
    scene: 1,
    slug: "employment-verification",
    summary:
      "Employer-sourced employment-and-income credential — the verification role the GSEs already accept from digital suppliers, re-plumbed to land in the borrower's own pod.",
  },
  {
    apps: ["verifications"],
    membership: "EDMA member (publicly unconfirmed — re-verify before outreach)",
    modelledOn: "Mastercard Finicity",
    role: "Asset verification / open banking",
    roleNumber: 5,
    scene: 1,
    slug: "asset-verification",
    summary:
      "Bank-sourced asset credential via open banking: balances attested once, held by the borrower, reusable at every downstream seat.",
  },
  {
    apps: ["property"],
    membership: "External approach",
    modelledOn: "Cotality",
    role: "Appraisal / valuation",
    roleNumber: 6,
    slug: "appraisal",
    summary:
      "Appraisal-value credential for the subject property. In the ten-minute script this seat is background; the app carries its branded flow for the product phase.",
  },
  {
    apps: ["property"],
    membership: "External approach",
    modelledOn: "First American",
    role: "Title + settlement",
    roleNumber: 7,
    slug: "title",
    summary:
      "Title-clear credential ahead of closing. The 885-million-document title-data exposure of 2019 is the demo's sharpest argument for access-in-place over copies.",
  },
  {
    apps: ["closing"],
    membership: "EDMA member",
    modelledOn: "Wolters Kluwer (eOriginal)",
    role: "eClosing / digital closing",
    roleNumber: 8,
    scene: 5,
    slug: "eclosing",
    summary:
      "eClose ceremony on real industry plumbing — then servicing transfers to a Truist-modelled servicer (also an EDMA member): the borrower approves the new grant and revokes the old lender.",
  },
  {
    apps: [],
    membership: "The CoP's own seat, with MISMO engaged via open workgroups",
    modelledOn: "EDM Association / OMG (FIBO) with MISMO",
    role: "Data / standards steward",
    roleNumber: 9,
    slug: "standards",
    summary:
      "Pod data is FIBO-grounded and mapped field-by-field to MISMO v3.4. That binding table is the CoP's standards deliverable — value for every member, app or no app.",
  },
  {
    apps: [],
    membership: "EDMA member (GLEIF Americas)",
    modelledOn: "GLEIF",
    role: "Organisational identity",
    roleNumber: 10,
    slug: "org-identity",
    summary:
      "LEI-anchored organisational credentials (vLEI) are the partner-phase identity rail behind every stakeholder WebID. Narrative seat in this demo; no app yet.",
  },
  {
    apps: ["examiner"],
    membership: "Convened via member public bodies, not the CFPB",
    modelledOn: "Unbranded — no agency affiliation",
    role: "Regulator lens",
    roleNumber: 11,
    slug: "regulator",
    summary:
      "An unbranded Examiner View renders the journey's TRID and RESPA timing beats as an examiner-facing checklist over public rules. Not affiliated with or endorsed by the CFPB.",
  },
  {
    apps: [],
    membership: "EDMA member",
    modelledOn: "USAA",
    role: "Homeowners insurance",
    roleNumber: 12,
    slug: "insurance",
    summary:
      "Insurance binder at closing is a product-phase extension: the seat is mapped to a member, the app is not yet in the demo.",
  },
];

/** The 12 numbered value-chain roles (excludes the centre vault node). */
export const roleServices: Service[] = services.filter(
  (service) => service.roleNumber !== undefined,
);

export const centerService: Service = services.find(
  (service) => service.center === true,
) as Service;
