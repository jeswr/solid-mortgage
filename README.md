# solid-mortgage

**Solid Mortgage Showcase** — a multi-stakeholder demonstration of how [Solid](https://solidproject.org/)
eases the US mortgage-application process, built for the EDMA Solid Community of Practice and its
member organisations, with a path to a partner-built product and global expansion.

> INTERNAL / DEMO — every application in this repo is a demonstration branded to illustrate what a
> named organisation *could* build on Solid. Nothing here is affiliated with, endorsed by, or
> operated by those organisations.

Status: research + design phase. `SPEC.md` will define the stakeholder applications, org mapping,
data model (FIBO/MISMO-grounded), and the sparq-backed infrastructure once research lands in
`docs/research/`.

## Layout (planned)

- `docs/research/` — grounding research: US mortgage process, EDMA member/role mapping, vocab,
  ZKP-over-VC feasibility, infrastructure surveys
- `decisions/` — decision log (autonomous calls recorded for review)
- `apps/` — one Next.js app per stakeholder, deployed to Vercel
- `packages/` — shared data-model / solid-kit / vc-kit / ui workspaces

Every commit is reviewed by roborev (`.roborev.toml`: codex / gpt-5.6-sol).
