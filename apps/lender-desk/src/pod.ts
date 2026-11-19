// AUTHORED-BY Claude Opus 5.5
/**
 * Reading pod resources for the screens: `podFetch` (as Juniper) + `@jeswr/fetch-rdf` (through
 * the content `readDataset` helper) + the data-model wrappers. A refused read is a result the
 * screen shows, never an exception it hides.
 */
import { membersOf } from "@mortgage/content/mortgage/grants";
import { PodRequestError, readDataset } from "@mortgage/content/mortgage/world";
import { podFetch } from "@mortgage/pod-runtime";
import type { DatasetCore } from "@rdfjs/types";
import { DataFactory } from "n3";

export type Loaded<T> =
  | { state: "ok"; url: string; value: T }
  | { state: "missing"; url: string }
  | { state: "refused"; url: string; status: number }
  | { state: "error"; url: string; message: string };

type Wrapper<T> = new (term: string, dataset: DatasetCore, factory: typeof DataFactory) => T;

function failure(url: string, error: unknown): Loaded<never> {
  if (error instanceof PodRequestError) {
    if (error.status === 404) return { state: "missing", url };
    if (error.status === 401 || error.status === 403)
      return { state: "refused", status: error.status, url };
    return { message: `the pod answered ${error.status}`, state: "error", url };
  }
  return { message: error instanceof Error ? error.message : String(error), state: "error", url };
}

/**
 * GET an RDF resource and wrap its root node in a typed accessor. The root is the document URL,
 * or `iri` for a copy of a credential kept at another URL than its own IRI.
 */
export async function load<T>(url: string, ctor: Wrapper<T>, iri = url): Promise<Loaded<T>> {
  try {
    const dataset = await readDataset(podFetch, url);
    return { state: "ok", url, value: new ctor(iri, dataset, DataFactory) };
  } catch (error) {
    return failure(url, error);
  }
}

/** The members of a container (`ldp:contains`), sorted. */
export async function list(container: string): Promise<Loaded<string[]>> {
  try {
    return { state: "ok", url: container, value: await membersOf(podFetch, container) };
  } catch (error) {
    return failure(container, error);
  }
}

export const isOk = <T>(
  loaded: Loaded<T> | undefined,
): loaded is Extract<Loaded<T>, { state: "ok" }> => loaded?.state === "ok";

/** The loaded values of a list of reads, skipping the ones that failed. */
export function oks<T>(loaded: readonly Loaded<T>[]): Extract<Loaded<T>, { state: "ok" }>[] {
  return loaded.filter(
    (entry): entry is Extract<Loaded<T>, { state: "ok" }> => entry.state === "ok",
  );
}
