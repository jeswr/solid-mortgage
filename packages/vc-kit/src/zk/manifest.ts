/**
 * Tier B - precomputed sparq ProofManifest, verified live (sm-25 deliverable
 * 3; decisions 0005/0012; zkp-fit Q4 tier B). The composed cross-credential
 * family (scan + join_eq + hidden_issuer + revoke_unset + holder_pok) needs
 * native witness generation, so the manifest is produced OFFLINE at seed time
 * by the sparq Rust harness and stored beside the credentials in the pod; the
 * verifier re-runs a GENUINE bb.js UltraHonk verify over every bundled
 * sub-proof, live.
 *
 * LABELLING IS MANDATORY (decision 0012): the sub-proof challenges were baked
 * at capture time, so a manifest can never satisfy a live verifier nonce -
 * freshness must never be claimed. Every Tier B surface renders
 * {@link TIER_B_LABEL} verbatim: "proved offline · verified live".
 *
 * Scope honesty: this verifies each sub-proof transcript against its
 * committed circuit. It is NOT sparq's full `verify_manifest` gate stack
 * (nonce burn, attestation binding, public-input reconstruction) - that is
 * Rust-native and out of scope (zkp-fit tier C). The result says which checks
 * ran; consumers must not present it as the full composed verification.
 */

import {
  assertZkVerifierTarget,
  type ProofData,
  verifyProof as verifyCommittedProof,
  ZkError,
} from "./backend.js";
import {
  asCommittedMember,
  assertCircuitArtifact,
  type CompiledCircuitArtifact,
} from "./circuits/registry.js";

/** The mandatory decision-0012 Tier B copy string. Render verbatim. */
export const TIER_B_LABEL = "proved offline · verified live";

/**
 * Bounds on an UNTRUSTED pod-resident manifest, enforced before allocation or
 * any bb.js verify. A full composed family is ~7 sub-proofs; each UltraHonk
 * transcript is single-digit-kB and each member has a bounded public-input
 * count. These caps are generous defense-in-depth against a hostile manifest.
 */
const MAX_SUBPROOFS = 64;
const MAX_SUBPROOF_BYTES = 262_144;
const MAX_PUBLIC_INPUTS = 4_096;

/** One captured sub-proof inside a manifest (sparq capture format). */
export interface ManifestSubProof {
  /** The circuit member the sub-proof was produced against. */
  readonly member: string;
  /** Human-readable relation description (display only - never trusted). */
  readonly relation: string;
  /** The UltraHonk transcript as a byte array. */
  readonly proof: readonly number[];
  /** 32-byte 0x-hex public inputs in the member's ABI order. */
  readonly publicInputs: readonly string[];
}

/** A parsed sparq ProofManifest (`urn:sparq:zk:ProofManifest` capture shape). */
export interface ProofManifest {
  readonly type: string;
  /** Capture-time honesty note (display only). */
  readonly note?: string;
  /** ISO date the manifest was captured (display beside {@link TIER_B_LABEL}). */
  readonly capturedAt?: string;
  readonly subProofs: readonly ManifestSubProof[];
}

/** Per-sub-proof verification outcome. */
export interface SubProofResult {
  readonly member: string;
  readonly relation: string;
  readonly verified: boolean;
  readonly proofByteLength: number;
  readonly error?: string;
}

export interface ManifestVerifyResult {
  /** True iff EVERY bundled sub-proof cryptographically verified. */
  readonly verified: boolean;
  readonly subProofs: readonly SubProofResult[];
  /** The mandatory copy string - render verbatim on every Tier B surface. */
  readonly label: typeof TIER_B_LABEL;
  /** Freshness posture: capture-time challenges, NEVER live (decision 0012). */
  readonly freshness: "precomputed";
  readonly capturedAt?: string;
  readonly verifyMs: number;
}

function parseSubProof(value: unknown, label: string): ManifestSubProof {
  if (typeof value !== "object" || value === null) {
    throw new ZkError("MALFORMED_MANIFEST", `${label} is not an object`);
  }
  const { member, relation, proof, publicInputs } = value as Record<string, unknown>;
  if (typeof member !== "string" || member.length === 0) {
    throw new ZkError("MALFORMED_MANIFEST", `${label} has no member name`);
  }
  if (
    !Array.isArray(proof) ||
    proof.length === 0 ||
    proof.length > MAX_SUBPROOF_BYTES ||
    !proof.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)
  ) {
    throw new ZkError(
      "MALFORMED_MANIFEST",
      `${label} proof bytes must be a non-empty, bounded byte array`,
    );
  }
  if (
    !Array.isArray(publicInputs) ||
    publicInputs.length === 0 ||
    publicInputs.length > MAX_PUBLIC_INPUTS ||
    !publicInputs.every((entry) => typeof entry === "string")
  ) {
    throw new ZkError("MALFORMED_MANIFEST", `${label} publicInputs must be bounded hex strings`);
  }
  return {
    member,
    relation: typeof relation === "string" ? relation : "",
    proof: proof as number[],
    publicInputs: publicInputs as string[],
  };
}

/**
 * Parse an UNTRUSTED manifest document (pod-resident JSON), fail-closed.
 * Accepts both the sparq single-`subProof` capture shape and a `subProofs`
 * array; a manifest with neither, or with any malformed entry, throws.
 */
export function parseProofManifest(json: unknown): ProofManifest {
  if (typeof json !== "object" || json === null) {
    throw new ZkError("MALFORMED_MANIFEST", "manifest is not an object");
  }
  const record = json as Record<string, unknown>;
  if (typeof record.type !== "string" || !record.type.includes("ProofManifest")) {
    throw new ZkError("MALFORMED_MANIFEST", "manifest has no ProofManifest type marker");
  }
  // Reject manifests that self-declare a *-no-zk capture flavour outright.
  const proofOptions = record.proofOptions as { verifierTarget?: unknown } | undefined;
  if (proofOptions !== undefined && proofOptions !== null) {
    assertZkVerifierTarget((proofOptions as { verifierTarget?: unknown }).verifierTarget);
  }
  const subProofs: ManifestSubProof[] = [];
  if (record.subProof !== undefined) {
    subProofs.push(parseSubProof(record.subProof, "subProof"));
  }
  if (record.subProofs !== undefined) {
    if (!Array.isArray(record.subProofs)) {
      throw new ZkError("MALFORMED_MANIFEST", "subProofs is not an array");
    }
    if (record.subProofs.length + subProofs.length > MAX_SUBPROOFS) {
      throw new ZkError(
        "MALFORMED_MANIFEST",
        `manifest bundles more than ${MAX_SUBPROOFS} sub-proofs`,
      );
    }
    record.subProofs.forEach((entry, index) => {
      subProofs.push(parseSubProof(entry, `subProofs[${index}]`));
    });
  }
  if (subProofs.length === 0) {
    throw new ZkError("MALFORMED_MANIFEST", "manifest bundles no sub-proofs");
  }
  return {
    type: record.type,
    ...(typeof record.note === "string" ? { note: record.note } : {}),
    ...(typeof record.capturedAt === "string" ? { capturedAt: record.capturedAt } : {}),
    subProofs,
  };
}

/** Options for {@link verifyProofManifest}. */
export interface VerifyManifestOptions {
  /**
   * Extra circuit artifacts for family members this package does not commit
   * (join_eq, scan, revoke_unset, ...), keyed by member name. These carry the
   * SAME trust level as code: the consuming app must commit them at build
   * time from the pinned sparq toolchain - NEVER accept artifacts from the
   * network or the presenter. Committed members always take precedence.
   */
  readonly circuits?: Readonly<Record<string, CompiledCircuitArtifact>>;
}

/**
 * Verify every bundled sub-proof live with bb.js against committed circuit
 * artifacts. Fail-closed: a sub-proof whose member has no committed (or
 * app-injected) artifact FAILS - it is never skipped.
 */
export async function verifyProofManifest(
  manifest: ProofManifest,
  options: VerifyManifestOptions = {},
): Promise<ManifestVerifyResult> {
  const started = Date.now();
  const results: SubProofResult[] = [];
  for (const subProof of manifest.subProofs) {
    results.push(await verifySubProof(subProof, options));
  }
  return {
    verified: results.length > 0 && results.every((result) => result.verified),
    subProofs: results,
    label: TIER_B_LABEL,
    freshness: "precomputed",
    ...(manifest.capturedAt !== undefined ? { capturedAt: manifest.capturedAt } : {}),
    verifyMs: Date.now() - started,
  };
}

async function verifySubProof(
  subProof: ManifestSubProof,
  options: VerifyManifestOptions,
): Promise<SubProofResult> {
  const base = {
    member: subProof.member,
    relation: subProof.relation,
    proofByteLength: subProof.proof.length,
  };
  const proofData: ProofData = {
    proof: Uint8Array.from(subProof.proof),
    publicInputs: subProof.publicInputs,
  };
  try {
    const committed = asCommittedMember(subProof.member);
    if (committed !== undefined) {
      const verified = await verifyCommittedProof(committed, proofData);
      return { ...base, verified, ...(verified ? {} : { error: "proof did not verify" }) };
    }
    const injected = options.circuits?.[subProof.member];
    if (injected === undefined) {
      return {
        ...base,
        verified: false,
        error: `no committed circuit artifact for member "${subProof.member}" - failing closed`,
      };
    }
    assertCircuitArtifact(injected, subProof.member);
    const verified = await verifyInjected(injected, proofData);
    return { ...base, verified, ...(verified ? {} : { error: "proof did not verify" }) };
  } catch (error) {
    return { ...base, verified: false, error: (error as Error).message };
  }
}

/** bb.js verify against an app-committed (injected) artifact, pinned flavour. */
async function verifyInjected(
  artifact: CompiledCircuitArtifact,
  proofData: ProofData,
): Promise<boolean> {
  const bb = await import("@aztec/bb.js");
  const api = await bb.Barretenberg.new({ threads: 1 });
  try {
    const backend = new bb.UltraHonkBackend(
      artifact.bytecode,
      api as ConstructorParameters<typeof bb.UltraHonkBackend>[1],
    );
    return await backend.verifyProof(
      { proof: proofData.proof, publicInputs: [...proofData.publicInputs] },
      { verifierTarget: "evm" },
    );
  } finally {
    await (api as { destroy(): Promise<void> }).destroy();
  }
}

/**
 * Load a ProofManifest stored beside the credentials in the pod. The caller
 * supplies the (authenticated, DPoP-bound) fetch; the response is parsed
 * fail-closed. Manifests are plain JSON artifacts, not RDF - they are capture
 * outputs of the sparq Rust harness.
 */
export async function loadProofManifest(
  url: string,
  options: { readonly fetch: typeof fetch },
): Promise<ProofManifest> {
  const response = await options.fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new ZkError("MANIFEST_FETCH_FAILED", `manifest fetch failed: HTTP ${response.status}`);
  }
  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    throw new ZkError(
      "MALFORMED_MANIFEST",
      `manifest is not valid JSON: ${(error as Error).message}`,
    );
  }
  return parseProofManifest(json);
}
