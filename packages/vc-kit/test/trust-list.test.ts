// AUTHORED-BY Claude Opus 5.5
/**
 * Reliance verification against a trusted-issuer list (reusable KYC demo, flows.md section 8).
 * Security-critical: every gate is exercised on its own and the verdict must fail closed.
 */

import { generateKeyPairForSuite } from "@jeswr/solid-vc";
import { buildTrustedIssuerList, MORT, resourceToTurtle } from "@mortgage/data-model";
import { DataFactory, Parser, Store, Writer } from "n3";
import { beforeAll, describe, expect, test } from "vitest";
import {
  ClaimInputError,
  type IdentityCheckClaims,
  type IssuedCredential,
  issueCredential,
  type KycAttestationClaims,
  StatusListClient,
  type TrustListInput,
  type TrustListVerificationResult,
  verifyWithTrustList,
} from "../src/index.js";
import {
  ISSUER,
  issuerKey,
  resolveIssuerKey,
  type StubHost,
  SUBJECT,
  stubHost,
} from "./support.js";

const { namedNode, literal, quad } = DataFactory;
const SCHEMA = "https://schema.org/";
const LIST_URL = "https://issuer.example/status/kyc";
const LIST_IRI = "https://relying.example/scheme/trusted-issuers";
const CREDENTIAL_ID = "https://alex.example/credentials/kyc-attestation";
const ISSUED_AT = new Date("2026-08-03T13:00:00.000Z");
const NOW = new Date("2026-08-10T15:00:00.000Z");
const YEAR = 365 * 24 * 60 * 60 * 1000;

const CHECKS: readonly IdentityCheckClaims[] = [
  {
    attributes: ["name", "birthDate"],
    date: "2019-03-14",
    description: "Unexpired government photo ID inspected in branch",
    method: "documentary",
  },
  {
    attributes: ["address", "taxIdLast4"],
    date: "2026-08-03",
    description: "Matched against a consumer reporting agency",
    method: "non-documentary",
  },
  {
    attributes: ["name"],
    date: "2026-08-03",
    description: "Screened against the published government lists",
    method: "government-list",
  },
];

const claims = (overrides: Partial<KycAttestationClaims> = {}): KycAttestationClaims => ({
  address: {
    addressLocality: "Marlow",
    addressRegion: "OH",
    postalCode: "43004",
    streetAddress: "14 Larch Lane",
  },
  birthDate: "1991-04-12",
  checks: CHECKS,
  kind: "kyc-attestation-credential",
  name: "Alex Rivera",
  ...overrides,
});

interface ListOptions {
  about?: string;
  datePublished?: Date;
  validThrough?: Date;
  entries?: Parameters<typeof buildTrustedIssuerList>[0]["entries"];
}

const bankEntry = {
  agreement: "KRS-RA-0042",
  issuer: ISSUER,
  name: "Alder Bank",
  validFrom: new Date("2026-01-01T00:00:00.000Z"),
};

async function trustList(options: ListOptions = {}): Promise<TrustListInput> {
  const list = buildTrustedIssuerList({
    about: options.about ?? MORT.KycAttestationCredential,
    datePublished: options.datePublished ?? new Date("2026-07-01T00:00:00.000Z"),
    entries: options.entries ?? [bankEntry],
    iri: LIST_IRI,
    name: "Keelstone Reliance Scheme: trusted KYC issuers",
    publisherName: "Keelstone Reliance Scheme",
    validThrough: options.validThrough ?? new Date("2027-07-01T00:00:00.000Z"),
  });
  return { document: await resourceToTurtle(list), iri: LIST_IRI };
}

let host: StubHost;
let status: StatusListClient;
let issued: IssuedCredential;
let list: TrustListInput;
let nextIndex = 10;

async function issue(
  overrides: Partial<KycAttestationClaims> = {},
  index = nextIndex++,
): Promise<IssuedCredential> {
  return issueCredential({
    claims: claims(overrides),
    credentialId: CREDENTIAL_ID,
    issuer: ISSUER,
    key: await issuerKey(),
    kind: "kyc-attestation-credential",
    status: status.entry(index),
    subject: SUBJECT,
    validity: { validFrom: ISSUED_AT, validUntil: new Date(ISSUED_AT.getTime() + YEAR) },
  });
}

function verify(
  input: string | Store,
  overrides: Partial<Parameters<typeof verifyWithTrustList>[1]> = {},
): Promise<TrustListVerificationResult> {
  return verifyWithTrustList(input, {
    expectShape: "kyc-attestation-credential",
    now: NOW,
    resolveKey: resolveIssuerKey,
    statusFetch: host.fetch,
    trustList: list,
    ...overrides,
  });
}

const codes = (result: TrustListVerificationResult) => result.errors.map((error) => error.code);
const parse = (turtle: string) => new Store(new Parser({ format: "text/turtle" }).parse(turtle));

beforeAll(async () => {
  host = stubHost();
  status = new StatusListClient({
    fetch: host.fetch,
    issuer: ISSUER,
    key: await issuerKey(),
    listLifetimeMs: 2 * YEAR,
    url: LIST_URL,
  });
  await status.create({ now: new Date("2026-08-01T00:00:00.000Z") });
  issued = await issue({}, 1);
  list = await trustList();
}, 30_000);

describe("a listed, live attestation", () => {
  test("verifies, with every gate passed and the admitting entry named", async () => {
    const result = await verify(issued.body);
    expect(result.errors).toEqual([]);
    expect(result.verified).toBe(true);
    expect(result.gates).toEqual({
      content: true,
      list: true,
      listed: true,
      signature: true,
      status: true,
    });
    expect(result.entry).toEqual({ agreement: "KRS-RA-0042", issuer: ISSUER, name: "Alder Bank" });
    expect(result.list).toEqual({
      name: "Keelstone Reliance Scheme: trusted KYC issuers",
      publisher: "Keelstone Reliance Scheme",
    });
    expect(result.credential?.subject).toBe(SUBJECT);
  });

  test("accepts the list as a parsed dataset too", async () => {
    const result = await verify(issued.body, {
      trustList: { document: parse(String(list.document)), iri: LIST_IRI },
    });
    expect(result.verified).toBe(true);
  });

  test("the signed document carries no tax identifier, evidence or image", () => {
    const store = parse(issued.body);
    expect(store.getQuads(SUBJECT, MORT.taxIdLast4, null, null)).toHaveLength(0);
    expect(
      store.getQuads(null, "https://www.w3.org/2018/credentials#evidence", null, null),
    ).toHaveLength(0);
    expect(store.getQuads(null, `${SCHEMA}image`, null, null)).toHaveLength(0);
  });
});

describe("status", () => {
  test("a revoked attestation fails the status gate only", async () => {
    const revoked = await issue();
    const index = Number(revoked.status?.statusListIndex);
    await status.revoke(index, { now: new Date("2026-08-05T00:00:00.000Z") });
    const result = await verify(revoked.body);
    expect(result.verified).toBe(false);
    expect(codes(result)).toEqual(["STATUS_REVOKED"]);
    expect(result.gates).toMatchObject({
      list: true,
      listed: true,
      signature: true,
      status: false,
    });
    expect(result.entry).toBeUndefined();
  });

  test("an unreachable status list fails closed", async () => {
    const offline: typeof fetch = async () => new Response("gone", { status: 404 });
    const result = await verify(issued.body, { statusFetch: offline });
    expect(result.verified).toBe(false);
    expect(codes(result)).toContain("STATUS_UNREACHABLE");
    expect(result.gates.status).toBe(false);
  });

  test("a stripped status entry is STATUS_MISSING (and breaks shape and signature)", async () => {
    const store = parse(issued.body);
    for (const found of store.match(
      namedNode(CREDENTIAL_ID),
      namedNode("https://www.w3.org/2018/credentials#credentialStatus"),
    )) {
      store.delete(found);
    }
    const result = await verify(store);
    expect(result.verified).toBe(false);
    expect(codes(result)).toEqual(
      expect.arrayContaining(["STATUS_MISSING", "SHAPE_VIOLATION", "INVALID_SIGNATURE"]),
    );
    expect(result.gates.status).toBe(false);
  });

  test("an attestation cannot be issued without a status entry", async () => {
    await expect(
      issueCredential({
        claims: claims(),
        credentialId: CREDENTIAL_ID,
        issuer: ISSUER,
        key: await issuerKey(),
        kind: "kyc-attestation-credential",
        subject: SUBJECT,
        validity: { validFrom: ISSUED_AT, validUntil: new Date(ISSUED_AT.getTime() + YEAR) },
      }),
    ).rejects.toThrow(/status entry/);
  });

  test("an attestation cannot be issued without an end date", async () => {
    await expect(
      issueCredential({
        claims: claims(),
        credentialId: CREDENTIAL_ID,
        issuer: ISSUER,
        key: await issuerKey(),
        kind: "kyc-attestation-credential",
        status: status.entry(nextIndex++),
        subject: SUBJECT,
        validity: { validFrom: ISSUED_AT },
      }),
    ).rejects.toThrow(/lapses/);
  });
});

describe("list membership", () => {
  test("an issuer that is not on the list fails", async () => {
    const result = await verify(issued.body, {
      trustList: await trustList({
        entries: [{ ...bankEntry, issuer: "https://other.example/profile/card#me" }],
      }),
    });
    expect(codes(result)).toEqual(["ISSUER_NOT_LISTED"]);
    expect(result.gates).toMatchObject({
      list: true,
      listed: false,
      signature: true,
      status: true,
    });
  });

  test("an empty list admits nobody", async () => {
    const result = await verify(issued.body, { trustList: await trustList({ entries: [] }) });
    expect(codes(result)).toEqual(["ISSUER_NOT_LISTED"]);
  });

  test("a listing that started after the attestation was issued fails", async () => {
    const result = await verify(issued.body, {
      trustList: await trustList({
        entries: [{ ...bankEntry, validFrom: new Date("2026-08-05T00:00:00.000Z") }],
      }),
    });
    expect(codes(result)).toEqual(["LISTING_NOT_IN_FORCE"]);
  });

  test("a listing that has ended fails", async () => {
    const result = await verify(issued.body, {
      trustList: await trustList({
        entries: [{ ...bankEntry, validThrough: new Date("2026-08-08T00:00:00.000Z") }],
      }),
    });
    expect(codes(result)).toEqual(["LISTING_NOT_IN_FORCE"]);
  });

  test("an ended listing does not hide a current one for the same issuer", async () => {
    const result = await verify(issued.body, {
      trustList: await trustList({
        entries: [
          {
            ...bankEntry,
            agreement: "KRS-RA-0001",
            validFrom: new Date("2025-01-01T00:00:00.000Z"),
            validThrough: new Date("2026-01-01T00:00:00.000Z"),
          },
          bankEntry,
        ],
      }),
    });
    expect(result.verified).toBe(true);
    expect(result.entry?.agreement).toBe("KRS-RA-0042");
  });

  test("a validly signed attestation from an unlisted issuer's own key fails", async () => {
    const otherIssuer = "https://other.example/org";
    const otherKey = await generateKeyPairForSuite(`${otherIssuer}#key-1`, "Ed25519");
    const otherList = new StatusListClient({
      fetch: host.fetch,
      issuer: otherIssuer,
      key: otherKey,
      listLifetimeMs: 2 * YEAR,
      url: "https://other.example/status/kyc",
    });
    await otherList.create({ now: new Date("2026-08-01T00:00:00.000Z") });
    const other = await issueCredential({
      claims: claims(),
      credentialId: CREDENTIAL_ID,
      issuer: otherIssuer,
      key: otherKey,
      kind: "kyc-attestation-credential",
      status: otherList.entry(3),
      subject: SUBJECT,
      validity: { validFrom: ISSUED_AT, validUntil: new Date(ISSUED_AT.getTime() + YEAR) },
    });
    const result = await verify(other.body, {
      resolveKey: async (vm) =>
        vm === otherKey.verificationMethod ? otherKey.publicKey : undefined,
    });
    expect(codes(result)).toEqual(["ISSUER_NOT_LISTED"]);
    expect(result.gates.signature).toBe(true);
  });
});

describe("the list itself", () => {
  test("a list past its end fails", async () => {
    const result = await verify(issued.body, {
      trustList: await trustList({ validThrough: new Date("2026-08-09T00:00:00.000Z") }),
    });
    expect(codes(result)).toEqual(["TRUST_LIST_OUT_OF_FORCE"]);
    expect(result.gates).toMatchObject({ list: false, listed: true, signature: true });
    expect(result.verified).toBe(false);
  });

  test("a list not yet published fails", async () => {
    const result = await verify(issued.body, {
      trustList: await trustList({ datePublished: new Date("2026-08-20T00:00:00.000Z") }),
    });
    expect(codes(result)).toEqual(["TRUST_LIST_OUT_OF_FORCE"]);
  });

  test("a list for another credential class fails", async () => {
    const result = await verify(issued.body, {
      trustList: await trustList({ about: MORT.IdentityCredential }),
    });
    expect(codes(result)).toEqual(["TRUST_LIST_WRONG_TYPE"]);
  });

  test("an unparseable list fails closed", async () => {
    const result = await verify(issued.body, {
      trustList: { document: "this is <not turtle", iri: LIST_IRI },
    });
    expect(codes(result)).toEqual(
      expect.arrayContaining(["TRUST_LIST_INVALID", "ISSUER_NOT_LISTED"]),
    );
    expect(result.gates).toMatchObject({ list: false, listed: false, signature: true });
    expect(result.list).toBeUndefined();
  });

  test("an empty document is not a list (no vacuous conformance)", async () => {
    const result = await verify(issued.body, { trustList: { document: "", iri: LIST_IRI } });
    expect(codes(result)).toContain("TRUST_LIST_INVALID");
    expect(result.verified).toBe(false);
  });

  test("a list read under the wrong IRI fails", async () => {
    const result = await verify(issued.body, {
      trustList: { document: list.document, iri: "https://relying.example/scheme/decoy" },
    });
    expect(codes(result)).toContain("TRUST_LIST_INVALID");
  });

  test("a list with an extra property fails its closed shape", async () => {
    const store = parse(String(list.document));
    store.add(quad(namedNode(LIST_IRI), namedNode(`${SCHEMA}comment`), literal("anyone goes")));
    const result = await verify(issued.body, { trustList: { document: store, iri: LIST_IRI } });
    expect(codes(result)).toContain("TRUST_LIST_INVALID");
  });

  test("a list entry whose issuer is a literal fails", async () => {
    const store = parse(String(list.document));
    for (const found of store.match(null, namedNode(`${SCHEMA}item`), null)) {
      store.delete(found);
      store.add(quad(found.subject, found.predicate, literal(ISSUER)));
    }
    const result = await verify(issued.body, { trustList: { document: store, iri: LIST_IRI } });
    expect(codes(result)).toContain("TRUST_LIST_INVALID");
  });
});

describe("tampering and keys", () => {
  test("a changed name invalidates the signature", async () => {
    const result = await verify(issued.body.replace('"Alex Rivera"', '"Mallory Rivera"'));
    expect(codes(result)).toContain("INVALID_SIGNATURE");
    expect(result.gates.signature).toBe(false);
    expect(result.verified).toBe(false);
  });

  test("an added image fails the closed shape and the signature", async () => {
    const store = parse(issued.body);
    store.add(
      quad(
        namedNode(SUBJECT),
        namedNode(`${SCHEMA}image`),
        namedNode("https://evil.example/id.jpg"),
      ),
    );
    const result = await verify(store);
    expect(codes(result)).toEqual(expect.arrayContaining(["SHAPE_VIOLATION", "INVALID_SIGNATURE"]));
    expect(result.gates.content).toBe(false);
  });

  test("an attached evidence link fails the closed shape", async () => {
    const store = parse(issued.body);
    store.add(
      quad(
        namedNode(CREDENTIAL_ID),
        namedNode("https://www.w3.org/2018/credentials#evidence"),
        namedNode("https://evil.example/passport-scan"),
      ),
    );
    const result = await verify(store);
    expect(codes(result)).toContain("SHAPE_VIOLATION");
  });

  test("a key the issuer does not hold fails", async () => {
    const stranger = await generateKeyPairForSuite(`${ISSUER}#key-1`, "Ed25519");
    const result = await verify(issued.body, { resolveKey: async () => stranger.publicKey });
    expect(codes(result)).toContain("INVALID_SIGNATURE");
    expect(result.gates.signature).toBe(false);
  });

  test("an unresolvable key fails", async () => {
    const result = await verify(issued.body, { resolveKey: async () => undefined });
    expect(result.verified).toBe(false);
    expect(result.gates.signature).toBe(false);
  });

  test("hostile input never throws and passes no gate", async () => {
    const result = await verify("<<< not a credential");
    expect(result.verified).toBe(false);
    expect(result.gates).toEqual({
      content: false,
      list: true,
      listed: false,
      signature: false,
      status: false,
    });
  });

  test("a document with no credential passes no credential gate", async () => {
    const writer = new Writer();
    writer.addQuad(namedNode(SUBJECT), namedNode(`${SCHEMA}name`), literal("Alex Rivera"));
    const body = await new Promise<string>((resolve, reject) =>
      writer.end((error, out) => (error ? reject(error) : resolve(out))),
    );
    const result = await verify(body);
    expect(result.verified).toBe(false);
    expect(result.gates.signature).toBe(false);
    expect(result.gates.status).toBe(false);
  });
});

describe("validity and check dates", () => {
  test("an expired attestation fails the content gate", async () => {
    const result = await verify(issued.body, { now: new Date(ISSUED_AT.getTime() + YEAR + 1000) });
    expect(codes(result)).toContain("EXPIRED");
    expect(result.gates.content).toBe(false);
  });

  test("an attestation used before it takes effect fails", async () => {
    const result = await verify(issued.body, { now: new Date("2026-08-02T00:00:00.000Z") });
    expect(codes(result)).toContain("NOT_YET_VALID");
  });

  test("a check dated after the attestation took effect fails", async () => {
    const late = await issue({
      checks: [{ ...(CHECKS[0] as IdentityCheckClaims), date: "2026-08-04" }],
    });
    const result = await verify(late.body);
    expect(codes(result)).toEqual(["CHECK_AFTER_ISSUANCE"]);
    expect(result.gates.content).toBe(false);
    expect(result.gates.signature).toBe(true);
  });

  test("a check on the day of issue is accepted", async () => {
    const same = await issue({
      checks: [{ ...(CHECKS[0] as IdentityCheckClaims), date: "2026-08-03" }],
    });
    expect((await verify(same.body)).verified).toBe(true);
  });
});

describe("claim input is refused before anything is signed", () => {
  const bad: readonly [string, Partial<KycAttestationClaims>][] = [
    ["no checks", { checks: [] }],
    ["nine checks", { checks: Array.from({ length: 9 }, () => CHECKS[0] as IdentityCheckClaims) }],
    [
      "an unknown method",
      {
        checks: [
          {
            ...(CHECKS[0] as IdentityCheckClaims),
            method: "telepathy" as IdentityCheckClaims["method"],
          },
        ],
      },
    ],
    [
      "an unknown attribute",
      {
        checks: [
          {
            ...(CHECKS[0] as IdentityCheckClaims),
            attributes: ["photo" as IdentityCheckClaims["attributes"][number]],
          },
        ],
      },
    ],
    [
      "an inherited key as attribute",
      {
        checks: [
          {
            ...(CHECKS[0] as IdentityCheckClaims),
            attributes: ["toString" as IdentityCheckClaims["attributes"][number]],
          },
        ],
      },
    ],
    [
      "a repeated attribute",
      { checks: [{ ...(CHECKS[0] as IdentityCheckClaims), attributes: ["name", "name"] }] },
    ],
    ["no attributes", { checks: [{ ...(CHECKS[0] as IdentityCheckClaims), attributes: [] }] }],
    [
      "an impossible check date",
      { checks: [{ ...(CHECKS[0] as IdentityCheckClaims), date: "2026-02-30" }] },
    ],
    [
      "an empty description",
      { checks: [{ ...(CHECKS[0] as IdentityCheckClaims), description: "" }] },
    ],
    [
      "a long description",
      { checks: [{ ...(CHECKS[0] as IdentityCheckClaims), description: "x".repeat(201) }] },
    ],
    ["a malformed birth date", { birthDate: "12/04/1991" }],
    ["an empty name", { name: "" }],
  ];

  test.each(bad)("%s", async (_label, overrides) => {
    await expect(issue(overrides)).rejects.toBeInstanceOf(ClaimInputError);
  });

  test("an address the shape refuses is refused at issue", async () => {
    await expect(
      issue({
        address: {
          addressLocality: "Marlow",
          addressRegion: "Ohio",
          postalCode: "43004",
          streetAddress: "14 Larch Lane",
        },
      }),
    ).rejects.toThrow(/refusing to sign/);
  });
});
