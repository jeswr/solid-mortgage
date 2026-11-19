<!-- AUTHORED-BY Claude Fable 5.2 -->

# Build plan

Implementation lanes for the design in `design.md` and `flows.md`. Each lane owns a path set no other concurrent lane
touches, so lanes in the same stage run in parallel in separate worktrees.

## 1. Stages and dependencies

```
Stage 0   L0 scaffold ──────────────────────────────────────────────┐ (serial: root files)
Stage 1   L1 pod-runtime   L2 tour + lens   L3 model, credentials, mortgage content      (parallel)
Stage 2   A1 wallet  A2 issuers  A3 lender  A4 desk + AUS  A5 property  A6 insurer + servicer  A7 welcome
          T1 acceptance tests (written from design.md, by a different model from the app builders)   (parallel)
Stage 3   L4 integrate, deploy, retire old projects (serial: root files)   V1 mortgage video
Stage 4   E2 engine additions → F2 moving house, F3 KYB, F4 lending (parallel) → F5–F8 → U1 upstream engine
Optional  H1 host-per-organisation mode (needs a domain: open question 3)
```

- App lanes start when L1 and L3 have merged (they need a working pod and the data model). They do not wait for L2:
  an app's contract with the tour is its `data-tour` names and its Lens notes, both fixed in `content/mortgage/tour.ts`.
- T1 starts with stage 2 and fails until the apps land. That is intended.

## 2. Lanes

| Lane | Owns (paths) | Builds | Suggested model | Depends on |
|---|---|---|---|---|
| L0 | Root config files, `tools/**`, `vendor/**`, `packages/demo-kit/**`, `content/orgs.ts`, `apps/_template/**`, `decisions/0017-*`, `AGENTS.md`, `README.md` | Workspace reset, build assembly, vendoring, org registry, `appUrl`, demo calendar, trust wiring, app template, all dependencies in the lockfile | Opus (orchestrator) | – |
| L1 | `packages/pod-runtime/**` | Service-worker pod host, client, bridge, journal, events, agent runner | Fable or Opus (access control: security surface) | L0 |
| L2 | `packages/tour/**`, `packages/lens/**` | Tour engine, Solid Lens, journey ledger | Sol builds, Claude reviews | L0 |
| L3 | `packages/data-model/**`, `packages/vc-kit/**`, `content/mortgage/**`, `vocab/**` | New shapes and wrappers, credential kit with demo clock, mortgage seed, the 24 tour steps with `data-tour` names, `expect` lists and copy | Fable (copy, shapes), Sol (wrappers) | L0 |
| A1 | `apps/wallet/**` | Cairn: home, documents, requests, sharing, prove, activity, inbox | Opus (writes ACLs) | L1, L3 |
| A2 | `apps/payroll/**`, `apps/bank/**`, `apps/bureau/**` | Three issuers and their agents | Sol | L1, L3 |
| A3 | `apps/lender/**`, `apps/lender-b/**` | Borrower portal, competing lender | Sol | L1, L3 |
| A4 | `apps/lender-desk/**`, `apps/aus/**` | Loan Desk, Castellan, their agents | Sol | L1, L3 |
| A5 | `apps/appraisal/**`, `apps/title/**`, `apps/county/**` | AMC and field app, title and closing room, recorder | Sol | L1, L3 |
| A6 | `apps/insurer/**`, `apps/servicer/**` | Quote and bind, servicing portal | Sol | L1, L3 |
| A7 | `apps/welcome/**` | Front door, launcher, watch pages, honesty page | Sol | L0 |
| T1 | `e2e/**` | Acceptance suite in §4 | Claude (never the app builder) | L0 |
| L4 | Root config, `.github/**`, deletion of old `apps/*`, `scripts/demo`, `deploy/` | Green gate, production deploy, redirects from old projects, old code removed | Opus | all of stage 2 |
| V1 | `video/**` | Recorder port, generic `scenes.ts`, cards, mortgage recording | Opus; ElevenLabs spend needs Jesse (open question 8) | L4 |
| E2 | `packages/pod-runtime/**`, `packages/lens/**`, `packages/tour/**` | Change notification, one-time grants, examiner view, provenance history | Fable or Opus | L4 |
| F2–F8 | `content/<demo>/**`, new `apps/<slug>/**`, and `apps/<existing>/src/sections/<demo>/**` only | One demo each, per `flows.md` | Sol builds, Claude tests | E2 |
| U1 | `jeswr/solid-sdk` packages | Move the three engine packages upstream with `SKILL.md` each; `fictional` mode in showcase-kit; static template in `create-solid-demo` | Opus | F3 (second demo on the engine) |
| H1 | `packages/pod-runtime/src/bridge/**`, `vercel.json` | Host mode, three-browser spike | Fable | L4, a domain |

Rules that keep lanes disjoint:

- A lane never edits a file outside its paths. If it needs a change elsewhere it stops and reports; the orchestrator
  routes it.
- New dependencies are added only by L0 or L4 (root lockfile). L0 adds every dependency the stage 1 and 2 lanes need.
- A flow lane adds to an existing app only under `apps/<slug>/src/sections/<demo>/`, registered through that app's
  section index, which the app lane creates empty.
- Follow-up work goes in beads (`bd`, prefix `sm-`), never markdown TODOs.

## 3. Working with Codex (GPT 6.2 Sol)

- Its sandbox has no network and it cannot commit. Before launching it, the orchestrator creates the worktree, runs
  `pnpm install --frozen-lockfile` and `pnpm exec playwright install chromium`, and confirms `pnpm run gate` starts.
- Codex runs only offline commands (`pnpm --offline`, Vitest, Playwright against `vite preview` on loopback). It cannot
  run `lint:iris` (network); the orchestrator and CI do.
- It cannot look up package documentation. Each brief pastes the API facts it needs or names the file in
  `node_modules` to read.
- When it finishes, it leaves the tree uncommitted and prints: files changed, commands run with results, anything it
  could not do. The orchestrator runs the gate, commits with the `[GPT-6.2]` prefix and the model trailers, and opens
  the pull request. roborev reviews each commit.
- Keep briefs short and run Codex from inside the worktree so `AGENTS.md` is cached as its prompt prefix.
- Carried over from decision 0008: Sol never owns its own acceptance tests, and never the access-control, credential or
  proof code. A green run that mocks the pod or the access check is not green.

## 4. Acceptance: the whole mortgage demo

Playwright, Chromium, against the built static site served on loopback. Every test starts from fresh demo data.

| # | Test | Asserts |
|---|---|---|
| 1 | Guided path | All 24 steps complete in order using "Do it for me"; after each step every item in that step's `expect` list is in the Lens log |
| 2 | Accessibility | axe (WCAG 2.1 AA) passes on every step, with the Lens open and with it collapsed; full keyboard run of chapters 1 to 3 |
| 3 | Enforcement | For each organisation: a read of a resource outside its grant returns 403; an anonymous read of any private resource is refused |
| 4 | Revoke | Step 23 returns 403 for the same request that returned 200 at step 9; the retention caveat is on screen |
| 5 | Expiry | G5 and G6 are gone from the ACL after their end event; a later read is refused |
| 6 | Hermetic | No request leaves the site's origin during the whole path (proves there is no server) |
| 7 | Persistence | Reload mid-tour, and stop the service worker mid-tour: state is intact and the tour resumes |
| 8 | Reset | "Restart the demo" returns the pods to the seed; a second full run passes |
| 9 | Lens honesty | Every "pod saw" entry has a matching request observed by the test; no entry exists without one |
| 10 | Trust | Banner, fictional-organisation line and `noindex` on every route of every app, including not-found pages; `check:insignia` finds no real organisation name in built output |
| 11 | Data | After a headless run of the journey in Vitest, every resource in every pod validates against its SHACL shape; `lint:iris` passes |
| 12 | Clocks | Loan Estimate dated within 3 business days of application; closing at least 3 specific business days after the Closing Disclosure; employment "as of" within 10 business days of the note date |
| 13 | Ledger | Journey ledger totals equal counts computed independently from the event log |
| 14 | Distinct apps | Home-screen screenshots of all 13 apps attached to the pull request for manual sign-off; each has its own title, favicon and `theme-color` |
| 15 | Budget | First load of any app under 400 kB compressed excluding the wasm; the wasm is fetched once and cached |

Per-lane criteria:

| Lane | Done when |
|---|---|
| L0 | `pnpm run build` produces `dist/` with the template app at `/_template/`; `pnpm run gate` is green; `vercel build` succeeds locally; every dependency for stages 1 and 2 is in the lockfile; calendar unit tests pass, including the CFPB example |
| L1 | Unit and browser tests in the L1 brief pass; the wasm API behaviour is written up in `packages/pod-runtime/README.md` |
| L2 | A recorded event fixture drives the Lens through every map state in §c.3; tour runs a three-step fixture demo; axe passes; reduced-motion test passes |
| L3 | Shapes validate fixtures; the headless journey test (agents only, no apps) completes and leaves pods that pass test 11; tour content passes the editorial checks (title ≤ 8 words, body ≤ 45, every source id known) |
| A1–A7 | The lane's steps in test 1 pass; test 2 and test 10 pass for its apps; each app follows its specification in `design.md` §b.3; screenshots attached |
| T1 | The suite runs and fails only where apps are missing |
| L4 | Tests 1 to 15 green in CI; production deploy live at the existing URL; old projects redirect; EC2 off |
| V1 | `record.ts --check --strict` passes; a 1080p MP4 with captions and chapters; spoken totals match the ledger |

## 5. Ready-to-run briefs

### Brief L0: scaffold (Opus, orchestrator; root files, run alone)

Read `design.md` §d.1, §d.5, §d.7, §d.8, §d.9, and `AGENTS.md`.

Do, on a branch `rebuild/l0-scaffold`:

1. Add the new layout beside the old code (do not delete old `apps/*` yet; exclude them from the workspace build):
   `apps/_template`, `packages/demo-kit`, `content/orgs.ts`, `tools/`, `vendor/`, `e2e/` config, `video/` placeholder.
2. `packages/demo-kit`: the organisation registry types and `content/orgs.ts` with the 13 entries from `design.md` §b.1;
   `appUrl(slug, path, params)` with path and host modes; `calendar.ts` (demo day ↔ date, both TRID business-day
   definitions, US federal holidays, unit tests including "closing Thursday ⇒ disclosure received Monday");
   `trust.tsx` wrapping `@jeswr/solid-showcase-kit` with a fictional-organisation line; `contracts/` holding the
   `PodEvent`, `AppNote`, `LensEntry` and `TourStep` types copied from `design.md` §d.2 and §d.6 (types only; L1 and
   L2 import them and must not redefine them).
3. `apps/_template`: Vite + React + TypeScript app with `base: "/<slug>/"`, its own tokens file, self-hosted font
   example, the trust banner, an empty `src/sections/index.ts`, an empty `agent.ts`, one `data-tour` example, a Vitest
   and a Playwright smoke test.
4. `tools/build-site.mjs`: build every workspace app and assemble `dist/` as in §d.8. `vercel.json` as in §d.8
   (output directory, per-slug fallback, `noindex` header, `Service-Worker-Allowed`, isolation headers on
   `/wallet/prove` only, `ignoreCommand` limiting previews to labelled pull requests).
5. Dependencies: replace the vendored solid-server tarball and its patch with `@sparq-org/solid-server@0.1.8` from npm
   (check its `./wasm` export loads in Vitest). Vendor the `@jeswr` packages that are not on npm from a local
   `jeswr/solid-sdk` checkout with a `tools/vendor-sdk.mjs` script (same pattern as `idea-sandbox`). Add every
   dependency later lanes need: React 19, Vite, Vitest, Playwright, `@axe-core/playwright`, `n3`, `@rdfjs/wrapper`,
   `@solid/object`, `@jeswr/fetch-rdf`, `zod`, the per-app Fontsource families listed in §b.3, and the proof toolchain
   at the versions `packages/vc-kit` already pins. Run `pnpm run check:packages <name>` for each new one.
6. Move `scripts/lint-iris.mjs`, `check-insignia.mjs`, `check-mort-terms.mjs` to `tools/`; change the insignia roster
   to every real organisation named in `docs/`.
7. Write `decisions/0017-static-rebuild.md` (a summary of `design.md` §0, marking 0002, 0003, 0011, 0013, 0015
   superseded) and update `AGENTS.md` (stack, layout, lane rules from this file).

Done when: the L0 row in §4 holds. Do not build any real app or engine code.

### Brief L1: pod runtime (Fable or Opus; owns `packages/pod-runtime/**`)

Read `design.md` §d.2, §d.3, §d.5, and the old `packages/solid-kit/src/browser-pod/*` (reuse its dispatch queue, body
limit and trap recovery, and port their tests). Keep the exported names in the §d.2 contract exactly.

Build:

1. `host/`: transport-agnostic `createPodHost({ registry, seed, storage, clock })`: one `SolidServer`
   (`@sparq-org/solid-server/wasm`) per pod at `/pods/<slug>/`; serialised dispatch per pod; caller WebID passed as
   `authenticatedWebid`; journal append on successful state-changing requests; replay on start; trap recovery by
   rebuild from the journal; a `PodEvent` per response. ACL changes are read with the `@solid/object` access-control
   wrappers and diffed into `granted` / `revoked`. No hand-parsed Turtle, no raw quad matching.
2. `sw/`: the service worker entry (`pods-sw.js`): install, activate, claim clients, route `/pods/**` to the host,
   broadcast events. `client/`: `ready()`, `session()`, `podFetch`, `podUrl`, `onEvent`, `note`, `resetDemo`; fallback
   to a dedicated worker when service workers are unavailable.
3. `agents/`: load `dist/agents/<slug>.js` handlers in a worker; deliver "written to your inbox" events; each handler
   gets a `podFetch` bound to its organisation.
4. `bridge/`: the host-mode iframe (identity from `event.origin`), behind a build flag, with a unit test. The
   three-browser spike is lane H1, not this lane.
5. First, before anything else: tests that pin down the 0.1.8 wasm behaviour: what a null WebID means, default ACL
   inheritance, `acl:agent` matching, append versus write. Write the findings in the package README.

Tests (Vitest in Node against the real wasm, then Playwright for the service worker):

- Owner can read and write; an organisation with no rule gets 403; with `acl:Read` it can read and not write; with
  `acl:Append` on a container it can create and not read; anonymous is refused on private resources.
- Adding a rule emits a `grant` event whose `granted` list matches the ACL written; removing it emits `revoke`; the
  next read emits `denied` with status 403.
- Journal replay reproduces the same resource set; replay emits no events; `resetDemo` returns to the seed.
- A forced trap answers 503, and the next request succeeds with state intact.
- In the browser: first visit serves a pod resource within 3 seconds on a cold cache; state survives reload and a
  stopped worker; two tabs see each other's writes; events reach both tabs.
- Domain-generic gate: no mortgage term anywhere in the package.

Not in scope: any app, any mortgage data, sign-in screens. There is no identity provider; do not add one.

### Brief L2: tour and Lens (Sol builds, Claude reviews; owns `packages/tour/**`, `packages/lens/**`)

Read `design.md` §c (all of it) and §d.6. API facts you need are in `packages/demo-kit/src/contracts/` (the `TourStep`,
`PodEvent`, `AppNote`, `LensEntry` types) and `packages/demo-kit/README.md`. You have no network: do not look anything
up, and do not add dependencies.

Build:

1. `packages/lens`: a custom element `<solid-lens>` (shadow DOM, no framework leakage into the host app) with the four
   zones in §c.2, the map states in §c.3, the revoke presentation in §c.4, the journey ledger page in §c.5 (a real
   table with CSV export), and the accessibility behaviour in §c.6. Input is only `onEvent()` entries and the
   organisation registry. It must never invent an entry.
2. `packages/tour`: step validation (zod, the editorial limits), state in IndexedDB, deep links, "Do it for me" with a
   visible cursor, completion from Lens entries first and `data-tour` targets second, the three modes (guided, free
   play, present), and `window.__demo` (`goto`, `act`, `lens`, `present`, `totals`).
3. `mount.ts`: one import that an app adds to get the Lens, the step card and view transitions.

Develop against `packages/lens/test/fixtures/events.json` (a recorded log covering every event kind; write it by hand
from the `PodEvent` type) and a three-step fixture tour with fictional trail-expedition content. Do not use mortgage
terms anywhere in either package: a grep gate enforces it.

Tests: each map state renders from the fixture (Playwright screenshots plus DOM assertions); a denied entry shows 403
text as well as the animation; reduced motion removes travel but keeps state; axe passes with the dock open, collapsed
and as a bottom sheet at 390 px; ledger totals equal counts computed in the test; the tour completes the fixture demo
and resumes after reload.

When finished, leave the tree uncommitted and print the files changed, the commands run and their results.

## 6. Risks

| Risk | Mitigation |
|---|---|
| The wasm server's access-control behaviour differs from what the design assumes | L1's first task characterises it; anything missing is raised on `sparq-org/sparq`, not worked around silently |
| Service-worker edge cases (first load, hard reload, private windows) | Dedicated-worker fallback from the same host module; tests 7 and 8 |
| In-browser proving is slow on ordinary laptops | Isolation headers on one route; single-thread fallback; if over 20 seconds, show a proof made earlier in the session and label it |
| Thirteen apps drift into one look | Anti-template rules, separate packages, screenshot sign-off (test 14) |
| Copy overstates what Solid does | Lens "pod saw" versus "app said"; fixed caveats asserted in tests 4 and 10; the "no Solid here" step |
| Regulatory facts marked K in `design.md` are stale | L3 re-checks each against its primary source from a machine with access, before tour copy is final |
| Vercel Hobby deploy limit | One project; previews only on labelled pull requests |
