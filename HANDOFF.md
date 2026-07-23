# HANDOFF — solid-mortgage session continuity

## MULTI-DEMO SUITE STATE (updated 2026-07-23)

Three showcase demos, each in its own Jesse-owned repo. **All three are engineering-complete;
the ONLY remaining blocker is the Vercel token for deploys.**

- **Demo 1 — Mortgage** (`solid-mortgage`): COMPLETE + DEPLOYED. 9 apps live (Vercel, public by
  decision), journey e2e green, framework published, use-case doc (sm-gbjq).
- **Demo 2 — Small-dollar lending** (`jeswr/solid-lending`, now PUBLIC): COMPLETE. Epic sm-qz3j
  closed 8/8 — 6 apps, real ZK, seeder, use-case doc (sm-vcoz), **cross-app journey e2e GREEN**
  (PR #11, 5 scenes, CI passing). NOT yet deployed (Vercel token). Vocab still `urn:example:lend#`
  → migrate to a published vocab + FIBO-direct typing (beaded).
- **Demo 3 — GLEIF business KYB** (`jeswr/solid-kyb`, now PUBLIC): COMPLETE. Scientifically
  selected (winner 4.65/5) → designed → built: data-model (**FIBO-BE-direct**, PR #9) +
  vc-kit (real Tier-A AND Tier-B ZK) + 5 apps + seeder + use-case doc (sm-qrfu) + **cross-app
  journey e2e GREEN** (PR #10, 5 scenes incl. a real ZK hidden-owner DECLINE, FIBO-typed
  credentials verified end-to-end) + CI passing. NOT yet deployed (Vercel token). Vocab hosting
  pending (sm-6wcw). 2 vault app gaps beaded (basePath fetch; Node-only shapesDir browser-crash).

**FIBO evaluation (2026-07-23):** `docs/research/fibo-applicability-and-gaps.md` (PR #39) — direct-
FIBO evaluation of all three use cases, live-verified IRIs, coverage %, gaps + upstream-contribution
targets. KYB refactored to type with FIBO-BE DIRECTLY (PR #9). A reusable `fibo-ontologist` agent
lives in `.claude/agents/`. Lending FIBO-direct refactor + upstream FIBO contributions beaded.

**RESOLVED this session:** the securityCritical `@jeswr/solid-pod-guard` `loopbackMappedFetch`
https→http bug (FIXED, solid-sdk PR #14, roborev-clean → unblocked BOTH e2es); Tier-A ZK anchors
made real (PR #8, sparq toolchain); demo repos made PUBLIC → free CI (accumulated CI hygiene debt
fixed: RFC-2606 hosts, insignia scoped to rendered surfaces, wrong FIBO IRIs corrected).

**REMAINING (all beaded):** (1) **Vercel token** → deploy Demo 2, Demo 3, + lend/kyb vocab
projects — the ONE hard blocker. (2) lending `urn:example:` → FIBO-direct migration. (3) 2 vault
app gaps. (4) upstream FIBO contributions (needs:user). Everything is pushed to GitHub.

---


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

## State at handoff (2026-07-16, updated end-of-session)
**Merged (main):** all shared packages (data-model incl. vocab+shapes+fixtures, solid-kit incl.
harness+auth+browser-pod, vc-kit incl. ZK Tier-A+anchors+status+seed-tooling, ui incl. disclaimer
pack); **ALL 9 stakeholder apps — tour, lender-boa, lender-53, property, closing, vocab, wallet
(sm-28), verifications (sm-29), gse (sm-32)**. The stakeholder-apps epic (sm-8) app children are
all closed. Upstream in jeswr/solid-sdk: agent personas + roborev/beads skills, `@jeswr/synthetic-rdf`,
`@jeswr/solid-seed`, mirror sweep, dependabot + CI-hygiene fixes. Showcase-framework DESIGN merged
(`docs/research/showcase-framework-design.md`, epic sm-72; build children sm-74/75/76/77 now UNBLOCKED
— apps have landed). **Tour deployed** (Vercel, SSO-gated preview) — URL in `bd show sm-37`.

**sm-28/sm-29/sm-32 all MERGED this session** under the full security bar (pnpm gate green; roborev
security lane clean; independent adversarial agents confirmed real OIDC/DPoP/pod/verifier — NO mocked
auth/issue/verify — on each). verifications took 3 hardening rounds (multi-write atomicity, anchor-kind
validation, revoked-anchor refusal, index-release) + an e2e reconcile; gse took 3 rounds (evidence-gate,
honesty, appraisal-property binding) + e2e role. ~20 follow-up beads filed for deferred/lower-severity
items (Mode-2b login UIs sm-2oq/sm-ee5bf00d/sm-11ad63a0, serviceWebId sm-4oq/sm-8k0, findings-as-RDF
sm-89r, property-IRI sm-g0p, ZIP+4 sm-cc4, flows verified-state sm-zxg, allocator residuals sm-bpu/sm-1nc,
tooling PATH bug sm-9503b20b, etc.) — all `discovered-from` + `surface:`-labelled.

**Ops notes learned this session (see `bd memories`):** (1) The HANDOFF Sol/codex path FAILS on this box
(bwrap can't nest; the `--dangerously-bypass-approvals-and-sandbox` fix is classifier-blocked) — route
app/authoring work to **Fable 5 solid-app-builder agents via the Agent tool** in pre-made worktrees
instead (also the stronger security routing). (2) `bd create/label` do NOT auto-flush issues.jsonl —
run `bd export --output .beads/issues.jsonl` before committing beads or they strand. (3) Per-app builders
can't run the cross-app e2e (`e2e/apps.spec.ts`); banner copy/role/org or interstitial changes there break
it — brief builders to update the app's e2e-table entry and run the full e2e locally.

**No open PRs, no in_progress beads at handoff.** On resume: `gh pr list --state open` and
`bd list --json | jq '.[]|select(.status=="in_progress")'` to reconcile anything new.

**DONE since (this session, all merged):** sm-65 seeder integration (real vc-kit issuance +
sm-26 anchors, owner-only ACLs, wired into dev-server/e2e-global-setup/Mode-1); sm-37 Vercel
deploy — **all 9 zones live** at `solid-mortgage*.vercel.app` (env matrix, zone-URL rewrites,
`MORTGAGE_TRUST_FORWARDED_HEADERS=1` on pod-route apps; runbook + git-author-block gotcha in
`docs/deploy.md`); sm-36 cross-app 5-scene journey e2e + axe (54/54, real DPoP, non-mocked).
**Vercel posture:** production `.vercel.app` domains are PUBLIC by Jesse's decision (Hobby can't
gate production; noindex + robots-disallow + concept-demo disclaimers are the mitigation) — sm-1f0
tracks re-gating if legal (sm-5q2) requires. Pod-route apps 503 until a live pod host + service
identity env (sm-2eg, blocked on sm-52).

**Showcase framework — COMPLETE + PUBLISHED (jeswr/solid-sdk, this session).** Epic sm-72's build
children all merged: sm-74 `@jeswr/solid-showcase` (JSON-driven walkthrough), sm-75
`@jeswr/solid-showcase-kit` + `@jeswr/solid-pod-guard`, sm-76 `create-solid-demo`. All **domain-generic**
(lead directive: "in no way finance-specific" — kit ships NO insignia roster; consumers supply
`bannedMarks`; use-case content enters only via the walkthrough document) and scrubbed of private-origin
naming. pod-guard is securityCritical (adversarial-reviewed). The extraction surfaced + FIXED an inherited
security HIGH in the live apps (sm-h2p `assertAllowedPodBase` query/fragment bypass — merged) + beaded
sm-c7i (loopback SSRF). **Only sm-77 (refactor solid-mortgage to CONSUME the framework) remains — it is
`needs:user`/P2**: it re-plumbs the merged private apps and is effectively gated on the framework npm
publish (sm-50, also needs:user) — without it, adoption means vendored `file:` tarballs (a workaround to
re-do post-publish). Decide approach before starting.

**Other remaining P1:** the **EDMA sales pack** (epic sm-55 → sm-59 recorded demos [journey validates it],
sm-60 FAQ+standards, sm-61 proposal template); upstream sparq (sm-69 createSolidPod, sm-49 solid-vc
signPresentation). ~60 lower-severity follow-up beads filed across the merged work — `bd ready` for the frontier.

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
