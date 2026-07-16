import { DataFactory } from "n3";
import { describe, expect, test } from "vitest";
import { PERSONA_VALUES, type Persona, personas, RESOURCE_POD_PATHS } from "../src/personas.js";
import { validate } from "../src/shacl.js";
import { MORT } from "../src/vocab/mort.js";
import {
  AppraisalCredential,
  ClosingRecord,
  CreditScoreCredential,
  EmploymentIncomeCredential,
  LoanApplication,
  UnderwritingDecision,
} from "../src/wrappers/resources.js";
import { fitsZkBudget } from "../src/zk-budgets.js";

const NOW = new Date("2026-08-01T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

// Scene-2 demo thresholds (decision 0005): the pre-qualification proofs the
// personas must pass live.
const INCOME_THRESHOLD_USD = 7000;
const SCORE_THRESHOLD = 620;
const DTI_RATIO = 0.43;

// The first personas() call pays the SHACL validator cold start (shapes parse
// + sh:sparql compilation), which exceeds the 5s default on a loaded machine.
describe("personas()", { timeout: 60_000 }, () => {
  test("returns Alex Rivera (primary) plus one secondary persona", async () => {
    const all = await personas({ now: NOW });
    expect(all).toHaveLength(2);
    const primary = all.find((persona) => persona.role === "primary");
    expect(primary?.displayName).toBe("Alex Rivera");
    expect(primary?.webId).toBe("https://alex.pod.example/profile/card#me");
    expect(all.filter((persona) => persona.role === "secondary")).toHaveLength(1);
  });

  test("every resource of every persona conforms to its SHACL shape", async () => {
    for (const persona of await personas({ now: NOW })) {
      expect(persona.resources).toHaveLength(9);
      for (const resource of persona.resources) {
        const report = await validate(resource.dataset, {
          expect: resource.kind,
          focusNode: resource.focusNode,
        });
        expect(report.violations, `${persona.id} ${resource.kind}`).toEqual([]);
        expect(report.conforms, `${persona.id} ${resource.kind}`).toBe(true);
      }
    }
  });

  test("manifest is keyed by the SPEC pod paths", async () => {
    for (const persona of await personas({ now: NOW })) {
      expect([...persona.byPath.keys()].sort()).toEqual(Object.values(RESOURCE_POD_PATHS).sort());
      const income = persona.byPath.get("/mortgage/credentials/income");
      expect(income?.kind).toBe("employment-income-credential");
      expect(income?.iri).toBe(`${persona.podBase}mortgage/credentials/income`);
      expect(income?.turtle).toContain("cred:VerifiableCredential");
    }
  });

  test("same now + seed => byte-identical Turtle; different seed differs", async () => {
    const first = await personas({ now: new Date(NOW), seed: "seed-a" });
    const second = await personas({ now: new Date(NOW), seed: "seed-a" });
    const third = await personas({ now: new Date(NOW), seed: "seed-b" });
    for (const [index, persona] of first.entries()) {
      for (const [resourceIndex, resource] of persona.resources.entries()) {
        expect(second[index]?.resources[resourceIndex]?.turtle).toBe(resource.turtle);
      }
    }
    const turtleOf = (set: readonly Persona[]): string =>
      set.flatMap((persona) => persona.resources.map((resource) => resource.turtle)).join("\n");
    expect(turtleOf(third)).not.toBe(turtleOf(first));
  });

  test("employment VC is backdated validFrom -30d / validUntil +14d (decision 0012)", async () => {
    for (const persona of await personas({ now: NOW })) {
      const resource = persona.byPath.get("/mortgage/credentials/income");
      if (resource === undefined) throw new Error("income resource missing");
      const credential = new EmploymentIncomeCredential(
        resource.iri,
        resource.dataset,
        DataFactory,
      );
      expect(credential.validFrom.getTime()).toBe(NOW.getTime() - 30 * DAY_MS);
      expect(credential.validUntil?.getTime()).toBe(NOW.getTime() + 14 * DAY_MS);
    }
  });

  test("values fit the ZK digit budgets and clear the scene-2 thresholds", async () => {
    expect(PERSONA_VALUES).toHaveLength(2);
    for (const values of PERSONA_VALUES) {
      expect(fitsZkBudget(MORT.monthlyGrossIncomeUsd, values.monthlyGrossIncomeUsd)).toBe(true);
      expect(fitsZkBudget(MORT.creditScoreValue, values.creditScoreValue)).toBe(true);
      expect(fitsZkBudget(MORT.totalMonthlyDebtUsd, values.totalMonthlyDebtUsd)).toBe(true);
      expect(values.monthlyGrossIncomeUsd).toBeGreaterThanOrEqual(INCOME_THRESHOLD_USD);
      expect(values.creditScoreValue).toBeGreaterThanOrEqual(SCORE_THRESHOLD);
      // Recast DTI (decision 0005): hidden debts <= floor(0.43 x income).
      expect(values.totalMonthlyDebtUsd).toBeLessThanOrEqual(
        Math.floor(DTI_RATIO * values.monthlyGrossIncomeUsd),
      );
    }
  });

  test("the RDF carries the PERSONA_VALUES numbers (no drift)", async () => {
    const all = await personas({ now: NOW });
    for (const [index, persona] of all.entries()) {
      const values = PERSONA_VALUES[index];
      if (values === undefined) throw new Error("persona values missing");
      const creditResource = persona.byPath.get("/mortgage/credentials/credit");
      const incomeResource = persona.byPath.get("/mortgage/credentials/income");
      if (creditResource === undefined || incomeResource === undefined) {
        throw new Error("credential resources missing");
      }
      const credit = new CreditScoreCredential(
        creditResource.iri,
        creditResource.dataset,
        DataFactory,
      );
      expect(credit.credentialSubject.creditScoreValue).toBe(values.creditScoreValue);
      expect(credit.credentialSubject.totalMonthlyDebtUsd).toBe(values.totalMonthlyDebtUsd);
      const income = new EmploymentIncomeCredential(
        incomeResource.iri,
        incomeResource.dataset,
        DataFactory,
      );
      expect(income.credentialSubject.monthlyGrossIncomeUsd).toBe(values.monthlyGrossIncomeUsd);
    }
  });

  test("loan never exceeds the appraised value; closing matches the approval", async () => {
    for (const persona of await personas({ now: NOW })) {
      const appraisalResource = persona.byPath.get("/mortgage/credentials/appraisal");
      const applicationResource = persona.byPath.get("/mortgage/application");
      const decisionResource = persona.byPath.get("/mortgage/decision");
      const closingResource = persona.byPath.get("/mortgage/closing");
      if (
        appraisalResource === undefined ||
        applicationResource === undefined ||
        decisionResource === undefined ||
        closingResource === undefined
      ) {
        throw new Error("persona resources missing");
      }
      const appraisal = new AppraisalCredential(
        appraisalResource.iri,
        appraisalResource.dataset,
        DataFactory,
      );
      const appraised =
        appraisal.credentialSubject.subjectProperty.appraisedValue?.amountValue ?? 0;
      expect(appraised).toBeGreaterThan(0);

      const application = new LoanApplication(
        applicationResource.iri,
        applicationResource.dataset,
        DataFactory,
      );
      expect(application.requestedAmount.amountValue).toBeLessThanOrEqual(appraised);
      expect(application.submittedByIri).toBe(persona.webId);

      const decision = new UnderwritingDecision(
        decisionResource.iri,
        decisionResource.dataset,
        DataFactory,
      );
      expect(decision.evaluatesIri).toBe(applicationResource.iri);
      const approved = decision.approvedAmount?.amountValue ?? 0;
      expect(approved).toBeLessThanOrEqual(appraised);

      const closing = new ClosingRecord(closingResource.iri, closingResource.dataset, DataFactory);
      expect(closing.principalAmount.amountValue).toBe(approved);
      expect(closing.borrowerIri).toBe(persona.webId);
    }
  });

  test("podBases override rewrites every resource IRI", async () => {
    const [alex] = await personas({
      now: NOW,
      podBases: { "alex-rivera": "http://localhost:3000/alex/" },
    });
    expect(alex?.webId).toBe("http://localhost:3000/alex/profile/card#me");
    const income = alex?.byPath.get("/mortgage/credentials/income");
    expect(income?.iri).toBe("http://localhost:3000/alex/mortgage/credentials/income");
    expect(income?.turtle).toContain("<http://localhost:3000/alex/mortgage/credentials/income>");
  });
});
