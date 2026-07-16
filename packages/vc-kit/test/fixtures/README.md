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

## `dual-sign-attestations.json`

Decision-0004 dual-sign artifacts for the demo employment + asset credentials:
Poseidon2 commitments over the RDFC-1.0-canonicalised claim graphs and
Schnorr-over-Baby-JubJub signatures (`poseidon2-schnorr-v1`), STATUS-BOUND over
a HIDING index commitment (sparq sq-ayv discipline). Produced by
`sparq_zk::sig` via the helper binary. Issuer keys are deterministic DEMO seeds
(`SecretKey::from_seed` — a sparq test/tooling path, never production).

## `mortgage-composite-manifest.json`

The Tier B composite capture (decision 0005 row 3): REAL UltraHonk sub-proofs
of `join_eq_na64_nb64` (hidden same-subject equality across the two committed
credential graphs), `revoke_unset_d10` (status bit unset at a HIDDEN index) and
`hidden_issuer_d4` (a trusted-set issuer signed the commitment — which one
stays hidden), sharing ONE capture-time challenge. Native witness build
(commitments, Merkle roots, Schnorr witnesses) by `scripts/sparq-helper`;
proving mirrors sparq's `site/scripts/capture-zk-manifest.mjs`. Tier B posture
(decision 0012): "proved offline · verified live" — capture-time challenges are
NEVER challenge-fresh.

## `car-hire-manifest.json`

A re-capture of the sparq site's car-hire age-gate manifest with the SAME
inputs its `site/scripts/capture-zk-manifest.mjs` uses (`filter_int_d2`,
`age >= 25` over hidden age 30, challenge `0x1`, the committed operand anchor
for 30) against this package's committed `filter_int_d2` artifact — whose
bytecode is byte-identical to the circuit the sparq site ships.

## `circuits/*.json`

Compiled ACIR artifacts for the composite members, `nargo compile` (pinned
1.0.0-beta.21) over an unmodified copy of sparq's `zk/compose` workspace.
Slimmed to `noir_version`/`hash`/`abi`/`bytecode` (+ a provenance stub):
`debug_symbols`/`file_map` are unused by noir_js/bb.js and embed
build-machine paths. Tests INJECT these into `verifyProofManifest` exactly as
a consuming app commits its own family members (sm-25 injection seam).

## HONESTY

The sparq ZK estate is research-grade and NOT externally audited (sparq bead
sq-qhy4). A passing verify is a research demonstration, not a production
cryptographic guarantee.
