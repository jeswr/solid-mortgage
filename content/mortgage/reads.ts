// AUTHORED-BY Claude Opus 5.5
/**
 * Reads the apps' screens share, over any `fetch` (an app passes the runtime's `podFetch`): a
 * resource wrapped in a data-model accessor, a container's members, and the refusal a failed pod
 * request stands for. A refused or missing read is a result the screen shows, never an exception
 * it hides. Parsing goes through `readDataset` (`@jeswr/fetch-rdf`).
 */
import { RDF_TYPE } from "@mortgage/data-model";
import type { DatasetCore } from "@rdfjs/types";
import { DataFactory } from "n3";
import { membersOf } from "./grants.js";
import { PodRequestError, readDataset } from "./world.js";

/** The refusal a pod request error stands for (a 401 or 403), or `undefined`. */
export function refusalOf(
  error: unknown,
): { status: number; method: string; url: string } | undefined {
  if (error instanceof PodRequestError && (error.status === 401 || error.status === 403)) {
    return { method: error.method, status: error.status, url: error.url };
  }
  return undefined;
}

export type LoadedResource<T> =
  | { state: "ok"; url: string; value: T }
  | { state: "missing"; url: string }
  | { state: "refused"; url: string; status: number }
  | { state: "error"; url: string; message: string };

export type Wrapper<T> = new (term: string, dataset: DatasetCore, factory: typeof DataFactory) => T;

function failure(url: string, error: unknown): LoadedResource<never> {
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
export async function loadWrapped<T>(
  fetcher: typeof fetch,
  url: string,
  ctor: Wrapper<T>,
  iri = url,
): Promise<LoadedResource<T>> {
  try {
    const dataset = await readDataset(fetcher, url);
    return { state: "ok", url, value: new ctor(iri, dataset, DataFactory) };
  } catch (error) {
    return failure(url, error);
  }
}

/** The members of a container (`ldp:contains`), sorted. */
export async function listMembers(
  fetcher: typeof fetch,
  container: string,
): Promise<LoadedResource<string[]>> {
  try {
    return { state: "ok", url: container, value: await membersOf(fetcher, container) };
  } catch (error) {
    return failure(container, error);
  }
}

export const isOk = <T>(
  loaded: LoadedResource<T> | undefined,
): loaded is Extract<LoadedResource<T>, { state: "ok" }> => loaded?.state === "ok";

/** The loaded values of a list of reads, skipping the ones that failed. */
export function oks<T>(
  loaded: readonly LoadedResource<T>[],
): Extract<LoadedResource<T>, { state: "ok" }>[] {
  return loaded.filter(
    (entry): entry is Extract<LoadedResource<T>, { state: "ok" }> => entry.state === "ok",
  );
}

/**
 * The IRI of the node typed `classIri`. A credential copied from its issuer's pod keeps the IRI
 * it was signed with, which is not the URL it was read from.
 */
export function typedSubject(dataset: DatasetCore, classIri: string): string | undefined {
  for (const quad of dataset.match(
    null,
    DataFactory.namedNode(RDF_TYPE),
    DataFactory.namedNode(classIri),
  )) {
    if (quad.subject.termType === "NamedNode") return quad.subject.value;
  }
  return undefined;
}
