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
  the borrower's granted pod data (SHACL-revalidated + subject-bound), demo-locked fields,
  Loan Estimate figures derived from an application + decision written back into the pod.
- **Scene 4 — freshness** (`/freshness`, `/api/freshness*`): pre-close re-check of the
  employment VC — full `verifyCredential` (signature + issuer + window + status) AND `isFresh`
  (decision 0007); one-click re-issue request.

**Scene-3/4 caller boundary (decision 0015, sm-7s8):** every pod route requires a DPoP-bound
Solid-OIDC caller (`verifyApiRequest`; anonymous ⇒ 401), derives the borrower WebID from the
token and the pod from the bidirectional `pim:storage` binding (WebID profile claims the pod
AND the pod's owner-controlled `profile/card` acknowledges the WebID; allowlist-filtered,
exactly one candidate), and rejects any `pod`/`webid` request parameter with 400. Every
consumed credential must additionally satisfy `credentialSubject == token WebID`. Without an
authenticated session (the default in-browser demo, decision 0011) the UI shows the demo
persona / an honest "rail off" state — the server never simulates a security property.

## Environment matrix

| Variable | Purpose | Fail-closed default |
|---|---|---|
| `MORTGAGE_TRUSTED_OIDC_ISSUERS` | Solid-OIDC issuers trusted to mint caller tokens (scene-2 VP-POST auth + the scene-3/4 pod-route boundary, decision 0015) | unset ⇒ `/api/prequal/*` and the pod routes return 503 |
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
- **Grant-authenticated pod IO (sm-28)** — the decision-0015 caller boundary is live (DPoP
  auth, token-derived pod, subject binding, override rejection — see above), but the lender's
  pod reads/writes still use the DEFAULT anonymous fetch behind the `podIoFetch` seam
  (`lib/server/pod.ts`). Against a WAC-enabled pod, private resources are therefore refused
  and the rail fails closed (proven by test) — the demo cannot silently depend on open pods —
  and it only actually READS on the open in-memory demo pods. sm-28's wallet grant pipeline
  supplies the issuing side (ODRL/DPV grant → WAC for the lender's WebID + consent receipt)
  and the lender service identity that plugs into the seam.
- **No borrower login UI in this app yet** — the authenticated scene-3/4 rail is exercised by
  tests with real DPoP sessions (e2e injects the borrower's headers); the deployed Mode-1 demo
  shows the honest demo-persona / rail-off states. A real Mode-2b login flow is a tracked
  follow-up.
- **Prefill signature verification** — the scene-3 prefill only SHACL-validates pod
  credentials; it does not yet run full `verifyCredential` on them (the seed layer signs them
  only once sm-26 lands), and no separate underwriting-verification step exists yet. The UI
  copy states this plainly. Scene-4 freshness DOES run full `verifyCredential` (signature +
  trusted issuer + validity window + status) and binds the credential subject to the borrower.
- **Loan terms** — the requested amount, subject property, and "approved with conditions"
  outcome are illustrative persona constants, not derived from borrower input.
