# 0014 — Dual-sign representation: Schnorr attestation as a JSON witness resource

**Status:** accepted (autonomous, 2026-07-16) — sm-26 implementation call
**Input:** decisions 0004/0012, sparq `crates/sparq-zk-compose/src/manifest.rs` (`CommitmentAttestation`)

The decision-0004 dual-signature has no RDF embedding in sparq: `sparq-vc` implements
`eddsa-rdfc-2022` only, and the Schnorr-over-Baby-JubJub attestation is a manifest-layer JSON
object (`CommitmentAttestation`). Rather than minting proof vocabulary sparq's verifier would
never read (no-minted-IRIs rule), the seed pipeline keeps the VC document single-proofed
(eddsa-rdfc-2022, Turtle) and ships the Schnorr attestation in the **borrower-only JSON witness
resource** beside the VC (`urn:sparq:zk:SeedWitness`: attestation + RDFC salt + clear ZK-status
index + index-commitment blinding) — exactly decision 0012's "witness inputs live borrower-only
beside the VC". Attestations are **status-bound over a hiding index commitment** (sparq sq-ayv:
`commitment_message_with_status(C(G), salt, status_ref_commit_digest(H(list), commit(index),
version))`), so the hidden-index revocation proof is provably about the issuer-signed index and
the salt is issuer-attested. Consequence for sm-65: the witness resource gets an owner-only ACL;
verifiers never need it (they consume the manifest + anchors + public attestation values).

Also implied: seed-time salts/blinders derive deterministically (SHA-256 label → 31 bytes) for
byte-stable fixtures; production issuance must draw them from OS entropy (linkability caveat
documented in `packages/vc-kit/src/seed-tooling/serialize.ts`).
