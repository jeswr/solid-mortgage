// AUTHORED-BY Claude Opus 5.5
/**
 * BLAKE3 for one chunk (at most 1024 bytes, 32-byte output), in plain TypeScript.
 *
 * The completeness circuit (`kyb_completeness_scan_n8`) recomputes `std::hash::blake3` over a
 * 64-byte owner array, and the issuer has to compute the same digest to anchor it. solid-kyb used
 * `hash-wasm` for this; this package adds no dependency, so the single-chunk case is written out
 * here from the BLAKE3 specification (section 2: compression function, chunk chaining, ROOT flag).
 * Multi-chunk inputs (the tree mode) are out of scope and refused.
 *
 * Checked against the published test vectors (empty input, "abc", and the 64-byte
 * `i % 251` vector) and, end to end, by a real proof: the circuit only accepts a commitment equal
 * to its own in-circuit BLAKE3.
 */

const IV = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);
const MSG_PERMUTATION = [2, 6, 3, 10, 7, 0, 4, 13, 1, 11, 12, 5, 9, 14, 15, 8];
const CHUNK_START = 1;
const CHUNK_END = 2;
const ROOT = 8;
const BLOCK_LEN = 64;
export const BLAKE3_CHUNK_LEN = 1024;

const rotr = (x: number, n: number) => ((x >>> n) | (x << (32 - n))) >>> 0;

function g(s: Uint32Array, a: number, b: number, c: number, d: number, x: number, y: number) {
  s[a] = ((s[a] as number) + (s[b] as number) + x) >>> 0;
  s[d] = rotr((s[d] as number) ^ (s[a] as number), 16);
  s[c] = ((s[c] as number) + (s[d] as number)) >>> 0;
  s[b] = rotr((s[b] as number) ^ (s[c] as number), 12);
  s[a] = ((s[a] as number) + (s[b] as number) + y) >>> 0;
  s[d] = rotr((s[d] as number) ^ (s[a] as number), 8);
  s[c] = ((s[c] as number) + (s[d] as number)) >>> 0;
  s[b] = rotr((s[b] as number) ^ (s[c] as number), 7);
}

function round(s: Uint32Array, m: Uint32Array) {
  g(s, 0, 4, 8, 12, m[0] as number, m[1] as number);
  g(s, 1, 5, 9, 13, m[2] as number, m[3] as number);
  g(s, 2, 6, 10, 14, m[4] as number, m[5] as number);
  g(s, 3, 7, 11, 15, m[6] as number, m[7] as number);
  g(s, 0, 5, 10, 15, m[8] as number, m[9] as number);
  g(s, 1, 6, 11, 12, m[10] as number, m[11] as number);
  g(s, 2, 7, 8, 13, m[12] as number, m[13] as number);
  g(s, 3, 4, 9, 14, m[14] as number, m[15] as number);
}

/** The compression function; returns the first eight words (the new chaining value). */
function compress(cv: Uint32Array, block: Uint32Array, blockLen: number, flags: number) {
  const s = new Uint32Array(16);
  s.set(cv, 0);
  s.set(IV.subarray(0, 4), 8);
  s[12] = 0; // counter low (chunk 0)
  s[13] = 0; // counter high
  s[14] = blockLen;
  s[15] = flags;
  let m = block;
  for (let r = 0; r < 7; r += 1) {
    round(s, m);
    if (r < 6) m = Uint32Array.from(MSG_PERMUTATION, (index) => m[index] as number);
  }
  const out = new Uint32Array(8);
  for (let i = 0; i < 8; i += 1) out[i] = ((s[i] as number) ^ (s[i + 8] as number)) >>> 0;
  return out;
}

/** BLAKE3-256 of `input` (at most one 1024-byte chunk). */
export function blake3SingleChunk(input: Uint8Array): Uint8Array {
  if (input.length > BLAKE3_CHUNK_LEN) {
    throw new RangeError(`single-chunk BLAKE3 takes at most ${BLAKE3_CHUNK_LEN} bytes`);
  }
  const blocks = Math.max(1, Math.ceil(input.length / BLOCK_LEN));
  let cv = IV.slice();
  for (let index = 0; index < blocks; index += 1) {
    const bytes = input.subarray(index * BLOCK_LEN, (index + 1) * BLOCK_LEN);
    const padded = new Uint8Array(BLOCK_LEN);
    padded.set(bytes);
    const words = new Uint32Array(16);
    const view = new DataView(padded.buffer);
    for (let w = 0; w < 16; w += 1) words[w] = view.getUint32(w * 4, true);
    let flags = 0;
    if (index === 0) flags |= CHUNK_START;
    if (index === blocks - 1) flags |= CHUNK_END | ROOT;
    cv = compress(cv, words, bytes.length, flags);
  }
  const out = new Uint8Array(32);
  const view = new DataView(out.buffer);
  for (let w = 0; w < 8; w += 1) view.setUint32(w * 4, cv[w] as number, true);
  return out;
}
