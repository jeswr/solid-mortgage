# 0016 — Wallet Mode-1 seed: signed vc-kit demo credentials at the persona paths

**Status:** accepted (autonomous, 2026-07-16) — sm-28 implementation decision, veto-able
**Inputs:** decision 0012 (operand anchors are never fabricated), sm-26 fixture provenance
(`packages/vc-kit/test/fixtures/operand-enc.json`), sm-20 persona fixtures

The wallet's in-browser pod (decision 0011 Mode 1) must hold credentials the borrower can
BOTH verify fail-closed AND prove Tier A statements over. Two constraints collide:

1. The sm-20 persona layer emits UNSIGNED credential documents (signing integration is the
   sm-26/sm-30a follow-up), and its ZK values (income 8200, score 745) have **no captured
   sparq operand encodings** — and encodings are never fabricated (decision 0012; capturing
   new values needs the native toolchain).
2. The vc-kit canonical demo inputs (income **8500**, score **742** — employer/role already
   mirror the sm-20 primary persona) are exactly the values whose genuine encodings were
   captured by `capture-fixtures.mjs`.

**Decision:** the Mode-1 seed keeps the sm-20 persona for the WebID profile card and the four
non-credential documents, and REPLACES the five credential resources at the same pod paths
with credentials **issued through the vc-kit gate in the pod worker at boot** — signed
`eddsa-rdfc-2022`, per-boot demo issuer identities and Bitstring status lists HOSTED ON THE
POD ORIGIN (verify-on-view runs the full chain without leaving the browser), validity windows
relative to boot time (employment −30d/+14d — scene 4 stays honest with no fake clock), ZK
values 8500/742 with the captured encodings signed into the two operand-anchor VCs.

Known consequence: the wallet displays no raw income/score anywhere (they are the ZK-hidden
values), so the 8500-vs-8200 divergence from the persona table is invisible in the UI; it
becomes observable only if a future surface prints both a persona table value and a
wallet-credential value side by side. Resolution path: either capture encodings for
8200/745 (extend `DEMO_OPERAND_VALUES`, rerun the native capture) or align
`PERSONA_VALUES` to the captured demo values — filed as a follow-up bead.

Also decided here: per-boot issuer keys are GENERATED in the worker (no private key ships in
the bundle); a per-visitor simulated pod has no cross-visitor issuer identity to preserve.
