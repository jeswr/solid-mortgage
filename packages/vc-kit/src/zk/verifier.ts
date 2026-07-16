/**
 * Tier A verification (sm-25 deliverable 2; decision 0012 - THE binding
 * posture). A bare `filter_int` proof is FULLY FORGEABLE: `operand_enc` is a
 * deterministic, salt-free term encoding anyone can compute for any value, so
 * an adversary proves `9999 >= 7000` honestly and presents it beside a genuine
 * anchor for their real, insufficient income. Every Tier A verification
 * therefore runs ALL of these gates, fail-closed - a Tier A surface without
 * the anchor check must never ship:
 *
 *  1. structural   - sanctioned flavour (`evm`, never `*-no-zk`), committed
 *                    member, 5 public inputs, member width within the field's
 *                    decision-0005 budget;
 *  2. nonce        - single-use challenge burned via the injected solid-kit
 *                    NonceStore seam BEFORE anything else (a failed attempt
 *                    consumes the challenge too);
 *  3. challenge    - the proof's `challenge` public input equals the burned
 *                    nonce's field derivation (transcript-bound freshness);
 *  4. statement    - op / bound / expected public inputs are exactly the
 *                    advertised statement with a TRUE verdict;
 *  5. anchor VC    - verifies via {@link verifyCredential} with the
 *                    `zk-operand-anchor` shape: issuer signature, issuer
 *                    allowlist, validity window, Bitstring status (revoked /
 *                    unreachable both fail);
 *  6. subject      - anchor `credentialSubject` IRI === the DPoP-verified
 *                    presenter WebID (holder binding);
 *  7. field        - anchor `mort:field` === the advertised statement field;
 *  8. operand      - anchor `mort:operandEnc` === the proof's `operand_enc`
 *                    public input (constant-time) - the forgeability gate;
 *  9. cryptography - bb.js UltraHonk verify against the COMMITTED artifact.
 *
 * ANY failure rejects. Verification is server/route-side: the WebID comes from
 * `@mortgage/solid-kit`'s `verifyApiRequest` (DPoP-bound Solid-OIDC), the
 * nonce store from `createNonceStore` - both injected, never re-implemented.
 */

import { parseCredentialRdf } from "@jeswr/solid-vc";
import { MORT, zkBudgetFor } from "@mortgage/data-model";
import type { DatasetCore, Term } from "@rdfjs/types";
import { TermWrapper } from "@rdfjs/wrapper";
import { DataFactory } from "n3";
import type { VerifyCredentialOptions, VerifyCredentialResult } from "../verify.js";
import { verifyCredential } from "../verify.js";
import {
  assertZkVerifierTarget,
  challengeFieldOf,
  fieldHexEquals,
  verifyProof,
  type ZkError,
} from "./backend.js";
import { asCommittedMember, memberDigits } from "./circuits/registry.js";
import { OP_CODES, type TierAStatement } from "./prover.js";

/** The rejection codes a Tier A verification can produce. */
export type TierAErrorCode =
  | "FORBIDDEN_FLAVOUR"
  | "UNKNOWN_MEMBER"
  | "MALFORMED_PROOF"
  | "UNKNOWN_FIELD"
  | "MEMBER_BUDGET_MISMATCH"
  | "NONCE_INVALID"
  | "CHALLENGE_MISMATCH"
  | "STATEMENT_MISMATCH"
  | "ANCHOR_INVALID"
  | "ANCHOR_SUBJECT_MISMATCH"
  | "ANCHOR_FIELD_MISMATCH"
  | "ANCHOR_OPERAND_MISMATCH"
  | "PROOF_INVALID";

export interface TierAVerificationError {
  readonly code: TierAErrorCode;
  readonly message: string;
}

/** The presented proof payload, as parsed by `tierAProofFromJson` (untrusted). */
export interface PresentedTierAProof {
  readonly member: string;
  readonly proof: Uint8Array;
  readonly publicInputs: readonly string[];
  readonly verifierTarget: string;
}

/** The single-use challenge seam - `@mortgage/solid-kit`'s NonceStore satisfies it. */
export interface TierANonceConsumer {
  /** `true` iff `nonce` is the live challenge for `sessionKey`; burns it. */
  consume(sessionKey: string, nonce: string): boolean;
}

/** Options for {@link verifyTierA}. */
export interface VerifyTierAOptions {
  /** The statement this route advertised (field IRI + op + public bound). */
  readonly statement: TierAStatement;
  /** The presenter's operand-anchor VC document (pod-resident, untrusted). */
  readonly anchorVc: string | DatasetCore;
  /** The DPoP-verified presenter WebID (from solid-kit `verifyApiRequest`). */
  readonly webid: string;
  /** The challenge nonce the presenter claims (from the POST body). */
  readonly nonce: string;
  /** The injected single-use nonce store (solid-kit `createNonceStore`). */
  readonly nonces: TierANonceConsumer;
  /** The nonce store session key the challenge was minted under. */
  readonly sessionKey: string;
  /** The instant to evaluate anchor validity at. EXPLICIT - never the clock. */
  readonly now: Date;
  /** Anchor-issuer allowlist. REQUIRED - an empty list rejects everything. */
  readonly trustedIssuers: readonly string[];
  /** Content type when `anchorVc` is a string. Default `text/turtle`. */
  readonly contentType?: string;
  /** Key/status seams forwarded to {@link verifyCredential} (inject in tests). */
  readonly resolveKey?: VerifyCredentialOptions["resolveKey"];
  readonly isControlledBy?: VerifyCredentialOptions["isControlledBy"];
  readonly webIdFetch?: VerifyCredentialOptions["webIdFetch"];
  readonly statusFetch?: VerifyCredentialOptions["statusFetch"];
  readonly trustedStatusIssuers?: VerifyCredentialOptions["trustedStatusIssuers"];
  readonly registry?: VerifyCredentialOptions["registry"];
}

/** Per-gate outcomes (observability; `verified` is their conjunction). */
export interface TierAChecks {
  readonly structural: boolean;
  readonly nonce: boolean;
  readonly challenge: boolean;
  readonly statement: boolean;
  readonly anchor: boolean;
  readonly subject: boolean;
  readonly field: boolean;
  readonly operandBinding: boolean;
  readonly proof: boolean;
}

export interface TierAVerifyResult {
  readonly verified: boolean;
  readonly checks: TierAChecks;
  readonly errors: readonly TierAVerificationError[];
  /** The anchor verification detail (present once the anchor gate ran). */
  readonly anchor?: VerifyCredentialResult;
}

const PUBLIC_INPUT_COUNT = 5;
const TRUE_FIELD = 1n;
/**
 * A generous upper bound on a presented Tier A proof (the `evm`-flavour
 * transcript is 8 384 B; the widest committed member stays well under this).
 * Rejecting oversized untrusted payloads before allocation/verify is cheap
 * defense-in-depth, not the security property itself.
 */
const MAX_PROOF_BYTES = 131_072;

/**
 * Typed reader over the anchor VC's credentialSubject node. Pod RDF is
 * untrusted input: every accessor requires EXACTLY one well-typed value and
 * returns `undefined` otherwise (the SHACL gate already enforced this - the
 * accessors are the defense-in-depth layer, term-by-term filtered).
 */
class AnchorSubjectNode extends TermWrapper {
  private single(predicateIri: string, termType: "NamedNode" | "Literal"): string | undefined {
    const values: string[] = [];
    const predicate = this.factory.namedNode(predicateIri);
    for (const quad of this.dataset.match(this as unknown as Term, predicate, null, null)) {
      if (quad.object.termType === termType) values.push(quad.object.value);
      else return undefined; // a wrongly-typed value is a failure, not noise
    }
    return values.length === 1 ? values[0] : undefined;
  }

  /** The anchored field IRI (`mort:field`), or undefined when not exactly one. */
  get fieldIri(): string | undefined {
    return this.single(MORT.field, "NamedNode");
  }

  /** The anchored term encoding (`mort:operandEnc`), or undefined likewise. */
  get operandEnc(): string | undefined {
    return this.single(MORT.operandEnc, "Literal");
  }
}

function reject(
  code: TierAErrorCode,
  message: string,
  checks: TierAChecks,
  anchor?: VerifyCredentialResult,
): TierAVerifyResult {
  return {
    verified: false,
    checks,
    errors: [{ code, message }],
    ...(anchor !== undefined ? { anchor } : {}),
  };
}

const NO_CHECKS: TierAChecks = {
  structural: false,
  nonce: false,
  challenge: false,
  statement: false,
  anchor: false,
  subject: false,
  field: false,
  operandBinding: false,
  proof: false,
};

/** Parse an untrusted 0x-hex public input to a bigint, or undefined. */
function publicInputBigInt(value: string | undefined): bigint | undefined {
  if (value === undefined || !/^0x[0-9a-fA-F]{1,64}$/.test(value)) return undefined;
  try {
    return BigInt(value);
  } catch {
    return undefined;
  }
}

/**
 * Verify a presented Tier A proof against its MANDATORY operand anchor.
 * See the module header for the nine fail-closed gates; ANY failure rejects.
 */
export async function verifyTierA(
  presented: PresentedTierAProof,
  options: VerifyTierAOptions,
): Promise<TierAVerifyResult> {
  let checks = { ...NO_CHECKS };

  // Gate 0: caller-contract guards. `trustedIssuers` and `now` are typed as
  // REQUIRED, but a caller that (mis)passes `undefined`/an invalid Date would
  // otherwise fail OPEN downstream - an empty/omitted allowlist disables the
  // issuer check in verifyCredential, and a NaN `now` makes both validity
  // comparisons false. Enforce them here, fail-closed.
  if (!Array.isArray(options.trustedIssuers) || options.trustedIssuers.length === 0) {
    return reject(
      "ANCHOR_INVALID",
      "trustedIssuers must be a non-empty allowlist (an omitted allowlist would accept any issuer)",
      checks,
    );
  }
  if (!(options.now instanceof Date) || !Number.isFinite(options.now.getTime())) {
    return reject(
      "ANCHOR_INVALID",
      "now must be a valid Date (a NaN instant would bypass the validity window)",
      checks,
    );
  }

  // Gate 1: structural.
  try {
    assertZkVerifierTarget(presented.verifierTarget);
  } catch (error) {
    return reject("FORBIDDEN_FLAVOUR", (error as ZkError).message, checks);
  }
  const member = asCommittedMember(presented.member);
  if (member === undefined) {
    return reject(
      "UNKNOWN_MEMBER",
      `"${presented.member}" is not a committed circuit member`,
      checks,
    );
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
  const budget = zkBudgetFor(options.statement.field);
  if (budget === undefined) {
    return reject(
      "UNKNOWN_FIELD",
      `statement field ${options.statement.field} is not a decision-0005 ZK-provable field`,
      checks,
    );
  }
  if (!Object.hasOwn(OP_CODES, options.statement.op)) {
    return reject("STATEMENT_MISMATCH", `unsupported operator ${options.statement.op}`, checks);
  }
  if (memberDigits(member) > budget.digits) {
    return reject(
      "MEMBER_BUDGET_MISMATCH",
      `${member} (${memberDigits(member)} digits) exceeds the ${budget.digits}-digit budget of ${budget.key}`,
      checks,
    );
  }
  checks = { ...checks, structural: true };

  // Gate 2: burn the single-use challenge FIRST - a presentation that fails a
  // later gate must not leave its challenge alive for a second attempt.
  if (!options.nonces.consume(options.sessionKey, options.nonce)) {
    return reject(
      "NONCE_INVALID",
      "challenge is not the live, unexpired, unconsumed nonce for this session",
      checks,
    );
  }
  checks = { ...checks, nonce: true };

  // Gate 3: the proof's challenge public input must be THIS nonce's field form.
  const expectedChallenge = await challengeFieldOf(options.nonce);
  const challengeInput = presented.publicInputs[0];
  if (
    challengeInput === undefined ||
    !fieldHexEquals(challengeInput, expectedChallenge, "challenge public input")
  ) {
    return reject(
      "CHALLENGE_MISMATCH",
      "proof was not produced for this session's challenge",
      checks,
    );
  }
  checks = { ...checks, challenge: true };

  // Gate 4: op / bound / expected are exactly the advertised statement, verdict TRUE.
  const op = publicInputBigInt(presented.publicInputs[2]);
  const bound = publicInputBigInt(presented.publicInputs[3]);
  const expected = publicInputBigInt(presented.publicInputs[4]);
  if (
    op !== BigInt(OP_CODES[options.statement.op]) ||
    bound !== BigInt(options.statement.bound) ||
    expected !== TRUE_FIELD
  ) {
    return reject(
      "STATEMENT_MISMATCH",
      "proof public inputs do not match the advertised statement with a true verdict",
      checks,
    );
  }
  checks = { ...checks, statement: true };

  // Gate 5: the anchor VC - signature, shape, window, status; all fail-closed.
  let dataset: DatasetCore;
  if (typeof options.anchorVc === "string") {
    try {
      dataset = await parseCredentialRdf(options.anchorVc, options.contentType ?? "text/turtle");
    } catch (error) {
      return reject(
        "ANCHOR_INVALID",
        `anchor document did not parse: ${(error as Error).message}`,
        checks,
      );
    }
  } else {
    dataset = options.anchorVc;
  }
  const anchor = await verifyCredential(dataset, {
    expectShape: "zk-operand-anchor",
    now: options.now,
    trustedIssuers: options.trustedIssuers,
    ...(options.resolveKey !== undefined ? { resolveKey: options.resolveKey } : {}),
    ...(options.isControlledBy !== undefined ? { isControlledBy: options.isControlledBy } : {}),
    ...(options.webIdFetch !== undefined ? { webIdFetch: options.webIdFetch } : {}),
    ...(options.statusFetch !== undefined ? { statusFetch: options.statusFetch } : {}),
    ...(options.trustedStatusIssuers !== undefined
      ? { trustedStatusIssuers: options.trustedStatusIssuers }
      : {}),
    ...(options.registry !== undefined ? { registry: options.registry } : {}),
  });
  if (!anchor.verified) {
    const detail = anchor.errors.map((error) => `${error.code}: ${error.message}`).join("; ");
    return reject("ANCHOR_INVALID", `operand-anchor VC did not verify: ${detail}`, checks, anchor);
  }
  checks = { ...checks, anchor: true };

  // Gate 6: holder binding - anchor subject === the DPoP-verified WebID.
  const subject = anchor.credential?.subject;
  if (
    typeof options.webid !== "string" ||
    options.webid.length === 0 ||
    subject === undefined ||
    subject !== options.webid
  ) {
    return reject(
      "ANCHOR_SUBJECT_MISMATCH",
      "anchor subject WebID is not the authenticated presenter",
      checks,
      anchor,
    );
  }
  checks = { ...checks, subject: true };

  // Gates 7+8: the anchored claims, via the typed accessor (untrusted RDF).
  const subjectNode = new AnchorSubjectNode(DataFactory.namedNode(subject), dataset, DataFactory);
  const anchoredField = subjectNode.fieldIri;
  if (anchoredField === undefined || anchoredField !== options.statement.field) {
    return reject(
      "ANCHOR_FIELD_MISMATCH",
      "anchor does not anchor the advertised statement's field",
      checks,
      anchor,
    );
  }
  checks = { ...checks, field: true };

  const anchoredEnc = subjectNode.operandEnc;
  const operandInput = presented.publicInputs[1];
  if (
    anchoredEnc === undefined ||
    operandInput === undefined ||
    !fieldHexEquals(anchoredEnc, operandInput, "operand_enc")
  ) {
    return reject(
      "ANCHOR_OPERAND_MISMATCH",
      "proof operand_enc is not the issuer-anchored encoding (decision 0012: a bare proof is forgeable)",
      checks,
      anchor,
    );
  }
  checks = { ...checks, operandBinding: true };

  // Gate 9: the cryptographic verify, against the COMMITTED artifact only.
  let proofOk = false;
  try {
    proofOk = await verifyProof(member, {
      proof: presented.proof,
      publicInputs: presented.publicInputs,
    });
  } catch {
    proofOk = false;
  }
  if (!proofOk) {
    return reject("PROOF_INVALID", "UltraHonk proof did not verify", checks, anchor);
  }
  checks = { ...checks, proof: true };

  // `verified` is the CONJUNCTION of the gates - structural honesty.
  const verified = Object.values(checks).every((passed) => passed === true);
  return { verified, checks, errors: [], anchor };
}
