# presentation-protocol — borrower→verifier presentation, Tier A proof↔credential binding, and status/freshness

Answers research-gaps Q3/Q4/Q5/M2/M7 (+ Q14 in passing). Sources: `docs/research/{zkp-fit,vocab,sdk-survey,mortgage-process,research-gaps}.md` in full; read-only mirrors of sparq (`crates/sparq-zk{,-compose}`, `zk/compose`, `site/`) and solid-sdk (`apps/access-manager`, `packages/solid-vc`, `packages/solid-api-auth`); external specs verified by fetch/search 2026-07-15. Mirror paths below are repo-relative (`sparq:` / `solid-sdk:`).

## Verdict

**Presentation protocol: two rails.** Scene 2 (proofs, no data): **direct HTTPS POST of a presentation to the lender app's API route, authenticated with the borrower's existing Solid-OIDC/DPoP session** (verified server-side with `@jeswr/solid-api-auth`), against a lender-minted single-use challenge — a deliberately OID4VP-`direct_post`-shaped flow using Solid's own identity rail. Scenes 3–5 (data, no proofs): **pod-native scoped access grants** via the access-manager ODRL/DPV pipeline; the lender READS full VCs from the pod. Fallback: pod-mediated presentation (borrower writes proof bundle to pod, grants lender read). OID4VP itself is the partner-phase target, not the demo protocol.

**Tier A binding: close the gap with an issuer-signed operand anchor.** A live `filter_int` proof already binds the hidden value in-circuit to its public `operand_enc` term encoding; the missing link is issuer authority over that encoding. Have the issuer sign `operand_enc` into a tiny companion **anchor VC** (`eddsa-rdfc-2022`, verified with `@jeswr/solid-vc`) at seed time — the lender checks proof↔anchor equality plus the VC signature. This is honest, live, fresh, and needs **zero sparq changes**. Without it, a bare Tier A proof is forgeable end-to-end (§2.2). Tier B precomputed manifests stay as the composed showpiece, labelled "proved offline".

**Status/freshness: W3C Bitstring Status List 1.0 for revocation + short-validity re-issue for freshness** (they are different things — C11). Issuer apps host their own signed status lists on Vercel routes. `@jeswr/solid-vc` already implements Bitstring Status List issue+verify, fail-closed — this closes research-gaps Q5's open question. sparq's hidden-index revocation stays inside Tier B manifests as the privacy-upgrade talking point.

## 1. Presentation protocol options

Setting: borrower app (`borrower.example`) and two lender apps (different Vercel origins); all Solid apps; borrower logged in via Solid-OIDC; credentials pod-resident; proof payloads 8–30 kB (measured: one UltraHonk sub-proof 8,384 B `evm` flavour; the captured single-sub-proof manifest `sparq: site/public/zk/car-hire-manifest.json` is 30,314 B — a full Tier B family lands ~100–150 kB JSON; all trivial over POST or as a pod resource).

| # | Option | Mechanics | Assessment |
|---|--------|-----------|------------|
| i | **OID4VP 1.0** (Final, 9 Jul 2025) | Verifier Authorization Request (DCQL query, fresh `nonce`), wallet responds `vp_token` via `direct_post`; wallet invoked via Digital Credentials API or `openid4vp://` | Standards-track and where the partner phase should land, but wrong for the demo: (1) **web wallets are not invocable** — DC API (Chrome 141/Safari 26 stable, Sept 2025) fronts *platform* wallets, desktop = cross-device QR to a phone; a borrower web app can't register as a wallet; (2) the JS stacks (OWF `oid4vc-ts`, Credo, Sphereon OID4VC) implement the protocol but **no credential format** — W3C Data Integrity `ldp_vp` handling would be ours anyway; (3) it **fights the Solid model**: parallel consent surface (wallet screens vs pod grants — two "who has what" sources of truth), assumes wallet-held not pod-resident credentials, and its trust bootstrap (client metadata/x509) ignores WebID + Client Identifier Documents |
| ii | **Pod-native access grant** | Lender POSTs ODRL access request (with DPV purpose + expiry) to borrower's `ldp:inbox`; borrower approves via the access-manager CAS pipeline (grant record + DPV consent receipt + WAC materialised); lender reads the VC from the pod with its own DPoP session | The right rail for **data** (scenes 3–5): consent receipts, revocation, audit ledger (M6) all fall out of the existing `solid-sdk: apps/access-manager` code. Wrong rail for **proofs**: no challenge round-trip (a pod read can't respond to a verifier nonce), and holder binding is implicit (pod-scope + `credentialSubject.id`) rather than session-fresh |
| iii | **VP POST with challenge (LDN-shaped)** | Lender API mints `{challenge, domain}`; borrower app proves in-tab and POSTs the presentation to the lender's endpoint (advertised as `ldp:inbox` if we want LDN conformance — LDN is a W3C Rec, 2 May 2017: discover inbox, POST JSON-LD, 201) | **Recommended for proofs.** Fresh challenge, real cross-origin flow, 30 kB payloads fine, maps 1:1 onto OID4VP `direct_post` later. Holder binding has two implementations (§1.2) |
| iv | **Bespoke signed POST** | Same as (iii) minus the standard framing | Strictly dominated by (iii): same code, less story. Merge into (iii) |
| — | CHAPI (credential-handler polyfill) | Browser polyfill mediating web-wallet get()/store() via authn.io | The only true *web-wallet* invocation today, but adds a third-party mediator + emulated browser UI; Digital Bazaar-maintained polyfill, niche adoption. Not chosen; note it in the prior-art survey (M4) |

### Evaluation matrix

| Criterion | (i) OID4VP | (ii) pod grant | (iii) VP-POST | (iv) bespoke |
|---|---|---|---|---|
| Challenge freshness / replay | ✅ nonce, spec'd | ❌ none (reads) | ✅ lender-minted single-use nonce; DPoP `htu/htm/jti` adds transport anti-replay | ✅ same |
| Holder binding cross-origin | wallet key + Key Binding JWT | implicit: only pod owner can author the ACL; `credentialSubject.id` = WebID | ✅ DPoP-bound Solid-OIDC WebID (server-verified), upgrade: holder-signed VP | same |
| DPoP/WebID auth reuse | ❌ parallel identity rail | ✅ native | ✅ `@jeswr/solid-api-auth` verifies the same session | ✅ |
| ZK proof transport (8–150 kB) | vp_token fits but no ProofManifest format profile exists | ✅ pod resource | ✅ POST body | ✅ |
| Demo comprehensibility | ❌ wallet hand-offs, QR codes | ✅ consent screen beat | ✅ one tab: "Get quotes" → prove → two verified quote cards | ✅ |
| Partner-phase generalisation | ✅ the target | ✅ the Solid story EDMA came for | ✅ mechanical migration to OID4VP (§1.3) | ❌ |

**Decision: (iii) for proofs + (ii) for data.** They are complements, not competitors — scene 2 shares *proofs about* data; scene 3 shares *the data*; the LDN inbox is the shared transport idiom (lender→borrower access requests in scene 3, borrower→lender presentations in scene 2 if we advertise the lender endpoint as its inbox). **Fallback** (if bb.js-in-Vercel-function or CORS turns hostile): pod-mediated presentation — lender's quote request (with nonce) lands in the borrower inbox, borrower writes `{anchor VC, proof}` to a pod resource and grants that single resource to the lender; slower choreography, no lender inbound endpoint needed, same artifacts.

### 1.1 Recommended flow (scene 2, per lender)

1. `GET https://lender.example/api/prequal/challenge` → `{ "challenge": "0x<31-byte-hex>", "domain": "https://lender.example", "expires": … }` (challenge fits a BN254 field element — it is fed to the circuit as the `challenge` public input; single-use, stored server-side).
2. Borrower tab proves `filter_int_d4` (income ≥ $7,000/mo) and `filter_int_d3` (score ≥ 620) with `@noir-lang/noir_js` + `@aztec/bb.js` (`verifierTarget:'evm'`, COOP/COEP set → multithreaded) — the zkp-fit Tier A pattern, with the lender's challenge instead of the sparq site's hardcoded `0x1`.
3. `POST https://lender.example/api/prequal/present` with the borrower's DPoP-bound Solid-OIDC access token + DPoP proof; body: `{ anchors: [incomeAnchorVC, scoreAnchorVC], proofs: [{member, proof, publicInputs}, …], challenge }` (~50 kB).
4. Lender API route (Node): `@jeswr/solid-api-auth` `authenticate()` → verified borrower WebID (owner gate off — any borrower); check challenge is theirs + unused + unexpired, burn it; for each pair: `@jeswr/solid-vc` `verifyCredential(anchor)` (issuer trust list, validity, **Bitstring status**), `anchor.credentialSubject.id === webId`, `anchor.operandEnc === proof.publicInputs[operand_enc]`, `publicInputs[challenge] === challenge`, op/bound/expected as advertised, then bb.js `verifyProof` (~63–174 ms). All checks fail-closed.
5. Response: rate quote. UI shows "what the lender received" (proof bytes + 5 public inputs — no income, no score).

Replay store: in-memory Map is fine for the demo (note: multi-instance Vercel would need KV — same caveat sparq documents for `FileSeenNonces` single-host scope).

### 1.2 Holder binding, two implementations

| Tier | Mechanism | Status |
|---|---|---|
| Build now | **DPoP rail**: the POST carries the borrower's DPoP-bound access token; `solid-api-auth` verifies issuer, signature, DPoP proof, replay, WebID↔issuer binding, and returns the WebID; lender matches it to `credentialSubject.id` | `solid-sdk: packages/solid-api-auth` (server-only, has `/next` adapter; `authenticate()` works without the fixed-owner gate — `core.ts:866`) |
| Standards polish | **Holder-signed VP**: borrower holds an Ed25519 key published as `sec:Multikey` in their WebID profile; VP signed with `proofPurpose: authentication` + `challenge` + `domain` (VC-DI 1.0, W3C Rec 15 May 2025 — challenge/domain are the spec's replay mitigation); lender resolves the key from the WebID document | `solid-vc` has the fail-closed WebID Multikey publish/resolve reference implementation (`webid.ts`: `publishVerificationMethod`, `resolveWebIdKey`, authoritative-document discipline, redirects refused) and `Presentation`/`VerifiablePresentation` types — but **no presentation signing and no `challenge`/`domain` proof options yet** (`DataIntegrityProof` in `types.ts` lacks both; `issue.ts` signs credentials only). Well-scoped extension in Jesse's own package, est. 2–4 days |

Ship the DPoP rail for the demo; add the signed-VP rail when the `solid-vc` extension lands — it makes the presentation a self-contained W3C artifact (better partner-phase optics) instead of one whose holder binding lives in transport headers.

### 1.3 OID4VP migration map (partner phase)

| Demo piece | OID4VP 1.0 equivalent |
|---|---|
| `GET /challenge` | Authorization Request (`nonce`, `client_id`), DCQL query for the anchor-VC type |
| DPoP-authenticated POST | `direct_post` response mode (`vp_token`) |
| anchor VC + proof bundle | `vp_token` entry; ProofManifest would need a format profile (no standard exists — candidate upstream/CG contribution) |
| WebID + Client Identifier Document | client metadata / verifier attestation |
| Wallet = borrower web app over pod | wallet invocation via DC API — requires a platform wallet or the pod host shipping one; this is exactly the pod-host "consumer data wallet" product-phase story |

### 1.4 What the pod-grant rail reuses

From `solid-sdk: apps/access-manager` (per its README): ODRL-shaped inbox requests (`odrl:permission` + DPV purpose + `odrl:dateTime` expiry), lenient untrusted-RDF parsing (`src/lib/inbox.ts`), the CAS-pinned approve pipeline (deterministic grantId, create-only grant records, If-Match WAC writes), DPV consent receipts (`dpv:hasConsentStatus`) and one-click revocation — which is also the substrate for the scene-5 audit-ledger beat (M6) and answers Q14: witness inputs (exact income digits) never leave the full income VC in the pod, ACL'd to the borrower only; anchor VCs and Tier B manifests sit beside it, shared per grant.

## 2. Tier A binding: what binds the live proof to the issuer

### 2.1 Mechanics (from source)

The `filter_int` circuit (`sparq: zk/compose/filter_int_d2/src/main.nr`) takes public `(challenge, operand_enc, op, bound, expected)` and private `digits`, rebuilds the canonical `"<digits>"^^xsd:integer` N-Triples token in-circuit, and asserts `h2(TYPE_CODE_LITERAL, blake3(token)) == operand_enc` plus the comparison verdict. So the hidden value **is** cryptographically bound — to `operand_enc`. (`challenge` is unused in the relation — `let _ = challenge;` — but as a public input it is baked into the UltraHonk transcript, so a proof only verifies against the exact nonce it was proved for; sparq's verifier additionally requires the manifest binding challenge to equal the verifier nonce in *both* binding modes — `verifier.rs:1667,5000`.) The literal encoding is **deterministic and salt-free** (`sparq: crates/sparq-zk/src/encode.rs`), so `operand_enc` is computable by anyone from the value. Issuer authority enters only via the Poseidon2 graph commitment + Schnorr-BJJ attestation + a **scan proof** linking `operand_enc` to a committed leaf — and that witness building is native-Rust-only (Tier B).

### 2.2 Honest options

| Option | What the verifier checks | What an adversary can fake | Verdict |
|---|---|---|---|
| **(a) Tier B precomputed bound manifest, presented live** | Full family (scan + filter + join + attestation + revocation + holder), each sub-proof bb.js-verified in the lender tab/route; structural checks in TS | Nothing about the statement — but the challenge was fixed at capture time, so **freshness is fake if claimed**: any holder of the manifest file can replay it (mitigated by DPoP holder auth + pod ACLs, not by the crypto). sparq's `HolderPop` mode adds a fresh signature over a new nonce, but signing is Schnorr-BJJ (Rust-only) and the sub-proof challenges are still baked — precompute can never satisfy a live nonce | Keep for touchpoint 3 (cross-credential join) with "proved offline at seed time" labelling |
| **(b) bare Tier A live proof + separately-verified commitment VC** | Live filter proof (fresh nonce) + issuer-signed commitment attestation checked out-of-band | **The entire claim.** Nothing links the proof's `operand_enc` to the attested commitment without the scan proof. The adversary computes `operand_enc = h2(LITERAL, blake3("9999"^^xsd:integer))` for any value they like, proves the threshold over it honestly, and presents it beside a genuine commitment VC for their real (insufficient) income. Every check passes | **Do not ship.** The commitment VC is security theatre here |
| **(b1) Tier A + issuer-signed operand anchor** ⭐ | Issuer signs a companion **anchor VC** at issuance: `{ type: mort:ZkOperandAnchor, credentialSubject: { id: <WebID>, mort:field: mort:monthlyGrossIncomeUsd, mort:operandEnc: "0x…" }, credentialStatus, validFrom/Until }` (`eddsa-rdfc-2022`, seed tool computes `operand_enc` via `encode_int_literal` — the same fixtures Tier A needs anyway per zkp-fit). Lender: VC signature + issuer trust + status + validity + subject==DPoP WebID + `operandEnc == proof.operand_enc` + fresh challenge + bb.js verify | Cannot fake the threshold (circuit unsatisfiable for a false verdict over the signed encoding); cannot present another subject's anchor (WebID mismatch); cannot replay (nonce). **Residual, disclose honestly:** (1) member choice leaks `ceil(log10(v))`; (2) salt-free `operand_enc` is **dictionary-attackable** for low-entropy values (~10⁴ monthly incomes, 551 scores) — claim "not disclosed, not forgeable", never "cannot be learned"; (3) identical values produce identical encodings across issuers (linkability); (4) trusts the issuer to compute `operand_enc` from the true value — but the issuer already attests the value itself, so no new trust; (5) research-grade estate, external audit pending (sq-qhy4) | **Recommended.** Real end-to-end binding, live and fresh, zero sparq changes, all verification in existing JS (`solid-vc` + bb.js) |
| **(c) upstream: expose commitment binding to wasm** | Browser builds real scan+filter witnesses over the committed credential and proves the composed statement live | — | Feasible, staged (below); not on the demo critical path |

**(c) feasibility/effort** (from the mirrors): `sparq-zk`'s deps are wasm-plausible (arkworks 0.6 `default-features=false`, blake3, getrandom 0.4 — needs the `wasm_js` backend; no subprocess); `sparq-zk-compose` is explicitly "native-only" because of `libc`/`flock` (`FileSeenNonces`) and the `nargo`/`bb` subprocess driver — but those are exactly the parts a browser doesn't need (noir_js executes witnesses; bb.js proves). sparq already has the `sparq-wasm` crate pattern with feature-gated optional members. Stages: **S1** expose `encode_term`/`encode_int_literal` + Schnorr verify (+ sign, for live `HolderPop`) — ~2–4 days, enables browser-side anchor cross-checks; **S2** expose `commit_triples` + `build_scan`/`build_filter_int` + a JSON (not Prover.toml) input emitter — ~1–2 weeks incl. the byte-identical wasm CI gate, enables live composed proving in-browser; **S3** abstract the verifier gate stack over a bb-backend trait so `verify_manifest` runs in-browser with bb.js injected — ~2–4 weeks, 9-kLOC `verifier.rs` refactor, and it *grows the sq-qhy4 audit surface*, so sequence after external sign-off. File as sparq beads; **stop-gate applies — propose, don't PR unprompted.**

### 2.3 Scene-2 copy posture

| Posture | On-screen copy |
|---|---|
| (b1) live proof + anchor (primary) | "Your employer signed a fingerprint of your income figure. Your browser just proved — live, against this lender's one-time challenge — that the number behind that fingerprint is at least $7,000/month. The number itself never left your device." Honesty footnote: "Research-grade cryptography, external audit pending; a determined verifier could narrow a low-entropy value by enumeration — the guarantee is *not disclosed and not forgeable*, not *unknowable*." |
| (a) Tier B manifest (touchpoint 3) | "This cross-credential bundle — same person in the employer and bank credentials, neither identity revealed, credential not revoked, issuer in the accredited set — was **proved offline from issuer-attested credentials and is being re-verified cryptographically in your presence**." Chip: `proved at seed time · verified live`. Never "proved live". |
| (b) bare filter proof | Only ever as a mechanics explainer: "a live demonstration of the proving machinery — in this configuration not yet tied to an issuer signature; the anchored version (left) is." Prefer not to show at all |

## 3. Scene 4: freshness + status

Three mechanisms do three different jobs (C11):

| Mechanism | Job | Demo use |
|---|---|---|
| **Bitstring Status List 1.0** (W3C Rec 15 May 2025) | Revocation/suspension signal; issuer-hosted signed list; **min 16 kB / 131,072 entries** for herd privacy; entry = `{type, statusPurpose, statusListIndex, statusListCredential}`; `ttl` + list `validFrom/validUntil` control list freshness | The green-tick's *"still valid"* half. `@jeswr/solid-vc` **already implements both sides** (`status.ts`/`bitstring.ts`: `bitstringStatusListEntry`, `buildBitstringStatusListCredential`, `withStatusBit`, `resolveBitstringStatus` — fail-closed: bit set → revoked/suspended; unreachable/unparseable → distinct failure, never a pass; SSRF-guarded fetch). Closes research-gaps Q5 |
| **sparq hidden-index revocation** (`revoke_unset_d10`, ≤1024 indices) | Unlinkable not-revoked proof *inside a ZK manifest* | Tier B talking point only. Note: the W3C 131,072-entry minimum exceeds d10's 1024 — so the ZK rail keeps its **own** small status list (its list IRI + version are Schnorr-bound into the attestation via `status_ref_digest`); issuer publishes the Merkle root signed, browser compares the revoke sub-proof's public root against it |
| **Short validity + re-issue** | *Freshness* (the 10-business-day VOE rule) — a status list signals revocation, not recency | The green-tick's *"still fresh"* half and the scene's hook |

**Design:** each issuer app hosts one list per purpose at `GET https://<issuer-app>/api/status/<slug>` returning its signed `BitstringStatusListCredential` (JSON-LD; issuer = issuer WebID; `eddsa-rdfc-2022` via `solid-vc`; 131,072 bits ≈ 16 kB raw, ~ small gzip'd multibase; `ttl: 300000`; list `validUntil` +24 h so a stale cached list also fails closed). Employment VC carries `credentialStatus: { type: "BitstringStatusListEntry", statusPurpose: "revocation", statusListIndex: "42", statusListCredential: "https://payroll.example/api/status/employment" }`. Issuer app keeps revoked indices in a tiny KV and re-signs on change; an admin toggle powers a live revocation beat if wanted (the spec also defines `suspension`/`refresh`/`message` purposes — not needed).

**The "30 days later" beat (Q12/M8) without a fake clock:** seed the employment VC **backdated** — `validFrom` 30 days ago, `validUntil` +14 days (covers the ≤10-business-day verbal-VOE window) — so at demo time it is *genuinely expired*. Lender's pre-close check shows: signature ✓, status list ✓ (not revoked), **validity ✗ (stale)** → borrower clicks "re-verify employment" → payroll issuer re-issues instantly (fresh `validFrom/validUntil`, same status index, new anchor VC alongside) into the pod → lender re-reads → green tick. Contrast card: "today this is a phone call to your employer." The green tick therefore honestly means three checks: issuer signature + not-revoked (status endpoint) + inside the freshness window.

## 4. Decisions for SPEC.md

| # | Decision | Pick |
|---|---|---|
| P1 | Presentation protocol (proofs) | Challenge'd VP-POST to lender API; DPoP/Solid-OIDC holder auth via `@jeswr/solid-api-auth`; single-use BN254-field challenge; OID4VP-`direct_post`-shaped for partner-phase migration |
| P2 | Presentation protocol (data) | Pod-native ODRL/DPV grant (access-manager pipeline); LDN inbox as shared transport idiom |
| P3 | Fallback | Pod-mediated presentation (proof bundle as granted pod resource) |
| P4 | Tier A binding | Issuer-signed **operand anchor VC** (`mort:ZkOperandAnchor`: field IRI + `operand_enc` + subject WebID + status + validity); lender checks anchor↔proof equality. Bare Tier A never shipped as "bound" |
| P5 | Tier B posture | Precomputed composed manifest for the join showpiece; "proved offline · verified live" labelling; challenge baked at capture, freshness never claimed |
| P6 | Upstream (sparq) | Beads S1 (encode+sig→wasm, days) / S2 (witness builders→wasm, 1–2 wks) / S3 (verifier gate stack over bb trait, 2–4 wks, post-audit) — proposals only, stop-gate |
| P7 | Upstream (solid-vc, Jesse-owned) | `signPresentation`/`verifyPresentation` + `challenge`/`domain` proof options (~2–4 days) → holder-signed VPs replace transport-level holder binding |
| P8 | Status/freshness | Bitstring Status List per issuer app (Vercel route, 131,072 entries, signed, fail-closed resolver already in solid-vc) + short-validity employment VC (+14 d) + backdated seed + one-click re-issue; ZK rail keeps its own ≤1024-entry Schnorr-bound list |

## Sources

Repo evidence (read-only mirrors, 2026-07-15):
- sparq: `zk/compose/filter_int_d2/src/main.nr` (relation, unused-but-transcript-bound challenge, digit-count leak) · `crates/sparq-zk/src/encode.rs` (salt-free `h2(type, blake3(token))` literal encoding) · `crates/sparq-zk/src/sig.rs` (`commitment_message_with_holder`, `holder_key_digest`, `status_ref_digest`) · `crates/sparq-zk-compose/src/{manifest.rs,verifier.rs}` (BindingMode Challenge/HolderPop; nonce-equality gates at 1667/5000; HolderRegistry) · `crates/sparq-zk{,-compose}/Cargo.toml` (wasm-compat deps; "native-only … libc never reaches the wasm build") · `site/src/lib/zk-prover.ts` + `site/scripts/capture-zk-manifest.mjs` + `site/public/zk/car-hire-manifest.json` (30,314 B measured) · `skills/zk-query-proofs/SKILL.md` (nonce burn, trust anchors, honest scope, sq-qhy4) · `crates/sparq-wasm/Cargo.toml` (feature-gated wasm members precedent)
- solid-sdk: `packages/solid-vc/src/{status.ts,bitstring.ts,webid.ts,types.ts,issue.ts,index.ts}` (Bitstring Status List issue+verify fail-closed; WebID Multikey publish/resolve; Presentation types; no challenge/domain yet) · `packages/solid-api-auth/{README.md,src/core.ts}` (DPoP-bound Solid-OIDC verification for API routes; authenticate-without-owner) · `apps/access-manager/{README.md,src/lib/inbox.ts}` (ODRL inbox requests, CAS approval, DPV receipts)

External (fetched/verified 2026-07-15):
- OpenID for Verifiable Presentations 1.0 (Final, 9 Jul 2025; DCQL, nonce, `direct_post`, DC API / custom scheme): https://openid.net/specs/openid-4-verifiable-presentations-1_0-final.html
- Digital Credentials API shipping status (Chrome 141 + Safari 26 stable Sept 2025; desktop = cross-device QR; platform-wallet-centric): https://developer.chrome.com/blog/digital-credentials-api-shipped · https://www.corbado.com/blog/digital-credentials-api
- OWF TypeScript OID4VC stack (oid4vc-ts incubation; "does not implement any credential format"; Credo/Sphereon integration): https://openwallet.foundation/2025/02/25/openid4vc-dcql-and-openid-federation-three-new-fundamental-typescript-projects-incubated-at-openwallet-foundation/ · https://github.com/openwallet-foundation-labs/oid4vc-ts · https://github.com/openwallet-foundation/credo-ts/tree/main/packages/openid4vc · https://github.com/Sphereon-Opensource/OID4VC
- W3C VC Data Integrity 1.0 (Rec 15 May 2025; challenge/domain replay mitigation; `authentication` proof purpose): https://www.w3.org/TR/vc-data-integrity/
- W3C Bitstring Status List 1.0 (Rec 15 May 2025; 131,072-entry minimum; purposes incl. revocation/suspension/refresh/message; ttl/validity): https://www.w3.org/TR/vc-bitstring-status-list/
- W3C Linked Data Notifications (Rec 2 May 2017; `ldp:inbox` discovery, POST JSON-LD, 201): https://www.w3.org/TR/ldn/
- CHAPI credential-handler polyfill (web-wallet mediation, emulated UI): https://github.com/credential-handler/credential-handler-polyfill · https://chapi.io/developers/wallets
