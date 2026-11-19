/**
 * sm-65 — the mort SHACL INPUTS of the seeder design (§5.1): the sm-19
 * shapes graph exposed as an RDF/JS `DatasetCore` (plus per-resource shape
 * IRIs), so the generic `@jeswr/synthetic-rdf` generator and any independent
 * validator consume the SAME shapes the typed wrappers validate against —
 * the decision-0005 digit budgets ride in on the shapes.
 *
 * Parsing goes through the sanctioned `@jeswr/fetch-rdf` `parseRdf` path
 * (never an inline N3 parser).
 */

import { parseRdf } from "@jeswr/fetch-rdf";
import { SHAPES_TURTLE, type ShapesDocumentKey } from "@mortgage/data-model";
import type { DatasetCore, Quad } from "@rdfjs/types";
import { Store } from "n3";

/** The published shapes namespace (`mshape:`). */
export const MORT_SHAPES_NAMESPACE = "https://solid-mortgage-vocab.vercel.app/shapes#";

/** Node-shape IRI per shapes document (the `sh:targetClass`-bearing root). */
export const MORT_SHAPE_IRIS: Readonly<
  Partial<Record<Exclude<ShapesDocumentKey, "common">, string>>
> = {
  "appraisal-credential": `${MORT_SHAPES_NAMESPACE}AppraisalCredentialShape`,
  "asset-credential": `${MORT_SHAPES_NAMESPACE}AssetCredentialShape`,
  "borrower-profile": `${MORT_SHAPES_NAMESPACE}BorrowerProfileShape`,
  "closing-record": `${MORT_SHAPES_NAMESPACE}ClosingRecordShape`,
  "consent-receipt": `${MORT_SHAPES_NAMESPACE}ConsentReceiptShape`,
  "credit-score-credential": `${MORT_SHAPES_NAMESPACE}CreditScoreCredentialShape`,
  "employment-income-credential": `${MORT_SHAPES_NAMESPACE}EmploymentIncomeCredentialShape`,
  "loan-application": `${MORT_SHAPES_NAMESPACE}LoanApplicationShape`,
  "title-clear-credential": `${MORT_SHAPES_NAMESPACE}TitleClearCredentialShape`,
  "underwriting-decision": `${MORT_SHAPES_NAMESPACE}UnderwritingDecisionShape`,
  "zk-operand-anchor": `${MORT_SHAPES_NAMESPACE}ZkOperandAnchorShape`,
};

const cache = new Map<string, Promise<DatasetCore>>();

async function parseShapes(keys: readonly ShapesDocumentKey[]): Promise<DatasetCore> {
  const store = new Store();
  for (const key of keys) {
    const turtle = SHAPES_TURTLE[key];
    const parsed = await parseRdf(turtle, "text/turtle", {
      baseIRI: `${MORT_SHAPES_NAMESPACE.slice(0, -1)}/${key}`,
    });
    for (const quad of parsed) store.add(quad as Quad);
  }
  return store as unknown as DatasetCore;
}

/**
 * The mort shapes graph as an RDF/JS dataset. With no argument: ALL sm-19
 * documents merged (validation use). With `keys`: only the named documents
 * plus the `common` support shapes they reference via `sh:node` — the
 * GENERATION subset (`@jeswr/synthetic-rdf` refuses a graph containing any
 * documented-unsupported constraint anywhere, so generation feeds it only
 * the documents it targets). Parsed once per subset; treat as read-only.
 */
export function mortgageShapesDataset(
  keys?: readonly Exclude<ShapesDocumentKey, "common">[],
): Promise<DatasetCore> {
  const requested: readonly ShapesDocumentKey[] =
    keys === undefined
      ? (Object.keys(SHAPES_TURTLE) as readonly ShapesDocumentKey[])
      : [...keys, "common"];
  const cacheKey = [...requested].sort().join("\u0000");
  let entry = cache.get(cacheKey);
  if (entry === undefined) {
    entry = parseShapes(requested).catch((error: unknown) => {
      cache.delete(cacheKey);
      throw error;
    });
    cache.set(cacheKey, entry);
  }
  return entry;
}
