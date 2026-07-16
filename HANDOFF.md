# HANDOFF — solid-mortgage session continuity

You are continuing the **Solid Mortgage Showcase** build. This doc lets a fresh Claude Code
session (e.g. on the `mortgage-dev` EC2 box) resume with full context. Read `AGENTS.md`,
`SPEC.md`, and `decisions/*.md` for the full picture; this is the operational summary.

## Your role + model policy
Orchestrate the build via scoped sub-agents; do NOT do heavy work on the main thread.
- **If the main session runs on Opus 4.8** (a system-reminder says so): act as a **pure
  orchestrator** — dispatch, review-triage, merge, git/bead mechanics only. Delegate ALL
  design/authoring/decision work to a **Fable 5** sub-agent (`Agent` with `model: "fable"`) or
  **GPT-5.6 Sol** (codex). See `decisions/0008` + memory `feedback-orchestrator-only-on-opus`.
- **Mechanical work → Sol** via `codex exec --json --full-auto -m gpt-5.6-sol -c
  model_reasoning_effort=high -c sandbox_workspace_write.network_access=true </dev/null`, run
  **from inside the repo/worktree** so codex caches the AGENTS.md prompt-prefix; keep briefs
  short, point Sol at `bd show <bead>`; commits `[GPT-5.6]`-prefixed.
- **Security-critical surfaces → Fable/Claude.** Sol builds fast but will rationalize shipping
  its own security gaps and its e2e sometimes MOCKS the auth path so green tests prove nothing.
  **Never merge a Sol app whose auth/ACL/ZK e2e is mocked or that has unresolved High findings.**
  Route those fixes to Fable; require the claude-security roborev lane clean before merge.

## Task tracking = beads (`bd`), prefix `sm-`
`bd ready` = frontier. Rules in `AGENTS.md`: run `bd` ONLY from the repo root (never a worktree);
PR branches must NOT carry `.beads/` changes (`git checkout origin/main -- .beads/` before PR);
file follow-ups as beads (`--deps discovered-from:<id>`), never TODOs; `surface:<path>` labels;
`needs:user` for human-gated. Epics are containers — dispatch their children.

## Merge loop (per PR)
1. Wait for `pnpm gate` GREEN (this repo has no required-check enforcement — verify explicitly).
2. Read the roborev verdict (`roborev show <sha>`); for security surfaces confirm the
   claude-security lane is clean too. Reject mocked-auth-path "green".
3. `gh pr merge <n> --merge --delete-branch`; `git pull --rebase`; `bd close <id>`; `bd sync`;
   commit `.beads` on main; remove the worktree.

## State at handoff (2026-07-16)
**Merged (main):** all shared packages (data-model incl. vocab+shapes+fixtures, solid-kit incl.
harness+auth+browser-pod, vc-kit incl. ZK Tier-A+anchors+status+seed-tooling, ui incl. disclaimer
pack); apps **tour, lender-boa, lender-53, property, closing, vocab**. Upstream in jeswr/solid-sdk:
agent personas + roborev/beads skills, `@jeswr/synthetic-rdf`, `@jeswr/solid-seed`, mirror sweep,
dependabot + CI-hygiene fixes. Showcase-framework DESIGN merged (`docs/research/
showcase-framework-design.md`, epic sm-72; build children sm-74/75/76/77 gated on apps landing).
**Tour deployed** (Vercel, SSO-gated preview) — see the URL in the session / `bd show sm-37`.

**In-flight when handed off (RE-CHECK — their laptop agents die on disconnect):**
- **sm-28 wallet** (Fable) — central borrower Data Vault; if no open PR, re-dispatch to Fable.
- **sm-29 verifications** (Sol), **sm-32 gse** (Sol) — issuer/AUS apps; if claimed with no open
  PR, re-dispatch (Sol); hold to the real-auth-path bar.
On resume: `bd list --json | jq '.[]|select(.status=="in_progress")'` and
`gh pr list --repo jeswr/solid-mortgage --state open` — reconcile claimed-but-dead beads.

**Remaining after the apps:** sm-65 (seeder integration), sm-37 (full 8-project Vercel deploy —
env lessons in its notes: rootDirectory=apps/<app>, `MORTGAGE_TRUST_FORWARDED_HEADERS=1` on every
pod-route app, clear outputDirectory/buildCommand overrides, SSO-gating decision), tour zone-URL
wiring, sm-36 (cross-app journey e2e + axe), sm-41 (polish), then the framework build (sm-74+) and
the EDMA sales pack remainder (sm-59 recorded demos, sm-60 FAQ+standards, sm-61 proposal template).

## needs:user (Jesse) — do not attempt
sm-50 (npm bootstrap publish `@jeswr/solid-server`), sm-51 (vocab domain veto), sm-54 (CoP
delivery format/date), sm-52 (Mode-2 host), sm-53 (Vercel GitHub-app access), sm-5q2 (legal
review of branded surfaces), sm-6sw (Freddie name-use consent). Jesse also holds merge authority
on jeswr/solid-sdk (granted 2026-07-15) — you may merge there under the same green+roborev bar.

## Autonomous drain
`.claude/workflows/drain-ready-beads.js` (`Workflow({name:"drain-ready-beads"})`) drains the
frontier; `scripts/drain-daemon.sh` is the headless loop (this box runs it with
`DRAIN_CLAUDE_FLAGS="--dangerously-skip-permissions"` per the operator opt-in — dedicated box).
Security surfaces are never auto-merged by the drain; it holds them for review.
