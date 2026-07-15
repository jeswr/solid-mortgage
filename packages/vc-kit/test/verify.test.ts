/**
 * Verification gates (fail-closed): tampering, transplanting, stripping,
 * smuggling, decoys, expiry, trust and status failures each surface as a
 * distinct error - and NONE of them verifies.
 */

import type { Quad_Object, Quad_Subject } from "@rdfjs/types";
import { DataFactory } from "n3";
import { beforeAll, describe, expect, test } from "vitest";
import type { IssuedCredential, StatusListClient, VcKitErrorCode } from "../src/index.js";
import { checkCredentialStatus, issueCredential, verifyCredential } from "../src/index.js";
import {
  anchorClaims,
  appraisalClaims,
  assetClaims,
  BACKDATED_VALIDITY,
  CREDENTIAL_ID,
  creditScoreClaims,
  DAY_MS,
  employmentClaims,
  hostedStatusList,
  ISSUER,
  issueEmployment,
  issuerKey,
  NOW,
  parseTurtle,
  resolveIssuerKey,
  type StubHost,
  SUBJECT,
  stubHost,
  titleClearClaims,
} from "./support.js";

const { namedNode, literal, quad, blankNode } = DataFactory;
const SEC_PROOF = "https://w3id.org/security#proof";
const CRED_STATUS = "https://www.w3.org/2018/credentials#credentialStatus";
const MORT_INCOME = "https://solid-mortgage-vocab.vercel.app/mort#monthlyGrossIncomeUsd";
const XSD_INTEGER = "http://www.w3.org/2001/XMLSchema#integer";

let host: StubHost;
let list: StatusListClient;
let issued: IssuedCredential;

beforeAll(async () => {
  host = stubHost();
  list = await hostedStatusList(host);
  issued = await issueEmployment(list);
});

function verifyOptions(overrides: Record<string, unknown> = {}) {
  return {
    expectShape: "employment-income-credential" as const,
    now: NOW,
    resolveKey: resolveIssuerKey,
    statusFetch: host.fetch,
    ...overrides,
  };
}

function codesOf(result: { errors: readonly { code: VcKitErrorCode }[] }): VcKitErrorCode[] {
  return result.errors.map((error) => error.code);
}

describe("round trips", () => {
  test("the issued employment credential verifies from its Turtle body", async () => {
    const outcome = await verifyCredential(issued.body, verifyOptions());
    expect(outcome.errors).toEqual([]);
    expect(outcome.verified).toBe(true);
    expect(outcome.credential?.issuer).toBe(ISSUER);
    expect(outcome.credential?.subject).toBe(SUBJECT);
  });

  test.each([
    ["asset-credential", assetClaims()],
    ["credit-score-credential", creditScoreClaims()],
    ["appraisal-credential", appraisalClaims()],
    ["title-clear-credential", titleClearClaims()],
    ["zk-operand-anchor", anchorClaims()],
  ] as const)("%s round-trips issue -> verify", { timeout: 30_000 }, async (kind, claims) => {
    const other = await issueCredential({
      kind,
      credentialId: `https://alex.example/credentials/${kind}`,
      issuer: ISSUER,
      subject: SUBJECT,
      claims,
      validity: BACKDATED_VALIDITY,
      status: list.entry(kind.length), // distinct small indices
      key: await issuerKey(),
    });
    const outcome = await verifyCredential(other.body, verifyOptions({ expectShape: kind }));
    expect(outcome.errors).toEqual([]);
    expect(outcome.verified).toBe(true);
  });

  test("trustedIssuers allowlist admits the issuer", async () => {
    const outcome = await verifyCredential(
      issued.body,
      verifyOptions({ trustedIssuers: [ISSUER] }),
    );
    expect(outcome.verified).toBe(true);
  });
});

describe("tampering fails closed", () => {
  test("a modified claim value invalidates the signature", async () => {
    const store = parseTurtle(issued.body);
    const subject = namedNode(SUBJECT);
    for (const found of store.match(subject, namedNode(MORT_INCOME))) {
      store.delete(found);
    }
    store.add(quad(subject, namedNode(MORT_INCOME), literal("9100", namedNode(XSD_INTEGER))));
    const outcome = await verifyCredential(store, verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("INVALID_SIGNATURE");
  });

  test("an added garbage triple invalidates the signature", async () => {
    const store = parseTurtle(issued.body);
    store.add(
      quad(namedNode(SUBJECT), namedNode("https://schema.org/description"), literal("smuggled")),
    );
    const outcome = await verifyCredential(store, verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("INVALID_SIGNATURE");
  });

  test("a swapped subject WebID invalidates the signature", async () => {
    const store = parseTurtle(
      issued.body.replaceAll(SUBJECT, "https://mallory.example/profile/card#me"),
    );
    const outcome = await verifyCredential(store, verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("INVALID_SIGNATURE");
  });

  test("a swapped issuer fails the signature AND strands the status list", async () => {
    // replaceAll also rewrites the verificationMethod prefix, so issuer
    // binding passes vacuously - the signature (issuer IRI is signed) and the
    // status trust anchor (list signed by the REAL issuer) both still fail.
    const store = parseTurtle(issued.body.replaceAll(ISSUER, "https://mallory.example/org"));
    const outcome = await verifyCredential(store, verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toEqual(
      expect.arrayContaining(["INVALID_SIGNATURE", "STATUS_UNREACHABLE"]),
    );
  });

  test("a transplanted proof from another credential does not verify", async () => {
    const donor = await issueCredential({
      kind: "employment-income-credential",
      credentialId: "https://alex.example/credentials/other-income",
      issuer: ISSUER,
      subject: SUBJECT,
      claims: employmentClaims({ monthlyGrossIncomeUsd: 9900 }),
      validity: BACKDATED_VALIDITY,
      status: list.entry(3),
      key: await issuerKey(),
    });
    const store = parseTurtle(issued.body);
    const credential = namedNode(CREDENTIAL_ID);
    // Strip the genuine proof subgraph...
    const proofObjects: Quad_Object[] = [];
    for (const link of store.match(credential, namedNode(SEC_PROOF))) {
      proofObjects.push(link.object);
      store.delete(link);
    }
    for (const proofTerm of proofObjects) {
      for (const found of store.match(proofTerm as Quad_Subject)) store.delete(found);
    }
    // ...and graft the donor's proof onto this credential.
    const donorStore = parseTurtle(donor.body);
    for (const link of donorStore.match(namedNode(donor.credentialId), namedNode(SEC_PROOF))) {
      store.add(quad(credential, namedNode(SEC_PROOF), link.object));
      for (const found of donorStore.match(link.object as Quad_Subject)) store.add(found);
    }
    const outcome = await verifyCredential(store, verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("INVALID_SIGNATURE");
  });
});

describe("proof-node hardening", () => {
  test("a stripped proof is NO_PROOF", async () => {
    const store = parseTurtle(issued.body);
    const credential = namedNode(CREDENTIAL_ID);
    const proofObjects: Quad_Object[] = [];
    for (const link of store.match(credential, namedNode(SEC_PROOF))) {
      proofObjects.push(link.object);
      store.delete(link);
    }
    for (const proofTerm of proofObjects) {
      for (const found of store.match(proofTerm as Quad_Subject)) store.delete(found);
    }
    const outcome = await verifyCredential(store, verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("NO_PROOF");
  });

  test("unsigned data smuggled onto the proof node is refused (MALFORMED)", async () => {
    const store = parseTurtle(issued.body);
    const [link] = [...store.match(namedNode(CREDENTIAL_ID), namedNode(SEC_PROOF))];
    store.add(
      quad(
        link?.object as Quad_Subject,
        namedNode(MORT_INCOME),
        literal("99999", namedNode(XSD_INTEGER)),
      ),
    );
    const outcome = await verifyCredential(store, verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("MALFORMED");
  });

  test("an unknown cryptosuite fails closed", async () => {
    const store = parseTurtle(issued.body.replace("eddsa-rdfc-2022", "quantum-magic-2099"));
    const outcome = await verifyCredential(store, verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("UNKNOWN_CRYPTOSUITE");
  });

  test("a wrong proof purpose is rejected", async () => {
    const store = parseTurtle(issued.body.replace("sec:assertionMethod", "sec:authentication"));
    const outcome = await verifyCredential(store, verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("PROOF_PURPOSE_MISMATCH");
  });

  test("an extra rdf:type on the proof node is refused (unsigned data)", async () => {
    const store = parseTurtle(issued.body);
    const [link] = [...store.match(namedNode(CREDENTIAL_ID), namedNode(SEC_PROOF))];
    store.add(
      quad(
        link?.object as Quad_Subject,
        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        namedNode("https://schema.org/Thing"),
      ),
    );
    const outcome = await verifyCredential(store, verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("MALFORMED");
  });

  test("a language-tagged proofValue is refused (strict plain literal)", async () => {
    const store = parseTurtle(issued.body);
    const [link] = [...store.match(namedNode(CREDENTIAL_ID), namedNode(SEC_PROOF))];
    const proofNode = link?.object as Quad_Subject;
    const valuePredicate = namedNode("https://w3id.org/security#proofValue");
    const [valueQuad] = [...store.match(proofNode, valuePredicate)];
    if (valueQuad === undefined) throw new Error("no proofValue quad");
    store.delete(valueQuad);
    store.add(quad(proofNode, valuePredicate, literal(valueQuad.object.value, "en")));
    const outcome = await verifyCredential(store, verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("MALFORMED");
  });

  test("a created timestamp with the wrong datatype is refused", async () => {
    const store = parseTurtle(issued.body);
    const [link] = [...store.match(namedNode(CREDENTIAL_ID), namedNode(SEC_PROOF))];
    const proofNode = link?.object as Quad_Subject;
    const createdPredicate = namedNode("http://purl.org/dc/terms/created");
    const [createdQuad] = [...store.match(proofNode, createdPredicate)];
    if (createdQuad === undefined) throw new Error("no created quad");
    store.delete(createdQuad);
    store.add(quad(proofNode, createdPredicate, literal(createdQuad.object.value)));
    const outcome = await verifyCredential(store, verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("MALFORMED");
  });

  test("a LITERAL-valued rdf:type on the proof node is refused (value spoof)", async () => {
    const store = parseTurtle(issued.body);
    const [link] = [...store.match(namedNode(CREDENTIAL_ID), namedNode(SEC_PROOF))];
    const proofNode = link?.object as Quad_Subject;
    const typePredicate = namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
    const [typeQuad] = [...store.match(proofNode, typePredicate)];
    if (typeQuad === undefined) throw new Error("no proof type quad");
    store.delete(typeQuad);
    store.add(quad(proofNode, typePredicate, literal(typeQuad.object.value)));
    const outcome = await verifyCredential(store, verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("MALFORMED");
  });

  test("a created timestamp with an impossible calendar date is refused", async () => {
    const store = parseTurtle(issued.body);
    const [link] = [...store.match(namedNode(CREDENTIAL_ID), namedNode(SEC_PROOF))];
    const proofNode = link?.object as Quad_Subject;
    const createdPredicate = namedNode("http://purl.org/dc/terms/created");
    const [createdQuad] = [...store.match(proofNode, createdPredicate)];
    if (createdQuad === undefined) throw new Error("no created quad");
    store.delete(createdQuad);
    store.add(
      quad(
        proofNode,
        createdPredicate,
        literal("2026-02-30T00:00:00.000Z", namedNode("http://www.w3.org/2001/XMLSchema#dateTime")),
      ),
    );
    const outcome = await verifyCredential(store, verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("MALFORMED");
  });

  test("a duplicated cryptosuite on the proof node is MALFORMED", async () => {
    const store = parseTurtle(issued.body);
    const [link] = [...store.match(namedNode(CREDENTIAL_ID), namedNode(SEC_PROOF))];
    store.add(
      quad(
        link?.object as Quad_Subject,
        namedNode("https://w3id.org/security#cryptosuite"),
        literal("ecdsa-rdfc-2019"),
      ),
    );
    const outcome = await verifyCredential(store, verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("MALFORMED");
  });

  test("an unresolvable verification method fails the signature (resolveKey undefined)", async () => {
    const outcome = await verifyCredential(
      issued.body,
      verifyOptions({ resolveKey: async () => undefined }),
    );
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("INVALID_SIGNATURE");
  });

  test("a throwing isControlledBy fails closed as ISSUER_MISMATCH", async () => {
    const outcome = await verifyCredential(
      issued.body,
      verifyOptions({
        isControlledBy: () => {
          throw new Error("resolver exploded");
        },
      }),
    );
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("ISSUER_MISMATCH");
  });

  test("a foreign-origin verification method fails the default control heuristic", async () => {
    const outcome = await verifyCredential(
      issued.body,
      verifyOptions({ isControlledBy: undefined }),
    );
    // Default heuristic PASSES here (key is issuer#key-1)...
    expect(outcome.verified).toBe(true);
    const foreign = parseTurtle(
      issued.body.replace("https://issuer.example/org#key-1", "https://evil.example/keys#k"),
    );
    const foreignOutcome = await verifyCredential(foreign, verifyOptions());
    // ...and a foreign key id fails BOTH binding and signature.
    expect(foreignOutcome.verified).toBe(false);
    expect(codesOf(foreignOutcome)).toEqual(
      expect.arrayContaining(["ISSUER_MISMATCH", "INVALID_SIGNATURE"]),
    );
  });
});

describe("structural + shape gates", () => {
  test("a second VerifiableCredential node is ambiguous - MALFORMED", async () => {
    const store = parseTurtle(issued.body);
    store.add(
      quad(
        namedNode("https://mallory.example/credentials/decoy"),
        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        namedNode("https://www.w3.org/2018/credentials#VerifiableCredential"),
      ),
    );
    const outcome = await verifyCredential(store, verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("MALFORMED");
  });

  test("the wrong expectShape fails the shape gate", async () => {
    const outcome = await verifyCredential(
      issued.body,
      verifyOptions({ expectShape: "credit-score-credential" }),
    );
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("SHAPE_VIOLATION");
  });

  test("an undisclosed extra subject property fails the closed shape AND the signature", async () => {
    const store = parseTurtle(issued.body);
    store.add(
      quad(
        namedNode(SUBJECT),
        namedNode("https://schema.org/baseSalary"),
        literal("102000", namedNode(XSD_INTEGER)),
      ),
    );
    const outcome = await verifyCredential(store, verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toEqual(
      expect.arrayContaining(["SHAPE_VIOLATION", "INVALID_SIGNATURE"]),
    );
  });

  test("unparseable Turtle is MALFORMED", async () => {
    const outcome = await verifyCredential("this is not turtle @@@", verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("MALFORMED");
  });

  test("an untrusted issuer is rejected when an allowlist is supplied", async () => {
    const outcome = await verifyCredential(
      issued.body,
      verifyOptions({ trustedIssuers: ["https://lender.example/org"] }),
    );
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("UNTRUSTED_ISSUER");
  });
});

describe("validity window (explicit now)", () => {
  test("EXPIRED after validUntil", async () => {
    const outcome = await verifyCredential(
      issued.body,
      verifyOptions({ now: new Date(NOW.getTime() + 15 * DAY_MS) }),
    );
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("EXPIRED");
  });

  test("NOT_YET_VALID before validFrom", async () => {
    const outcome = await verifyCredential(
      issued.body,
      verifyOptions({ now: new Date(NOW.getTime() - 31 * DAY_MS) }),
    );
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("NOT_YET_VALID");
  });
});

describe("status gate (fail-closed)", () => {
  test("revocation flips verification to STATUS_REVOKED", async () => {
    const revocable = await issueEmployment(list, 99);
    await list.revoke(99, { now: NOW });
    const outcome = await verifyCredential(revocable.body, verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("STATUS_REVOKED");
    await list.reinstate(99, { now: NOW });
  });

  test("an unreachable status list is a verification FAILURE, never a pass", async () => {
    const stranded = await issueCredential({
      kind: "employment-income-credential",
      credentialId: CREDENTIAL_ID,
      issuer: ISSUER,
      subject: SUBJECT,
      claims: employmentClaims(),
      validity: BACKDATED_VALIDITY,
      status: {
        statusPurpose: "revocation",
        statusListIndex: 5,
        statusListCredential: "https://issuer.example/status/does-not-exist",
      },
      key: await issuerKey(),
    });
    const outcome = await verifyCredential(stranded.body, verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("STATUS_UNREACHABLE");
  });

  test("a THROWING status fetch is STATUS_UNREACHABLE", async () => {
    const outcome = await verifyCredential(
      issued.body,
      verifyOptions({
        statusFetch: async () => {
          throw new Error("network down");
        },
      }),
    );
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("STATUS_UNREACHABLE");
  });

  test("a malformed status entry in the graph fails closed (never 'absent')", async () => {
    const store = parseTurtle(issued.body);
    // Point credentialStatus at a node with no Bitstring structure.
    const credential = namedNode(CREDENTIAL_ID);
    for (const link of store.match(credential, namedNode(CRED_STATUS))) store.delete(link);
    store.add(quad(credential, namedNode(CRED_STATUS), blankNode()));
    const outcome = await verifyCredential(store, verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("STATUS_UNREACHABLE");
  });

  test("a stripped status entry fails the shape (minCount) and the signature", async () => {
    const store = parseTurtle(issued.body);
    const credential = namedNode(CREDENTIAL_ID);
    const entryTerms: Quad_Object[] = [];
    for (const link of store.match(credential, namedNode(CRED_STATUS))) {
      entryTerms.push(link.object);
      store.delete(link);
    }
    for (const entryTerm of entryTerms) {
      for (const found of store.match(entryTerm as Quad_Subject)) store.delete(found);
    }
    const outcome = await verifyCredential(store, verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toEqual(
      expect.arrayContaining(["SHAPE_VIOLATION", "INVALID_SIGNATURE"]),
    );
  });

  test("checkCredentialStatus resolves valid / revoked / unreachable", async () => {
    const statusOptions = {
      now: NOW,
      resolveKey: resolveIssuerKey,
      statusFetch: host.fetch,
    };
    expect((await checkCredentialStatus(issued.body, statusOptions)).status).toBe("valid");
    const revocable = await issueEmployment(list, 101);
    await list.revoke(101, { now: NOW });
    expect((await checkCredentialStatus(revocable.body, statusOptions)).status).toBe("revoked");
    expect((await checkCredentialStatus("not turtle @@@", statusOptions)).status).toBe(
      "unreachable",
    );
  });
});
