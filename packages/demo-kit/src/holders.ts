// AUTHORED-BY Claude Opus 5.5
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
