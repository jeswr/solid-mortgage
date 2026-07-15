import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Parser, type Quad_Object, Store, type Term } from "n3";
import { describe, expect, test } from "vitest";
import { validate } from "../src/shacl.js";
import { ALL_SHAPES_DOCUMENTS, SHAPES_DOCUMENT_KEYS } from "../src/shapes/shapes.js";
import { MORT } from "../src/vocab/mort.js";
import { ZK_ANCHORABLE_FIELD_IRIS, ZK_FIELD_BUDGETS } from "../src/zk-budgets.js";

const PACKAGE_ROOT = path.resolve(import.meta.dirname, "..");
const SH = "http://www.w3.org/ns/shacl#";
const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const XSD = "http://www.w3.org/2001/XMLSchema#";

function fixture(name: string): string {
  return readFileSync(path.join(PACKAGE_ROOT, "test", "fixtures", `${name}.ttl`), "utf8");
}

function shapesStore(): Store {
  const store = new Store();
  for (const turtle of ALL_SHAPES_DOCUMENTS) {
    store.addQuads(new Parser({ format: "text/turtle" }).parse(turtle));
  }
  return store;
}

test("committed shapes module matches shapes/*.ttl (codegen freshness)", () => {
  execFileSync(process.execPath, ["scripts/generate-shapes.mjs", "--check"], {
    cwd: PACKAGE_ROOT,
    stdio: "pipe",
  });
});

test("the ten shape documents are bundled", () => {
  expect([...SHAPES_DOCUMENT_KEYS].sort()).toEqual([
    "appraisal-credential",
    "asset-credential",
    "borrower-profile",
    "closing-record",
    "common",
    "credit-score-credential",
    "employment-income-credential",
    "loan-application",
    "title-clear-credential",
    "underwriting-decision",
    "zk-operand-anchor",
  ]);
});

test("every targeted resource shape is closed", () => {
  const store = shapesStore();
  const targeted = store.getSubjects(`${SH}targetClass`, null, null);
  expect(targeted.length).toBe(10);
  for (const shape of targeted) {
    const closed = store.getObjects(shape, `${SH}closed`, null);
    expect(
      closed.map((term) => term.value),
      `${shape.value} must be sh:closed`,
    ).toEqual(["true"]);
  }
});

// One conforming and one violating fixture per resource shape. The expected
// constraint components pin WHICH rule failed, not just non-conformance.
const cases: readonly {
  name: string;
  expectedViolations: readonly string[];
}[] = [
  {
    name: "borrower-profile",
    expectedViolations: ["InConstraintComponent", "ClosedConstraintComponent"],
  },
  {
    name: "employment-income-credential",
    expectedViolations: ["MaxInclusiveConstraintComponent", "ClosedConstraintComponent"],
  },
  {
    name: "asset-credential",
    expectedViolations: ["PatternConstraintComponent", "InConstraintComponent"],
  },
  {
    name: "credit-score-credential",
    expectedViolations: ["MaxInclusiveConstraintComponent", "MinCountConstraintComponent"],
  },
  { name: "appraisal-credential", expectedViolations: ["MinCountConstraintComponent"] },
  {
    name: "title-clear-credential",
    expectedViolations: ["DatatypeConstraintComponent", "InConstraintComponent"],
  },
  {
    name: "loan-application",
    expectedViolations: [
      "QualifiedMinCountConstraintComponent",
      "QualifiedMaxCountConstraintComponent",
      "MaxInclusiveConstraintComponent",
    ],
  },
  {
    name: "underwriting-decision",
    expectedViolations: ["MinCountConstraintComponent", "InConstraintComponent"],
  },
  {
    name: "closing-record",
    expectedViolations: ["MinCountConstraintComponent", "DatatypeConstraintComponent"],
  },
  {
    name: "zk-operand-anchor",
    expectedViolations: [
      "InConstraintComponent",
      "PatternConstraintComponent",
      "MinCountConstraintComponent",
    ],
  },
];

describe.each(cases)("$name", ({ name, expectedViolations }) => {
  test("conforming fixture validates", async () => {
    const report = await validate(fixture(`${name}.valid`));
    expect(report.violations).toEqual([]);
    expect(report.conforms).toBe(true);
  });

  test("violating fixture is rejected for the expected reasons", async () => {
    const report = await validate(fixture(`${name}.invalid`));
    expect(report.conforms).toBe(false);
    const components = new Set(
      report.violations.map((violation) => violation.constraintComponent?.split("#")[1]),
    );
    for (const expected of expectedViolations) {
      expect([...components], `${name}.invalid should violate ${expected}`).toContain(expected);
    }
  });
});

describe("ZK digit budgets (decision 0005) stay in lock-step with the shapes", () => {
  const store = shapesStore();

  function literalNumber(objects: readonly Term[]): number | undefined {
    const [term] = objects;
    return term === undefined ? undefined : Number(term.value);
  }

  test.each([...ZK_FIELD_BUDGETS])(
    "$key bounds match sh:minInclusive/sh:maxInclusive",
    (budget) => {
      const propertyShapes = store.getSubjects(`${SH}path`, budget.iri, null);
      expect(
        propertyShapes.length,
        `${budget.iri} must be constrained by at least one property shape`,
      ).toBeGreaterThanOrEqual(1);
      for (const shape of propertyShapes) {
        expect(literalNumber(store.getObjects(shape, `${SH}minInclusive`, null))).toBe(
          budget.minInclusive,
        );
        expect(literalNumber(store.getObjects(shape, `${SH}maxInclusive`, null))).toBe(
          budget.maxInclusive,
        );
        const datatypes = store.getObjects(shape, `${SH}datatype`, null);
        expect(datatypes.map((term) => term.value)).toEqual([`${XSD}integer`]);
      }
    },
  );

  test("digit budgets bound their maxima", () => {
    for (const budget of ZK_FIELD_BUDGETS) {
      expect(budget.maxInclusive).toBeLessThanOrEqual(10 ** budget.digits - 1);
      expect(budget.minInclusive).toBeGreaterThanOrEqual(0);
    }
  });

  test("the anchor's sh:in field list equals the budget table (decision 0012)", () => {
    const fieldShapes = store.getSubjects(`${SH}path`, MORT.field, null);
    expect(fieldShapes.length).toBe(1);
    const fieldShape = fieldShapes[0];
    expect(fieldShape).toBeDefined();
    if (fieldShape === undefined) return;
    const [listHead] = store.getObjects(fieldShape, `${SH}in`, null);
    expect(listHead).toBeDefined();
    if (listHead === undefined) return;
    const anchorable: string[] = [];
    let node: Quad_Object | undefined = listHead;
    while (node !== undefined && node.value !== `${RDF}nil`) {
      const [first] = store.getObjects(node, `${RDF}first`, null);
      if (first !== undefined) anchorable.push(first.value);
      [node] = store.getObjects(node, `${RDF}rest`, null);
    }
    expect(anchorable.sort()).toEqual([...ZK_ANCHORABLE_FIELD_IRIS].sort());
  });
});
