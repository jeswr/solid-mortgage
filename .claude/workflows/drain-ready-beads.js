// drain-ready-beads — the self-driving bead-frontier loop for solid-mortgage.
//
// PURPOSE: keep the lead session OUT of per-agent dispatch. Each wave reads the ready-bead
// frontier (`bd ready --json`), filters to safely-dispatchable work, runs one persona agent
// per bead in an isolated worktree (implement -> PR), adversarially verifies each PR and
// merges the clean ones, then re-reads the frontier (newly-unblocked beads appear) and
// repeats until dry or capped. Modeled on sparq's .claude/workflows/autonomous-scheduler.js.
//
// DURABLE: committed here and linked from AGENTS.md. Run from any session in this repo:
//   Workflow({ name: "drain-ready-beads" })
//   Workflow({ name: "drain-ready-beads", args: { maxBeads: 6, waves: 2, only: ["sm-..."] } })
// The headless entry point is scripts/drain-daemon.sh, which invokes exactly this by name.
//
// DISPATCHABLE = status "open" (in_progress is someone else's claim; `bd ready` includes it)
//   MINUS needs:user-labelled beads   (human-gated: not agent work)
//   MINUS epics                        (containers — dispatch their ready children instead)
//   MINUS beads with an open PR       (branch bead/<id> already pushed = in flight)
//   MINUS external-repo surfaces      (surface:solid-sdk / surface:sparq-upstream beads work in
//                                      OTHER repos with their own conventions — the lead
//                                      dispatches those with bespoke briefs, never this loop)
//   MINUS surface collisions          (at most ONE bead per surface:* label per wave —
//                                      disjoint path sets are what make parallel merges safe)
//
// SAFETY: impl agents run in ISOLATED worktrees and never touch the shared checkout; `bd`
// runs ONLY from the repo root (worktree-local .beads would fork the JSONL). Verify merges
// only clean, green, low-risk PRs; anything with concerns (security surfaces, house-rule
// violations, red CI, unaddressed Copilot review) stays OPEN with the bead in_progress and
// a note for the lead. Every agent files follow-up beads instead of TODOs.

export const meta = {
  name: 'drain-ready-beads',
  description:
    'Self-driving bead-frontier loop: filter bd ready, implement each bead via its persona agent in an isolated worktree, adversarially verify + merge clean PRs, repeat until dry or capped.',
  whenToUse:
    'Run whenever ready beads should be drained without the lead session hand-dispatching agents (the drain daemon invokes this headlessly).',
  phases: [
    { title: 'Frontier', detail: 'bd ready --json + dispatchability filters' },
    { title: 'Implement', detail: 'one persona agent per bead, isolated worktree -> PR' },
    { title: 'Verify', detail: 'adversarial review; merge clean PRs, close beads' },
  ],
}

const REPO = '/Users/jesght/Documents/GitHub/jeswr/solid-mortgage'
const MAX_BEADS = (args && args.maxBeads) || 4
const MAX_WAVES = (args && args.waves) || 3
const ONLY = (args && args.only) || null

const FRONTIER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    beads: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          surface: { type: 'string' },
          priority: { type: 'number' },
        },
        required: ['id', 'title', 'surface'],
      },
    },
    droppedAsInFlight: { type: 'array', items: { type: 'string' } },
    droppedAsGated: { type: 'array', items: { type: 'string' } },
  },
  required: ['beads'],
}

const IMPL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    bead: { type: 'string' },
    prUrl: { type: 'string' },
    gatesGreen: { type: 'boolean' },
    skipped: { type: 'boolean' },
    reason: { type: 'string' },
    followUpBeads: { type: 'array', items: { type: 'string' } },
  },
  required: ['bead', 'skipped'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    bead: { type: 'string' },
    merged: { type: 'boolean' },
    concerns: { type: 'array', items: { type: 'string' } },
  },
  required: ['bead', 'merged'],
}

function pickPersona(surface) {
  const s = (surface || '').toLowerCase()
  if (s.startsWith('apps/')) return 'solid-app-builder'
  if (s.startsWith('packages/ui')) return 'solid-frontend-dev'
  if (s.startsWith('packages/data-model')) return 'solid-data-modeler'
  if (s === 'e2e' || s.startsWith('e2e/')) return 'solid-test-engineer'
  if (s === 'infra' || s === 'deploy' || s.startsWith('.github')) return 'solid-devops'
  return 'general-purpose' // packages/*, sparq-upstream, solid-sdk, docs, unknown
}

// Decision 0008 + Jesse's caching gist: mechanical implementation surfaces run on GPT-5.6 Sol
// via codex (half price, better long-horizon terminal work), driven by a thin haiku wrapper.
// Judgment surfaces (RDF/SHACL, vc-kit/auth security, design system, docs/sales writing) stay
// on Claude. Sol NEVER owns acceptance tests unreviewed — the Claude verify stage covers that.
function pickRunner(surface) {
  const s = (surface || '').toLowerCase()
  if (s.startsWith('apps/') || s === 'deploy' || s === 'infra' || s === 'e2e') return 'sol'
  return 'claude'
}

function solImplPrompt(b) {
  return `You are a thin DISPATCHER in an isolated git worktree of ${REPO}: the implementation of bead ${b.id} ("${b.title}", surface: ${b.surface}) is done by GPT-5.6 Sol via the codex CLI, not by you. Steps:
1. Claim from the repo root: cd ${REPO} && bd update ${b.id} --claim (on failure STOP: return skipped=true, reason="already claimed").
2. In your worktree, create branch bead/${b.id}. Then launch Sol FROM THE WORKTREE (cwd matters: codex caches its system-prompt + AGENTS.md prefix automatically — running inside the repo is what makes the ~10K-token prefix cache hit; keep your user brief SHORT, it is uncached):
   codex exec --json --full-auto -m gpt-5.6-sol -c model_reasoning_effort=high "Work bead ${b.id}. Spec: run (cd ${REPO} && bd show ${b.id}). Obey AGENTS.md. Stay within surface ${b.surface}. Branch bead/${b.id} (already checked out). pnpm install --frozen-lockfile if needed, implement, run pnpm run gate until green. Commit subject prefixed [GPT-5.6], trailer Co-Authored-By: GPT-5.6 Sol via codex <noreply@openai.com>. Push the branch and open a PR on jeswr/solid-mortgage titled '${b.id}: <summary>' ending with the line: 🤖 Generated with [Claude Code](https://claude.com/claude-code) — do NOT merge. File discovered follow-ups: (cd ${REPO} && bd create '<title>' -d '<why>' --deps discovered-from:${b.id})."
3. When codex exits, verify independently: branch pushed? PR open (gh pr list --head bead/${b.id})? gate result from the codex JSON output. Do NOT redo or extend Sol's implementation yourself.
4. If codex is unavailable or fails twice, return skipped=true with the error as reason (the lead re-routes).
Return the structured output only: bead, prUrl, gatesGreen, skipped, reason, followUpBeads (ids Sol created — check cd ${REPO} && bd list --json | last entries with discovered-from:${b.id}).`
}

function frontierPrompt(cap) {
  return `You are the frontier reader for the bead drain in ${REPO}. From the REPO ROOT run:
  cd ${REPO} && bd ready --json
  cd ${REPO} && gh pr list --state open --json headRefName --limit 100
Filter the ready beads to the DISPATCHABLE set:
  - status === "open" only (in_progress beads are already claimed);
  - drop any bead labelled needs:user (report in droppedAsGated);
  - drop any bead whose surface label is "surface:solid-sdk" or "surface:sparq-upstream" (external-repo work, lead-dispatched — report in droppedAsGated);
  - drop issue_type === "epic";
  - drop any bead whose branch bead/<id> appears in the open-PR head refs (report in droppedAsInFlight);
  ${ONLY ? `- keep ONLY ids in ${JSON.stringify(ONLY)};` : ''}
  - surface = the value of its "surface:<value>" label ("misc" if absent); keep at most ONE bead
    per surface (highest priority number 0 first, then oldest), so parallel work is path-disjoint;
  - cap the final list at ${cap}, priority order.
Return the structured output only. Do not modify anything.`
}

function implPrompt(b, persona) {
  return `You are draining bead ${b.id} ("${b.title}", surface: ${b.surface}) in the solid-mortgage workspace. You are running in an ISOLATED git worktree of ${REPO} — never touch the shared checkout.
Ground rules (non-negotiable):
- Read ${REPO}/AGENTS.md first, then \`cd ${REPO} && bd show ${b.id}\` for the full spec. bd commands run ONLY from ${REPO} (never from your worktree). Claim first: \`cd ${REPO} && bd update ${b.id} --claim\` (if the claim fails, STOP and return skipped=true, reason="already claimed").
- Follow your persona's "Read first" skills list before writing code. Verify library APIs against the published npm dist / context7, not memory.
- Work ONLY within the bead's surface paths. If the bead is underspecified, make the smallest reasonable call, note it in the PR body, and file a follow-up bead rather than expanding scope.
- In your worktree: create branch bead/${b.id}, implement, run the affected gate (\`pnpm run gate\` — pnpm install --frozen-lockfile first if node_modules is absent), commit with the suite style + trailer "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>" (if committing fails on gpg, use GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=commit.gpgsign GIT_CONFIG_VALUE_0=false git commit ...), push, and open a PR on jeswr/solid-mortgage titled "${b.id}: <summary>" whose body ends with the Claude Code attribution line. Do NOT merge it.
- File every discovered follow-up as a bead: \`cd ${REPO} && bd create "<title>" -d "<why + acceptance>" --deps discovered-from:${b.id}\` (label needs:user if human-gated). List their ids in followUpBeads.
- If gates cannot go green, still push the branch + open a DRAFT PR, set gatesGreen=false and explain in reason.
Return the structured output only.`
}

function verifyPrompt(r) {
  return `You are the adversarial verifier for bead ${r.bead} (PR: ${r.prUrl}) on jeswr/solid-mortgage. READ-ONLY except for the merge/close actions at the end. From ${REPO}:
1. Fetch the diff (gh pr diff) and review it adversarially: correctness, scope (only the bead's surface), house rules from AGENTS.md (RDF via @solid/object + @rdfjs/wrapper only; no minted IRIs; no hand-built .acl; demo disclaimers + noindex on branded surfaces; no hardcoded ports; no @inrupt).
2. Wait for CI: gh pr checks ${r.prUrl.split('/').pop()} --watch --fail-fast (give up after ~10 minutes and treat as not-green). Also check gh pr view for a GitHub Copilot review; if Copilot left comments, they count as concerns unless the diff already addresses them.
3. Verdict: merge ONLY if implGatesGreen=${String(r.gatesGreen === true)}, CI is green, and you found no material concerns. Security-sensitive surfaces (auth, ACL, token handling) are NEVER auto-merged — hold with a concern.
   - To merge: gh pr merge ${r.prUrl} --squash --delete-branch, then cd ${REPO} && bd close ${r.bead} && bd sync (bd sync flushes + commits the JSONL; if it pushes, fine).
   - To hold: leave the PR open, cd ${REPO} && bd update ${r.bead} --append-notes "drain hold: <concerns>" and leave it in_progress.
Return the structured output only (merged=true only after the merge command succeeded).`
}

const implemented = []
const merged = []
const held = []
const skipped = []
let wave = 0

while (wave < MAX_WAVES) {
  wave += 1
  phase('Frontier')
  const frontier = await agent(frontierPrompt(MAX_BEADS), {
    label: `frontier:wave${wave}`,
    phase: 'Frontier',
    schema: FRONTIER_SCHEMA,
    effort: 'low',
  })
  if (!frontier || !frontier.beads.length) {
    log(`wave ${wave}: frontier dry — stopping`)
    break
  }
  log(`wave ${wave}: dispatching ${frontier.beads.length} bead(s): ${frontier.beads.map(b => b.id).join(', ')}`)
  if ((frontier.droppedAsGated || []).length) log(`gated (needs:user): ${frontier.droppedAsGated.join(', ')}`)

  const waveResults = await pipeline(
    frontier.beads,
    b => pickRunner(b.surface) === 'sol'
      ? agent(solImplPrompt(b), {
          label: `impl-sol:${b.id}`,
          phase: 'Implement',
          schema: IMPL_SCHEMA,
          model: 'haiku',
          effort: 'low',
          isolation: 'worktree',
        })
      : agent(implPrompt(b, pickPersona(b.surface)), {
          label: `impl:${b.id}`,
          phase: 'Implement',
          schema: IMPL_SCHEMA,
          agentType: pickPersona(b.surface),
          isolation: 'worktree',
        }),
    (r, b) => {
      if (!r || r.skipped || !r.prUrl) return { bead: b.id, merged: false, concerns: [r ? r.reason || 'skipped' : 'agent died'] }
      implemented.push({ bead: r.bead, prUrl: r.prUrl, followUps: r.followUpBeads || [] })
      return agent(verifyPrompt(r), { label: `verify:${b.id}`, phase: 'Verify', schema: VERDICT_SCHEMA })
    },
  )

  for (const v of waveResults.filter(Boolean)) {
    if (v.merged) merged.push(v.bead)
    else if (implemented.some(i => i.bead === v.bead)) held.push({ bead: v.bead, concerns: v.concerns || [] })
    else skipped.push({ bead: v.bead, reason: (v.concerns || []).join('; ') })
  }
  log(`wave ${wave} done: ${merged.length} merged total, ${held.length} held, ${skipped.length} skipped`)
}

return { waves: wave, implemented, merged, held, skipped }
