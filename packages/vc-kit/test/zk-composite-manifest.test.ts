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
import type { CompiledCircuitArtifact, ZkCommitmentAttestation } from "../src/index.js";
import {
  parseProofManifest,
  TIER_B_LABEL,
  verifyCompositeBindings,
  verifyProofManifest,
} from "../src/index.js";

const VERIFY_TIMEOUT = 180_000;
const COMPOSITE_MEMBERS = ["join_eq_na64_nb64", "revoke_unset_d10", "hidden_issuer_d4"];

interface FixtureContext {
  statusList: { iri: string; version: number; root: string; rootSignature: string };
  issuerKeySetRoot: string;
  issuerKeySet: string[];
}

let fixtureJson: Record<string, unknown>;
let circuits: Record<string, CompiledCircuitArtifact>;
let attestations: Record<string, { attestation: ZkCommitmentAttestation }>;

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

/** The verifier-held binding inputs (attestations + OWN trust anchors). */
function bindingOptions() {
  const context = fixtureJson.context as unknown as FixtureContext;
  const employment = attestations.employment?.attestation;
  const asset = attestations.asset?.attestation;
  if (employment === undefined || asset === undefined) throw new Error("fixture shape changed");
  return {
    credentialA: employment,
    credentialB: asset,
    statusListRoot: context.statusList.root,
    issuerKeySetRoot: context.issuerKeySetRoot,
    challenge: (fixtureJson.challenge as { field: string }).field,
  };
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

  it("carries an ISSUER-SIGNED status-list root (decision 0012 Schnorr-bound list)", () => {
    const context = fixtureJson.context as unknown as FixtureContext;
    expect(context.statusList.iri).toContain("zk-employment");
    expect(context.statusList.root).toMatch(/^0x[0-9a-f]{64}$/);
    // Signature hex: compressed(R) || s - verified natively (Tier C), carried
    // so a verifier CAN authenticate the snapshot the proof was built against.
    expect(context.statusList.rootSignature).toMatch(/^[0-9a-f]{128}$/);
  });

  it("binds every sub-proof to the dual-signed credentials + trust anchors", () => {
    const manifest = parseProofManifest(fixtureJson);
    const result = verifyCompositeBindings(manifest, bindingOptions());
    expect(result.failures).toEqual([]);
    expect(result.bound).toBe(true);
  });

  it("REJECTS spliced sub-proofs (roborev 5554 finding 1 regression)", () => {
    const options = bindingOptions();
    // (a) a revocation proof about a DIFFERENT credential's status index.
    const spliceIndex = fixtureCopy();
    const revoke = (spliceIndex.subProofs as { member: string; publicInputs: string[] }[])[1];
    if (revoke === undefined) throw new Error("fixture shape changed");
    revoke.publicInputs[2] = `0x${"11".repeat(32)}`;
    const indexResult = verifyCompositeBindings(parseProofManifest(spliceIndex), options);
    expect(indexResult.bound).toBe(false);
    expect(indexResult.failures.join(" ")).toContain("index commitment");

    // (b) a hidden-issuer proof over a DIFFERENT attested message.
    const spliceMessage = fixtureCopy();
    const issuer = (spliceMessage.subProofs as { member: string; publicInputs: string[] }[])[2];
    if (issuer === undefined) throw new Error("fixture shape changed");
    issuer.publicInputs[1] = `0x${"22".repeat(32)}`;
    const messageResult = verifyCompositeBindings(parseProofManifest(spliceMessage), options);
    expect(messageResult.bound).toBe(false);
    expect(messageResult.failures.join(" ")).toContain("attested commitment message");

    // (c) a sub-proof produced for a DIFFERENT challenge.
    const spliceChallenge = fixtureCopy();
    const joinSub = (spliceChallenge.subProofs as { member: string; publicInputs: string[] }[])[0];
    if (joinSub === undefined) throw new Error("fixture shape changed");
    joinSub.publicInputs[0] = `0x${"33".repeat(32)}`;
    const challengeResult = verifyCompositeBindings(parseProofManifest(spliceChallenge), options);
    expect(challengeResult.bound).toBe(false);
    expect(challengeResult.failures.join(" ")).toContain("shared challenge");

    // (d) a prover-minted status-list root (all-unset snapshot of their own
    // making) fails against the verifier's authoritative root anchor.
    const mintedRoot = fixtureCopy();
    const revoke2 = (mintedRoot.subProofs as { member: string; publicInputs: string[] }[])[1];
    if (revoke2 === undefined) throw new Error("fixture shape changed");
    revoke2.publicInputs[1] = `0x${"44".repeat(32)}`;
    const rootResult = verifyCompositeBindings(parseProofManifest(mintedRoot), options);
    expect(rootResult.bound).toBe(false);
    expect(rootResult.failures.join(" ")).toContain("status-list root");

    // (e) a SHARED-PREDICATE join (slots 1/1) must not masquerade as the
    // same-SUBJECT relation (roborev 5561 finding 1): the slot pair IS the
    // proven relation and is pinned to 0/0 by default.
    const predicateJoin = fixtureCopy();
    const joinSlots = (predicateJoin.subProofs as { member: string; publicInputs: string[] }[])[0];
    if (joinSlots === undefined) throw new Error("fixture shape changed");
    joinSlots.publicInputs[4] = `0x${"0".repeat(63)}1`;
    joinSlots.publicInputs[5] = `0x${"0".repeat(63)}1`;
    const slotResult = verifyCompositeBindings(parseProofManifest(predicateJoin), options);
    expect(slotResult.bound).toBe(false);
    expect(slotResult.failures.join(" ")).toContain("join slot");
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
