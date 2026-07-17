/**
 * sm-65 — the CAPTURED-ENCODINGS native bridge: a fail-closed stand-in for
 * the sm-26 `SparqNativeBridge` seam that serves ONLY `encodeInts` jobs, and
 * only for values whose genuine sparq term encodings were captured from the
 * real native toolchain ({@link CAPTURED_OPERAND_ENC} provenance).
 *
 * Why this is honest: `encode_int_literal` is a DETERMINISTIC PUBLIC function
 * of the value — its outputs are capturable and replayable without loss
 * (the same consuming pattern as apps/wallet and apps/verifications). What is
 * NOT capturable is per-credential Schnorr dual-signing (salted, bound to the
 * exact claim graph being issued), so any `credentials` or `composite` job is
 * REFUSED loudly — never stubbed, never fabricated. Environments with a sparq
 * checkout use the real `SparqSeedHelper` instead and get the full rail.
 */

import { CAPTURED_OPERAND_ENC } from "./overrides.js";

/** Structural subset of vc-kit seed-tooling's `SparqSeedJob`. */
export interface OperandEncodingJob {
  readonly encodeInts?: readonly number[];
  readonly credentials?: readonly unknown[];
  readonly composite?: unknown;
}

/** Structural subset of vc-kit seed-tooling's `SparqSeedResult`. */
export interface OperandEncodingResult {
  readonly encodings: Readonly<Record<string, string>>;
  readonly attestations: Readonly<Record<string, never>>;
}

/** Structural match for vc-kit seed-tooling's `SparqNativeBridge`. */
export interface CapturedOperandBridge {
  run(job: OperandEncodingJob): Promise<OperandEncodingResult>;
}

/**
 * A `SparqNativeBridge` that replays the captured genuine operand encodings
 * and refuses everything else (see the module header).
 */
export function capturedOperandBridge(): CapturedOperandBridge {
  return {
    run(job: OperandEncodingJob): Promise<OperandEncodingResult> {
      if (job.credentials !== undefined || job.composite !== undefined) {
        return Promise.reject(
          new Error(
            "capturedOperandBridge only serves encodeInts: Schnorr dual-signing and composite " +
              "witness assembly need the REAL native toolchain — construct a SparqSeedHelper " +
              "with a sparq checkout (SPARQ_CHECKOUT) instead; signatures are never stubbed",
          ),
        );
      }
      const encodings: Record<string, string> = {};
      for (const value of job.encodeInts ?? []) {
        const captured = CAPTURED_OPERAND_ENC[value];
        if (captured === undefined) {
          return Promise.reject(
            new Error(
              `no captured operand encoding for ${value} — recapture with the native toolchain ` +
                "(packages/vc-kit/scripts/capture-fixtures.mjs); encodings are never fabricated",
            ),
          );
        }
        encodings[String(value)] = captured;
      }
      return Promise.resolve({ encodings, attestations: {} });
    },
  };
}
