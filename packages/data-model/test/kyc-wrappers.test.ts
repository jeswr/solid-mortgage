// AUTHORED-BY Claude Opus 5.5
import { DataFactory, Parser, Store } from "n3";
import { describe, expect, test } from "vitest";
import { validate } from "../src/shacl.js";
import { DPV, SCHEMA } from "../src/vocab/external.js";
import { MORT } from "../src/vocab/mort.js";
import {
  buildKycAttestationCredential,
  buildTrustedIssuerList,
  type IdentityCheckInit,
  KycAttestationCredential,
  TrustedIssuerList,
} from "../src/wrappers/kyc.js";
import {
  AccessAgreement,
  buildAccessAgreement,
  permissionInits,
} from "../src/wrappers/policies.js";
import { resourceToTurtle } from "../src/wrappers/serialize.js";

const POD = "https://alex.pod.example/";
const ALEX = `${POD}profile/card#me`;
const BANK = "https://bank.example/profile/card#me";
const CARD = "https://card.example/profile/card#me";
const ADDRESS = {
  addressLocality: "Marlow",
  addressRegion: "OH",
  postalCode: "43004",
  streetAddress: "14 Larch Lane",
};
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const reparse = (turtle: string) => new Store(new Parser({ format: "text/turtle" }).parse(turtle));

const CHECKS: IdentityCheckInit[] = [
  {
    attributes: [SCHEMA.name, SCHEMA.birthDate],
    date: day("2019-03-14"),
    description: "Unexpired government photo ID inspected in branch",
    method: MORT.IdentityCheckMethod_Documentary,
  },
  {
    attributes: [SCHEMA.address, MORT.taxIdLast4],
    date: day("2026-08-03"),
    description: "Address and identifier matched against a consumer reporting agency",
    method: MORT.IdentityCheckMethod_NonDocumentary,
  },
];

const attestation = (checks: readonly IdentityCheckInit[] = CHECKS) => ({
  address: ADDRESS,
  birthDate: day("1990-04-12"),
  checks,
  credentialStatus: "https://bank.example/status/1#7",
  credentialSubject: ALEX,
  iri: `${POD}credentials/kyc-attestation`,
  issuer: BANK,
  name: "Alex Rivera",
  validFrom: new Date("2026-08-03T09:00:00Z"),
  validUntil: new Date("2027-08-03T09:00:00Z"),
});

describe("KYC attestation", () => {
  test("round-trips through the closed shape", async () => {
    const init = attestation();
    const turtle = await resourceToTurtle(buildKycAttestationCredential(init));
    const store = reparse(turtle);
    const report = await validate(store, {
      expect: "kyc-attestation-credential",
      focusNode: init.iri,
    });
    expect(report.conforms).toBe(true);
    const read = new KycAttestationCredential(init.iri, store, DataFactory);
    expect(read.issuer).toBe(BANK);
    expect(read.validUntil).toEqual(init.validUntil);
    const subject = read.credentialSubject;
    expect(subject.name).toBe("Alex Rivera");
    expect(subject.birthDate).toEqual(day("1990-04-12"));
    expect(subject.address.streetAddress).toBe("14 Larch Lane");
    const checks = subject.checks
      .map((check) => ({
        attributes: [...check.checkedAttributes].sort(),
        date: check.date,
        description: check.description,
        method: check.method,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    expect(checks).toEqual(
      CHECKS.map((check) => ({ ...check, attributes: [...check.attributes].sort() })),
    );
  });

  test("never carries a tax identifier or document field on the subject", async () => {
    const turtle = await resourceToTurtle(buildKycAttestationCredential(attestation()));
    const store = reparse(turtle);
    expect(store.getQuads(ALEX, MORT.taxIdLast4, null, null)).toHaveLength(0);
  });

  test.each([
    ["no checks", []],
    ["nine checks", Array.from({ length: 9 }, () => CHECKS[0] as IdentityCheckInit)],
    ["an unknown method", [{ ...(CHECKS[0] as IdentityCheckInit), method: MORT.IdentityCheck }]],
    ["no attributes", [{ ...(CHECKS[0] as IdentityCheckInit), attributes: [] }]],
    [
      "a repeated attribute",
      [{ ...(CHECKS[0] as IdentityCheckInit), attributes: [SCHEMA.name, SCHEMA.name] }],
    ],
    [
      "an attribute outside the scheme",
      [{ ...(CHECKS[0] as IdentityCheckInit), attributes: ["https://schema.org/image"] }],
    ],
    ["an empty description", [{ ...(CHECKS[0] as IdentityCheckInit), description: "" }]],
    [
      "a 201-character description",
      [{ ...(CHECKS[0] as IdentityCheckInit), description: "x".repeat(201) }],
    ],
    ["an invalid date", [{ ...(CHECKS[0] as IdentityCheckInit), date: new Date("nope") }]],
  ] as const)("refuses %s before anything is written", (_label, checks) => {
    expect(() => buildKycAttestationCredential(attestation(checks))).toThrow(RangeError);
  });

  test("refuses an empty name", () => {
    expect(() => buildKycAttestationCredential({ ...attestation(), name: "" })).toThrow(RangeError);
  });

  test("the shape refuses an attestation without an end date", async () => {
    const { validUntil: _dropped, ...init } = attestation();
    await expect(resourceToTurtle(buildKycAttestationCredential(init))).rejects.toThrow();
  });
});

describe("trusted-issuer list", () => {
  const init = {
    about: MORT.KycAttestationCredential,
    datePublished: new Date("2026-07-01T00:00:00Z"),
    entries: [
      {
        agreement: "KRS-RA-0042",
        issuer: BANK,
        name: "Alder Bank",
        validFrom: new Date("2026-01-01T00:00:00Z"),
      },
      {
        agreement: "KRS-RA-0017",
        issuer: "https://other.example/profile/card#me",
        name: "Other member",
        validFrom: new Date("2025-01-01T00:00:00Z"),
        validThrough: new Date("2026-01-01T00:00:00Z"),
      },
    ],
    iri: "https://card.example/scheme/trusted-issuers",
    name: "Keelstone Reliance Scheme: trusted KYC issuers",
    publisherName: "Keelstone Reliance Scheme",
    validThrough: new Date("2027-07-01T00:00:00Z"),
  };

  test("round-trips through the closed shape", async () => {
    const turtle = await resourceToTurtle(buildTrustedIssuerList(init));
    const store = reparse(turtle);
    const report = await validate(store, { expect: "trusted-issuer-list", focusNode: init.iri });
    expect(report.conforms).toBe(true);
    const list = new TrustedIssuerList(init.iri, store, DataFactory);
    expect(list.name).toBe(init.name);
    expect(list.publisher.organizationName).toBe("Keelstone Reliance Scheme");
    expect(list.about).toBe(MORT.KycAttestationCredential);
    expect(list.datePublished).toEqual(init.datePublished);
    expect(list.validThrough).toEqual(init.validThrough);
    const entries = list.entries
      .map((entry) => ({
        agreement: entry.agreement,
        issuer: entry.issuer,
        name: entry.name,
        validFrom: entry.validFrom,
        ...(entry.validThrough === undefined ? {} : { validThrough: entry.validThrough }),
      }))
      .sort((a, b) => a.agreement.localeCompare(b.agreement));
    expect(entries).toEqual(
      [...init.entries].sort((a, b) => a.agreement.localeCompare(b.agreement)),
    );
  });

  test("refuses more than 64 entries", () => {
    const entry = init.entries[0];
    if (entry === undefined) throw new Error("fixture");
    expect(() =>
      buildTrustedIssuerList({ ...init, entries: Array.from({ length: 65 }, () => entry) }),
    ).toThrow(RangeError);
  });

  test("the shape refuses an entry that ends before it starts", async () => {
    const entry = init.entries[0];
    if (entry === undefined) throw new Error("fixture");
    const list = buildTrustedIssuerList({
      ...init,
      entries: [{ ...entry, validThrough: new Date("2025-01-01T00:00:00Z") }],
    });
    await expect(resourceToTurtle(list)).rejects.toThrow();
  });
});

describe("one-time grant (odrl:count)", () => {
  const base = {
    assignee: CARD,
    assigner: ALEX,
    description: "Identity verification for a card application",
    grantCode: "Y1",
    iri: `${POD}policies/y1`,
    issued: new Date("2026-08-03T10:00:00Z"),
    name: "Verified identity, once",
  };
  const permission = {
    assignee: CARD,
    end: { until: new Date("2026-08-03T11:00:00Z") },
    modes: ["Read" as const],
    purpose: DPV.IdentityVerification,
    targets: [`${POD}credentials/kyc-attestation`],
  };

  test("a count of one reads back and survives permissionInits", async () => {
    const turtle = await resourceToTurtle(
      buildAccessAgreement({ ...base, permissions: [{ ...permission, maxUses: 1 }] }),
    );
    const agreement = new AccessAgreement(base.iri, reparse(turtle), DataFactory);
    expect(agreement.permissions[0]?.maxUses).toBe(1);
    expect(permissionInits(agreement)[0]?.maxUses).toBe(1);
    expect(permissionInits(agreement)[0]?.end).toEqual(permission.end);
  });

  test("a permission without a count has no maxUses", async () => {
    const turtle = await resourceToTurtle(
      buildAccessAgreement({ ...base, permissions: [permission] }),
    );
    const agreement = new AccessAgreement(base.iri, reparse(turtle), DataFactory);
    expect(agreement.permissions[0]?.maxUses).toBeUndefined();
    expect("maxUses" in (permissionInits(agreement)[0] ?? {})).toBe(false);
  });

  test.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    "refuses a count of %s",
    (maxUses) => {
      expect(() =>
        buildAccessAgreement({ ...base, permissions: [{ ...permission, maxUses }] }),
      ).toThrow(RangeError);
    },
  );

  test("a malformed count in pod RDF throws on read", async () => {
    const turtle = await resourceToTurtle(
      buildAccessAgreement({ ...base, permissions: [{ ...permission, maxUses: 1 }] }),
    );
    const tampered = turtle.replace(/odrl:rightOperand 1\b/, "odrl:rightOperand 0");
    expect(tampered).not.toBe(turtle);
    const agreement = new AccessAgreement(base.iri, reparse(tampered), DataFactory);
    expect(() => agreement.permissions[0]?.maxUses).toThrow(RangeError);
  });
});
