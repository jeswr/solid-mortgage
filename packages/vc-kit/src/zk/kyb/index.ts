// AUTHORED-BY Claude Opus 5.5
/** Business KYB ZK (demo 3): owner-share anchors, the owner-array commitment, Tier B. */

export {
  type KybAnchor,
  type KybAnchorOptions,
  mintOwnerArrayAnchor,
  mintOwnerShareAnchor,
  type SignedOwner,
  signedOwners,
} from "./anchors.js";
export { blake3SingleChunk } from "./blake3.js";
export {
  COMPLETENESS_ARRAY_SIZE,
  countAtOrAbove,
  ownershipArrayCommitment,
  padOwnershipArray,
} from "./commitment.js";
export {
  COMPLETENESS_CIRCUIT,
  type CompletenessChecks,
  type CompletenessErrorCode,
  type CompletenessNonceConsumer,
  type CompletenessProof,
  type CompletenessProofJson,
  type CompletenessVerifyResult,
  completenessProofFromJson,
  completenessProofToJson,
  OWNERSHIP_THRESHOLD_BPS,
  type PresentedCompletenessProof,
  type ProveCompletenessOptions,
  prewarmCompleteness,
  proveCompleteness,
  type VerifyCompletenessOptions,
  verifyCompleteness,
} from "./completeness.js";
