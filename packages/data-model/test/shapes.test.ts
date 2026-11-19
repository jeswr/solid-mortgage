import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Parser, type Quad_Object, Store, type Term } from "n3";
import { describe, expect, test } from "vitest";
import { type MortgageResourceKind, RESOURCE_TARGET_CLASSES, validate } from "../src/shacl.js";
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

test("the shapes module has no unmarked top-level call, so apps' first loads leave it out", () => {
  // The package index re-exports the lists; only the lazily loaded validator reads them. A
  // top-level call a bundler cannot prove pure keeps every shape's Turtle in each app's first
  // load (acceptance test 15).
  const source = readFileSync(path.join(PACKAGE_ROOT, "src", "shapes", "shapes.ts"), "utf8");
  const calls = [...source.matchAll(/^export const \w+[^=]*=\s*(\/\* @__PURE__ \*\/ )?Object\./gm)];
  expect(calls.length).toBe(2);
  for (const call of calls) expect(call[1], call[0]).toBeDefined();
});

test("committed shapes module matches shapes/*.ttl (codegen freshness)", () => {
  execFileSync(process.execPath, ["scripts/generate-shapes.mjs", "--check"], {
    cwd: PACKAGE_ROOT,
    stdio: "pipe",
  });
});

test("every shape document is bundled", () => {
  expect([...SHAPES_DOCUMENT_KEYS].sort()).toEqual([
    "access-request",
    "address-record",
    "adverse-action-notice",
    "agent-profile",
    "allergy-intolerance",
    "appraisal-credential",
    "asset-credential",
    "borrower-profile",
    "cash-flow-credential",
    "claim-case",
    "closed-end-disclosure",
    "closing-disclosure",
    "closing-record",
    "common",
    "consent-receipt",
    "contact-details",
    "credential-pointer",
    "credit-report",
    "credit-score-credential",
    "damage-report",
    "data-product",
    "discharge-summary",
    "document",
    "employment-income-credential",
    "encounter-record",
    "escrow-statement",
    "evidence-of-insurance-credential",
    "fhir-support",
    "identity-credential",
    "inbox-message",
    "kyb-beneficial-ownership-credential",
    "kyb-cdd-decision-record",
    "kyb-common",
    "kyb-officer-authorisation-credential",
    "kyb-organisational-identity-credential",
    "kyc-attestation-credential",
    "loan-application",
    "loan-estimate",
    "medication-dispense",
    "medication-request",
    "medication-statement",
    "motor-incident-report",
    "motor-policy-credential",
    "odrl-policy",
    "other-party-details",
    "payment-mandate",
    "payout-instruction",
    "provenance-record",
    "purchase-agreement",
    "recorded-instrument",
    "recording-receipt",
    "repair-estimate",
    "repair-invoice",
    "repayment-history-credential",
    "score-notice",
    "service-order",
    "servicing-notice",
    "settlement-statement",
    "subject-property",
    "support",
    "title-clear-credential",
    "title-commitment-credential",
    "trusted-issuer-list",
    "underwriting-decision",
    "vehicle",
    "zk-operand-anchor",
  ]);
});

test("every targeted resource shape is closed", () => {
  const store = shapesStore();
  const targeted = store.getSubjects(`${SH}targetClass`, null, null);
  expect(targeted.length).toBe(61);
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
    expectedViolations: [
      "PatternConstraintComponent",
      "InConstraintComponent",
      "LessThanConstraintComponent",
    ],
  },
  {
    name: "credit-score-credential",
    expectedViolations: ["MaxInclusiveConstraintComponent", "MinCountConstraintComponent"],
  },
  {
    name: "appraisal-credential",
    expectedViolations: ["MinCountConstraintComponent", "SPARQLConstraintComponent"],
  },
  {
    name: "title-clear-credential",
    expectedViolations: ["DatatypeConstraintComponent", "InConstraintComponent"],
  },
  {
    name: "loan-application",
    // OrConstraintComponent: refinance purpose present without a cash-out
    // status trips the conditional cash-out constraint.
    expectedViolations: [
      "QualifiedMinCountConstraintComponent",
      "QualifiedMaxCountConstraintComponent",
      "MaxInclusiveConstraintComponent",
      "OrConstraintComponent",
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
    name: "consent-receipt",
    expectedViolations: ["InConstraintComponent"],
  },
  {
    name: "zk-operand-anchor",
    expectedViolations: [
      "InConstraintComponent",
      "PatternConstraintComponent",
      "MinCountConstraintComponent",
    ],
  },
  // Static rebuild (decision 0017): design.md section d.9 resources and their companions.
  {
    name: "agent-profile",
    expectedViolations: ["ClosedConstraintComponent", "MaxCountConstraintComponent"],
  },
  {
    name: "contact-details",
    expectedViolations: ["MinCountConstraintComponent", "PatternConstraintComponent"],
  },
  { name: "identity-credential", expectedViolations: ["PatternConstraintComponent"] },
  {
    name: "purchase-agreement",
    expectedViolations: [
      "ClosedConstraintComponent",
      "MinCountConstraintComponent",
      "DatatypeConstraintComponent",
    ],
  },
  {
    name: "subject-property",
    expectedViolations: ["MinInclusiveConstraintComponent", "InConstraintComponent"],
  },
  {
    name: "loan-estimate",
    expectedViolations: ["LessThanConstraintComponent", "MaxInclusiveConstraintComponent"],
  },
  { name: "closing-disclosure", expectedViolations: ["MaxInclusiveConstraintComponent"] },
  {
    name: "score-notice",
    expectedViolations: ["MaxInclusiveConstraintComponent", "InConstraintComponent"],
  },
  { name: "credit-report", expectedViolations: ["NodeKindConstraintComponent"] },
  {
    name: "title-commitment-credential",
    expectedViolations: ["ClosedConstraintComponent", "MinCountConstraintComponent"],
  },
  { name: "evidence-of-insurance-credential", expectedViolations: ["LessThanConstraintComponent"] },
  { name: "settlement-statement", expectedViolations: ["MinCountConstraintComponent"] },
  { name: "recording-receipt", expectedViolations: ["NodeKindConstraintComponent"] },
  {
    name: "recorded-instrument",
    expectedViolations: ["ClosedConstraintComponent", "MinCountConstraintComponent"],
  },
  { name: "servicing-notice", expectedViolations: ["InConstraintComponent"] },
  { name: "escrow-statement", expectedViolations: ["DatatypeConstraintComponent"] },
  { name: "payment-mandate", expectedViolations: ["MaxInclusiveConstraintComponent"] },
  { name: "access-request", expectedViolations: ["InConstraintComponent"] },
  { name: "odrl-policy", expectedViolations: ["MinCountConstraintComponent"] },
  { name: "service-order", expectedViolations: ["InConstraintComponent"] },
  { name: "inbox-message", expectedViolations: ["NodeKindConstraintComponent"] },
  { name: "credential-pointer", expectedViolations: ["PatternConstraintComponent"] },
  { name: "document", expectedViolations: ["MinCountConstraintComponent"] },
  {
    name: "kyc-attestation-credential",
    expectedViolations: ["ClosedConstraintComponent", "InConstraintComponent"],
  },
  {
    name: "trusted-issuer-list",
    expectedViolations: ["MinCountConstraintComponent", "LessThanConstraintComponent"],
  },
  // Small-dollar lending (flows.md section 4).
  {
    name: "cash-flow-credential",
    expectedViolations: ["MaxInclusiveConstraintComponent", "InConstraintComponent"],
  },
  { name: "repayment-history-credential", expectedViolations: ["MinCountConstraintComponent"] },
  { name: "closed-end-disclosure", expectedViolations: ["MaxInclusiveConstraintComponent"] },
  { name: "adverse-action-notice", expectedViolations: ["MinCountConstraintComponent"] },
  { name: "payout-instruction", expectedViolations: ["PatternConstraintComponent"] },
  // Motor claim demo (flows.md section 7).
  {
    name: "motor-incident-report",
    expectedViolations: ["LessThanOrEqualsConstraintComponent", "MinCountConstraintComponent"],
  },
  { name: "other-party-details", expectedViolations: ["PatternConstraintComponent"] },
  {
    name: "damage-report",
    expectedViolations: ["ClosedConstraintComponent", "MinCountConstraintComponent"],
  },
  {
    name: "repair-estimate",
    expectedViolations: ["MinCountConstraintComponent", "NodeConstraintComponent"],
  },
  { name: "repair-invoice", expectedViolations: ["NodeKindConstraintComponent"] },
  { name: "claim-case", expectedViolations: ["InConstraintComponent"] },
  {
    name: "motor-policy-credential",
    expectedViolations: ["NodeConstraintComponent"],
  },
  // Business KYB (demo 3).
  {
    name: "organisational-identity-credential",
    expectedViolations: ["HasValueConstraintComponent", "InConstraintComponent"],
  },
  { name: "officer-authorisation-credential", expectedViolations: ["ClosedConstraintComponent"] },
  {
    name: "beneficial-ownership-credential",
    expectedViolations: ["MaxInclusiveConstraintComponent", "DatatypeConstraintComponent"],
  },
  {
    name: "cdd-decision-record",
    expectedViolations: ["InConstraintComponent", "MinCountConstraintComponent"],
  },
  // Medication handover (flows.md section 5): FHIR R5 in RDF.
  {
    name: "medication-statement",
    expectedViolations: ["InConstraintComponent", "ClosedConstraintComponent"],
  },
  {
    name: "medication-request",
    expectedViolations: ["MinCountConstraintComponent", "InConstraintComponent"],
  },
  {
    name: "medication-dispense",
    expectedViolations: ["MinCountConstraintComponent", "NodeConstraintComponent"],
  },
  {
    name: "allergy-intolerance",
    expectedViolations: ["MinCountConstraintComponent", "InConstraintComponent"],
  },
  { name: "provenance-record", expectedViolations: ["MinCountConstraintComponent"] },
  {
    name: "discharge-summary",
    expectedViolations: ["InConstraintComponent", "MinCountConstraintComponent"],
  },
  {
    name: "encounter-record",
    expectedViolations: ["InConstraintComponent", "ClosedConstraintComponent"],
  },
];

// Generous timeout: the first validation pays comunica's cold start for the
// sh:sparql constraint (over 5s on a cold cache).
const VALIDATE_TIMEOUT_MS = 60_000;

describe.each(cases)("$name", ({ name, expectedViolations }) => {
  const kind = name as MortgageResourceKind;

  test(
    "conforming fixture validates",
    async () => {
      const report = await validate(fixture(`${name}.valid`), { expect: kind });
      expect(report.violations).toEqual([]);
      expect(report.conforms).toBe(true);
    },
    VALIDATE_TIMEOUT_MS,
  );

  test(
    "violating fixture is rejected for the expected reasons",
    async () => {
      const report = await validate(fixture(`${name}.invalid`), { expect: kind });
      expect(report.conforms).toBe(false);
      const components = new Set(
        report.violations.map((violation) => violation.constraintComponent?.split("#")[1]),
      );
      for (const expected of expectedViolations) {
        expect([...components], `${name}.invalid should violate ${expected}`).toContain(expected);
      }
    },
    VALIDATE_TIMEOUT_MS,
  );
});

describe("expect option (untrusted pod RDF must not conform vacuously)", () => {
  test("an empty document fails when a resource kind is expected", async () => {
    const report = await validate("", { expect: "credit-score-credential" });
    expect(report.conforms).toBe(false);
    expect(report.violations[0]?.message).toContain("no credit-score-credential resource found");
  });

  test("a document of the WRONG type fails the expected kind", async () => {
    const report = await validate(fixture("borrower-profile.valid"), {
      expect: "employment-income-credential",
    });
    expect(report.conforms).toBe(false);
  });

  test("a decoy typed node cannot stand in for an untyped root (focusNode)", async () => {
    // The document holds a fully valid credit-score credential (the decoy),
    // but the resource the caller asked about carries no type at all.
    const decoy = fixture("credit-score-credential.valid");
    const root = "https://alex.pod.example/credentials/credit-forged";
    const data = `${decoy}\n<${root}> <https://solid-mortgage-vocab.vercel.app/mort#creditScoreValue> 9999 .`;

    const kindOnly = await validate(data, { expect: "credit-score-credential" });
    expect(kindOnly.conforms).toBe(true); // the documented residual hazard

    const bound = await validate(data, {
      expect: "credit-score-credential",
      focusNode: root,
    });
    expect(bound.conforms).toBe(false);
    expect(bound.violations[0]?.message).toContain(root);
    expect(bound.violations[0]?.focusNode).toBe(root);
  });

  test("focusNode without expect is a usage error", async () => {
    await expect(
      validate("", { focusNode: "https://alex.pod.example/credentials/credit" }),
    ).rejects.toThrow(RangeError);
  });

  test("a typed focusNode is then fully validated by targeting", async () => {
    // Root carries the right type but violates the shape: binding the root
    // must not weaken validation.
    const report = await validate(fixture("credit-score-credential.invalid"), {
      expect: "credit-score-credential",
      focusNode: "https://alex.pod.example/credentials/credit",
    });
    expect(report.conforms).toBe(false);
  });

  test(
    "without expect, an empty document conforms (the documented hazard)",
    async () => {
      const report = await validate("");
      expect(report.conforms).toBe(true);
    },
    VALIDATE_TIMEOUT_MS,
  );

  test("RESOURCE_TARGET_CLASSES matches the shapes' sh:targetClass by document", () => {
    const targetsInShapes = new Set(
      shapesStore()
        .getObjects(null, `${SH}targetClass`, null)
        .map((term) => term.value),
    );
    expect(new Set(Object.values(RESOURCE_TARGET_CLASSES))).toEqual(targetsInShapes);
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
          budget.shapeMaxInclusive ?? budget.maxInclusive,
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
