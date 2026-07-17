/**
 * `@mortgage/solid-kit/mortgage-seed` — the sm-65 solid-mortgage seeding
 * layer over the upstream sm-62/63/64 stack: mort SHACL inputs
 * (`./shapes`), scripted-persona overrides incl. the backdated employment
 * VC + operand_enc canon (`./overrides`), the pod layout + injected
 * issuance seam (`./layout`), synthetic background generation
 * (`./generate`) and the shared seed orchestration (`./seed`).
 *
 * Browser-safe EXCEPT `./generate` consumers must ship `shacl-engine`;
 * nothing here imports `node:` builtins.
 */

export {
  type CapturedOperandBridge,
  capturedOperandBridge,
  type OperandEncodingJob,
  type OperandEncodingResult,
} from "./bridge.js";
export {
  type GenerateMortgageInstancesOptions,
  generateMortgageInstances,
  type MortgageGenerationTarget,
} from "./generate.js";
export {
  MORTGAGE_DOCUMENT_KINDS,
  type MortgageCredentialIssuance,
  type MortgageIssuanceContext,
  type MortgagePodLayoutOptions,
  mortgagePodLayout,
  type SeededAnchorResource,
  type SeededCredentialGroup,
  type SeedResourceBody,
} from "./layout.js";
export {
  anchorValidity,
  CAPTURED_OPERAND_ENC,
  DEMO_CREDIT_SCORE,
  DEMO_MONTHLY_INCOME_USD,
  MORTGAGE_ANCHOR_POD_PATHS,
  MORTGAGE_CREDENTIAL_POD_PATHS,
  MORTGAGE_SCHNORR_ISSUER_SEEDS,
  MORTGAGE_SEED_ISSUER_ROLES,
  MORTGAGE_WITNESS_POD_PATHS,
  type MortgageSeedIssuerRole,
  type ScriptedAnchorSeed,
  type ScriptedCredentialClaims,
  type ScriptedCredentialSeed,
  type SeedZkStatusEntry,
  scriptedCredentialSeeds,
} from "./overrides.js";
export {
  type SeededMortgagePod,
  type SeedMortgagePodOptions,
  scriptedCredentialSeedsFor,
  seedMortgagePod,
} from "./seed.js";
export { MORT_SHAPE_IRIS, MORT_SHAPES_NAMESPACE, mortgageShapesDataset } from "./shapes.js";
