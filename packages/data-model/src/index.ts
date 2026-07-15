export {
  type MortgageResourceKind,
  RESOURCE_TARGET_CLASSES,
  type ShaclReport,
  type ShaclViolation,
  type ValidateOptions,
  validate,
} from "./shacl.js";

export {
  ALL_SHAPES_DOCUMENTS,
  SHAPES_DOCUMENT_KEYS,
  SHAPES_TURTLE,
  type ShapesDocumentKey,
} from "./shapes/shapes.js";
export {
  MORT,
  MORT_NAMESPACE,
  MORT_ONTOLOGY_IRI,
  type MortTermIri,
  type MortTermKey,
} from "./vocab/mort.js";

export {
  fitsZkBudget,
  ZK_ANCHORABLE_FIELD_IRIS,
  ZK_FIELD_BUDGETS,
  type ZkFieldBudget,
  zkBudgetFor,
} from "./zk-budgets.js";

export const dataModelPackage = "@mortgage/data-model";
