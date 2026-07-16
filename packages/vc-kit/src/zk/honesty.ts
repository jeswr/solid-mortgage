/**
 * The decision-0005 mandatory ZK honesty-panel content (sm-25 deliverable 4),
 * as structured data for `packages/ui`'s `HonestyPanel` (and any other
 * surface). EVERY ZK surface renders these items - a ZK feature without the
 * honesty panel must not ship. Content is deliberately plain strings so apps
 * can render it in any component; tests pin the load-bearing phrases so copy
 * drift is caught.
 */

import {
  PINNED_BB_JS_VERSION,
  PINNED_NARGO_VERSION,
  PINNED_NOIR_JS_VERSION,
} from "./circuits/registry.js";
import { TIER_B_LABEL } from "./manifest.js";

export interface HonestyItem {
  /** Stable identifier (UI keys, tests). */
  readonly id: string;
  readonly title: string;
  readonly body: string;
}

/** The pinned proving toolchain (decision 0005; docs/research/zkp-fit.md). */
export const ZK_TOOLCHAIN = Object.freeze({
  noirJs: `@noir-lang/noir_js@${PINNED_NOIR_JS_VERSION}`,
  bbJs: `@aztec/bb.js@${PINNED_BB_JS_VERSION}`,
  nargo: `nargo ${PINNED_NARGO_VERSION}`,
  proofSystem: "Barretenberg UltraHonk (BN254, transparent - no trusted setup)",
  verifierTarget: "evm" as const,
});

/** The decision-0005 honesty items, in display order. */
export const ZK_HONESTY_ITEMS: readonly HonestyItem[] = Object.freeze([
  {
    id: "research-grade",
    title: "Research-grade cryptography, external audit pending",
    body:
      "The sparq zero-knowledge estate is research-grade: internally re-audited but " +
      "pending external cryptographer sign-off (sparq bead sq-qhy4). A passing proof " +
      "here is a research demonstration, not a production cryptographic guarantee.",
  },
  {
    id: "simple-entailment",
    title: "Simple entailment only",
    body:
      "Proofs are over the credential graph exactly as written (Simple entailment). " +
      "No RDFS/OWL reasoning is applied - nothing inferred, nothing normalised beyond " +
      "RDF canonicalization.",
  },
  {
    id: "digit-budget-leak",
    title: "The circuit choice leaks the value's digit count",
    body:
      "Each threshold statement uses a fixed-width circuit member (3 or 4 decimal " +
      "digits - decision 0005's budgets), so a verifier learns ceil(log10(value)) of " +
      "the hidden value: e.g. that a monthly income has 4 digits. This envelope leak " +
      "is documented in the circuit sources and is inherent to the current family.",
  },
  {
    id: "low-entropy-enumeration",
    title: "Low-entropy values can be narrowed by enumeration",
    body:
      "Term encodings are deterministic and salt-free, so a determined verifier can " +
      "enumerate candidate values (551 possible credit scores; ~10,000 possible " +
      "4-digit monthly incomes) and compare encodings. The honest guarantee is " +
      "'not disclosed and not forgeable' - never 'cannot possibly be learned'. " +
      "Identical values also produce identical encodings across issuers (linkability).",
  },
  {
    id: "toolchain-pins",
    title: "The toolchain is pinned - versions matter",
    body:
      `Proving and verifying run ${ZK_TOOLCHAIN.noirJs} + ${ZK_TOOLCHAIN.bbJs} over ` +
      `circuits compiled with ${ZK_TOOLCHAIN.nargo} (${ZK_TOOLCHAIN.proofSystem}). ` +
      "Public-input byte layout can change across bb.js nightlies, so every component " +
      "pins exact versions; proofs use the 'evm' flavour, which stays fully " +
      "zero-knowledge - the *-no-zk flavours are rejected outright.",
  },
  {
    id: "tier-a-binding",
    title: "Live proofs are bound to an issuer-signed operand anchor",
    body:
      "A live threshold proof alone is forgeable: anyone can compute the encoding of " +
      "any value and prove a true statement about it. Every live (Tier A) proof is " +
      "therefore checked against an issuer-signed operand-anchor credential - the " +
      "verifier requires the anchor's signature, its revocation status, its subject " +
      "(the presenter's WebID), its field, and the exact equality of its anchored " +
      "encoding with the proof's public input, plus a single-use challenge minted " +
      "for this session (decision 0012). If any check fails, the proof is rejected.",
  },
  {
    id: "tier-b-offline",
    title: "Composed proofs are precomputed, then verified live",
    body:
      "Cross-credential proofs (same subject across credentials, hidden-index " +
      "non-revocation, issuer-set membership) need native witness generation, so " +
      `they are proved offline at seed time and re-verified in your presence: ` +
      `"${TIER_B_LABEL}". Their challenges were fixed at capture time - freshness is ` +
      "never claimed for them.",
  },
]);

/** The full panel payload apps feed into `packages/ui`'s HonestyPanel. */
export const ZK_HONESTY = Object.freeze({
  headline:
    "Real zero-knowledge cryptography with honestly-stated limits: research-grade, " +
    "externally unaudited, and leakier than production ZK systems would be.",
  items: ZK_HONESTY_ITEMS,
  toolchain: ZK_TOOLCHAIN,
  tierBLabel: TIER_B_LABEL,
  /**
   * Multithreaded proving needs cross-origin isolation: apps set COOP
   * (`same-origin`) + COEP (`require-corp`) response headers; without them
   * proving still works, single-threaded (~4x slower).
   */
  coopCoep: "COOP: same-origin + COEP: require-corp enable multithreaded proving",
});
