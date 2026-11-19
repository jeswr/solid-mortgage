// AUTHORED-BY Claude Fable 5.2
import { DataFactory, Parser, Store } from "n3";
import { describe, expect, test } from "vitest";
import { validate } from "../src/shacl.js";
import { DPV, SCHEMA } from "../src/vocab/external.js";
import { MORT } from "../src/vocab/mort.js";
import { buildConsentReceipt } from "../src/wrappers/build.js";
import {
  AgentProfile,
  buildAgentProfile,
  buildClosingDisclosure,
  buildCreditScoreNotice,
  buildLoanEstimate,
  buildPurchaseAgreement,
  buildSettlementStatement,
  buildSubjectProperty,
  ClosingDisclosure,
  CreditScoreNotice,
  LoanEstimate,
  PurchaseAgreement,
  SettlementStatement,
  SubjectProperty,
} from "../src/wrappers/documents.js";
import {
  AccessAgreement,
  AccessRequest,
  buildAccessAgreement,
  buildAccessRequest,
  permissionInits,
} from "../src/wrappers/policies.js";
import {
  buildCredentialPointer,
  buildInboxMessage,
  buildServiceOrder,
  buildTitleCommitmentCredential,
  CredentialPointer,
  InboxMessage,
  ServiceOrder,
  TitleCommitmentCredential,
} from "../src/wrappers/records.js";
import { ConsentReceipt } from "../src/wrappers/resources.js";
import { resourceToTurtle, ShapeViolationError } from "../src/wrappers/serialize.js";

const POD = "https://alex.pod.example/";
const ALEX = `${POD}profile/card#me`;
const LENDER = "https://lender.example/profile/card#me";
const AUS = "https://aus.example/profile/card#me";
const ADDRESS = {
  addressLocality: "Marlow",
  addressRegion: "OH",
  postalCode: "43004",
  streetAddress: "14 Larch Lane",
};
const TERMS = {
  aprPercent: 6.62,
  cashToCloseUsd: 89_850,
  closingCostsUsd: 9850,
  estimatedTotalMonthlyPaymentUsd: 2674.03,
  interestRatePercent: 6.5,
  loanTermMonths: 360,
  monthlyPrincipalAndInterestUsd: 2149.03,
  principalUsd: 340_000,
  propertyAddress: ADDRESS,
};
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

function reparse(turtle: string): Store {
  return new Store(new Parser({ format: "text/turtle" }).parse(turtle));
}

describe("rebuild documents round-trip (build -> validate -> Turtle -> parse -> read)", () => {
  test("purchase agreement and subject property", async () => {
    const iri = `${POD}property/purchase-agreement`;
    const turtle = await resourceToTurtle(
      buildPurchaseAgreement({
        buyer: ALEX,
        closingDate: day("2026-09-09"),
        earnestMoneyDepositUsd: 8500,
        iri,
        issued: day("2026-07-28"),
        name: "Residential purchase agreement",
        propertyAddress: ADDRESS,
        purchasePriceUsd: 425_000,
        sellerName: "Jordan Whitfield",
      }),
    );
    const agreement = new PurchaseAgreement(iri, reparse(turtle), DataFactory);
    expect(agreement.buyerIri).toBe(ALEX);
    expect(agreement.sellerName).toBe("Jordan Whitfield");
    expect(agreement.purchasePriceUsd).toBe(425_000);
    expect(agreement.earnestMoneyDepositUsd).toBe(8500);
    expect(agreement.subjectProperty.address.streetAddress).toBe("14 Larch Lane");
    expect(agreement.closingDate.toISOString().slice(0, 10)).toBe("2026-09-09");

    const propertyIri = `${POD}property/subject-property`;
    const propertyTurtle = await resourceToTurtle(
      buildSubjectProperty({
        address: ADDRESS,
        bathrooms: 2,
        bedrooms: 3,
        constructionType: "Wood frame",
        floorSizeSqFt: 1850,
        iri: propertyIri,
        parcelNumber: "010-204417-00",
        roofType: "Asphalt shingle",
        yearBuilt: 1998,
      }),
    );
    const property = new SubjectProperty(propertyIri, reparse(propertyTurtle), DataFactory);
    expect(property.yearBuilt).toBe(1998);
    expect(property.floorSizeSqFt).toBe(1850);
    expect(property.roofType).toBe("Asphalt shingle");
    expect(property.legalDescription).toBeUndefined();
  });

  test("Loan Estimate carries its dates and terms; intent to proceed is optional", async () => {
    const iri = `${POD}mortgage/juniper/loan-estimate`;
    const estimate = buildLoanEstimate({
      applicationDate: day("2026-08-05"),
      borrower: ALEX,
      creator: LENDER,
      expires: day("2026-08-20"),
      iri,
      issued: day("2026-08-06"),
      loanNumber: "JHL-1001",
      name: "Loan Estimate",
      ...TERMS,
    });
    const before = new LoanEstimate(iri, reparse(await resourceToTurtle(estimate)), DataFactory);
    expect(before.intentToProceedDate).toBeUndefined();
    expect(before.applicationDate.toISOString().slice(0, 10)).toBe("2026-08-05");
    expect(before.principalUsd).toBe(340_000);
    expect(before.interestRatePercent).toBe(6.5);
    expect(before.monthlyPrincipalAndInterestUsd).toBe(2149.03);

    estimate.intentToProceedDate = day("2026-08-06");
    const after = new LoanEstimate(iri, reparse(await resourceToTurtle(estimate)), DataFactory);
    expect(after.intentToProceedDate?.toISOString().slice(0, 10)).toBe("2026-08-06");
  });

  test("a Loan Estimate that expires before its application date never serialises", async () => {
    const estimate = buildLoanEstimate({
      applicationDate: day("2026-08-05"),
      borrower: ALEX,
      creator: LENDER,
      expires: day("2026-08-01"),
      iri: `${POD}mortgage/juniper/loan-estimate`,
      issued: day("2026-08-06"),
      loanNumber: "JHL-1001",
      name: "Loan Estimate",
      ...TERMS,
    });
    await expect(resourceToTurtle(estimate)).rejects.toBeInstanceOf(ShapeViolationError);
  });

  test("Closing Disclosure records receipt", async () => {
    const iri = `${POD}mortgage/juniper/closing-disclosure`;
    const disclosure = buildClosingDisclosure({
      borrower: ALEX,
      closingDate: day("2026-09-09"),
      creator: LENDER,
      iri,
      issued: day("2026-09-03"),
      loanNumber: "JHL-1001",
      name: "Closing Disclosure",
      ...TERMS,
    });
    disclosure.receivedDate = day("2026-09-03");
    const read = new ClosingDisclosure(
      iri,
      reparse(await resourceToTurtle(disclosure)),
      DataFactory,
    );
    expect(read.receivedDate?.toISOString().slice(0, 10)).toBe("2026-09-03");
    expect(read.closingDate.toISOString().slice(0, 10)).toBe("2026-09-09");
    expect(read.cashToCloseUsd).toBe(89_850);
  });

  test("score notice lists each score with its model and key factors", async () => {
    const iri = `${POD}mortgage/juniper/score-notice`;
    const turtle = await resourceToTurtle(
      buildCreditScoreNotice({
        borrower: ALEX,
        creator: LENDER,
        iri,
        issued: day("2026-08-05"),
        loanNumber: "JHL-1001",
        name: "Credit score disclosure",
        scores: [
          {
            created: day("2026-08-05"),
            keyFactors: ["Length of credit history", "Number of recent inquiries"],
            score: 742,
            scoreModel: MORT.ScoreModel_ClassicFICO,
            source: "Repository 1",
          },
          {
            created: day("2026-08-05"),
            score: 735,
            scoreModel: MORT.ScoreModel_ClassicFICO,
            source: "Repository 2",
          },
        ],
      }),
    );
    const notice = new CreditScoreNotice(iri, reparse(turtle), DataFactory);
    const scores = notice.scores.sort((a, b) => b.score - a.score);
    expect(scores.map((score) => score.score)).toEqual([742, 735]);
    expect([...(scores[0]?.keyFactors ?? [])].sort()).toEqual([
      "Length of credit history",
      "Number of recent inquiries",
    ]);
  });

  test("a score outside 300..850 is refused before any RDF is written", () => {
    expect(() =>
      buildCreditScoreNotice({
        borrower: ALEX,
        creator: LENDER,
        iri: `${POD}mortgage/juniper/score-notice`,
        issued: day("2026-08-05"),
        loanNumber: "JHL-1001",
        name: "Credit score disclosure",
        scores: [
          {
            created: day("2026-08-05"),
            score: 900,
            scoreModel: MORT.ScoreModel_ClassicFICO,
            source: "Repository 1",
          },
        ],
      }),
    ).toThrow(RangeError);
  });

  test("settlement statement keeps credits negative", async () => {
    const iri = `${POD}mortgage/closing/settlement-statement`;
    const turtle = await resourceToTurtle(
      buildSettlementStatement({
        borrower: ALEX,
        cashToCloseUsd: 89_850,
        closingDate: day("2026-09-09"),
        creator: "https://title.example/profile/card#me",
        disbursementDate: day("2026-09-09"),
        fileNumber: "STE-2026-0417",
        iri,
        issued: day("2026-09-09"),
        lineItems: [
          { amountUsd: 1210, name: "Owner's title policy" },
          { amountUsd: -8500, name: "Earnest money credit" },
        ],
        loanNumber: "JHL-1001",
        name: "Settlement statement",
        principalUsd: 340_000,
        propertyAddress: ADDRESS,
        purchasePriceUsd: 425_000,
      }),
    );
    const statement = new SettlementStatement(iri, reparse(turtle), DataFactory);
    const items = Object.fromEntries(
      statement.lineItems.map((item) => [item.name, item.amountUsd]),
    );
    expect(items).toEqual({ "Earnest money credit": -8500, "Owner's title policy": 1210 });
  });

  test("title commitment keeps Schedule A and both parts of Schedule B", async () => {
    const iri = `${POD}mortgage/closing/title-commitment`;
    const turtle = await resourceToTurtle(
      buildTitleCommitmentCredential({
        commitmentNumber: "STE-2026-0417",
        credentialStatus: "https://title.example/status/1#3",
        credentialSubject: ALEX,
        exceptions: ["Utility easement along the rear ten feet"],
        iri,
        issuer: "https://title.example/profile/card#me",
        loanPolicyAmountUsd: 340_000,
        ownerPolicyAmountUsd: 425_000,
        propertyAddress: ADDRESS,
        proposedInsured: ["Alex Rivera", "Juniper Home Loans, its successors and/or assigns"],
        requirements: ["Pay off and release the existing mortgage"],
        searchedThrough: day("2026-08-12"),
        validFrom: new Date("2026-08-14T09:00:00Z"),
        validUntil: new Date("2027-02-14T09:00:00Z"),
        vestedOwner: "Jordan Whitfield",
      }),
    );
    const subject = new TitleCommitmentCredential(iri, reparse(turtle), DataFactory)
      .credentialSubject;
    expect(subject.vestedOwner).toBe("Jordan Whitfield");
    expect(subject.loanPolicyAmountUsd).toBe(340_000);
    expect([...subject.requirements]).toEqual(["Pay off and release the existing mortgage"]);
    expect([...subject.exceptions]).toEqual(["Utility easement along the rear ten feet"]);
  });

  test("WebID profile", async () => {
    const iri = `${POD}profile/card`;
    const turtle = await resourceToTurtle(
      buildAgentProfile({
        inbox: `${POD}inbox/`,
        iri,
        kind: "person",
        name: "Alex Rivera",
        storage: POD,
        titleVesting: "a single person",
        webId: ALEX,
      }),
    );
    const profile = new AgentProfile(iri, reparse(turtle), DataFactory);
    expect(profile.primaryTopicIri).toBe(ALEX);
    expect(profile.agent.name).toBe("Alex Rivera");
    expect(profile.agent.titleVesting).toBe("a single person");
    expect([...profile.agent.typeIris]).toEqual([SCHEMA.Person]);
  });
});

describe("grant policies", () => {
  const init = {
    assignee: LENDER,
    assigner: ALEX,
    description: "Mortgage origination and underwriting",
    grantCode: "G4",
    iri: `${POD}inbox/request-g4`,
    issued: new Date("2026-08-05T10:00:00Z"),
    name: "Mortgage application",
    permissions: [
      {
        assignee: LENDER,
        end: { until: new Date("2026-11-08T00:00:00.000Z") },
        modes: ["Read" as const],
        purpose: DPV.ServiceProvision,
        targets: [`${POD}credentials/`, `${POD}property/`],
      },
      {
        assignee: LENDER,
        end: { until: new Date("2026-11-08T00:00:00.000Z") },
        modes: ["Read" as const, "Write" as const],
        purpose: DPV.ServiceProvision,
        targets: [`${POD}mortgage/juniper/`],
      },
      {
        assignee: AUS,
        end: { event: MORT.GrantEnd_Closing },
        modes: ["Read" as const],
        purpose: DPV.ServiceProvision,
        targets: [`${POD}credentials/assets`],
      },
    ],
  };

  test("a request reads back its permissions, purpose, end and onward recipients", async () => {
    const turtle = await resourceToTurtle(buildAccessRequest(init));
    const request = new AccessRequest(init.iri, reparse(turtle), DataFactory);
    expect(request.grantCode).toBe("G4");
    expect(request.permissions).toHaveLength(3);
    const onward = request.onwardPermissions;
    expect(onward).toHaveLength(1);
    expect(onward[0]?.assigneeIri).toBe(AUS);
    expect(onward[0]?.end).toEqual({ event: MORT.GrantEnd_Closing });
    const write = request.permissions.find((permission) => permission.modes.includes("Write"));
    expect(write?.modes).toEqual(["Read", "Write"]);
    expect(write?.purposeIri).toBe(DPV.ServiceProvision);
    expect(write?.end).toEqual({ until: new Date("2026-11-08T00:00:00.000Z") });
  });

  test("an agreement built from a parsed request carries the same permissions", async () => {
    const requestTurtle = await resourceToTurtle(buildAccessRequest(init));
    const request = new AccessRequest(init.iri, reparse(requestTurtle), DataFactory);
    const agreementIri = `${POD}policies/g4`;
    const agreementTurtle = await resourceToTurtle(
      buildAccessAgreement({
        ...init,
        iri: agreementIri,
        permissions: permissionInits(request),
        source: init.iri,
      }),
    );
    const agreement = new AccessAgreement(agreementIri, reparse(agreementTurtle), DataFactory);
    expect(agreement.sourceIri).toBe(init.iri);
    const summarise = (inits: ReturnType<typeof permissionInits>) =>
      inits.map((permission) => JSON.stringify(permission)).sort();
    expect(summarise(permissionInits(agreement))).toEqual(summarise(permissionInits(request)));
  });

  test("a grant end event outside the scheme is refused", () => {
    expect(() =>
      buildAccessRequest({
        ...init,
        permissions: [
          {
            assignee: LENDER,
            end: { event: "https://example.test/whenever" },
            modes: ["Read"],
            purpose: DPV.ServiceProvision,
            targets: [`${POD}credentials/`],
          },
        ],
      }),
    ).toThrow(RangeError);
  });

  test("a consent record can cover several resources, name its policy and expire", async () => {
    const iri = `${POD}consents/g5-expired`;
    const turtle = await resourceToTurtle(
      buildConsentReceipt({
        consentStatus: DPV.ConsentExpired,
        dataController: "https://appraisal.example/profile/card#me",
        dataSubject: ALEX,
        iri,
        issued: new Date("2026-08-14T16:05:00Z"),
        moreTargets: [`${POD}property/subject-property`],
        policy: `${POD}policies/g5`,
        purpose: DPV.ServiceProvision,
        target: `${POD}property/purchase-agreement`,
      }),
    );
    const record = new ConsentReceipt(iri, reparse(turtle), DataFactory);
    expect([...record.targetIris].sort()).toEqual([
      `${POD}property/purchase-agreement`,
      `${POD}property/subject-property`,
    ]);
    expect(record.policyIri).toBe(`${POD}policies/g5`);
    expect(record.consentStatus).toBe(DPV.ConsentExpired);
  });
});

describe("organisation records", () => {
  test("an order's status can move to delivered", async () => {
    const iri = "https://lender.example/loans/JHL-1001/orders/appraisal";
    const order = buildServiceOrder({
      customer: LENDER,
      iri,
      loanNumber: "JHL-1001",
      orderDate: day("2026-08-07"),
      orderNumber: "JHL-1001-A1",
      orderStatus: SCHEMA.OrderProcessing,
      seller: "https://appraisal.example/profile/card#me",
      serviceKind: MORT.ServiceKind_Appraisal,
    });
    order.orderStatus = SCHEMA.OrderDelivered;
    const read = new ServiceOrder(iri, reparse(await resourceToTurtle(order)), DataFactory);
    expect(read.orderStatus).toBe(SCHEMA.OrderDelivered);
    expect(() => {
      order.orderStatus = "https://schema.org/OrderCancelled";
    }).toThrow(RangeError);
  });

  test("an inbox message validates under the IRI the server gave it", async () => {
    const message = buildInboxMessage({
      actor: "https://appraisal.example/profile/card#me",
      iri: "https://lender.example/inbox/appraisal-delivery",
      loanNumber: "JHL-1001",
      messageKind: MORT.MessageKind_AppraisalDelivery,
      objects: ["https://appraisal.example/orders/PV-7731/report"],
      published: new Date("2026-08-14T16:00:00Z"),
      summary: "Appraisal report for 14 Larch Lane",
    });
    const turtle = await resourceToTurtle(message);
    const report = await validate(turtle, {
      expect: "inbox-message",
      focusNode: "https://lender.example/inbox/appraisal-delivery",
    });
    expect(report.conforms).toBe(true);
    const read = new InboxMessage(
      "https://lender.example/inbox/appraisal-delivery",
      reparse(turtle),
      DataFactory,
    );
    expect(read.messageKind).toBe(MORT.MessageKind_AppraisalDelivery);
    expect([...read.objectIris]).toEqual(["https://appraisal.example/orders/PV-7731/report"]);
  });

  test("a credential pointer records the reader's own source check", async () => {
    const iri = "https://aus.example/casefiles/JHL-1001/source-checks/assets";
    const turtle = await resourceToTurtle(
      buildCredentialPointer({
        asOf: new Date("2026-08-03T09:00:00Z"),
        checkedAt: new Date("2026-08-05T11:00:00Z"),
        credentialType: MORT.AssetCredential,
        iri,
        issuer: "https://bank.example/profile/card#me",
        sha256: "0f".repeat(32),
        signatureVerified: true,
        statusChecked: true,
        url: `${POD}credentials/assets`,
      }),
    );
    const pointer = new CredentialPointer(iri, reparse(turtle), DataFactory);
    expect(pointer.signatureVerified).toBe(true);
    expect(pointer.statusChecked).toBe(true);
    expect(pointer.url).toBe(`${POD}credentials/assets`);
    expect(() =>
      buildCredentialPointer({
        asOf: new Date("2026-08-03T09:00:00Z"),
        credentialType: MORT.AssetCredential,
        iri,
        issuer: "https://bank.example/profile/card#me",
        sha256: "nope",
        url: `${POD}credentials/assets`,
      }),
    ).toThrow(RangeError);
  });
});
