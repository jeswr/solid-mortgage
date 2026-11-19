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
  "registry",
  "business-lender",
] as const;

export type OrgSlug = (typeof ORG_SLUGS)[number];

/** Every app served by the site: the organisation apps plus the front door. */
export const APP_SLUGS = [...ORG_SLUGS, "welcome"] as const;
export type AppSlug = (typeof APP_SLUGS)[number];

/** Whose pod a request is addressed to or made as: an organisation's, or a registered holder's. */
export type PodOwner = OrgSlug | HolderId;

export function isPodOwner(value: unknown): value is PodOwner {
  return isHolderId(value) || (typeof value === "string" && isOrgSlug(value));
}

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
   * of an organisation names the first app's slug (the Loan Desk acts as `lender`), and the
   * wallet acts as its default holder, `alex` (it may act for every registered holder:
   * `holdersActedFor`).
   */
  actsAs: PodOwner;
  /** `<meta name="theme-color">` and the Lens map colour; an original value (design.md §b.2). */
  themeColor: string;
  /** The app's document title (also the launcher tile name). */
  title: string;
}

/** The registry: one record per organisation app. */
export type OrgRegistry = Readonly<Record<OrgSlug, OrgRecord>>;

/** The holder whose pod sits at the centre of a demo (`HOLDERS` in `./holders.ts`). */
export interface PodHolder {
  owner: HolderId;
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

/** The pods the registry implies: every registered holder's, then one per distinct `actsAs` organisation. */
export function podOwners(registry: OrgRegistry): PodOwner[] {
  const owners = new Set<PodOwner>(HOLDER_IDS);
  for (const slug of ORG_SLUGS) owners.add(registry[slug].actsAs);
  return [...owners];
}

/**
 * The holders an app may act for. An app that acts as a holder (the wallet) holds every
 * registered holder's pod (docs/rebuild/flows.md §1: one wallet for all of them); any other app
 * acts only as its own organisation and gets none.
 */
export function holdersActedFor(registry: OrgRegistry, app: string): readonly HolderId[] {
  if (!isOrgSlug(app)) return [];
  return isHolderId(registry[app].actsAs) ? HOLDER_IDS : [];
}

// --- Pod holders ----------------------------------------------------------------------------
/**
 * The pod holders: the people and businesses whose pods sit at the centre of a demo
 * (docs/rebuild/flows.md §1: "the same Cairn app holds Alex's, Maya's, Rosa's and Northwind's
 * pods"). Every holder is fictional. Registering a holder is one entry here: the runtime then
 * provisions its pod, its WebID and its baseline profile, the Lens can centre on it, and the
 * wallet can show it.
 *
 * Ids are pod slugs: lower-case, disjoint from the organisation slugs, and fixed (a rename of
 * the fictional person or business changes `name` and `short`, never the id).
 */

export type HolderKind = "person" | "business";

export interface HolderRecord {
  /** The pod slug: the pod lives at `/pods/<id>/`, its WebID at `/pods/<id>/profile/card#me`. */
  readonly id: string;
  /** Full display name ("Maya Torres", "Northwind Logistics LLC"). */
  readonly name: string;
  /** What the Lens and the wallet call the holder ("Maya", "Northwind"). */
  readonly short: string;
  readonly kind: HolderKind;
  /** The pod's path on the pod origin, `/pods/<id>/`. */
  readonly podPath: string;
  /** For a business: the person who operates its pod in the wallet. */
  readonly operator?: string;
}

const REGISTERED = {
  alex: Object.freeze({
    id: "alex",
    kind: "person",
    name: "Alex Rivera",
    podPath: "/pods/alex/",
    short: "Alex",
  }),
  maya: Object.freeze({
    id: "maya",
    kind: "person",
    name: "Maya Torres",
    podPath: "/pods/maya/",
    short: "Maya",
  }),
  rosa: Object.freeze({
    id: "rosa",
    kind: "person",
    name: "Rosa Rivera",
    podPath: "/pods/rosa/",
    short: "Rosa",
  }),
  northwind: Object.freeze({
    id: "northwind",
    kind: "business",
    name: "Northwind Logistics LLC",
    operator: "Jordan Blake",
    podPath: "/pods/northwind/",
    short: "Northwind",
  }),
} as const satisfies Record<string, HolderRecord>;

export type HolderId = keyof typeof REGISTERED;

/** The registry. Order is the wallet switcher's order; the first is the default holder. */
export const HOLDERS: { readonly [K in HolderId]: HolderRecord & { readonly id: K } } =
  Object.freeze(REGISTERED);

/** Every registered holder id, in registry order. */
export const HOLDER_IDS: readonly HolderId[] = Object.freeze(Object.keys(HOLDERS) as HolderId[]);

/** The holder a page shows when nothing names another: Alex, the mortgage demo's holder. */
export const DEFAULT_HOLDER: HolderId = "alex";

export function isHolderId(value: unknown): value is HolderId {
  return typeof value === "string" && Object.hasOwn(HOLDERS, value);
}

export function holderRecord(id: HolderId): HolderRecord {
  return HOLDERS[id];
}

/** The holder whose pod a URL or pod path names (`…/pods/<id>/…`), if it is a registered one. */
export function holderOfPodUrl(url: string): HolderId | undefined {
  let path = url;
  try {
    path = new URL(url, "https://pods.invalid").pathname;
  } catch {
    return undefined;
  }
  const id = /^\/pods\/([^/]+)(?:\/|$)/.exec(path)?.[1];
  return isHolderId(id) ? id : undefined;
}
