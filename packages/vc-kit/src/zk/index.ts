/**
 * `@mortgage/vc-kit`'s ZK layer (sm-25; decisions 0005/0012). Tier A live
 * prove/verify with MANDATORY operand-anchor binding, anchors minted from
 * captured encodings, and the decision-0005 honesty-panel content. The
 * precomputed (Tier B) proof manifests were dropped in the static rebuild.
 */

export {
  CAPTURED_OPERAND_ENCODINGS,
  type CapturedAnchor,
  capturedOperandEncoding,
  type MintCapturedAnchorOptions,
  mintCapturedOperandAnchor,
} from "./anchors.js";
export {
  challengeFieldOf,
  fieldHexEquals,
  normalizeFieldHex,
  type ProofData,
  ZK_VERIFIER_TARGET,
  ZkError,
  type ZkVerifierTarget,
} from "./backend.js";
export {
  asCommittedMember,
  COMMITTED_MEMBERS,
  type CompiledCircuitArtifact,
  type FilterIntMember,
  loadCommittedCircuit,
  memberDigits,
  memberForDigits,
  PINNED_BB_JS_VERSION,
  PINNED_NARGO_VERSION,
  PINNED_NOIR_JS_VERSION,
} from "./circuits/registry.js";
export { type HonestyItem, ZK_HONESTY, ZK_HONESTY_ITEMS, ZK_TOOLCHAIN } from "./honesty.js";
// Business KYB (demo 3): owner-share and owner-array anchors, the Tier B completeness proof.
export * from "./kyb/index.js";
export {
  OP_CODES,
  type ProveTierAOptions,
  prewarmProver,
  proveTierA,
  type TierAProof,
  type TierAProofJson,
  type TierAStatement,
  tierAProofFromJson,
  tierAProofToJson,
} from "./prover.js";
export {
  type PresentedTierAProof,
  type TierAChecks,
  type TierAErrorCode,
  type TierANonceConsumer,
  type TierAVerificationError,
  type TierAVerifyResult,
  type VerifyTierAOptions,
  verifyTierA,
} from "./verifier.js";
