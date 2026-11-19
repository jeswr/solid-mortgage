// AUTHORED-BY Claude Fable 5.2
/**
 * The static-rebuild additions: the identity, title commitment and evidence of
 * insurance credentials, operand anchors minted from captured encodings, and
 * the demo calendar as the clock.
 */

import { MORT } from "@mortgage/data-model";
import { beforeAll, describe, expect, test } from "vitest";
import {
  CAPTURED_OPERAND_ENCODINGS,
  type CredentialClaims,
  type CredentialKind,
  capturedOperandEncoding,
  type DayClock,
  instantOn,
  issueCredential,
  mintCapturedOperandAnchor,
  StatusListClient,
  validityOn,
  verifyCredential,
  ZkError,
} from "../src/index.js";
import { demoCreditScoreClaims, demoEmploymentClaims } from "../src/seed-tooling/demo.js";
import operandFixture from "./fixtures/operand-enc.json" with { type: "json" };
import kybOperandFixture from "./fixtures/operand-enc-kyb.json" with { type: "json" };
import {
  ISSUER,
  issuerKey,
  LIST_URL,
  resolveIssuerKey,
  type StubHost,
  SUBJECT,
  stubHost,
} from "./support.js";

/** Demo day 1 is Monday 3 August 2026, as in the demo calendar. */
const calendar: DayClock = {
  clock(day, time = "09:00") {
    const date = new Date(Date.UTC(2026, 7, 3 + (day - 1)));
    return new Date(`${date.toISOString().slice(0, 10)}T${time}:00-04:00`);
  },
};

const ADDRESS = {
  addressLocality: "Marlow",
  addressRegion: "OH",
  postalCode: "43004",
  streetAddress: "14 Larch Lane",
};

let host: StubHost;
let list: StatusListClient;

beforeAll(async () => {
  host = stubHost();
  // The list is published on demo day 1 and stays valid across the whole story.
  list = new StatusListClient({
    fetch: host.fetch,
    issuer: ISSUER,
    key: await issuerKey(),
    listLifetimeMs: 400 * 24 * 60 * 60 * 1000,
    url: LIST_URL,
  });
  await list.create({ now: instantOn(calendar, 1, "08:00") });
});

describe("the demo calendar as the clock", () => {
  test("a validity window starts and ends on calendar days", () => {
    const window = validityOn(calendar, 1, { time: "10:30", validDays: 120 });
    expect(window.validFrom.toISOString()).toBe("2026-08-03T14:30:00.000Z");
    expect(window.validUntil?.toISOString()).toBe("2026-12-01T14:30:00.000Z");
    expect(validityOn(calendar, 14).validUntil).toBeUndefined();
  });

  test("a non-positive or fractional validity is refused", () => {
    expect(() => validityOn(calendar, 1, { validDays: 0 })).toThrow(RangeError);
    expect(() => validityOn(calendar, 1, { validDays: 1.5 })).toThrow(RangeError);
  });

  test("a clock that returns no instant is refused", () => {
    const broken: DayClock = { clock: () => new Date(Number.NaN) };
    expect(() => instantOn(broken, 3)).toThrow(RangeError);
  });
});

describe("new credential kinds issue, validate and verify on calendar time", () => {
  const cases: readonly [CredentialKind, CredentialClaims][] = [
    [
      "identity-credential",
      {
        address: ADDRESS,
        birthDate: "1991-04-12",
        kind: "identity-credential",
        name: "Alex Rivera",
        taxIdLast4: "4417",
      },
    ],
    [
      "title-commitment-credential",
      {
        commitmentNumber: "STE-2026-0417",
        exceptions: ["Utility easement along the rear ten feet"],
        kind: "title-commitment-credential",
        loanPolicyAmountUsd: 340_000,
        ownerPolicyAmountUsd: 425_000,
        propertyAddress: ADDRESS,
        proposedInsured: ["Alex Rivera", "Juniper Home Loans, its successors and/or assigns"],
        requirements: ["Pay off and release the existing mortgage"],
        searchedThrough: "2026-08-12",
        vestedOwner: "Jordan Whitfield",
      },
    ],
    [
      "evidence-of-insurance-credential",
      {
        annualPremiumUsd: 1620,
        deductibleUsd: 1000,
        dwellingCoverageUsd: 410_000,
        kind: "evidence-of-insurance-credential",
        loanNumber: "JHL-1001",
        mortgageeClause: "Juniper Home Loans, its successors and/or assigns",
        policyEnd: "2027-09-09",
        policyNumber: "HH-55120",
        policyStart: "2026-09-09",
        propertyAddress: ADDRESS,
      },
    ],
  ];

  test.each(cases)("%s", { timeout: 30_000 }, async (kind, claims) => {
    const credentialId = `https://holder.example/credentials/${kind}`;
    const issued = await issueCredential({
      claims,
      credentialId,
      issuer: ISSUER,
      key: await issuerKey(),
      kind,
      status: list.entry(100 + cases.findIndex(([name]) => name === kind)),
      subject: SUBJECT,
      validity: validityOn(calendar, 14, { validDays: 180 }),
    });
    const options = {
      expectShape: kind,
      resolveKey: resolveIssuerKey,
      statusFetch: host.fetch,
    };
    const during = await verifyCredential(issued.body, {
      ...options,
      now: instantOn(calendar, 31),
    });
    expect(during.errors).toEqual([]);
    expect(during.verified).toBe(true);

    // The same document is not yet valid the day before issue, and expired after its window.
    const before = await verifyCredential(issued.body, {
      ...options,
      now: instantOn(calendar, 13),
    });
    expect(before.verified).toBe(false);
    const after = await verifyCredential(issued.body, {
      ...options,
      now: instantOn(calendar, 200),
    });
    expect(after.verified).toBe(false);
  });

  test("an identity credential with a full tax identifier is refused before signing", async () => {
    await expect(
      issueCredential({
        claims: {
          address: ADDRESS,
          birthDate: "1991-04-12",
          kind: "identity-credential",
          name: "Alex Rivera",
          taxIdLast4: "123-45-4417",
        },
        credentialId: "https://holder.example/credentials/identity",
        issuer: ISSUER,
        key: await issuerKey(),
        kind: "identity-credential",
        status: list.entry(120),
        subject: SUBJECT,
        validity: validityOn(calendar, 1, { validDays: 365 }),
      }),
    ).rejects.toThrow();
  });
});

describe("a status list on calendar time", () => {
  test("a default-lifetime list has expired a week later; refresh re-signs it", async () => {
    const other = stubHost();
    const url = "https://issuer.example/status/short";
    const short = new StatusListClient({
      fetch: other.fetch,
      issuer: ISSUER,
      key: await issuerKey(),
      url,
    });
    await short.create({ now: instantOn(calendar, 1) });
    await short.revoke(9, { now: instantOn(calendar, 1, "10:00") });
    const issued = await issueCredential({
      claims: demoEmploymentClaims(),
      credentialId: "https://holder.example/credentials/income-short",
      issuer: ISSUER,
      key: await issuerKey(),
      kind: "employment-income-credential",
      status: short.entry(8),
      subject: SUBJECT,
      validity: validityOn(calendar, 1, { validDays: 120 }),
    });
    const verifyOn = (day: number) =>
      verifyCredential(issued.body, {
        expectShape: "employment-income-credential",
        now: instantOn(calendar, day),
        resolveKey: resolveIssuerKey,
        statusFetch: other.fetch,
      });
    const stale = await verifyOn(8);
    expect(stale.verified).toBe(false);
    expect(stale.errors.map((error) => error.code)).toEqual(["STATUS_UNREACHABLE"]);

    await short.refresh({ now: instantOn(calendar, 8, "08:00") });
    expect((await verifyOn(8)).verified).toBe(true);
    // Refreshing kept the bits: index 9 is still revoked.
    expect(await short.readBit(9, { now: instantOn(calendar, 8) })).toBe(true);
    expect(await short.readBit(8, { now: instantOn(calendar, 8) })).toBe(false);
  });

  test("a non-positive lifetime is refused", async () => {
    const key = await issuerKey();
    expect(
      () =>
        new StatusListClient({
          fetch: host.fetch,
          issuer: ISSUER,
          key,
          listLifetimeMs: 0,
          url: LIST_URL,
        }),
    ).toThrow(/listLifetimeMs/);
  });
});

describe("operand anchors from captured encodings", () => {
  test("the table is exactly the captured fixture", () => {
    expect({ ...CAPTURED_OPERAND_ENCODINGS }).toEqual({
      ...operandFixture.encodings,
      ...kybOperandFixture.encodings,
    });
  });

  test("8,500 and 742 keep their captured encodings", () => {
    expect(capturedOperandEncoding(8500)).toBe(
      "0x205f3625597a2bc55792ed23304c85f878e5caa3d3d1decdd94fb477ef6ff6bc",
    );
    expect(capturedOperandEncoding(742)).toBe(
      "0x23b9c0f1ac8b90f9b1fd5d567d6994644332ac788d4254d76cc9ca025c7543f1",
    );
  });

  test("an uncaptured value is refused, never computed", () => {
    for (const value of [8501, 741, -1, 8500.5, Number.NaN]) {
      expect(() => capturedOperandEncoding(value)).toThrow(ZkError);
    }
  });

  test.each([
    [
      "employment-income-credential" as const,
      demoEmploymentClaims(),
      MORT.monthlyGrossIncomeUsd,
      8500,
    ],
    ["credit-score-credential" as const, demoCreditScoreClaims(), MORT.creditScoreValue, 742],
  ])(
    "%s: the anchor is read from the signed claim and verifies",
    { timeout: 30_000 },
    async (kind, claims, field, value) => {
      const key = await issuerKey();
      const validity = validityOn(calendar, 1, { validDays: 120 });
      const credential = await issueCredential({
        claims,
        credentialId: `https://holder.example/credentials/${kind}`,
        issuer: ISSUER,
        key,
        kind,
        status: list.entry(value),
        subject: SUBJECT,
        validity,
      });
      const anchor = await mintCapturedOperandAnchor({
        anchorId: `https://holder.example/credentials/${kind}-anchor`,
        credential,
        field,
        issuer: ISSUER,
        key,
        status: list.entry(value + 1),
        subject: SUBJECT,
        validity,
      });
      expect(anchor.operandEnc).toBe(operandFixture.encodings[String(value) as "742" | "8500"]);
      const outcome = await verifyCredential(anchor.credential.body, {
        expectShape: "zk-operand-anchor",
        now: instantOn(calendar, 3),
        resolveKey: resolveIssuerKey,
        statusFetch: host.fetch,
      });
      expect(outcome.errors).toEqual([]);
      expect(outcome.verified).toBe(true);
    },
  );

  test("no anchor is minted for a value outside the captured table", async () => {
    const key = await issuerKey();
    const validity = validityOn(calendar, 1, { validDays: 120 });
    const credential = await issueCredential({
      claims: demoEmploymentClaims({ monthlyGrossIncomeUsd: 8501 }),
      credentialId: "https://holder.example/credentials/income-other",
      issuer: ISSUER,
      key,
      kind: "employment-income-credential",
      status: list.entry(300),
      subject: SUBJECT,
      validity,
    });
    const mint = (field: string) =>
      mintCapturedOperandAnchor({
        anchorId: "https://holder.example/credentials/income-other-anchor",
        credential,
        field,
        issuer: ISSUER,
        key,
        status: list.entry(301),
        subject: SUBJECT,
        validity,
      });
    await expect(mint(MORT.monthlyGrossIncomeUsd)).rejects.toMatchObject({
      code: "NO_CAPTURED_ENCODING",
    });
    await expect(mint(MORT.creditScoreValue)).rejects.toMatchObject({
      code: "HIDDEN_FIELD_CARDINALITY",
    });
    await expect(mint("https://schema.org/name")).rejects.toMatchObject({ code: "NOT_A_ZK_FIELD" });
  });
});
