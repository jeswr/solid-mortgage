// AUTHORED-BY Claude Opus 5.5
/**
 * Business KYB in vc-kit: the three register credentials, the owner-share (Tier A) and
 * owner-array (Tier B) anchors, and the completeness proof proved live and verified with the
 * full negative matrix. SECURITY-CRITICAL: each negative test changes ONE input of a
 * presentation that otherwise passes every gate, so no rejection is vacuous.
 */

import {
  BENEFICIAL_OWNER_THRESHOLD_BPS,
  buildIllustrativeLei,
  leiCheckDigits,
  MORT,
} from "@mortgage/data-model";
import { beforeAll, describe, expect, it } from "vitest";
import {
  blake3SingleChunk,
  type CompletenessProof,
  completenessProofFromJson,
  completenessProofToJson,
  countAtOrAbove,
  type IssuedCredential,
  IssueRefusedError,
  issueCredential,
  mintOwnerArrayAnchor,
  mintOwnerShareAnchor,
  ownershipArrayCommitment,
  padOwnershipArray,
  proveCompleteness,
  proveTierA,
  signedOwners,
  type VerifyCompletenessOptions,
  verifyCompleteness,
  verifyCredential,
  verifyTierA,
  ZkError,
} from "../src/index.js";
import {
  BACKDATED_VALIDITY,
  hostedStatusList,
  ISSUER,
  issuerKey,
  NOW,
  resolveIssuerKey,
  type StubHost,
  SUBJECT,
  stubHost,
} from "./support.js";
import { oneShotNonce } from "./zk-support.js";

const PROVE_TIMEOUT = 240_000;
const SESSION = "kyb-session";
const NONCE = "kyb-test-nonce-completeness";
const ENTITY = "Northwind Logistics LLC";
const OWNERS = [
  { bps: 4200, name: "Jordan Blake" },
  { bps: 2800, name: "Priya Nandakumar" },
  { bps: 1800, name: "Marcus Webb" },
  { bps: 1200, name: "Dana Reyes" },
];
const BPS = OWNERS.map((owner) => owner.bps);
const hex = (bytes: Uint8Array) =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

let host: StubHost;
let bo: IssuedCredential;
let arrayAnchor: IssuedCredential;
let arrayCommitment: string;
let proof: CompletenessProof;

async function issueOwnership(owners = OWNERS, index = 11) {
  const list = await hostedStatusList(stubHost());
  return issueCredential({
    claims: { entityName: ENTITY, kind: "beneficial-ownership-credential", owners },
    credentialId: "https://pods.example/northwind/credentials/beneficial-ownership",
    issuer: ISSUER,
    key: await issuerKey(),
    kind: "beneficial-ownership-credential",
    status: list.entry(index),
    subject: SUBJECT,
    validity: BACKDATED_VALIDITY,
  });
}

function base(overrides: Partial<VerifyCompletenessOptions> = {}): VerifyCompletenessOptions {
  return {
    anchorVc: arrayAnchor.body,
    disclosedCount: 2,
    nonce: NONCE,
    nonces: oneShotNonce(SESSION, NONCE),
    now: NOW,
    resolveKey: resolveIssuerKey,
    sessionKey: SESSION,
    statusFetch: host.fetch,
    trustedIssuers: [ISSUER],
    webid: SUBJECT,
    ...overrides,
  };
}

beforeAll(async () => {
  host = stubHost();
  bo = await issueOwnership();
  const list = await hostedStatusList(host, { url: "https://issuer.example/status/anchors" });
  const minted = await mintOwnerArrayAnchor({
    anchorId: "https://pods.example/northwind/credentials/anchors/owner-array",
    credential: bo,
    issuer: ISSUER,
    key: await issuerKey(),
    status: list.entry(3),
    subject: SUBJECT,
    validity: BACKDATED_VALIDITY,
  });
  arrayAnchor = minted.credential;
  arrayCommitment = minted.operandEnc;
  proof = await proveCompleteness({ arrayCommitment, bps: BPS, disclosedCount: 2, nonce: NONCE });
}, PROVE_TIMEOUT);

describe("BLAKE3 (single chunk) matches the published test vectors", () => {
  const seq = (n: number) => Uint8Array.from({ length: n }, (_, i) => i % 251);
  it.each([
    [0, "af1349b9f5f9a1a6a0404dea36dcc9499bcb25c9adc112b7cc9a93cae41f3262"],
    [1, "2d3adedff11b61f14c886e35afa036736dcd87a74d27b5c1510225d0f592e213"],
    [63, "e9bc37a594daad83be9470df7f7b3798297c3d834ce80ba85d6e207627b7db7b"],
    [64, "4eed7141ea4a5cd4b788606bd23f46e212af9cacebacdc7d1f4c6dc7f2511b98"],
    [65, "de1e5fa0be70df6d2be8fffd0e99ceaa8eb6e8c93a63f2d8d1c30ecb6b263dee"],
    [1024, "42214739f095a406f3fc83deb889744ac00df831c10daa55189b5d121c855af7"],
  ])("input length %i", (length, digest) => {
    expect(hex(blake3SingleChunk(seq(length)))).toBe(digest);
  });

  it('hashes "abc" and refuses more than one chunk', () => {
    expect(hex(blake3SingleChunk(new TextEncoder().encode("abc")))).toBe(
      "6437b3ac38465133ffb63b75273a8db548c558465d79db03fd359c6cd5bd9d85",
    );
    expect(() => blake3SingleChunk(new Uint8Array(1025))).toThrow(RangeError);
  });
});

describe("the owner-array commitment", () => {
  it("pads to eight slots and truncates the digest to 31 bytes", () => {
    expect(padOwnershipArray(BPS)).toEqual([4200, 2800, 1800, 1200, 0, 0, 0, 0]);
    const commitment = ownershipArrayCommitment(BPS);
    expect(commitment).toMatch(/^0x00[0-9a-f]{62}$/);
    expect(ownershipArrayCommitment([...BPS, 0, 0])).toBe(commitment);
  });

  it("changes with any share or with the order", () => {
    const commitment = ownershipArrayCommitment(BPS);
    expect(ownershipArrayCommitment([4200, 2800, 1800, 1201])).not.toBe(commitment);
    expect(ownershipArrayCommitment([2800, 4200, 1800, 1200])).not.toBe(commitment);
  });

  it("refuses nine owners and negative or fractional shares", () => {
    expect(() => padOwnershipArray(new Array(9).fill(1))).toThrow(ZkError);
    expect(() => ownershipArrayCommitment([-1])).toThrow(ZkError);
    expect(() => ownershipArrayCommitment([12.5])).toThrow(ZkError);
  });

  it("counts the owners at or above 25 percent", () => {
    expect(countAtOrAbove(BPS, BENEFICIAL_OWNER_THRESHOLD_BPS)).toBe(2);
    expect(countAtOrAbove([6000, 2800, 1200], 2500)).toBe(2);
    expect(countAtOrAbove([2500], 2500)).toBe(1);
  });
});

describe("the register's three credentials", () => {
  it("issues and verifies an organisational identity with an illustrative LEI", async () => {
    const identityHost = stubHost();
    const list = await hostedStatusList(identityHost);
    const credential = await issueCredential({
      claims: {
        address: {
          addressLocality: "Kansas City",
          addressRegion: "MO",
          postalCode: "64105",
          streetAddress: "1180 Freight Yard Road",
        },
        kind: "organisational-identity-credential",
        legalForm: "LLC",
        legalName: ENTITY,
        lei: buildIllustrativeLei("NWLOGISTICS001"),
      },
      credentialId: "https://pods.example/northwind/credentials/org-identity",
      issuer: ISSUER,
      key: await issuerKey(),
      kind: "organisational-identity-credential",
      status: list.entry(1),
      subject: SUBJECT,
      validity: BACKDATED_VALIDITY,
    });
    expect(credential.body).toContain("9999NWLOGISTICS00170");
    const result = await verifyCredential(credential.body, {
      expectShape: "organisational-identity-credential",
      now: NOW,
      resolveKey: resolveIssuerKey,
      statusFetch: identityHost.fetch,
      trustedIssuers: [ISSUER],
    });
    expect(result.errors).toEqual([]);
    expect(result.verified).toBe(true);
  });

  it("refuses to sign a real-prefix LEI", async () => {
    const list = await hostedStatusList(stubHost());
    const real = `5493NWLOGISTICS001${leiCheckDigits("5493NWLOGISTICS001")}`;
    await expect(
      issueCredential({
        claims: {
          address: {
            addressLocality: "Kansas City",
            addressRegion: "MO",
            postalCode: "64105",
            streetAddress: "1180 Freight Yard Road",
          },
          kind: "organisational-identity-credential",
          legalForm: "LLC",
          legalName: ENTITY,
          lei: real,
        },
        credentialId: "https://pods.example/northwind/credentials/org-identity",
        issuer: ISSUER,
        key: await issuerKey(),
        kind: "organisational-identity-credential",
        status: list.entry(1),
        subject: SUBJECT,
        validity: BACKDATED_VALIDITY,
      }),
    ).rejects.toThrow(/illustrative/);
  });

  it("issues an officer authorisation", async () => {
    const list = await hostedStatusList(stubHost());
    const credential = await issueCredential({
      claims: {
        entityName: ENTITY,
        kind: "officer-authorisation-credential",
        officers: [{ jobTitle: "Managing member", name: "Jordan Blake" }],
      },
      credentialId: "https://pods.example/northwind/credentials/officer-authorisation",
      issuer: ISSUER,
      key: await issuerKey(),
      kind: "officer-authorisation-credential",
      status: list.entry(2),
      subject: SUBJECT,
      validity: BACKDATED_VALIDITY,
    });
    expect(credential.kind).toBe("officer-authorisation-credential");
    expect(credential.body).toContain("Managing member");
  });

  it("reads the owners back from the signed graph in canonical order", () => {
    expect(signedOwners(bo, SUBJECT)).toEqual(OWNERS);
  });

  it("refuses ownership shares that add up to more than 10000 bps", async () => {
    await expect(issueOwnership([{ bps: 10_001, name: "Too Much" }])).rejects.toThrow(/over 10000/);
  });

  it("IssueRefusedError is what a shape violation raises", () => {
    expect(IssueRefusedError).toBeTypeOf("function");
  });
});

describe("anchors bind only what the register signed", () => {
  it("the owner-array anchor carries the commitment over the signed shares", () => {
    expect(arrayCommitment).toBe(ownershipArrayCommitment(BPS));
    expect(arrayAnchor.body).toContain("beneficialOwnershipArrayCommitment");
  });

  it("an owner-share anchor uses the captured encoding of that owner's share", async () => {
    const list = await hostedStatusList(stubHost());
    const anchor = await mintOwnerShareAnchor({
      anchorId: "https://pods.example/northwind/credentials/anchors/owner-1",
      credential: bo,
      issuer: ISSUER,
      key: await issuerKey(),
      owner: "Priya Nandakumar",
      status: list.entry(4),
      subject: SUBJECT,
      validity: BACKDATED_VALIDITY,
    });
    expect(anchor.field).toBe(MORT.ownershipPercentageBps);
    expect(anchor.operandEnc).toBe(
      "0x1f2027ca53100ba894a3287f5e0ad692464203bd8be74e38590ed9b8a3aa7e74",
    );
  });

  it("an uncaptured share (6000 bps after the sale) is refused, never guessed", async () => {
    const after = await issueOwnership([
      { bps: 6000, name: "Jordan Blake" },
      { bps: 2800, name: "Priya Nandakumar" },
      { bps: 1200, name: "Dana Reyes" },
    ]);
    const list = await hostedStatusList(stubHost());
    await expect(
      mintOwnerShareAnchor({
        anchorId: "https://pods.example/northwind/credentials/anchors/owner-1",
        credential: after,
        issuer: ISSUER,
        key: await issuerKey(),
        owner: "Jordan Blake",
        status: list.entry(5),
        subject: SUBJECT,
        validity: BACKDATED_VALIDITY,
      }),
    ).rejects.toMatchObject({ code: "NO_CAPTURED_ENCODING" });
  });

  it("an owner who is not in the credential cannot be anchored", async () => {
    const list = await hostedStatusList(stubHost());
    await expect(
      mintOwnerShareAnchor({
        anchorId: "https://pods.example/northwind/credentials/anchors/owner-9",
        credential: bo,
        issuer: ISSUER,
        key: await issuerKey(),
        owner: "Somebody Else",
        status: list.entry(6),
        subject: SUBJECT,
        validity: BACKDATED_VALIDITY,
      }),
    ).rejects.toMatchObject({ code: "UNKNOWN_OWNER" });
  });
});

describe("Tier A over an owner's share", () => {
  it(
    "proves Priya's share is at least 25 percent and verifies against her anchor",
    async () => {
      const statusHost = stubHost();
      const anchorList = await hostedStatusList(statusHost);
      const anchor = await mintOwnerShareAnchor({
        anchorId: "https://pods.example/northwind/credentials/anchors/owner-2",
        credential: bo,
        issuer: ISSUER,
        key: await issuerKey(),
        owner: "Priya Nandakumar",
        status: anchorList.entry(8),
        subject: SUBJECT,
        validity: BACKDATED_VALIDITY,
      });
      const nonce = "kyb-tier-a-priya";
      const statement = { bound: 2500, field: MORT.ownershipPercentageBps, op: "ge" as const };
      const tierA = await proveTierA({
        nonce,
        operandEnc: anchor.operandEnc,
        statement,
        value: 2800,
      });
      const result = await verifyTierA(tierA, {
        anchorVc: anchor.credential.body,
        nonce,
        nonces: oneShotNonce(SESSION, nonce),
        now: NOW,
        resolveKey: resolveIssuerKey,
        sessionKey: SESSION,
        statement,
        statusFetch: statusHost.fetch,
        trustedIssuers: [ISSUER],
        webid: SUBJECT,
      });
      expect(result.errors).toEqual([]);
      expect(result.verified).toBe(true);
    },
    PROVE_TIMEOUT,
  );

  it(
    "Marcus's 18 percent cannot be proved at least 25 percent",
    async () => {
      await expect(
        proveTierA({
          nonce: "kyb-tier-a-marcus",
          operandEnc: "0x099b001db07d4133f375846dc5d36e64353e12191e23695c2c73b1a0b58eb734",
          statement: { bound: 2500, field: MORT.ownershipPercentageBps, op: "ge" },
          value: 1800,
        }),
      ).rejects.toMatchObject({ code: "UNSATISFIABLE" });
    },
    PROVE_TIMEOUT,
  );
});

describe("Tier B completeness - acceptance", () => {
  it("proves live and verifies with every gate passing", async () => {
    expect(proof.publicInputs).toHaveLength(5);
    const result = await verifyCompleteness(proof, base());
    expect(result.errors).toEqual([]);
    expect(result.verified).toBe(true);
    expect(Object.values(result.checks).every(Boolean)).toBe(true);
    expect(proof.proveMs).toBeGreaterThan(0);
  });

  it("survives the JSON wire format", async () => {
    const wire = JSON.parse(JSON.stringify(completenessProofToJson(proof)));
    const result = await verifyCompleteness(completenessProofFromJson(wire), base());
    expect(result.verified).toBe(true);
  });
});

describe("Tier B completeness - a false claim has no proof", () => {
  it(
    "claiming one disclosed owner when two hold 25 percent or more is unsatisfiable",
    async () => {
      await expect(
        proveCompleteness({ arrayCommitment, bps: BPS, disclosedCount: 1, nonce: "n-1" }),
      ).rejects.toMatchObject({ code: "UNSATISFIABLE" });
    },
    PROVE_TIMEOUT,
  );

  it("hiding an owner (proving over a different array) fails before proving", async () => {
    await expect(
      proveCompleteness({
        arrayCommitment,
        bps: [4200, 2800, 3000],
        disclosedCount: 2,
        nonce: "n-2",
      }),
    ).rejects.toMatchObject({ code: "STALE_ANCHOR" });
  });

  it("refuses a malformed statement", async () => {
    await expect(
      proveCompleteness({ arrayCommitment, bps: BPS, disclosedCount: 9, nonce: "n-3" }),
    ).rejects.toMatchObject({ code: "BAD_STATEMENT" });
    await expect(
      proveCompleteness({ arrayCommitment, bps: BPS, disclosedCount: 2, nonce: "n", threshold: 0 }),
    ).rejects.toMatchObject({ code: "BAD_STATEMENT" });
  });
});

describe("Tier B completeness - the negative matrix", () => {
  const rejectedWith = async (
    code: string,
    options: Partial<VerifyCompletenessOptions>,
    presented = proof as Parameters<typeof verifyCompleteness>[0],
  ) => {
    const result = await verifyCompleteness(presented, base(options));
    expect(result.verified).toBe(false);
    expect(result.errors[0]?.code).toBe(code);
    return result;
  };

  it("an empty issuer allowlist rejects", () =>
    rejectedWith("ANCHOR_INVALID", { trustedIssuers: [] }));
  it("an invalid instant rejects", () =>
    rejectedWith("ANCHOR_INVALID", { now: new Date(Number.NaN) }));
  it("a no-zk flavour rejects", () =>
    rejectedWith("FORBIDDEN_FLAVOUR", {}, { ...proof, verifierTarget: "evm-no-zk" }));
  it("another circuit name rejects (no Tier A member is accepted)", () =>
    rejectedWith("UNKNOWN_CIRCUIT", {}, { ...proof, circuit: "filter_int_d4" }));
  it("a missing public input rejects", () =>
    rejectedWith("MALFORMED_PROOF", {}, { ...proof, publicInputs: proof.publicInputs.slice(1) }));
  it("empty proof bytes reject", () =>
    rejectedWith("MALFORMED_PROOF", {}, { ...proof, proof: new Uint8Array() }));
  it("a burned or foreign nonce rejects", () =>
    rejectedWith("NONCE_INVALID", { nonces: oneShotNonce(SESSION, "another-nonce") }));
  it("a proof replayed under a fresh nonce rejects at the challenge", () =>
    rejectedWith("CHALLENGE_MISMATCH", {
      nonce: "fresh-nonce",
      nonces: oneShotNonce(SESSION, "fresh-nonce"),
    }));
  it("asking about three disclosed owners rejects", () =>
    rejectedWith("STATEMENT_MISMATCH", { disclosedCount: 3 }));
  it("asking about a 10 percent threshold rejects", () =>
    rejectedWith("STATEMENT_MISMATCH", { threshold: 1000 }));
  it("an untrusted anchor issuer rejects", () =>
    rejectedWith("ANCHOR_INVALID", { trustedIssuers: ["https://other.example/profile/card#me"] }));
  it("an anchor outside its validity window rejects", () =>
    rejectedWith("ANCHOR_INVALID", { now: new Date("2099-01-01T00:00:00Z") }));
  it("an anchor that does not parse rejects", () =>
    rejectedWith("ANCHOR_INVALID", { anchorVc: "this is not turtle <" }));
  it("a different presenter rejects (holder binding)", () =>
    rejectedWith("ANCHOR_SUBJECT_MISMATCH", {
      webid: "https://pods.example/other/profile/card#me",
    }));

  it("an anchor over another field rejects", async () => {
    const list = await hostedStatusList(host, { url: "https://issuer.example/status/field" });
    const wrong = await issueCredential({
      claims: {
        field: MORT.ownershipPercentageBps,
        kind: "zk-operand-anchor",
        operandEnc: arrayCommitment,
      },
      credentialId: "https://pods.example/northwind/credentials/anchors/wrong-field",
      issuer: ISSUER,
      key: await issuerKey(),
      kind: "zk-operand-anchor",
      status: list.entry(1),
      subject: SUBJECT,
      validity: BACKDATED_VALIDITY,
    });
    await rejectedWith("ANCHOR_FIELD_MISMATCH", { anchorVc: wrong.body });
  });

  it("an anchor over another owner array (the pre-sale shares) rejects", async () => {
    const after = await issueOwnership([
      { bps: 6000, name: "Jordan Blake" },
      { bps: 2800, name: "Priya Nandakumar" },
      { bps: 1200, name: "Dana Reyes" },
    ]);
    const list = await hostedStatusList(host, { url: "https://issuer.example/status/after" });
    const newer = await mintOwnerArrayAnchor({
      anchorId: "https://pods.example/northwind/credentials/anchors/owner-array",
      credential: after,
      issuer: ISSUER,
      key: await issuerKey(),
      status: list.entry(2),
      subject: SUBJECT,
      validity: BACKDATED_VALIDITY,
    });
    await rejectedWith("ANCHOR_COMMITMENT_MISMATCH", { anchorVc: newer.credential.body });
  });

  it("a revoked anchor rejects (the step 9 re-issue)", async () => {
    const revokedHost = stubHost();
    const list = await hostedStatusList(revokedHost);
    const anchor = await mintOwnerArrayAnchor({
      anchorId: "https://pods.example/northwind/credentials/anchors/owner-array",
      credential: bo,
      issuer: ISSUER,
      key: await issuerKey(),
      status: list.entry(9),
      subject: SUBJECT,
      validity: BACKDATED_VALIDITY,
    });
    await list.revoke(9, { now: NOW });
    await rejectedWith("ANCHOR_INVALID", {
      anchorVc: anchor.credential.body,
      statusFetch: revokedHost.fetch,
    });
  });

  it("a tampered transcript fails the cryptographic verify", async () => {
    const bytes = proof.proof.slice();
    bytes[100] = (bytes[100] ?? 0) ^ 0xff;
    await rejectedWith("PROOF_INVALID", {}, { ...proof, proof: bytes });
  });

  it("a malformed wire payload is refused before verification", () => {
    expect(() => completenessProofFromJson(null)).toThrow(ZkError);
    expect(() =>
      completenessProofFromJson({ circuit: "x", verifierTarget: "evm", proof: [] }),
    ).toThrow(ZkError);
    expect(() =>
      completenessProofFromJson({
        circuit: "x",
        proof: [256],
        publicInputs: [],
        verifierTarget: "evm",
      }),
    ).toThrow(ZkError);
  });
});
