# wallet — the borrower's Data Vault (sm-28)

Concept demonstration modelled on the **consumer data custodian** role (Verizon).
Role-first framing, no logos/trade dress, `noindex`, every figure illustrative — see
`decisions/0002` (R1–R8). **Not affiliated with, sponsored by, or endorsed by Verizon.**
The copy names the decision-0003 trust inversion explicitly: the host custodies a vault it
cannot read — user-held keys, consented and receipted access.

The central app of the journey (scenes 1/2/3/5):

- **The Mode-1 in-browser pod** (decision 0011): a REAL sparq-wasm Solid server runs in a
  `SharedWorker` (one pod per visitor, shared across tabs; dedicated-worker fallback per
  tab), seeded at boot with the demo persona's documents plus **signed** verifiable
  credentials, pod-hosted issuer identity documents and Bitstring status lists, and the
  decision-0012 operand-anchor VCs. Login is SIMULATED and impossible to hide: the
  disclosure strip renders above every route from the pod provider itself, and
  `connectBrowserPod`/`demoLogin` cannot even construct a session without the
  acknowledgement.
- **Credential wallet** (`/credentials`): verify-on-view runs the FULL fail-closed vc-kit
  chain (signature, issuer key binding, validity window, revocation status, SHACL shape)
  in the browser against pod-served documents. The employment VC is seeded genuinely
  near-expiry (−30d/+14d — the scene-4 beat, no fake clock).
- **ZK pre-qual, holder side** (`/prequal`, decision 0012 rail 1): the vault produces Tier A
  UltraHonk proofs IN THE BROWSER (income ≥ threshold, score ≥ 620; hidden values from the
  pod credentials as private witness; `operand_enc` from the pod's issuer-signed anchors)
  and VP-POSTs proof + anchor to BOTH lender zones' `/api/prequal/challenge`+`verify` rails.
  The wire contract is pinned to the real verifier by test
  (`test/present-contract.test.ts` drives lender-boa's actual `createPrequalService`).
  Holder policy is fail-closed: only `>=` statements over anchored fields, never a
  self-minted nonce, and a 401 from the live rail is surfaced honestly (a simulated session
  cannot mint DPoP proofs — decision 0015 mode table).
- **Access grants + consent-receipt ledger** (`/grants`, `/ledger`; decisions 0006 + 0015
  L4): a grant REBUILDS the pod's `/mortgage/` container ACL through the `@solid/object`
  typed wrappers — one single-agent rule per party (`acl:accessTo` + `acl:default`; Read
  always, Write/Control only where the scene needs them) — and writes a DPV consent
  receipt. **Revocation is immutable** (a withdrawn party is never silently re-granted) and
  repeats are loud 409 no-ops. The engine is ISOMORPHIC: the same state machine runs
  client-side against the in-browser pod (the disclosed simulation) and server-side over the
  wallet's service identity against a real WAC pod (proven by `test/pod-auth.test.ts` with
  real authenticated grantee reads → 200, then 401/403 after revocation).
  - **Receipt integrity** (roborev sm-28 hardening, two rounds): the authoritative ledger
    lives in a dedicated `/mortgage/receipts/` subcontainer whose OWN ACL admits writes from
    the borrower + wallet service ONLY — overriding the container's inherited `acl:default`,
    so a write-granted party cannot forge a withdrawal to lock out a competitor nor poison
    the ledger to block the borrower's own revocation. Defence in depth: grant/revoke POLICY
    reads that store STRICTLY (a transient dropout aborts the caller, never silently shrinking
    history to re-enable a revoked party) at the deterministic vault IRIs with
    name-must-match-body; a pre-existing store is TAMPER-CHECKED (a container without its lock,
    or a lock naming any agent beyond owner+service, fails closed — not first-writer-wins); a
    REVOKE removes live WAC access before any ledger read OR store provisioning. The DISPLAY
    ledger additionally shows other apps' root-level records but tolerates junk
    (skip-and-surface) and tags them `external` provenance — the UI marks them "third-party
    record, not verified by the wallet". Regression-tested in `test/ledger-integrity.test.ts`
    (forged root receipt, junk, protected-store write refusal, strict fail-closed on a
    transient protected-read) against a real granted party on a real WAC pod.
  - **Known residuals** (beads): (a) the container grant's `acl:default` Write still exposes
    non-receipt members (credentials/anchors) to a write-granted party, and the closing
    party's container Control is broader than the closing-record it needs — least-privilege
    fix spans this app + lender-boa's write paths + closing's ACL management; (b) a party
    holding container Control could pre-plant forged receipts under a matching lock (WAC alone
    cannot prove a receipt was wallet-written) — structural closure is to SIGN wallet consent
    receipts. Neither is reachable in the demo's flows (per-visitor Mode-1 pods; Mode-2 always
    creates the store on the first wallet grant, before any party grant exists).

**Mode-2 grant rail boundary (decision 0015):** every `/api/grants*`+`/api/ledger` route
requires a DPoP-bound Solid-OIDC caller (anonymous ⇒ 401), derives the pod from the token
WebID's bidirectional `pim:storage` binding (never a parameter; overrides ⇒ 400), and grants
only to OPERATOR-CONFIGURED party WebIDs resolved from short ids — a request can never name
an arbitrary grantee. Pod IO runs over the wallet's own client-credentials service identity
(the decision-0003 custodian grant names it); unconfigured ⇒ 503, never anonymous IO.

## Environment matrix

| Variable | Purpose | Fail-closed default |
|---|---|---|
| `MORTGAGE_TRUSTED_OIDC_ISSUERS` | Solid-OIDC issuers trusted to mint borrower tokens (the Mode-2 grant rail) | unset ⇒ grant routes return 503 |
| `MORTGAGE_POD_ALLOWED_ORIGINS` | SSRF allowlist of pod origins the server may touch | unset ⇒ grant routes return 503 |
| `MORTGAGE_WALLET_SERVICE_WEBID` | The wallet's own service WebID (kept in every rebuilt ACL) | unset ⇒ 503 |
| `MORTGAGE_WALLET_POD_SERVICE_ISSUER` / `_CLIENT_ID` / `_CLIENT_SECRET` | The service identity's `client_credentials` client (decision 0015 L4) | unset ⇒ 503 |
| `MORTGAGE_LENDER_SERVICE_WEBID` | Party `lender-boa` (grant modes: read+write) | unset ⇒ party absent; change ⇒ 503 |
| `MORTGAGE_LENDER53_SERVICE_WEBID` | Party `lender-53` (read) | as above |
| `MORTGAGE_GSE_SERVICE_WEBID` | Party `gse` (read) | as above |
| `MORTGAGE_CLOSING_SERVICE_WEBID` | Party `closing` (read+write+control — it manages the closing-record ACL) | as above |
| `MORTGAGE_SERVICER_SERVICE_WEBID` | Party `servicer` (read) | as above |
| `MORTGAGE_DEV_ALLOW_LOOPBACK` | `1` permits loopback-HTTP pods/issuers — **dev/e2e only** | off in production |
| `MORTGAGE_TRUST_FORWARDED_HEADERS` | Trust `X-Forwarded-*` for DPoP `htu` reconstruction (auto-on under `VERCEL=1`) | off unless behind a TLS-terminating proxy |

## COOP/COEP

The whole zone sends `Cross-Origin-Opener-Policy: same-origin` +
`Cross-Origin-Embedder-Policy: require-corp` (`next.config.ts`): the holder-side prover runs
bb.js in the page, and cross-origin isolation unlocks its multithreading. The e2e asserts
`crossOriginIsolated === true` on the proving route.

## Seed-value provenance

The ZK-provable claim values in the Mode-1 seed (income $8,500/mo, score 742) are the vc-kit
canonical demo inputs — the values whose GENUINE sparq term encodings were captured from
`encode_int_literal` (`packages/vc-kit/test/fixtures/operand-enc.json`, PROVENANCE.json).
An operand encoding is never fabricated; adding new values means re-running
`packages/vc-kit/scripts/capture-fixtures.mjs` against the native toolchain. The remaining
seed values mirror the sm-20 persona (employer, addresses, balances).

## Known demo-scope limitations (tracked as beads)

- **No borrower login UI yet** — the Mode-2 grant rail is exercised by tests with real DPoP
  sessions; the deployed Mode-1 demo runs the client-side rail inside the disclosed
  simulation. A real Mode-2b login flow is a tracked follow-up (the same gap as lender-boa).
- **Process-local stores** — the DPoP jti replay store and rate limiter are per-process;
  multi-instance deploys need the shared-store swap (same seam family as sm-3zw/sm-9kz, and
  the engine's per-pod transition lock is in-process like closing's).
- **Mode-1 grant parties are `.example` identities** — in the in-browser simulation no real
  service can read the visitor's pod (it lives in their browser); the party WebIDs are the
  persona-convention `.example` IRIs and the honesty panel says exactly what is and is not
  enforced. The hosted rail resolves parties to the real deployed service WebIDs instead.
