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
    appName: "Mortgage Prequalification",
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
 * the borrower's pod at the centre. Roles without a demo app are listed as mapped roles
 * with no app.
 */
export interface Service {
  slug: string;
  /** org-map role number 1–12. The borrower's vault is the centre, not a numbered role. */
  roleNumber?: number;
  role: string;
  modelledOn: string;
  membership: string;
  summary: string;
  /** Scene (SPEC §2) where this role is on screen, if any. */
  scene?: 1 | 2 | 3 | 4 | 5;
  /** Demo apps this role launches into. Empty = mapped role, no app in this demo. */
  apps: DemoAppSlug[];
  center?: boolean;
}

export const services: Service[] = [
  {
    apps: ["wallet"],
    center: true,
    membership: "EDMA member",
    modelledOn: "Verizon",
    role: "Borrower's pod",
    scene: 1,
    slug: "vault",
    summary:
      "Alex's pod and the Data Vault app: profile, credentials, access permissions and consent receipts. The other roles read Alex's data only with permission.",
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
      "Checks prequalification proofs, prefills the application from the pod and tracks the loan to closing. A second lender, modelled on Fifth Third Bank, checks the same proofs.",
  },
  {
    apps: ["gse"],
    membership: "EDMA member · Data Excellence Program founder",
    modelledOn: "Freddie Mac",
    role: "GSE / automated underwriting",
    roleNumber: 2,
    scene: 4,
    slug: "aus",
    summary:
      "Checks the loan file Alex gave access to and returns findings. The lender's underwriter makes the credit decision.",
  },
  {
    apps: ["verifications"],
    membership: "Not an EDMA member",
    modelledOn: "Equifax",
    role: "Credit bureau",
    roleNumber: 3,
    scene: 1,
    slug: "credit-bureau",
    summary: "Issues a credit-score credential into Alex's pod.",
  },
  {
    apps: ["verifications"],
    membership: "Not an EDMA member",
    modelledOn: "The Work Number (Equifax)",
    role: "Income / employment verification",
    roleNumber: 4,
    scene: 1,
    slug: "employment-verification",
    summary: "Issues an employment and income credential into Alex's pod.",
  },
  {
    apps: ["verifications"],
    membership: "EDMA member (not publicly confirmed)",
    modelledOn: "Mastercard Finicity",
    role: "Asset verification",
    roleNumber: 5,
    scene: 1,
    slug: "asset-verification",
    summary: "Issues an asset credential, from bank data Alex authorised, into Alex's pod.",
  },
  {
    apps: ["property"],
    membership: "Not an EDMA member",
    modelledOn: "Cotality",
    role: "Appraisal / valuation",
    roleNumber: 6,
    slug: "appraisal",
    summary: "Issues an appraisal credential for the property. Not shown in the five scenes.",
  },
  {
    apps: ["property"],
    membership: "Not an EDMA member",
    modelledOn: "First American",
    role: "Title and settlement",
    roleNumber: 7,
    slug: "title",
    summary: "Issues a title search result before closing. Not shown in the five scenes.",
  },
  {
    apps: ["closing"],
    membership: "EDMA member",
    modelledOn: "Wolters Kluwer (eOriginal)",
    role: "eClosing and servicing",
    roleNumber: 8,
    scene: 5,
    slug: "eclosing",
    summary:
      "Runs a simulated eClosing and saves the closing record in Alex's pod. The servicer, modelled on Truist, then asks Alex for access.",
  },
  {
    apps: [],
    membership: "EDMA Solid Community of Practice",
    modelledOn: "EDM Association / OMG (FIBO) with MISMO",
    role: "Data / standards steward",
    roleNumber: 9,
    slug: "standards",
    summary: "The pod's data uses FIBO terms, mapped to MISMO v3.4 in the project documentation.",
  },
  {
    apps: [],
    membership: "EDMA member (GLEIF Americas)",
    modelledOn: "GLEIF",
    role: "Organisational identity",
    roleNumber: 10,
    slug: "org-identity",
    summary:
      "Legal Entity Identifier credentials (vLEI) could identify each organisation. No app in this demo.",
  },
  {
    apps: ["examiner"],
    membership: "No agency affiliation",
    modelledOn: "Unbranded — no agency affiliation",
    role: "Regulator / examiner",
    roleNumber: 11,
    slug: "regulator",
    summary:
      "An unbranded Examiner View compares the demo with public TRID and RESPA rules. Not affiliated with or endorsed by the CFPB.",
  },
  {
    apps: [],
    membership: "EDMA member",
    modelledOn: "USAA",
    role: "Homeowners insurance",
    roleNumber: 12,
    slug: "insurance",
    summary: "Homeowners insurance at closing. No app in this demo.",
  },
];

/** The 12 numbered value-chain roles (excludes the centre vault node). */
export const roleServices: Service[] = services.filter(
  (service) => service.roleNumber !== undefined,
);

export const centerService: Service = services.find(
  (service) => service.center === true,
) as Service;
