// AUTHORED-BY Claude Opus 5.5
/**
 * The SHACL engine over the bundled shapes. Kept apart from `shacl.ts` so a browser bundle loads
 * it (shacl-engine, its SPARQL validations over Comunica and Traqula, and ~100 kB of shapes
 * Turtle) only when something is first validated: `validate()` reaches it by dynamic import.
 */
import dataFactory from "@rdfjs/data-model";
import datasetFactory from "@rdfjs/dataset";
import { Parser, Store } from "n3";
import { Validator } from "shacl-engine";
import { validations as sparqlValidations } from "shacl-engine/sparql.js";
import { ALL_SHAPES_DOCUMENTS } from "./shapes/shapes.js";

/**
 * shacl-engine needs a combined RDF/JS data factory + dataset factory (its
 * validation report is built with `factory.dataset()`).
 */
const engineFactory = {
  ...dataFactory,
  namedNode: dataFactory.namedNode.bind(dataFactory),
  blankNode: dataFactory.blankNode.bind(dataFactory),
  literal: dataFactory.literal.bind(dataFactory),
  variable: dataFactory.variable?.bind(dataFactory),
  defaultGraph: dataFactory.defaultGraph.bind(dataFactory),
  quad: dataFactory.quad.bind(dataFactory),
  dataset: datasetFactory.dataset.bind(datasetFactory),
};

let cachedValidator: Validator | undefined;

/** The validator over every bundled shapes document, built once. */
export function shapesValidator(): Validator {
  if (!cachedValidator) {
    const shapes = new Store();
    for (const turtle of ALL_SHAPES_DOCUMENTS) {
      shapes.addQuads(new Parser({ format: "text/turtle" }).parse(turtle));
    }
    // details: nested sh:node results are reported, so a violation inside a
    // support shape (e.g. a bad postalCode) surfaces itself rather than an
    // opaque NodeConstraintComponent at the referencing property.
    // sparql validations power the cross-node constraints (sh:sparql).
    cachedValidator = new Validator(shapes, {
      factory: engineFactory,
      details: true,
      validations: sparqlValidations,
    });
  }
  return cachedValidator;
}
