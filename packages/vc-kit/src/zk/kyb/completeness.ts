// AUTHORED-BY Claude Opus 5.5
/**
 * Business KYB Tier B: the completeness proof, "of the entity's full (hidden) owner array,
 * exactly `disclosedCount` owners hold `threshold` basis points or more". With the disclosed
 * owners named beside it, that is flows.md step 7's "no undisclosed owner holds 25% or more".
 * Ported from solid-kyb's `proveCompleteness` / `verifyCompleteness`, restated in this package's
 * Tier A shape (`../prover.ts`, `../verifier.ts`).
 *
 * Verification runs every gate, fail-closed, in this order:
 *  1. structural   - sanctioned `evm` flavour, the committed circuit name, five public inputs,
 *                    bounded proof bytes;
 *  2. nonce        - the single-use challenge is burned FIRST (a failed attempt burns it too);
 *  3. challenge    - the proof's challenge input equals the nonce's field derivation;
 *  4. statement    - threshold, disclosed count and a true verdict are exactly what was asked;
 *  5. anchor VC    - signature, issuer allowlist, validity window, Bitstring status;
 *  6. subject      - anchor subject === the authenticated presenter WebID;
 *  7. field        - anchor field === `mort:beneficialOwnershipArrayCommitment`;
 *  8. commitment   - anchor `mort:operandEnc` === the proof's array_commitment input
 *                    (constant time): a proof over any other array is rejected;
 *  9. cryptography - UltraHonk verify against the committed artifact.
 *
 * Honest scope: the circuit binds the hidden array to the anchored commitment and counts; who the
 * disclosed owners are is checked separately, against the signed credential, when the lender is
 * granted it (flows.md step 8). The commitment is deterministic and unsalted, so an array of
 * small integers is dictionary-attackable: the claim is "not disclosed and not forgeable", not
 * "cannot be learned".
 */

import { parseCredentialRdf } from "@jeswr/solid-vc";
import { MORT } from "@mortgage/data-model";
import type { DatasetCore, Term } from "@rdfjs/types";
import { TermWrapper } from "@rdfjs/wrapper";
import { DataFactory } from "n3";
import type { VerifyCredentialOptions, VerifyCredentialResult } from "../../verify.js";
import { verifyCredential } from "../../verify.js";
import {
  assertZkVerifierTarget,
  challengeFieldOf,
  circuitBackend,
  fieldHexEquals,
  generateProofOn,
  normalizeFieldHex,
  verifyProofOn,
  ZK_VERIFIER_TARGET,
  ZkError,
  type ZkVerifierTarget,
} from "../backend.js";
import { assertCircuitArtifact, type CompiledCircuitArtifact } from "../circuits/registry.js";
import {
  COMPLETENESS_ARRAY_SIZE,
  countAtOrAbove,
  ownershipArrayCommitment,
  padOwnershipArray,
} from "./commitment.js";

/** The committed Tier B circuit's name. The only value a presented proof may carry. */
export const COMPLETENESS_CIRCUIT = "kyb_completeness_scan_n8" as const;

/** The CDD Rule's 25 percent beneficial-owner threshold, in basis points. */
export const OWNERSHIP_THRESHOLD_BPS = 2500;

const PUBLIC_INPUT_COUNT = 5;
const MAX_PROOF_BYTES = 131_072;
const MAX_WIRE_PUBLIC_INPUTS = 16;

async function loadCompletenessCircuit(): Promise<CompiledCircuitArtifact> {
  const { KybCompletenessScanN8 } = await import("./circuit.js");
  const artifact = KybCompletenessScanN8 as unknown as CompiledCircuitArtifact;
  assertCircuitArtifact(artifact, COMPLETENESS_CIRCUIT);
  return artifact;
}

function completenessBackend() {
  return circuitBackend(COMPLETENESS_CIRCUIT, loadCompletenessCircuit);
}

/** Pay the cold start (WASM + artifact) before the first prove click. */
export function prewarmCompleteness(): Promise<unknown> {
  return completenessBackend();
}

// ── Proving ───────────────────────────────────────────────────────────────────────────────

export interface ProveCompletenessOptions {
  /** The full hidden owner array, every owner, in the anchored (canonical) order. */
  readonly bps: readonly number[];
  /** `mort:operandEnc` of the entity's owner-array anchor. */
  readonly arrayCommitment: string;
  /** How many owners at or above the threshold are being disclosed. */
  readonly disclosedCount: number;
  readonly threshold?: number;
  /** The verifier's single-use challenge. */
  readonly nonce: string;
}

export interface CompletenessProof {
  readonly circuit: typeof COMPLETENESS_CIRCUIT;
  readonly proof: Uint8Array;
  /** [challenge, array_commitment, threshold, disclosed_count, expected], 32-byte 0x-hex. */
  readonly publicInputs: readonly string[];
  readonly verifierTarget: ZkVerifierTarget;
  /** Witness solve plus proof generation, ms. */
  readonly proveMs: number;
  readonly threads: number;
}

/**
 * Prove completeness. Refuses before any proving work when the array is wider than eight slots
 * or does not hash to the anchored commitment (a stale or foreign anchor). A false claim (an
 * undisclosed owner at or above the threshold) has no witness and throws `UNSATISFIABLE`.
 */
export async function proveCompleteness(
  options: ProveCompletenessOptions,
): Promise<CompletenessProof> {
  const threshold = options.threshold ?? OWNERSHIP_THRESHOLD_BPS;
  if (!Number.isSafeInteger(threshold) || threshold <= 0) {
    throw new ZkError("BAD_STATEMENT", "threshold must be a positive whole number of bps");
  }
  if (
    !Number.isSafeInteger(options.disclosedCount) ||
    options.disclosedCount < 0 ||
    options.disclosedCount > COMPLETENESS_ARRAY_SIZE
  ) {
    throw new ZkError("BAD_STATEMENT", "disclosedCount must be 0 to 8");
  }
  const padded = padOwnershipArray(options.bps);
  const anchored = normalizeFieldHex(options.arrayCommitment, "arrayCommitment");
  if (!fieldHexEquals(ownershipArrayCommitment(options.bps), anchored, "arrayCommitment")) {
    throw new ZkError(
      "STALE_ANCHOR",
      "the owner array does not hash to the anchored commitment (a stale or foreign anchor)",
    );
  }
  const started = Date.now();
  const challenge = await challengeFieldOf(options.nonce);
  const loaded = await completenessBackend();
  let witness: Uint8Array;
  try {
    ({ witness } = await loaded.noir.execute({
      array_commitment: anchored,
      // PRIVATE - every owner's share. Never disclosed.
      bps: padded.map(String),
      challenge,
      disclosed_count: String(options.disclosedCount),
      expected: true,
      threshold: String(threshold),
    }));
  } catch (error) {
    throw new ZkError(
      "UNSATISFIABLE",
      `no witness exists for this statement (a false claim cannot be proved): ${(error as Error).message}`,
    );
  }
  const produced = await generateProofOn(loaded, witness);
  return {
    circuit: COMPLETENESS_CIRCUIT,
    proof: produced.proof,
    proveMs: Date.now() - started,
    publicInputs: [...produced.publicInputs],
    threads: loaded.threads,
    verifierTarget: ZK_VERIFIER_TARGET,
  };
}

/** The disclosed count an honest prover would state for `bps`. */
export { countAtOrAbove };

// ── Wire format ───────────────────────────────────────────────────────────────────────────

export interface PresentedCompletenessProof {
  readonly circuit: string;
  readonly proof: Uint8Array;
  readonly publicInputs: readonly string[];
  readonly verifierTarget: string;
}

export interface CompletenessProofJson {
  readonly circuit: string;
  readonly proof: readonly number[];
  readonly publicInputs: readonly string[];
  readonly verifierTarget: string;
}

export function completenessProofToJson(proof: CompletenessProof): CompletenessProofJson {
  return {
    circuit: proof.circuit,
    proof: [...proof.proof],
    publicInputs: [...proof.publicInputs],
    verifierTarget: proof.verifierTarget,
  };
}

/** Parse an UNTRUSTED payload. Structural only; every security check is in the verifier. */
export function completenessProofFromJson(json: unknown): PresentedCompletenessProof {
  if (typeof json !== "object" || json === null) {
    throw new ZkError("MALFORMED_PROOF", "proof payload is not an object");
  }
  const { circuit, proof, publicInputs, verifierTarget } = json as Record<string, unknown>;
  if (typeof circuit !== "string" || typeof verifierTarget !== "string") {
    throw new ZkError("MALFORMED_PROOF", "proof payload has no circuit or verifierTarget");
  }
  if (
    !Array.isArray(proof) ||
    proof.length === 0 ||
    proof.length > MAX_PROOF_BYTES ||
    !proof.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)
  ) {
    throw new ZkError("MALFORMED_PROOF", "proof bytes must be a non-empty, bounded byte array");
  }
  if (
    !Array.isArray(publicInputs) ||
    publicInputs.length > MAX_WIRE_PUBLIC_INPUTS ||
    !publicInputs.every((entry) => typeof entry === "string")
  ) {
    throw new ZkError("MALFORMED_PROOF", "publicInputs must be a bounded array of strings");
  }
  return {
    circuit,
    proof: Uint8Array.from(proof as number[]),
    publicInputs: publicInputs as string[],
    verifierTarget,
  };
}

// ── Verification ──────────────────────────────────────────────────────────────────────────

export type CompletenessErrorCode =
  | "FORBIDDEN_FLAVOUR"
  | "UNKNOWN_CIRCUIT"
  | "MALFORMED_PROOF"
  | "NONCE_INVALID"
  | "CHALLENGE_MISMATCH"
  | "STATEMENT_MISMATCH"
  | "ANCHOR_INVALID"
  | "ANCHOR_SUBJECT_MISMATCH"
  | "ANCHOR_FIELD_MISMATCH"
  | "ANCHOR_COMMITMENT_MISMATCH"
  | "PROOF_INVALID";

export interface CompletenessChecks {
  readonly structural: boolean;
  readonly nonce: boolean;
  readonly challenge: boolean;
  readonly statement: boolean;
  readonly anchor: boolean;
  readonly subject: boolean;
  readonly field: boolean;
  readonly commitmentBinding: boolean;
  readonly proof: boolean;
}

export interface CompletenessVerifyResult {
  readonly verified: boolean;
  readonly checks: CompletenessChecks;
  readonly errors: readonly { readonly code: CompletenessErrorCode; readonly message: string }[];
  readonly anchor?: VerifyCredentialResult;
}

export interface CompletenessNonceConsumer {
  /** `true` iff `nonce` is the live challenge for `sessionKey`; burns it either way. */
  consume(sessionKey: string, nonce: string): boolean;
}

export interface VerifyCompletenessOptions {
  /** The statement asked: how many owners the presenter discloses at or above the threshold. */
  readonly disclosedCount: number;
  readonly threshold?: number;
  /** The entity's owner-array anchor VC (pod-resident, untrusted). */
  readonly anchorVc: string | DatasetCore;
  readonly contentType?: string;
  /** The presenter WebID, as authenticated by the caller. */
  readonly webid: string;
  readonly nonce: string;
  readonly nonces: CompletenessNonceConsumer;
  readonly sessionKey: string;
  /** The instant to evaluate the anchor at. EXPLICIT - never the clock. */
  readonly now: Date;
  /** Anchor issuer allowlist. REQUIRED; an empty list rejects everything. */
  readonly trustedIssuers: readonly string[];
  readonly resolveKey?: VerifyCredentialOptions["resolveKey"];
  readonly isControlledBy?: VerifyCredentialOptions["isControlledBy"];
  readonly webIdFetch?: VerifyCredentialOptions["webIdFetch"];
  readonly statusFetch?: VerifyCredentialOptions["statusFetch"];
  readonly trustedStatusIssuers?: VerifyCredentialOptions["trustedStatusIssuers"];
}

const NO_CHECKS: CompletenessChecks = {
  anchor: false,
  challenge: false,
  commitmentBinding: false,
  field: false,
  nonce: false,
  proof: false,
  statement: false,
  structural: false,
  subject: false,
};

function reject(
  code: CompletenessErrorCode,
  message: string,
  checks: CompletenessChecks,
  anchor?: VerifyCredentialResult,
): CompletenessVerifyResult {
  return {
    checks,
    errors: [{ code, message }],
    verified: false,
    ...(anchor === undefined ? {} : { anchor }),
  };
}

function publicInputBigInt(value: string | undefined): bigint | undefined {
  if (value === undefined || !/^0x[0-9a-fA-F]{1,64}$/.test(value)) return undefined;
  return BigInt(value);
}

/** Typed, cardinality-checked reader over the anchor subject (untrusted RDF). */
class AnchorSubject extends TermWrapper {
  private single(predicate: string, termType: "NamedNode" | "Literal"): string | undefined {
    const values: string[] = [];
    for (const quad of this.dataset.match(
      this as unknown as Term,
      this.factory.namedNode(predicate),
      null,
      null,
    )) {
      if (quad.object.termType !== termType) return undefined;
      values.push(quad.object.value);
    }
    return values.length === 1 ? values[0] : undefined;
  }
  get fieldIri(): string | undefined {
    return this.single(MORT.field, "NamedNode");
  }
  get operandEnc(): string | undefined {
    return this.single(MORT.operandEnc, "Literal");
  }
}

/** Verify a presented completeness proof against its MANDATORY owner-array anchor. */
export async function verifyCompleteness(
  presented: PresentedCompletenessProof,
  options: VerifyCompletenessOptions,
): Promise<CompletenessVerifyResult> {
  let checks = { ...NO_CHECKS };
  if (!Array.isArray(options.trustedIssuers) || options.trustedIssuers.length === 0) {
    return reject("ANCHOR_INVALID", "trustedIssuers must be a non-empty allowlist", checks);
  }
  if (!(options.now instanceof Date) || !Number.isFinite(options.now.getTime())) {
    return reject("ANCHOR_INVALID", "now must be a valid Date", checks);
  }
  const threshold = options.threshold ?? OWNERSHIP_THRESHOLD_BPS;

  // Gate 1: structural.
  try {
    assertZkVerifierTarget(presented.verifierTarget);
  } catch (error) {
    return reject("FORBIDDEN_FLAVOUR", (error as ZkError).message, checks);
  }
  if (presented.circuit !== COMPLETENESS_CIRCUIT) {
    return reject("UNKNOWN_CIRCUIT", `"${presented.circuit}" is not the committed circuit`, checks);
  }
  if (presented.publicInputs.length !== PUBLIC_INPUT_COUNT) {
    return reject(
      "MALFORMED_PROOF",
      `expected ${PUBLIC_INPUT_COUNT} public inputs, got ${presented.publicInputs.length}`,
      checks,
    );
  }
  if (
    !(presented.proof instanceof Uint8Array) ||
    presented.proof.length === 0 ||
    presented.proof.length > MAX_PROOF_BYTES
  ) {
    return reject("MALFORMED_PROOF", "proof bytes are empty or oversized", checks);
  }
  checks = { ...checks, structural: true };

  // Gate 2: burn the challenge first.
  if (!options.nonces.consume(options.sessionKey, options.nonce)) {
    return reject("NONCE_INVALID", "challenge is not the live nonce for this session", checks);
  }
  checks = { ...checks, nonce: true };

  // Gate 3: the proof was made for this challenge.
  const challengeInput = presented.publicInputs[0];
  if (
    challengeInput === undefined ||
    !fieldHexEquals(challengeInput, await challengeFieldOf(options.nonce), "challenge")
  ) {
    return reject("CHALLENGE_MISMATCH", "proof was not produced for this challenge", checks);
  }
  checks = { ...checks, challenge: true };

  // Gate 4: the statement asked, with a true verdict.
  if (
    publicInputBigInt(presented.publicInputs[2]) !== BigInt(threshold) ||
    publicInputBigInt(presented.publicInputs[3]) !== BigInt(options.disclosedCount) ||
    publicInputBigInt(presented.publicInputs[4]) !== 1n
  ) {
    return reject(
      "STATEMENT_MISMATCH",
      "threshold, disclosed count or verdict differ from the statement asked",
      checks,
    );
  }
  checks = { ...checks, statement: true };

  // Gate 5: the anchor VC.
  let dataset: DatasetCore;
  if (typeof options.anchorVc === "string") {
    try {
      dataset = await parseCredentialRdf(options.anchorVc, options.contentType ?? "text/turtle");
    } catch (error) {
      return reject("ANCHOR_INVALID", `anchor did not parse: ${(error as Error).message}`, checks);
    }
  } else {
    dataset = options.anchorVc;
  }
  const anchor = await verifyCredential(dataset, {
    expectShape: "zk-operand-anchor",
    now: options.now,
    trustedIssuers: options.trustedIssuers,
    ...(options.resolveKey === undefined ? {} : { resolveKey: options.resolveKey }),
    ...(options.isControlledBy === undefined ? {} : { isControlledBy: options.isControlledBy }),
    ...(options.webIdFetch === undefined ? {} : { webIdFetch: options.webIdFetch }),
    ...(options.statusFetch === undefined ? {} : { statusFetch: options.statusFetch }),
    ...(options.trustedStatusIssuers === undefined
      ? {}
      : { trustedStatusIssuers: options.trustedStatusIssuers }),
  });
  if (!anchor.verified) {
    const detail = anchor.errors.map((error) => `${error.code}: ${error.message}`).join("; ");
    return reject("ANCHOR_INVALID", `owner-array anchor did not verify: ${detail}`, checks, anchor);
  }
  checks = { ...checks, anchor: true };

  // Gate 6: holder binding.
  const subject = anchor.credential?.subject;
  if (typeof options.webid !== "string" || options.webid === "" || subject !== options.webid) {
    return reject(
      "ANCHOR_SUBJECT_MISMATCH",
      "anchor subject is not the authenticated presenter",
      checks,
      anchor,
    );
  }
  checks = { ...checks, subject: true };

  // Gates 7 and 8: the anchored field and commitment.
  const node = new AnchorSubject(DataFactory.namedNode(subject), dataset, DataFactory);
  if (node.fieldIri !== MORT.beneficialOwnershipArrayCommitment) {
    return reject(
      "ANCHOR_FIELD_MISMATCH",
      "anchor does not anchor an owner-array commitment",
      checks,
      anchor,
    );
  }
  checks = { ...checks, field: true };
  const anchored = node.operandEnc;
  const committed = presented.publicInputs[1];
  if (
    anchored === undefined ||
    committed === undefined ||
    !fieldHexEquals(anchored, committed, "array_commitment")
  ) {
    return reject(
      "ANCHOR_COMMITMENT_MISMATCH",
      "proof is over an owner array other than the anchored one",
      checks,
      anchor,
    );
  }
  checks = { ...checks, commitmentBinding: true };

  // Gate 9: the cryptographic verify.
  let ok = false;
  try {
    ok = await verifyProofOn(await completenessBackend(), {
      proof: presented.proof,
      publicInputs: presented.publicInputs,
    });
  } catch (error) {
    return reject("PROOF_INVALID", `verify threw: ${(error as Error).message}`, checks, anchor);
  }
  if (!ok) return reject("PROOF_INVALID", "UltraHonk verification failed", checks, anchor);
  return { anchor, checks: { ...checks, proof: true }, errors: [], verified: true };
}
