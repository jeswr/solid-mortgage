# ZK test fixtures — provenance

Every fixture in this directory is **programmatically captured** by
`scripts/capture-fixtures.mjs` (sm-26) from the sparq NATIVE toolchain plus the
pinned JS prover (`@noir-lang/noir_js@1.0.0-beta.21` +
`@aztec/bb.js@5.0.0-nightly.20260324`, UltraHonk, `verifierTarget: 'evm'`).
Machine-readable capture metadata (sparq checkout commit, toolchain versions,
capture date, composite nonce) lives in `PROVENANCE.json`. Regenerate with:

```sh
SPARQ_CHECKOUT=/path/to/jeswr/sparq pnpm --filter @mortgage/vc-kit run capture:fixtures
```

Prereqs: a local [jeswr/sparq](https://github.com/jeswr/sparq) checkout, the
Rust toolchain (cargo), and the pinned `nargo` on PATH. The script FAILS if
the native toolchain cannot run — no value in here is ever fabricated
(bead sm-26 rule 5), and every proof self-verified before being written.
UltraHonk transcripts are randomised (ZK masking), so re-captured proof bytes
differ run-to-run while remaining genuine and verifiable; the term encodings,
commitments and Schnorr signatures are deterministic and reproduce exactly.

## `operand-enc.json`

Genuine sparq term encodings `h2(TYPE_CODE_LITERAL, blake3("<v>"^^xsd:integer))`
from `sparq_zk_compose::build::encode_int_literal`
(crates/sparq-zk-compose/src/build.rs), via the `scripts/sparq-helper` bridge
binary. The capture asserts `encodings["30"]` equals the operand anchor the
sparq site ships in `AGE_OPERAND_ENC[30]` — a cross-check against sparq's own
capture. Poseidon2/blake3 are deliberately NOT reimplemented in JS (decision
0012): Tier A consumes issuer-supplied encodings from anchor VCs, and these
fixtures play that issuer role in tests. The encodings are deterministic and
salt-free — which is also exactly why a bare proof is forgeable and the
operand-anchor check is mandatory.

The values 0, 99, 500, 660, 720, 850, 2200 and 2860 were ported from
jeswr/solid-lending's capture at the same sparq commit (2026-07-18) for the
small-dollar lending demo (`provenance.lendingPort`); the values both captures
share (9999) are identical, and `DEMO_OPERAND_VALUES` lists all of them, so a
native re-capture reproduces the whole file.

## `dual-sign-attestations.json`

Decision-0004 dual-sign artifacts for the demo employment + asset credentials:
Poseidon2 commitments over the RDFC-1.0-canonicalised claim graphs and
Schnorr-over-Baby-JubJub signatures (`poseidon2-schnorr-v1`), STATUS-BOUND over
a HIDING index commitment (sparq sq-ayv discipline). Produced by
`sparq_zk::sig` via the helper binary. Issuer keys are deterministic DEMO seeds
(`SecretKey::from_seed` — a sparq test/tooling path, never production).

## Removed in the static rebuild

The precomputed proof manifests (`mortgage-composite-manifest.json`,
`car-hire-manifest.json`) and the composite circuit artifacts (`circuits/`)
were deleted with the code that verified them (decision 0017). The capture
script no longer produces them.

## HONESTY

The sparq ZK estate is research-grade and NOT externally audited (sparq bead
sq-qhy4). A passing verify is a research demonstration, not a production
cryptographic guarantee.
