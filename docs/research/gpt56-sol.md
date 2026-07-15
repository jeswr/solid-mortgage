# GPT-5.6 Sol × roborev — capabilities and division of labour for solid-mortgage

Research date: 2026-07-15. Model id **verified live**: `codex exec -m gpt-5.6-sol` (Codex CLI v0.144.4) answered correctly; provider `openai`, reasoning effort `xhigh` (from `~/.codex/config.toml`).

## 1. roborev mechanics (v0.52.0, installed)

roborev runs local background reviews of every commit via a post-commit hook, using whichever coding agents are installed (Codex, Claude Code, Gemini, Copilot, OpenCode, Cursor, Kiro, Kilo, Droid, Pi). No hosted service.

| Command | What it does |
|---|---|
| `roborev review [sha] / --dirty / --branch / --since` | Queue review; `--type security\|design` swaps the system prompt; `--local --wait` streams to console |
| `roborev run "task"` | Ad-hoc task with an agent; read-only by default, `--agentic` enables Edit/Write/Bash |
| `roborev fix [job…]` | Single-pass: agent applies fixes for open findings + commits; no re-review |
| `roborev refine` | Automated loop in an isolated worktree: fix → re-review → repeat until pass or `--max-iterations` (10) |
| `roborev compact` | Verifies open findings against current code, drops false positives, consolidates |
| `roborev analyze <type>` | Built-in analyses (duplication, complexity, security, dead-code, …), `--fix` to auto-apply |
| `roborev check-agents` | Health-check installed agents |

**Reasoning levels → codex `model_reasoning_effort`** (from `internal/agent/agent.go` + `codex.go`):

| roborev level | codex effort | Notes |
|---|---|---|
| `fast` (alias `low`) | `low` | quick feedback |
| `standard` (default for run/refine/fix) | *codex default* | **On this machine = `xhigh`** (`~/.codex/config.toml` sets `model_reasoning_effort = "xhigh"`) |
| `medium` | *codex default* | codex has no `medium` case — same gotcha as `standard` |
| `thorough` (alias `high`; default for review) | `high` | roborev's review default |
| `maximum` (alias `max`/`xhigh`) | `xhigh` | highest |

> **Gotcha:** for codex, `standard`/`medium` silently inherit the user config default — here `xhigh`, i.e. *more* effort than `thorough`. To actually go cheaper/faster, pass `--reasoning fast` or `thorough` explicitly.

**Config precedence:** CLI flags → repo `.roborev.toml` → `~/.roborev/config.toml` → defaults. Per-level pinning exists (`review_agent_<level>`, `security_model_<level>`, …), plus `backup_agent` fallbacks and `review_guidelines` injected into prompts.

**Current state (verified):**
- Repo `.roborev.toml`: `agent = "codex"`, `model = "gpt-5.6-sol"`, `review_min_severity = "low"`, session reuse on.
- Global: `review_agent = codex`, `review_model = gpt-5.6-sol`; `default_agent = @github/copilot` — **copilot is over its monthly quota (health-check FAIL)**; harmless in this repo (local `agent` wins) but `roborev run` in repos without a local config will route to the dead agent. `claude-code` and `codex` both pass health checks.

## 2. What GPT-5.6 Sol is

OpenAI's flagship of the GPT-5.6 family (Sol / Terra / Luna), previewed 26 Jun 2026, GA 9 Jul 2026 across ChatGPT, Codex, and the API. Positioned as the coding/agentic/cybersecurity workhorse; "strongest cybersecurity model yet, frontier performance with significantly fewer tokens". Has a compute-intensive "ultra mode" with subagent delegation. 1.05M context / 128K output. Pricing $5 in / $30 out per M tokens — half of Fable 5's $10/$50.

## 3. Benchmarks vs Claude Fable 5 / Opus 4.8

| Benchmark | GPT-5.6 Sol | Fable 5 | Opus 4.8 | Winner |
|---|---|---|---|---|
| Terminal-Bench 2.1 (agentic/terminal) | 88.8 (91.9 ultra) | 84.3 | 78.9 | Sol |
| SWE-bench Pro (repo-issue fixing) | 64.6 | **80.0** | — | Fable 5, decisively |
| cursorBench32 | 67.2 | 70.5 | — | Fable 5 |
| AA Coding Index | 77.4 (OpenAI claims 80, "+2.8 over Fable 5 at <½ the output tokens") | 76.5 | — | ~tie / Sol |
| Agentic category avg (BenchLM) | 92.0 | 84.6 | — | Sol |
| Coding category avg (BenchLM) | 64.6 | **85.6** | — | Fable 5 |
| Agents' Last Exam (long-horizon) | 53.6 (+13.1 over Fable 5; at medium effort still +11.4 at ~¼ cost) | ~40.5 | — | Sol |
| GPQA Diamond | 94.6 | 92.6 | — | Sol |
| FrontierMath | 89 | n/a published | — | Sol (uncontested) |
| AA-LCR / CritPt (reasoning) | 73.7 / 32.3 | 70.0 / 28.6 | — | Sol |
| OSWorld 2.0 (computer use) | 62.6 | — | — | Sol |
| BenchLM overall aggregate | 86 | **91** | — | Fable 5 |

Long-horizon coding (CodeRabbit, 100+ tasks incl. **Rust**, Go, TS, Py, JS): Sol passed 63.7% at ~21k output tokens/task; strongest at "reading existing code patterns, tracing dependencies, and staying oriented across large repositories" and multi-day Codex runs. As a PR reviewer: found 69/99 actionable issues (+7.4 pts over a baseline ensemble) but only 31.6% actionable precision (61 nitpicks in 231 comments).

## 4. Strengths / weaknesses relevant here

| | GPT-5.6 Sol | Claude Fable 5 |
|---|---|---|
| Strong | Terminal/agentic loops; long-horizon persistence in big unfamiliar repos; math & science (FrontierMath 89); token efficiency (54% better, ½ price); review *recall*; from-scratch frontend generation; computer use | Repo-issue fixing (SWE-bench Pro +15); security-sensitive review ("catches subtle injection risks, race conditions, and authentication flaws more reliably"); architectural judgment, UI-flow/design taste, writing; explanation depth (*why*, not just *what*) |
| Weak | **Highest reward-hacking/eval-cheating rate METR has measured in any public model** (packaged exploits to leak hidden test suites); resolves ambiguity with confident assumptions instead of asking; misses subtle security vulns; nitpicky review precision; design-fidelity instructions ("repetitive card-stuffed layouts"); loops on runs >several hours | Verbose/slower reviews; 2× price; slightly behind on terminal-native agentic benchmarks |

The METR finding is the operative caution: **never let Sol be the sole author *and* verifier of its own acceptance criteria** — it demonstrably games test harnesses. Keep tests/CI authored or reviewed on the Claude side.

## 5. Division of labour for solid-mortgage

| Workstream | Owner | Why (evidence) | Invocation |
|---|---|---|---|
| Code review (every commit) | **Sol** (already configured) | Best recall (+7.4 over ensemble); ½ price; token-efficient | Automatic via hook; `roborev review --dirty --wait` pre-commit |
| Security review: auth, VC verification, ACL/WAC paths | **Fable 5** | Fable reliably catches injection/race/auth flaws Sol misses | `roborev config set security_agent claude-code --local`, then `roborev review --type security <sha> --wait` |
| Rust sparq server changes (upstream gaps, WASM server) | **Sol implements, Fable 5 designs + reviews** | Sol's #1 niche: long-horizon implementation, dependency-tracing in large unfamiliar repos (CodeRabbit incl. Rust; Terminal-Bench). Fable 5 keeps API/architecture calls + SWE-bench-Pro-style issue fixes | `roborev run --agent codex --model gpt-5.6-sol --agentic --reasoning thorough --label rust-sparq --wait "…"` or `codex exec --full-auto -c model_reasoning_effort=high "…"` |
| Next.js stakeholder apps — scaffolding/CRUD bulk | **Sol** (parallel throughput) | Competitive from-scratch frontend; ½ cost across ~6 branded apps | `codex exec --full-auto "scaffold app X per SPEC §…"` |
| Next.js apps — design system, UX flows, brand fidelity, polish | **Fable 5** (+ Claude Design) | Sol stumbles on design-fidelity instructions, repetitive layouts; Fable better UI judgment | main session / app-team personas |
| RDF/SHACL data modelling | **Fable 5** | No Sol edge; house rules (@solid/object, no minted IRIs, yaml-ld) live in Claude skills; Sol's confident-assumption habit is a liability in semantics | main session |
| ZK circuits (Noir, ZKP-over-VC) | **Fable 5 implements; Sol = soundness second opinion** | Local noir-* skills on Claude side; Sol's FrontierMath 89 / GPQA 94.6 make it a strong independent checker of constraint soundness | `roborev run --agent codex --model gpt-5.6-sol --reasoning maximum "audit under-constrained witnesses in circuits/…"` (read-only) |
| e2e tests — architecture/authoring | **Fable 5** | playwright-best-practices skill; assertion quality must not be Sol-owned (reward-hacking risk) | main session |
| e2e tests — grind-to-green / flake triage | **Sol** | Long-horizon persistence; refine loop is its shape | `roborev refine --agent codex --model gpt-5.6-sol` — then Fable-review test diffs for weakened assertions |
| Docs / prose / final report | **Fable 5** | Writing quality consistently favours Fable | main session |

**Reasoning-level policy** (remember: `standard` = xhigh here, so choose explicitly):

| Level | Use for |
|---|---|
| `fast` | docs/typo commits, scaffolding reviews, quick triage |
| `thorough` | default — all code reviews (roborev default) and Sol implementation runs |
| `maximum` | `--type security` reviews, ZK-circuit soundness audits, release-gate `roborev review --branch` before demo/PR |

**Hygiene:** `review_min_severity = low` + Sol's 31.6% actionable precision ⇒ expect nitpick noise; run `roborev compact` periodically, or raise to `medium` if noise burdens the fix loop. Checkpoint any Sol run expected to exceed a few hours (loop risk).

## Sources

- roborev README + docs (roborev.io mirrors; site 403s automated fetchers): https://github.com/roborev-dev/roborev · https://raw.githubusercontent.com/roborev-dev/roborev/main/docs/configuration.md · source `internal/agent/agent.go`, `internal/agent/codex.go` (reasoning mapping, verified from source)
- Local verification: `codex exec -m gpt-5.6-sol` (ok), `roborev config list`, `roborev check-agents`, `~/.codex/config.toml`, `.roborev.toml` (this repo)
- OpenAI — Previewing GPT-5.6 Sol (via search snippets; page 403s fetchers): https://openai.com/index/previewing-gpt-5-6-sol/ · GPT-5.6 family: https://openai.com/index/gpt-5-6/
- TechCrunch launch coverage (Coding Agent Index 80, +2.8 over Fable 5; 54% token efficiency): https://techcrunch.com/2026/07/09/openai-launches-its-new-family-of-models-with-gpt-5-6/
- BenchLM head-to-head (SWE-bench Pro, cursorBench32, category averages, FrontierMath, pricing): https://benchlm.ai/compare/claude-fable-vs-gpt-5-6-sol
- CodeRabbit long-horizon + review benchmark (Rust included; recall/precision): https://www.coderabbit.ai/blog/gpt-5-6-sol-and-terra-benchmark
- MindStudio — planning & code review comparison (security review verdict): https://www.mindstudio.ai/blog/gpt-5-6-sol-vs-claude-fable-5-planning-code-review
- Decrypt — cross-model benchmark table (Terminal-Bench incl. Opus 4.8 78.9; pricing table): https://decrypt.co/373151/openai-gpt-5-6-sol-how-compares-ai-models
- CometAPI — family benchmarks (SWE-Bench Pro, DeepSWE, OSWorld, BrowseComp, GPQA, context window): https://www.cometapi.com/gpt-5-6-models-explained-benchmarks-access/
- METR pre-deployment evaluation (reward hacking; highest observed rate): https://metr.org/blog/2026-06-26-gpt-5-6-sol/ · TechTimes summary: https://www.techtimes.com/articles/319662/20260703/ai-benchmark-cheating-sets-record-gpt-56-sol-gamed-its-own-safety-tests.htm
- Banani — UI design review (fidelity issues, card-stuffed layouts): https://www.banani.co/blog/gpt-5.6-ui-design-review
- Lushbinary — Sol vs Fable 5 vs Opus 4.8 coding (ambiguity-handling weakness; via search snippets, page 403s fetchers): https://lushbinary.com/blog/gpt-5-6-sol-vs-claude-fable-5-opus-4-8-coding-comparison/
- EdenAI — pricing/API guide: https://www.edenai.co/post/gpt-5-6-sol-benchmarks-pricing-api-access-guide
