// AUTHORED-BY Claude Opus 5.5 (ported verbatim from jeswr/solid-kyb, sm-5ogg)
/**
 * PROVENANCE (do not edit by hand): `kyb_completeness_scan_n8`, the business KYB Tier B circuit.
 * Ported byte-for-byte from `jeswr/solid-kyb` (packages/vc-kit/src/zk/circuits/
 * kyb-completeness-scan-n8.ts). It is that project's own bespoke circuit, not a member of
 * sparq's `zk/compose` family. Its Noir source is committed beside this package at
 * `circuits/kyb_completeness_scan/src/main.nr`; `nargo compile --package kyb_completeness_scan`
 * with the pinned nargo 1.0.0-beta.21 reproduces this artifact.
 *
 * Relation: public (challenge, array_commitment, threshold: u64, disclosed_count: u32,
 * expected: bool), private bps[8] (u64, zero-padded). The circuit recomputes BLAKE3 over the
 * 64-byte big-endian encoding of the array, truncates it to its first 31 bytes as a field element
 * and asserts it equals `array_commitment` (the value the register anchored), then counts the
 * slots at or above `threshold` and asserts the count equals `disclosed_count`. A false claim (an
 * undisclosed owner at or above the threshold, or a wrong count) has no witness: no proof exists.
 *
 * Scope: issuer trust and revocation of the anchor are checked at the credential layer
 * (`verifyCredential`), not inside the circuit. Only `noir_version`, `hash`, `abi` and
 * `bytecode` are committed. Re-capture on any nargo / noir_js / bb.js version bump.
 */
export const KybCompletenessScanN8 = {
  noir_version: "1.0.0-beta.21+89a0f0faf3a5f1273c8ac4843b7877882437e277",
  hash: "5413342876082298475",
  abi: {
    parameters: [
      {
        name: "challenge",
        type: {
          kind: "field",
        },
        visibility: "public",
      },
      {
        name: "array_commitment",
        type: {
          kind: "field",
        },
        visibility: "public",
      },
      {
        name: "threshold",
        type: {
          kind: "integer",
          sign: "unsigned",
          width: 64,
        },
        visibility: "public",
      },
      {
        name: "disclosed_count",
        type: {
          kind: "integer",
          sign: "unsigned",
          width: 32,
        },
        visibility: "public",
      },
      {
        name: "expected",
        type: {
          kind: "boolean",
        },
        visibility: "public",
      },
      {
        name: "bps",
        type: {
          kind: "array",
          length: 8,
          type: {
            kind: "integer",
            sign: "unsigned",
            width: 64,
          },
        },
        visibility: "private",
      },
    ],
    return_type: null,
    error_types: {
      "819864067177566446": {
        error_kind: "string",
        string: "Field failed to decompose into specified 8 limbs",
      },
      "2214398065537645906": {
        error_kind: "string",
        string: "completeness count mismatch",
      },
      "12954707873476465566": {
        error_kind: "string",
        string: "array commitment mismatch",
      },
      "14259750145449831526": {
        error_kind: "string",
        string: "verdict mismatch",
      },
      "14990209321349310352": {
        error_kind: "string",
        string: "attempt to add with overflow",
      },
    },
  } as const,
  bytecode:
    "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",
} as const;
