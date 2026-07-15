# Fastify host for the sparq wasm Solid server — what exists, what to ask upstream

Scope: Jesse wants the localhost dev Solid server to be the sparq LWS core served through
Fastify, not the bespoke listener. Grounded in the read-only sparq checkout `origin/main` @
`947480b0` (paths sparq-repo-relative below), GitHub issue search on `sparq-org/sparq`, and the
house `fastify-best-practices` skill. Baselines: `docs/research/lws-survey.md`,
`docs/research/deployed-infra.md`.

**Verdict.** The Node host today is **bare `node:http`** (`createServer` in
`packages/solid-server/src/trap-recovery.js`) — no framework, no undici, and this was a
*deliberate* v1 design choice, not an accident. **No Fastify/framework-host plan exists anywhere
in sparq** (beads, interactions, research/, docs/, book/, GitHub issues all negative) — Jesse's
recollection of a plan is not confirmed; the closest anchors are the design doc
`research/wasm-solid-server-npm-design.md` (whose bead 4 specifies "a Node HTTP listener") and
the package epic `sq-6xasp`. A Fastify route handler **can call the wasm `handleRequest`
directly** — the boundary is fully buffered both ways, so there is no streaming problem — but a
clean adapter in our harness is blocked-by-encapsulation today: the published package's
`exports` map exposes only `"."`, and neither the `SolidServer` pod factory nor the
`src/http.js` mapping helpers are re-exported. The right move is the upstream issue drafted in
§5 (transport-agnostic dispatcher + first-party Fastify plugin), with a vendored-tarball patch
as the meanwhile path.

## 1. What the Node host uses today

| Question | Answer | Evidence |
|---|---|---|
| HTTP server | **Bare `node:http`** — `createServer((req, res) => …)`; no Fastify/Express/undici anywhere in the package | `packages/solid-server/src/trap-recovery.js:3,60` |
| Only runtime dep | `@solid/access-token-verifier` (OIDC verify); `jose` is dev-only | `packages/solid-server/package.json` |
| Bind | `server.listen(port, '127.0.0.1')` — loopback-only by construction | `src/index.js:106` |
| Entry points | `startSolidServer(opts)` (Node API) and the `npx` bin (fixed-owner only, `--port/--base-url/--owner-webid`) | `src/index.js:81`, `src/cli.js`, `bin/solid-server.js` |
| Dispatcher | `attachTrapRecoveryHandler(makePod, { authenticate })` **fuses three concerns**: pod lifecycle (create/recycle/free), request↔wasm mapping, and the `node:http` server it constructs itself. Returns `{ server, freePod }` | `src/trap-recovery.js:48-113` |
| Request mapping | method = `req.method`; url = `req.url` (origin-form incl. query string); headers = `req.rawHeaders` flattened (repeats + order preserved); body buffered to `Uint8Array` with a **2 MiB cap** (413 on excess); webid = `authenticate(req)` (fixed-owner const or DPoP verify) | `src/http.js:14-35`, `src/auth.js` |
| Response mapping | wasm `LwsResponse {status, headers: flat pairs, body}` copied then `.free()`d; written via `res.appendHeader(name, value)` per pair (repeats preserved) + `res.end(body)` | `src/http.js:37-67` |
| Error mapping | 413 body-too-large; **503 + pod recycle** on `WebAssembly.RuntimeError` (wasm trap poisons the instance permanently); 500 otherwise; `res.destroy()` if headers already sent | `src/trap-recovery.js:71-106` |
| Package exports | `exports: { ".": … }` **only** — `wasm/` and `src/http.js` ship in the tarball but are not importable subpaths; `index.js` re-exports only `attachTrapRecoveryHandler` + `isWasmTrap`; **`SolidServer` itself is not exported at all** | `package.json:9-14`, `src/index.js:5,9` |

### The wasm call a Fastify handler would make

`SolidServer` (crate `sparq-lws-wasm`) is constructed `new SolidServer(baseUrl, ownerWebid)`
(provisions the root WAC ACL; **not** authentication) and exposes exactly one request method:

```
handleRequest(method: string, path: string, headers: string[], body: Uint8Array,
              authenticatedWebid?: string) → Promise<LwsResponse>
```

- `path` must be **origin-form** (`/…`, query string included; scheme/authority rejected) — `crates/sparq-lws-wasm/src/lib.rs:169-171`.
- `headers` is a flat `[name, value, …]` array; odd length rejected; repeats appended into the axum `HeaderMap` — `lib.rs:118,178-184`.
- `body` is a full `Vec<u8>` — **no streaming across the boundary in either direction**; the response body is likewise fully collected (`to_bytes(…, usize::MAX)`) — `lib.rs:141`.
- `LwsResponse` getters: `status: u16`, `headers: string[]` (flat pairs, repeats preserved — `lib.rs:54-63`), `body: Uint8Array`; the JS copy must call `.free()` (host does, in `copyWasmResponse`).
- The returned Promise needs no Tokio reactor (`futures_executor`/`wasm-bindgen-futures`) — `lib.rs:120`.
- Trap contract: a Rust panic/OOM lowers to `WebAssembly.RuntimeError`; the instance is then **permanently poisoned** and must be freed + reconstructed; README/host respond 503 — `lib.rs:11-22`, `src/trap-recovery.js`.

So yes — a Fastify route handler can invoke it directly; every host obligation (raw path with
query, repeated headers both ways, buffered byte bodies, 2 MiB cap, trap recycle, `.free()`
discipline) is already met by ~130 lines of `src/http.js` + `src/trap-recovery.js` logic that a
plugin re-implements or upstream refactors out (§4).

## 2. Search for an existing Fastify/framework-host plan — negative

| Where | Query | Result |
|---|---|---|
| `.beads/issues.jsonl` (1,258 issues) | `fastify\|hono\|koa` over title+description+comments | **0** (`express` hits are all "expression/expressive" substrings) |
| `.beads/issues.jsonl` | `framework host\|host adapter\|http framework\|middleware\|adapter\|dev-server` | Nothing host-shaped; adapters are all fedclient/bench |
| `.beads/interactions.jsonl` | `fastify` | 0 |
| `research/`, `docs/`, `book/`, `site/`, `skills/` | `fastify` | 1 hit: TechEmpower throughput row in `research/concurrent-serving-litreview-C-scheduling-servers-streaming.md:53` — benchmark citation, not a plan |
| `research/wasm-solid-server-npm-design.md` (the package's design record) | read | Bead 4 explicitly specifies "**a Node HTTP listener**"; follow-up beads are OIDC-in-wasm (6) and persistent store (7) — no framework-host follow-up |
| GitHub `sparq-org/sparq` issues (open+closed) | `fastify`; `framework OR host`; `solid-server`; `npx OR "node host" OR "dev server"`; `middleware OR adapter in:title` | No framework-host item. Nearest neighbours: #1346 (PSS consumer-requirements meta), #1248 (Rust in-process embedding API), #992 (WAC feature requests) — all native/Rust-side |
| Epic `sq-6xasp` (solid-server package epic, per code comments) | grep issues.jsonl | **Absent from the current export** (0 matches — likely compacted/closed); referenced only from code comments and `docs/research/lws-survey.md` §4 |

**Conclusion:** there is no existing plan/bead/doc to reference. The issue we file will be the
first-class record; it should cite `research/wasm-solid-server-npm-design.md` and the
`sq-6xasp` epic id as lineage, and let the sparq agent mint the bead (repo convention: every
follow-up gets a `bd create`, no TODOs).

## 3. Thin-adapter option in the solid-mortgage harness (meanwhile)

A Fastify plugin wrapping `handleRequest` — assessed against the house
`fastify-best-practices` skill.

| Concern | Difficulty | Notes |
|---|---|---|
| Byte bodies | **Trivial but load-bearing** | `removeAllContentTypeParsers()` then `addContentTypeParser('*', { parseAs: 'buffer' }, …)`. Without this, Fastify's default parsers destroy correctness: `application/json` bodies arrive as parsed objects and `text/plain` as strings — JSON-LD/N3 PUT bytes must reach wasm untouched |
| Body cap | Trivial | `Fastify({ bodyLimit: 2 * 1024 * 1024 })` (default 1 MiB would 413 bodies the wasm router accepts); map `FST_ERR_CTP_BODY_TOO_LARGE` → the host's `413 text/plain` shape in `setErrorHandler` for parity |
| Routing | Trivial | `app.all('/*', handler)` (+ `/` for safety), `exposeHeadRoutes: false` so HEAD flows through the one handler; Fastify's default method set (GET/HEAD/POST/PUT/PATCH/DELETE/OPTIONS) covers the whole Solid surface, so no `addHttpMethod` needed |
| Path + query | Trivial | Pass `request.raw.url` (origin-form incl. `?query=` — required for `/sparql` GET), never Fastify's parsed/normalised view |
| Repeated request headers | Easy once known | Fastify's `request.headers` is Node's *coalesced* object — must use `request.raw.rawHeaders` (same flatten the host does). Casing is irrelevant (axum `HeaderName` lowercases) |
| Repeated response headers | Moderate | `reply.header()` replaces rather than appends for non-set-cookie names. Two clean options: (a) group flat pairs into `name → string[]` and set arrays (Node writes arrays as repeated header lines); (b) `reply.hijack()` and reuse the host's exact `appendHeader` loop on `reply.raw` — byte-faithful, at the cost of skipping Fastify's onSend hooks. (a) is the Fastify-idiomatic choice |
| Conditional requests / ETags / CORS / WAC-Allow | **No work** | Pure pass-through; `If-Match`/`If-None-Match`, reflective-origin CORS, `WAC-Allow` are all computed in wasm. Do **not** register `@fastify/cors` (would fight the wasm CORS layer) |
| Content-length / streaming | **No work** | The wasm boundary is fully buffered both ways (`Vec<u8>` in/out, 2 MiB cap); send the response `Buffer` via `reply.send()` — Fastify skips JSON serialisation for Buffers; set `content-length` from the wasm pairs |
| Abort handling | Near-nil | Responses are single buffered writes; mirror the host's `headersSent → destroy` guard; `onRequestAbort` optional |
| 503-on-trap recycling | Moderate (~30 lines) | `attachTrapRecoveryHandler` is **not reusable** (it constructs its own `node:http` server), but `isWasmTrap` IS exported from the package root. Plugin owns pod state (`makePod` + recycle-on-trap in the handler's try/catch, then 503 `text/plain`), mirroring `trap-recovery.js:71-106` |
| OIDC mode | Easy | `createOidcAuthenticator` is not exported, but it only needs the `authorization` + `dpop` headers, method, and URL — reimplementable against `@solid/access-token-verifier` in ~40 lines, or run fixed-owner (our harness default per lws-survey) |
| **Access to `SolidServer` at all** | **The real blocker** | `exports` exposes only `"."`; `SolidServer`, the wasm glue, and `src/http.js` helpers are unreachable through the package name. From our planned vendored tarball we control the artifact, so the meanwhile fix is a one-line tarball patch (add `"./wasm/*"` — or use a source-checkout path import, which bypasses `exports`) |

Net: **nothing is genuinely hard** — the whole plugin is ~120 lines with two correctness traps
(content-type parser discipline; repeated response headers) and one packaging blocker that a
vendored-tarball patch removes. But every one of those lines duplicates upstream host logic,
which is exactly the "second occurrence → extract to SDK" smell: the durable fix is upstream.

## 4. What to request upstream

Refactor, don't rewrite: split `attachTrapRecoveryHandler`'s three fused concerns so the
pod+dispatch core is transport-agnostic, then ship a first-party Fastify plugin over it.

```js
// 1. transport-agnostic core (factored out of trap-recovery.js — same logic, no createServer)
import { createSolidPod } from '@jeswr/solid-server';
const pod = await createSolidPod({ baseUrl, ownerWebid, oidc });  // owns wasm init + instance + trap recycle
const res = await pod.dispatch({ method, url, rawHeaders, body }); // → { status, headers /* flat pairs */, body: Buffer }
pod.free();

// 2. first-party Fastify plugin over it
import { solidPod } from '@jeswr/solid-server/fastify';
await fastify.register(solidPod, { baseUrl, ownerWebid, oidc, prefix: '/' });
```

`dispatch` performs body-cap enforcement (413), trap recycle (503 result, never a poisoned
instance), and `LwsResponse` copy/free internally — so *any* framework (Fastify today, Hono/a
SharedWorker fetch-handler for the in-browser demo domain tomorrow) gets identical semantics.
Notably `deployed-infra.md` §3's in-browser architecture needs exactly this dispatcher shape
(service-worker `fetch` → pod), so the refactor pays twice. `startSolidServer` stays as the
zero-dep default; Fastify lands as an optional peer dependency of the `./fastify` subpath, so
the core install keeps its single runtime dep.

## 5. Draft GitHub issue for `sparq-org/sparq`

Conventions honoured: `feature.yml` template (blank issues disabled), `[feature]: ` title
prefix + `feature` label auto-applied, agent self-ID blockquote (per #1346/#992 house style),
no TODO language, bead-minting left to the sparq agent. **Lead files it — not this agent.**

**Title:** `[feature]: Fastify host mode for @jeswr/solid-server — transport-agnostic dispatcher + first-party plugin`

**Body (template fields):**

---

> 🤖 **solid-mortgage agent** — @jeswr's agent for the Solid mortgage showcase (Claude Fable 5), filing a consumer-side feature request per the issues-only contribution channel. No sequencing implied; scope/steer is the sparq agent's call.

### Problem / motivation

`@jeswr/solid-server`'s Node host is a bespoke `node:http` listener:
`attachTrapRecoveryHandler` (`packages/solid-server/src/trap-recovery.js`) fuses pod lifecycle
(create / trap-recycle / free), the request↔wasm mapping (`src/http.js`), and the
`createServer` transport into one unit whose only entry is `startSolidServer()`.

Consumers that already run a web framework cannot mount the pod:

- The maintainer's direction for localhost dev servers (jeswr/solid-mortgage, and the
  jeswr/solid-sdk CSS→sparq migration behind it) is the LWS wasm core served through
  **Fastify**, not a bespoke listener — composing the pod with app routes, Pino logging, and
  the standard plugin ecosystem.
- The in-browser demo architecture (per-visitor pods behind a service-worker `fetch` handler)
  needs the same thing: a dispatcher callable per-request without a Node socket attached.

Writing that adapter downstream today is blocked by encapsulation: the package `exports` map
exposes only `"."`, and neither the wasm `SolidServer` class nor the `src/http.js` helpers
(`flattenRequestHeaders`, `readRequestBody`, `copyWasmResponse`) are re-exported — only
`attachTrapRecoveryHandler` (unusable here: it constructs its own server) and `isWasmTrap`
reach the public surface. So every framework consumer must vendor-patch the tarball and
re-implement ~130 lines of host logic, including the trap-recycle contract
(`WebAssembly.RuntimeError` → free poisoned instance → fresh pod → 503) that is easy to get
subtly wrong.

### Proposed solution

Two steps, second building on first:

1. **Factor a transport-agnostic dispatcher out of `attachTrapRecoveryHandler`** (same logic,
   no `createServer`):

   ```js
   const pod = await createSolidPod({ baseUrl, ownerWebid, oidc });
   // dispatch owns: 2 MiB cap (413), trap recycle (503, never a poisoned instance),
   // LwsResponse copy + free, repeated-header preservation both ways
   const { status, headers /* flat name/value pairs */, body /* Buffer */ } =
     await pod.dispatch({ method, url /* origin-form incl. query */, rawHeaders, body });
   pod.free();
   ```

   `startSolidServer` becomes a thin `node:http` shell over it — behaviour and tests unchanged.

2. **A first-party Fastify plugin** on a subpath export, with `fastify` as an optional peer
   dependency (core install keeps its single runtime dep):

   ```js
   import { solidPod } from '@jeswr/solid-server/fastify';
   await fastify.register(solidPod, { baseUrl, ownerWebid, oidc });
   ```

   Plugin obligations (all mechanical over `dispatch`): `removeAllContentTypeParsers()` + a
   `'*'` buffer parser so JSON-LD/N3 bytes reach wasm unparsed; `bodyLimit` 2 MiB with
   `FST_ERR_CTP_BODY_TOO_LARGE` mapped to the host's 413 shape; catch-all `all('/*')` with
   `exposeHeadRoutes: false`; `request.raw.url` + `request.raw.rawHeaders` in (repeated
   headers, `/sparql?query=` intact); grouped array-valued `reply.headers()` out (repeated
   `Link`/`Vary` preserved); no `@fastify/cors` (wasm owns CORS).

Also export the building blocks (`SolidServer` via the package root or a `./wasm` subpath, and
the `http.js` helpers) so other hosts (service-worker/browser) can be assembled downstream
without tarball patching.

### Affected surface / crate

`packages/solid-server` (Node host only). No change to `sparq-lws-wasm` /
`sparq-lws-core` — `handleRequest(method, path, headers, body, authenticatedWebid)` is already
the right boundary (fully buffered, origin-form path, flat repeated-header pairs).

### Alternatives considered

- **Downstream Fastify adapter in the consuming repo** — works (~120 lines) but requires
  patching the published `exports` map to reach `SolidServer`, and duplicates the
  trap-recycle/413/header logic that will drift from upstream fixes. Fine as a stopgap, wrong
  as an end state.
- **Replacing the bare listener with Fastify inside `startSolidServer`** — rejected: adds a
  framework dependency to every consumer of a deliberately minimal package; the dispatcher +
  optional-peer plugin keeps the core zero-framework.
- **Express/Hono instead of Fastify** — the consuming projects standardise on Fastify; the
  dispatcher makes the plugin layer trivial for any other framework later.

### Additional context

- Design lineage: `research/wasm-solid-server-npm-design.md` (bead 4 deliberately chose "a
  Node HTTP listener" for v1; this is the follow-up that design implied but never beaded);
  package epic `sq-6xasp`; trap contract `sq-250si`.
- Consuming projects: jeswr/solid-mortgage (multi-stakeholder Solid showcase; localhost dev +
  e2e harness runs one fixed-owner pod per stakeholder identity), then the jeswr/solid-sdk
  dev-server migration, and the showcase's in-browser mode (service-worker host over the same
  `dispatch`).
- A public-API change here gates on updating `skills/javascript-wasm/SKILL.md` in the same PR
  (`gate-api-skill.py`), and `js.yml` covers `packages/solid-server` — happy for the plugin to
  land with `node --test` coverage that drives a real Fastify instance against the wasm pod.

---

## 6. Recommendation

1. **File the §5 issue** on `sparq-org/sparq` (lead action; Jesse's org, so no upstream
   stop-gate — follow the roborev/bead/model-marker conventions if we also send the PR).
2. **Meanwhile in solid-mortgage:** keep the harness on `startSolidServer` (Task 4 needs
   nothing Fastify-specific to start); if the Fastify composition is wanted before upstream
   lands, build the ~120-line plugin in `packages/solid-kit` against a vendored tarball with
   the one-line `exports` patch, importing `isWasmTrap` from the package root — and delete it
   when the upstream plugin ships.
3. The `createSolidPod().dispatch()` shape is the same primitive the in-browser demo's
   service-worker host needs — reference this issue from the deployed-infra follow-ups so the
   two asks don't fork.

## Sources

- sparq checkout (read-only, `origin/main` @ `947480b0`): `packages/solid-server/{package.json,README.md,src/index.js,src/http.js,src/trap-recovery.js,src/auth.js,src/cli.js,src/index.d.ts,bin/solid-server.js}`, `crates/sparq-lws-wasm/src/lib.rs`, `skills/javascript-wasm/SKILL.md`, `research/wasm-solid-server-npm-design.md`, `research/concurrent-serving-litreview-C-scheduling-servers-streaming.md`, `.beads/{issues.jsonl,interactions.jsonl}`, `.github/ISSUE_TEMPLATE/{feature.yml,config.yml}`
- GitHub issue searches on `sparq-org/sparq` via `gh issue list --state all` (2026-07-15): `fastify` → 0; `framework OR host`, `solid-server`, `npx OR "node host" OR "dev server"`, `adapter in:title` → no framework-host item; nearest: #1346, #1248, #992
- Fastify mechanics: house skill `~/.claude/skills/fastify-best-practices` (`rules/content-type.md` — catch-all `'*'` buffer parser, `bodyLimit`; `rules/routes.md` — wildcard routes, `reply.headers()`)
- Baselines: `docs/research/lws-survey.md` (§1 host row, §4 conventions), `docs/research/deployed-infra.md` (§3 in-browser architecture)
