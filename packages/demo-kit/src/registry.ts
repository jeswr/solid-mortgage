// AUTHORED-BY Claude Opus 5.5
/**
 * Organisation registry types (design.md §b.1). The data lives in `content/orgs.ts`; renaming a
 * fictional organisation is a change to that one file. Slugs are role names and stay fixed.
 */

/**
 * The organisation apps: the thirteen of design.md §b.1 in that order, then the apps later demos
 * add (flows.md §1: `state` from demo 2). Also the app directory names.
 */
export const ORG_SLUGS = [
  "wallet",
  "payroll",
  "bank",
  "bureau",
  "lender",
  "lender-desk",
  "lender-b",
  "aus",
  "appraisal",
  "title",
  "insurer",
  "county",
  "servicer",
  "state",
] as const;

export type OrgSlug = (typeof ORG_SLUGS)[number];

/** Every app served by the site: the organisation apps plus the front door. */
export const APP_SLUGS = [...ORG_SLUGS, "welcome"] as const;
export type AppSlug = (typeof APP_SLUGS)[number];

/** Whose pod a request is addressed to or made as: an organisation's, or Alex's. */
export type PodOwner = OrgSlug | "alex";

export function isOrgSlug(value: string): value is OrgSlug {
  return (ORG_SLUGS as readonly string[]).includes(value);
}

export function isAppSlug(value: string): value is AppSlug {
  return (APP_SLUGS as readonly string[]).includes(value);
}

/** The staff persona an app shows as signed in (simulated; design.md §d.3). */
export interface Persona {
  name: string;
  /** Job or role shown after the name, e.g. "processor" or "employee self-service". */
  role?: string;
}

/** One organisation app in the registry. */
export interface OrgRecord {
  slug: OrgSlug;
  /** The fictional organisation, e.g. "Juniper Home Loans". Two apps may share one. */
  organisation: string;
  /** The product or view within the organisation, when it has more than one app ("Loan Desk"). */
  product?: string;
  /** Short label used on the Lens map and in the launcher ("Juniper", "Plumbline"). */
  short: string;
  /** The market role it plays (design.md §b.1 "Role"). */
  role: string;
  /** Who the app shows as signed in; `null` for a public page. */
  persona: Persona | null;
  /** Other personas the app can switch to (role switcher, second view). */
  altPersonas?: Persona[];
  /**
   * The pod this app's requests are made as. Usually its own slug; an app that is a second view
   * of an organisation names the first app's slug (the Loan Desk acts as `lender`), and Alex's
   * wallet acts as `alex`.
   */
  actsAs: PodOwner;
  /** `<meta name="theme-color">` and the Lens map colour; an original value (design.md §b.2). */
  themeColor: string;
  /** The app's document title (also the launcher tile name). */
  title: string;
}

/** The registry: one record per organisation app. */
export type OrgRegistry = Readonly<Record<OrgSlug, OrgRecord>>;

/** The person whose pod sits at the centre of the demo. */
export interface PodHolder {
  owner: "alex";
  name: string;
}

/** Display name for a record: "Juniper Home Loans, Loan Desk" or "Alder Bank". */
export function displayName(record: OrgRecord): string {
  return record.product === undefined
    ? record.organisation
    : `${record.organisation}, ${record.product}`;
}

/** The pod path of an owner's WebID document, relative to the pod origin (design.md §d.2). */
export function webidPath(owner: PodOwner): string {
  return `/pods/${owner}/profile/card#me`;
}

/** The WebID an owner has on a given pod origin, e.g. `https://example.test/pods/bank/profile/card#me`. */
export function webidFor(owner: PodOwner, podOrigin: string): string {
  return new URL(webidPath(owner), podOrigin).href;
}

/** The pods the registry implies: Alex's plus one per distinct `actsAs` organisation. */
export function podOwners(registry: OrgRegistry): PodOwner[] {
  const owners = new Set<PodOwner>(["alex"]);
  for (const slug of ORG_SLUGS) owners.add(registry[slug].actsAs);
  return [...owners];
}
