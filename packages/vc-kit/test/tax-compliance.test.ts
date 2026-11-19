// AUTHORED-BY Claude Opus 5.5
/**
 * Small business loan in vc-kit: the revenue department's tax compliance credential.
 * SECURITY-CRITICAL: every negative test changes ONE input of a credential that otherwise
 * passes every gate (the first test proves it does), so no rejection is vacuous.
 */

import { MORT } from "@mortgage/data-model";
import { DataFactory } from "n3";
import { beforeAll, describe, expect, it } from "vitest";
import {
  ClaimInputError,
  type IssuedCredential,
  IssueRefusedError,
  issueCredential,
  type StatusListClient,
  type TaxComplianceClaims,
  type VerifyCredentialOptions,
  verifyCredential,
} from "../src/index.js";
import {
  BACKDATED_VALIDITY,
  DAY_MS,
  hostedStatusList,
  ISSUER,
  issuerKey,
  NOW,
  parseTurtle,
  resolveIssuerKey,
  type StubHost,
  SUBJECT,
  stubHost,
} from "./support.js";

const { literal, namedNode, quad } = DataFactory;
const CREDENTIAL_ID = "https://pods.example/northwind/credentials/tax-compliance";
const XSD_DATE = "http://www.w3.org/2001/XMLSchema#date";

const CLAIMS: TaxComplianceClaims = {
  entityName: "Northwind Logistics LLC",
  filingsCurrentThrough: new Date("2026-06-30T00:00:00Z"),
  kind: "tax-compliance-credential",
  status: "compliant",
  taxIdLast4: "4417",
  turnoverBand: "500k-1m",
};

let host: StubHost;
let list: StatusListClient;
let issued: IssuedCredential;

async function issue(claims: TaxComplianceClaims = CLAIMS, index = 7) {
  return issueCredential({
    claims,
    credentialId: CREDENTIAL_ID,
    issuer: ISSUER,
    key: await issuerKey(),
    kind: "tax-compliance-credential",
    status: list.entry(index),
    subject: SUBJECT,
    validity: BACKDATED_VALIDITY,
  });
}

function options(overrides: Partial<VerifyCredentialOptions> = {}): VerifyCredentialOptions {
  return {
    expectShape: "tax-compliance-credential",
    now: NOW,
    resolveKey: resolveIssuerKey,
    statusFetch: host.fetch,
    trustedIssuers: [ISSUER],
    ...overrides,
  };
}

const codes = (result: { errors: readonly { code: string }[] }) =>
  result.errors.map((error) => error.code);

beforeAll(async () => {
  host = stubHost();
  list = await hostedStatusList(host);
  issued = await issue();
});

describe("issuing a tax compliance credential", () => {
  it("issues one that passes every gate", async () => {
    expect(issued.kind).toBe("tax-compliance-credential");
    const result = await verifyCredential(issued.body, options());
    expect(result.errors).toEqual([]);
    expect(result.verified).toBe(true);
  });

  it("signs the claims as typed RDF: band and status are mort concepts", () => {
    const store = parseTurtle(issued.body);
    const subject = namedNode(SUBJECT);
    const object = (predicate: string) =>
      store.getObjects(subject, namedNode(predicate), null).map((term) => term.value);
    expect(object(MORT.annualTurnoverBand)).toEqual([MORT.TurnoverBand_500kTo1M]);
    expect(object(MORT.taxComplianceStatus)).toEqual([MORT.TaxComplianceStatus_Compliant]);
    expect(object(MORT.filingsCurrentThrough)).toEqual(["2026-06-30"]);
    expect(object(MORT.taxIdLast4)).toEqual(["4417"]);
    expect(
      store.getObjects(
        namedNode(CREDENTIAL_ID),
        namedNode(`${"https://www.w3.org/2018/credentials#"}credentialSchema`),
        null,
      )[0]?.value,
    ).toBe("https://solid-mortgage-vocab.vercel.app/shapes#TaxComplianceCredentialShape");
  });

  it("never discloses a turnover figure, only the band", () => {
    expect(issued.body).not.toMatch(/turnoverUsd|annualRevenue|\b7\d{5}\b/);
  });

  it("can attest a business that is NOT compliant (the issuer's call, not the schema's)", async () => {
    const credential = await issue({ ...CLAIMS, status: "not-compliant" }, 8);
    const result = await verifyCredential(credential.body, options());
    expect(result.verified).toBe(true);
    expect(credential.body).toContain("TaxComplianceStatus-NotCompliant");
  });

  it.each([
    [{ taxIdLast4: "12345" }, /four digits/],
    [{ taxIdLast4: "12-4" }, /four digits/],
    [{ taxIdLast4: "" }, /four digits/],
    [{ entityName: "" }, /entity name/],
    [{ status: "probably" }, /unknown tax compliance status/],
    [{ status: "__proto__" }, /unknown tax compliance status/],
    [{ turnoverBand: "1m" }, /unknown turnover band/],
    [{ turnoverBand: "constructor" }, /unknown turnover band/],
    [{ filingsCurrentThrough: new Date(Number.NaN) }, /valid date/],
  ])("refuses to sign %o", async (override, message) => {
    await expect(
      issue({ ...CLAIMS, ...(override as object) } as TaxComplianceClaims),
    ).rejects.toThrow(message);
  });

  it("refuses claims whose kind does not match the requested kind", async () => {
    await expect(
      issueCredential({
        claims: CLAIMS,
        credentialId: CREDENTIAL_ID,
        issuer: ISSUER,
        key: await issuerKey(),
        kind: "identity-credential",
        status: list.entry(9),
        subject: SUBJECT,
        validity: BACKDATED_VALIDITY,
      }),
    ).rejects.toBeInstanceOf(ClaimInputError);
  });

  it("refuses an inverted validity window before signing (shape gate)", async () => {
    await expect(
      issueCredential({
        claims: CLAIMS,
        credentialId: CREDENTIAL_ID,
        issuer: ISSUER,
        key: await issuerKey(),
        kind: "tax-compliance-credential",
        status: list.entry(10),
        subject: SUBJECT,
        validity: {
          validFrom: BACKDATED_VALIDITY.validUntil,
          validUntil: BACKDATED_VALIDITY.validFrom,
        },
      }),
    ).rejects.toBeInstanceOf(IssueRefusedError);
  });
});

describe("verifying a tax compliance credential fails closed", () => {
  it("a better turnover band invalidates the signature", async () => {
    const store = parseTurtle(issued.body);
    const subject = namedNode(SUBJECT);
    for (const found of store.match(subject, namedNode(MORT.annualTurnoverBand))) {
      store.delete(found);
    }
    store.add(
      quad(subject, namedNode(MORT.annualTurnoverBand), namedNode(MORT.TurnoverBand_1MTo5M)),
    );
    const result = await verifyCredential(store, options());
    expect(result.verified).toBe(false);
    expect(codes(result)).toContain("INVALID_SIGNATURE");
  });

  it("a later filings date invalidates the signature", async () => {
    const store = parseTurtle(issued.body);
    const subject = namedNode(SUBJECT);
    for (const found of store.match(subject, namedNode(MORT.filingsCurrentThrough))) {
      store.delete(found);
    }
    store.add(
      quad(
        subject,
        namedNode(MORT.filingsCurrentThrough),
        literal("2026-09-30", namedNode(XSD_DATE)),
      ),
    );
    const result = await verifyCredential(store, options());
    expect(result.verified).toBe(false);
    expect(codes(result)).toContain("INVALID_SIGNATURE");
  });

  it("a non-compliant credential relabelled compliant invalidates the signature", async () => {
    const credential = await issue({ ...CLAIMS, status: "not-compliant" }, 11);
    const forged = credential.body.replace(
      "TaxComplianceStatus-NotCompliant",
      "TaxComplianceStatus-Compliant",
    );
    expect(forged).not.toBe(credential.body);
    const result = await verifyCredential(forged, options());
    expect(result.verified).toBe(false);
    expect(codes(result)).toContain("INVALID_SIGNATURE");
  });

  it("transplanting it onto another business invalidates the signature", async () => {
    const result = await verifyCredential(
      issued.body.replaceAll(SUBJECT, "https://pods.example/mallory/profile/card#me"),
      options(),
    );
    expect(result.verified).toBe(false);
    expect(codes(result)).toContain("INVALID_SIGNATURE");
  });

  it("an extra disclosed figure fails the closed shape and the signature", async () => {
    const store = parseTurtle(issued.body);
    store.add(
      quad(
        namedNode(SUBJECT),
        namedNode("https://schema.org/description"),
        literal("turnover 742,000"),
      ),
    );
    const result = await verifyCredential(store, options());
    expect(result.verified).toBe(false);
    expect(codes(result)).toEqual(expect.arrayContaining(["SHAPE_VIOLATION", "INVALID_SIGNATURE"]));
  });

  it("presented as another kind, it fails the shape gate", async () => {
    const result = await verifyCredential(
      issued.body,
      options({ expectShape: "organisational-identity-credential" }),
    );
    expect(result.verified).toBe(false);
    expect(codes(result)).toContain("SHAPE_VIOLATION");
  });

  it("an issuer outside the allowlist is refused", async () => {
    const result = await verifyCredential(
      issued.body,
      options({ trustedIssuers: ["https://pods.example/registry/profile/card#me"] }),
    );
    expect(result.verified).toBe(false);
    expect(codes(result)).toContain("UNTRUSTED_ISSUER");
  });

  it("a key the resolver does not know is refused", async () => {
    const result = await verifyCredential(
      issued.body,
      options({ resolveKey: async () => undefined }),
    );
    expect(result.verified).toBe(false);
  });

  it("is EXPIRED after its window and NOT_YET_VALID before it", async () => {
    const late = await verifyCredential(
      issued.body,
      options({ now: new Date(BACKDATED_VALIDITY.validUntil.getTime() + DAY_MS) }),
    );
    expect(codes(late)).toContain("EXPIRED");
    const early = await verifyCredential(
      issued.body,
      options({ now: new Date(BACKDATED_VALIDITY.validFrom.getTime() - DAY_MS) }),
    );
    expect(codes(early)).toContain("NOT_YET_VALID");
  });

  it("a revoked credential is refused, and passes again once reinstated", async () => {
    const credential = await issue(CLAIMS, 12);
    await list.revoke(12, { now: NOW });
    const revoked = await verifyCredential(credential.body, options());
    expect(revoked.verified).toBe(false);
    expect(codes(revoked)).toContain("STATUS_REVOKED");
    await list.reinstate(12, { now: NOW });
    expect((await verifyCredential(credential.body, options())).verified).toBe(true);
  });

  it("an unreachable status list is refused", async () => {
    const result = await verifyCredential(issued.body, options({ statusFetch: stubHost().fetch }));
    expect(result.verified).toBe(false);
    expect(codes(result)).toContain("STATUS_UNREACHABLE");
  });

  it("a stripped proof is refused", async () => {
    const store = parseTurtle(issued.body);
    const proofs = store.getQuads(null, namedNode("https://w3id.org/security#proof"), null, null);
    expect(proofs.length).toBeGreaterThan(0);
    for (const found of proofs) store.delete(found);
    const result = await verifyCredential(store, options());
    expect(result.verified).toBe(false);
    expect(codes(result)).toContain("NO_PROOF");
  });
});
