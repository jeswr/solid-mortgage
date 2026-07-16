# ZK test fixtures — provenance

## `car-hire-manifest.json`

Byte-identical copy of `site/public/zk/car-hire-manifest.json` from the sparq
read-only checkout at commit `947480b02fcbd174f80f9247b55ee02202d2e345`. It is
a GENUINE captured ProofManifest: one real UltraHonk sub-proof of the car-hire
age-gate (`filter_int_d2`, `age >= 25`, `verifierTarget: 'evm'`), produced by
sparq's `site/scripts/capture-zk-manifest.mjs` with the pinned toolchain
(`@noir-lang/noir_js@1.0.0-beta.21` + `@aztec/bb.js@5.0.0-nightly.20260324`).
The suite re-verifies it live with bb.js against this package's committed
`filter_int_d2` artifact (whose bytecode is byte-identical to the circuit the
proof was captured against — see `src/zk/circuits/filter-int-d2.ts`), and
asserts that a single flipped byte makes verification reject.

## `operand_enc` values (`test/zk-support.ts`)

Genuine sparq term encodings `h2(TYPE_CODE_LITERAL, blake3("<v>"^^xsd:integer))`,
captured from the SAME encoder the sparq scan proofs use —
`sparq_zk_compose::build::encode_int_literal` (crates/sparq-zk-compose/src/build.rs)
at checkout commit `947480b02fcbd174f80f9247b55ee02202d2e345` — via a scratch
Rust binary that printed `encode_int_literal(v).0` for each fixture value.
Poseidon2 is deliberately NOT reimplemented in JS (decision 0012): Tier A
consumes issuer-supplied encodings from anchor VCs, and these fixtures play
that issuer role in tests. The encodings are deterministic and salt-free, so
they are stable across captures — which is also exactly why a bare proof is
forgeable and the operand-anchor check is mandatory.
