# 0005 — ZK touchpoints, encodings, and digit budgets

**Status:** accepted (autonomous, 2026-07-15) — resolves research-gaps C2/C3/C10/Q7/Q8
**Inputs:** docs/research/zkp-fit.md (circuit ground truth), vocab.md §6 (to be rewritten)

ZKP appears **only at pre-qualification** (scene 2, borrower proves to two competing lenders);
formal underwriting switches honestly to full-disclosure eddsa-rdfc-2022 VCs — never prove a
property of a value the application reveals anyway.

| Statement | Encoding | Circuit | Tier |
|---|---|---|---|
| Monthly gross income ≥ $7,000 | whole USD/month, 4-digit budget | `filter_int_d4` | A (live in-browser) |
| Credit score ≥ 620 | 3-digit | `filter_int_d3` | A (live in-browser) |
| Same-subject across employer + bank VCs, non-revoked, issuer-in-set | — | `join_eq` + hidden-index revocation + issuer membership | B (native-precomputed manifest, verified live) |
| DTI | **recast (a)**: hidden monthly debts ≤ floor(0.43 × disclosed income) — public bound, one hidden operand | `filter_int_d4` | A |

Consequences: **no cents-denominated fields** (vocab's `mort:*Cents` are renamed before any IRI
is minted); per-field scaled units pinned by SHACL; appraised value is never ZK-proved (it is
disclosed in the appraisal VC). Fixture values must respect the digit budgets (M5).
Every ZK surface carries the honesty panel: research-grade, external audit pending (sparq
sq-qhy4), Simple entailment only, digit-budget/low-entropy enumeration caveats, pinned toolchain
(noir_js@1.0.0-beta.21 + bb.js@5.0.0-nightly.20260324, verifierTarget:'evm'), COOP/COEP set for
multithreaded proving. Tier A binding posture is finalised by the presentation-protocol research
(decision to follow).
