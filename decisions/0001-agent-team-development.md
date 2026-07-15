# 0001 — Application development via scoped sub-agent teams

**Status:** accepted (Jesse-directed, 2026-07-15)

Jesse: develop the applications mostly with sub-agents so they share the cached context prefix
without each carrying the whole suite's context; reuse agent definitions from jeswr/solid-sdk,
contributing them upstream first if absent (they were absent) and pointing to them from the
skills documents.

## Decisions

1. **Personas are canonical upstream.** `.claude/agents/` in jeswr/solid-sdk defines the Solid
   app-development team: `solid-app-builder` (owns one app end-to-end), `solid-frontend-dev`,
   `solid-data-modeler`, `solid-test-engineer`, `solid-devops`, plus `solid-app-orchestration`
   (lead runbook — the lead role is played by the main session; sub-agents cannot spawn
   children). solid-mortgage carries copies in its own `.claude/agents/` with a
   "canonical in jeswr/solid-sdk" header, refreshed when upstream changes.
2. **Scoped briefs.** Each spawn names the exact app/package paths, the SPEC sections, and the
   skills the specialist must read — never "the whole repo". Disjoint path sets run in parallel.
3. **Model frontmatter omitted** in the personas so specialists inherit the lead session's model
   (currently Fable 5). This supersedes the older "pin every persona to opus" convention, which
   predates Fable and would now silently *downgrade* specialists below the session model. Leads
   may still pass a cheaper model per-spawn for mechanical work.
4. **Skills cross-linking.** Each solid-sdk skill that a persona routes through gains a one-line
   pointer to that persona, so future app-development agents discover the team structure from
   the skills themselves.
