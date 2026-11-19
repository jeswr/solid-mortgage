// AUTHORED-BY Claude Fable 5.2
/**
 * Browser stand-in for the two `node:crypto` functions the pinned
 * `@jeswr/solid-vc` build imports: `createHash("sha256")` and `randomUUID`.
 * Alias `node:crypto` to this module in a browser bundle (see the README).
 * It is not a general `node:crypto` replacement: any other algorithm throws.
 */

import { sha256 } from "../sha256.js";

interface Sha256Hash {
  update(data: string | Uint8Array, encoding?: string): Sha256Hash;
  digest(): Uint8Array;
}

export function createHash(algorithm: string): Sha256Hash {
  if (algorithm !== "sha256") {
    throw new Error(`vc-kit browser crypto supports only sha256, not ${algorithm}`);
  }
  const chunks: Uint8Array[] = [];
  const hash: Sha256Hash = {
    digest() {
      const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const all = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        all.set(chunk, offset);
        offset += chunk.length;
      }
      return sha256(all);
    },
    update(data, encoding) {
      if (typeof data === "string") {
        if (encoding !== undefined && encoding !== "utf8" && encoding !== "utf-8") {
          throw new Error(`vc-kit browser crypto supports only utf8 input, not ${encoding}`);
        }
        chunks.push(new TextEncoder().encode(data));
      } else {
        chunks.push(data);
      }
      return hash;
    },
  };
  return hash;
}

export function randomUUID(): string {
  return globalThis.crypto.randomUUID();
}
