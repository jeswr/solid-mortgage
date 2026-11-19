// AUTHORED-BY Claude Opus 5.5
/**
 * The Tier B owner-array commitment (ported from solid-kyb's `zk/commitment.ts`): BLAKE3 over
 * the big-endian u64 encoding of the full, zero-padded eight-slot basis-point array, truncated to
 * its first 31 bytes as a BN254 field element. `kyb_completeness_scan_n8` recomputes exactly
 * this in-circuit, so the register can anchor it at issue time without the Noir toolchain, and the
 * prover can refuse a stale array before it spends a witness solve.
 */

import { ZkError } from "../backend.js";
import { blake3SingleChunk } from "./blake3.js";

/** Fixed width of the hidden owner array the completeness circuit takes. */
export const COMPLETENESS_ARRAY_SIZE = 8;

function u64BigEndian(value: number, label: string): Uint8Array {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ZkError("BAD_COMMITMENT_INPUT", `${label} must be a non-negative safe integer`);
  }
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, BigInt(value), false);
  return out;
}

/**
 * Zero-pad `bps` to eight slots. A padding slot's 0 never reaches a positive threshold, so it can
 * never hide an owner.
 */
export function padOwnershipArray(bps: readonly number[]): readonly number[] {
  if (bps.length > COMPLETENESS_ARRAY_SIZE) {
    throw new ZkError(
      "TOO_MANY_OWNERS",
      `the completeness circuit takes at most ${COMPLETENESS_ARRAY_SIZE} owners, got ${bps.length}`,
    );
  }
  return [...bps, ...new Array<number>(COMPLETENESS_ARRAY_SIZE - bps.length).fill(0)];
}

/** The commitment over an owner array (padded here), as 64-digit lowercase 0x-hex. */
export function ownershipArrayCommitment(bps: readonly number[]): string {
  const padded = padOwnershipArray(bps);
  const bytes = new Uint8Array(COMPLETENESS_ARRAY_SIZE * 8);
  padded.forEach((value, index) => {
    bytes.set(u64BigEndian(value, `bps[${index}]`), index * 8);
  });
  const digest = blake3SingleChunk(bytes);
  let hex = "";
  for (const byte of digest.subarray(0, 31)) hex += byte.toString(16).padStart(2, "0");
  return `0x${hex.padStart(64, "0")}`;
}

/** How many owners hold `threshold` basis points or more: what a completeness proof discloses. */
export function countAtOrAbove(bps: readonly number[], threshold: number): number {
  return bps.filter((value) => value >= threshold).length;
}
