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
6. **Commits**: unsigned, author `63333554+jeswr@users.noreply.github.com`, trailer
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
