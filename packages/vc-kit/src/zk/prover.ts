/**
 * Tier A live in-browser proving (sm-25 deliverable 1; decisions 0005/0012;
 * docs/research/zkp-fit.md Q4 tier A). Proves a decision-0005 threshold
 * statement - monthly gross income >= T (USD/month, filter_int_d4), credit
 * score >= 620 (filter_int_d3) - over a HIDDEN value with the sparq
 * `filter_int` circuit family, entirely client-side:
 *
 *   private witness:  the value's decimal digits (never leaves the device);
 *   public inputs:    challenge (lender nonce), operand_enc (the issuer-anchored
 *                     term encoding), op (>=), bound, expected (true).
 *
 * The circuit binds the hidden digits to `operand_enc` in-circuit, so the
 * proof is about EXACTLY the value whose encoding the issuer signed into the
 * operand-anchor VC (decision 0012). A false verdict is UNSATISFIABLE - the
 * witness solve throws and no proof exists.
 *
 * HONESTY (decision 0005 - surface {@link ZK_HONESTY} beside every ZK UI):
 * research-grade estate, external audit pending (sparq sq-qhy4); the member
 * choice leaks the value's digit count; deterministic salt-free encodings are
 * enumerable for low-entropy values. "Not disclosed and not forgeable" - never
 * "unknowable".
 */

import { fitsZkBudget, zkBudgetFor } from "@mortgage/data-model";
import {
  challengeFieldOf,
  generateProof,
  memberBackend,
  normalizeFieldHex,
  prewarm,
  ZK_VERIFIER_TARGET,
  ZkError,
  type ZkVerifierTarget,
} from "./backend.js";
import { type FilterIntMember, memberForDigits } from "./circuits/registry.js";

/** sparq `filter_int` comparison-operator codes (zk/compose ABI). */
export const OP_CODES = Object.freeze({ ge: 3 });

/** Bounds on an untrusted wire proof payload (the evm transcript is 8 384 B). */
const MAX_WIRE_PROOF_BYTES = 131_072;
const MAX_WIRE_PUBLIC_INPUTS = 4_096;

/** A decision-0005 Tier A threshold statement (both shipped statements are >=). */
export interface TierAStatement {
  /** The proved field's mort IRI - must be one of decision 0005's ZK budgets. */
  readonly field: string;
  /** The comparison operator. The shipped statements are all `>=`. */
  readonly op: keyof typeof OP_CODES;
  /** The public threshold, in the field's decision-0005 scaled unit. */
  readonly bound: number;
}

/** Options for {@link proveTierA}. */
export interface ProveTierAOptions {
  readonly statement: TierAStatement;
  /**
   * The HIDDEN value (from the borrower's own credential in their pod). Never
   * put in any output; it exists only as the private witness.
   */
  readonly value: number;
  /**
   * The issuer-anchored term encoding of `value` - `mort:operandEnc` from the
   * borrower's operand-anchor VC. The circuit is unsatisfiable unless this is
   * exactly the encoding of `value`, so a stale/foreign anchor fails here,
   * client-side, before anything is sent.
   */
  readonly operandEnc: string;
  /** The lender-minted single-use challenge nonce (decision 0012 rail 1). */
  readonly nonce: string;
}

/** A produced Tier A proof - the wire payload for the VP-POST rail. */
export interface TierAProof {
  /** The committed circuit member the proof was produced against. */
  readonly member: FilterIntMember;
  /** The UltraHonk transcript (~8.4 kB, `evm` flavour, fully zero-knowledge). */
  readonly proof: Uint8Array;
  /** [challenge, operand_enc, op, bound, expected] as 32-byte 0x-hex. */
  readonly publicInputs: readonly string[];
  /** Always `"evm"` - the verifier re-checks and rejects anything else. */
  readonly verifierTarget: ZkVerifierTarget;
  /** Proving wall time, ms (diagnostics). */
  readonly proveMs: number;
  /** bb.js thread count used (1 unless cross-origin isolated). */
  readonly threads: number;
}

/** JSON codec of {@link TierAProof} (proof bytes as a number array, sparq-style). */
export interface TierAProofJson {
  readonly member: string;
  readonly proof: readonly number[];
  readonly publicInputs: readonly string[];
  readonly verifierTarget: string;
}

export function tierAProofToJson(proof: TierAProof): TierAProofJson {
  return {
    member: proof.member,
    proof: [...proof.proof],
    publicInputs: [...proof.publicInputs],
    verifierTarget: proof.verifierTarget,
  };
}

/**
 * Parse an UNTRUSTED wire payload into the verifier's input shape. Purely
 * structural (types/ranges) - every security check stays in `verifyTierA`.
 */
export function tierAProofFromJson(json: unknown): {
  member: string;
  proof: Uint8Array;
  publicInputs: readonly string[];
  verifierTarget: string;
} {
  if (typeof json !== "object" || json === null) {
    throw new ZkError("MALFORMED_PROOF", "proof payload is not an object");
  }
  const { member, proof, publicInputs, verifierTarget } = json as Record<string, unknown>;
  if (typeof member !== "string") {
    throw new ZkError("MALFORMED_PROOF", "proof payload has no member name");
  }
  if (typeof verifierTarget !== "string") {
    throw new ZkError("MALFORMED_PROOF", "proof payload has no verifierTarget");
  }
  if (
    !Array.isArray(proof) ||
    proof.length === 0 ||
    proof.length > MAX_WIRE_PROOF_BYTES ||
    !proof.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)
  ) {
    throw new ZkError("MALFORMED_PROOF", "proof bytes must be a non-empty, bounded byte array");
  }
  if (
    !Array.isArray(publicInputs) ||
    publicInputs.length > MAX_WIRE_PUBLIC_INPUTS ||
    !publicInputs.every((entry) => typeof entry === "string")
  ) {
    throw new ZkError("MALFORMED_PROOF", "publicInputs must be a bounded array of hex strings");
  }
  return {
    member,
    proof: Uint8Array.from(proof as number[]),
    publicInputs: publicInputs as string[],
    verifierTarget,
  };
}

/**
 * Pre-warm the Tier A prover (dynamic imports + WASM instantiate + committed
 * artifacts) on route mount so the first "prove" click pays no cold start.
 * Shares the backend's single promise chain - safe to call repeatedly.
 */
export function prewarmProver(members?: readonly FilterIntMember[]): Promise<unknown> {
  return prewarm(members);
}

/**
 * Produce a Tier A proof. Fail-closed gates BEFORE any proving work:
 *
 *  1. the statement's field must be a decision-0005 ZK budget;
 *  2. `value` AND `bound` must fit that budget ({@link fitsZkBudget} - M5);
 *  3. the value's exact digit count must have a committed circuit member
 *     (sparq derivation discipline: exact-width match, out-of-family is a
 *     clean error, never a silently-wrong member);
 *  4. `operandEnc` must be field-shaped hex.
 *
 * A below-threshold value makes the circuit UNSATISFIABLE: noir_js throws
 * from the witness solve and this function rethrows a `ZkError` with code
 * `UNSATISFIABLE` - the honest "you cannot forge eligibility" outcome.
 */
export async function proveTierA(options: ProveTierAOptions): Promise<TierAProof> {
  const { statement, value, nonce } = options;
  const budget = zkBudgetFor(statement.field);
  if (budget === undefined) {
    throw new ZkError(
      "UNKNOWN_FIELD",
      `field ${statement.field} is not a decision-0005 ZK-provable field`,
    );
  }
  if (!fitsZkBudget(statement.field, value)) {
    throw new ZkError(
      "BUDGET_VIOLATION",
      `hidden value does not fit the ${budget.digits}-digit budget [${budget.minInclusive}, ${budget.maxInclusive}] for ${budget.key}`,
    );
  }
  if (!fitsZkBudget(statement.field, statement.bound)) {
    throw new ZkError(
      "BUDGET_VIOLATION",
      `bound ${statement.bound} does not fit the budget [${budget.minInclusive}, ${budget.maxInclusive}] for ${budget.key}`,
    );
  }
  const digits = String(value);
  const member = memberForDigits(digits.length);
  if (member === undefined) {
    throw new ZkError(
      "NO_COMMITTED_MEMBER",
      `no committed filter_int member for a ${digits.length}-digit operand`,
    );
  }
  const operandEnc = normalizeFieldHex(options.operandEnc, "operandEnc");
  const challenge = await challengeFieldOf(nonce);

  const { noir, threads } = await memberBackend(member);
  const inputs = {
    challenge,
    operand_enc: operandEnc,
    op: String(OP_CODES[statement.op]),
    bound: String(statement.bound),
    expected: true,
    // PRIVATE - the exact hidden value, as ASCII digit bytes. Never disclosed.
    digits: [...digits].map((char) => String(char.charCodeAt(0))),
  };

  let witness: Uint8Array;
  try {
    ({ witness } = await noir.execute(inputs));
  } catch (error) {
    // Unsatisfiable (false verdict, or operandEnc not the encoding of value).
    throw new ZkError(
      "UNSATISFIABLE",
      `no witness exists for this statement (a false claim cannot be proved): ${(error as Error).message}`,
    );
  }

  const started = Date.now();
  const produced = await generateProof(member, witness);
  return {
    member,
    proof: produced.proof,
    publicInputs: [...produced.publicInputs],
    verifierTarget: ZK_VERIFIER_TARGET,
    proveMs: Date.now() - started,
    threads,
  };
}
