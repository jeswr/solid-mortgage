/**
 * sm-26 deliverable 3 - Tier B ProofManifest capture (decision 0005 row 3;
 * zkp-fit Q4 tier B; mirrors sparq's site/scripts/capture-zk-manifest.mjs).
 *
 * The composed cross-credential family needs NATIVE witness building
 * (Poseidon2 commitments, Schnorr signatures, Merkle roots) - the helper
 * binary produces each member's full Prover.toml; THIS module then runs the
 * SAME pinned prover the browser verifier uses (`@noir-lang/noir_js` +
 * `@aztec/bb.js`, UltraHonk, `verifierTarget: 'evm'` - fully zero-knowledge),
 * self-verifies every transcript, checks the private witness never leaks into
 * the public inputs, and assembles the `urn:sparq:zk:ProofManifest` capture
 * shape `parseProofManifest` consumes.
 *
 * LABELLING (decision 0012): capture-time challenges can never satisfy a live
 * verifier nonce - every surface presenting these manifests renders
 * `TIER_B_LABEL` ("proved offline · verified live") verbatim.
 */

import { parse as parseToml } from "smol-toml";
import type { CompiledCircuitArtifact } from "../zk/circuits/registry.js";
import { ZK_HONESTY } from "../zk/honesty.js";
import type { ManifestSubProof } from "../zk/manifest.js";
import type { SparqSeedResult, SparqSubRelation } from "./native.js";
import { SeedToolingError } from "./native.js";

/** The capture output - a superset of the shape `parseProofManifest` reads. */
export interface CapturedProofManifest {
  readonly type: "urn:sparq:zk:ProofManifest";
  readonly note: string;
  readonly capturedAt: string;
  readonly proofOptions: { readonly verifierTarget: "evm" };
  readonly challenge: { readonly nonce: string; readonly field: string };
  readonly context: {
    readonly statusListRoot: string;
    readonly issuerKeySetRoot: string;
    readonly issuerKeySet: readonly string[];
    readonly joinRelation: string;
  };
  readonly subProofs: readonly ManifestSubProof[];
}

export interface CaptureCompositeOptions {
  /** A helper result whose `composite` is populated. */
  readonly result: SparqSeedResult;
  /** The nonce string the challenge field was derived from (PROVENANCE). */
  readonly nonce: string;
  /** Compiled artifacts for every composite member, keyed by member name. */
  readonly circuits: Readonly<Record<string, CompiledCircuitArtifact>>;
  /** Capture date, `YYYY-MM-DD` (explicit - the library never reads the clock). */
  readonly capturedAt: string;
  /** Human-readable relation per member (display only). */
  readonly relations?: Readonly<Record<string, string>>;
}

/** Private witness fields per member that must NEVER appear in public inputs. */
const PRIVATE_FIELD_CHECKS: Readonly<Record<string, readonly string[]>> = {
  join_eq: ["row_a", "row_b", "blinding"],
  revoke_unset: ["index", "bit", "blinding"],
  hidden_issuer: ["pk_x", "pk_y", "r_x", "r_y", "s", "e", "index"],
};

function privateChecksFor(member: string): readonly string[] {
  for (const [prefix, fields] of Object.entries(PRIVATE_FIELD_CHECKS)) {
    if (member.startsWith(prefix)) return fields;
  }
  return [];
}

/** Normalise decimal/hex witness values to canonical 0x field hex. */
function toFieldHex(value: string): string {
  return `0x${BigInt(value).toString(16).padStart(64, "0")}`;
}

function flattenTomlValues(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const entry of value) flattenTomlValues(entry, out);
  }
}

/**
 * Assert none of the member's designated PRIVATE witness values appear among
 * the transcript's public inputs. (A full-vector check would false-positive
 * on small shared integers like slot indices, so the check is targeted.)
 */
function assertNoWitnessLeak(
  member: string,
  inputs: Record<string, unknown>,
  publicInputs: readonly string[],
): void {
  const publics = new Set(publicInputs.map((entry) => toFieldHex(entry)));
  for (const field of privateChecksFor(member)) {
    const flat: string[] = [];
    flattenTomlValues(inputs[field], flat);
    if (typeof inputs[field] === "number" || typeof inputs[field] === "bigint") {
      flat.push(String(inputs[field]));
    }
    for (const value of flat) {
      if (publics.has(toFieldHex(value))) {
        throw new SeedToolingError(
          "WITNESS_LEAK",
          `${member}: private witness field "${field}" appears in the public inputs - refusing to write the capture`,
        );
      }
    }
  }
}

interface ProverBackend {
  execute(inputs: Record<string, unknown>): Promise<{ witness: Uint8Array }>;
  generateProof(
    witness: Uint8Array,
    options: { verifierTarget: "evm" },
  ): Promise<{ proof: Uint8Array; publicInputs: string[] }>;
  verifyProof(
    proof: { proof: Uint8Array; publicInputs: string[] },
    options: { verifierTarget: "evm" },
  ): Promise<boolean>;
}

async function backendFor(artifact: CompiledCircuitArtifact): Promise<ProverBackend> {
  const [{ Noir }, bb] = await Promise.all([import("@noir-lang/noir_js"), import("@aztec/bb.js")]);
  const noir = new Noir(artifact as unknown as ConstructorParameters<typeof Noir>[0]);
  const api = await bb.Barretenberg.new({ threads: 1 });
  const backend = new bb.UltraHonkBackend(
    artifact.bytecode,
    api as ConstructorParameters<typeof bb.UltraHonkBackend>[1],
  );
  return {
    execute: (inputs) =>
      (noir as unknown as ProverBackend).execute(inputs) as Promise<{ witness: Uint8Array }>,
    generateProof: (witness, options) => backend.generateProof(witness, options),
    verifyProof: (proof, options) => backend.verifyProof(proof, options),
  };
}

async function proveSubRelation(
  relation: SparqSubRelation,
  circuits: Readonly<Record<string, CompiledCircuitArtifact>>,
  relationText: string,
): Promise<ManifestSubProof> {
  const artifact = circuits[relation.member];
  if (artifact === undefined) {
    throw new SeedToolingError(
      "NO_CIRCUIT",
      `no compiled artifact supplied for member "${relation.member}"`,
    );
  }
  const inputs = parseToml(relation.proverToml) as Record<string, unknown>;
  const backend = await backendFor(artifact);
  let witness: Uint8Array;
  try {
    ({ witness } = await backend.execute(inputs));
  } catch (error) {
    throw new SeedToolingError(
      "UNSATISFIABLE",
      `${relation.member}: witness solve failed - the native inputs do not satisfy the circuit: ${(error as Error).message}`,
    );
  }
  const { proof, publicInputs } = await backend.generateProof(witness, { verifierTarget: "evm" });
  const verified = await backend.verifyProof({ proof, publicInputs }, { verifierTarget: "evm" });
  if (!verified) {
    throw new SeedToolingError(
      "SELF_VERIFY_FAILED",
      `${relation.member}: captured proof did not self-verify - refusing to write a bad capture`,
    );
  }
  // The public inputs bb returns must match the native build's declaration.
  const expected = relation.publicInputs.map(([, value]) => toFieldHex(value));
  const got = publicInputs.map((entry) => toFieldHex(entry));
  if (expected.length !== got.length || expected.some((value, index) => value !== got[index])) {
    throw new SeedToolingError(
      "PUBLIC_INPUT_MISMATCH",
      `${relation.member}: bb public inputs do not match the native builder's public inputs`,
    );
  }
  assertNoWitnessLeak(relation.member, inputs, publicInputs);
  return {
    member: relation.member,
    relation: relationText,
    proof: Array.from(proof),
    publicInputs,
  };
}

/**
 * Prove + self-verify the composite family (same-subject join, hidden-index
 * revocation, hidden-issuer membership) and assemble the capture manifest.
 */
export async function captureCompositeManifest(
  options: CaptureCompositeOptions,
): Promise<CapturedProofManifest> {
  const composite = options.result.composite;
  if (composite === undefined) {
    throw new SeedToolingError("NO_COMPOSITE", "the helper result carries no composite build");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.capturedAt)) {
    throw new SeedToolingError("BAD_CAPTURE_DATE", "capturedAt must be YYYY-MM-DD");
  }
  const relations = options.relations ?? {};
  const subProofs = [
    await proveSubRelation(
      composite.join,
      options.circuits,
      relations[composite.join.member] ??
        "hidden same-subject equality across the two committed credential graphs (join value never disclosed)",
    ),
    await proveSubRelation(
      composite.revoke,
      options.circuits,
      relations[composite.revoke.member] ??
        "credential status bit unset (not revoked) at a HIDDEN status-list index",
    ),
    await proveSubRelation(
      composite.hiddenIssuer,
      options.circuits,
      relations[composite.hiddenIssuer.member] ??
        "a trusted-set issuer Schnorr-attested the commitment (WHICH issuer stays hidden)",
    ),
  ];
  return {
    type: "urn:sparq:zk:ProofManifest",
    note:
      "Tier B capture (decision 0012): proved offline with capture-time challenges, " +
      `verified live in-tab - NEVER challenge-fresh. ${ZK_HONESTY.headline}`,
    capturedAt: options.capturedAt,
    proofOptions: { verifierTarget: "evm" },
    challenge: { nonce: options.nonce, field: composite.challenge },
    context: composite.context,
    subProofs,
  };
}
