<!-- AUTHORED-BY Claude Opus 5.5 -->
# @mortgage/pod-runtime

Pods in the visitor's browser. Each pod is its own instance of the `@sparq-org/solid-server@0.1.8`
wasm Solid server. They run in a service worker, persist as snapshots in IndexedDB, and recover
from wasm traps. Every request is reported as a Lens event. The package also runs organisation
agents and provides the host-mode bridge. It knows nothing about any one demo: the registry, the
seed and the agents are inputs (design.md §d.2, §d.3, §d.5).

## Entry points

| Import | For |
|---|---|
| `@mortgage/pod-runtime` | Apps (browser only). The design.md §d.2 contract: `ready`, `session`, `podFetch`, `podUrl`, `onEvent`, `note`, `resetDemo`. It also exports `configure`, `onReset`, `setDay` and `setTour`. |
| `@mortgage/pod-runtime/node` | Headless journeys in Vitest: `createNodePodHost` runs the same host over the same wasm. |
| `@mortgage/pod-runtime/host` | `createPodHost` (any JS runtime; you provide `loadWasm`), the body guard and the storage. |
| `@mortgage/pod-runtime/acl` | `grantAccess`, `revokeAccess`, `readAcl` and `aclDocument`: the safe way to change ACLs. |
| `@mortgage/pod-runtime/agents` | The agent contract (`AgentHandlers`, `defineAgent`), `createAgentRunner` and `runAgentsOnHost`. |
| `@mortgage/pod-runtime/bridge` | Host mode: `startBridge`, `createBridgeClient` and `hostModeIdentity`. |
| `dist/pods-sw.js` | The single classic script that `tools/build-site.mjs` copies to the site root. |

## Using it from an app

```ts
import { configure, podFetch, podUrl, ready, session } from "@mortgage/pod-runtime";
import { registry } from "../../content/orgs";
import { seed } from "../../content/<demo>/seed";

configure({ registry, app: "bank", seed });
await ready();                      // pods seeded, page controlled
const me = session();               // { org, webid, persona, simulated: true }
await podFetch(podUrl("alex", "/inbox/"), { method: "POST", body, headers });
```

- `configure({ registry, app, seed?, agents?, swUrl?, mode? })` must be called before anything else.
  - `agents` defaults to the `agents` list in `/site.json`.
  - `mode: "worker"` forces the fallback.
- `podFetch` adds `X-Demo-Agent: <app slug>` only to requests for this origin's `/pods/**`. It
  first removes any `X-Demo-*` header the caller set. Every other URL goes to the normal `fetch`.
- `podUrl(owner, path)` is absolute: the page origin in path mode, `https://pods.<domain>` in host mode.
- `onEvent(cb, { replay: true })` delivers the logged entries, then live ones from every tab, with
  no duplicates.
- `setDay(n)` moves the demo clock that `PodEvent.at` reads.
- `setTour({ demo, step })` tags later requests so their events carry `tour`.

### Seed contract

```ts
interface SeedRequest {
  pod: PodOwner;
  method: "PUT" | "POST" | "PATCH" | "DELETE";
  path: string;            // inside the pod, e.g. "/documents/statement-1"
  contentType?: string;
  body?: string | Uint8Array;
  headers?: Record<string, string>;
}
type Seed = SeedRequest[] | ((ctx: { origin; podUrl(owner, path); webid(owner) }) => SeedRequest[] | Promise<SeedRequest[]>);
```

How a seed is applied:

- Each request runs as the pod's owner. The seed runs once per browser, emits no events, and goes
  through the same ACL policy as any other write.
- A request that fails stops the seed with an error naming it.
- The seed function runs in the page, so it can sign credentials with WebCrypto first.
- After the seed, the host saves a `seed` snapshot per pod. `resetDemo()` restores those snapshots
  and clears the event log.

Every pod gets a baseline before the seed runs:

- a root `.acl` that gives the owner Read, Write and Control (`acl:accessTo` and `acl:default`);
- `profile/card` with `foaf:primaryTopic` and `pim:storage`;
- a public-read `profile/card.acl`.

### Agent contract

An app's `src/agent.ts` exports `handlers`:

```ts
import { defineAgent } from "@mortgage/pod-runtime/agents";
export const handlers = defineAgent({
  async inbox(message, ctx) {
    // message: { url, path, from: PodEvent["actor"], event }
    // ctx: { owner, app, podFetch, podUrl, webid, now, note }
  },
});
```

When the agent runs:

- `inbox` runs after a successful POST, PUT or PATCH of a member of `/inbox/`, in the pod the app
  acts as (`registry[app].actsAs`).
- It does not run for the agent's own writes made through `ctx.podFetch`. Those writes act as that
  owner and show `viaAgent: true` in the Lens.

How it runs:

- Each organisation's handlers run one at a time.
- If a handler throws, the error is logged and the next message is still handled.
- In service-worker mode every tab starts an agent worker, but only the holder of a Web Lock runs
  the agents. The holder replays logged inbox writes it has not handled yet, so writes made before
  the worker started, or while another tab held the lock, still get handled.
- Headless runs use `runAgentsOnHost({ host, agents, identities })`.

### Changing access

Use `grantAccess` and `revokeAccess` from `/acl`. They read the ACL in force, copy inherited rules
into a new ACL when the resource has none, write it with `If-Match` or `If-None-Match`, and always
keep the owner's rule. `revokeAccess` refuses to revoke the owner. It splits authorisations shared
with other agents, so only the named agent loses access.

The host enforces the same invariant on every ACL write, so a raw `podFetch` cannot remove it:

| ACL write | Answer |
|---|---|
| An ACL that does not give the owner `acl:Control` on its target (and `acl:default` for a container) | 409 |
| `PATCH` on any `.acl` | 409 (use the helpers) |
| `DELETE /.acl` (the root ACL) | 409 |
| A non-RDF ACL body | 415 |
| An unparsable ACL body | 400 |

## How the host works

**Identity.** The host passes the caller's WebID as `authenticatedWebid`, and the wasm evaluates
WAC on every request.

- **Path mode.** The page declares itself with `X-Demo-Agent: <app slug>`. The host maps the slug
  to `actsAs`, then to `<origin>/pods/<owner>/profile/card#me`. This is self-declared, as design.md
  §d.5 accepts.
- **Host mode.** The bridge page sets the header from `event.origin`. A host-mode build of the
  service worker honours the header only from the bridge page.
- **Unknown or missing identity.** It is anonymous (`undefined`), never `""`: the wasm treats `""`
  as an authenticated agent.
- **Before dispatch.** The host strips every `x-demo-*` header before the wasm sees the request.

**Persistence.** Each pod uses the wasm's own snapshots (`withSnapshot`, `snapshot`,
`snapshotRevision`).

- After a request that changed the revision, the host saves a `current` snapshot to IndexedDB.
- When a stopped worker starts again, it restores every pod from those snapshots.
- No events are emitted on restore.
- No request journal is kept: snapshots are smaller, and restoring them does not re-run requests.

**Guard before dispatch.** On PUT, POST and PATCH:

- 413 for bodies over 2 MiB;
- 400 for JSON, JSON-LD or Turtle-family bodies nested more than 64 levels deep;
- a body with no media type, or one that cannot be parsed, gets both checks.

**Trap recovery.**

- Requests are dispatched one at a time.
- Each dispatch races the wasm call against the global `error` event and a watchdog timer
  (15 s by default). A trapped call never settles, so the race is what notices it.
- On a trap the host:
  1. answers 503;
  2. loads a fresh wasm instance (a fresh glue instance from `createGlue()`);
  3. restores every pod from its last snapshot.
- The next request succeeds with all saved state intact.

**Events.** After every response except `OPTIONS` and anonymous requests, the host appends a
`PodEvent` to IndexedDB and broadcasts it on the `pod-runtime-events` BroadcastChannel.

- `path` is relative to the pod (`/documents/x`). For a POST it is the path of the created resource.
- `grant` is the authorisation that allowed the request, found by walking up the ACLs.
- `acl.granted` and `acl.revoked` compare the effective rules before and after an ACL write. The
  rules after the write come from the body that was written.

**Modes.**

| Mode | When it is used | How it works |
|---|---|---|
| Service worker | The normal case | Same-origin pages are controlled after `clients.claim()`. A hard-reloaded page asks for a claim. |
| Dedicated worker (`pod-host`) | No service worker, or `mode: "worker"` | The same bundle and the same IndexedDB. The page's agents run inside that worker. |
| Host-mode bridge | `setUrlMode({ kind: "host" })` | A hidden iframe on `https://pods.<domain>/pods-bridge/` carries the requests. |

## Characterisation of the 0.1.8 wasm

The tests in `test/wasm/` pin down these behaviours. Treat any change as a breaking upgrade.

- **Instances.** `new SolidServer(base, owner)` creates only the root `.acl`, giving the owner
  Read, Write and Control through `acl:accessTo` and `acl:default`. Request paths are relative to
  the base path. The root container answers 404 until something is written to it. A `Slug` always
  gets a random suffix.
- **Identity.**
  - `null` or `undefined` is anonymous: 401 with `WWW-Authenticate: DPoP`.
  - `""` is an authenticated agent and matches `acl:AuthenticatedAgent`.
  - `acl:agent` is matched by exact string equality.
  - `acl:origin` is enforced.
- **Inheritance.** `acl:default` applies to all descendants. The nearest ACL wins and is not
  merged with ACLs higher up.
- **Append** allows POST and insert-only PATCH. It does not allow PUT or reads.
- **Control.** The owner has no implicit Control. Deleting or overwriting the root `.acl` locks the
  owner out. A `text/plain` `.acl` is accepted and denies everyone. This is why the host has an
  ACL policy.
- **Limits.**
  - The wasm itself enforces a 2 MiB body limit.
  - The memory ceiling applies to the whole module: when it is exceeded the module answers 507.
- **The trap (a security-relevant denial of service).** JSON-LD nested about 1000 levels deep
  makes the wasm trap:
  - the returned promise never settles;
  - an uncaught `RuntimeError` is raised;
  - every later call into that module fails.

  Only a new module instance, restored from a snapshot taken before the trap, recovers. The guard
  above stops the known trigger before dispatch, and recovery covers any other trigger. This was
  reported privately, not on the public tracker.
- **Service workers** forbid top-level `await` and `import()`. The upstream glue loads the `.wasm`
  through `import.meta.url`. So the build:
  - wraps the glue in a factory (`scripts/glue-factory.mjs`);
  - inlines the wasm as base64;
  - compiles it once per worker.
- **`pim:Storage`** is advertised on first-level containers as well as on the root. This is an
  upstream gap.

## Known limitations

- **Anonymous requests emit no Lens event**, because `PodEvent.actor` cannot express "anonymous".
  Showing them would need a contract change.
- **Dedicated-worker fallback.** Each tab runs its own host over the same IndexedDB. A second tab
  sees another tab's writes only after a reload, and two live hosts can assign the same event id.
- **The bundle is about 3.7 MB** with the wasm inlined. It is served `no-cache`, so the HTTP cache
  revalidates it.
- **Host mode** needs two things outside this package:
  - a page at `pods.<domain>/pods-bridge/` that loads `/pods-sw.js` as a classic script;
  - a CSP `frame-ancestors` limited to `*.<domain>`.

## Tests

`pnpm test` runs everything against the real wasm. No test mocks the pod or the access check.

| Directory | What it checks |
|---|---|
| `test/host/` | Access (owner, Read, Append, refused, anonymous), the ACL policy, grant and revoke events, persistence and reset, the guard, and a real trap in a child process with recovery. |
| `test/wasm/` | The characterisation tests above. |
| `test/agents/`, `test/bridge/` | Agents and the bridge over the real host. |
| `test/browser/` | The built `pods-sw.js` in Chrome. Skipped when `dist/` or a Chrome is missing; set `POD_RUNTIME_CHROME` to choose the binary. |
| `test/domain-gate.test.ts` | No domain vocabulary anywhere in the package. |
