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
export const DEMO_APPS = Object.freeze({
  mortgage: ORG_SLUGS.slice(0, 13),
  "small-dollar-lending": SMALL_DOLLAR_APPS,
} satisfies Record<string, readonly OrgSlug[]>);
