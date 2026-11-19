// AUTHORED-BY Claude Opus 5.5
/**
 * The organisation registry (design.md §b.1, colours from §b.3). Every organisation and person
 * here is fictional; names are placeholders pending a trademark screen (open question 1), and a
 * rename is a change to this file only. Theme colours are original values, never a real
 * organisation's palette.
 */
import {
  HOLDERS,
  ORG_SLUGS,
  type OrgRegistry,
  type OrgSlug,
  type PodHolder,
} from "@mortgage/demo-kit/registry";

/** The mortgage demo's holder; the holders themselves are registered in `@mortgage/demo-kit/holders`. */
export const POD_HOLDER: PodHolder = Object.freeze({ name: HOLDERS.alex.name, owner: "alex" });

const alex = (role?: string) =>
  role === undefined ? { name: POD_HOLDER.name } : { name: POD_HOLDER.name, role };

export const ORGS: OrgRegistry = Object.freeze({
  wallet: {
    actsAs: "alex",
    organisation: "Cairn",
    persona: alex(),
    role: "Alex's pod provider and personal data app",
    short: "Cairn",
    slug: "wallet",
    themeColor: "#0F5C5A",
    title: "Cairn",
  },
  payroll: {
    actsAs: "payroll",
    organisation: "Ledgerly Payroll",
    persona: alex("employee self-service"),
    role: "Payroll provider for Alex's employer, Northfield Engineering",
    short: "Ledgerly",
    slug: "payroll",
    themeColor: "#3D3A8C",
    title: "Ledgerly Payroll",
  },
  bank: {
    actsAs: "bank",
    organisation: "Alder Bank",
    persona: alex("online banking"),
    role: "Alex's current bank: account and asset data",
    short: "Alder",
    slug: "bank",
    themeColor: "#1F5135",
    title: "Alder Bank",
  },
  bureau: {
    actsAs: "bureau",
    altPersonas: [{ name: "Order desk clerk", role: "orders view" }],
    organisation: "Quillon Credit Bureau",
    persona: alex("consumer view"),
    role: "Consumer reporting agency",
    short: "Quillon",
    slug: "bureau",
    themeColor: "#44546A",
    title: "Quillon Credit Bureau",
  },
  lender: {
    actsAs: "lender",
    organisation: "Juniper Home Loans",
    persona: alex(),
    product: "borrower portal",
    role: "Lender, customer-facing",
    short: "Juniper",
    slug: "lender",
    themeColor: "#2B6777",
    title: "Juniper Home Loans",
  },
  "lender-desk": {
    actsAs: "lender",
    altPersonas: [
      { name: "Marcus Webb", role: "loan officer" },
      { name: "Elena Sato", role: "underwriter" },
      { name: "Tom Okoye", role: "closer" },
      { name: "Ruth Delgado", role: "post-closing" },
    ],
    organisation: "Juniper Home Loans",
    persona: { name: "Priya Nair", role: "processor" },
    product: "Loan Desk",
    role: "Loan officer, processor, underwriter, closer, post-closing",
    short: "Juniper",
    slug: "lender-desk",
    themeColor: "#1E2530",
    title: "Juniper Loan Desk",
  },
  "lender-b": {
    actsAs: "lender-b",
    organisation: "Copperfield Mortgage",
    persona: null,
    role: "Competing lender for pre-qualification",
    short: "Copperfield",
    slug: "lender-b",
    themeColor: "#B4532A",
    title: "Copperfield Mortgage",
  },
  aus: {
    actsAs: "aus",
    organisation: "Castellan Housing Finance",
    persona: { name: "Castellan service account" },
    role: "Secondary-market investor: automated underwriting and loan purchase",
    short: "Castellan",
    slug: "aus",
    themeColor: "#0B1F3A",
    title: "Castellan Housing Finance",
  },
  appraisal: {
    actsAs: "appraisal",
    altPersonas: [{ name: "Sam Reyes", role: "appraiser" }],
    organisation: "Plumbline Valuation",
    persona: { name: "Dana Okafor", role: "coordinator" },
    role: "Appraisal management company and its panel appraiser",
    short: "Plumbline",
    slug: "appraisal",
    themeColor: "#E8590C",
    title: "Plumbline Valuation",
  },
  title: {
    actsAs: "title",
    organisation: "Sextant Title & Escrow",
    persona: { name: "Morgan Hale", role: "escrow officer" },
    role: "Title agent and settlement agent, including the signing",
    short: "Sextant",
    slug: "title",
    themeColor: "#1B2A49",
    title: "Sextant Title & Escrow",
  },
  insurer: {
    actsAs: "insurer",
    organisation: "Wrenfield Mutual",
    persona: alex(),
    role: "Homeowner's insurer",
    short: "Wrenfield",
    slug: "insurer",
    themeColor: "#2F80ED",
    title: "Wrenfield Mutual",
  },
  county: {
    actsAs: "county",
    organisation: "Marlow County",
    persona: { name: "Recording clerk", role: "Recorder's office" },
    product: "Recorder's office",
    role: "County land records",
    short: "Marlow County",
    slug: "county",
    themeColor: "#2A4D8F",
    title: "Marlow County Recorder",
  },
  servicer: {
    actsAs: "servicer",
    organisation: "Marigold Loan Servicing",
    persona: alex(),
    role: "Servicer after the sale",
    short: "Marigold",
    slug: "servicer",
    themeColor: "#E9A100",
    title: "Marigold Loan Servicing",
  },
  // Demo 2, moving house (flows.md §1 and §2): a state government services portal.
  state: {
    actsAs: "state",
    organisation: "State Online Services",
    persona: alex("resident account"),
    product: "Driver Services",
    role: "State government services: Driver Services and the Department of Revenue",
    short: "State",
    slug: "state",
    themeColor: "#17375E",
    title: "State Online Services",
  },
  // Demo 4, small-dollar lending (flows.md §1 and §4). Maya Torres is the person signed in.
  idv: {
    actsAs: "idv",
    organisation: "Trueline Identity",
    persona: { name: HOLDERS.maya.name, role: "identity check" },
    role: "Identity verification service: checks a person once and issues an identity credential",
    short: "Trueline",
    slug: "idv",
    themeColor: "#101412",
    title: "Trueline Identity",
  },
  "fintech-lender": {
    actsAs: "fintech-lender",
    organisation: "Finchly Loans",
    persona: { name: HOLDERS.maya.name },
    role: "Online instalment lender: quotes, decides, pays out and services small loans",
    short: "Finchly",
    slug: "fintech-lender",
    themeColor: "#5B3FD1",
    title: "Finchly Loans",
  },
  payout: {
    actsAs: "payout",
    organisation: "Swiftline Payouts",
    persona: null,
    role: "Payment service: pushes a loan's funds to the borrower's debit card",
    short: "Swiftline",
    slug: "payout",
    themeColor: "#0E1A2B",
    title: "Swiftline Payouts",
  },
  // Demo 7, motor claim (flows.md §1 and §7): a collision repair workshop.
  repairer: {
    actsAs: "repairer",
    organisation: "Anvil Collision Repair",
    persona: { name: "Sam Okafor", role: "workshop manager" },
    role: "Collision repair workshop Alex's insurer refers the car to",
    short: "Anvil",
    slug: "repairer",
    themeColor: "#1F1D1A",
    title: "Anvil Collision Repair",
  },
  // Demo 3, business KYB (flows.md §1 and §3): the business register and LEI issuer.
  registry: {
    actsAs: "registry",
    organisation: "Halyard LEI Services",
    persona: { name: "Imani Clarke", role: "registry analyst" },
    product: "Business Register",
    role: "Business register and illustrative LEI issuer: identity, officers and ownership",
    short: "Halyard",
    slug: "registry",
    themeColor: "#0E6E6E",
    title: "Halyard LEI Services",
  },
  // Demo 3: a second bank's commercial credit desk.
  "business-lender": {
    actsAs: "business-lender",
    organisation: "Brackenridge Bank",
    persona: { name: "Tomas Whitfield", role: "credit officer" },
    product: "Commercial Credit",
    role: "Commercial lender: a business credit line, decided on proofs and credentials",
    short: "Brackenridge",
    slug: "business-lender",
    themeColor: "#7A2335",
    title: "Brackenridge Bank Commercial Credit",
  },
  // Demo 5, medication handover (flows.md §1 and §5): a ward system, a dispensing workstation and
  // a consultation screen. Every clinician named here is fictional.
  hospital: {
    actsAs: "hospital",
    organisation: "Riverbend General Hospital",
    persona: { name: "Imani Brooks", role: "ward pharmacist" },
    product: "ward system",
    role: "Hospital: inpatient care, medicines reconciliation and discharge",
    short: "Riverbend",
    slug: "hospital",
    themeColor: "#14558F",
    title: "Riverbend General Hospital",
  },
  pharmacy: {
    actsAs: "pharmacy",
    organisation: "Corner Dispensary",
    persona: { name: "Grace Liu", role: "pharmacist" },
    role: "Community pharmacy: dispensing",
    short: "Corner",
    slug: "pharmacy",
    themeColor: "#006B3C",
    title: "Corner Dispensary",
  },
  clinic: {
    actsAs: "clinic",
    organisation: "Larch Lane Family Practice",
    persona: { name: "Dr Lena Marsh", role: "family physician" },
    role: "Primary care practice",
    short: "Larch Lane",
    slug: "clinic",
    themeColor: "#5B4F7C",
    title: "Larch Lane Family Practice",
  },
  // Demo 8, reusable KYC (flows.md §8): the card issuer that relies on the bank's checks.
  "card-issuer": {
    actsAs: "card-issuer",
    organisation: "Pennant Card",
    persona: alex("card applicant"),
    product: "Card application",
    role: "Credit card issuer: relies on another institution's identity checks (reusable KYC)",
    short: "Pennant",
    slug: "card-issuer",
    themeColor: "#B3122B",
    title: "Pennant Card",
  },
});

/** The apps of demo 4 (flows.md §4): Maya's wallet, the three new apps and three mortgage apps. */
const SMALL_DOLLAR_APPS: readonly OrgSlug[] = [
  "wallet",
  "idv",
  "payroll",
  "bank",
  "bureau",
  "fintech-lender",
  "payout",
];

/**
 * The apps each demo uses. The registry grows as demos are added, so a demo's own count (the
 * mortgage video's "Thirteen applications.") is taken from its list here, never from `ORGS`.
 */
const LATER_DEMO_APPS: readonly OrgSlug[] = [
  "state",
  "idv",
  "fintech-lender",
  "payout",
  "registry",
  "business-lender",
  "hospital",
  "pharmacy",
  "clinic",
  "repairer",
  "card-issuer",
];

export const DEMO_APPS = Object.freeze({
  mortgage: ORG_SLUGS.filter((slug) => !LATER_DEMO_APPS.includes(slug)),
  "moving-house": ["wallet", "state", "county", "bank", "insurer", "payroll", "servicer"],
  "small-dollar-lending": SMALL_DOLLAR_APPS,
  "business-kyb": ["wallet", "registry", "bank", "business-lender"],
  "medication-handover": ["wallet", "hospital", "pharmacy", "clinic"],
  "motor-claim": ["wallet", "insurer", "repairer", "state"],
  "reusable-kyc": ["wallet", "bank", "card-issuer"],
} satisfies Record<string, readonly OrgSlug[]>);
