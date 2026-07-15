# 0008 — GPT-5.6 Sol / Claude Fable 5 division of labour

**Status:** accepted (autonomous, 2026-07-15)
**Input:** docs/research/gpt56-sol.md (benchmarks + METR reward-hacking caveat)

| Workstream | Model | How |
|---|---|---|
| Per-commit review | Sol | roborev (already configured: codex / gpt-5.6-sol) |
| Security review of auth/VC/ACL diffs | Fable 5 | `.roborev.toml` `security_agent = "claude-code"`; run at maximum reasoning |
| Rust sparq upstream implementation (long-horizon) | Sol | `roborev run --agent codex --model gpt-5.6-sol --agentic --reasoning thorough`; Fable keeps API/architecture decisions + reviews diffs |
| Next.js app scaffolding / CRUD bulk | Sol | same pattern; Fable owns design system, UX flows, brand polish |
| RDF/SHACL modelling, Noir/ZK circuits | Fable 5 | house-rule skills live here; Sol as read-only second opinion at maximum reasoning |
| e2e grind-to-green | Sol via `roborev refine` | **Fable reviews every test diff for weakened assertions** — Sol's METR reward-hacking rate is the highest measured of any public model; Sol never owns its own acceptance tests |

Always pass an explicit reasoning level (fast / thorough / maximum); "standard" silently runs
at xhigh on this machine. Sub-agent briefs that delegate to Sol must include the
no-self-accepted-tests rule verbatim.

## Context caching when delegating to Sol (Jesse, 2026-07-15)

Per Jesse's measured guide (gist 65d0655cf54eab888ea21068cc4f6c2a): OpenAI prompt caching is
automatic on the longest common prefix ≥1024 tokens with a 5–10 min TTL, and the cacheable
prefix is exactly **codex's system prompt + the repo's AGENTS.md** (~10K tokens); user briefs
never cache, and prompt-structuring tricks to extend the prefix do not work. Therefore:
1. run Sol workers **inside the target repo/worktree** (identical AGENTS.md ⇒ prefix hit);
2. keep briefs **short** — point Sol at `bd show <bead>` instead of pasting specs;
3. launch Sol calls **in bursts** to stay inside the TTL;
4. prefix commits/PRs with `[GPT-5.6]` for comparative error-rate auditing;
5. use `codex exec --json` and check `cached_input_tokens` when tuning.
The drain workflow routes mechanical surfaces (apps/*, deploy, infra, e2e) to Sol via a thin
haiku dispatcher implementing exactly this pattern; the lead session delegates its own
mechanical work (bulk scaffolding, Rust sparq implementation) the same way to reduce
session-limit burn.
