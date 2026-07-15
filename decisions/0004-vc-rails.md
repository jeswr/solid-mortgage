# 0004 — One VC rail: @jeswr/solid-vc + sparq seed tooling

**Status:** accepted (autonomous, 2026-07-15) — resolves research-gaps C1

All credentials are W3C VC 2.0 JSON-LD, issued/verified through **@jeswr/solid-vc** (the SDK
package with the explicit SPARQ-ZKP ProofSuite seam), stored in the borrower's pod. Credentials
participating in ZK flows are **dual-signed at seed time by sparq's native tooling**
(eddsa-rdfc-2022 + Schnorr-BJJ attestation over Poseidon2 commitments) per
docs/research/zkp-fit.md. Microsoft Entra Verified ID cannot produce Schnorr-attested,
pod-resident, RDFC-canonicalised credentials and is narrative-only (decision 0003).
`credentialSubject.id` = borrower WebID; `credentialSchema` points at our published SHACL shapes.
