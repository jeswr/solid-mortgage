# 0015 — Cross-app authenticated-caller boundary for verifier/reader apps

**Status:** accepted (autonomous, 2026-07-16) — resolves the sm-30 roborev High (sm-7s8)
**Scope:** any app API route that reads or writes ANOTHER party's pod (lender-boa scenes 3/4
today; gse/closing/verifications readers tomorrow). Scene 2 (VP-POST, decision 0012 rail 1) is
already caller-bound and is unchanged.

## The hole this closes

The scene-3/4 pod routes took `?pod=`/`webid` from the request, so "holder binding" checks
derived from those parameters were bypassable: any caller could point the lender at any
allowlisted pod holding a valid credential and read a green result. Rule: **a server-side pod
route may never learn WHO or WHOSE POD from the request payload.** Both come from verified
credentials, or the request fails.

## The model — four layers, all fail-closed

**L1 — Caller authentication.** Every pod route requires DPoP-bound Solid-OIDC, verified by
solid-kit `verifyApiRequest` (`@jeswr/solid-api-auth`: RFC 9068 `at+jwt` + RFC 9449 proof +
jti replay + SSRF-guarded bidirectional WebID↔issuer check). Anonymous ⇒ 401 with
`WWW-Authenticate`. There is NO simulated bypass in server code, in any mode.

**L2 — Authorized-pod derivation (holder binding).** The pod is derived from the verified
token WebID by a bidirectional `pim:storage` binding, never from a parameter:

1. *Forward claim:* the WebID's own profile document (read via `@jeswr/fetch-rdf` +
   `@solid/object` `Agent.pimStorage`; DNS-pinned guarded fetch in production, loopback-mapped
   plain fetch under the dev flag) must claim `<webid> pim:storage <pod>`.
2. *Allowlist:* claimed pods are filtered through `MORTGAGE_POD_ALLOWED_ORIGINS` (SSRF rail);
   exactly ONE candidate must survive — zero or several ⇒ 403 (fail closed, never pick-first).
3. *Backward acknowledgment:* the pod must acknowledge the caller: `<pod>profile/card` — a
   resource only the pod owner can write — must assert the same
   `<webid> pim:storage <pod>` triple. When the WebID document IS `<pod>profile/card`
   (pod-rooted WebIDs, the persona convention), the forward claim was already read from an
   owner-controlled pod resource and the two checks coincide in one fetch.

   The backward check is THE load-bearing control on shared pod hosts: an ORIGIN allowlist
   cannot separate `https://pods.example/alex/` from `https://pods.example/mallory/`, and the
   forward claim is attacker-authored (anyone can put any IRI in their own profile). Only the
   victim pod's refusal to name the attacker stops cross-pod substitution.
4. Requests that carry `pod`/`webid` parameters anyway are rejected 400 (`param_rejected`) —
   overrides are refused loudly, not ignored.

**L3 — Subject binding.** `pod-owner == token-webid` is L2's invariant; every credential the
route consumes must additionally satisfy `credentialSubject == token-webid` (prefill now
enforces it on the profile + employment/asset/credit documents; freshness binds its subject
check to the token WebID instead of a path convention). A valid credential about someone else,
dropped into an attacker-bound pod, never verifies.

**L4 — Read/write authorization is POD-enforced (the grant rail, decision 0012 rail 2).**
What authorizes the lender to read the borrower's pod is the borrower's approved ODRL/DPV
grant, materialised as WAC on the pod by the wallet (sm-28) — enforcement lives at the pod,
not in lender code. The lender's pod IO therefore runs over an injectable
**grant-authenticated fetch** (`podIoFetch` seam in `lib/server/pod.ts`): the lender's own
DPoP-bound service identity, whose reads succeed exactly where a grant exists.

*Does the wallet need to mint a grant token the lender presents?* **No.** Holder binding
comes from the caller's own DPoP session (L1–L3); access enforcement is the pod's WAC; the
consent receipt (decision 0006) is an app-level audit record, not a bearer artifact. The seam
between wallet and lender is a *fetch identity + an ACL*, not a token format. (A partner-phase
capability-token rail — UMA/VC-API style — would layer onto `podIoFetch` without changing this
boundary.) **Division of work:** sm-28 implements the issuing side (grant approval pipeline
materialising WAC for the lender's WebID + receipts + the lender service identity wiring);
this bead ships the verifying/consuming side — the boundary above, the `podIoFetch` seam, and
a fail-closed default (an anonymous fetch, which a WAC-enabled pod refuses for private
resources — proven by test against the OIDC harness pod, so the demo cannot silently depend
on world-readable pods).

## Honest trust boundary per runtime mode

| Mode | Caller identity | What the boundary really guarantees |
|---|---|---|
| **1 — in-browser per-visitor pods (default, decision 0011)** | None. `demoLogin` sessions are compile- AND runtime-marked `simulated` (SIMULATED_LOGIN_DISCLOSURE) and cannot mint DPoP proofs; the visitor's pod lives in their own service worker, unreachable from server routes anyway. | Nothing — and the demo says so. The server rail is simply OFF in Mode 1: routes return 401 and the UI falls back to the demo persona with disclosure copy. Borrower persona, lender UI, and pod all execute in ONE visitor's browser, so there is no cross-principal boundary to enforce; any future Mode-1 in-browser read (sm-23/sm-28) happens client-side inside the disclosed simulation and must keep saying so. Server code never weakens to "support" Mode 1. |
| **2a — hosted read-only org pods / 2b — live login (CSS 7.1.9, decision 0011)** | Real DPoP-bound Solid-OIDC from the hosted issuer. | The full L1–L4 chain, live. This is also what e2e exercises: a real loopback issuer mints real DPoP-bound tokens against the running app. |

Residual gaps, tracked as beads, disclosed in the lender README: the lender's
grant-authenticated service identity + real WAC grants (sm-28); prefill credential-signature
verification once the seed layer signs (sm-30a/sm-26); shared atomic nonce/replay stores for
multi-instance deploys (sm-3zw); a real borrower login in the lender UI so Mode 2b is
driveable without test-injected headers (follow-up).

## Interface (for other reader apps and for sm-28)

`apps/lender-boa/lib/server/caller.ts` `createPodCallerBoundary({ config, verifier?,
rateLimiter?, seams? }).require(request) → { webid, podBase } | Response` — built on solid-kit
`createApiVerifier`/`verifyApiRequest` + `resolveAuthorizedPod` (`lib/server/owner.ts`). When a
second app needs it, hoist boundary + resolver into solid-kit unchanged (extract-on-second-use
rule). sm-28's grant pipeline swaps `podIoFetch` for the lender service identity and MAY swap
`resolveAuthorizedPod` for a grant-registry-backed resolver (grantor == token WebID, pod +
resource scope from the grant record) — the boundary contract above does not change.
