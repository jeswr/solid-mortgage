import { LiteralFrom, RequiredAs } from "@rdfjs/wrapper";
import { DataFactory, Parser, Store } from "n3";
import { describe, expect, test } from "vitest";
import { validate } from "../src/shacl.js";
import { DPV, FIBO } from "../src/vocab/external.js";
import { MORT } from "../src/vocab/mort.js";
import {
  type BorrowerProfileInit,
  buildBorrowerProfile,
  buildConsentReceipt,
  buildCreditScoreCredential,
  buildEmploymentIncomeCredential,
  buildLoanApplication,
  buildZkOperandAnchor,
  type EmploymentIncomeCredentialInit,
} from "../src/wrappers/build.js";
import { literalFromXsdDate, literalFromXsdDecimal } from "../src/wrappers/mappings.js";
import {
  BorrowerProfile,
  ConsentReceipt,
  EmploymentIncomeCredential,
  LoanApplication,
} from "../src/wrappers/resources.js";
import { resourceToTurtle, ShapeViolationError } from "../src/wrappers/serialize.js";

const WEB_ID = "https://alex.pod.example/profile/card#me";

const PROFILE_INIT: BorrowerProfileInit = {
  webId: WEB_ID,
  name: "Alex Rivera",
  birthDate: new Date("1992-04-17T00:00:00Z"),
  emails: ["alex.rivera@mail.example"],
  telephone: "+1-555-0142",
  address: {
    streetAddress: "418 Cedar Grove Lane",
    addressLocality: "Columbus",
    addressRegion: "OH",
    postalCode: "43004",
  },
  maritalStatus: MORT.MaritalStatus_Unmarried,
};

const EMPLOYMENT_INIT: EmploymentIncomeCredentialInit = {
  iri: "https://alex.pod.example/mortgage/credentials/income",
  issuer: "https://verifications.example/orgs/employment-verifier#id",
  validFrom: new Date("2026-06-15T00:00:00Z"),
  validUntil: new Date("2026-07-29T00:00:00Z"),
  credentialStatus: "https://verifications.example/status/employment#42",
  credentialSubject: WEB_ID,
  employerName: "Ridgeline Analytics LLC",
  jobTitle: "Senior Data Engineer",
  startDate: new Date("2021-03-01T00:00:00Z"),
  monthlyGrossIncomeUsd: 8500,
  evidence: "https://alex.pod.example/reports/income-verification",
};

function reparse(turtle: string): Store {
  return new Store(new Parser({ format: "text/turtle" }).parse(turtle));
}

describe("custom literal mappings", () => {
  test("literalFromXsdDate emits a calendar-date lexical (LiteralFrom.date gotcha)", () => {
    const term = literalFromXsdDate(new Date("1992-04-17T09:30:00Z"), DataFactory);
    expect(term.value).toBe("1992-04-17");
    // The upstream LiteralFrom.date regression this replaces: a dateTime
    // lexical typed xsd:date.
    expect(LiteralFrom.date(new Date("1992-04-17T09:30:00Z"), DataFactory).value).toContain("T");
  });

  test("literalFromXsdDecimal always carries a decimal point and rejects non-finite", () => {
    expect(literalFromXsdDecimal(340000, DataFactory).value).toBe("340000.0");
    expect(literalFromXsdDecimal(6.125, DataFactory).value).toBe("6.125");
    expect(() => literalFromXsdDecimal(Number.NaN, DataFactory)).toThrow(RangeError);
    expect(() => literalFromXsdDecimal(1e30, DataFactory)).toThrow(RangeError);
  });
});

describe("wrapper round-trip (build -> serialize -> parse -> read)", () => {
  test("borrower profile", async () => {
    const built = buildBorrowerProfile(PROFILE_INIT);
    const turtle = await resourceToTurtle(built);
    expect(turtle).toContain('"1992-04-17"^^xsd:date');

    const readBack = new BorrowerProfile(WEB_ID, reparse(turtle), DataFactory);
    expect(readBack.personName).toBe("Alex Rivera");
    expect(readBack.birthDate.toISOString()).toBe("1992-04-17T00:00:00.000Z");
    expect([...readBack.emails]).toEqual(["alex.rivera@mail.example"]);
    expect(readBack.telephone).toBe("+1-555-0142");
    expect(readBack.address.streetAddress).toBe("418 Cedar Grove Lane");
    expect(readBack.address.addressRegion).toBe("OH");
    expect(readBack.maritalStatus).toBe(MORT.MaritalStatus_Unmarried);
  });

  test("employment + income credential", async () => {
    const built = buildEmploymentIncomeCredential(EMPLOYMENT_INIT);
    const turtle = await resourceToTurtle(built);

    const readBack = new EmploymentIncomeCredential(
      EMPLOYMENT_INIT.iri,
      reparse(turtle),
      DataFactory,
    );
    expect(readBack.issuer).toBe(EMPLOYMENT_INIT.issuer);
    expect(readBack.validFrom.getTime()).toBe(EMPLOYMENT_INIT.validFrom.getTime());
    expect(readBack.validUntil?.getTime()).toBe(EMPLOYMENT_INIT.validUntil?.getTime());
    expect(readBack.credentialStatusIri).toBe(EMPLOYMENT_INIT.credentialStatus);
    expect(readBack.credentialSubjectIri).toBe(WEB_ID);
    expect(readBack.evidenceIri).toBe(EMPLOYMENT_INIT.evidence);
    const subject = readBack.credentialSubject;
    expect(subject.worksFor.organizationName).toBe("Ridgeline Analytics LLC");
    expect(subject.jobTitle).toBe("Senior Data Engineer");
    expect(subject.startDate.toISOString()).toBe("2021-03-01T00:00:00.000Z");
    expect(subject.monthlyGrossIncomeUsd).toBe(8500);
  });

  test("identical inits serialise byte-identically", async () => {
    const first = await resourceToTurtle(buildEmploymentIncomeCredential(EMPLOYMENT_INIT));
    const second = await resourceToTurtle(buildEmploymentIncomeCredential(EMPLOYMENT_INIT));
    expect(second).toBe(first);
  });

  test("DPV consent receipt", async () => {
    const iri = "https://alex.pod.example/consent/receipts/grant-1";
    const built = buildConsentReceipt({
      iri,
      dataSubject: WEB_ID,
      dataController: "https://servicer.example/profile/card#service",
      target: "https://alex.pod.example/mortgage/closing-record",
      consentStatus: DPV.ConsentGiven,
      issued: new Date("2026-07-16T14:30:00.000Z"),
    });
    const turtle = await resourceToTurtle(built);
    const readBack = new ConsentReceipt(iri, reparse(turtle), DataFactory);
    expect(readBack.dataSubjectIri).toBe(WEB_ID);
    expect(readBack.dataControllerIri).toBe("https://servicer.example/profile/card#service");
    expect(readBack.targetIri).toBe("https://alex.pod.example/mortgage/closing-record");
    expect(readBack.consentStatus).toBe(DPV.ConsentGiven);
    expect(readBack.issued.toISOString()).toBe("2026-07-16T14:30:00.000Z");
  });
});

describe("ZK digit-budget enforcement (decision 0005)", () => {
  const CREDIT_INIT = {
    iri: "https://alex.pod.example/mortgage/credentials/credit",
    issuer: "https://bureau.example/orgs/credit-bureau#id",
    validFrom: new Date("2026-07-05T00:00:00Z"),
    validUntil: new Date("2026-10-05T00:00:00Z"),
    credentialStatus: "https://bureau.example/status/credit#3",
    credentialSubject: WEB_ID,
    creditScoreValue: 742,
    totalMonthlyDebtUsd: 1180,
  };

  test("setters reject out-of-budget values before any RDF is written", () => {
    expect(() => buildCreditScoreCredential({ ...CREDIT_INIT, creditScoreValue: 851 })).toThrow(
      RangeError,
    );
    expect(() => buildCreditScoreCredential({ ...CREDIT_INIT, creditScoreValue: 299 })).toThrow(
      RangeError,
    );
    expect(() =>
      buildCreditScoreCredential({ ...CREDIT_INIT, totalMonthlyDebtUsd: 10000 }),
    ).toThrow(RangeError);
    expect(() =>
      buildEmploymentIncomeCredential({ ...EMPLOYMENT_INIT, monthlyGrossIncomeUsd: 10000 }),
    ).toThrow(RangeError);
  });

  test("the SHACL gate rejects budget violations written past the setter guard", async () => {
    const credential = buildCreditScoreCredential(CREDIT_INIT);
    // Simulate a rogue writer bypassing the typed setter: write the raw
    // mapping directly, out of budget.
    RequiredAs.object(
      credential.credentialSubject,
      MORT.creditScoreValue,
      851,
      LiteralFrom.integer,
    );
    await expect(resourceToTurtle(credential)).rejects.toThrow(ShapeViolationError);
  });
});

describe("shape validation on serialize", () => {
  test("a wrapper-built document that breaks its shape never serialises", async () => {
    const profile = buildBorrowerProfile(PROFILE_INIT);
    profile.emails.add("not-an-email");
    await expect(resourceToTurtle(profile)).rejects.toThrow(ShapeViolationError);
    const failure = await resourceToTurtle(profile).catch((error: ShapeViolationError) => error);
    expect(failure).toBeInstanceOf(ShapeViolationError);
    expect((failure as ShapeViolationError).report.conforms).toBe(false);
  });

  test("membership guards reject IRIs outside the controlled vocabulary", () => {
    expect(() =>
      buildBorrowerProfile({ ...PROFILE_INIT, maritalStatus: `${MORT.maritalStatus}-bogus` }),
    ).toThrow(RangeError);
    expect(() =>
      buildZkOperandAnchor({
        ...EMPLOYMENT_INIT,
        field: MORT.closingDate,
        operandEnc: "0x1f",
      }),
    ).toThrow(RangeError);
  });
});

describe("loan application URLA facets", () => {
  const APPLICATION_INIT = {
    iri: "https://alex.pod.example/mortgage/application",
    created: new Date("2026-07-12T00:00:00Z"),
    submittedBy: WEB_ID,
    requestedAmountUsd: 340000,
    loanTermMonths: 360,
    property: {
      address: {
        streetAddress: "1121 Maple Hollow Court",
        addressLocality: "Columbus",
        addressRegion: "OH",
        postalCode: "43230",
      },
    },
    loanPurpose: FIBO.MortgageLoanPurpose_RealPropertyPurchase,
    occupancy: FIBO.PropertyUsage_primaryResidence,
    amortizationType: FIBO.AmortizationType_fixedRate,
  };

  test("facet accessors read distinct URLA facets from one dcterms:type set", async () => {
    const application = buildLoanApplication(APPLICATION_INIT);
    const turtle = await resourceToTurtle(application);
    const readBack = new LoanApplication(APPLICATION_INIT.iri, reparse(turtle), DataFactory);
    expect(readBack.loanPurpose).toBe(FIBO.MortgageLoanPurpose_RealPropertyPurchase);
    expect(readBack.occupancy).toBe(FIBO.PropertyUsage_primaryResidence);
    expect(readBack.amortizationType).toBe(FIBO.AmortizationType_fixedRate);
    expect(readBack.cashOutStatus).toBeUndefined();
    expect(readBack.requestedAmount.amountValue).toBe(340000);
    expect(readBack.subjectProperty.address.postalCode).toBe("43230");
  });

  test("cash-out on a purchase application fails the conditional shape", async () => {
    const application = buildLoanApplication({
      ...APPLICATION_INIT,
      cashOutStatus: FIBO.CashOutStatus_NoCashOut,
    });
    await expect(resourceToTurtle(application)).rejects.toThrow(ShapeViolationError);
    application.cashOutStatus = undefined;
    await expect(resourceToTurtle(application)).resolves.toContain("fibo-loan-reln-org:");
  });

  test("replacing one facet leaves the others untouched", () => {
    const application = buildLoanApplication(APPLICATION_INIT);
    application.amortizationType = FIBO.AmortizationType_adjustableRate;
    expect(application.amortizationType).toBe(FIBO.AmortizationType_adjustableRate);
    expect(application.loanPurpose).toBe(FIBO.MortgageLoanPurpose_RealPropertyPurchase);
    expect(application.occupancy).toBe(FIBO.PropertyUsage_primaryResidence);
    expect(application.urlaTypeIris.size).toBe(3);
  });
});

describe("validate() interop", () => {
  test("wrapper-built datasets pass validate() with expect + focusNode", async () => {
    const profile = buildBorrowerProfile(PROFILE_INIT);
    const report = await validate(profile.dataset, {
      expect: "borrower-profile",
      focusNode: WEB_ID,
    });
    expect(report.conforms).toBe(true);
  });
});
