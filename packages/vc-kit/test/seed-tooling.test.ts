/**
 * sm-26 - unit coverage of the seed-tooling plumbing over an INJECTED native
 * bridge (the real helper needs cargo + a sparq checkout; the canned results
 * here were captured from it - fixtures/PROVENANCE.json). The native path
 * itself is exercised by seed-tooling-native.test.ts and capture:fixtures.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MORT } from "@mortgage/data-model";
import { describe, expect, it } from "vitest";
import { verifyCredential } from "../src/index.js";
import type {
  SeedWitnessDocument,
  SparqAttestation,
  SparqNativeBridge,
  SparqSeedJob,
  SparqSeedResult,
} from "../src/seed-tooling/index.js";
import {
  claimGraphToNTriples,
  DEMO_ZK_STATUS,
  deriveFieldHex,
  fixtureIndexBlindingHex,
  fixtureSaltHex,
  mintOperandAnchors,
  readHiddenFieldValues,
  SeedToolingError,
  SparqCredentialSeedPipeline,
} from "../src/seed-tooling/index.js";
import {
  BACKDATED_VALIDITY,
  CREDENTIAL_ID,
  creditScoreClaims,
  employmentClaims,
  hostedStatusList,
  ISSUER,
  issueEmployment,
  issuerKey,
  NOW,
  resolveIssuerKey,
  SUBJECT,
  stubHost,
} from "./support.js";
import { encOf } from "./zk-support.js";

const fixture = (name: string) =>
  JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", name), "utf8"));

/** A canned bridge: real captured encodings + attestations, no subprocess. */
function stubBridge(): { bridge: SparqNativeBridge; jobs: SparqSeedJob[] } {
  const encodings = (fixture("operand-enc.json") as { encodings: Record<string, string> })
    .encodings;
  const attestation = (
    fixture("dual-sign-attestations.json") as {
      credentials: { employment: { attestation: SparqAttestation } };
    }
  ).credentials.employment.attestation;
  const jobs: SparqSeedJob[] = [];
  const bridge: SparqNativeBridge = {
    run(job: SparqSeedJob): Promise<SparqSeedResult> {
      jobs.push(job);
      const attestations: Record<string, SparqAttestation> = {};
      for (const credential of job.credentials ?? []) {
        attestations[credential.name] = attestation;
      }
      return Promise.resolve({
        encodings: Object.fromEntries(
          (job.encodeInts ?? []).map((value) => {
            const enc = encodings[String(value)];
            if (enc === undefined) throw new Error(`no canned encoding for ${value}`);
            return [String(value), enc];
          }),
        ),
        attestations,
      });
    },
  };
  return { bridge, jobs };
}

describe("readHiddenFieldValues", () => {
  it("reads the exact wrapper-emitted integer literals", async () => {
    const host = stubHost();
    const list = await hostedStatusList(host);
    const credential = await issueEmployment(list);
    const values = readHiddenFieldValues(credential, [MORT.monthlyGrossIncomeUsd], SUBJECT);
    expect(values.get(MORT.monthlyGrossIncomeUsd)).toBe(8500);
  });

  it("rejects fields outside the decision-0005 budget table", async () => {
    const host = stubHost();
    const list = await hostedStatusList(host);
    const credential = await issueEmployment(list);
    expect(() =>
      readHiddenFieldValues(credential, ["https://schema.org/jobTitle"], SUBJECT),
    ).toThrow(SeedToolingError);
  });

  it("rejects a subject with no such claim (fail-closed cardinality)", async () => {
    const host = stubHost();
    const list = await hostedStatusList(host);
    const credential = await issueEmployment(list);
    expect(() =>
      readHiddenFieldValues(
        credential,
        [MORT.monthlyGrossIncomeUsd],
        "https://mallory.example/#me",
      ),
    ).toThrow(/exactly one value/);
  });
});

describe("mintOperandAnchors", () => {
  it("mints an issuer-signed, SHACL-gated anchor VC per hidden field", async () => {
    const host = stubHost();
    const list = await hostedStatusList(host);
    const credential = await issueEmployment(list);
    const { bridge } = stubBridge();
    const anchors = await mintOperandAnchors({
      credential,
      hiddenFields: [MORT.monthlyGrossIncomeUsd],
      subject: SUBJECT,
      issuer: ISSUER,
      anchorIdFor: (field) => `${CREDENTIAL_ID}-anchor-${field.split("#")[1]}`,
      statusFor: () => list.entry(101),
      validity: BACKDATED_VALIDITY,
      key: await issuerKey(),
      native: bridge,
    });
    expect(anchors).toHaveLength(1);
    const anchor = anchors[0];
    expect(anchor?.field).toBe(MORT.monthlyGrossIncomeUsd);
    // The encoding is the ISSUER-side binding of the claim literal (8500).
    expect(anchor?.operandEnc).toBe(encOf(8500));
    // The anchor is a genuine, verifiable eddsa-rdfc-2022 credential.
    const outcome = await verifyCredential(anchor?.credential.body ?? "", {
      expectShape: "zk-operand-anchor",
      now: NOW,
      resolveKey: resolveIssuerKey,
      statusFetch: host.fetch,
    });
    expect(outcome.errors).toEqual([]);
    expect(outcome.verified).toBe(true);
    expect(outcome.credential?.issuer).toBe(ISSUER);
    expect(outcome.credential?.subject).toBe(SUBJECT);
  });
});

describe("SparqCredentialSeedPipeline.issue (seeder-design section 5.2 seam)", () => {
  async function rig() {
    const host = stubHost();
    const list = await hostedStatusList(host);
    const { bridge, jobs } = stubBridge();
    const pipeline = new SparqCredentialSeedPipeline({
      issuer: ISSUER,
      key: await issuerKey(),
      schnorrIssuerSeed: 4101,
      native: bridge,
    });
    return { host, list, bridge, jobs, pipeline };
  }

  it("ONE call materialises the VC + anchors + borrower-only witness", async () => {
    const { host, list, pipeline } = await rig();
    const result = await pipeline.issue({
      kind: "credit-score-credential",
      credentialId: "https://alex.example/credentials/credit-score",
      subjectWebid: SUBJECT,
      claims: creditScoreClaims(),
      validFrom: BACKDATED_VALIDITY.validFrom,
      validUntil: BACKDATED_VALIDITY.validUntil,
      status: list.entry(11),
      hiddenFields: [MORT.creditScoreValue, MORT.totalMonthlyDebtUsd],
      anchorIdFor: (field) =>
        `https://alex.example/credentials/credit-score-anchor-${field.split("#")[1]}`,
      anchorStatusFor: (field) => list.entry(field.endsWith("creditScoreValue") ? 12 : 13),
      zkStatus: DEMO_ZK_STATUS.employment,
    });

    // The credential itself verifies from its serialised pod body.
    const outcome = await verifyCredential(result.vc, {
      expectShape: "credit-score-credential",
      now: NOW,
      resolveKey: resolveIssuerKey,
      statusFetch: host.fetch,
    });
    expect(outcome.errors).toEqual([]);
    expect(outcome.verified).toBe(true);
    expect(result.vcContentType).toBe("text/turtle");

    // One anchor per hidden field, carrying the captured genuine encodings.
    expect(result.anchors.map((anchor) => anchor.field).sort()).toEqual(
      [MORT.creditScoreValue, MORT.totalMonthlyDebtUsd].sort(),
    );
    const scoreAnchor = result.anchors.find((anchor) => anchor.field === MORT.creditScoreValue);
    const debtAnchor = result.anchors.find((anchor) => anchor.field === MORT.totalMonthlyDebtUsd);
    expect(scoreAnchor?.operandEnc).toBe(encOf(742));
    expect(debtAnchor?.operandEnc).toBe(encOf(1180));

    // The witness resource is borrower-only JSON with the dual-sign attestation.
    expect(result.witnessContentType).toBe("application/json");
    const witness = JSON.parse(result.witness ?? "{}") as SeedWitnessDocument;
    expect(witness.type).toBe("urn:sparq:zk:SeedWitness");
    expect(witness.attestation.cryptosuite).toBe("https://sparq.dev/ns/zk#poseidon2-schnorr-v1");
    expect(witness.attestation.commitment).toMatch(/^0x[0-9a-f]{64}$/);
    expect(witness.witness.zkStatus).toEqual(DEMO_ZK_STATUS.employment);
    // The CLEAR index lives ONLY here (the attestation carries a commitment).
    expect(witness.witness.zkStatus.index).toBe(42);
    expect(witness.attestation.status.indexCommitment).toMatch(/^0x[0-9a-f]{64}$/);
    expect(witness.note).toContain("never publish");
  });

  it("refuses hidden fields without anchor wiring", async () => {
    const { list, pipeline } = await rig();
    await expect(
      pipeline.issue({
        kind: "employment-income-credential",
        credentialId: CREDENTIAL_ID,
        subjectWebid: SUBJECT,
        claims: employmentClaims(),
        validFrom: BACKDATED_VALIDITY.validFrom,
        validUntil: BACKDATED_VALIDITY.validUntil,
        status: list.entry(42),
        hiddenFields: [MORT.monthlyGrossIncomeUsd],
        zkStatus: DEMO_ZK_STATUS.employment,
      }),
    ).rejects.toMatchObject({ code: "MISSING_ANCHOR_WIRING" });
  });

  it("refuses anchors without a dual-sign zkStatus (decision 0004)", async () => {
    const { list, pipeline } = await rig();
    await expect(
      pipeline.issue({
        kind: "employment-income-credential",
        credentialId: CREDENTIAL_ID,
        subjectWebid: SUBJECT,
        claims: employmentClaims(),
        validFrom: BACKDATED_VALIDITY.validFrom,
        validUntil: BACKDATED_VALIDITY.validUntil,
        status: list.entry(42),
        hiddenFields: [MORT.monthlyGrossIncomeUsd],
        anchorIdFor: () => `${CREDENTIAL_ID}-anchor`,
        anchorStatusFor: () => list.entry(43),
      }),
    ).rejects.toMatchObject({ code: "MISSING_ZK_STATUS" });
  });

  it("uses fresh OS entropy for salts/blindings by DEFAULT (roborev 5557)", async () => {
    const { list, jobs, pipeline } = await rig();
    const input = () => ({
      kind: "employment-income-credential" as const,
      credentialId: CREDENTIAL_ID,
      subjectWebid: SUBJECT,
      claims: employmentClaims(),
      validFrom: BACKDATED_VALIDITY.validFrom,
      validUntil: BACKDATED_VALIDITY.validUntil,
      status: list.entry(42),
      zkStatus: DEMO_ZK_STATUS.employment,
    });
    await pipeline.issue(input());
    await pipeline.issue(input());
    const sent = jobs
      .filter((job) => (job.credentials ?? []).length > 0)
      .map((job) => job.credentials?.[0]);
    expect(sent).toHaveLength(2);
    // Two identical issues must NOT share salt or blinding - a public-label
    // blinding would let anyone de-hide the <=1024-entry index commitment.
    expect(sent[0]?.saltHex).not.toBe(sent[1]?.saltHex);
    expect(sent[0]?.status.indexBlindingHex).not.toBe(sent[1]?.status.indexBlindingHex);
    // And neither equals the PUBLIC fixture derivation.
    expect(sent[0]?.saltHex).not.toBe(fixtureSaltHex(CREDENTIAL_ID));
    expect(sent[0]?.status.indexBlindingHex).not.toBe(
      fixtureIndexBlindingHex(DEMO_ZK_STATUS.employment),
    );
  });

  it("deterministicFixtureMode is the EXPLICIT opt-in for byte-stable captures", async () => {
    const host = stubHost();
    const list = await hostedStatusList(host);
    const { bridge, jobs } = stubBridge();
    const pipeline = new SparqCredentialSeedPipeline({
      issuer: ISSUER,
      key: await issuerKey(),
      schnorrIssuerSeed: 4101,
      native: bridge,
      deterministicFixtureMode: true,
    });
    await pipeline.issue({
      kind: "employment-income-credential",
      credentialId: CREDENTIAL_ID,
      subjectWebid: SUBJECT,
      claims: employmentClaims(),
      validFrom: BACKDATED_VALIDITY.validFrom,
      validUntil: BACKDATED_VALIDITY.validUntil,
      status: list.entry(42),
      zkStatus: DEMO_ZK_STATUS.employment,
    });
    const sent = jobs.find((job) => (job.credentials ?? []).length > 0)?.credentials?.[0];
    expect(sent?.saltHex).toBe(fixtureSaltHex(CREDENTIAL_ID));
    expect(sent?.status.indexBlindingHex).toBe(fixtureIndexBlindingHex(DEMO_ZK_STATUS.employment));
  });

  it("rejects an invalid Schnorr seed at CONSTRUCTION (roborev 5560/5564)", async () => {
    const { bridge, jobs } = stubBridge();
    // 1e100 passes Number.isInteger but not u64 deserialization - it must be
    // rejected HERE, not after a credential has been signed.
    for (const bad of [-1, 1.5, Number.NaN, 1e100, Number.MAX_SAFE_INTEGER + 1]) {
      expect(
        () =>
          new SparqCredentialSeedPipeline({
            issuer: ISSUER,
            key: undefined as unknown as Awaited<ReturnType<typeof issuerKey>>,
            schnorrIssuerSeed: bad,
            native: bridge,
          }),
      ).toThrow(SeedToolingError);
    }
    // Nothing was signed or sent to the native bridge.
    expect(jobs).toHaveLength(0);
  });

  it("snapshots its configuration - post-construction mutation is inert", async () => {
    const host = stubHost();
    const list = await hostedStatusList(host);
    const { bridge, jobs } = stubBridge();
    const mutable = {
      issuer: ISSUER,
      key: await issuerKey(),
      schnorrIssuerSeed: 4101,
      native: bridge,
    };
    const pipeline = new SparqCredentialSeedPipeline(mutable);
    mutable.schnorrIssuerSeed = -999; // must not reach the validated snapshot
    await pipeline.issue({
      kind: "employment-income-credential",
      credentialId: CREDENTIAL_ID,
      subjectWebid: SUBJECT,
      claims: employmentClaims(),
      validFrom: BACKDATED_VALIDITY.validFrom,
      validUntil: BACKDATED_VALIDITY.validUntil,
      status: list.entry(42),
      zkStatus: DEMO_ZK_STATUS.employment,
    });
    const sent = jobs.find((job) => (job.credentials ?? []).length > 0)?.credentials?.[0];
    expect(sent?.issuerSeed).toBe(4101);
  });

  it("rejects a half-configured call BEFORE issuing or signing anything", async () => {
    const { jobs, pipeline } = await rig();
    let statusCallbackHits = 0;
    await expect(
      pipeline.issue({
        kind: "employment-income-credential",
        credentialId: CREDENTIAL_ID,
        subjectWebid: SUBJECT,
        claims: employmentClaims(),
        validFrom: BACKDATED_VALIDITY.validFrom,
        validUntil: BACKDATED_VALIDITY.validUntil,
        hiddenFields: [MORT.monthlyGrossIncomeUsd],
        anchorIdFor: () => `${CREDENTIAL_ID}-anchor`,
        anchorStatusFor: () => {
          statusCallbackHits += 1;
          throw new Error("must not be invoked on a rejected call");
        },
      }),
    ).rejects.toMatchObject({ code: "MISSING_ZK_STATUS" });
    // Nothing was signed, encoded, or dual-signed (roborev 5556 ordering).
    expect(statusCallbackHits).toBe(0);
    expect(jobs).toHaveLength(0);
  });

  it("sends the claim graph to the native bridge as parseable N-Triples", async () => {
    const { list, jobs, pipeline } = await rig();
    await pipeline.issue({
      kind: "employment-income-credential",
      credentialId: CREDENTIAL_ID,
      subjectWebid: SUBJECT,
      claims: employmentClaims(),
      validFrom: BACKDATED_VALIDITY.validFrom,
      validUntil: BACKDATED_VALIDITY.validUntil,
      status: list.entry(42),
      zkStatus: DEMO_ZK_STATUS.employment,
    });
    const dualSignJob = jobs.find((job) => (job.credentials ?? []).length > 0);
    const ntriples = dualSignJob?.credentials?.[0]?.ntriples ?? "";
    expect(ntriples).toContain(`<${CREDENTIAL_ID}>`);
    expect(ntriples).toContain('"8500"^^<http://www.w3.org/2001/XMLSchema#integer>');
    // Every line is a triple terminated with " ." - oxttl-parseable N-Triples.
    for (const line of ntriples.split("\n").filter((entry) => entry.trim().length > 0)) {
      expect(line.endsWith(" .")).toBe(true);
    }
  });
});

describe("claimGraphToNTriples + deriveFieldHex", () => {
  it("rejects an empty claim graph", () => {
    expect(() => claimGraphToNTriples([])).toThrow(/empty claim graph/);
  });

  it("derives deterministic, field-shaped fixture values", () => {
    const first = deriveFieldHex("sm-26 test label");
    expect(first).toMatch(/^0x[0-9a-f]{64}$/);
    expect(deriveFieldHex("sm-26 test label")).toBe(first);
    expect(deriveFieldHex("another label")).not.toBe(first);
    // 31-byte construction: always below the BN254 modulus.
    expect(BigInt(first) < 2n ** 248n).toBe(true);
  });
});
