// AUTHORED-BY Claude Opus 5.5
/**
 * Read a resource from a pod as Wrenfield (`podFetch`), parse it with `@jeswr/fetch-rdf` (through
 * content's `readDataset`) and wrap it with a data-model class. A refusal is a result, not an
 * error: the screen shows it.
 */
import { readDataset } from "@mortgage/content/mortgage/world";
import { RDF_TYPE } from "@mortgage/data-model";
import { podFetch } from "@mortgage/pod-runtime";
import type { DatasetCore } from "@rdfjs/types";
import { DataFactory } from "n3";
import { useEffect, useState } from "react";
import { statusOfError } from "./action.ts";

export type Read<T> =
  | { readonly phase: "idle" }
  | { readonly phase: "loading" }
  | { readonly phase: "ok"; readonly value: T }
  | { readonly phase: "refused"; readonly status: number }
  | { readonly phase: "missing" }
  | { readonly phase: "failed"; readonly message: string };

/** Classify a failed read. Pure. */
export function readFailure<T>(error: unknown): Read<T> {
  const status = statusOfError(error);
  if (status === 401 || status === 403) return { phase: "refused", status };
  if (status === 404) return { phase: "missing" };
  return { message: error instanceof Error ? error.message : String(error), phase: "failed" };
}

/** GET `url` once `enabled` is true (and again when `version` changes). */
export function usePodResource<T>(
  url: string,
  enabled: boolean,
  wrap: (url: string, dataset: DatasetCore) => T,
  version = 0,
): Read<T> {
  const [read, setRead] = useState<Read<T>>({ phase: "idle" });
  // biome-ignore lint/correctness/useExhaustiveDependencies: version is a deliberate re-read trigger
  useEffect(() => {
    if (!enabled) {
      setRead({ phase: "idle" });
      return;
    }
    let live = true;
    setRead({ phase: "loading" });
    readDataset(podFetch, url).then(
      (dataset) => live && setRead({ phase: "ok", value: wrap(url, dataset) }),
      (error: unknown) => live && setRead(readFailure<T>(error)),
    );
    return () => {
      live = false;
    };
  }, [url, enabled, wrap, version]);
  return read;
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
