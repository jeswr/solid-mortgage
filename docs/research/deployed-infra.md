# Deployed infra — where the pods and the OIDC issuer live for the live Vercel demo

Answers research-gaps Q1/Q2/M1/M9. Sources: sparq read-only checkout `origin/main` @ `947480b0`
(paths below are sparq-repo-relative), live probes and pricing pages fetched 2026-07-15.

**Verdict.** Hybrid (option d), weighted heavily toward in-browser: the default visitor
experience runs **per-visitor sparq-wasm pods on ONE shared demo domain** (Next.js multi-zones,
all apps path-routed on the same origin — the only architecture in which cross-app in-browser
state actually works), costing £0 and having zero shared abuse surface. A single small **hosted
CSS 7.1.9** (pods + Solid-OIDC issuer in one process, in-memory, reseeded on restart) powers an
optional "live multi-actor" mode with real logins, ~$3–7/mo on Fly.io. **sparq-lws-core native
is not deployable as the demo pod host today** (image unpublished, blob store in-memory-only,
no issuer, no fixture seeding) — it is the partner-phase swap-in, not the demo target.

## 1. Option (a) — sparq-lws-core native on a PaaS

### What landed at 947480b0

`deploy/paas/` covers **both** servers — this is not SPARQL-engine-only. `deploy/paas/lws/`
ships `fly.toml`, `render.yaml`, `railway.toml` for the Solid/LWS server, correct and complete
(TLS at the PaaS edge, `/readyz` health checks, fail-closed posture, secrets in the PaaS store,
Redis replay-store seam for >1 replica). `deploy/paas/sparq-server/` is the SPARQL engine
(`ghcr.io/sparq-org/sparq-server`, already published, token-gated).

### Blockers for using it as the demo pod host (all verified in code)

| # | Blocker | Evidence | Closable? |
|---|---------|----------|-----------|
| 1 | **Image unpublished.** Configs reference `ghcr.io/sparq-org/sparq-lws-core` — "the image activates once sq-lmz40 ships" (bead OPEN) | `deploy/paas/README.md`, all three lws configs | Upstream: land sq-lmz40 (Dockerfile + GHCR workflow already specced) |
| 2 | **No persistent storage.** `BlobStore` has only an in-memory impl; "the real `object_store`-backed impl (S3 / Local) is an M2 adapter behind the same trait". A startup guard *rejects* any durable SPARQ index paired with the in-memory blob store, so the native binary is **ephemeral-only today** — restart wipes every pod | `crates/sparq-lws-core/src/store/blob.rs:4-9,69-70,194`; `main.rs` `sparq_backend_is_durable` + guard #1 | Upstream M2 (S3/volume adapter). For a demo, ephemerality is arguably a *feature* (restart = reset) |
| 3 | **No OIDC issuer.** `SOLID_SERVER_TRUSTED_ISSUER` (singular) is a REQUIRED boot param — "the server cannot self-issue an IdP". Verification-only, like jeswr/solid-oidc-verifier | `deploy/paas/README.md`; `main.rs:109,306-309` | External issuer required — see §5 |
| 4 | **No demo-persona seeding.** `SOLID_SERVER_SEED_CONFORMANCE` seeds exactly `["alice","bob"]` and the deploy templates mark all seed flags DEV-ONLY ("NEVER in production") | `src/seed.rs:44`; lws `fly.toml` env comments | Now: boot-time seeding via authenticated LDP PUTs with issuer-minted persona tokens. Upstream: a fixture-seed path |
| 5 | Multi-pod exists structurally (`/{u}/` pods, per-pod ACLs, identity host serving provider WebIDs at `id.<host>` with locked `solid:oidcIssuer`) but there is **no account/pod-provisioning API** | `src/seed.rs`, `src/identity.rs` | Acceptable — demo personas are fixed |

What it *does* have production-shaped: fail-closed anonymous mutation, DPoP-required, strict
bidirectional WebID↔issuer, built-in per-IP rate limiting (default-on,
`SOLID_SERVER_RATE_LIMIT_PER_IP`), `/livez`+`/readyz`, optional native TLS
(`SOLID_SERVER_TLS_CERT/_KEY`) though every PaaS terminates TLS at the edge anyway.

**Net:** running sparq-lws-core behind TLS is a one-command Fly deploy *once sq-lmz40 ships*,
but the demo would still need an external issuer app, a custom seeding step, and acceptance of
wipe-on-restart. That is 3 upstream items + 1 extra deployable before first pixel. Not the
critical path for the CoP date; exactly right for the partner phase.

## 2. Option (b) — hosted Community Solid Server

**Precedent verified live.** `solid-test.jeswr.org` answers today: HTTP/2 via **Caddy**, CSS
error JSON, `WAC-Allow`/DPoP `WWW-Authenticate` headers, currently 401-locked down to root.
It resolves to 35.179.26.2 = **Amazon (AWS EC2, London range)** — the volunteering-suite
pattern is a small EC2 box + Caddy reverse proxy, not a PaaS.

| Aspect | Detail |
|--------|--------|
| One deployable | CSS is pod server **and** Solid-OIDC issuer in one process (panva `oidc-provider` under the hood — `@types/oidc-provider` in CSS `package.json`) — no separate IdP needed |
| Version | Pin **7.1.9** (latest 7.x). npm `latest` dist-tag is `8.0.0-alpha.3` — do not track it |
| Seeding | Solved problem: `--seedConfig` accounts at boot + the execution-verified `solid-test-infrastructure` harness (css-account, client-credentials DPoP) already used by the volunteering suite |
| Ops | In-memory config ⇒ restart = clean reset; systemd timer / `fly machine restart` nightly; Caddy adds body caps + rate limits (CSS has none built in) |
| Cost | Reuse the existing EC2 box: ~$0 marginal (new vhost in Caddy). Dedicated: Fly shared-cpu-1x 512MB **$3.32/mo** (1GB ≈ $6.5); a fresh t4g.small EC2 ≈ **$12/mo** |
| The irony | The sparq showcase would run dev on sparq-wasm and prod pods on CSS |

**Defusing the irony.** (1) In the recommended hybrid, the *primary* visitor path runs on
sparq (the wasm server in-browser) — CSS is only the live-mode fallback; (2) same apps against
two independent server implementations is an *interop proof*, a Solid talking point, not an
embarrassment; (3) the partner phase swaps CSS out (§9). Do not host the mortgage demo on the
volunteering box's same CSS *instance* — spin a separate instance (`solid-mortgage.jeswr.org`)
so resets and lockdowns don't couple the two suites.

## 3. Option (c) — per-visitor in-browser pods

**Feasibility of the core: already true.** `@jeswr/solid-server`'s wasm artifact is built
`wasm-pack build crates/sparq-lws-wasm --target web` (`packages/solid-server/package.json:49`),
i.e. a browser-loadable module. The README's quickstart is literally browser JS:
`import init, { SolidServer } from "./pkg/sparq_lws_wasm.js"` then
`pod.handleRequest(method, path, headers, body, authenticatedWebid)`. One `SolidServer`
instance per persona (the harness pattern) gives multi-pod. Limits are demo-compatible: 64 MiB
store / 2 MiB bodies / trap-recycle-wipes-state ⇒ reseed on load.

**The cross-origin wall.** `vercel.app` is on the Public Suffix List (verified in the live
list), so `borrower.vercel.app` and `lender.vercel.app` are unrelated *sites*, not just
origins. And Chrome 115+ **partitions storage AND communication APIs by top-level site** —
localStorage, IndexedDB, BroadcastChannel, SharedWorker, service workers are all partitioned
in third-party contexts (Firefox/Safari have equivalents). Consequences per architecture:

| Architecture | Verdict | Why |
|---|---|---|
| Apps on separate vercel.app domains + shared "pod iframe" hub | ❌ dead | The pod-origin iframe gets a *different* storage partition under each top-level app — no shared state, by design of storage partitioning |
| Per-app service worker proxying a virtual pod origin | ❌ for cross-app | A SW only controls its own origin's pages; each app would run an independent wasm instance — state diverges the moment the user switches apps |
| One "pod tab" + `postMessage` to app tabs | ⚠️ works but reject | Cross-origin `postMessage` needs window handles (opener/openee), breaks on tab close/refresh/popup blockers; no `fetch` interception so every SDK call must be re-plumbed |
| **Single demo domain, path-routed apps (Next.js multi-zones)** | ✅ **the one that works** | All apps share one origin ⇒ SharedWorker/service worker hosts the wasm `SolidServer` instances once; BroadcastChannel syncs tabs; a SW can serve `/pod/{persona}/...` so ordinary `fetch` + the normal SDKs work unchanged |

Multi-zones mechanics: each app remains its own Vercel project; a shell project rewrites
`/borrower/*`, `/lender/*`, … to the other projects' domains (`assetPrefix` per zone;
cross-zone links are `<a>` not `<Link>`). This is plain `rewrites` — works on the Hobby plan.
(Vercel's *managed* Microfrontends product includes only 2 projects on Hobby/Pro and charges
**$250/project/mo** beyond that on Pro — use the plain multi-zones pattern, not the product.)

Trade-offs to state honestly in the SPEC and the demo's honesty panel:
- **Login is simulated** in this mode (a persona picker sets `authenticatedWebid`; there is no
  issuer, no DPoP). WAC evaluation, LDP, N3 Patch, `/sparql`, and Tier A in-browser ZK proofs
  (bb.js) are all still real.
- Branded apps live at paths (`demo.example/lender`), not separate domains — branding stays
  in-app. This also *helps* trademark optics (no `truist-*.vercel.app` domain squatting look).
- State is per-visitor and per-browser: nothing shared between two visitors — which is the
  point (scene copy: "this pod is yours; close the tab and it's gone").

## 4. Option (d) — hybrid

Scripted tour + all self-serve traffic → option (c). One "live multi-actor mode" button →
apps re-point their pod/issuer base URLs (runtime config, per showcase-patterns' lesson) at
the hosted server from option (b) (or (a), post-unblock). Fly's `auto_stop_machines` lets the
hosted half idle near-zero between sessions.

## 5. OIDC issuer choice per option

| Option | Issuer | Notes |
|--------|--------|-------|
| (a) LWS native | **CSS-as-IdP-only** (simplest real one): CSS docs confirm it acts as an OP and can link **external WebIDs** (ownership proven by an identification triple in the WebID) — so LWS-hosted WebIDs at `id.<host>` can name a CSS issuer. Alternatives: `oidc.test.mjs`-style jose dev issuer (**headless only** — no browser login); a real `node-oidc-provider` deployment (DCR+PKCE+DPoP work to do); **Keycloak** — DPoP officially supported since 26.4 (Oct 2025), the prod-solid-server pattern | LWS trusts exactly ONE issuer (`SOLID_SERVER_TRUSTED_ISSUER` is singular) — all personas and visitors share it. Fine for a demo |
| (b) hosted CSS | CSS itself | Zero extra moving parts; pre-created persona accounts with on-screen passwords (volunteering tour precedent: demo login "public by design — only ever a throwaway demo pod") |
| (c) in-browser | None — simulated persona picker | Honesty-panel disclosure required |
| (d) hybrid | (c) none + (b) CSS | Live mode gets the real Solid-OIDC login beat scene 1 wants |

## 6. Cross-origin cookies / DPoP on separate vercel.app subdomains

- PSL membership makes every `*.vercel.app` app an unrelated site: no shared cookies, storage,
  or BroadcastChannel between apps — each app must run its **own** auth-code+PKCE flow and
  hold its **own** DPoP keypair (non-extractable CryptoKey in its origin's IndexedDB) and
  tokens. That is normal Solid-OIDC multi-app behaviour, not a bug; tokens ride headers, never
  cookies, so third-party-cookie policies don't touch resource requests.
- **SSO still works**: the IdP's session cookie is first-party *at the IdP* and the flow is
  top-level redirects, so the second app's login round-trips through the issuer without
  re-prompting. What does NOT work reliably any more is silent re-auth via hidden iframe
  (`prompt=none`) — partitioning/cookie-blocking kills it; use refresh tokens or accept an
  occasional visible redirect (it's a demo; sessions are short).
- Both candidate servers emit Solid-conformant reflective-origin CORS (CSS; LWS
  `src/ldp/cors.rs`), so apps on any origin can hit the pod host.
- Give each deployed app a stable Client Identifier Document (house `solid-client-id`
  pattern) so consent screens show app names, not random DCR ids.

## 7. Persistence, reset, and abuse controls (public demo — anyone can write)

| Option | Persistence | Reset | Abuse surface + controls |
|--------|-------------|-------|--------------------------|
| (a) | None (in-memory by construction) | Restart = factory reset; reseed on boot | Fail-closed anon writes; built-in per-IP rate limit; but *logged-in* demo personas are shared ⇒ any visitor writes as "alice" — schedule restarts (e.g. hourly cron via `fly machine restart`) |
| (b) | In-memory CSS config (deliberate) | Nightly + on-demand restart; seed accounts re-created at boot | Disable open registration; pre-created personas only; Caddy/Cloudflare rate-limit + body cap (CSS has none); `X-Robots-Tag: noindex` explicitly on production + consent interstitial (showcase-patterns §4/§5); fixtures 100% fictional so hostile writes can deface but never leak |
| (c) | Per-visitor, per-tab (IndexedDB optional) | Reload = reset; "Reset demo" button trivial | **None shared** — a visitor can only vandalise their own copy. This is the decisive public-demo advantage |
| (d) | (c) + (b) | (c) + (b) | Live mode can additionally sit behind a shared access code in middleware if EDMA circulation widens |

## 8. Monthly cost (verified pricing, 2026-07-15)

| Option | Components | Est. $/mo |
|--------|-----------|-----------|
| (a) Fly.io | LWS 512MB $3.32 + issuer app 256–512MB $2.02–3.32 (+ $2 only if a dedicated IPv4 is ever needed) | **~$5.50–7** |
| (a) Render | 2 × Starter (512MB, always-on) $7 | $14 |
| (a) Railway | Hobby $5 incl. $5 usage | ~$5+ |
| (b) reuse existing EC2/Caddy box | new vhost only | **~$0 marginal** |
| (b) new Fly instance | CSS 512MB–1GB | $3.32–6.5 |
| (b) new EC2 | t4g.small ≈ $0.017/hr + EBS | ~$12–14 |
| (c) in-browser | Vercel Hobby covers the zones; no server | **$0** |
| (d) hybrid (recommended) | (c) + one Fly CSS instance with auto-stop | **~$3–7** |

All far below budget discipline; the £300–400/mo envelope belongs to solid-server-platform,
not this demo. Vercel Pro ($20/seat) only becomes relevant if the $150/mo password-protection
add-on is later demanded (showcase-patterns already recommends interstitial + noindex instead).

## 9. Recommendation + migration path

1. **Now (Tasks 3–4, dev/e2e):** unchanged — loopback `@jeswr/solid-server` fixed-owner +
   dev-issuer fixture per lws-survey.
2. **CoP demo (Tasks 8/10):** **hybrid (d).** Default experience = in-browser sparq-wasm pods
   on ONE shared demo domain via Next.js multi-zones (SharedWorker/SW pod host, persona
   picker, honesty panel discloses simulated login). Live multi-actor mode = one CSS 7.1.9
   (in-memory, seeded, nightly reset) at `solid-mortgage.jeswr.org` — Fly 512MB or a vhost on
   the existing EC2/Caddy box — serving as both pod host and Solid-OIDC issuer. Cost ~$3–7/mo.
   The sparq story stays front-and-centre (the wasm server IS sparq); CSS is framed as the
   interop counterpart.
3. **Partner phase swap:** replace CSS storage with **sparq-lws-core native** on Fly/AWS once
   three upstream items land — GHCR image (sq-lmz40), `object_store` S3/volume blob adapter
   (M2), fixture seeding — and replace CSS-as-issuer with **Keycloak 26.4+** (official DPoP;
   mirrors the hardened prod-solid-server pattern). Apps swap via runtime-config base URLs
   only; nothing in the Vercel layer changes. Geographic/durability upgrades beyond that are
   solid-server-platform territory, not this demo.

Upstream wishlist this feeds (Task 5): sq-lmz40 image publish; fixture-seed path for demo
personas; S3/volume BlobStore; (optional) multi-issuer trust list; npm bootstrap publish of
`@jeswr/solid-server` (already flagged, also unblocks the in-browser build).

## Sources

- sparq checkout `origin/main` @ `947480b0`: `deploy/paas/{README.md,lws/*,sparq-server/*}`,
  `research/cloud-deploy-architecture.md`, `crates/sparq-lws-core/src/{main.rs,identity.rs,seed.rs,store/blob.rs}`,
  `crates/sparq-lws-wasm/{README.md,Cargo.toml}`, `packages/solid-server/package.json`, root `Dockerfile`
- Prior corpus: `docs/research/{research-gaps,lws-survey,pod-host,showcase-patterns}.md`
- Live probes (2026-07-15): `curl -I https://solid-test.jeswr.org/` (Caddy, CSS headers, 401);
  `dig` → 35.179.26.2, whois → Amazon Technologies Inc.
- Fly.io pricing (shared-cpu-1x 256MB $2.02 / 512MB $3.32; volumes $0.15/GB; IPv4 $2): https://fly.io/docs/about/pricing/
- Render Starter $7/mo 512MB 0.5CPU: https://render.com/pricing (via search; page JS-gated)
- Railway Hobby $5/mo incl. usage: https://railway.com/pricing
- CSS as IdP + external WebIDs: https://communitysolidserver.github.io/CommunitySolidServer/latest/usage/identity-provider/
- CSS versions (7.1.9 latest 7.x; `latest`=8.0.0-alpha.3) + `oidc-provider` dep: https://registry.npmjs.org/@solid/community-server , https://raw.githubusercontent.com/CommunitySolidServer/CommunitySolidServer/main/package.json
- Chrome storage partitioning (Chrome 115+, partitions localStorage/IndexedDB/BroadcastChannel/SharedWorker/service workers by top-level site): https://privacysandbox.google.com/cookies/storage-partitioning
- `vercel.app` on the Public Suffix List: https://publicsuffix.org/list/public_suffix_list.dat
- Next.js multi-zones (path-routed independent apps, one domain, plain rewrites): https://nextjs.org/docs/app/guides/multi-zones
- Vercel Microfrontends pricing (2 projects incl.; $250/project/mo on Pro): https://vercel.com/docs/microfrontends
- Keycloak DPoP official support in 26.4: https://www.keycloak.org/2025/10/dpop-support-26-4
- EC2 t4g.small ≈ $0.017/hr: https://instances.vantage.sh/aws/ec2/t4g.small
