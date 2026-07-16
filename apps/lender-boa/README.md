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
- **Pod-route caller authorization (NOT an authorization boundary)** — the scene-3/4 pod
  routes have no authenticated caller, so the `pod` is caller-selected and any holder binding
  derived from it (including the freshness `subject === <pod>/profile/card#me` check) is
  defense-in-depth only: a caller can point at any allowlisted pod whose owner's credential is
  valid and read a green result. The freshness route reports on the SELECTED pod's own
  credential; it does not establish that the caller is that borrower. Caller-independent
  binding requires an authenticated borrower session / approved grant (the wallet grant
  pipeline) and is tracked in **sm-7s8** (P1): require DPoP auth, derive the WebID + authorized
  pod from the token, verify pod-owner == token-webid == credentialSubject, use a
  grant-authenticated fetch, and add cross-pod / anonymous-write substitution tests.
- **Prefill signature verification** — the scene-3 prefill only SHACL-validates pod
  credentials; it does not yet run full `verifyCredential` on them (the seed layer signs them
  only once sm-26 lands), and no separate underwriting-verification step exists yet. The UI
  copy states this plainly. Scene-4 freshness DOES run full `verifyCredential` (signature +
  trusted issuer + validity window + status) and binds the credential subject to the borrower.
- **Loan terms** — the requested amount, subject property, and "approved with conditions"
  outcome are illustrative persona constants, not derived from borrower input.
