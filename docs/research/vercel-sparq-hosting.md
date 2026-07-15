# Vercel + sparq wasm — hosted read-only demo pods without CSS

Question (Jesse): can the LIVE hosted demo pods run on the sparq wasm Solid server inside a
Vercel function, seed data mostly read-only, replacing/reshaping decision 0011's "Mode 2 =
hosted CSS"? Sources: sparq read-only checkout `origin/main` @ `947480b0` (paths sparq-relative),
local wasm builds + measurements, Vercel docs fetched 2026-07-15 (pages last updated 2026-06/07).

**Verdict — yes, with a reshape not a full replacement.** The full-tier sparq-lws wasm artifact
is 2.7 MiB raw (≈1 % of Vercel's 250 MB Node-function budget), compiles in single-digit ms, and
the host-auth model plus Fluid Compute's module-scope instance reuse fit a **hard-read-only
multiplexed org-pod function** exactly. This replaces Mode 2's *hosted-org-pod* role at $0 and
makes the hosted path sparq-native (irony defused). It does **not** replace what made Mode 2
"live multi-actor": real Solid-OIDC browser login, cross-visitor shared *mutable* state, and
notifications. Recommendation: org pods → read-only sparq-on-Vercel; borrower pod stays Mode 1
in-browser; CSS demoted to an optional, deploy-on-demand "live session" add-on (2b), not part of
the standing deployment.

## 1. Measured artifact sizes and instantiation cost

Built from `crates/sparq-lws-wasm` with cargo (`--profile release-wasm`, the same raw-cargo
measurement sparq's own `wasm_bundle_bytes` ratchet gates; the shipped npm artifact additionally
passes through wasm-bindgen, a small delta). wasm-opt `-Oz` matches the crate's wasm-pack profile.

| Tier | raw cargo `.wasm` | wasm-opt -Oz | gzip -9 | brotli | Node compile (M-series) |
|---|---|---|---|---|---|
| **full** (`--features sparql-endpoint`, the npm `build:lws-wasm` tier) | 2,868,534 B (2.74 MiB) | 2,417,010 B (2.31 MiB) | 848,815 B | 620,498 B | 3–6 ms |
| **core** (LDP+WAC only, no `/sparql`) | 1,529,944 B (1.46 MiB) | 1,299,579 B (1.24 MiB) | 453,444 B | 342,520 B | ~2 ms |

Per-request and construction costs are in-memory Rust (no I/O, no reactor —
`sparq-lws-wasm/src/lib.rs` drives the axum router via `oneshot`; constructor is store-new +
7-triple owner-ACL write under `futures_executor::block_on`). Seeding N org pods with small
turtle fixtures via `handleRequest` PUTs is tens of requests at sub-ms each. **Wasm-specific
cold-start add-on ≈ 10–100 ms on Lambda-class vCPU** — noise against the Node/Fluid baseline
(~0.8–2.5 s cold, mitigated by production bytecode caching + pre-warming). npm status re-checked
2026-07-15: `@jeswr/sparq` and `@jeswr/solid-server` both still 404 — bootstrap publish
(lws-survey §3) or a vendored tarball remains a prerequisite.

## 2. Vercel constraints (verified against current docs)

| Constraint | Node runtime (Fluid) | Edge runtime |
|---|---|---|
| Bundle size | **250 MB uncompressed** (5 GB "large functions" beta) — 2.7 MiB wasm is trivial | **1 MB gzipped on Hobby** / 2 MB Pro / 4 MB Ent — full tier (849 KB gz) + glue + fixtures does not reliably fit Hobby |
| Wasm support | Full (`WebAssembly.compile/instantiate` from bytes; the `--target web` glue already runs in Node via `init({ module_or_path: bytes })` — proven by `packages/solid-server/src/index.js`) | `WebAssembly.compile`/`instantiate` **from buffers disabled**; wasm only via static import. No `fs` |
| Instance reuse | **Fluid: "multiple invocations can share the same physical instance (a global state/process)"** — module-scope `SolidServer`s persist on warm instances and serve concurrent visitors | Isolate reuse, weaker guarantees |
| Duration / memory | 300 s default all plans; 2 GB/1 vCPU Hobby (64 MiB wasm store cap ≪) | 25 s to first byte |
| Body cap | 4.5 MB platform payload cap; the wasm's 2 MiB cap binds first | same |
| Vercel's own advice | — | "We recommend migrating from edge to Node.js" (docs, 2026-06-10) |

**Runtime choice: Node/Fluid.** Edge is size-constrained, wasm-hostile to the existing init
path, and explicitly disrecommended. COOP/COEP is a non-issue: those headers gate
`SharedArrayBuffer`/threads in *browsers*; the artifact is single-threaded and server-side.

Key Fluid subtlety for the design: warm-instance reuse is **per instance, not global** — under
load Vercel scales to multiple instances, each with its own module-scope state, and idle
instances are recycled without notice.

## 3. Read-only-by-construction — evaluated both ways

| | (a) Hard read-only (405 gate) | (b) Writes allowed, ephemeral |
|---|---|---|
| Cross-visitor consistency | Identical state on every instance (same fixtures, same seed order) | **Divergent**: visitor A on instance 1 and visitor B on instance 2 see different state; worse, A and B *sharing* one Fluid instance see each other's writes — a public shared write surface again |
| Honesty | "Org pods are read-only in the hosted demo" — one clear sentence | Writes that randomly persist-for-minutes-then-vanish; hardest behaviour to explain honestly |
| Abuse | None (plus `/sparql` CPU, see below) | Vandalism visible to co-tenants of the instance; 64 MiB/4,096-resource caps reachable → 507s for everyone on that instance |
| Verdict | **Chosen** | Rejected |

Design (all verified against code):

- **One multiplexing function**, not one per org: a catch-all route in the shell app
  (`app/pods/[org]/[[...path]]/route.ts`, `runtime = 'nodejs'`). One cold start, one wasm
  compile, N module-scope `SolidServer`s in one linear memory. Per-org functions multiply cold
  starts for zero isolation benefit when everything is read-only.
- **Path-prefixed base URLs work at the wasm layer**: the constructor only trims a trailing
  slash (`sparq-lws-wasm/src/lib.rs:100-113`) and target resolution is plain concatenation
  `format!("{base}{path_only}")` (`sparq-lws-core/src/ldp/target.rs:77`). So
  `new SolidServer("https://demo.example/pods/verizon", seeder)` + adapter-side prefix stripping
  yields correct IRIs in Location/Link headers and containment triples. Only the Node host's
  `normalizeBaseUrl` forbids paths — irrelevant here (§4). Org WebIDs at
  `https://demo.example/pods/verizon/profile/card#org` genuinely dereference → satisfies the
  no-minted-IRIs rule for the first time.
- **Method gate by construction**: export only `GET`/`HEAD`/`OPTIONS` route handlers — Next.js
  405s everything else without a line of gating code. Export `POST` solely to forward
  `<prefix>/sparql` (the endpoint is query-only; UPDATE/DESCRIBE refused in-engine, lws-survey §1).
  OPTIONS passes for CORS preflight; the wasm's reflective-origin CORS rides every response.
- **Anonymous + WAC public-read**, not fixed-owner: seed at module scope as an internal seeder
  WebID (fixtures include a root `.acl` granting `acl:agentClass foaf:Agent` → `acl:Read` +
  `acl:default`), then serve every visitor request with `authenticated_webid = undefined`. WAC
  evaluation and the `WAC-Allow: public="read"` header are then *real* — a demo beat, with the
  405 gate as defence-in-depth above it.
- **Trap recovery**: a wasm trap poisons the shared instance — on `WebAssembly.RuntimeError`,
  recreate **and reseed all pods** (the `trap-recovery.js` pattern, extended); reseeding is
  idempotent because fixtures are the only state.
- Fixtures: turtle files bundled via `outputFileTracingIncludes` alongside the `.wasm`; seeding
  memoised behind a module-scope promise (the `wasmReady` pattern in
  `packages/solid-server/src/index.js:13-26`).

Residual abuse surface: `/sparql` CPU burn (arbitrary SELECT over O(pod) assembly — tiny pods,
but rate-limit via Vercel Firewall rules) and provisioned-memory burn from a sustained crawler
keeping instances alive (Hobby includes 360 GB-hrs/mo ≈ 180 h of a live 2 GB instance; exceeding
pauses the function). Mitigations already in the corpus: `X-Robots-Tag: noindex`, interstitial,
WAF rate-limit. Worst case is the demo pausing until month-end, not a bill.

## 4. What this needs that `@jeswr/solid-server` doesn't provide

The npm package is a loopback `http.Server` host — unusable on Vercel as-is, and its `exports`
map exposes only `"."`, so `…/wasm/sparq_lws_wasm.js` cannot be subpath-imported. The mortgage
repo therefore writes a small adapter (web `Request`/`Response` ⇄ `handleRequest` flat headers —
`src/http.js` maps ~1:1) against a vendored artifact until publish. Candidate upstream asks
(sparq-org is Jesse's org; still follow AGENTS.md conventions, beads under epic `sq-6xasp`):

| # | Ask | Class |
|---|---|---|
| 1 | npm bootstrap publish (already flagged in lws-survey/deployed-infra) | credential-gated, Jesse |
| 2 | Runtime-agnostic **web-standard handler export** — `createFetchHandler(pods) → (Request) => Promise<Response>` incl. header flattening, body cap, trap-recovery; serves Vercel/Deno/Workers/Bun alike | new host module |
| 3 | Export the `./wasm/*` subpath (or ship #2, which subsumes it) | one-line `exports` change |
| 4 | `readOnly: true` / method-allowlist option in the host (belt-and-braces below platform gates) | nicety |
| 5 | Seed-from-fixtures helper (`seedPod(server, files)`) — plain PUTs work today; a helper deduplicates the mortgage/solid-sdk harnesses | nicety |
| 6 | **Not needed**: a Node/`--target nodejs` build — `--target web` + `init({ module_or_path: bytes })` already works in Node; request-count/size guards — platform 4.5 MB cap, wasm 2 MiB cap and Vercel Firewall cover it | — |

## 5. Architecture recommendation — reshaping decision 0011

| Concern | Mode 1 (in-browser, per-visitor) | **New Mode 2a: read-only sparq-on-Vercel org pods** | Old Mode 2 (hosted CSS) → optional 2b |
|---|---|---|---|
| Borrower pod (writable) | ✅ stays here | — | — |
| Org/stakeholder pods over real HTTP, curl-able, cross-visitor identical | per-visitor copies only | ✅ $0, zero ops, always on | ✅ but $3–7/mo + reset/seed ops |
| Dereferenceable org WebIDs / vocab | ❌ | ✅ | ✅ |
| `/sparql` + real WAC evaluation on hosted pods | ✅ (in-browser) | ✅ (full tier) | ❌ CSS has no SPARQL endpoint |
| Real Solid-OIDC browser login | ❌ simulated | ❌ no issuer; moot when read-only | ✅ |
| Cross-visitor multi-actor *writes*, notifications | ❌ | ❌ by construction / excluded from wasm (moot: state never changes) | ✅ |
| Server story | sparq | **sparq** | CSS (interop framing) |

- **Adopt Mode 2a** as part of the standing deployment: one read-only multiplexed sparq function
  in the shell app on the shared demo domain. Everything mutable stays per-visitor in Mode 1.
- **Demote CSS to 2b — deploy-on-demand, not standing.** Only two scene classes still need it:
  the real-login beat and facilitated cross-visitor multi-actor sessions (e.g. a presented CoP
  walkthrough with two live participants). Spin the Fly/EC2 CSS up for the session, tear down
  after: ~$0 standing cost vs 0011's ~$3–7/mo. If those scenes are cut, **no hosted CSS at all**.
- Cost: Vercel Hobby allowances (4 CPU-hrs, 360 GB-hrs, 1M invocations/mo) exceed demo traffic
  by orders of magnitude → **$0/mo standing**; 2b adds cost only while a live session runs.
- Partner-phase migration path (0011 §3) is unchanged — and now more natural: read-only sparq
  functions → writable sparq-lws-core native once its GHCR image + S3 BlobStore + seeding land.

## Sources

- sparq checkout `origin/main` @ `947480b0`: `crates/sparq-lws-wasm/{src/lib.rs,Cargo.toml,README.md}`,
  `crates/sparq-lws-core/src/{app_wasm.rs,ldp/target.rs}`, `packages/solid-server/{package.json,src/index.js,src/http.js,src/auth.js,src/trap-recovery.js}`, `.github/workflows/js.yml`, `skills/javascript-wasm/SKILL.md`
- Local measurements (2026-07-15, cargo 1.89 / wasm32-unknown-unknown / wasm-opt 130 / Node 25.1,
  Apple-silicon): builds + `WebAssembly.compile` timings as tabled in §1
- Vercel function limits (250 MB bundle, 4.5 MB payload, memory/duration): <https://vercel.com/docs/functions/limitations> (updated 2026-07-01)
- Fluid Compute instance sharing + bytecode caching: <https://vercel.com/docs/fluid-compute> (updated 2026-07-01)
- Edge runtime code-size limits (1/2/4 MB gz), wasm buffer-compile restriction, migrate-to-Node advice: <https://vercel.com/docs/functions/runtimes/edge> (updated 2026-06-10)
- Fluid pricing / Hobby allowances: <https://vercel.com/docs/functions/usage-and-pricing> (updated 2026-06-16)
- npm 404 re-checks: `npm view @jeswr/sparq` / `@jeswr/solid-server` (2026-07-15)
- Prior corpus: `docs/research/{lws-survey,deployed-infra,showcase-patterns}.md`, `decisions/0011-deployed-infra.md`
