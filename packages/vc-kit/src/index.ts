/**
 * `@mortgage/vc-kit` - VC issue/verify, Bitstring status lists and re-issue
 * flows for the mortgage showcase (sm-24; decisions 0004/0007/0012).
 *
 * SECURITY-CRITICAL surface: every verification gate is fail-closed (an
 * unreachable status list, a malformed proof node, a shape violation or an
 * unresolvable key is a FAILURE, never a pass), and nothing here ever reads
 * the wall clock - `now` / validity windows are explicit parameters.
 *
 * sm-25 (ZK tiers) layers the operand-anchor checks on top of these exports:
 * issue `zk-operand-anchor` credentials via {@link issueCredential}, verify
 * them via {@link verifyCredential} with `expectShape: "zk-operand-anchor"`,
 * and read the anchored `operandEnc` off the verified subject graph.
 */

// Key handling + shared types re-exported from the pinned @jeswr/solid-vc so
// consumers need only this package.
export {
  type BitstringStatusListEntry,
  type BitstringStatusListEntryInput,
  type CredentialStatusCheck,
  createWebIdKeyResolver,
  cryptosuiteForKeyType,
  type DataIntegrityProof,
  exportPrivateJwk,
  exportPublicJwk,
  generateKeyPairForSuite,
  importKeyPair,
  importPublicKey,
  type KeyPair,
  type PublishVerificationMethodInput,
  publishVerificationMethod,
  resolveWebIdKey,
  type SuiteKeyType,
  type WebIdKeyResolver,
} from "@jeswr/solid-vc";

export {
  type AppraisalClaims,
  type AssetClaims,
  assertAbsoluteIri,
  ClaimInputError,
  type CredentialClaims,
  type CreditScoreClaims,
  type DepositAccountClaims,
  type EmploymentIncomeClaims,
  type OrganizationClaims,
  type PostalAddressClaims,
  type PropertyClaims,
  type TitleClearClaims,
  type ZkOperandAnchorClaims,
} from "./claims.js";
export { documentQuadsOf, ProofReadError, purposeIri, readProof } from "./credential.js";
export {
  type FinishIssueOptions,
  finishIssue,
  type IssueCredentialOptions,
  type IssuedCredential,
  IssueRefusedError,
  issueCredential,
  type ValidityWindow,
} from "./issue.js";
export {
  isFresh,
  ReissueError,
  type ReissueOptions,
  type ReissueResult,
  reissueCredential,
  type ValidityWindowInfo,
} from "./reissue.js";
export {
  type DeriveStatusIndexOptions,
  deriveStatusIndex,
  MIN_STATUS_LIST_LENGTH,
  StatusIndexAllocator,
  StatusListClient,
  type StatusListClientOptions,
  StatusListError,
  type StatusListWriteOptions,
} from "./status.js";
export {
  type CheckCredentialStatusOptions,
  checkCredentialStatus,
  type VcKitErrorCode,
  type VcKitVerificationError,
  type VerifiedCredentialInfo,
  type VerifyCredentialOptions,
  type VerifyCredentialResult,
  verifyCredential,
} from "./verify.js";
export {
  asCredentialKind,
  type CredentialKind,
  credentialKindOfTypes,
  credentialSchemaIri,
  MSHAPE,
  targetClassOf,
} from "./vocab.js";
