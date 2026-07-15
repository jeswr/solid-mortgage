# LWS gaps — hit while building the sm-4 harness

Per AGENTS.md rule 4: gaps in sparq's `@jeswr/solid-server` (the `sparq-lws-wasm` WASM
distribution) are logged here and contributed upstream, never worked around silently. This is
the list **actually hit** while building `packages/solid-kit`'s harness
(`src/harness.ts`, `src/seed.ts`, `scripts/vendor-solid-server.mjs`) against sparq
`origin/main` @ `947480b0`. The full capability survey lives in
`docs/research/lws-survey.md`; known-but-not-yet-hit limits (2 MiB request cap, 64 MiB store
cap, Turtle/JSON-LD-only conneg) stay there until a task collides with them.

| # | Gap (as hit) | Stopgap in this repo | Upstream bead |
|---|---|---|---|
| 1 | **Not on npm** — `npm view @jeswr/solid-server` → E404; npm cannot install a monorepo subdirectory from git, so the package is unreachable without a Rust toolchain | `scripts/vendor-solid-server.mjs` builds from a sparq checkout and commits a packed tarball (800 KB) + `vendor/PROVENANCE.md`; installed via `file:` spec | sm-50 (`needs:user` — bootstrap publish + Trusted Publisher) |
| 2 | **`exports` map hides the building blocks** — only `"."` is exported; `SolidServer` (wasm class) and the `src/http.js` mapping helpers are unreachable, blocking any framework-mounted or service-worker host (fastify-host.md §3) | install-time patch `vendor/patches/@jeswr__solid-server.patch` (wired via `pnpm.patchedDependencies` in the root `package.json` — pnpm 10.4.1 ignores the pnpm-workspace.yaml location) adds `./http`, `./wasm`, `./wasm/*` subpaths; the vendor script verifies it still applies on re-vendor | sm-69 (sparq-org/sparq#2323: `createSolidPod().dispatch()` + first-party Fastify plugin + re-exports) |
| 3 | **No identity provider shipped** — `oidc: true` verifies DPoP-bound tokens but nothing local can mint them, and fixed-owner mode by construction cannot express anonymous/denied paths, so WAC allow/deny tests are impossible without extra machinery | dev-issuer fixture lifted from sparq's own `packages/solid-server/test/oidc.test.mjs` into `src/harness.ts` (per-account issuer: discovery + JWKS + WebID doc + `at+jwt` + per-request DPoP proofs). Consequence: in `oidc` mode the harness cannot honour caller-chosen WebIDs — it throws and points here | sm-5.1 (opt-in `devIssuer` export upstream) |
| 4 | **No account/pod provisioning API** — one wasm pod + one owner WebID per server instance; `normalizeBaseUrl` rejects path-bearing base URLs, so pods cannot share a port under `/{account}/…` prefixes. Side effect: `baseUrl` must be fixed before bind, forcing probe-then-bind port acquisition (`get-port` + EADDRINUSE retry) instead of race-free `listen(0)` | `provisionAccount()` boots one fixed-owner (or oidc) server per identity on a dynamic port — cheap (~ms) and mirrors account-per-write-test isolation | sm-5.2 (host-level pod registry / path-prefix routing) |
| 5 | **No notifications in the wasm build** — WebSocketChannel2023 exists only in native `sparq-lws-core`; the harness can offer no subscription surface for live-sync/inbox tests | ETag polling with `If-None-Match` (already exercised by the CRUD round-trip test); notification-dependent e2e stays blocked or falls back to the native binary | sm-5.3 (changed-topic metadata across the wasm boundary + host WS endpoint) |
| 6 | **`build:lws-wasm` fails opaquely on wasm-pack ≤ 0.13** — 0.13.1 forwards `--profile release-wasm` to cargo while still injecting its own `--release`; cargo rejects the pair. Verified working on 0.15.0 | `scripts/vendor-solid-server.mjs` preflights `wasm-pack --version` ≥ 0.14 with an explanatory error | sm-5.4 (upstream version preflight/README note) |

## Harness behaviour notes (not gaps)

- **DPoP jti replay protection is real**: reusing a captured `dpop` header is denied, so
  `authFetch` mints a fresh proof per request. Never snapshot auth headers in fixtures.
- **Byte-exact Turtle round-trip**: GET returns the seeded document verbatim (prefixed form),
  so assertions must pin namespaces via prefix declarations + qnames, not expanded IRIs.
- **Intermediate containers auto-create on PUT** and appear in `ldp:contains` — no seeding
  workaround needed for nested fixture paths.
- **A resource `.acl` replaces the inherited ACL entirely** — `publicReadAcl()` therefore
  always includes the owner clause; a read-only public ACL would lock the owner out of its
  own resource.
