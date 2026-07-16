<!-- AUTHORED-BY Claude Fable 5 -->

# AGENTS.md — solid-mortgage

> A README for coding agents. `CLAUDE.md` is a symlink to this file. Inherits the suite-wide
> conventions (see `solid-sdk/AGENTS.md` and `prod-solid-server/AGENTS.md` for the canonical
> set); this file adds only what is specific to this showcase monorepo.

## What this is

The **Solid Mortgage Showcase**: one private pnpm + Turborepo monorepo containing every
stakeholder application in a US mortgage-application journey rebuilt on Solid, branded to the
EDMA member organisation (or best-fit US entity) that would own that role in the
build-it-for-real partner phase. All apps deploy live to Vercel. `SPEC.md` is the design of
record; research grounding lives in `docs/research/`; autonomous decisions are logged in
`decisions/<slug>.md` for Jesse to veto.

## Non-negotiable conventions

1. **Stack**: Next.js (App Router) + shadcn/ui + Tailwind for every app; pnpm workspaces
   (`packages/*`, `apps/*`) + Turbo; Biome for lint/format; Vitest for unit; Playwright for e2e.
   Never hardcode ports.
2. **RDF discipline (STRICT)**: all RDF through `@solid/object` + `@rdfjs/wrapper` typed
   accessors; fetch+parse via `@jeswr/fetch-rdf`; Turtle + JSON-LD only. Never hand-parse or
   string-concat `.acl`/`.acr` — use the access-control wrappers. SHACL shapes validate all
   written data.
3. **No minted IRIs**: only real, dereferenceable namespaces (FIBO, schema.org, W3C VC, DPV,
   ODRL, …) or blank nodes; project-specific terms go in a vocab published at a real URL we
   control. `pnpm run lint:iris` HEAD-checks every IRI (7-day cache) and gates CI.
4. **Dev/test Solid server**: sparq's `@jeswr/solid-server` (the `sparq-lws-wasm` WASM
   distribution) — NOT the Community Solid Server. Gaps are contributed upstream to
   `sparq-org/sparq`, not worked around silently (log them in `docs/research/lws-gaps.md`).
5. **Review**: roborev reviews every commit (`.roborev.toml`: codex / gpt-5.6-sol,
   min severity low). Read verdicts and address findings. Agents run roborev async
   (`--background`), never blocking foreground.
6. **Delegate mechanical work to GPT-5.6 Sol** (decision 0008): apps scaffolding/CRUD, deploy,
   infra, e2e grind run on Sol via `codex exec --json --full-auto -m gpt-5.6-sol` **from inside
   this repo/worktree** (codex auto-caches its system prompt + this AGENTS.md as the prompt
   prefix — 5–10 min TTL, so launch in bursts); briefs stay SHORT and point Sol at
   `bd show <bead>`; commits prefixed `[GPT-5.6]`. Sol never touches security-critical
   surfaces (vc-kit ZK, auth, ACL) and never owns its own acceptance tests — Claude verifies
   every Sol diff.
7. **Commits**: unsigned, author `63333554+jeswr@users.noreply.github.com`, trailer
   `Co-Authored-By:` for the generating model. Sub-agents must never push to repos Jesse does
   not own; upstream work stops at "ready to PR" for lead approval — sparq-org and jeswr repos
   are Jesse's, PRs there are in-scope.
7. **Demo integrity**: every branded surface carries a visible "concept demonstration — not
   affiliated with or endorsed by <org>" disclaimer; every app ships `noindex` robots meta.
   No real PII anywhere — demo personas only.
8. **Skills routing (mandatory)**: before building any Solid surface, read the matching skill —
   the solid-sdk skills (`solid-object`, `solid-fetch-rdf`, `solid-client-id`,
   `solid-reactive-authentication`, `solid-test-infrastructure`, `solid-type-index`,
   `solid-notifications`, `solid-server-matrix`, …) and any `packages/<pkg>/SKILL.md` in the
   sparq/solid-sdk checkouts. Verify library APIs against npm dist / context7, not memory.

## Supply chain

`.npmrc`: `ignore-scripts=true`. Lockfile discipline: `pnpm install --frozen-lockfile` in CI;
run a fresh install after any dependency change before trusting local lint results.

## Layout

- `apps/<stakeholder>` — branded Next.js apps (one Vercel project each; per-app `vercel.json`
  + `npx turbo-ignore` so a push rebuilds only affected apps)
- `packages/data-model` — vocab bindings (FIBO/MISMO-grounded), SHACL, typed wrappers
- `packages/solid-kit` — auth, pod IO, access-control helpers, sparq dev-server harness
- `packages/vc-kit` — VC issue/verify + sparq ZKP-over-VC hooks
- `packages/ui` — shared shadcn-based component kit with per-org theming tokens
- `e2e/` — cross-app journey tests (each suite boots its own in-memory sparq solid server)

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
