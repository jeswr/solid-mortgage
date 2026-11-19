# `@sparq-org/solid-server@0.1.8` wasm: characterised behaviour (L1 spike)

<!-- AUTHORED-BY Claude Opus 5.5 -->

Lane L1, first task (build-plan §5, Brief L1 point 5). Every fact below is pinned by a Vitest test in
`/home/user/l1-spike/test/` that runs against the real wasm: in Node through the `./wasm` export, and in headless
Chrome 153 through a module service worker (`09-service-worker.test.ts`, using `playwright-core`). Run
`npm test` in `/home/user/l1-spike` (78 tests, about 8 s). The tests are written to port into
`packages/pod-runtime/test/`. Shared helpers are in `test/helpers.ts`, and ACL bodies are built with `n3.Writer`.

Test references use the form `NN-file › test name`. **⚠ d.2** marks a finding that contradicts or changes
design.md §d.2.

## 1. Creating a pod and dispatching

| Fact | Test |
|---|---|
| The `./wasm` export is the web-target build and needs an explicit init. In Node, pass the bytes: `await init({ module_or_path: bytes })`. `initSync({ module: bytes })` also works. Init is idempotent per realm: later calls return the cached exports, and live pods survive. | `01-lifecycle › init is idempotent…` |
| Create a pod with `new SolidServer(baseUrl, ownerWebid)`. Dispatch with `await pod.handleRequest(method, path, flatHeaders, bodyBytes, authenticatedWebid?)`. The call resolves to an `LwsResponse` `{status, headers: flat [name, value, …], body}`. Copy the response, then call `free()` on it. | all files, `helpers.ts › req` |
| The constructor provisions only the root `.acl`, with absolute IRIs: the owner gets Read, Write and Control through `acl:accessTo` and `acl:default` on the base URL. | `01-lifecycle › new SolidServer(base, owner) provisions only the root .acl…` |
| **The root container does not exist on a fresh pod: `GET /` returns 404** until the first write. Intermediate containers are created on demand. | `01-lifecycle › the root container itself does not exist…` |
| A base URL with a path, such as `https://pods.example/pods/alex/`, is accepted. The `path` argument is **relative to the base**, so the host must strip `/pods/<slug>`. Sending the full path addresses `/pods/alex/pods/alex/…`. `Location` and RDF use the full absolute IRIs. | `01-lifecycle › a base URL with a path is accepted…` |
| An absolute-form path, an empty path or an odd-length header array makes the call reject with a plain `Error` (not a trap), and the pod keeps working. `/../` returns 400. | `01-lifecycle › handleRequest rejects…` |
| `POST` never uses the Slug exactly. The server appends a random 24-hex suffix (`msg-…`), or uses `resource-…` when there is no Slug. Apps must read `Location`. | `01-lifecycle › POST ignores an exact Slug…` |
| Turtle and JSON-LD are converted both ways. Binary bodies round-trip byte for byte. Invalid Turtle, or a body without a content-type, returns 400. Conditional requests return 412 or 304. Deleting a non-empty container returns 409. | `01-lifecycle › content…`, `› conditional requests…` |
| Overlapping `handleRequest` calls on one instance are safe and are applied in call order. | `01-lifecycle › overlapping handleRequest calls…` |
| `Last-Modified` comes from the real clock (`Date.now`). There is no `Date` header and no way to inject demo-calendar time. | `01-lifecycle › Last-Modified comes from the real clock…` |
| The root export (`createSolidPod`, `createPodDispatcher`) imports `node:fs` and `node:buffer`, so it is Node-only. A browser host has to reimplement the dispatcher, as the old `solid-kit/browser-pod/host.ts` did. | `01-lifecycle › SolidServer is the same class…`, source reading |

## 2. Identity: what `authenticatedWebid` means

| Fact | Test |
|---|---|
| `undefined` (argument omitted) and `null` both mean **anonymous**. A request without access gets **401** with `WWW-Authenticate: DPoP error="invalid_token", scope="webid"`. | `02-identity › authenticatedWebid = %s is anonymous…` |
| **Hazard: the empty string `""` is not anonymous.** It is treated as an authenticated agent (403), and it matches `acl:AuthenticatedAgent`. Any string, even `"alice"`, is accepted without validation. The host must map an unknown or missing identity to `null`, never to `""`. | `02-identity › HAZARD: the empty string…`, `› a non-URL string…` |
| An authenticated agent without access gets **403** with body `forbidden` and no `WWW-Authenticate` header. | `02-identity › authenticated agent without access: 403…` |
| Existence is not leaked: a missing resource returns 401 or 403 to callers who could not read it, and 404 only to readers. | `02-identity › existence is not leaked…` |
| `acl:agent` matching is **exact string equality** on the IRI. The WebID without its fragment, with `http:`, with a trailing slash or with an upper-cased host does not match. | `02-identity › acl:agent matching is exact…` |
| `acl:origin` is enforced. A rule with `acl:agent` plus `acl:origin` needs a matching `Origin` request header. Rules without `acl:origin` ignore the header. This is relevant to host mode in §d.5, where the host could forward the verified origin. | `02-identity › acl:origin…` |

## 3. ACL inheritance

| Fact | Test |
|---|---|
| A container `.acl` rule with `acl:default` applies to children and grandchildren that have no `.acl` of their own. | `03-acl-inheritance › a container .acl rule with acl:default applies…` |
| `acl:default` alone does **not** cover the container itself: listing it needs `acl:accessTo`. `acl:accessTo` alone covers only the container, not its members. | `03 › acl:default alone does NOT cover…`, `› acl:accessTo alone…` |
| The nearest ACL replaces inherited rules entirely, with no merging. Deleting a resource's `.acl` restores inheritance. A container `.acl` that omits the owner locks the owner out of that subtree, even though the root `.acl` grants them access. | `03 › a resource .acl replaces…`, `› a container .acl that omits the owner…` |
| An absent `.acl` returns 404 to a Control holder and 403 to everyone else. | `03 › an absent .acl is 404…` |

## 4. Access modes

| Agent holds | Can | Cannot | Test |
|---|---|---|---|
| `acl:Read` | GET and HEAD the container and its members | POST, PUT, PATCH or DELETE (all 403) | `04-modes › acl:Read…` |
| `acl:Append` on a container (accessTo + default) | **POST** a new member, RDF or not (201). **PATCH insert-only**: N3 `solid:inserts` or SPARQL `INSERT DATA`, on an existing resource (204) or creating a new one (201) | **PUT** (create or replace), PATCH with `deletes` or `where`, DELETE, creating a sub-container, **reading anything**, including the resource it just created (only `Location` tells it the URL) | `04-modes › acl:Append…` (4 tests) |
| `acl:Write` without Control | create, replace and delete resources | read or write any `.acl` | `04-modes › Write (without Control)…` |
| `acl:Control` without Read or Write | read and write `.acl` resources, including **granting itself** Read | read or write the resource itself until it grants itself access | `04-modes › Control (without Read/Write)…` |

- **The owner has no implicit super-user rights.** If the owner rewrites the root `.acl` without themselves, or
  deletes it (204), nobody can reach the pod again, and the owner cannot repair it (`04-modes › owner has no
  implicit super-user rights`, 2 tests). Only a rebuild from a snapshot or journal recovers the pod. The runtime
  should guard root-ACL writes or rely on "Restart the demo".
- An `.acl` containing invalid Turtle returns 400. A JSON-LD `.acl` is accepted and enforced. **A `text/plain`
  `.acl` is accepted (201) and silently denies everyone**, the owner included (`04-modes › ACL body validation`).

## 5. WebID profile and public resources

A profile document with an `acl:agentClass foaf:Agent` Read rule can be read anonymously (200) and by any agent,
as Turtle or JSON-LD. Its `WAC-Allow` header is `user="read",public="read"`. Public Read does not extend to
writes (anonymous gets 401, agents get 403), to the `.acl`, or to the container (`05-profile-public`, 3 tests).
CORS is handled by the wasm router: it echoes `Origin` with credentials, exposes `WAC-Allow`, `Link`, `Location`
and the other Solid headers, and answers preflights with 204 without authentication, reflecting requested headers
such as `X-Demo-Agent` (`05-profile-public › CORS…`, 2 tests).

## 6. Persistence: snapshots exist ⚠ d.2

**0.1.8 ships snapshot and restore, so a journal replay is not needed to rebuild pod state.**

| Fact | Test |
|---|---|
| `new SolidServer` gives a non-persistent pod: `snapshot()` returns `undefined` and `snapshotRevision()` returns 0. `SolidServer.withSnapshot(base, owner, new Uint8Array())` gives a persistent pod at revision 1. | `06-persistence › snapshot API` (first 2 tests) |
| `snapshotRevision()` is monotonic and counts successful mutations only, not reads or denied writes. The host can call `snapshot()` only when the revision changes. | `06 › revision counts successful mutations only…` |
| A round trip restores documents, ACLs (still enforced), binary bodies and deletions. The encoding is folded: re-snapshotting a restored pod gives the same size. | `06 › round trip restores…` |
| Snapshots are keyed by absolute URL. Restoring under a different base boots but finds nothing. The owner ACL is not re-provisioned when the snapshot already contains one. | `06 › the snapshot is keyed by absolute URL…`, `› the owner ACL is not re-provisioned…` |
| A corrupt or truncated snapshot throws synchronously ("not a sparq-lws journal" or "ends mid-record"). The bytes are a plain `Uint8Array` starting with `LWSJ` and can be stored in IndexedDB as they are. | `06 › corrupt or truncated…`, `› a snapshot is a plain byte string…` |
| In Chrome, a snapshot saved to IndexedDB after each mutation survives `ServiceWorker.stopAllWorkers`. The restarted worker re-initialises the wasm and restores the pod. | `09-service-worker › snapshot in IndexedDB survives a stopped worker…` |

Indicative cost on this machine (not a test): with 500 resources, about 1.5 MB of snapshot, `snapshot()` takes
about 1.4 ms and `withSnapshot` about 8 ms.

**Recommendation for d.2:** persist the pod state as one snapshot per pod in IndexedDB, rewritten after each
mutating request whose revision changed. Keep a **seed snapshot** per pod, so `resetDemo()` restores those
bytes. Keep the `events` store for the Lens as designed. The append-only request journal becomes optional: keep
it only if the design still wants request-level history, because snapshots alone restore state without replay
and without suppressing events.

## 7. Limits

| Fact | Test |
|---|---|
| The wasm router itself enforces **exactly 2 MiB**: 2,097,152 bytes returns 201, one more returns 413 (`length limit exceeded`). This applies to RDF too. The oversized body is still copied into wasm memory first, so the host should keep its own pre-check. | `07-limits › body limit` (3 tests) |
| The linear-memory ceiling defaults to 3 GiB and is **module-wide**. Once over it, every pod in the realm answers 507, even for small reads. `lwsSetMemoryCeilingBytes(0)` removes the bound. | `07-limits › memory ceiling` (3 tests) |

## 8. Traps ⚠ d.2 (most important finding)

**Trigger.** A JSON-LD body with about 1000 nested objects (about 16 KB) overflows the Rust stack and raises
`RuntimeError: memory access out of bounds`. At 900 levels it is fine (`08-trap › trap trigger`). Turtle, N3 Patch
and SPARQL Update nested up to 100,000 levels did not trap.

| Fact | Test |
|---|---|
| **The trapping `handleRequest` promise never settles.** The `RuntimeError` is thrown as an *uncaught exception*: `process` `uncaughtException` in Node, and the global `error` event in a service worker, with `filename` set to the `.wasm` URL. A `try { await handleRequest } catch (isWasmTrap)` block, as in the old `host.ts` and upstream `createPodDispatcher`, **never runs**, and the request hangs. | `08-trap › CONTRADICTS d.2 / old host: …never settles…`, `09-service-worker › a trap in the SW fires the global 'error' event…` |
| **The whole wasm module is poisoned, not only the instance.** The same pod, **every other pod in the realm** and even a **new** `SolidServer` all throw. `snapshot()` is impossible after the trap, and calling `init()` again returns the cached poisoned module. | `08-trap › CONTRADICTS d.2: the whole module is poisoned…`, `› snapshot() is impossible…` |
| The poisoned module raises further uncaught errors later, so a trap signal must be armed per dispatch, not left armed between dispatches. | `09-service-worker` trap test (the log shows a second `error-event`) |
| **Recovery works**: load a **fresh module instance** and restore each pod from a snapshot taken **before** the trap. In Node this means importing the glue under a new URL. In the service worker it means a second static import, `sparq_lws_wasm.js?spare`. | `08-trap › recovery works with a FRESH module instance…`, `09-service-worker` trap test (503, then 200 with data intact) |
| WAC runs before the body is parsed: unauthorised (403) and anonymous (401) writers cannot trap the pod. **An Append-only agent POSTing to an inbox can**, and with it brings down every pod in the realm. | `08-trap › who can trigger it` (2 tests) |
| Calling `handleRequest` on a freed instance also never settles (uncaught "null pointer passed to rust"), but it does not poison the module. | `08-trap › calling handleRequest on a freed SolidServer…` |

**Consequences for the host (replacing d.2's "answer 503, discard the instance, rebuild from the journal"):**

1. Race every dispatch against a trap signal fed by the global `error` event (or `uncaughtException`) and
   against a watchdog timeout. On a trap, answer 503.
2. Treat the trap as **module-wide**. Rebuild **every** pod hosted in that module from its last persisted
   snapshot, inside a fresh module instance. Because `import()` is forbidden in service workers (see §9), the
   build should wrap the glue in a factory so that each call produces new bindings. The glue has no imports, only
   `import.meta.url`, so a bundler transform can do this without patching the package. The spike's
   two-static-imports trick gives only one spare.
3. Serialise dispatch **per module**, not per pod, so that an `error` event can be attributed to the in-flight
   request.
4. Snapshot eagerly after each mutation, because nothing can be saved after a trap.
5. Mitigate the known trigger: reject JSON-LD request bodies nested deeper than about 256 levels in the host
   (400) before dispatch.

## 9. Service worker and web target

| Fact | Test |
|---|---|
| A **module** service worker (`register('/sw.js', {type: 'module'})`) that statically imports the `./wasm` glue works in Chrome 153. With no argument, `init()` fetches `sparq_lws_wasm_bg.wasm` next to the glue (`new URL(…, import.meta.url)`), so the server must serve that file, ideally as `application/wasm`. The first pod request on a cold start took tens of milliseconds over loopback. The binary is 2.55 MB raw and 0.91 MB gzipped, so download time dominates on a real network. | `09-service-worker › a module SW statically importing…` |
| **Top-level await is rejected in a module service worker** ("ServiceWorker cannot be started"), so initialise lazily inside `install` or `fetch` handlers. **`import()` is forbidden** in service worker scope. | `09-service-worker › top-level await…`, `› dynamic import() is not available…` |
| WAC through the service worker matches Node: the owner reads, `X-Demo-Agent: lender` gets 403, and a request without an agent gets 401. | `09-service-worker › WAC through the SW…` |
| `initSync({ module })` with bytes is also available, for example with bytes taken from Cache Storage. The glue uses `globalThis.crypto.getRandomValues`, `Date.now` and `queueMicrotask`, all present in workers. | source reading |
| Not verified here: Firefox and Safari module service workers, and the dedicated-worker fallback. These belong to lane H1 and the Playwright suite. A classic (non-module) service worker build must pass `module_or_path` explicitly, because `import.meta` is unavailable. | — |

## 10. Other d.2 deltas

- "Requests are serialised per pod": the wasm tolerates overlapping calls, but trap attribution needs
  serialisation **per module** (see §8).
- "An unknown or missing identity is anonymous": this holds only if the host passes `null` or `undefined`.
  Passing `""` is an authenticated agent (see §2).
- The brief's test "an organisation with `acl:Append` on a container can create and not read" holds for
  **POST or PATCH**, not for PUT. Organisation agents writing to an `inbox/` must POST and must not expect the
  Slug they chose (see §1 and §4).
- The brief's "a forced trap answers 503, and the next request succeeds with state intact" is achievable only
  with eager snapshots and a fresh module (see §8).
- Resource `Last-Modified` values show real time, not demo time. Lens and PodEvent times come from the host
  clock as designed.

## 11. Gaps to raise upstream on sparq-org/sparq (not filed)

1. **A trap does not reject the `handleRequest` promise.** The `RuntimeError` escapes as an uncaught exception
   and the promise stays pending forever. `createPodDispatcher`'s 503 recycle path is unreachable for this trap
   class.
2. **A stack overflow on JSON-LD nested about 1000 deep (about 16 KB)** can be triggered by any agent with
   Append or Write. A depth limit exists (100,000 levels returns 400), but it sits above what the stack allows.
3. **A trap poisons the whole module**: the stack pointer is not reset, so every instance fails. Recycling with
   `makePod()` in the same module, as `createPodDispatcher` does and as its README promises ("never a poisoned
   instance"), cannot work. The project needs module re-instantiation guidance, or a glue that supports more than
   one instance.
4. Use-after-free `handleRequest` should reject instead of hanging with an uncaught error.
5. `pim:Storage` is advertised on every first-level container (`/profile/`) and never on the pod root or base
   URL. A client that walks up looking for its storage would stop at the wrong container.
6. A non-RDF `.acl` (`text/plain`) is accepted, and an unparsable ACL silently denies everyone. It should be
   rejected with 400 or 415.
7. `authenticatedWebid = ""` is treated as an authenticated agent and matches `acl:AuthenticatedAgent`. It
   should be treated as anonymous or rejected, and non-IRI strings should be validated.
8. A fresh pod has no root container (`GET /` returns 404).
9. The owner can delete or overwrite the root `.acl` and lock themselves out irrecoverably. An opt-in "owner
   always keeps Control" setting, or refusing to remove the last Control holder on the root, would help.
10. There is no clock injection: `Last-Modified` uses `Date.now`. Deterministic demos and tests need a clock
    hook.
11. The 2 MiB 413 happens after the body has been copied into linear memory. The JS side could check
    `body.byteLength` first.
12. The root export's dispatcher (`createPodDispatcher`) is Node-only because of `node:buffer`. A browser-safe
    dispatcher export would remove the need for downstream reimplementations.
