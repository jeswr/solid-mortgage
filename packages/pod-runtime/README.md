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
| `@mortgage/pod-runtime` | Apps (browser only). The design.md §d.2 contract: `ready`, `session`, `podFetch`, `podUrl`, `onEvent`, `note`, `resetDemo`. It also exports `configure`, `onReset`, `setDay` and `setTourContext` (the signature `packages/tour`'s `mountDemo({ runtime })` takes; `setTour` is an alias), and the runtime services: `watch`, `unwatch`, `oneTimeGrant`, `parseChangeNotice`. |
| `@mortgage/pod-runtime/node` | Headless journeys in Vitest: `createNodePodHost` runs the same host over the same wasm. |
| `@mortgage/pod-runtime/host` | `createPodHost` (any JS runtime; you provide `loadWasm`), the body guard and the storage. |
| `@mortgage/pod-runtime/acl` | `grantAccess`, `revokeAccess`, `readAcl` and `aclDocument`: the safe way to change ACLs. |
| `@mortgage/pod-runtime/agents` | The agent contract (`AgentHandlers`, `defineAgent`), `createAgentRunner` and `runAgentsOnHost`; the runtime-service calls over any fetch (`watchResource`, `unwatchResource`, `listSubscriptions`, `makeGrantOneTime`, `listOneTimeGrants`, `parseChangeNotice`). |
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
- `owner` is any `PodOwner`: an organisation or a registered holder (`HOLDERS` in
  `@mortgage/demo-kit/holders`). Every registered holder gets a pod, a WebID and a baseline
  profile (below), whichever demo the page belongs to.
- The wallet acts for holders. `configure({ holder })` or `setHolder(holder)` makes `podFetch`,
  `session()` and `actingAs()` act for that holder; the default is the app's `actsAs` (Alex),
  sent exactly as before. Only an app whose `actsAs` is a holder may call them
  (`holdersActedFor`); any other app gets an error. Path mode sends the holder id as
  `X-Demo-Agent`; host mode sends `X-Demo-Holder`, which the bridge accepts only from an origin
  the build lets act for that holder, and refuses otherwise.
- `onEvent(cb, { replay: true })` delivers the logged entries, then live ones from every tab, with
  no duplicates.
- `setDay(n)` moves the demo clock that `PodEvent.at` reads.
- `setTourContext({ demo, step } | null)` tags later requests so their events carry `tour`; `null` clears it. Pass the module to `mountDemo({ runtime })` as it is.

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
- for a registered holder, `profile/card` also says who it is: `schema:Person` or
  `schema:Organization` and `schema:name`, from the holder registry. A demo's seed may replace it.

### Agent contract

An app's `src/agent.ts` exports `handlers`:

```ts
import { defineAgent } from "@mortgage/pod-runtime/agents";
export const handlers = defineAgent({
  async inbox(message, ctx) {
    // message: { url, path, from: PodEvent["actor"], event }
    // ctx: { owner, app, podFetch, podUrl, webid, now, note, watch, unwatch }
  },
  async changed(message, ctx) {
    // message: { topic, url, activity: "Create" | "Update" | "Delete", note }
    // Runs for a `notified` note addressed to this app (see "Runtime services").
  },
});
```

When the agent runs:

- `inbox` runs after a successful POST, PUT or PATCH of a member of `/inbox/`, in the pod the app
  acts as (`registry[app].actsAs`).
- It does not run for the agent's own writes made through `ctx.podFetch`. Those writes act as that
  owner and show `viaAgent: true` in the Lens.
- `ctx.note` always records the note as from the agent's app, whatever `org` the handler wrote.

How it runs:

- Each organisation's handlers run one at a time.
- If a handler throws, the error is logged and the next message is still handled.
- In service-worker mode every tab starts an agent worker, but only the holder of a Web Lock runs
  the agents. In host mode the bridge page starts it, on the pod origin. The holder replays logged inbox writes it has not handled yet, so writes made before
  the worker started, or while another tab held the lock, still get handled.
- Headless runs use `runAgentsOnHost({ host, agents, identities })`.

### Runtime services: change notification and one-time grants

The 0.1.8 wasm has no Solid Notifications (`test/wasm/09-notifications.test.ts`) and WAC cannot
say "once". The host provides both as runtime services at `/pods/.runtime/**`, which no pod can
shadow. The caller is identified exactly as for pod requests, so in host mode only the bridge can
name it. Anonymous callers get 401. Both are cleared by `resetDemo()` and survive a stopped worker.

| Service | Call | Who may | What happens |
|---|---|---|---|
| Subscribe | `watch(topic)` (page), `ctx.watch(topic)` (agent), `watchResource(fetch, topic)` | Anyone the pod server lets read the topic (checked with a HEAD as the caller; 403 otherwise) | After each write or delete the pod server accepted to the topic, or to a member of a container topic, the host emits a `notified` note to each subscriber except the writer. `refs` is `[topic, resource, ActivityStreams Create/Update/Delete]`. The notice carries no data. The app's agent `changed(message, ctx)` handler runs. Its read is an ordinary request, so a subscriber whose grant has gone gets 403. |
| Unsubscribe | `unwatch(topic)` | The subscriber | 204 |
| One-time grant | `oneTimeGrant({ resource, agent })` (page), `makeGrantOneTime(fetch, …)` | The pod owner only (403 otherwise) | After `agent`'s first successful read of the resource (or a member of a container), inside the same serialised dispatch, the host emits a `grant-used` note from the holder's wallet app, then runs `revokeAccess` as the owner, marked as a back-office agent. The pod server refuses the next read. If the revoke fails, the host refuses that agent's requests to the resource itself until a reset (fail closed). |

Subscriptions deliver to every subscriber until it unsubscribes. They are not re-checked
against access on each change. A subscriber whose access was withdrawn is still told that the
resource changed (some Solid Notifications servers behave the same way), and its follow-up read is
refused by WAC. The Lens labels every notice "notified by the demo runtime; the Solid
Notifications Protocol in production".

### Changing access

Use `grantAccess` and `revokeAccess` from `/acl`. They read the ACL in force, copy inherited rules
into a new ACL when the resource has none, write it with `If-Match` or `If-None-Match`, and always
keep the owner's rule. `revokeAccess` refuses to revoke the owner. It splits authorisations shared
with other agents, so only the named agent loses access.

- **Conditions are kept.** Both helpers copy `acl:origin` onto every rule they rewrite.
- **They fail closed.** If a rule has any other condition, they throw instead of copying it without
  that condition, which would broaden it.
- **Origins are reported.** `rulesOf` reports `acl:origin` as `origins` on a
  `ConditionalAccessRule`. That is a subtype of demo-kit's `AccessRule`, so events carry it
  without a contract change.

The host enforces the same invariant on every ACL write, so a raw `podFetch` cannot remove it:

| ACL write | Answer |
|---|---|
| An ACL that does not give the owner unconditional `acl:Control` on its target (and `acl:default` for a container). An owner rule narrowed by `acl:origin`, or carrying anything other than type, agent, class, group, accessTo, default and mode, does not count. | 409 |
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
- **Host mode.** The build reads owners and identities from the registry
  (`MORTGAGE_HOST_MODE=1 MORTGAGE_HOST_REGISTRY=<module exporting ORGS>`), and nothing a page sends
  changes them: the runtime ignores a hello's fields. The bridge page sets the identity header from
  `event.origin` and sets a forwarded note's `org` the same way. The service worker accepts the
  header from only two clients: the bridge page, and the agent worker the bridge page starts from
  the same script. It accepts control messages only from the bridge page. The bridge relays events
  to the app that embeds it.
- **Identity keys** are slug-shaped app names that map to a real owner. Prototype names
  (`constructor`, `__proto__`, …) are never identities.
- **Unknown or missing identity.** It is anonymous (`undefined`), never `""`: the wasm treats `""`
  as an authenticated agent.
- **Before dispatch.** The host strips every `x-demo-*` header before the wasm sees the request.

**Persistence.** Each pod uses the wasm's own snapshots (`withSnapshot`, `snapshot`,
`snapshotRevision`).

- After a request that changed the revision, the host saves a `current` snapshot to IndexedDB.
- When a stopped worker starts again, it restores every pod from those snapshots.
- A snapshot that cannot be restored falls back, so a bad snapshot never stops the host. That
  covers a corrupt or truncated snapshot, one from an incompatible server version, and one whose
  pod fails the health check (the owner must be able to read the root ACL).
  - The pod falls back to its seed snapshot, then to an empty baseline pod.
  - Each fallback is listed in `info().restoreIssues`, which pages see in `RuntimeInfo`.
  - The repaired pod is saved as its new current snapshot.
- `reset()` works even after a failed start.
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

- A state change (PUT, POST, PATCH, DELETE) is reported only when it succeeded (2xx) or was refused
  by access control (401/403, kind `denied`). Any other failure changed nothing and emits no event,
  so the Lens never shows a write that did not happen. Reads are always reported.

- `path` is relative to the pod (`/documents/x`). For a POST it is the path of the created resource.
- `grant` is the authorisation that allowed the request, found by walking up the ACLs.
- `acl.granted` and `acl.revoked` compare the effective rules before and after an ACL write. The
  rules after the write come from the body that was written.

**Modes.**

| Mode | When it is used | How it works |
|---|---|---|
| Service worker | The normal case | Same-origin pages are controlled after `clients.claim()`. A hard-reloaded page asks for a claim. |
| Dedicated worker (`pod-host`) | No service worker (including plain HTTP, which is not a secure context), or `mode: "worker"` | The same bundle and the same IndexedDB. Every tab starts one, but only one, the host, runs the pods and the agents. The others forward their page's messages to it over a BroadcastChannel. When the host goes away, the next worker restores from the snapshots and takes over. See "Electing the fallback host" below. |
| Host-mode bridge | `setUrlMode({ kind: "host" })` | A hidden iframe on `https://pods.<domain>/pods-bridge/` carries the requests. |

**Electing the fallback host.**

- With Web Locks, the holder of the `pod-runtime-host` lock hosts. When its tab closes, the lock
  passes to a waiting worker.
- Without Web Locks (plain HTTP: Web Locks and `crypto.randomUUID` exist only in secure contexts),
  a lease in IndexedDB elects the host. A worker claims it in one readwrite transaction, so two
  tabs cannot both take a free lease, and renews it every second; a lease not renewed for 5 s is
  free. The host also renews before it answers each request. A host that finds the lease taken
  (its tab was suspended, say) steps down and forwards instead of writing to stale pods. A closed
  worker releases the lease; a tab killed outright frees it after 5 s, and requests wait for the
  next host meanwhile.
- A new host always restores from storage first, then announces itself, and the other workers
  resend what is still unanswered. A request keeps its id across resends and the host answers each
  id once, so a request the old host never saw is applied once. Replies to state-changing requests
  (writes, seed, reset, notes) are also kept in a short log in storage (the last 200, bodies over
  4 KB dropped), so a resend of something the old host already applied gets its original reply.
- The agents start once, however many tabs ask at the same time.

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
- **Fallback hand-over.** Two narrow windows remain. If the hosting tab dies after a write is saved
  but before its reply is logged, the new host applies the resend again. Without Web Locks, a
  single request that takes longer than the 5 s lease can overlap a new host's first requests.
- **The bundle is about 3.7 MB** with the wasm inlined. It is served `no-cache`, so the HTTP cache
  revalidates it.
- **Host mode** needs these outside this package:
  - a page at `pods.<domain>/pods-bridge/` that loads `/pods-sw.js` as a classic script;
  - a CSP `frame-ancestors` limited to `*.<domain>`;
  - a host-mode build of `pods-sw.js` with `MORTGAGE_HOST_REGISTRY` set;
  - nothing else served on the pod origin.

## What is and is not enforced

Access control is real: the wasm checks every request against the ACLs. Who is asking is a different
matter.

- **Path mode: identity is self-declared.** Any script on the site's origin can send
  `X-Demo-Agent: <any app>` and act as that app's organisation. It can also send a hello that
  remaps identities. Every app shares one origin, so the browser cannot tell them apart. This is
  the trade-off design.md §d.5 accepts for path mode.
- **Path mode: events can be forged.** Any same-origin script can post a fake event or reset on
  the `pod-runtime-events` BroadcastChannel. The Lens on that origin would show it. The pods and
  the stored event log would not change.
- **Host mode: identity is the app's origin,** which the browser sets. In host mode, the following
  are still open to any recognised app origin:
  - Before the pods are first seeded, it can send the seed, which runs as each pod's owner.
  - It can call `reset` and set the demo day.
  - It can add notes, but only as itself.

  Unrecognised origins are anonymous and cannot send control messages.

## Tests

`pnpm test` runs everything against the real wasm. No test mocks the pod or the access check.

| Directory | What it checks |
|---|---|
| `test/host/` | Access (owner, Read, Append, refused, anonymous), the ACL policy and `acl:origin` conditions, grant and revoke events, event kinds, persistence and reset, corrupt snapshots, the guard, a real trap in a child process with recovery, change notification (`notifications.test.ts`) and one-time grants (`one-time.test.ts`). |
| `test/wasm/` | The characterisation tests above. |
| `test/agents/`, `test/bridge/` | Agents and the bridge over the real host. |
| `test/sw/` | The real service-worker role and runtime over the Node wasm, through a fake worker scope. Covers host-mode identity, the client check, hello and note handling, and prototype names. `host-worker.test.ts` runs several fallback "tabs" in one process: the lease election without Web Locks, stepping down, hand-over without double writes, single-flight agents, and no `crypto.randomUUID`. |
| `test/browser/` | The built `pods-sw.js` in Chrome, including fallback mode with several tabs and on a plain-HTTP origin. A host-mode build also runs on `*.demo.localhost`; it needs port 80 and skips without it. Everything here skips when `dist/` or a Chrome is missing; set `POD_RUNTIME_CHROME` to choose the binary. |
| `test/domain-gate.test.ts` | No domain vocabulary anywhere in the package. |
