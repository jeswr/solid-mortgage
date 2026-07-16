/**
 * `@mortgage/vc-kit/seed-tooling` (sm-26) - NODE-ONLY seed-time tooling:
 * native dual-signing (eddsa-rdfc-2022 + Schnorr-BJJ over Poseidon2
 * commitments), operand-anchor emission, Tier B ProofManifest capture, and
 * the seeder-design section 5.2 `CredentialSeedPipeline` seam.
 *
 * NEVER import this from browser code - it spawns the sparq native helper.
 * The browser-safe surface stays under the package root export.
 */

export {
  type MintAnchorsOptions,
  type MintedAnchor,
  mintOperandAnchors,
  readHiddenFieldValues,
} from "./anchors.js";
export {
  DAY_MS,
  DEMO_ASSET_CREDENTIAL_ID,
  DEMO_BACKDATED_VALIDITY,
  DEMO_INCOME_CREDENTIAL_ID,
  DEMO_ISSUER,
  DEMO_ISSUER_KEY_SET,
  DEMO_ISSUER_SEEDS,
  DEMO_NOW,
  DEMO_OPERAND_VALUES,
  DEMO_SCORE_CREDENTIAL_ID,
  DEMO_STATUS_LIST_URL,
  DEMO_SUBJECT,
  DEMO_ZK_REVOKED_DECOYS,
  DEMO_ZK_STATUS,
  DEMO_ZK_STATUS_LIST_SIZE,
  demoAssetClaims,
  demoCreditScoreClaims,
  demoEmploymentClaims,
} from "./demo.js";
export {
  assertZkStatusEntry,
  type DualSignedCredential,
  type DualSignOptions,
  dualSignCredential,
  fixtureIndexBlindingHex,
  fixtureSaltHex,
  type ZkStatusEntry,
} from "./dual-sign.js";
export {
  type CaptureCompositeOptions,
  type CapturedProofManifest,
  captureCompositeManifest,
} from "./manifest-capture.js";
export {
  SeedToolingError,
  type SparqAttestation,
  type SparqCompositeContext,
  type SparqCompositeInput,
  type SparqCredentialInput,
  type SparqNativeBridge,
  SparqSeedHelper,
  type SparqSeedHelperOptions,
  type SparqSeedJob,
  type SparqSeedResult,
  type SparqSubRelation,
  type SparqZkStatusInput,
} from "./native.js";
export {
  type CredentialSeedInput,
  type CredentialSeedPipeline,
  type CredentialSeedResult,
  type SeededAnchor,
  type SeedWitnessDocument,
  SparqCredentialSeedPipeline,
  type SparqCredentialSeedPipelineOptions,
} from "./pipeline.js";
export { claimGraphToNTriples, deriveFieldHex, randomFieldHex } from "./serialize.js";
