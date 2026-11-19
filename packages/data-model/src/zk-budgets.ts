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
  readonly key:
    | "monthlyGrossIncomeUsd"
    | "totalMonthlyDebtUsd"
    | "creditScoreValue"
    | "cashFlowScoreValue"
    | "nsf90Count";
  /** Full IRI of the field (mort namespace). */
  readonly iri: string;
  /** Scaled unit of the integer value. */
  readonly unit: "USD/month" | "score points" | "count";
  /** Decision 0005 digit budget: the widest operand a proof over the field may use. */
  readonly digits: 2 | 3 | 4;
  /**
   * The narrowest operand a proof over the field may use. A proof's circuit member has exactly
   * the hidden value's digit count, and both the prover and the verifier refuse a member
   * narrower than this. The mortgage fields keep 2 (their narrowest committed member before the
   * one-digit member was added for the lending demo's zero count), so their behaviour is
   * unchanged.
   */
  readonly minDigits: 1 | 2 | 3 | 4;
  /** Inclusive minimum, mirrored by sh:minInclusive in the shapes. */
  readonly minInclusive: number;
  /** Inclusive maximum, mirrored by sh:maxInclusive in the shapes. */
  readonly maxInclusive: number;
  /** sparq circuit that proves threshold statements over the field. */
  readonly circuit: "filter_int_d2" | "filter_int_d3" | "filter_int_d4";
}

export const ZK_FIELD_BUDGETS: readonly ZkFieldBudget[] = [
  {
    key: "monthlyGrossIncomeUsd",
    iri: MORT.monthlyGrossIncomeUsd,
    unit: "USD/month",
    digits: 4,
    minDigits: 2,
    minInclusive: 0,
    maxInclusive: 9999,
    circuit: "filter_int_d4",
  },
  {
    key: "totalMonthlyDebtUsd",
    iri: MORT.totalMonthlyDebtUsd,
    unit: "USD/month",
    digits: 4,
    minDigits: 2,
    minInclusive: 0,
    maxInclusive: 9999,
    circuit: "filter_int_d4",
  },
  {
    key: "creditScoreValue",
    iri: MORT.creditScoreValue,
    unit: "score points",
    digits: 3,
    minDigits: 2,
    minInclusive: 300,
    maxInclusive: 850,
    circuit: "filter_int_d3",
  },
  // Small-dollar lending (flows.md section 4, step 6), ported from jeswr/solid-lending's
  // lend:cashFlowScoreValue and lend:nsf90Count budgets.
  {
    key: "cashFlowScoreValue",
    iri: MORT.cashFlowScoreValue,
    unit: "score points",
    digits: 3,
    minDigits: 3,
    minInclusive: 300,
    maxInclusive: 850,
    circuit: "filter_int_d3",
  },
  {
    // "No returned payments" is the equality statement nsf90Count = 0, proved over the
    // one-digit member (filter_int_d1); a count of 10 or more uses filter_int_d2.
    key: "nsf90Count",
    iri: MORT.nsf90Count,
    unit: "count",
    digits: 2,
    minDigits: 1,
    minInclusive: 0,
    maxInclusive: 99,
    circuit: "filter_int_d2",
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
