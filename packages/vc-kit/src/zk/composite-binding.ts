/**
 * Tier B composite BINDING-CONSISTENCY checks (sm-26; roborev 5554 findings
 * 1-2). `verifyProofManifest` proves each transcript is genuine for its
 * member circuit; it deliberately does NOT check that the sub-proofs are
 * about the SAME credentials - sparq's full `verify_manifest` gate stack
 * (attestation Schnorr verification, Poseidon2 public-input reconstruction,
 * nonce burn) is Rust-native and explicitly out of scope (zkp-fit tier C).
 *
 * This module adds the checks that need NO cryptography beyond string
 * equality over already-disclosed values, closing the "splice unrelated
 * sub-proofs into one manifest" gap for verifiers that hold the credentials'
 * attestation documents and their own trust anchors:
 *
 *   - one shared challenge across every sub-proof;
 *   - join `commit_a`/`commit_b` == the two attestations' graph commitments;
 *   - hidden-issuer `m` == credential A's SIGNED attestation message (which
 *     natively folds in the commitment, salt, and the status reference over
 *     the index commitment - sq-ayv);
 *   - revocation `index_commitment` == the issuer-signed index commitment in
 *     credential A's attestation status;
 *   - revocation `root` and hidden-issuer `key_set_root` == the VERIFIER'S
 *     OWN trust anchors (never values the manifest asserts about itself).
 *
 * HONEST SCOPE: these are consistency checks over verifier-held documents.
 * They do NOT verify the Schnorr attestation signatures or recompute the
 * Poseidon2 digests (native-only - Poseidon2/Schnorr are deliberately not
 * reimplemented in JS, decision 0012). A verifier must obtain the
 * attestations and trust anchors from a channel it trusts (e.g. the signed
 * status-list context + issuer registry), and full composed soundness still
 * requires sparq's native `verify_manifest`.
 */

import { fieldHexEquals } from "./backend.js";
import type { ManifestSubProof, ProofManifest } from "./manifest.js";

/**
 * The Schnorr-BJJ commitment attestation a dual-signed credential carries in
 * its seed witness (sparq `CommitmentAttestation` shape; produced natively by
 * the sm-26 seed tooling). Pure data - safe for browser verifiers.
 */
export interface ZkCommitmentAttestation {
  /** Poseidon2 commitment `C(G)` over the canonical claim graph, 0x hex. */
  readonly commitment: string;
  /** The exact signed message field (`m` of `hidden_issuer_d{d}`), 0x hex. */
  readonly message: string;
  readonly status: {
    readonly listIri: string;
    readonly version: number;
    /** The issuer-signed HIDING commitment to the status index, 0x hex. */
    readonly indexCommitment: string;
  };
}

export interface CompositeBindingOptions {
  /** Attestation of the join's graph-A credential (also the revocation + issuer subject). */
  readonly credentialA: ZkCommitmentAttestation;
  /** Attestation of the join's graph-B credential. */
  readonly credentialB: ZkCommitmentAttestation;
  /**
   * The VERIFIER'S authoritative status-list Merkle root for credential A's
   * (listIri, version) - e.g. rebuilt from the issuer-signed snapshot. Never
   * take this from the manifest itself.
   */
  readonly statusListRoot: string;
  /** The verifier's authoritative trusted-issuer key-set root. */
  readonly issuerKeySetRoot: string;
  /**
   * The challenge field the verifier expects (for a live presentation, its
   * own derived nonce field; for a Tier B capture, the recorded capture
   * challenge - decision 0012: precomputed manifests are NEVER fresh).
   */
  readonly challenge?: string;
}

export interface CompositeBindingResult {
  /** True iff every binding-consistency check passed. */
  readonly bound: boolean;
  /** Human-readable failures (empty when bound). */
  readonly failures: readonly string[];
}

function memberWithPrefix(
  manifest: ProofManifest,
  prefix: string,
  failures: string[],
): ManifestSubProof | undefined {
  const matches = manifest.subProofs.filter((sub) => sub.member.startsWith(prefix));
  if (matches.length !== 1) {
    failures.push(`expected exactly one ${prefix}* sub-proof, found ${matches.length}`);
    return undefined;
  }
  return matches[0];
}

function checkInput(
  sub: ManifestSubProof | undefined,
  index: number,
  expected: string,
  label: string,
  failures: string[],
): void {
  if (sub === undefined) return;
  const got = sub.publicInputs[index];
  if (got === undefined || !fieldHexEquals(got, expected, label)) {
    failures.push(`${sub.member}: ${label} does not match (public input ${index})`);
  }
}

/**
 * Check the cross-sub-proof bindings of a parsed composite manifest against
 * verifier-held attestations and trust anchors. Fail-closed: any missing
 * member, missing public input, or mismatch is a failure. Run this IN
 * ADDITION to `verifyProofManifest` (transcript validity), never instead.
 */
export function verifyCompositeBindings(
  manifest: ProofManifest,
  options: CompositeBindingOptions,
): CompositeBindingResult {
  const failures: string[] = [];
  const join = memberWithPrefix(manifest, "join_eq_", failures);
  const revoke = memberWithPrefix(manifest, "revoke_unset_", failures);
  const issuer = memberWithPrefix(manifest, "hidden_issuer_", failures);

  // One shared challenge (public input 0 of every member), optionally pinned
  // to the verifier-expected value.
  const reference = options.challenge ?? join?.publicInputs[0];
  if (reference === undefined) {
    failures.push("no challenge available to bind against");
  } else {
    for (const sub of [join, revoke, issuer]) {
      checkInput(sub, 0, reference, "shared challenge", failures);
    }
  }

  // join_eq public inputs: challenge, commit_a, commit_b, join_commitment, slots.
  checkInput(join, 1, options.credentialA.commitment, "graph-A commitment", failures);
  checkInput(join, 2, options.credentialB.commitment, "graph-B commitment", failures);

  // revoke_unset public inputs: challenge, root, index_commitment.
  checkInput(revoke, 1, options.statusListRoot, "authoritative status-list root", failures);
  checkInput(
    revoke,
    2,
    options.credentialA.status.indexCommitment,
    "issuer-signed index commitment",
    failures,
  );

  // hidden_issuer public inputs: challenge, m, key_set_root.
  checkInput(issuer, 1, options.credentialA.message, "attested commitment message", failures);
  checkInput(issuer, 2, options.issuerKeySetRoot, "authoritative key-set root", failures);

  return { bound: failures.length === 0, failures };
}
