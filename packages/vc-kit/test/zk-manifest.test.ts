/**
 * Tier B - precomputed ProofManifest verified live (sm-25 deliverable 3).
 * The fixture is a GENUINE sparq capture (fixtures/README.md has provenance);
 * the suite runs a real bb.js verify over its bundled sub-proof against this
 * package's committed circuit, and asserts the fail-closed negatives: byte
 * tamper, unknown member, *-no-zk capture flavour, malformed documents.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  loadCommittedCircuit,
  loadProofManifest,
  parseProofManifest,
  TIER_B_LABEL,
  verifyProofManifest,
  ZkError,
} from "../src/index.js";

const VERIFY_TIMEOUT = 120_000;

let fixtureJson: Record<string, unknown>;

beforeAll(async () => {
  fixtureJson = JSON.parse(
    await readFile(join(import.meta.dirname, "fixtures", "car-hire-manifest.json"), "utf8"),
  );
});

function fixtureCopy(): Record<string, unknown> {
  return structuredClone(fixtureJson);
}

describe("parseProofManifest", () => {
  it("parses the genuine sparq capture", () => {
    const manifest = parseProofManifest(fixtureJson);
    expect(manifest.type).toContain("ProofManifest");
    expect(manifest.subProofs).toHaveLength(1);
    expect(manifest.subProofs[0]?.member).toBe("filter_int_d2");
    expect(manifest.subProofs[0]?.proof.length).toBe(8384);
  });

  it("rejects a manifest that self-declares a *-no-zk capture flavour", () => {
    const doc = fixtureCopy();
    doc.proofOptions = { verifierTarget: "evm-no-zk" };
    expect(() => parseProofManifest(doc)).toThrow(/no-zk|sanctioned/);
  });

  it("rejects malformed documents fail-closed", () => {
    expect(() => parseProofManifest(null)).toThrow(ZkError);
    expect(() => parseProofManifest({})).toThrow(/type marker/);
    const noProofs = fixtureCopy();
    noProofs.subProof = undefined;
    expect(() => parseProofManifest(noProofs)).toThrow(/no sub-proofs/);
    const badBytes = fixtureCopy();
    (badBytes.subProof as Record<string, unknown>).proof = [1, 2, "x"];
    expect(() => parseProofManifest(badBytes)).toThrow(/byte array/);
  });
});

describe("verifyProofManifest", () => {
  it(
    "verifies the captured sub-proof live and carries the MANDATORY label",
    async () => {
      const result = await verifyProofManifest(parseProofManifest(fixtureJson));
      expect(result.subProofs[0]?.verified).toBe(true);
      expect(result.verified).toBe(true);
      // Decision 0012: precomputed manifests are never fresh - the copy is fixed.
      expect(result.label).toBe("proved offline · verified live");
      expect(result.label).toBe(TIER_B_LABEL);
      expect(result.freshness).toBe("precomputed");
      expect(result.capturedAt).toBe(fixtureJson.capturedAt);
    },
    VERIFY_TIMEOUT,
  );

  it(
    "a single flipped proof byte makes the live verify reject",
    async () => {
      const doc = fixtureCopy();
      const bytes = (doc.subProof as { proof: number[] }).proof;
      bytes[200] = (bytes[200] ?? 0) ^ 0x01;
      const result = await verifyProofManifest(parseProofManifest(doc));
      expect(result.verified).toBe(false);
      expect(result.subProofs[0]?.verified).toBe(false);
    },
    VERIFY_TIMEOUT,
  );

  it(
    "a sub-proof with no committed artifact FAILS - never skipped",
    async () => {
      const doc = fixtureCopy();
      (doc.subProof as Record<string, unknown>).member = "join_eq_na16_nb16";
      const result = await verifyProofManifest(parseProofManifest(doc));
      expect(result.verified).toBe(false);
      expect(result.subProofs[0]?.verified).toBe(false);
      expect(result.subProofs[0]?.error).toContain("failing closed");
    },
    VERIFY_TIMEOUT,
  );

  it(
    "app-injected committed artifacts extend the member set",
    async () => {
      // Simulate a consuming app committing a family member this package does
      // not ship: rename the fixture's member and inject the SAME artifact
      // under that name. The proof verifies because artifact and transcript
      // still match.
      const artifact = await loadCommittedCircuit("filter_int_d2");
      const doc = fixtureCopy();
      (doc.subProof as Record<string, unknown>).member = "filter_int_d2_app_committed";
      const result = await verifyProofManifest(parseProofManifest(doc), {
        circuits: { filter_int_d2_app_committed: artifact },
      });
      expect(result.verified).toBe(true);
    },
    VERIFY_TIMEOUT,
  );

  it(
    "one failing sub-proof fails the whole manifest",
    async () => {
      const doc = fixtureCopy();
      const good = structuredClone(doc.subProof) as Record<string, unknown>;
      const bad = structuredClone(doc.subProof) as { proof: number[] };
      bad.proof[42] = (bad.proof[42] ?? 0) ^ 0xff;
      doc.subProof = undefined;
      doc.subProofs = [good, bad];
      const result = await verifyProofManifest(parseProofManifest(doc));
      expect(result.subProofs).toHaveLength(2);
      expect(result.subProofs[0]?.verified).toBe(true);
      expect(result.subProofs[1]?.verified).toBe(false);
      expect(result.verified).toBe(false);
    },
    VERIFY_TIMEOUT,
  );
});

describe("loadProofManifest", () => {
  it("loads a manifest stored beside the credentials in the pod", async () => {
    const fetchStub: typeof fetch = async () =>
      new Response(JSON.stringify(fixtureJson), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    const manifest = await loadProofManifest("https://alex.example/credentials/manifest.json", {
      fetch: fetchStub,
    });
    expect(manifest.subProofs).toHaveLength(1);
  });

  it("fails closed on HTTP errors and non-JSON bodies", async () => {
    await expect(
      loadProofManifest("https://alex.example/missing.json", {
        fetch: async () => new Response("nope", { status: 404 }),
      }),
    ).rejects.toMatchObject({ code: "MANIFEST_FETCH_FAILED" });
    await expect(
      loadProofManifest("https://alex.example/broken.json", {
        fetch: async () => new Response("not json", { status: 200 }),
      }),
    ).rejects.toMatchObject({ code: "MALFORMED_MANIFEST" });
  });
});
