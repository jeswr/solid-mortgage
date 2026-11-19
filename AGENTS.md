<!-- AUTHORED-BY Claude Fable 5 -->

# AGENTS.md — solid-mortgage

> A README for coding agents. `CLAUDE.md` is a symlink to this file. Inherits the suite-wide
> conventions (see `solid-sdk/AGENTS.md` and `prod-solid-server/AGENTS.md` for the canonical
> set); this file adds only what is specific to this showcase monorepo.

## What this is

The **Solid mortgage demo**: one static site on which thirteen fictional organisation apps run a
US purchase-mortgage journey against pods that live in the visitor's browser (sparq's wasm Solid
server in a service worker). No server, no identity provider: sign-in is simulated, access
control is real. Decision of record: [`decisions/0017-static-rebuild.md`](decisions/0017-static-rebuild.md),
which summarises the rebuild design (`docs/rebuild/design.md`) and its lane plan (`docs/rebuild/build-plan.md`).
Research grounding lives in `docs/research/`; autonomous decisions in `decisions/<nnnn>-<slug>.md`.

## Non-negotiable conventions

1. **Stack**: TypeScript, React 19, Vite (one build per app, `base: "/<slug>/"`), pnpm
   workspaces (`packages/*`, `apps/*`, `content`) + Turbo, Biome, Vitest, Playwright. No Next.js
   (only `apps/vocab`, a separate Vercel project, still uses it). Never hardcode ports.
2. **RDF discipline (STRICT)**: all RDF through `@solid/object` + `@rdfjs/wrapper` typed
   accessors; fetch+parse via `@jeswr/fetch-rdf`; serialise with `n3.Writer`. Never hand-parse
   or string-concat `.acl` documents: use the access-control wrappers. SHACL shapes validate
   all written data.
3. **No minted IRIs**: only real, dereferenceable namespaces (FIBO, schema.org, W3C VC, DPV,
   ODRL, …) or blank nodes; project terms go in `vocab/mort.ttl`, published at
   `https://solid-mortgage-vocab.vercel.app/mort#`. `pnpm run lint:iris` checks every IRI.
4. **Pod server**: `@sparq-org/solid-server@0.1.8` from npm (its `./wasm` export), never the
   Community Solid Server. Gaps go upstream to `sparq-org/sparq`, not worked around silently.
5. **Fictional organisations only**: every organisation and person is fictional
   (`content/orgs.ts`). Every route of every app, including not-found pages, renders
   `<TrustBanner />` from `@mortgage/demo-kit/trust` and ships `noindex`; each app sets its own
   `<title>`, favicon and `theme-color`. `pnpm run check:insignia` bans regulatory insignia and
   every real organisation named in `docs/` (roster: `tools/insignia-roster.mjs`) from app
   source and from the built `dist/`.
6. **Anti-template**: each app is its own package with its own tokens, self-hosted
   open-licence font, layout archetype and voice (design.md §b.2). Shared code is limited to the
   engine packages, `demo-kit`, `data-model`, `vc-kit` and headless primitives.
7. **Review**: roborev reviews every commit (`.roborev.toml`). Read verdicts and address findings.
8. **Commits**: unsigned, author `Jesse Wright <63333554+jeswr@users.noreply.github.com>`,
   `Co-Authored-By:` trailer naming the generating model; new files carry an `AUTHORED-BY`
   marker. Codex (GPT 6.2 Sol) work follows `build-plan.md` §3: it never owns its own acceptance
   tests, nor access-control, credential or proof code.
9. **Skills routing (mandatory)**: before building a Solid surface, read the matching solid-sdk
   skill and any `packages/<pkg>/SKILL.md` (for the trust banner:
   `solid-sdk/packages/solid-showcase-kit/SKILL.md`). Verify library APIs against the installed
   dist, not memory.

## Supply chain

`.npmrc`: `ignore-scripts=true`. CI installs with `pnpm install --frozen-lockfile`. Before adding
any dependency run `node guardrails/scripts/check-packages.mjs <name>`. Only lanes L0 and L4 add
dependencies (one root lockfile); every dependency stage 1 and 2 lanes need is already declared
in their package manifests. `@jeswr` packages not on npm are vendored as packed tarballs in
`vendor/` by `node tools/vendor-sdk.mjs <path-to-solid-sdk>` (never edit `vendor/` by hand).

## Layout

```
apps/<slug>/          one Vite + React app per organisation (13) plus welcome; slugs in demo-kit
apps/_template/       the starting point for an app: copy its files, keep the app's manifest
apps/feedback/        the feedback page (interview or questionnaire); banner links reach it
packages/feedback/    feedback guide, validation, records; ./server holds the API handlers
api/feedback/         Vercel functions (status, turn, audio, submit); keys only in Vercel env
apps/vocab/           the mort vocabulary site (its own Vercel project; do not move it)
packages/demo-kit/    registry types, appUrl(), demo calendar, trust wiring, contract types
packages/pod-runtime/ in-browser pods (lane L1)      packages/tour/, packages/lens/ (lane L2)
packages/data-model/  vocab bindings, SHACL shapes, typed wrappers
packages/vc-kit/      issue, verify, status, re-issue, threshold proof (security-critical)
content/orgs.ts       the organisation registry; content/<demo>/ holds seed, tour and copy
e2e/                  acceptance suite (lane T1), run against dist/ by playwright.config.ts
tools/                build-site, serve-dist, site-routes (generates vercel.json),
                      vercel-ignore, vendor-sdk, lint-iris, check-insignia, check-mort-terms
vendor/               packed @jeswr tarballs not on npm (showcase-kit, app-shell)
legacy/               the retired Next.js apps and their e2e suite; not in the workspace
video/                recorder and narration (lane V1)
```

## Building, serving, gating

- `pnpm run build` builds every app (Turbo, dependencies first) and assembles `dist/`
  (`dist/<slug>/`, `dist/pods-sw.js` from pod-runtime, `dist/agents/<slug>.js` from each app's
  `src/agent.ts`, `dist/video/`). `pnpm run preview` serves it with production routing.
- `vercel.json` is generated: change routing in `tools/site-routes.mjs`, then
  `node tools/site-routes.mjs --write`. A test fails on drift.
- `pnpm run gate` = lint, vocab and shape checks, build, insignia check, typecheck, tests.
  `pnpm run test:e2e` adds the Playwright suites (root `e2e/` and each app's `e2e/`).
- Cross-app links always go through `appUrl(slug, path, params)`; never write `/lender/…` by hand.
- `/wallet/prove` and `/wallet/lending/prove` are the only routes with cross-origin isolation
  headers; reach them with a full navigation, not a client-side route change.

## Lanes

Lanes and their paths are in `build-plan.md` §2. A lane edits only its own paths; if it needs a
change elsewhere it stops and reports. The contract types in
`packages/demo-kit/src/contracts/` (`PodEvent`, `AppNote`, `LensEntry`, `TourStep`) are copied
from design.md §d.2 and §d.6: import them, never redefine them. A demo other than the mortgage
adds to an existing app only under `apps/<slug>/src/sections/<demo>/`, registered in that app's
`src/sections/index.ts`.

## Task tracking — beads

[beads](https://github.com/gastownhall/beads) (`bd`, prefix `sm-`) is the source of truth for
all work in this repo; the JSONL in `.beads/` is committed. Rules:

- **Run `bd` only from the repo root checkout** — never from inside a worktree (a
  worktree-local `.beads/` forks the JSONL).
- **PR branches must not carry `.beads/` changes** — tracker commits land directly on main
  (the established chore-commit pattern); before opening a PR, `git checkout origin/main --
  .beads/` on the branch if it drifted. Branch-carried JSONL is the #1 merge-conflict source.
- **Claim before working** (`bd update <id> --claim`), close when merged (`bd close <id>`),
  `bd sync` before ending a session.
- **File follow-ups as beads, never TODOs**: any discovered task, bug, or deferred improvement
  → `bd create "<title>" -d "<why + acceptance>" --deps discovered-from:<current-id>`; label
  `needs:user` when a human action gates it; label `surface:<path>` so the drain can schedule
  it without collisions (one bead per surface in flight).
- **Epics are containers** — dispatch their ready children, never the epic itself.

## Autonomous drain

`.claude/workflows/drain-ready-beads.js` (run with `Workflow({ name: "drain-ready-beads" })`)
drains the `bd ready` frontier without the lead session hand-dispatching: filter →
persona-routed implement agents in isolated worktrees → PR → adversarial verify → merge clean
PRs + close beads, in waves until dry. `scripts/drain-daemon.sh` is the headless entry point
(`nohup scripts/drain-daemon.sh >/dev/null 2>&1 &`; logs at `.beads/drain.log`) so the
frontier keeps draining with no session available. Safety rails: `needs:user`/epics/in-flight
excluded, one bead per surface, security surfaces never auto-merged, follow-ups filed as beads.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:970c3bf2 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   bd dolt push
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->

<!-- BEGIN BEADS CODEX SETUP: generated by bd setup codex -->
## Beads Issue Tracker

Use Beads (`bd`) for durable task tracking in repositories that include it. Use the `beads` skill at `.agents/skills/beads/SKILL.md` (project install) or `~/.agents/skills/beads/SKILL.md` (global install) for Beads workflow guidance, then use the `bd` CLI for issue operations.

### Quick Reference

```bash
bd ready                # Find available work
bd show <id>            # View issue details
bd update <id> --claim  # Claim work
bd close <id>           # Complete work
bd prime                # Refresh Beads context
```

### Rules

- Use `bd` for all task tracking; do not create markdown TODO lists.
- Run `bd prime` when Beads context is missing or stale. Codex 0.129.0+ can load Beads context automatically through native hooks; use `/hooks` to inspect or toggle them.
- Keep persistent project memory in Beads via `bd remember`; do not create ad hoc memory files.

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.
<!-- END BEADS CODEX SETUP -->
