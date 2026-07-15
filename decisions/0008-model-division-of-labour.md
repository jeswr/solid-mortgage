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
