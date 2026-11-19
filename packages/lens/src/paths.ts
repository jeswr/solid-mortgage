// AUTHORED-BY Claude Opus 5.5
/** Pod path and identity helpers. Pure functions, no DOM. */
import {
  DEFAULT_HOLDER,
  HOLDER_IDS,
  isHolderId,
  isOrgSlug,
  type OrgRegistry,
  type PodOwner,
  webidPath,
} from "@mortgage/demo-kit/registry";

/**
 * The holder a Lens centres on when its config names none. Each Lens takes its own holder from
 * `LensConfig.holder.id` (`LensModel.holder`); this is only the fallback.
 */
export const HOLDER = DEFAULT_HOLDER;

/**
 * A pod path relative to its pod: strips an origin and a `/pods/<owner>` prefix, keeps the
 * query-free path with a leading slash. `/pods/alex/documents/a` → `/documents/a`.
 */
export function podRelative(path: string): string {
  let p = path;
  const schemeAt = p.indexOf("://");
  if (schemeAt !== -1) {
    const slash = p.indexOf("/", schemeAt + 3);
    p = slash === -1 ? "/" : p.slice(slash);
  }
  p = p.split(/[?#]/)[0] ?? "/";
  const m = /^\/pods\/[^/]+(\/.*)?$/.exec(p);
  if (m) p = m[1] ?? "/";
  if (!p.startsWith("/")) p = `/${p}`;
  return p;
}

/** The top-level container of a pod-relative path: `/documents/a/b` → `/documents/`. */
export function drawerPathOf(path: string): string {
  const rel = podRelative(path);
  const seg = rel.split("/").filter((x) => x !== "")[0];
  return seg === undefined ? "/" : `/${seg}/`;
}

/** "travel-documents" → "Travel documents". */
export function humanise(segment: string): string {
  const words = decodeURIComponent(segment)
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
  if (words === "") return segment;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Label for a resource with no description: its last path segment, humanised. */
export function labelFromPath(path: string): string {
  const segs = podRelative(path)
    .split("/")
    .filter((x) => x !== "");
  const last = segs[segs.length - 1];
  return last === undefined ? "the pod root" : humanise(last);
}

export function isAclPath(path: string): boolean {
  return /\.acl$/.test(podRelative(path));
}

/**
 * The map node for a slug: an app's `actsAs` owner (two apps of one organisation share a
 * node), the holder's own id for a registered holder. Unknown values are returned as they are.
 */
export function nodeOf(registry: OrgRegistry, slug: string): PodOwner | string {
  if (isHolderId(slug)) return slug;
  if (isOrgSlug(slug)) return registry[slug].actsAs;
  return slug;
}

/** The pod owner a WebID belongs to, by its `/pods/<owner>/profile/card#me` shape. */
export function ownerOfWebid(registry: OrgRegistry, webid: string): PodOwner | undefined {
  for (const id of HOLDER_IDS) if (webid.endsWith(webidPath(id))) return id;
  for (const record of Object.values(registry)) {
    if (webid.endsWith(webidPath(record.actsAs))) return record.actsAs;
  }
  return undefined;
}

export const PUBLIC_AGENTS = new Set([
  "http://xmlns.com/foaf/0.1/Agent",
  "http://www.w3.org/ns/auth/acl#AuthenticatedAgent",
  "acl:AuthenticatedAgent",
  "foaf:Agent",
]);

/** The local name of an IRI, for display: `…/core#VerifiableCredential` → `VerifiableCredential`. */
export function localName(iri: string): string {
  const cut = Math.max(iri.lastIndexOf("#"), iri.lastIndexOf("/"));
  const tail = cut === -1 ? iri : iri.slice(cut + 1);
  return tail === "" ? iri : tail;
}

/** Is `path` the container `container` or inside it (both pod-relative)? */
export function within(path: string, container: string): boolean {
  if (container === "/") return true;
  const c = container.endsWith("/") ? container : `${container}/`;
  return path === container || path === c.slice(0, -1) || path.startsWith(c);
}
