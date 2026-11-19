// AUTHORED-BY Claude Opus 5.5
import { DataFactory, Parser, Store } from "n3";
import { describe, expect, test } from "vitest";
import { MORT } from "../src/vocab/mort.js";
import {
  buildClaimCase,
  buildDamageReport,
  buildMotorIncidentReport,
  buildMotorPolicyCredential,
  buildOtherPartyDetails,
  buildRepairEstimate,
  buildRepairInvoice,
  CASE_STATUS_IRIS,
  CLAIM_SCHEMA,
  ClaimCase,
  DamageReport,
  MotorIncidentReport,
  MotorPolicyCredential,
  OtherPartyDetails,
  RepairEstimate,
  RepairInvoice,
} from "../src/wrappers/claims.js";
import { buildInboxMessage, InboxMessage } from "../src/wrappers/records.js";
import { resourceToTurtle, ShapeViolationError } from "../src/wrappers/serialize.js";

const POD = "https://pods.example/pods/alex/";
const ALEX = `${POD}profile/card#me`;
const INSURER = "https://pods.example/pods/insurer/profile/card#me";
const REPAIRER = "https://pods.example/pods/repairer/profile/card#me";
const CLAIM = `${POD}claims/CLM-1/`;
const PHOTOS = [`${CLAIM}photos/rear-bumper.svg`, `${CLAIM}photos/tail-light.svg`];
const CAR = { color: "Blue", name: "Larkspur Tern", vin: "DEMOVIN0000000001" };
const ITEMS = [
  { amountUsd: 640, name: "Rear bumper cover" },
  { amountUsd: 185.5, name: "Tail light lens" },
  { amountUsd: 380, name: "Labour, 4 hours" },
];
const at = (iso: string) => new Date(iso);

const reparse = (turtle: string) => new Store(new Parser({ format: "text/turtle" }).parse(turtle));

describe("claim file documents round-trip (build -> validate -> Turtle -> parse -> read)", () => {
  test("incident report and other party's details", async () => {
    const iri = `${CLAIM}incident`;
    const turtle = await resourceToTurtle(
      buildMotorIncidentReport({
        claimNumber: "CLM-1",
        created: at("2026-09-23T15:00:00Z"),
        creator: ALEX,
        description: "Reversed into while parked.",
        iri,
        location: "Grafton Street car park, Marlow",
        name: "Incident report",
        occurredAt: at("2026-09-23T14:10:00Z"),
        otherParty: `${CLAIM}other-party`,
        photos: PHOTOS,
        vehicle: CAR,
      }),
    );
    const report = new MotorIncidentReport(iri, reparse(turtle), DataFactory);
    expect(report.claimNumber).toBe("CLM-1");
    expect(report.occurredAt.toISOString()).toBe("2026-09-23T14:10:00.000Z");
    expect(report.vehicle.name).toBe("Larkspur Tern");
    expect(report.vehicle.vin).toBe("DEMOVIN0000000001");
    expect(report.photos).toEqual(PHOTOS);
    expect(report.otherPartyIri).toBe(`${CLAIM}other-party`);
    expect(report.creatorIri).toBe(ALEX);

    const otherIri = `${CLAIM}other-party`;
    const other = new OtherPartyDetails(
      otherIri,
      reparse(
        await resourceToTurtle(
          buildOtherPartyDetails({
            created: at("2026-09-23T15:00:00Z"),
            creator: ALEX,
            insurerName: "Pellmore Insurance",
            iri: otherIri,
            name: "Lee Navarro",
            policyNumber: "PM-AU-30117",
            telephone: "(614) 555-0142",
            vehicle: { name: "Calder Vane", plate: "DEMO 417" },
          }),
        ),
      ),
      DataFactory,
    );
    expect(other.name).toBe("Lee Navarro");
    expect(other.vehicle.plate).toBe("DEMO 417");
    expect(other.insurerName).toBe("Pellmore Insurance");
  });

  test("an incident reported before it happened is refused by the shape", async () => {
    await expect(
      resourceToTurtle(
        buildMotorIncidentReport({
          claimNumber: "CLM-1",
          created: at("2026-09-23T13:00:00Z"),
          creator: ALEX,
          description: "x",
          iri: `${CLAIM}incident`,
          location: "x",
          name: "Incident report",
          occurredAt: at("2026-09-23T14:10:00Z"),
          photos: PHOTOS,
          vehicle: CAR,
        }),
      ),
    ).rejects.toBeInstanceOf(ShapeViolationError);
  });

  test("a real-looking telephone number is refused (only the fictional range passes)", async () => {
    await expect(
      resourceToTurtle(
        buildOtherPartyDetails({
          created: at("2026-09-23T15:00:00Z"),
          creator: ALEX,
          insurerName: "Pellmore Insurance",
          iri: `${CLAIM}other-party`,
          name: "Lee Navarro",
          policyNumber: "PM-AU-30117",
          telephone: "(614) 555-2368",
          vehicle: { name: "Calder Vane" },
        }),
      ),
    ).rejects.toBeInstanceOf(ShapeViolationError);
  });

  test("damage report, estimate and invoice; totals are the sum of the line items", async () => {
    const damageIri = `${CLAIM}damage-report`;
    const damage = new DamageReport(
      damageIri,
      reparse(
        await resourceToTurtle(
          buildDamageReport({
            about: `${CLAIM}incident`,
            created: at("2026-09-24T10:00:00Z"),
            creator: INSURER,
            damage: ["Rear bumper: cracked", "Left tail light: lens broken"],
            iri: damageIri,
            name: "Damage report",
            photos: PHOTOS,
            vehicle: { name: CAR.name },
          }),
        ),
      ),
      DataFactory,
    );
    expect(damage.damage).toEqual(["Left tail light: lens broken", "Rear bumper: cracked"]);
    expect(damage.photos).toEqual(PHOTOS);
    expect(damage.aboutIri).toBe(`${CLAIM}incident`);

    const estimateIri = `${CLAIM}estimate`;
    const estimate = new RepairEstimate(
      estimateIri,
      reparse(
        await resourceToTurtle(
          buildRepairEstimate({
            about: damageIri,
            created: at("2026-09-25T09:30:00Z"),
            creator: REPAIRER,
            estimateNumber: "EST-2041",
            iri: estimateIri,
            lineItems: ITEMS,
            name: "Repair estimate",
          }),
        ),
      ),
      DataFactory,
    );
    expect(estimate.totalUsd).toBe(1205.5);
    expect(estimate.lineItems.map((item) => item.amountUsd).sort()).toEqual([185.5, 380, 640]);

    const invoiceIri = `${CLAIM}invoice`;
    const invoice = new RepairInvoice(
      invoiceIri,
      reparse(
        await resourceToTurtle(
          buildRepairInvoice({
            created: at("2026-09-30T16:00:00Z"),
            creator: REPAIRER,
            estimate: estimateIri,
            invoiceNumber: "INV-2041",
            iri: invoiceIri,
            lineItems: ITEMS,
            name: "Invoice",
          }),
        ),
      ),
      DataFactory,
    );
    expect(invoice.totalUsd).toBe(1205.5);
    expect(invoice.estimateIri).toBe(estimateIri);
    expect(invoice.typeIris.has(CLAIM_SCHEMA.Invoice)).toBe(true);
  });

  test("an estimate with no line items, or a negative one, is refused before writing", () => {
    const base = {
      about: `${CLAIM}damage-report`,
      created: at("2026-09-25T09:30:00Z"),
      creator: REPAIRER,
      estimateNumber: "EST-1",
      iri: `${CLAIM}estimate`,
      name: "Repair estimate",
    };
    expect(() => buildRepairEstimate({ ...base, lineItems: [] })).toThrow(RangeError);
    expect(() =>
      buildRepairEstimate({ ...base, lineItems: [{ amountUsd: -1, name: "Credit" }] }),
    ).toThrow(RangeError);
  });
});

describe("motor policy credential envelope", () => {
  test("round-trips its claims", async () => {
    const iri = `${POD}insurance/motor-policy`;
    const credential = new MotorPolicyCredential(
      iri,
      reparse(
        await resourceToTurtle(
          buildMotorPolicyCredential({
            coverages: ["Liability", "Collision"],
            credentialStatus: "https://pods.example/pods/insurer/status/list#71",
            credentialSubject: ALEX,
            deductibleUsd: 500,
            iri,
            issuer: INSURER,
            policyEnd: at("2027-07-01T00:00:00Z"),
            policyNumber: "WM-AU-771204",
            policyStart: at("2026-07-01T00:00:00Z"),
            validFrom: at("2026-07-01T09:00:00Z"),
            validUntil: at("2027-07-01T09:00:00Z"),
            vehicle: CAR,
          }),
        ),
      ),
      DataFactory,
    );
    expect(credential.typeIris.has(MORT.MotorPolicyCredential)).toBe(true);
    const subject = credential.credentialSubject;
    expect(subject.value).toBe(ALEX);
    expect(subject.coverages).toEqual(["Collision", "Liability"]);
    expect(subject.deductibleUsd).toBe(500);
    expect(subject.vehicle.name).toBe("Larkspur Tern");
    expect(subject.policyEnd.toISOString().slice(0, 10)).toBe("2027-07-01");
  });

  test("a policy with no coverage is refused", () => {
    expect(() =>
      buildMotorPolicyCredential({
        coverages: [],
        credentialStatus: "https://pods.example/pods/insurer/status/list#71",
        credentialSubject: ALEX,
        deductibleUsd: 500,
        iri: `${POD}insurance/motor-policy`,
        issuer: INSURER,
        policyEnd: at("2027-07-01T00:00:00Z"),
        policyNumber: "WM-AU-771204",
        policyStart: at("2026-07-01T00:00:00Z"),
        validFrom: at("2026-07-01T09:00:00Z"),
        vehicle: CAR,
      }),
    ).toThrow(RangeError);
  });
});

describe("organisation case records and repair messages", () => {
  test("a claim case points at the claim file and copies nothing", async () => {
    const iri = "https://pods.example/pods/insurer/claims/CLM-1";
    const record = new ClaimCase(
      iri,
      reparse(
        await resourceToTurtle(
          buildClaimCase({
            acceptedEstimate: `${CLAIM}estimate`,
            caseKind: MORT.CaseKind_InsuranceClaim,
            claimFile: CLAIM,
            claimNumber: "CLM-1",
            customer: ALEX,
            iri,
            modified: at("2026-09-25T11:00:00Z"),
            policy: `${POD}policies/c1`,
            status: CLAIM_SCHEMA.ActiveActionStatus,
          }),
        ),
      ),
      DataFactory,
    );
    expect(record.claimFileIri).toBe(CLAIM);
    expect(record.completed).toBe(false);
    expect(record.acceptedEstimateIri).toBe(`${CLAIM}estimate`);
    expect(record.policyIri).toBe(`${POD}policies/c1`);
    expect(CASE_STATUS_IRIS).toContain(record.status);
  });

  test("an unknown case kind or status is refused before writing", () => {
    const base = {
      caseKind: MORT.CaseKind_RepairJob,
      claimFile: CLAIM,
      claimNumber: "CLM-1",
      customer: ALEX,
      iri: "https://pods.example/pods/repairer/jobs/CLM-1",
      modified: at("2026-09-25T11:00:00Z"),
      status: CLAIM_SCHEMA.CompletedActionStatus,
    } as const;
    expect(buildClaimCase(base).completed).toBe(true);
    expect(() =>
      buildClaimCase({ ...base, caseKind: MORT.CaseKind_InsuranceClaim.replace("Claim", "X") }),
    ).toThrow(RangeError);
    expect(() =>
      buildClaimCase({ ...base, status: "https://schema.org/FailedActionStatus" as never }),
    ).toThrow(RangeError);
  });

  test("the three repair message kinds are valid inbox messages", async () => {
    for (const kind of [
      MORT.MessageKind_RepairReferral,
      MORT.MessageKind_RepairAuthorisation,
      MORT.MessageKind_RepairCompletion,
    ] as const) {
      const iri = "https://pods.example/pods/repairer/inbox/m";
      const turtle = await resourceToTurtle(
        buildInboxMessage({
          actor: INSURER,
          iri,
          messageKind: kind,
          objects: [CLAIM],
          published: at("2026-09-24T10:00:00Z"),
          summary: "Repair message",
        }),
      );
      expect(new InboxMessage(iri, reparse(turtle), DataFactory).messageKind).toBe(kind);
    }
  });
});
