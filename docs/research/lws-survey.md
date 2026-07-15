# LWS survey — sparq's WASM Solid server as the dev/test server

Scope: can `@jeswr/solid-server` (Node host over `sparq-lws-wasm`) replace CSS as the dev/test
server for the solid-mortgage monorepo and later jeswr/solid-sdk? Surveyed from a read-only
checkout of sparq `origin/main` @ `947480b0` (2026-07-15) plus the volunteering-with-fable CSS
harness as the reference for what a Solid app test server must provide.

**Verdict.** The wasm server is a real LDP+WAC core (the actual axum router, WAC evaluator,
N3-Patch engine, and conformance-ratcheted code), and its fixed-owner loopback mode is already
sufficient for single-identity dev + pod-IO unit tests. It is **not yet consumable from another
repo without a Rust toolchain** (not published to npm), has **no identity provider, no account/pod
provisioning, and no notifications** — the three things the CSS harness leans on. All three are
closable: two in the Node host, one via a tiny dev OIDC issuer for which sparq's own
`oidc.test.mjs` is a working ~80-line blueprint.

## 1. Capability matrix — today

Component split: `crates/sparq-lws-core` (portable Rust core; native binary adds
OIDC-verify/TLS/notifications), `crates/sparq-lws-wasm` (wasm adapter: `SolidServer` class,
`handleRequest`), `packages/solid-server` (Node loopback host + npx entry).

| Capability | Status in wasm server | Evidence |
|---|---|---|
| LDP CRUD | ✅ GET/HEAD/PUT/POST/DELETE/PATCH/OPTIONS through the real axum router | `sparq-lws-core/src/app_wasm.rs` `build_router` |
| Containers | ✅ containers + RDF/non-RDF resources, `ldp:contains`, trailing-slash semantics | `sparq-lws-core` README; `src/ldp/target.rs` |
| Content negotiation | ⚠️ Turtle ↔ JSON-LD only (`RdfFormat { Turtle, JsonLd }`); no N-Triples/N-Quads out; `Content-Range` reads supported | `src/ldp/content.rs:26-38`, `src/ldp/range.rs` |
| Conditional requests | ✅ `If-Match`/`If-None-Match` per RFC 9110, strong ETags with representation-variant tags (`"state+variant"`) | `src/ldp/conditional.rs` |
| PATCH | ✅ Solid N3 Patch (`text/n3`) with spec-faithful single-solution `solid:where`; `application/sparql-update` limited to `INSERT DATA`/`DELETE DATA` | `src/ldp/patch.rs:584-612`, `src/ldp/handler.rs:125` |
| WAC evaluation | ✅ real per-resource `.acl` evaluation: own-ACL else nearest-ancestor `acl:default`, child→root, fail-closed; 401-vs-403 split; `WAC-Allow` header; ACL decision cache. Solid WAC conformance suite is CI-ratcheted | `src/authz/{wac,acl,mode,wac_allow}.rs`; AGENTS.md conformance section |
| ACL editing | ✅ `.acl` documents are ordinary LDP resources; read/write gated on `acl:Control`. No ACP | `src/authz/mod.rs` |
| CORS | ✅ Solid-conformant reflective-origin CORS (credentials, `Vary: Origin`, preflight) rides every wasm response | `src/ldp/cors.rs`; `sparq-lws-wasm/src/lib.rs` handleRequest doc |
| `/sparql` | ✅ in the **full** npm build (`build:lws-wasm` enables `sparql-endpoint`; `build:lws-wasm-core` omits it). Query-only SELECT/ASK/CONSTRUCT; WAC-scoped named-graph-per-readable-resource, empty default graph, union opt-in via `FROM <http://www.w3.org/ns/solid/sparql#union-default-graph>`; DESCRIBE/UPDATE refused; O(pod) assembly per query, read-barrier consistent with LDP writes | `packages/solid-server/package.json` scripts; `skills/javascript-wasm/SKILL.md` |
| Auth (wasm) | Host-trust model: wasm accepts an already-verified WebID per request (`VerifiedToken` extension); anonymous when absent. Constructor's `ownerWebid` only provisions the root ACL (Read/Write/Control + `acl:default`) | `sparq-lws-wasm/src/lib.rs` |
| Auth (Node host) | Default **fixed-owner**: every request (incl. unauthenticated) acts as `ownerWebid` — deliberately not authentication. Opt-in `oidc: true` (Node API only, **not** the npx CLI): verifies DPoP-bound Solid-OIDC access tokens via `@solid/access-token-verifier`; invalid/expired/replayed/bearer-only → anonymous. **No IdP/issuer is shipped** — verification only | `packages/solid-server/src/{index,auth}.js`, `bin/solid-server.js` (`auth: 'fixed-owner-local-only'`) |
| Notifications | ❌ **confirmed excluded from wasm** ("PoP, notifications, networking, and persistent backends are excluded from wasm"). Native `sparq-lws-core` has WebSocketChannel2023 (discovery + subscribe + AS2.0 push) but it is not compiled into or bridged by the wasm host | `sparq-lws-wasm/README.md:8-10,63`; `src/notifications/` (native); `src/app_wasm.rs` doc |
| Persistence | ❌ in-memory only, process-local, lost on shutdown. Bounded: 64 MiB aggregate blobs / 4,096 blob entries / 4,096 metadata resources → 507 on overflow; limits not yet settable from JS. A wasm trap 503s the request and **recycles the pod, wiping state** | `skills/javascript-wasm/SKILL.md`; `packages/solid-server/src/trap-recovery.js` |
| Multi-pod / accounts | ❌ one wasm pod + one owner WebID per Node server instance; no account or pod-provisioning API. (Native binary has multi-user conformance seeding behind `SOLID_SERVER_SEED_CONFORMANCE=1`, not exposed via the wasm host) | `packages/solid-server/src/index.js`; `sparq-lws-core/src/seed.rs` |
| Body size | 2 MiB per-request cap in the host (matches the wasm router ceiling) | `packages/solid-server/src/http.js` `MAX_BODY_BYTES` |
| Ports | Host binds `127.0.0.1` on a chosen port; port 0 allowed if `baseUrl` given. Stable or random ports both fine | `packages/solid-server/src/index.js` |

## 2. Gap analysis vs what the CSS harness gives an app repo

Reference: `volunteering-with-fable/packages/solid-kit/src/testing/css-harness.ts` +
`e2e/global-setup.ts` — the harness boots in-memory CSS on a random port, provisions
account+pod+client-credentials per test identity via `.account/`, exchanges them for a DPoP token
at `.oidc/token`, returns an `authFetch`, and seeds the bare profile (`pim:storage`, `foaf:name`).

Classes: **(a)** implement in `packages/solid-server` Node host · **(b)** implement in
`sparq-lws-wasm`/`-core` Rust · **(c)** work around in the consuming repo · **(d)** genuinely
needs full OIDC.

| CSS-harness need | sparq wasm server today | Class | Path |
|---|---|---|---|
| Account/pod provisioning API (`createAccount()` per test identity) | Absent — one pod/owner per instance | **(c)** now, **(a)** upstream | Now: boot one `startSolidServer` per identity (fixed-owner, `get-port`) — cheap, isolated, mirrors "account-per-write-test". Upstream: a host-level pod registry routing path-prefixes (`/{u}/…`) to per-pod `SolidServer` instances; the Rust side already accepts any base IRI, only the host's `normalizeBaseUrl` forbids paths |
| Client-credentials token flow (headless DPoP token for `authFetch`) | Absent; `oidc: true` verifies tokens from **any** conformant issuer | **(d)-lite → (a)** | sparq's own `packages/solid-server/test/oidc.test.mjs` contains a complete jose-based dev-issuer fixture (~80 lines: `/.well-known/openid-configuration` + `/jwks` + WebID doc with `solid:oidcIssuer` + `at+jwt` minting with `webid`+`cnf.jkt`) that passes `@solid/access-token-verifier`. Lift it into the mortgage harness now (c/d-lite); worth upstreaming as an opt-in `devIssuer` export of `@jeswr/solid-server` (a) |
| Solid-OIDC issuer for **browser login** (auth-code + PKCE + dynamic client registration) | Absent | **(d)** | Real gap. Options in order: (1) app-level test-auth bypass (`NEXT_PUBLIC_E2E_AUTH=1` pattern already proven in the volunteering suite); (2) embed a dev issuer built on the `oidc-provider` npm package in the host (supports DCR + PKCE; needs a small `webid` claim + DPoP config); (3) keep CSS around solely as IdP while sparq serves storage. Do not attempt an issuer inside wasm |
| Seeded pod templates (`pim:storage`, `foaf:name`, containers) | No templates, but fixed-owner mode makes seeding trivial: every request is the owner, so plain HTTP PUTs at startup replicate css-harness step 3 exactly | **(c)** | A `seedPod(baseUrl, quads)` helper in the mortgage solid-kit; no upstream change needed |
| WebSocket notifications (live-sync UIs, inbox watching) | Excluded from wasm; native core has WebSocketChannel2023 | **(b)+(a)**; **(c)** now | Now: ETag polling (`If-None-Match`) in the consuming repo. Upstream design: have `handleRequest` return changed-topic metadata across the wasm boundary (b), host runs the WS endpoint + discovery Link headers (a) — mirrors the native `NotificationHub` emit-hook shape |
| Distinct-identity WAC tests (e.g. `grantRead` borrower→lender) | Fixed-owner collapses all callers into the owner, so cross-agent allow/deny paths are untestable in default mode | pairs with the token-flow row | `oidc: true` + the dev issuer gives arbitrary WebIDs per test; WAC evaluation itself is already real |
| Stable ports | ✅ no gap | — | — |
| Large fixtures (scanned docs) | 2 MiB request cap, 64 MiB store cap, 507 fail-closed | **(c)** now, **(b)** later | Keep fixtures small; upstream: expose `InMemoryStoreLimits` + body ceiling as `SolidServer` constructor options (the skill notes JS "does not yet expose per-instance limit options") |
| Persistence across restarts (dev ergonomics, not tests) | None | **(c)** | Re-seed on boot from checked-in fixtures; acceptable for both repos |

**Alternative worth noting:** the native `cargo run -p sparq-lws-core` binary adds real
network-backed OIDC verification (still no issuer), TLS, WebSocketChannel2023, and multi-user
conformance seeding (`SOLID_SERVER_SEED_CONFORMANCE=1` creates `/{u}/` pods + profiles + owner
ACLs). It needs a Rust toolchain and an external IdP, so it is a fallback for
notification-dependent e2e, not the default.

## 3. Publication / consumability of `@jeswr/solid-server`

| Question | Answer |
|---|---|
| On npm? | **No.** `npm view @jeswr/solid-server` → E404 (verified 2026-07-15). `@jeswr/sparq` is also 404 — neither JS package has had its bootstrap publish |
| Publish machinery | Fully wired: `.github/workflows/publish.yml` has a manual `workflow_dispatch` input `publish_solid_server` using npm **OIDC trusted publishing** (no NPM_TOKEN, Sigstore provenance). Blocked on a one-time maintainer bootstrap: `cd packages/solid-server && npm run build:lws-wasm && npm publish --access public`, then registering the Trusted Publisher on npmjs.com. This is a credential-gated `needs:user` item for Jesse |
| Git-pin install? | **Not viable**: npm cannot install a subdirectory of a git repo, and the repo root `package.json` is a private workspaces shell |
| Consumable today | (1) source checkout + `npm --workspace @jeswr/solid-server run build:lws-wasm` (needs Rust + `wasm-pack`; `prepack` and a guardrail refuse to pack without the wasm artifact); (2) `npm pack` the built package and commit/host the tarball — `package.json` `files` allowlist ships `bin/ src/ wasm/`, so the tarball is self-contained, ESM, Node ≥18, single runtime dep (`@solid/access-token-verifier`) |
| Recommendation | Ask Jesse to run the bootstrap publish (his own package, ~5 min). Until then, vendor a packed tarball into solid-mortgage; do **not** add Rust/wasm-pack to the app repo's CI |

## 4. Upstream contribution conventions (sparq-org/sparq)

Repo: the checkout's remote `jeswr/sparq` now redirects to **`sparq-org/sparq`** (public, default
branch `main`; verified via GitHub API). `AGENTS.md` is the source of truth; `CONTRIBUTING.md` is
deliberately thin.

| Convention | Detail |
|---|---|
| Task tracking | **beads** (`bd`), ids `sq-*` (e.g. epic `sq-6xasp` = the solid-server package). Every follow-up gets a bead (`bd create …`); never hand-edit `.beads/`; **no TODO/FIXME in code or markdown** |
| Commit labelling | Inline `[FABLE-5]` / `[GPT-5.6]` / `[OPUS-4.8]` / `[SONNET-4.6]` / `[HAIKU-4.5]` markers stamp **which model authored** each new code/doc block, paired with a `Co-Authored-By: Claude <model> <noreply@anthropic.com>` trailer. Existing markers are history — never rewrite. Commit subjects reference the bead: `feat(scope): … (sq-xxxxx) [MODEL] (#PR)` |
| Branch naming | `<kind>-<topic>` off `origin/main` (e.g. `feat-lws-dev-issuer`) |
| PR title | Conventional Commits (`feat/fix/perf/docs/ci/chore/test/refactor/build/style/revert`); the title becomes the squash subject and drives release-plz semver. Validator currently advisory |
| PR body | Must start with the 🤖 SPARQ-agent self-ID blockquote for agent-authored PRs; use the PR template (checklist tied to AGENTS.md's re-evaluation table) |
| Review | **roborev** post-commit hook reviews every commit with **codex** (cross-family). Verdict must PASS and every finding be fixed/beaded/closed-with-reason before merge; read async (`roborev show <sha>`), never block on `--wait`. Install the hook in any fresh clone (`roborev install-hook`) |
| Merge | GitHub **merge queue**: `gh pr merge <n> --auto` (a `--squash` flag is rejected — the queue picks the strategy); `ci-summary` green + all review threads resolved |
| CI gates a PR must pass | `cargo build`/`cargo test --workspace`; `cargo clippy --workspace --exclude sparq-py --all-targets -- -D warnings` + `cargo doc --all-features` with `-D warnings`; `cargo fmt --check` (informational); conformance **ratchets** — W3C SPARQL/SHACL/inference/GeoSPARQL/**Solid WAC+ACP** — never lowered; perf baseline + coverage ratchets; docs-quality (typos, markdownlint, privacy-claims, no-hard-coded-perf-numbers, README template ≤120 lines); supply-chain (`cargo deny`/`audit` + SBOM) if `Cargo.*` changes; CodeQL/miri/fuzz lanes. The aggregate `ci-summary` check gates |
| JS-package changes | `js.yml` gates `packages/solid-server`: `npm run build:lws-wasm` + `node --test` + `npm run check:package` (tarball-content guardrail) |
| wasm changes | `scripts/wasm-deps-guard.sh`, `wasm-pack test --node`, `wasm_bundle_bytes` size gate; keep the **core tier** artifact byte-stable (`sparql-endpoint` stays default-off in the crate) |
| Public API changes | MUST update the matching `skills/<surface>/SKILL.md` **in the same PR** (`gate-api-skill.py`); for the wasm server that is `skills/javascript-wasm/SKILL.md` |
| For our agents | sparq-org is Jesse's org, so PRs don't hit the "no unapproved upstream PRs" stop-gate — but follow all of the above; likely-touched beads/epics: `sq-6xasp` (solid-server package), `sq-250si` (trap recovery), `sq-r1ei8` (`/sparql` tier) |

## 5. Recommended adoption plan

1. **Now (solid-mortgage harness):** vendor a packed tarball (or ask Jesse for the bootstrap npm
   publish); `startSolidServer` per stakeholder identity in fixed-owner mode on `get-port` ports;
   a `seedPod()` helper for profile (`pim:storage`) + container templates; ETag polling instead of
   notifications.
2. **Next (multi-identity tests):** lift the `oidc.test.mjs` dev-issuer fixture into the harness;
   run pods with `oidc: true` so WAC grant/deny across borrower/lender/underwriter WebIDs is real.
3. **Upstream (feeds the "sparq contributions" task):** in priority order — (i) npm bootstrap
   publish (Jesse, credential-gated); (ii) `devIssuer` opt-in module in the Node host; (iii)
   multi-pod path-prefix routing in the host; (iv) changed-topic metadata across the wasm boundary
   + host-side WebSocketChannel2023; (v) JS-exposed store/body limits.
4. **solid-sdk migration:** gate on (i)+(ii); the fixed-owner mode already covers most SDK unit
   tests, but browser-login e2e keeps needing CSS (or an `oidc-provider`-based dev issuer) until
   (d) is solved.

## Sources

- sparq checkout (read-only, `origin/main` @ `947480b0`): `crates/sparq-lws-wasm/{README.md,src/lib.rs,Cargo.toml}`, `crates/sparq-lws-core/{README.md,src/main.rs,src/app_wasm.rs,src/authz/*,src/ldp/*,src/notifications/*,src/seed.rs}`, `packages/solid-server/{package.json,README.md,src/*,bin/solid-server.js,test/oidc.test.mjs,guardrails/check-package.mjs}`, `skills/javascript-wasm/SKILL.md`, `AGENTS.md`, `CONTRIBUTING.md`, `.github/workflows/{publish.yml,js.yml,pr-title.yml}`
- sparq repo location: <https://github.com/sparq-org/sparq> (GitHub API: `jeswr/sparq` redirects here; public, default `main`; checked 2026-07-15)
- npm publication status: <https://registry.npmjs.org/@jeswr%2fsolid-server> and <https://registry.npmjs.org/@jeswr%2fsparq> → 404 (`npm view`, 2026-07-15)
- CSS harness reference: `volunteering-with-fable/packages/solid-kit/src/testing/css-harness.ts`, `volunteering-with-fable/e2e/global-setup.ts` (local)
- Solid N3 Patch: <https://solidproject.org/TR/protocol#n3-patch>
- `@solid/access-token-verifier`: <https://www.npmjs.com/package/@solid/access-token-verifier>
- `oidc-provider` (candidate for a dev issuer): <https://www.npmjs.com/package/oidc-provider>
