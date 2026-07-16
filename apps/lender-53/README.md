# lender-53 — thin competing rate quote (sm-31)

Scene-2 concept demonstration modelled on the **competing mortgage lender** role (Fifth Third
Bank). Not affiliated with, sponsored by, or endorsed by Fifth Third Bank; not an offer of
credit.

This app is deliberately thin: a DPoP-authenticated wallet requests per-statement challenges,
presents real Tier A proofs for income ≥ $7,000/month and score ≥ 620 plus issuer-signed operand
anchors, and receives one competing illustrative rate quote only when all nine `verifyTierA`
gates pass. It has no application flow and performs no pod reads.

Environment variables (all fail closed):

- `MORTGAGE_TRUSTED_OIDC_ISSUERS`
- `MORTGAGE_TRUSTED_ANCHOR_ISSUERS`
- `MORTGAGE_DEV_ALLOW_LOOPBACK=1` for local/e2e loopback transport only
- `MORTGAGE_TRUST_FORWARDED_HEADERS=1` behind a trusted TLS-terminating proxy (automatic on Vercel)

COOP/COEP is enabled app-wide for the ZK route, and Noir/Barretenberg remain external server
packages so the real WASM verifier works.
