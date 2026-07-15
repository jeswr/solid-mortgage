# 0012 — Presentation protocol, ZK binding posture, credential status

**Status:** accepted (autonomous, 2026-07-15) — resolves research-gaps Q3/Q4/Q5/Q12/Q14/M2/M7/M8
**Input:** docs/research/presentation-protocol.md

**Dual rail.** (1) **Proof presentations** (scene 2): challenge'd VP-POST to the lender's API
route — lender mints a per-session nonce; borrower wallet POSTs the VP/proof with DPoP-bound
Solid-OIDC auth verified by `@jeswr/solid-api-auth` (holder binding = token WebID must equal
`credentialSubject.id`). Shaped like OID4VP `direct_post` so the partner phase can migrate to
OID4VP 1.0 (wrong for the demo today: browser Digital Credentials API only invokes platform
wallets; JS stacks implement no credential format). (2) **Data access** (scenes 3–5): pod-native
ODRL/DPV grants via the access-manager request→approve pipeline — the lender reads granted
resources directly; every grant/revoke writes a consent receipt (decision 0006). Fallback:
pod-mediated presentation (VP written into the pod, verifier granted read).

**Tier A binding — mandatory anchor.** A bare live filter proof is **fully forgeable**:
`operand_enc` encodings are deterministic and salt-free, so an adversary can mint one for any
value. Every Tier A statement therefore requires an issuer-signed **operand-anchor VC**
(`mort:ZkOperandAnchor`: field IRI + operandEnc + subject WebID + credentialStatus,
eddsa-rdfc-2022): the verifier checks anchor signature + `anchor.operandEnc == proof public
input` + DPoP WebID == subject + fresh nonce. The filter circuit already binds hidden digits to
operand_enc in-circuit; no sparq changes needed. Never ship a Tier A surface without the anchor
check. Seed tooling emits operand_enc per hidden field.

**Tier B labelling.** Precomputed manifests can never be challenge-fresh (verifier-nonce
equality is enforced in both binding modes) — copy says **"proved offline · verified live"**.
wasm exposure of native commitment binding is feasible, staged (~days/weeks/post-audit) —
optional upstream item, not on the demo critical path.

**Status + freshness.** Bitstring Status List 1.0 per issuer app — `@jeswr/solid-vc` already
implements issue+verify fail-closed (closes Q5); it lacks only signPresentation/
verifyPresentation + challenge/domain options (~2–4 day extension → solid-sdk bead). The ZK
rail keeps its own Schnorr-bound ≤1024-entry list (W3C's 131,072 minimum exceeds
revoke_unset_d10). **Scene 4 needs no fake clock**: seed the employment VC backdated
(validFrom −30d, validUntil +14d) so it is genuinely near-expiry at demo time; green tick =
signature + window + not-revoked; witness inputs live borrower-only beside the VC in the pod.
