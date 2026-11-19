// AUTHORED-BY Claude Opus 5.5
import { parseRdf } from "@jeswr/fetch-rdf";
import { validate } from "@mortgage/data-model";
import { DataFactory } from "n3";
import { describe, expect, it } from "vitest";
import {
  ADMISSION_LIST,
  ALLERGY,
  DISCHARGE_CHANGES,
  type Medicine,
} from "../../medication-handover/facts.js";
import {
  AllergyIntolerance,
  buildAllergyIntolerance,
  buildDischargeSummary,
  buildEncounterRecord,
  buildMedicationDispense,
  buildMedicationRequest,
  buildMedicationStatement,
  buildProvenanceRecord,
  DischargeSummary,
  EncounterRecord,
  type FhirResource,
  MedicationDispense,
  MedicationRequest,
  MedicationStatement,
  ProvenanceRecord,
} from "../../medication-handover/fhir.js";
import { toTurtle } from "../../mortgage/world.js";

const POD = "https://pods.demo.test/pods/rosa/";
const ROSA = { display: "Rosa Rivera", iri: "https://pods.demo.test/pods/rosa/profile/card#me" };
const HOSPITAL = {
  display: "Riverbend General Hospital",
  iri: "https://pods.demo.test/pods/hospital/profile/card#me",
};
const WHEN = new Date("2026-08-27T11:00:00Z");
const lisinopril = ADMISSION_LIST[0] as Medicine;

/** Serialise through the SHACL gate, parse the Turtle back and wrap it again. */
async function roundTrip<T extends FhirResource>(
  resource: FhirResource,
  ctor: new (term: string, dataset: never, factory: typeof DataFactory) => T,
): Promise<T> {
  const turtle = await toTurtle(resource);
  const dataset = await parseRdf(turtle, "text/turtle", { baseIRI: resource.value });
  const report = await validate(dataset, {
    expect: resource.resourceKind,
    focusNode: resource.value,
  });
  expect(report.conforms).toBe(true);
  return new ctor(resource.value, dataset as never, DataFactory);
}

describe("FHIR R5 RDF wrappers", () => {
  it("round-trips a medication statement, active and stopped", async () => {
    const active = await roundTrip(
      buildMedicationStatement({
        adherence: "taking-as-directed",
        dateAsserted: WHEN,
        iri: `${POD}medications/lisinopril`,
        medicine: lisinopril,
        subject: ROSA,
      }),
      MedicationStatement,
    );
    expect(active.fhirId).toBe("lisinopril");
    expect(active.medicine).toEqual({
      ingredient: "lisinopril",
      product: "Lisinopril 10 mg tablet",
      rxcui: "29046",
    });
    expect(active.dosage).toBe("One tablet each morning");
    expect(active.isActive).toBe(true);
    expect(active.patient).toEqual(ROSA);
    expect(active.dateAsserted.toISOString()).toBe(WHEN.toISOString());
    const stopped = await roundTrip(
      buildMedicationStatement({
        adherence: "stopped-as-directed",
        dateAsserted: WHEN,
        iri: `${POD}medications/ibuprofen`,
        medicine: ADMISSION_LIST[1] as Medicine,
        stopReason: "Kidney function fell.",
        subject: ROSA,
      }),
      MedicationStatement,
    );
    expect(stopped.adherence).toBe("stopped-as-directed");
    expect(stopped.stopReason).toBe("Kidney function fell.");
  });

  it("round-trips a request, a dispense and an allergy", async () => {
    const atorvastatin = (DISCHARGE_CHANGES[2] as { medicine: Medicine }).medicine;
    const request = await roundTrip(
      buildMedicationRequest({
        authoredOn: WHEN,
        iri: `${POD}medications/requests/atorvastatin`,
        medicine: atorvastatin,
        requester: HOSPITAL,
        subject: ROSA,
      }),
      MedicationRequest,
    );
    expect(request.intent).toBe("order");
    expect(request.requester).toEqual(HOSPITAL);
    const dispense = await roundTrip(
      buildMedicationDispense({
        iri: `${POD}medications/dispenses/atorvastatin-day-53`,
        medicine: atorvastatin,
        performer: {
          display: "Corner Dispensary",
          iri: "https://pods.demo.test/pods/pharmacy/profile/card#me",
        },
        prescriptions: [{ display: "Discharge prescription", iri: request.value }],
        quantity: 28,
        subject: ROSA,
        whenHandedOver: WHEN,
      }),
      MedicationDispense,
    );
    expect(dispense.quantity).toBe(28);
    expect(dispense.unit).toBe("tablets");
    expect(dispense.performer.display).toBe("Corner Dispensary");
    expect(dispense.prescriptions.map((p) => p.iri)).toEqual([request.value]);
    const allergy = await roundTrip(
      buildAllergyIntolerance({
        iri: `${POD}allergies/amoxicillin`,
        note: ALLERGY.note,
        patient: ROSA,
        recordedDate: WHEN,
        substance: ALLERGY,
      }),
      AllergyIntolerance,
    );
    expect(allergy.substance.rxcui).toBe("723");
    expect(allergy.clinicalStatus).toBe("active");
    expect(allergy.notes).toEqual([ALLERGY.note]);
  });

  it("round-trips provenance, the discharge summary and an encounter", async () => {
    const provenance = await roundTrip(
      buildProvenanceRecord({
        activity: "UPDATE",
        author: "Imani Brooks, ward pharmacist",
        iri: `${POD}medications/provenance/lisinopril-day-53`,
        onBehalfOf: HOSPITAL,
        patient: ROSA,
        recorded: WHEN,
        target: { display: "Lisinopril", iri: `${POD}medications/lisinopril` },
        why: "Blood pressure stayed above target.",
      }),
      ProvenanceRecord,
    );
    expect(provenance.why).toBe("Blood pressure stayed above target.");
    expect(provenance.activity).toBe("UPDATE");
    expect(provenance.author).toBe("Imani Brooks, ward pharmacist");
    expect(provenance.onBehalfOf).toEqual(HOSPITAL);
    expect(provenance.targets[0]?.iri).toBe(`${POD}medications/lisinopril`);
    const summary = await roundTrip(
      buildDischargeSummary({
        author: "Imani Brooks, ward pharmacist",
        date: WHEN,
        iri: `${POD}discharge/summary`,
        notes: ["Fictional record. Not clinical guidance."],
        sections: [
          {
            entries: [{ display: "Lisinopril", iri: `${POD}medications/lisinopril` }],
            title: "Medicines",
          },
          { entries: [], title: "Follow-up" },
        ],
        subject: ROSA,
        title: "Discharge summary",
      }),
      DischargeSummary,
    );
    expect(summary.sections.map((s) => s.title)).toEqual(["Medicines", "Follow-up"]);
    expect(summary.sections[0]?.entries[0]?.display).toBe("Lisinopril");
    expect(summary.author).toBe("Imani Brooks, ward pharmacist");
    const encounter = await roundTrip(
      buildEncounterRecord({
        iri: "https://pods.demo.test/pods/clinic/consultations/rosa-day-60",
        serviceProvider: {
          display: "Larch Lane Family Practice",
          iri: "https://pods.demo.test/pods/clinic/profile/card#me",
        },
        start: WHEN,
        subject: ROSA,
      }),
      EncounterRecord,
    );
    expect(encounter.status).toBe("completed");
    expect(encounter.start.toISOString()).toBe(WHEN.toISOString());
  });

  it("refuses a negative quantity before anything is written", () => {
    expect(() =>
      buildMedicationDispense({
        iri: `${POD}medications/dispenses/x`,
        medicine: lisinopril,
        performer: HOSPITAL,
        quantity: -1,
        subject: ROSA,
        whenHandedOver: WHEN,
      }),
    ).toThrow(RangeError);
  });
});
