# verifications — the branded issuer flows (sm-29)

Concept demonstration modelled on the **GSE-accepted verification suppliers** of the
Fannie AIM / DU validation programmes: **The Work Number (Equifax)** (employment+income),
**Mastercard Finicity** (assets), **Equifax** (credit score). Role-first framing, no
logos/trade dress, `noindex`, every figure illustrative — see `decisions/0002` (R1–R8).
**Not affiliated with, sponsored by, or endorsed by any of these organisations.**

The SUPPLIER side of the journey (scenes 1 + 4):

- **Scene 1 — fill the vault** (`POST /api/issue`): each flow signs its W3C VC 2.0
  credential through the vc-kit gate (SHACL-validated BEFORE signing, `eddsa-rdfc-2022`)
  into the AUTHENTICATED borrower's pod, **plus the decision-0012 ZK operand anchor**
  where the flow has one (employment → `mort:monthlyGrossIncomeUsd`, credit →
  `mort:creditScoreValue`; the asset flow anchors nothing — decision 0005 scopes ZK to
  income/credit fields, never balances). Claims are the PINNED vc-kit canonical
  demo-persona values — a request selects a *flow*, never a value, so the route can never
  be a signing oracle. Anchor encodings are the CAPTURED genuine
  `encode_int_literal` outputs (sparq @ 947480b0); an operand encoding is never
  fabricated. The employment window is genuinely near-expiry (−30d/+14d — the scene-4
  beat, no fake clock).
- **Bitstring status lists** (decision 0007): ONE hosted revocation list per issuer flow,
  signed by that issuer and re-signed on every mutation; created lazily on first issuance.
  Status = revocation ONLY — freshness is the validity window. The hosted document is
  never trusted off a bare GET: every issuance runs a fail-closed verify-and-refresh
  (`reinstate` of a reserved maintenance sentinel — signature/issuer checked, window
  re-anchored), and ALL writes go through a durable-window client whose `validUntil`
  always covers every credential the flow can mint, so a credential can never outlive
  its own status list.
- **Scene 4 — nothing goes stale** (`POST /api/reissue`): the one-click freshness
  re-issue through the existing grant (vc-kit `reissueCredential`): same claims (the old
  claim subgraph is proof-verified BEFORE re-signing), fresh window, fresh status index,
  old index revoked. The one-click gate additionally requires the stored credential to
  fully verify except AT MOST expiry and to attest the authenticated caller — a REVOKED
  credential is refused (re-issuing it is an explicit issuer decision). The flow's operand
  anchor is renewed in the same click (or repaired if missing — never skipped).
- **Multi-write consistency** (roborev sm-29 hardening): issuance prepares BOTH signed
  documents before any pod mutation and writes the anchor first, so no failure point can
  leave an anchor-less credential reachable; every partial state (failed write, external
  anchor deletion) is completed or repaired on retry instead of being locked out by
  `already_issued`. Re-issue compensates: if the conditional pod write fails after
  `reissueCredential` revoked the old index, the index is REINSTATED and the replacement's
  slot released — the pod-resident credential is never left pointing at a revoked index,
  and every single-failure state retries cleanly.
- **`GET /api/flows`**: the flow catalogue plus the caller's live per-flow vault state
  (issued / verified / fresh), each entry the verdict of the full fail-closed
  `verifyCredential` chain.

Decision-0015 boundary (the lender-boa/wallet/closing pod-rail pattern): callers are
DPoP-verified (L1); the pod derives from the token WebID's bidirectional `pim:storage`
binding (L2 — `pod`/`webid` request parameters are rejected 400); credentials are issued
to the authenticated WebID as subject (L3); pod IO runs over the app's OWN service
identity, which the borrower's grant names (L4) — no anonymous fallback, unconfigured
rails answer 503.

## Environment

| Variable | Purpose |
| --- | --- |
| `MORTGAGE_TRUSTED_OIDC_ISSUERS` | Comma-separated issuers trusted to mint caller tokens |
| `MORTGAGE_POD_ALLOWED_ORIGINS` | Pod origins server-side IO may touch (SSRF allowlist) |
| `MORTGAGE_DEV_ALLOW_LOOPBACK` | `1` relaxes transport (loopback http) for dev/e2e ONLY |
| `MORTGAGE_VERIFICATIONS_SERVICE_WEBID` | The app's own service WebID (decision 0015 L4) |
| `MORTGAGE_VERIFICATIONS_POD_SERVICE_ISSUER` / `_CLIENT_ID` / `_CLIENT_SECRET` | The service identity's `client_credentials` OIDC client |
| `MORTGAGE_VERIFICATIONS_<EMPLOYMENT\|ASSETS\|CREDIT>_ISSUER_WEBID` | The flow's issuing-org WebID (must publish the verification method) |
| `MORTGAGE_VERIFICATIONS_<FLOW>_ISSUER_KEY_JWK` | The issuer's PRIVATE Ed25519 JWK (server env only) |
| `MORTGAGE_VERIFICATIONS_<FLOW>_ISSUER_KEY_VM` | Verification-method IRI (default `<webid doc>#vc-key`) |
| `MORTGAGE_VERIFICATIONS_<FLOW>_STATUS_LIST_URL` | The flow's hosted Bitstring revocation list |

## Tests

`test/issuer-rail.test.ts` drives the rail END-TO-END with REAL fixtures — real
DPoP-bound Solid-OIDC tokens from loopback dev issuers, a real WAC-enforcing sparq pod as
the borrower's vault, the app's real `client_credentials` service identity for pod IO, a
second real sparq pod hosting the issuer WebID documents and status lists, and vc-kit's
real fail-closed verifier for every read-back. No mocked auth, issuance, verification or
status resolution anywhere. Its failure-injection describe wraps the real service fetch
in a one-shot transport seam to prove the partial-failure invariants: a failed anchor or
credential write never leaves an anchor-less credential and always completes on retry,
and a failed pod write after a status-list revocation is compensated (the live
credential's index is reinstated). `test/flows.test.ts` drift-guards the pinned claims
against the vc-kit canonical demo inputs, the ZK budgets, the captured encodings, and the
org-theme bindings.

Known demo-scope limit: status-list index occupancy is per-process
(`StatusIndexAllocator`) — a horizontally scaled deployment needs a shared allocator
(follow-up bead; see the issuer-rail module header).
