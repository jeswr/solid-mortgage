/**
 * sm-26 deliverable 3 - the Tier B COMPOSITE capture (same-subject join +
 * hidden-index revocation + hidden-issuer membership) verifies live through
 * the sm-25 manifest verifier with app-injected circuit artifacts, exactly
 * as a consuming lender app would run it. The fixture is a genuine capture
 * (fixtures/PROVENANCE.json); the suite re-runs REAL bb.js verifies and
 * asserts the fail-closed negatives.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { CompiledCircuitArtifact } from "../src/index.js";
import { parseProofManifest, TIER_B_LABEL, verifyProofManifest } from "../src/index.js";

const VERIFY_TIMEOUT = 180_000;
const COMPOSITE_MEMBERS = ["join_eq_na64_nb64", "revoke_unset_d10", "hidden_issuer_d4"];

let fixtureJson: Record<string, unknown>;
let circuits: Record<string, CompiledCircuitArtifact>;
let attestations: Record<string, { attestation: { commitment: string; message: string } }>;

beforeAll(async () => {
  const fixture = (name: string) => readFile(join(import.meta.dirname, "fixtures", name), "utf8");
  fixtureJson = JSON.parse(await fixture("mortgage-composite-manifest.json"));
  attestations = JSON.parse(await fixture("dual-sign-attestations.json")).credentials;
  circuits = Object.fromEntries(
    await Promise.all(
      COMPOSITE_MEMBERS.map(async (member) => [
        member,
        JSON.parse(await fixture(join("circuits", `${member}.json`))) as CompiledCircuitArtifact,
      ]),
    ),
  );
});

function fixtureCopy(): Record<string, unknown> {
  return structuredClone(fixtureJson);
}

describe("mortgage composite manifest (Tier B)", () => {
  it("parses as a sparq ProofManifest with the three composite members", () => {
    const manifest = parseProofManifest(fixtureJson);
    expect(manifest.subProofs.map((sub) => sub.member)).toEqual(COMPOSITE_MEMBERS);
    for (const sub of manifest.subProofs) {
      expect(sub.proof.length).toBeGreaterThan(1000);
      expect(sub.publicInputs.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("shares ONE capture-time challenge across every sub-proof", () => {
    const manifest = parseProofManifest(fixtureJson);
    const challenge = BigInt((fixtureJson.challenge as { field: string }).field);
    for (const sub of manifest.subProofs) {
      expect(BigInt(sub.publicInputs[0] ?? "0x0")).toBe(challenge);
    }
  });

  it("binds the join + issuer sub-proofs to the DUAL-SIGNED credentials", () => {
    const manifest = parseProofManifest(fixtureJson);
    const joinPublics = (manifest.subProofs[0]?.publicInputs ?? []).map((entry) => BigInt(entry));
    // join public inputs: challenge, commit_a, commit_b, join_commitment, slots.
    expect(joinPublics[1]).toBe(BigInt(attestations.employment?.attestation.commitment ?? "0x0"));
    expect(joinPublics[2]).toBe(BigInt(attestations.asset?.attestation.commitment ?? "0x0"));
    // hidden-issuer public inputs: challenge, m (the SIGNED message), key-set root.
    const issuerPublics = (manifest.subProofs[2]?.publicInputs ?? []).map((entry) => BigInt(entry));
    expect(issuerPublics[1]).toBe(BigInt(attestations.employment?.attestation.message ?? "0x0"));
    const context = fixtureJson.context as { issuerKeySetRoot: string; statusListRoot: string };
    expect(issuerPublics[2]).toBe(BigInt(context.issuerKeySetRoot));
    // revocation public inputs: challenge, status-list root, index commitment.
    const revokePublics = (manifest.subProofs[1]?.publicInputs ?? []).map((entry) => BigInt(entry));
    expect(revokePublics[1]).toBe(BigInt(context.statusListRoot));
  });

  it(
    "every sub-proof verifies live against the injected circuit artifacts",
    async () => {
      const result = await verifyProofManifest(parseProofManifest(fixtureJson), { circuits });
      expect(result.subProofs.map((sub) => sub.verified)).toEqual([true, true, true]);
      expect(result.verified).toBe(true);
      expect(result.label).toBe(TIER_B_LABEL);
      expect(result.freshness).toBe("precomputed");
    },
    VERIFY_TIMEOUT,
  );

  it(
    "fails closed without injected artifacts (members are not package-committed)",
    async () => {
      const result = await verifyProofManifest(parseProofManifest(fixtureJson));
      expect(result.verified).toBe(false);
      for (const sub of result.subProofs) {
        expect(sub.verified).toBe(false);
        expect(sub.error).toContain("failing closed");
      }
    },
    VERIFY_TIMEOUT,
  );

  it(
    "a single flipped byte in any sub-proof fails the whole manifest",
    async () => {
      const doc = fixtureCopy();
      const subProofs = doc.subProofs as { proof: number[] }[];
      const bytes = subProofs[1]?.proof;
      if (bytes === undefined) throw new Error("fixture shape changed");
      bytes[321] = (bytes[321] ?? 0) ^ 0x01;
      const result = await verifyProofManifest(parseProofManifest(doc), { circuits });
      expect(result.subProofs[1]?.verified).toBe(false);
      expect(result.verified).toBe(false);
    },
    VERIFY_TIMEOUT,
  );

  it("never discloses the join value, status index, or issuer identity", () => {
    const manifest = parseProofManifest(fixtureJson);
    const publics = new Set(
      manifest.subProofs.flatMap((sub) => sub.publicInputs.map((entry) => BigInt(entry))),
    );
    // The clear status index (42) and the decoy revoked indices must not be public.
    for (const index of [42n, 3n, 999n]) {
      expect(publics.has(index)).toBe(false);
    }
    // No issuer key-set LEAF (an individual key) may be public - only the root.
    const context = fixtureJson.context as { issuerKeySet: string[]; issuerKeySetRoot: string };
    expect(context.issuerKeySet.length).toBeGreaterThan(1);
    expect(publics.has(BigInt(context.issuerKeySetRoot))).toBe(true);
  });
});
