/**
 * sm-65 — mort-shaped synthetic generation: `@jeswr/synthetic-rdf` driven by
 * the sm-19 shapes graph ({@link mortgageShapesDataset}), independently
 * validated by the `shacl-engine` adapter (never the generator refereeing
 * itself). Used for deterministic BACKGROUND instances (unpinned data around
 * the scripted personas — e.g. extra decision records in a lender list view);
 * the scripted personas themselves are pinned through the sm-20 typed-wrapper
 * fixtures, not generated.
 *
 * Determinism contract: same `(seed, now, targets, overrides)` ⇒
 * byte-identical `toTurtle()` on any machine (synthetic-rdf §3.1).
 *
 * UPSTREAM REALITY CHECK (pinned by solid-kit's suite, 2026-07-17): every
 * sm-19 document currently errors loudly in synthetic-rdf v1 — the shared
 * `common` support shapes use NODE-LEVEL `sh:node` conjunction
 * (`mshape:AppraisedPropertyShape sh:node mshape:PropertyShape`), the
 * appraisal shape carries `sh:sparql`, and the loan application uses
 * `sh:qualifiedValueShape`; all three are documented out-of-v1-scope
 * constraints that the generator refuses rather than silently skipping.
 * The wiring here is the sm-65 "mort SHACL inputs" surface; enabling mort
 * background generation is upstream synthetic-rdf work (reported for
 * beading — never worked around by hand-rolled generation). The scripted
 * pod layout does NOT depend on generation.
 */

import {
  generate,
  type ShapeOverride,
  type SyntheticRdfResult,
  type TargetSpec,
} from "@jeswr/synthetic-rdf";
import { shaclEngineValidator } from "@jeswr/synthetic-rdf/validate";
import type { ShapesDocumentKey } from "@mortgage/data-model";
import { DataFactory } from "n3";
import { MORT_SHAPE_IRIS, mortgageShapesDataset } from "./shapes.js";

export interface MortgageGenerationTarget {
  /** A shapes-document key; the document's root node shape is targeted. */
  readonly document: Exclude<ShapesDocumentKey, "common">;
  readonly count: number;
}

export interface GenerateMortgageInstancesOptions {
  /** REQUIRED explicit seed — determinism is the contract. */
  readonly seed: string;
  /** REQUIRED temporal anchor (dates in the shapes' value spaces). */
  readonly now: Date;
  readonly targets: readonly MortgageGenerationTarget[];
  /** Pinned override coordinates (synthetic-rdf §3.3). */
  readonly overrides?: readonly ShapeOverride[];
  /** Exact-listed real external IRIs admitted as identity pins. */
  readonly allowedExternalIris?: ReadonlySet<string>;
}

/**
 * Generate mort-shaped instances from the sm-19 shapes graph with the
 * independent SHACL check on (synthetic-rdf `generate()`, never unchecked).
 */
export async function generateMortgageInstances(
  options: GenerateMortgageInstancesOptions,
): Promise<SyntheticRdfResult> {
  const shapes = await mortgageShapesDataset(options.targets.map((target) => target.document));
  const targets: TargetSpec[] = options.targets.map((target) => ({
    shape: DataFactory.namedNode(MORT_SHAPE_IRIS[target.document]),
    count: target.count,
  }));
  return generate({
    shapes,
    seed: options.seed,
    now: options.now,
    targets,
    ...(options.overrides === undefined ? {} : { overrides: options.overrides }),
    ...(options.allowedExternalIris === undefined
      ? {}
      : { allowedExternalIris: options.allowedExternalIris }),
    validator: shaclEngineValidator(),
  });
}

export { MORT_SHAPE_IRIS };
