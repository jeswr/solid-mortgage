# zkp-fit — what sparq ZKP-over-VC can actually do in this browser/Vercel demo

Sources read: sparq checkout (read-only mirror) — `crates/sparq-zk`, `crates/sparq-zk-compose`, `crates/sparq-vc`, `zk/compose/`, `skills/zk-query-proofs/SKILL.md`, `skills/verifiable-credentials/SKILL.md`, `site/src/lib/zk-prover.ts`, `site/scripts/capture-zk-manifest.mjs`, `bench/zk-compose/*`, `research/zk-browser-perf-assessment.md`, `research/zkp-query-proofs-plan.md` — plus Jesse's ISWC 2025 paper repo. All sparq paths below are repo-relative to the sparq checkout.

## Verdict

Real in-browser ZK proving of **single threshold statements** (integer FILTER over a hidden value) is proven tech in sparq today — the site's car-hire age-gate does it with `@noir-lang/noir_js` + `@aztec/bb.js` (UltraHonk) and the exact pattern transfers to a Vercel-hosted mortgage app, faster than the existing demo because Vercel can set COOP/COEP (multithreaded proving, ~4x). Full **composed proofs** (scan + issuer attestation + revocation + cross-credential join) require the native Rust + `nargo`/`bb` toolchain — precompute those at seed time and verify sub-proofs live with bb.js. The estate is research-grade and **not externally audited** (sparq bead `sq-qhy4`); the demo must carry an honesty panel and never claim production soundness.

## Q1 — Proof system, provable statements, signature suites

**Proof system.** Noir circuits (pinned `nargo 1.0.0-beta.21`) proved with Barretenberg **UltraHonk** (`bb 5.0.0-nightly.20260324`, BN254). Stage 1 (`crates/sparq-zk`): each VC named graph is RDFC-1.0-canonicalized and committed to a **Poseidon2-BN254** commitment; issuer attests the commitment with **Schnorr-over-Baby-JubJub** (`Poseidon2SchnorrV1` — circuit-friendly, deliberately non-interoperable). Stage 2 (`crates/sparq-zk-compose`): builds per-statement circuit inputs, drives `nargo`/`bb`, bundles sub-proofs into a serializable `ProofManifest` verified against external trust anchors (issuer key-set, status list, single-use nonce). No trusted setup (UltraHonk is transparent).

**Statements provable today** (compiled members in `zk/compose/`, gate counts from `crates/sparq-zk-compose/tests/gate_count_snapshot.json`):

| Statement | Circuit member(s) | Gates | Mortgage relevance |
|---|---|---|---|
| BGP triple-pattern scan over committed VC graph (with completeness) | `scan_k{1,2}_n{16,64}_r{4,8}` | 6.0k–34.8k | binds a claim to the committed credential |
| Hidden-operand integer FILTER `?v {<,≤,>,≥,=,≠} bound` | `filter_int_d{1..4}` (non-negative, **≤ 4 decimal digits**) | 17.4k | income ≥ T, score ≥ 620, age ≥ 18 |
| Signed int / fixed-point decimal FILTER | `filter_signed_int_d{2,4}`, `filter_decimal_i3_f2` | 17.4k | rates, balances |
| Double FILTER (integer-valued fragment only) | `filter_f64_d{1..4}` | 17.4k | — |
| Hidden cross-credential equality JOIN (join term never revealed) | `join_eq_na{16,64}_nb{16,64}` | 7.0k–18.7k | same-subject across employer VC + bank VC |
| Status-list revocation, hidden index | `revoke_unset_d10` (≤1024 indices) | 0.9k | credential-not-revoked, unlinkable |
| Hidden-issuer set membership (issuer in trusted set, which one hidden) | `hidden_issuer_d4` (≤16 issuers) | 16.9k | "some accredited bureau signed this" |
| Holder proof-of-possession (clear or hidden key) | `holder_pok`, `holder_set_d4` | 10.3k/10.7k | borrower binding, anti-lending of credentials |
| Bounded property-path reachability (opt-in `extended-fragment` feature) | `path_reach_d{2,4,8}_*` | 5.2k–8.3k | org hierarchies (skip for demo) |

**Not provable today:** aggregation, arithmetic over two hidden operands (so no in-circuit DTI ratio), string/dateTime/boolean FILTER (host dual-leaf encoders exist behind an off-by-default feature; no compiled compare members), RDFS/OWL entailment (Simple only), OPTIONAL/MINUS/BIND. `build_*` returns `None` for out-of-bucket shapes — a clean error, never a wrong proof. Choosing `filter_int_d{n}` leaks `ceil(log10(value))` of the hidden operand (documented envelope leak, `zk/compose/filter_int_d2/src/main.nr`).

**Signature suites.**

| Layer | Suite | Interop | Role |
|---|---|---|---|
| ZK attestation (`sparq-zk::sig`) | Schnorr over Baby-JubJub on the Poseidon2 commitment (`Poseidon2SchnorrV1`) | none (custom) | the only suite the circuits verify; demo issuers must sign with it |
| W3C VC layer (`sparq-vc`) | `DataIntegrityProof` / **`eddsa-rdfc-2022`** (Ed25519 over RDFC-1.0 + SHA-256), `did:key`/`did:web` resolution | W3C standard | full-disclosure tamper-evidence; explicitly NOT selective disclosure, NOT ZK |
| BBS+ | **absent** | — | `sparq-vc` names `bbs-2023` as "a later phase"; nothing implemented |

The `sig::IssuerSignatureScheme` trait is the seam for an Ed25519→ZK ingest bridge, but only Schnorr is implemented — a standards-signed eIDAS-style VC cannot anchor a ZK proof today. Demo consequence: seed each credential **twice-signed** — `eddsa-rdfc-2022` for the standards story + a Schnorr commitment attestation for the ZK story. The ISWC 2025 paper (motivating example: *"Proof of Salary for a Home Loan"*) targeted the same gap via a Risc0 ZKVM proving ed25519-signed VCs directly; that lineage is a separate research artifact, not the sparq Noir estate this demo would use.

## Q2 — Browser proving / serverless verification, measured numbers

**In-browser proving works today, for standalone filter members only.** Precedent: `site/src/lib/zk-prover.ts` proves `zk/compose/filter_int_d2` (committed ACIR JSON at `site/public/zk/filter_int_d2.json`) with `@noir-lang/noir_js@1.0.0-beta.21` + `@aztec/bb.js@5.0.0-nightly.20260324` entirely in-tab, then self-verifies. What **cannot** run in-browser: witness building for the composed family — Poseidon2 graph commitments, Schnorr signing, Merkle roots, scan/join input builders are Rust-only (`sparq-zk`/`sparq-zk-compose` are `publish = false`, not in `sparq-wasm`; confirmed by `site/scripts/capture-zk-manifest.mjs`: "needs native witness generation … not feasible in the browser").

**Numbers** (indicative, non-canonical; Node, same pinned toolchain, `filter_int_d2` — from `research/zk-browser-perf-assessment.md`; native from `bench/zk-compose/family_cost_curve.json`):

| Path | Prove | Verify | Proof size |
|---|---|---|---|
| bb.js, 1 thread (no cross-origin isolation) | ~1.29 s | ~174 ms | 14,656 B (default) / **8,384 B** (`verifierTarget:'evm'`, still full-ZK) |
| bb.js, 8 threads (cross-origin isolated) | ~306–358 ms | ~63 ms | same |
| native `bb`, 8-core (per member) | 0.78–1.83 s incl. `--write_vk` | ~12 ms | 14,656 B, VK 3,680 B |

Design-doc envelope: ~25–40k gates/s in-browser bb.js on M-series; every compiled member is ≤35k gates → **sub-second to ~1.5 s browser proving** is realistic per sub-proof. Threads are gated on `window.crossOriginIsolated` (SharedArrayBuffer requires COOP+COEP — MDN). GitHub Pages can't set those headers; **Next.js on Vercel can** (`headers()` in `next.config.js` sets arbitrary response headers) — so the mortgage demo gets the ~4x multithread win the sparq site demo couldn't.

**Serverless verification:** bb.js `verifyProof` runs fine in Node (~63–174 ms) → a Vercel function or the lender app's tab can verify sub-proofs live. The **full** `verify_manifest` (nonce burn, attestation, revocation, binding-edge, public-input reconstruction gates) is Rust + `bb`-subprocess only — not Vercel-deployable and not worth reimplementing in TS (new unaudited security code). `prefilter_manifest_structure` (toolchain-free) is explicitly "NOT a sound verifier on its own".

## Q3 — Recommended ZKP touchpoints (respecting: never ZK-prove a revealed property)

Natural home in the flow: the **pre-qualification step** (borrower → lender), where the whole point is checking eligibility *without* handing over documents. At formal underwriting the demo switches honestly to full-disclosure `eddsa-rdfc-2022` VCs (verifier checks revealed values directly — the workspace rule's complement).

| # | Touchpoint | Prover | Verifier | Credential(s) consumed | Statement proved (public: op, bound, verdict; private: value) | Member |
|---|---|---|---|---|---|---|
| 1 | **Income threshold** | Borrower (browser) | Lender pre-qual app | Employer-issued income VC (Schnorr-attested commitment) | monthly gross income ≥ $T; exact income never disclosed | `filter_int_d4` (income ≤ 4 digits → use monthly USD; digit-count leak = "4-digit band") |
| 2 | **Credit-score band** | Borrower (browser) | Lender pre-qual app | Credit-bureau VC | score ≥ 620; exact score hidden. All FICO scores are 3-digit → `filter_int_d3` leaks nothing extra within the band | `filter_int_d3` |
| 3 | **Cross-credential subject consistency** (flagship differentiator — selective disclosure cannot do this) | Precomputed natively at seed time (Tier B below) | Lender app (bb.js sub-proof verify) | Employer VC + bank VC | the hidden subject identifier in both credentials is equal, without revealing it; plus hidden-index not-revoked + hidden-issuer membership as additive layers | `join_eq_*` + `revoke_unset_d10` + `hidden_issuer_d4` |

**DTI ≤ 43%:** not provable in-circuit (needs division/multiplication over two hidden values). Two honest recasts if wanted: (a) borrower discloses income (verifier checks it directly per the rule) and ZK-proves *hidden total monthly debt ≤ floor(0.43 × income)* — a plain `filter_int` with a public bound; or (b) the bureau issues a DTI-band credential and it's touchpoint-2-shaped. Don't present DTI-over-two-hidden-values as possible.

**Rule check:** in all three, the only disclosed output is the verdict bit (+ public bound/op); the proved property is never in the disclosed output. Conversely, anything the app UI displays (property price, loan amount, disclosed income in the DTI recast) must be verified by reading it, not by a proof.

**Privacy caveat that must be designed around:** term encodings for IRIs/literals are **deterministic and salt-free** (`crates/sparq-zk/src/encode.rs`, test `iris_and_literals_are_salt_independent`), and the filter's `operand_enc` is a public input. A verifier can therefore dictionary-attack low-entropy hidden values (ages: ~80 candidates; scores: 551) by enumerating encodings. The honest claim is "the value is not disclosed and cannot be forged", **not** "the verifier cannot possibly learn it". State this in the honesty panel; it is inherent to the current encoding (dual-leaf doesn't salt values either).

## Q4 — Demo posture (recommended) and fallbacks

Three tiers, all real crypto, no simulation:

| Tier | What | How | Status |
|---|---|---|---|
| **A — live in-browser prove** (touchpoints 1–2) | Borrower app proves `filter_int_d{3,4}` in-tab; lender app/route verifies with bb.js | Copy the car-hire pattern: ship nargo-compiled ACIR JSON in `public/zk/`; pin `@noir-lang/noir_js@1.0.0-beta.21` + `@aztec/bb.js@5.0.0-nightly.20260324`; `verifierTarget:'evm'` on BOTH prove and verify (8.4 kB proof, full ZK — **never** a `*-no-zk` flavour); set COOP/COEP via `next.config.js headers()` for multithreading; pre-warm the WASM backend on route mount; lender mints the `challenge` nonce per session (fix the car-hire demo's hardcoded `0x1`) | Build now — pattern is proven |
| **B — precomputed composed manifest, live verify** (touchpoint 3) | Full `ProofManifest` (2×scan + join_eq + hidden_issuer + revoke_unset + holder_pok) generated offline with the native Rust harness + `nargo`/`bb` at seed time; stored beside the VC in the borrower's pod; lender verifies each sub-proof live with bb.js `verifyProof` + structural checks in TS | Mirror `site/scripts/capture-zk-manifest.mjs`; label honestly "proved natively offline — verified live in your tab" | Build second — needs a small Rust seed-time tool (also produces the `operand_enc` fixtures Tier A needs via `encode_int_literal`; do NOT port Poseidon2 to JS) |
| **C — explicitly out of scope** | Full `verify_manifest` gate stack on Vercel; TS reimplementation of the manifest verifier; BBS+ selective disclosure | — | Skip; say so in docs |

**Fallback if bb.js proves too slow on a stakeholder's device:** the Tier-B move is the fallback — bb.js *verify* (~60–200 ms) works everywhere, so degrade "prove live" to "verify a captured proof live" (exactly the sparq site's `verifyCapturedManifest` fallback). Plain BBS+ selective disclosure is **not** a sparq fallback (not implemented); if the EDMA product phase wants standards-track SD it's an external library decision, and today's honest sparq answer is eddsa-rdfc-2022 full disclosure + ZK thresholds.

**Mandatory honesty panel (all tiers):** research-grade; internally re-audited but **pending external cryptographer sign-off (`sq-qhy4`) — a passing proof is not a production guarantee**; Simple entailment only; digit-count + low-entropy-enumeration leaks; toolchain pins matter (bb public-input byte layout changes across versions).

## Sources

Repo evidence (sparq read-only checkout; paths repo-relative):
- `skills/zk-query-proofs/SKILL.md` — statement families, compiled members, honest-scope + NOT-yet-sound caveat, toolchain pins
- `crates/sparq-zk/src/{sig.rs,encode.rs,commit.rs}` — Schnorr-BJJ suite, salt-free literal encodings, Poseidon2 commitments
- `crates/sparq-vc/src/suite.rs`, `skills/verifiable-credentials/SKILL.md` — eddsa-rdfc-2022 only; bbs-2023 deferred
- `crates/sparq-zk-compose/tests/gate_count_snapshot.json`, `bench/zk-compose/{family_cost_curve.json,prove_verify_timing.json,README.md}` — gates, prove/verify times, proof sizes
- `site/src/lib/zk-prover.ts`, `site/public/zk/filter_int_d2.json`, `site/scripts/capture-zk-manifest.mjs`, `site/package.json` — in-browser prover, captured-manifest fallback, pinned JS deps
- `research/zk-browser-perf-assessment.md` — thread-count timings, evm-flavour sizes, COOP/COEP root cause
- `research/zkp-query-proofs-plan.md` — browser-prover design envelope (~25–40k gates/s bb.js)
- `zk/compose/filter_int_d2/src/main.nr` — filter relation + digit-count leak note

External:
- ISWC 2025 paper repo (local): `samplepaper.tex` — Risc0-ZKVM + ed25519-VC design; "Proof of Salary for a Home Loan" motivating example
- Next.js `headers()` config (custom response headers incl. COOP/COEP): https://nextjs.org/docs/app/api-reference/config/next-config-js/headers
- MDN — SharedArrayBuffer requires secure context + cross-origin isolation (COOP/COEP): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer
- W3C VC Data Integrity / eddsa-rdfc-2022: https://www.w3.org/TR/vc-di-eddsa/
