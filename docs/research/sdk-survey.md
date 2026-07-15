# sdk-survey — jeswr/solid-sdk as the toolkit for solid-mortgage

Surveyed: read-only checkout of `jeswr/solid-sdk` @ origin/main (2026-07-15). 39 packages in
`packages/`, 13 private apps in `apps/`, 12 cross-cutting skills in `skills/`, pnpm + Turborepo,
`ignore-scripts=true`, dist never committed in the monorepo. Governing ADR:
`decisions/0001-monorepo-architecture.md`.

## 1. Package inventory relevant to app-building

All packages are v0.0.x–0.1.x, TypeScript ESM, `@jeswr/` scope (except unscoped `solid-offline`,
`create-solid-app`), self-described "experimental, AI-agent-generated". Maturity signals used
below: test-file count, `securityCritical` flag, colocated SKILL.md.

### Auth

| Package | What it does | API sketch | Maturity |
|---|---|---|---|
| `@jeswr/solid-auth-core` | Framework-free browser Solid login core: WebID-first issuer discovery, DPoP login, pristine-fetch capture (login-stall deadlock unrepresentable), silent restore, fail-closed allowed-origin fetch boundary, React `SessionProvider` | `createSolidAuth({callbackUri, clientId, authFlow, patchGlobalFetch})` → `auth.restore() / login(webId) / authenticatedFetch(url) / publicFetch(url) / logout() / dropLiveSession() / reArmAllowedOrigins() / rememberAccount()`; `./react` exports `SessionProvider` + `useSolidSession()` | securityCritical, 8 test files, SKILL.md. **The sanctioned choice for new browser apps** (the solid-reactive-authentication skill says "prefer @jeswr/solid-auth-core for new suite applications") |
| `@jeswr/auth-solid` | Solid-OIDC provider for Auth.js / next-auth v5 (server-side session): PKCE + state + nonce + DPoP via `customFetch` seam; verified-WebID-only, fail-closed; `solidDpopFetch` for pod requests from a persisted session | `await Solid({issuer, clientId, …})` provider; `persistSolidTokensIntoJwt()` in the jwt callback; `extractSolidAuthState()` + `solidDpopFetch(state)` server-side | 3 test files, SKILL.md; peer `@auth/core >=0.37`. Use only when Auth.js owns OIDC (server-rendered apps with sessions) |
| `@jeswr/solid-openid-client` | Solid-OIDC engine wrapping panva `openid-client` v6 for **Node/server/CLI/bot/agent** flows: discovery, auth-code+PKCE, DPoP-bound refresh, authed fetch | discovery → client → authorization-code callback → DPoP-attaching fetch (see package SKILL.md) | 1 test file (thin), SKILL.md, mirror-published pilot |
| `@jeswr/solid-dpop` | RFC 9449 DPoP proof primitives + client-credentials session + user-delegated auth-code flow; jose-only; ESM+CJS; `./testing` subpath drives CSS OIDC headlessly | Primitives: `createDpopProof`, `accessTokenHash`, `generateDpopKeyPair`; service-account: `createSession`, `acquireToken`, `authedFetch`, `rdfFetchFor`; user: `cliLogin`, `refreshSession`; test-only: `driveHeadlessOidc`/`headlessLogin` from `@jeswr/solid-dpop/testing` | 7 test files + live CSS v8 suite, SKILL.md, mirror-published pilot. Foundation of all other auth packages |
| `@jeswr/solid-session-restore` | Silent session restore for browser apps: WebID/issuer-scoped IndexedDB store for DPoP-bound refresh token + non-extractable key; fail-closed restore decision | store/restore/remembered-account helpers; composed by solid-auth-core and solid-elements | securityCritical, 6 test files, SKILL.md; "extracted from the proven pod-mail pilot" |
| `@jeswr/guarded-fetch` | SSRF / DNS-rebinding-guarded fetch: public-address-only classifier, https-only policy, redirect re-validation, size cap + timeout; `./node` adds undici DNS-pinning; also the pod-scope capability guard | injectable-fetch seam; `assertWithinPodScope` / `createPodScopedFetch`; `refuseRedirects` | securityCritical, 6 test files, adversarially reviewed (~40 smuggle inputs). Dependency of auth-solid, solid-vc, rxdb-solid, solid-components |

### Data / VC / storage

| Package | What it does | API sketch | Maturity |
|---|---|---|---|
| `@jeswr/solid-vc` | **W3C VC 2.0 data model + sign/verify with a pluggable proof-suite seam** — built explicitly so "a JWT, BBS, or SPARQ ZKP proof plugs into" it; ships EdDSA/ECDSA Data Integrity over RDFC-1.0 (rdf-canonize + jose); real `https://www.w3.org/ns/credentials/v2` vocab; credentials are queryable JSON-LD/RDF | `generateKeyPairForSuite(id, "Ed25519")`, `issue`/`issueAgentAuthorization({principal, agent, action, target, policy, validUntil}, key)`, `verifyCredential(vc, {resolveKey, trustedIssuers})`, `countersign`, `canonicalNQuads`, `ProofSuite` interface | securityCritical, 15 test files (tamper/expiry/issuer-binding rejection). **The VC + ZKP-seam centrepiece for solid-mortgage** |
| `@jeswr/solid-odrl` | ODRL policy model (access requests with `odrl:permission`/`odrl:purpose` DPV constraints) — used by access-manager's request/consent pipeline | typed accessors over ODRL RDF | workspace dep of access-manager + agent-authz-verifier |
| `@jeswr/rdf-serialize` | The single sanctioned `n3.Writer` serialiser (Turtle/N-Triples/N-Quads/TriG from `Quad[]`); consolidates 5 prior copies | `serialize(quads, {prefixes, format})` | securityCritical, 3 test files |
| `@jeswr/unstorage-solid` | unstorage `defineDriver()` backed by a pod over LDP; keys→resource paths; container listings via fetch-rdf | unstorage KV API; peer `unstorage ^1.10` | securityCritical, 8 test files |
| `@jeswr/rxdb-solid` | RxDB replication plugin ↔ pod, one resource per document, injectable authed fetch, checkpoint pull, tombstones, conflictHandler delegation, fail-closed scope guard | `./replication`, `./store`, `./scope` subpaths; optional `toRdf`/`fromRdf` seam; peer `rxdb ^16` | 3 test files (in src/) |
| `solid-offline` | Offline-first service worker: never-authoritative caching, proactive warming, WebSocketChannel2023 invalidation, React hooks | `.`, `./worker`, `./react` | securityCritical, 15 test files, SKILL.md |

### UI

| Package | What it does | API sketch | Maturity |
|---|---|---|---|
| `@jeswr/app-shell` | React shell: OKLCH light/dark theme system + WebID account menu; Vite & Next-safe (no next-themes/next-link); Radix + lucide | `.` components + `./styles.css`, `./tokens.css`, `./theme.css`, `./reset.css`; `ErrorBoundary`/`ErrorState` | 11 test files, SKILL.md |
| `@jeswr/solid-elements` | Lit 3 web components: presentation-only chrome (theme toggle, account menu, feedback, login panel, empty/error/loading/saving states) inheriting app-shell tokens; React wrappers | `.` registers `jeswr-*` elements; `./react` wrappers; `./auth` optional login adapter (prefer solid-auth-core) | securityCritical, 15 test files, SKILL.md |
| `@jeswr/solid-components` | Lit 3 **data-bound** components: read-only `DataController` (typed read, container listing, conditional GET, 4-class error taxonomy), `<jeswr-shacl-view>`, per-class elements (`<jeswr-task-list>`, `<jeswr-profile-card>`, …), `<solid-view>` composer | `.` elements + `./react`; `./custom-elements.json` CEM | securityCritical, 21 test files |

### Scaffolding / tools

| Package | What it does | Maturity |
|---|---|---|
| `create-solid-app` | Private, unpublished scaffolder: Next.js App Router + React 19 + Tailwind 4 + shadcn template with Solid login plumbing, CSS dev workflow (`scripts/dev.mjs`), `--seed-pod` (boots CSS v8 + seeded account), `--data-model` starter views, guardrails (lockfile-transport check, css-isolation regression test) | v0.0.0-prototype; publish gated on solid-contrib/reactive-authentication#18; template still uses `@solid/reactive-authentication` (not solid-auth-core) and github-pins 4 suite packages |

### Agents / misc (lower relevance)

`solid-agent-card`, `solid-a2a`, `agent-authz-verifier` (agentic authorization — relevant only if
mortgage agents act on VCs), `solid-mcp`, `n8n-nodes-solid`, federation-* (registry/trust/vocab),
domain models (`solid-task-model`, `solid-bookmark`, `solid-health-diary`, … — pattern reference
for a future `solid-mortgage-model` package), bridges (`solid-dav-bridge`, `matrix-chat-to-pod`,
`solid-granary`), `y-solid`, `solid-webauthn-reauth`, `solid-api-auth`.

## 2. How an external monorepo consumes these packages TODAY

Mechanics (README + ADR §4.4): consumers install `github:jeswr/<pkg>#<sha>` under
`ignore-scripts=true`, which requires a committed `dist/` in a repo literally named
`jeswr/<pkg>`. npm cannot install a subdirectory of a git repo, so `jeswr/solid-sdk` itself is
never an install target. Each package's original standalone repo is (or becomes) a read-only
mirror published by `scripts/mirror-publish.mjs` (fail-closed: clean tree, full gate, byte-compare
rebuild, `Mirror-Of:` trailer).

**Verified state (GitHub API, 2026-07-15) — the README's "mirror publishing has not run yet" is
stale:**

| Package repo | Exists public | dist/ at HEAD | HEAD state |
|---|---|---|---|
| `jeswr/solid-dpop` | yes | yes | **mirror-published** — `mirror(solid-dpop): publish from jeswr/solid-sdk@0a1abe0c509d` with `Mirror-Of:` trailer |
| `jeswr/solid-openid-client` | yes | yes | **mirror-published** from same monorepo sha |
| `jeswr/solid-bookmark` | yes | yes | **mirror-published** from same monorepo sha |
| `jeswr/app-shell` | yes | yes | pre-monorepo standalone commit (2026-07-05); template pin `7f46437…` == HEAD |
| `jeswr/guarded-fetch` | yes | yes (18 entries) | pre-monorepo standalone (2026-07-04); template pin `92f75f7…` resolves |
| `jeswr/solid-auth-core` | yes | yes (17 entries) | pre-monorepo standalone (2026-07-06) |
| `jeswr/solid-vc` | yes | yes (42 entries) | pre-monorepo standalone (2026-07-07) |

Every one of the 39 `packages/*` names has a standalone `jeswr/<pkg>` repo (checked all — zero
missing). So **no package exists only in the monorepo**, but for everything except the 3 pilot
packages the standalone HEAD is a *pre-import snapshot*: the monorepo carries post-import fixes
(e.g. `fix(solid-auth-core): retain declaration containment guard` 2026-07-12,
`refactor(solid-components): share RDF serialization` 2026-07-13) that no mirror serves yet.

**Recommended consumption strategy for solid-mortgage** (in order):

1. **Pin `github:jeswr/<pkg>#<sha>` against the standalone/mirror repos.** It is the designed,
   verified path; works identically under npm and pnpm; `ignore-scripts`-safe (committed dist);
   old shas resolve forever (ADR §5 no-flag-day guarantee).
2. **Before pinning, run (or request) a mirror-publish sweep of the packages solid-mortgage
   needs** — `node scripts/mirror-publish.mjs <pkg>` per package in the solid-sdk checkout. The
   flow is proven (3 pilots live), topological, fail-closed. Shortlist: `solid-dpop` (done),
   `guarded-fetch`, `solid-auth-core`, `solid-session-restore`, `rdf-serialize`, `solid-vc`,
   `solid-odrl`, `app-shell`, `solid-elements`, `solid-components`. This closes the ~1-week
   staleness gap without inventing a new mechanism.
3. Where a sweep is deferred, pin current standalone HEAD shas — functional, slightly stale.
4. **Rejected:** pnpm git-subdir installs of the monorepo (`#path:/packages/<pkg>`) — the monorepo
   commits no `dist/` and `ignore-scripts=true` blocks the `prepare` build, so installs are
   broken by construction. Git submodule of solid-sdk — couples solid-mortgage to a 39-package
   workspace and bypasses the mirror integrity gate. Copying the mirror-publish flow — needless;
   the real one already runs.
5. npm deps that install normally alongside: `@jeswr/fetch-rdf@0.1.0`, `@solid/object@0.6.0`,
   `@solid/reactive-authentication@0.1.5` (all verified on the npm registry).

## 3. Community Solid Server — the full migration surface

CSS is the sole dev/test server everywhere. Uniform pattern: **two-webServer Playwright config**
(fresh in-memory CSS + built app) + **inline `global-setup.ts`** (account/pod via `.account` API,
client-credentials DPoP profile seeding — `foaf:name` + `pim:storage`) + **`scripts/dev.mjs`**
orchestrator (reuses a CSS on :3000, seeds alice/bob, prints credentials). Ports: CSS owns :3000
in dev (issuer keyed to origin), app :3200, per-app e2e CSS ports (3099 pod-manager, 3086
solid-dpop live, 3088 create-solid-app seeder), env-overridable (`E2E_CSS_PORT`).

File-level map (paths relative to solid-sdk root; every file that must change to swap in sparq's
`@jeswr/solid-server`):

| Surface | Files | CSS coupling |
|---|---|---|
| package.json devDeps | `packages/solid-dpop/package.json` (`@solid/community-server ^8.0.0-alpha.3`), `packages/create-solid-app/package.json` (`8.0.0-alpha.3`) | `require.resolve("@solid/community-server/bin/server.js")` |
| Playwright webServer commands (`npx -y @solid/community-server@7[.1.9] -p $PORT`) | `apps/pod-manager/playwright.config.ts`, `apps/issues/playwright.config.ts`, `apps/coeliac/playwright.config.ts`, `apps/pod-{mail,health,music,docs,chat,photos,money,drive}/web/playwright.config.ts`, `apps/pod-drive/web/tests/extension/playwright.config.ts` (11 configs; pod-* pin exact `7.1.9`, rest pin `@7`) | spawn command + readiness URL |
| e2e global setups (seed recipe: `.account` cookie flow → password → pod → clientCredentials → DPoP PUT profile) | `apps/pod-manager/e2e/global-setup.ts` + `e2e/css-account.ts`, per-app `tests/e2e/global-setup.ts` in the 8 pod-apps, `apps/coeliac/e2e/global-setup.ts`, `apps/issues/…` | CSS v7 `.account` JSON API + `/.oidc/token` client-credentials |
| dev orchestrators | `apps/pod-manager/scripts/dev.mjs`, `apps/issues/scripts/dev.mjs`, `packages/create-solid-app/template/scripts/dev.mjs`, `apps/issues/.claude/skills/solid-test-infrastructure/dev.mjs` | spawn `@solid/community-server@7`, reuse-if-up, same seed recipe |
| Package live tests | `packages/solid-dpop/test/live-setup.ts` (+ `vitest.live.config.ts`) — boots CSS **v8 alpha**, drives OIDC pick-webid/consent headlessly; `packages/create-solid-app/src/seed-pod.ts` + `src/seed-deps.ts` (SEED_DEP_SPECS pins `8.0.0-alpha.3`) + `test/seed-deps.test.ts` | CSS bin path, v8 account API |
| CSS Components.js configs | `apps/issues/config/css-memory-acp.json` (in-memory ACP preset CSS lacks), `apps/issues/config/css-memory-wac-templates.json` (custom pod templates) | CSS-internal config vocabulary — no direct sparq equivalent; needs feature-level mapping (ACP mode, seeded-pod templates) |
| Skills / docs encoding the harness | `skills/solid-test-infrastructure/SKILL.md`, `skills/solid-server-matrix/SKILL.md`, `apps/pod-manager/AGENTS.md` §Servers, `apps/issues/AGENTS.md` §Servers, `apps/issues/docs/local-ops.md`, `apps/issues/.claude/skills/*` (vendored copies), `packages/create-solid-app/README.md`, `packages/create-solid-app/template/AGENTS.md` | prose + command examples ("pin major 7 — bare name resolves to 8.0 alpha", "CSS boot ~13–15 s") |

Migration observations: (a) the launch command is repeated verbatim in ~15 files — for
solid-mortgage, isolate server boot + seeding behind **one** shared module from day one so the
CSS→sparq swap is a 1-file change; (b) the seed recipe is CSS-version-specific (v7 `.account`
API; v8 differs) — sparq needs an equivalent account/pod/client-credentials seeding surface or a
pre-seeded fixture mode; (c) a headline CSS pain point disappears with sparq: the ~13–15 s
Components.js boot that forced the reuse-if-up design; (d) `@jeswr/solid-server` is not yet
resolvable — `jeswr/solid-server` returns 404 on GitHub and `@jeswr/solid-server` 404s on npm
(checked 2026-07-15) — so the harness seam must tolerate a swappable backend until it publishes.

## 4. App-level patterns to reuse, and skills to invoke

**pod-manager** (`apps/pod-manager/` — Next.js 15 App Router, static export): the flagship
consumer. Reuse: `scripts/dev.mjs` one-command dev env; e2e against the **production static
export** served by `scripts/serve-static.mjs` (mid-login `next dev` rebuilds destroy in-flight
OIDC state — diagnosed, not hypothetical); `src/app/clientid.jsonld` static Client Identifier
Document; fresh-CSS-per-e2e-run (in-memory account store corrupts across runs); `e2e-live/`
secondary suite against a live server; per-worktree port overrides. Caveat: its auth is still
vendored `@solid/reactive-authentication` 0.1.3 tgz (`vendor/`) — do **not** copy that; use
solid-auth-core.

**access-manager** (`apps/access-manager/` — Vite + React 19, workspace deps): the closest
functional cousin to mortgage consent flows. Reuse: ODRL-shaped access-request inbox
(`odrl:permission` + DPV purpose + expiry) via `ldp:inbox`; CAS-pinned approve/deny pipeline
(`If-Match` compare-and-set, bounded retries); data-class grouping via type indexes; lenient
parsing of untrusted inbox RDF; DPV consent receipts; `test/pod-stub.ts` fixture pattern.

**create-solid-app template** (`packages/create-solid-app/template/`): the scaffold shape for
each stakeholder app — App Router + Tailwind 4 + shadcn + `components/solid/`
(LoginPanel/ProfileCard/PodDataView/SolidAuthProvider) + `lib/solid/` auth plumbing +
`tests/css-isolation.test.ts` + `scripts/check-lockfile-transport.mjs`. Scaffold-by-copy is fine;
the CLI is unpublished and its auth layer lags the suite (reactive-authentication, not
solid-auth-core).

**Skills routing** (AGENTS.md makes this mandatory in-repo; mirror it for solid-mortgage):
package-local `packages/{solid-auth-core,solid-dpop,auth-solid,solid-openid-client,solid-elements,app-shell,solid-offline,solid-session-restore}/SKILL.md`
before touching each package; cross-cutting `skills/solid-test-infrastructure` (harness),
`solid-client-id` (stable client identity per branded app — essential for a multi-app showcase),
`solid-fetch-rdf`, `solid-object`, `solid-type-index` (cross-app data discovery),
`solid-server-matrix` (CSS/ESS/NSS differentials), `solid-notifications` (live updates),
`solid-optimistic-ui`, `solid-scale-and-sharding`, `accessible-html-links`.

## Sources

- solid-sdk monorepo (all in-repo paths above): https://github.com/jeswr/solid-sdk — README, AGENTS.md, `decisions/0001-monorepo-architecture.md`, `scripts/mirror-publish.mjs`
- Mirror-publish pilot commits (verified `Mirror-Of: jeswr/solid-sdk@0a1abe0c…` trailers): https://github.com/jeswr/solid-dpop/commit/7fbc739a — https://github.com/jeswr/solid-openid-client/commit/c6fb01b0 — https://github.com/jeswr/solid-bookmark/commit/034793ab
- Standalone repos + dist spot-checks (GitHub API `repos/jeswr/<pkg>` + `/contents/dist`, 2026-07-15): https://github.com/jeswr/app-shell (HEAD `7f46437`), https://github.com/jeswr/guarded-fetch (pin `92f75f7` resolves), https://github.com/jeswr/solid-auth-core, https://github.com/jeswr/solid-vc
- npm registry checks (2026-07-15): https://www.npmjs.com/package/@jeswr/fetch-rdf (0.1.0), https://www.npmjs.com/package/@solid/object (0.6.0), https://www.npmjs.com/package/@solid/reactive-authentication (0.1.5), https://www.npmjs.com/package/@solid/community-server (latest = 8.0.0-alpha.3; apps pin @7/7.1.9); @jeswr/solid-server = 404, github.com/jeswr/solid-server = 404
- create-solid-app publish blocker: https://github.com/solid-contrib/reactive-authentication/issues/18
- Community Solid Server: https://github.com/CommunitySolidServer/CommunitySolidServer
