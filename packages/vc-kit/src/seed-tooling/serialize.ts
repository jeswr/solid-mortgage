/**
 * sm-26 - claim-graph serialisation + deterministic seed-fixture field
 * derivation shared by the dual-sign path and the fixture capture script.
 */

import { createHash } from "node:crypto";
import type { Quad } from "@rdfjs/types";
import { Writer } from "n3";
import { SeedToolingError } from "./native.js";

/**
 * Serialise the SIGNED credential subset (`IssuedCredential.claimQuads`) to
 * N-Triples for the native helper (oxttl parses it; sparq's RDFC-1.0
 * canonicalisation then normalises blank-node labels, so n3's `_:b0` naming
 * never reaches a commitment). Explicit format, house rule: n3 `Writer`.
 */
export function claimGraphToNTriples(quads: readonly Quad[]): string {
  if (quads.length === 0) {
    throw new SeedToolingError("EMPTY_CLAIM_GRAPH", "cannot commit an empty claim graph");
  }
  for (const quad of quads) {
    if (quad.graph.termType !== "DefaultGraph") {
      throw new SeedToolingError(
        "NAMED_GRAPH_CLAIM",
        "claim quads must live in the default graph - the commitment covers ONE credential graph",
      );
    }
  }
  const writer = new Writer({ format: "N-Triples" });
  writer.addQuads(quads as Quad[]);
  let body = "";
  writer.end((error, result) => {
    if (error) {
      throw new SeedToolingError("SERIALIZE_FAILED", `N-Triples write failed: ${error.message}`);
    }
    body = result;
  });
  // n3's end() callback runs synchronously for in-memory writers; guard anyway.
  if (body === "") {
    throw new SeedToolingError("SERIALIZE_FAILED", "N-Triples writer produced no output");
  }
  return body;
}

/**
 * Deterministic BN254 field element from a label: SHA-256, first 31 bytes
 * (always < 2^248 < the modulus - same construction as the Tier A
 * `challengeFieldOf`). Used for SEED-FIXTURE salts and blindings so captures
 * are reproducible byte-for-byte. FIXTURE-ONLY: production issuance draws
 * salts/blinders from OS entropy - deterministic blinders make repeat
 * presentations linkable, which a demo fixture does not care about but a
 * real wallet must.
 */
export function deriveFieldHex(label: string): string {
  if (label.length === 0) {
    throw new SeedToolingError("EMPTY_LABEL", "deriveFieldHex needs a non-empty label");
  }
  const digest = createHash("sha256").update(label, "utf8").digest();
  return `0x${digest.subarray(0, 31).toString("hex").padStart(64, "0")}`;
}
