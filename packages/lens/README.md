<!-- AUTHORED-BY Claude Opus 5.5 -->

# @mortgage/lens

The Solid Lens (design.md §c): a dock on every app page that shows where Solid is involved in
each step, fed only by the entries the pod runtime emits (`onEvent()`) and by app notes
(`note()`). It never creates an entry. Domain-neutral: no demo vocabulary lives here.

| Import | Gives you |
|---|---|
| `@mortgage/lens` | defines `<solid-lens>` and `<journey-ledger>`; exports both classes, `renderLedger`, and everything in `./model` |
| `@mortgage/lens/model` | the DOM-free fold (`LensModel`), sentences (`describe`), ledger arithmetic (`computeLedger`, `computeTotals`, `ledgerCsv`), the examiner view (`examine`, `registerCsv`, `matchesEvidence`), provenance history (`resourceHistory`), path helpers |

Apps normally get the Lens through `@mortgage/tour/mount`, not directly.

## `<solid-lens>`

```ts
import "@mortgage/lens";
const lens = document.createElement("solid-lens");
document.body.append(lens);
lens.configure({ registry: ORGS, holder: { name: "Alex" }, app: "bank", drawers, grants });
const stop = onEvent((entry) => lens.push(entry), { replay: true });
```

- `configure(config)` resets the log. `LensConfig` (src/types.ts): `registry`, `holder`, `app`
  (drawn larger on the map), `drawers` (cabinet order and plain-word labels), `grants` (policy
  handles keyed by IRI or IRI suffix: `{ label, purpose?, until? }`), `revokeCaveat` (template
  with `{org}` and `{holder}`), `recordDrawers` (default `["/inbox/"]`), `calendar`
  (`label(day)`, `dayOf(date)`), `grantsHref`, `ledgerHref`, `loadTurtle`.
- `push(entry, { replayed })`: replayed entries rebuild state silently; live ones animate and
  are announced in the polite live region. Duplicates (same `source` and `id`) are ignored.
- `setStep(step | null)`, `setSteps(outline)`, `setMode("guided" | "free" | "present")`,
  `view("step" | "grants" | "not-shared" | "raw" | "ledger" | "examiner")`, `collapsed`,
  `totals()`, `flush()`; `ledgerOptions` (illustrative comparison, calls to action, restart,
  `compliance`). `view("examiner")` opens the ledger on its examiner tab; with `ledgerHref` it
  goes there with `?view=examiner`, which `<journey-ledger>` reads.
- Events (bubbling, composed): `lens-act`, `lens-next`, `lens-back`, `lens-restart`,
  `lens-popout`, `lens-toggle`, and `lens-inset` (`{ right, bottom }` in px: the space the host
  page should leave free; mount.ts applies it).
- Layout: a 376 px dock at ≥ 1180 px (52 px rail when collapsed), a bottom sheet with a 64 px
  peek below that, `layout="window"` for pop-out. Escape collapses it; it never traps focus.

## How entries are read (contract interpretations other lanes rely on)

- **Pod saw vs app said.** Pod entries have a solid border, app notes a dashed one; the two are
  never merged.
- **Paths** may be pod-relative (`/documents/a`) or carry `/pods/<owner>` or an origin; the
  Lens normalises all three. A drawer is the top-level container of a path on the holder's pod
  (`pod: "alex"`), labelled from `resource.drawer`, else from `config.drawers`, else the
  humanised segment.
- **Grants** are folded from `acl.granted` / `acl.revoked` of successful ACL writes on the
  holder's pod. An organisation sharing its own files with another (an ACL write on its own pod)
  makes that agent part of the journey but is not a grant of the holder's. Rule agents
  map to organisations by the `/pods/<owner>/profile/card#me` WebID shape. When an
  organisation's last rule is removed, the grant is **expired** if the removing request has
  `actor.viaAgent: true` (the holder's app applying expiry automatically, design.md §b.4) and
  **withdrawn** otherwise. The wallet must therefore apply expiry through its agent and a
  visitor's Revoke through a normal request.
- **Untagged entries** (app notes carry no `tour`) belong to the current step when they arrive
  live, and to the step of the latest tagged entry when replayed.
- **Organisation-to-organisation notes** name the other party in `refs`, as an org slug or a
  WebID; without one the arc cannot be drawn and only the text appears.
- **Signature results** on the resource card come from `verified` notes whose `refs` include the
  resource's path.
- **Refusals** say why from the grant history at that moment: "no grant covers it", "no rule in
  force covers it", or "grant withdrawn 20 seconds ago" / "access ended" after an ending.
- **Before/after card** (§c.4): a refusal by an organisation whose grant has ended is compared
  with that organisation's latest successful request for the same method and path.

- **Runtime notes.** `notified` and `grant-used` notes come from the demo runtime, not an app
  (pod-runtime README, "Runtime services"). They are dashed like app notes but read "Runtime
  said". A notice says "{org} was told that {resource} changed", labelled "notified by the demo
  runtime; the Solid Notifications Protocol in production". A back-office revoke that follows a
  `grant-used` note for the same organisation is labelled "one-time grant, closed by {holder}'s
  wallet" instead of "expiry applied automatically".
- **Change history.** A resource card lists every write and delete the pod accepted for that
  resource in this session (writer, created/changed/deleted, back-office or not, time):
  `resourceHistory(model, pod, path)`. It comes from pod entries only, never from what the
  resource says about itself; seeded writes are not in the log and are not listed.

## Examiner view

A tab of the journey ledger ("Journey" | "Examiner view"), available to every demo:

- **Obligations.** `ledgerOptions.compliance` (or `<journey-ledger>`'s options) is a list of
  `{ id, obligation, rule, source?, evidence }`. `evidence` holds entry patterns matched like a
  tour step's `expect` (keys match recursively, a `path` also matches by suffix, an app-note
  `kind` matches notes only). An obligation is "evidenced" only when every pattern has at least
  one matching entry; the matching entries are listed under it. Otherwise it reads "Not
  evidenced in this session".
- **Access register.** One row per request a pod answered for an organisation other than its
  owner: when, who (and whether its back-office agent), read / wrote / deleted / refused, which
  resource, the status, and "under": the policy handle from `grants`, the policy IRI's local
  name, "a rule in the access list that names no policy", or "none: refused, {reason}". Exports
  as CSV.
- **Changes to access.** Every successful ACL write, in the Lens's own words.

## Journey ledger totals (the definitions test 13 recomputes)

Counted over all received entries:

| Total | Definition |
|---|---|
| Organisations involved | distinct organisation nodes (an app's `actsAs`) appearing as a pod event's actor or pod owner, an ACL rule's agent, a note's `org`, or an org-to-org note's other party; never the holder |
| Grants active / expired / withdrawn | one per organisation granted access to the holder's pod, by its final state |
| Credentials issued | distinct holder-pod paths written successfully (`kind: "write"`) with `resource.credential` |
| Reuses of a credential | successful reads of that path by organisations other than the writer and the holder |
| Documents delivered to the pod | distinct holder-pod paths written successfully by an organisation, without a credential, outside `recordDrawers`, not `.acl` |
| Requests refused | pod entries with `kind: "denied"` or status 401/403 |
| Uploads by the holder | distinct holder-pod paths written successfully by the holder, outside `recordDrawers`, not `.acl` |

Pass the holder's bookkeeping drawers (policies, consent records, inbox) as `recordDrawers` so
they are not counted as uploads.

## Tests

`pnpm test` (Vitest, the model against `test/fixtures/events.json`, a hand-written log covering
every event and note kind in a fictional trail-expedition story, and against
`test/fixtures/runtime-services.json`, recorded from the real pod host and wasm by pod-runtime's
`test/host/lens-fixture.test.ts`, which fails if the host's output drifts) and `pnpm test:e2e`
(Playwright against `test/harness/`: every map state, refusal text, reduced motion, axe with the
dock open, collapsed and as a 390 px sheet, keyboard, ledger totals and CSV, the examiner view
and change history with axe; `?fixture=services` loads the recorded log).
