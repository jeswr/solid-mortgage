// AUTHORED-BY Claude Opus 5.5
import { DataFactory, Store } from "n3";
import { describe, expect, test } from "vitest";
import {
  BeneficialOwnershipCredential,
  buildCddDecisionRecord,
  buildIllustrativeLei,
  isIllustrativeLei,
  isValidLei,
  leiCheckDigits,
  MORT,
  OfficerAuthorisationCredential,
  OrganisationalIdentityCredential,
  validate,
  writeBeneficialOwnershipClaims,
  writeOfficerAuthorisationClaims,
  writeOrganisationalIdentityClaims,
  ZK_ANCHORABLE_FIELD_IRIS,
  zkBudgetFor,
} from "../src/index.js";
import { applyEnvelope } from "../src/wrappers/build.js";
import type { CredentialResource } from "../src/wrappers/resources.js";

const SUBJECT = "https://pods.example/northwind/profile/card#me";
const ADDRESS = {
  addressLocality: "Kansas City",
  addressRegion: "MO",
  postalCode: "64105",
  streetAddress: "1180 Freight Yard Road",
};
const OWNERS = [
  { bps: 1800, name: "Marcus Webb" },
  { bps: 4200, name: "Jordan Blake" },
  { bps: 1200, name: "Dana Reyes" },
  { bps: 2800, name: "Priya Nandakumar" },
];

type Ctor<T> = new (
  term: ReturnType<typeof DataFactory.namedNode>,
  store: Store,
  factory: typeof DataFactory,
) => T;

function envelope<T extends CredentialResource>(ctor: Ctor<T>, path: string, type: string): T {
  const credential = new ctor(
    DataFactory.namedNode(`https://pods.example/northwind/credentials/${path}`),
    new Store(),
    DataFactory,
  );
  applyEnvelope(
    credential,
    {
      credentialStatus: "https://pods.example/registry/status/list#3",
      credentialSubject: SUBJECT,
      iri: credential.value,
      issuer: "https://pods.example/registry/profile/card#me",
      validFrom: new Date("2026-09-01T09:00:00Z"),
      validUntil: new Date("2027-09-01T09:00:00Z"),
    },
    type,
  );
  return credential;
}

describe("illustrative LEIs (ISO 17442, ISO 7064 MOD 97-10)", () => {
  test("Northwind's LEI is checksum-valid and flagged by its 9999 prefix", () => {
    const lei = buildIllustrativeLei("NWLOGISTICS001");
    expect(lei).toBe("9999NWLOGISTICS00170");
    expect(isValidLei(lei)).toBe(true);
    expect(isIllustrativeLei(lei)).toBe(true);
  });

  test("a real-format LEI outside the 9999 prefix is not illustrative", () => {
    const base = "5493NWLOGISTICS001";
    const lei = `${base}${leiCheckDigits(base)}`;
    expect(isValidLei(lei)).toBe(true);
    expect(isIllustrativeLei(lei)).toBe(false);
  });

  test("a changed character breaks the checksum", () => {
    expect(isValidLei("9999NWLOGISTICS00171")).toBe(false);
    expect(isValidLei("9999NWLOGISTICS0017")).toBe(false);
    expect(() => leiCheckDigits("short")).toThrow(RangeError);
  });
});

describe("KYB claim writers produce shape-valid credentials", () => {
  test("organisational identity", async () => {
    const credential = envelope(
      OrganisationalIdentityCredential,
      "org-identity",
      MORT.OrganisationalIdentityCredential,
    );
    writeOrganisationalIdentityClaims(credential.credentialSubject, {
      address: ADDRESS,
      legalForm: "LLC",
      legalName: "Northwind Logistics LLC",
      lei: buildIllustrativeLei("NWLOGISTICS001"),
    });
    const report = await validate(credential.dataset, {
      expect: "organisational-identity-credential",
      focusNode: credential.value,
    });
    expect(report.violations).toEqual([]);
    const subject = credential.credentialSubject;
    expect(subject.legalName).toBe("Northwind Logistics LLC");
    expect(subject.lei.text).toBe("9999NWLOGISTICS00170");
    expect(subject.lei.illustrative).toBe(true);
    expect(subject.legalFormIri).toBe(MORT.EntityLegalForm_LLC);
    expect(subject.address.postalCode).toBe("64105");
  });

  test("a real-prefix LEI is refused before it is written", () => {
    const credential = envelope(
      OrganisationalIdentityCredential,
      "org-identity",
      MORT.OrganisationalIdentityCredential,
    );
    const base = "5493NWLOGISTICS001";
    expect(() =>
      writeOrganisationalIdentityClaims(credential.credentialSubject, {
        address: ADDRESS,
        legalForm: "LLC",
        legalName: "Northwind Logistics LLC",
        lei: `${base}${leiCheckDigits(base)}`,
      }),
    ).toThrow(/not an illustrative LEI/);
  });

  test("officer authorisation", async () => {
    const credential = envelope(
      OfficerAuthorisationCredential,
      "officer-authorisation",
      MORT.OfficerAuthorisationCredential,
    );
    writeOfficerAuthorisationClaims(credential.credentialSubject, {
      entityName: "Northwind Logistics LLC",
      officers: [{ jobTitle: "Managing member", name: "Jordan Blake" }],
    });
    const report = await validate(credential.dataset, {
      expect: "officer-authorisation-credential",
      focusNode: credential.value,
    });
    expect(report.violations).toEqual([]);
    const [officer] = credential.credentialSubject.officers;
    expect(officer?.personName).toBe("Jordan Blake");
    expect(officer?.jobTitle).toBe("Managing member");
  });

  test("beneficial ownership: shares in basis points, canonical order largest first", async () => {
    const credential = envelope(
      BeneficialOwnershipCredential,
      "beneficial-ownership",
      MORT.BeneficialOwnershipCredential,
    );
    writeBeneficialOwnershipClaims(credential.credentialSubject, {
      entityName: "Northwind Logistics LLC",
      owners: OWNERS,
    });
    const report = await validate(credential.dataset, {
      expect: "beneficial-ownership-credential",
      focusNode: credential.value,
    });
    expect(report.violations).toEqual([]);
    const owners = credential.credentialSubject.ownerships.map((ownership) => [
      ownership.owner.personName,
      ownership.bps,
      ownership.percentage,
    ]);
    expect(owners).toEqual([
      ["Jordan Blake", 4200, 42],
      ["Priya Nandakumar", 2800, 28],
      ["Marcus Webb", 1800, 18],
      ["Dana Reyes", 1200, 12],
    ]);
  });

  test("ownership input is checked: nine owners, a share over 100 percent, a fraction", () => {
    const credential = envelope(
      BeneficialOwnershipCredential,
      "beneficial-ownership",
      MORT.BeneficialOwnershipCredential,
    );
    const subject = credential.credentialSubject;
    const nine = Array.from({ length: 9 }, (_, index) => ({ bps: 100, name: `Owner ${index}` }));
    expect(() =>
      writeBeneficialOwnershipClaims(subject, { entityName: "X", owners: nine }),
    ).toThrow(/between 1 and 8/);
    expect(() =>
      writeBeneficialOwnershipClaims(subject, {
        entityName: "X",
        owners: [
          { bps: 6000, name: "A" },
          { bps: 6000, name: "B" },
        ],
      }),
    ).toThrow(/over 10000/);
    expect(() =>
      writeBeneficialOwnershipClaims(subject, {
        entityName: "X",
        owners: [{ bps: 12.5, name: "A" }],
      }),
    ).toThrow(/whole number/);
  });
});

describe("the bank's CDD decision record", () => {
  test("builds, validates and reads back", async () => {
    const record = buildCddDecisionRecord({
      bank: "https://pods.example/bank/profile/card#me",
      beneficialOwners: ["Jordan Blake", "Priya Nandakumar"],
      checkDate: new Date("2026-09-02T00:00:00Z"),
      checkedCredentials: [
        "https://pods.example/northwind/credentials/org-identity",
        "https://pods.example/northwind/credentials/beneficial-ownership",
      ],
      controlPerson: "Jordan Blake",
      customer: SUBJECT,
      decision: "opened",
      iri: "https://pods.example/bank/kyb/cdd/northwind",
      name: "Customer due diligence: Northwind Logistics LLC",
    });
    const report = await validate(record.dataset, {
      expect: "cdd-decision-record",
      focusNode: record.value,
    });
    expect(report.violations).toEqual([]);
    expect(record.decision).toBe("opened");
    expect(record.beneficialOwners).toEqual(["Jordan Blake", "Priya Nandakumar"]);
    expect(record.controlPerson).toBe("Jordan Blake");
    expect(record.checkedCredentials).toHaveLength(2);
  });
});

describe("KYB ZK fields", () => {
  test("an owner's share has a four-digit budget; a sole owner's 10000 bps does not fit", () => {
    const budget = zkBudgetFor(MORT.ownershipPercentageBps);
    expect(budget?.digits).toBe(4);
    expect(budget?.maxInclusive).toBe(9999);
    expect(budget?.shapeMaxInclusive).toBe(10000);
  });

  test("the owner-array commitment is anchorable but has no digit budget", () => {
    expect(ZK_ANCHORABLE_FIELD_IRIS).toContain(MORT.beneficialOwnershipArrayCommitment);
    expect(zkBudgetFor(MORT.beneficialOwnershipArrayCommitment)).toBeUndefined();
  });
});
