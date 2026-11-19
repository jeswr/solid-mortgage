// AUTHORED-BY Claude Opus 5.5
/**
 * Read a resource from a pod as Wrenfield (`podFetch`), parse it with `@jeswr/fetch-rdf` (through
 * content's `readDataset`) and wrap it with a data-model class. A refusal is a result, not an
 * error: the screen shows it (`@mortgage/demo-kit/react`'s `usePodResource`).
 */
import { readDataset } from "@mortgage/content/mortgage/world";
import { createUsePodResource } from "@mortgage/demo-kit/react";
import { podFetch } from "@mortgage/pod-runtime";
import type { DatasetCore } from "@rdfjs/types";

export { typedSubject } from "@mortgage/content/mortgage/reads";
export { type Read, readFailure } from "@mortgage/demo-kit/react";

/** GET `url` once `enabled` is true (and again when `version` changes). */
export const usePodResource = createUsePodResource<DatasetCore>((url) =>
  readDataset(podFetch, url),
);
