/**
 * Issuance gates (fail-closed): wrong-shape claims are REFUSED before any
 * signature exists, unsafe structural input throws, and the happy path
 * produces a shape-conformant signed graph for every credential kind.
 */

import { describe, expect, test } from "vitest";
import {
  ClaimInputError,
  IssueRefusedError,
  issueCredential,
  StatusListClient,
} from "../src/index.js";
import {
  anchorClaims,
  appraisalClaims,
  assetClaims,
  BACKDATED_VALIDITY,
  CREDENTIAL_ID,
  creditScoreClaims,
  employmentClaims,
  hostedStatusList,
  ISSUER,
  issuerKey,
  LIST_URL,
  NOW,
  SUBJECT,
  stubHost,
  titleClearClaims,
} from "./support.js";

function entry(index: number) {
  return {
    statusPurpose: "revocation" as const,
    statusListIndex: index,
    statusListCredential: LIST_URL,
  };
}

async function baseOptions() {
  return {
    credentialId: CREDENTIAL_ID,
    issuer: ISSUER,
    subject: SUBJECT,
    validity: BACKDATED_VALIDITY,
    status: entry(42),
    key: await issuerKey(),
  };
}

describe("issueCredential - happy paths per kind", () => {
  test("employment-income-credential issues a signed shape-conformant graph", async () => {
    const issued = await issueCredential({
      ...(await baseOptions()),
      kind: "employment-income-credential",
      claims: employmentClaims(),
    });
    expect(issued.contentType).toBe("text/turtle");
    expect(issued.proof.cryptosuite).toBe("eddsa-rdfc-2022");
    expect(issued.quads.length).toBeGreaterThan(issued.claimQuads.length);
    expect(issued.body).toContain("monthlyGrossIncomeUsd");
    expect(issued.status?.statusListIndex).toBe("42");
  });

  test.each([
    ["asset-credential", assetClaims()],
    ["credit-score-credential", creditScoreClaims()],
    ["appraisal-credential", appraisalClaims()],
    ["title-clear-credential", titleClearClaims()],
  ] as const)("%s issues", { timeout: 30_000 }, async (kind, claims) => {
    const issued = await issueCredential({
      ...(await baseOptions()),
      kind,
      claims,
    });
    expect(issued.kind).toBe(kind);
    expect(issued.proof.proofValue.startsWith("z")).toBe(true);
  });

  test("zk-operand-anchor issues without validUntil (revocation-only lifetime)", async () => {
    const issued = await issueCredential({
      ...(await baseOptions()),
      kind: "zk-operand-anchor",
      claims: anchorClaims(),
      validity: { validFrom: BACKDATED_VALIDITY.validFrom },
    });
    expect(issued.body).toContain("operandEnc");
    expect(issued.body).not.toContain("validUntil");
  });

  test("backdated validity is emitted verbatim (explicit dates, no clock reads)", async () => {
    const issued = await issueCredential({
      ...(await baseOptions()),
      kind: "employment-income-credential",
      claims: employmentClaims(),
    });
    expect(issued.body).toContain(BACKDATED_VALIDITY.validFrom.toISOString());
    expect(issued.body).toContain(BACKDATED_VALIDITY.validUntil.toISOString());
    // The proof timestamp defaults to validFrom - NOT to the wall clock.
    expect(issued.proof.created).toBe(BACKDATED_VALIDITY.validFrom.toISOString());
  });
});

describe("issueCredential - fail-closed refusals (nothing is signed)", () => {
  test("income above decision 0005's 4-digit budget is refused", async () => {
    await expect(
      issueCredential({
        ...(await baseOptions()),
        kind: "employment-income-credential",
        claims: employmentClaims({ monthlyGrossIncomeUsd: 10_000 }),
      }),
    ).rejects.toThrowError(IssueRefusedError);
  });

  test("negative income is refused", async () => {
    await expect(
      issueCredential({
        ...(await baseOptions()),
        kind: "employment-income-credential",
        claims: employmentClaims({ monthlyGrossIncomeUsd: -1 }),
      }),
    ).rejects.toThrowError(IssueRefusedError);
  });

  test("non-integer income is refused before touching the graph", async () => {
    await expect(
      issueCredential({
        ...(await baseOptions()),
        kind: "employment-income-credential",
        claims: employmentClaims({ monthlyGrossIncomeUsd: 8500.5 }),
      }),
    ).rejects.toThrowError(ClaimInputError);
  });

  test("empty jobTitle violates the subject shape", async () => {
    await expect(
      issueCredential({
        ...(await baseOptions()),
        kind: "employment-income-credential",
        claims: employmentClaims({ jobTitle: "" }),
      }),
    ).rejects.toThrowError(IssueRefusedError);
  });

  test("malformed startDate lexical is refused (LiteralFrom.date gotcha guard)", async () => {
    await expect(
      issueCredential({
        ...(await baseOptions()),
        kind: "employment-income-credential",
        claims: employmentClaims({ startDate: "01/03/2021" }),
      }),
    ).rejects.toThrowError(ClaimInputError);
  });

  test("an invalid calendar date is refused (2021-02-30 must not normalise)", async () => {
    await expect(
      issueCredential({
        ...(await baseOptions()),
        kind: "employment-income-credential",
        claims: employmentClaims({ startDate: "2021-02-30" }),
      }),
    ).rejects.toThrowError(ClaimInputError);
  });

  test("dateTime lexical in an xsd:date slot is refused (regression guard)", async () => {
    await expect(
      issueCredential({
        ...(await baseOptions()),
        kind: "employment-income-credential",
        claims: employmentClaims({ startDate: "2021-03-01T00:00:00.000Z" }),
      }),
    ).rejects.toThrowError(ClaimInputError);
  });

  test("missing validUntil is refused for employment (freshness window is REQUIRED)", async () => {
    await expect(
      issueCredential({
        ...(await baseOptions()),
        kind: "employment-income-credential",
        claims: employmentClaims(),
        validity: { validFrom: BACKDATED_VALIDITY.validFrom },
      }),
    ).rejects.toThrowError(IssueRefusedError);
  });

  test("inverted validity window is refused (sh:lessThan)", async () => {
    await expect(
      issueCredential({
        ...(await baseOptions()),
        kind: "employment-income-credential",
        claims: employmentClaims(),
        validity: {
          validFrom: BACKDATED_VALIDITY.validUntil,
          validUntil: BACKDATED_VALIDITY.validFrom,
        },
      }),
    ).rejects.toThrowError(IssueRefusedError);
  });

  test("missing status entry is refused (credentialStatus is REQUIRED)", async () => {
    const { status: _status, ...options } = await baseOptions();
    await expect(
      issueCredential({
        ...options,
        kind: "employment-income-credential",
        claims: employmentClaims(),
      }),
    ).rejects.toThrowError(IssueRefusedError);
  });

  test("a non-http(s) status list URL is refused by the entry validator", async () => {
    await expect(
      issueCredential({
        ...(await baseOptions()),
        kind: "employment-income-credential",
        claims: employmentClaims(),
        status: {
          statusPurpose: "revocation",
          statusListIndex: 1,
          statusListCredential: "ftp://issuer.example/list",
        },
      }),
    ).rejects.toThrow();
  });

  test("a non-integer status index is refused by the entry validator", async () => {
    await expect(
      issueCredential({
        ...(await baseOptions()),
        kind: "employment-income-credential",
        claims: employmentClaims(),
        status: {
          statusPurpose: "revocation",
          statusListIndex: "abc",
          statusListCredential: LIST_URL,
        },
      }),
    ).rejects.toThrow();
  });

  test("claims.kind mismatching kind is refused", async () => {
    await expect(
      issueCredential({
        ...(await baseOptions()),
        kind: "asset-credential",
        claims: employmentClaims(),
      }),
    ).rejects.toThrowError(ClaimInputError);
  });

  test("a credentialId that is not an absolute IRI is refused", async () => {
    await expect(
      issueCredential({
        ...(await baseOptions()),
        credentialId: "credentials/income> <https://evil.example/x",
        kind: "employment-income-credential",
        claims: employmentClaims(),
      }),
    ).rejects.toThrowError(ClaimInputError);
  });

  test("an IRI-breaking subject WebID is refused (injection guard)", async () => {
    await expect(
      issueCredential({
        ...(await baseOptions()),
        subject: "https://alex.example/me> a <https://evil.example/Admin",
        kind: "employment-income-credential",
        claims: employmentClaims(),
      }),
    ).rejects.toThrowError(ClaimInputError);
  });

  test("credit score below 300 is refused", async () => {
    await expect(
      issueCredential({
        ...(await baseOptions()),
        kind: "credit-score-credential",
        claims: creditScoreClaims({ creditScoreValue: 299 }),
      }),
    ).rejects.toThrowError(IssueRefusedError);
  });

  test("a five-digit accountLast4 is refused", async () => {
    await expect(
      issueCredential({
        ...(await baseOptions()),
        kind: "asset-credential",
        claims: {
          kind: "asset-credential",
          accounts: [
            { provider: { name: "First Example Bank" }, amountUsd: 64_000, accountLast4: "48213" },
          ],
        },
      }),
    ).rejects.toThrowError(IssueRefusedError);
  });

  test("an anchor over a non-anchorable field is refused (sh:in allowlist)", async () => {
    await expect(
      issueCredential({
        ...(await baseOptions()),
        kind: "zk-operand-anchor",
        claims: anchorClaims({
          field: "https://solid-mortgage-vocab.vercel.app/mort#accountLast4",
        }),
      }),
    ).rejects.toThrowError(IssueRefusedError);
  });

  test("an anchor with a malformed operandEnc is refused (hex pattern)", async () => {
    await expect(
      issueCredential({
        ...(await baseOptions()),
        kind: "zk-operand-anchor",
        claims: anchorClaims({ operandEnc: "0xNOTHEX" }),
      }),
    ).rejects.toThrowError(IssueRefusedError);
  });
});

describe("issuance composes with a hosted status list", () => {
  test("entry() indices land in the signed graph and resolve against the host", async () => {
    const host = stubHost();
    const list = await hostedStatusList(host);
    const issued = await issueCredential({
      ...(await baseOptions()),
      kind: "employment-income-credential",
      claims: employmentClaims(),
      status: list.entry(7),
    });
    expect(issued.body).toContain('"7"');
    expect(await list.readBit(7, { now: NOW })).toBe(false);
    expect(list).toBeInstanceOf(StatusListClient);
  });
});
