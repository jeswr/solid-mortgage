import dataFactory from "@rdfjs/data-model";
import datasetFactory from "@rdfjs/dataset";
import type { DatasetCore, Term } from "@rdfjs/types";
import { Parser, Store } from "n3";
import { Validator } from "shacl-engine";
import { validations as sparqlValidations } from "shacl-engine/sparql.js";
import { ALL_SHAPES_DOCUMENTS } from "./shapes/shapes.js";
import { MORT } from "./vocab/mort.js";

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

/**
 * sh:targetClass of each resource shape, keyed by its shapes document. Kept in
 * lock-step with shapes/*.ttl by a test. Used by validate()'s `expect` option:
 * SHACL validation is target-driven, so a document containing NO node of the
 * expected class would otherwise conform vacuously - dangerous for untrusted
 * pod RDF.
 */
export const RESOURCE_TARGET_CLASSES = {
  "borrower-profile": "https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/Borrower",
  "employment-income-credential": MORT.EmploymentIncomeCredential,
  "asset-credential": MORT.AssetCredential,
  "credit-score-credential": MORT.CreditScoreCredential,
  "appraisal-credential": MORT.AppraisalCredential,
  "title-clear-credential": MORT.TitleClearCredential,
  "loan-application":
    "https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/LoanApplications/LoanApplication",
  "underwriting-decision":
    "https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/LoanApplications/UnderwritingDecision",
  "closing-record":
    "https://spec.edmcouncil.org/fibo/ontology/LOAN/RealEstateLoans/Mortgages/Mortgage",
  "zk-operand-anchor": MORT.ZkOperandAnchor,
} as const;

/** The mortgage resource kinds validate() can be told to expect. */
export type MortgageResourceKind = keyof typeof RESOURCE_TARGET_CLASSES;

/** One SHACL validation result, flattened to plain strings for callers. */
export interface ShaclViolation {
  /** Human-readable message (sh:message where the shape provides one). */
  readonly message: string;
  /** IRI or blank-node label of the failing focus node. */
  readonly focusNode?: string;
  /** Predicate IRIs of the failing property path, in step order. */
  readonly path: readonly string[];
  /** The offending value, when the constraint reports one. */
  readonly value?: string;
  /** IRI of the SHACL constraint component that failed. */
  readonly constraintComponent?: string;
}

/** Result of validating a dataset against the bundled mortgage shapes. */
export interface ShaclReport {
  readonly conforms: boolean;
  readonly violations: readonly ShaclViolation[];
}

export interface ValidateOptions {
  /**
   * Base IRI used when `data` is a Turtle string - pass the pod resource URL
   * so relative IRIs resolve the way the server sees them.
   */
  readonly baseIRI?: string;
  /**
   * The resource kind this document is supposed to contain. When set, a
   * document with no node typed as that kind's target class FAILS instead of
   * conforming vacuously. ALWAYS set this when validating untrusted pod RDF.
   */
  readonly expect?: MortgageResourceKind;
}

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

function shapesValidator(): Validator {
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

function termValue(candidate: unknown): string | undefined {
  if (!candidate || typeof candidate !== "object") return undefined;
  const direct = candidate as Term;
  if (typeof direct.termType === "string" && typeof direct.value === "string") {
    return direct.value;
  }
  const wrapped = (candidate as { term?: Term }).term;
  return wrapped && typeof wrapped.value === "string" ? wrapped.value : undefined;
}

function pathPredicates(path: unknown): readonly string[] {
  if (!Array.isArray(path)) return [];
  const predicates: string[] = [];
  for (const step of path) {
    const stepPredicates = (step as { predicates?: readonly Term[] }).predicates;
    if (!Array.isArray(stepPredicates)) continue;
    for (const predicate of stepPredicates) {
      const value = termValue(predicate);
      if (value !== undefined) predicates.push(value);
    }
  }
  return predicates;
}

/**
 * Validate pod data against the bundled mortgage SHACL shapes (the nine
 * resource shapes + the ZK operand anchor, decision 0005/0012).
 *
 * Every resource an app writes MUST conform before the write; treat pod RDF
 * as untrusted input and validate on read where the data crosses a trust
 * boundary. Accepts any RDF/JS DatasetCore (e.g. the dataset behind a
 * `@jeswr/fetch-rdf` result) or a Turtle string.
 */
export async function validate(
  data: DatasetCore | string,
  options: ValidateOptions = {},
): Promise<ShaclReport> {
  const dataset: DatasetCore =
    typeof data === "string"
      ? new Store(new Parser({ format: "text/turtle", baseIRI: options.baseIRI }).parse(data))
      : data;

  if (options.expect !== undefined) {
    const targetClass = RESOURCE_TARGET_CLASSES[options.expect];
    const typed = dataset.match(
      null,
      dataFactory.namedNode(RDF_TYPE),
      dataFactory.namedNode(targetClass),
    );
    if (typed.size === 0) {
      return {
        conforms: false,
        violations: [
          {
            message: `no ${options.expect} resource found: expected at least one node typed <${targetClass}> (SHACL targeting would conform vacuously)`,
            path: [RDF_TYPE],
          },
        ],
      };
    }
  }

  const report = await shapesValidator().validate({ dataset });

  return {
    conforms: report.conforms,
    violations: flattenResults(report.results).map((result) => ({
      message:
        result.message.map((literal) => literal.value).join("; ") ||
        (termValue(result.constraintComponent) ?? "constraint violated"),
      focusNode: termValue(result.focusNode),
      path: pathPredicates(result.path),
      value: termValue(result.value),
      constraintComponent: termValue(result.constraintComponent),
    })),
  };
}

type EngineResult = Awaited<ReturnType<Validator["validate"]>>["results"][number];

/**
 * Flatten nested results depth-first. Parents stay in the list: a qualified
 * or sh:node violation is reported by its parent result, while its children
 * explain which inner constraint each value missed.
 */
function flattenResults(results: readonly EngineResult[]): readonly EngineResult[] {
  return results.flatMap((result) => [result, ...flattenResults(result.results)]);
}
