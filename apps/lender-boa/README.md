# lender-boa — primary origination portal (sm-30)

Concept demonstration modelled on the **primary mortgage lender** role (Bank of America).
Role-first framing, no logos/trade dress, `noindex`, every figure illustrative — see
`decisions/0002` (R1–R8). **Not affiliated with, sponsored by, or endorsed by Bank of America.**

Scenes 2/3/4 of the journey:

- **Scene 2 — ZK pre-qualification** (`/prequal`, `/api/prequal/*`): the borrower's wallet
  proves income ≥ $7,000/mo and credit score ≥ 620 with zero-knowledge proofs. The verify
  route runs vc-kit `verifyTierA` — the mandatory operand-anchor check (decision 0012) plus
  eight other fail-closed gates. **No credit pull, no PII stored.**
- **Scene 3 — application** (`/application`, `/api/application/*`): URLA-subset prefill from
  the borrower's granted pod data (SHACL-revalidated), demo-locked fields, Loan Estimate
  figures derived from an application + decision written back into the pod.
- **Scene 4 — freshness** (`/freshness`, `/api/freshness*`): pre-close re-check of the
  employment VC — full `verifyCredential` (signature + issuer + window + status) AND `isFresh`
  (decision 0007); one-click re-issue request.

## Environment matrix

| Variable | Purpose | Fail-closed default |
|---|---|---|
| `MORTGAGE_TRUSTED_OIDC_ISSUERS` | Solid-OIDC issuers trusted to mint presenter tokens (scene-2 VP-POST auth) | unset ⇒ `/api/prequal/*` return 503 |
| `MORTGAGE_TRUSTED_ANCHOR_ISSUERS` | Issuers trusted to sign operand-anchor VCs (decision 0012) | unset ⇒ `/api/prequal/verify` returns 503 |
| `MORTGAGE_TRUSTED_CREDENTIAL_ISSUERS` | Issuers trusted to sign the borrower's employment/asset/credit VCs | unset ⇒ `/api/freshness` returns 503 |
| `MORTGAGE_POD_ALLOWED_ORIGINS` | SSRF allowlist of pod origins the server may read/write | unset ⇒ pod routes return 503 |
| `MORTGAGE_DEV_ALLOW_LOOPBACK` | `1` permits loopback-HTTP pods/issuers + plain (non-SSRF-pinned) dereferencing — **dev/e2e only** | off in production |
| `MORTGAGE_TRUST_FORWARDED_HEADERS` | Trust `X-Forwarded-*` for DPoP `htu` reconstruction (auto-on under `VERCEL=1`) | off unless behind a TLS-terminating proxy |

`MORTGAGE_DEV_ALLOW_LOOPBACK` relaxes only transport rules; it NEVER relaxes a verification
gate (anchor-operand equality, nonce burn, holder binding, signature, status, shape all run
identically).

## COOP/COEP

The whole zone sends `Cross-Origin-Opener-Policy: same-origin` +
`Cross-Origin-Embedder-Policy: require-corp` (`next.config.ts`) so bb.js multithreaded proving
is available. `@aztec/bb.js` and `@noir-lang/noir_js` are `serverExternalPackages` — bundling
them breaks server-side WASM instantiation (proofs then fail to verify).

## Known demo-scope limitations (tracked as beads)

- **Process-local stores** — the VP-POST nonce store, the DPoP jti replay store, and the rate
  limiter are per-process (the solid-kit documented seam). A multi-instance deployment must
  swap in a shared atomic store (Redis `SET … EX NX` / `GETDEL`); the interfaces are the seam.
- **Pod-route caller authorization** — the scene-3/4 pod routes rely on the SSRF allowlist and
  the pod's own WAC; they do not yet DPoP-authenticate the caller or bind to an approved grant
  (that arrives with the wallet grant pipeline). Real private-pod grants need a
  grant-authenticated fetch and OIDC/WAC-enabled pods.
- **Prefill signature verification** — the scene-3 prefill SHACL-validates pod credentials but
  does not yet run full `verifyCredential` on them (the seed layer signs them only once sm-26
  lands); the copy states this and the authoritative check runs at underwriting. Scene-4
  freshness DOES run full `verifyCredential`.
- **Loan terms** — the requested amount, subject property, and "approved with conditions"
  outcome are illustrative persona constants, not derived from borrower input.
