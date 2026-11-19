// AUTHORED-BY Claude Opus 5.5
/**
 * Reading pod resources for the screens: `podFetch` (as Juniper) + `@jeswr/fetch-rdf` (through
 * the content `readDataset` helper) + the data-model wrappers. A refused read is a result the
 * screen shows, never an exception it hides (`@mortgage/content/mortgage/reads`).
 */
import {
  type LoadedResource,
  listMembers,
  loadWrapped,
  type Wrapper,
} from "@mortgage/content/mortgage/reads";
import { podFetch } from "@mortgage/pod-runtime";

export { isOk, oks } from "@mortgage/content/mortgage/reads";
export type Loaded<T> = LoadedResource<T>;

/**
 * GET an RDF resource and wrap its root node in a typed accessor. The root is the document URL,
 * or `iri` for a copy of a credential kept at another URL than its own IRI.
 */
export function load<T>(url: string, ctor: Wrapper<T>, iri = url): Promise<Loaded<T>> {
  return loadWrapped(podFetch, url, ctor, iri);
}

/** The members of a container (`ldp:contains`), sorted. */
export function list(container: string): Promise<Loaded<string[]>> {
  return listMembers(podFetch, container);
}
