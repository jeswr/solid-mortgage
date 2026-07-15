import { MORT } from "./vocab/mort.js";

/**
 * The per-field scaled-unit / digit-budget table of decision 0005 (which
 * supersedes docs/research/vocab.md section 6). These are the ONLY
 * ZK-provable fields; every value is a plain xsd:integer in the stated unit,
 * and the SHACL shapes pin the identical bounds (test-enforced, no drift).
 *
 * The bounds give the sparq filter circuits their operand width statically:
 * seeded fixture values MUST respect them.
 */
export interface ZkFieldBudget {
  /** Constant key in the MORT vocabulary map. */
  readonly key: "monthlyGrossIncomeUsd" | "totalMonthlyDebtUsd" | "creditScoreValue";
  /** Full IRI of the field (mort namespace). */
  readonly iri: string;
  /** Scaled unit of the integer value. */
  readonly unit: "USD/month" | "score points";
  /** Decision 0005 digit budget. */
  readonly digits: 3 | 4;
  /** Inclusive minimum, mirrored by sh:minInclusive in the shapes. */
  readonly minInclusive: number;
  /** Inclusive maximum, mirrored by sh:maxInclusive in the shapes. */
  readonly maxInclusive: number;
  /** sparq circuit that proves threshold statements over the field. */
  readonly circuit: "filter_int_d3" | "filter_int_d4";
}

export const ZK_FIELD_BUDGETS: readonly ZkFieldBudget[] = [
  {
    key: "monthlyGrossIncomeUsd",
    iri: MORT.monthlyGrossIncomeUsd,
    unit: "USD/month",
    digits: 4,
    minInclusive: 0,
    maxInclusive: 9999,
    circuit: "filter_int_d4",
  },
  {
    key: "totalMonthlyDebtUsd",
    iri: MORT.totalMonthlyDebtUsd,
    unit: "USD/month",
    digits: 4,
    minInclusive: 0,
    maxInclusive: 9999,
    circuit: "filter_int_d4",
  },
  {
    key: "creditScoreValue",
    iri: MORT.creditScoreValue,
    unit: "score points",
    digits: 3,
    minInclusive: 300,
    maxInclusive: 850,
    circuit: "filter_int_d3",
  },
] as const;

/**
 * IRIs a mort:ZkOperandAnchor may anchor (decision 0012). Equals the sh:in
 * list of mshape:ZkOperandAnchorSubjectShape's mort:field constraint
 * (test-enforced).
 */
export const ZK_ANCHORABLE_FIELD_IRIS: readonly string[] = ZK_FIELD_BUDGETS.map(
  (budget) => budget.iri,
);

/** Budget for a field IRI, or undefined when the field is not ZK-provable. */
export function zkBudgetFor(fieldIri: string): ZkFieldBudget | undefined {
  return ZK_FIELD_BUDGETS.find((budget) => budget.iri === fieldIri);
}

/**
 * True when the integer fits the field's digit budget - use for seed/fixture
 * data before it reaches a circuit (decision 0005 consequence M5).
 */
export function fitsZkBudget(fieldIri: string, value: number): boolean {
  const budget = zkBudgetFor(fieldIri);
  if (!budget || !Number.isSafeInteger(value)) return false;
  return value >= budget.minInclusive && value <= budget.maxInclusive;
}
