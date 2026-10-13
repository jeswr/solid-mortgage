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

## Run the demo locally

```bash
pnpm install && pnpm build
pnpm demo
```

Open http://127.0.0.1:4400/ for a guided click-through across every app (each runs on its own
port, and the demo signs you in automatically), an app launcher at `/apps`, two
assistant-led flows, and a pop-out log of every pod read, write and access-rule change. See
[`docs/demo.md`](docs/demo.md).

## Layout (planned)

- `docs/research/` — grounding research: US mortgage process, EDMA member/role mapping, vocab,
  ZKP-over-VC feasibility, infrastructure surveys
- `decisions/` — decision log (autonomous calls recorded for review)
- `apps/` — one Next.js app per stakeholder, deployed to Vercel
- `packages/` — shared data-model / solid-kit / vc-kit / ui workspaces

## Live deployments (Vercel)

One Vercel project per app (scope: jeswr / "Jesse Wright's projects"), project names kept
neutral per the R2/R4 optics rules. Vercel Authentication gates every deployment URL and
team-scoped alias, but on the current plan it **cannot cover the `<project>.vercel.app`
production domains below — they are publicly reachable** (noindex + robots-disallowed +
disclaimered) until a lead-level action closes the gap; see the "Deployment protection"
section of [`docs/deploy.md`](docs/deploy.md) for the verified posture and the two fix
options (legal review sm-5q2 and partner consent sm-6sw remain open). `solid-mortgage-vocab`
intentionally stays public — it hosts the `mort` vocabulary namespace that `lint:iris`
dereferences.

| app | project | production URL |
|---|---|---|
| tour shell | `solid-mortgage` | https://solid-mortgage.vercel.app |
| wallet | `solid-mortgage-wallet` | https://solid-mortgage-wallet.vercel.app |
| verifications | `solid-mortgage-verifications` | https://solid-mortgage-verifications.vercel.app |
| lender-boa | `solid-mortgage-lender-a` | https://solid-mortgage-lender-a.vercel.app |
| lender-53 | `solid-mortgage-lender-b` | https://solid-mortgage-lender-b.vercel.app |
| gse | `solid-mortgage-underwriting` | https://solid-mortgage-underwriting.vercel.app |
| property | `solid-mortgage-property` | https://solid-mortgage-property.vercel.app |
| closing | `solid-mortgage-closing` | https://solid-mortgage-closing.vercel.app |
| vocab | `solid-mortgage-vocab` | https://solid-mortgage-vocab.vercel.app |

## ZK proving — COOP/COEP (apps must wire these headers)

`packages/vc-kit`'s Tier A prover (sm-25) runs sparq's `filter_int` circuits in-browser with
`@noir-lang/noir_js@1.0.0-beta.21` + `@aztec/bb.js@5.0.0-nightly.20260324`. bb.js
multithreading (~4× faster proving) requires cross-origin isolation, so every app that mounts
a proving surface must send both headers on its ZK routes (Next.js `headers()` in
`next.config`):

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Without them proving still works, single-threaded. Verification is unaffected. Call
`prewarmProver()` on route mount so the first proof pays no WASM cold start. Each app wires
its own headers in its app bead.

Every commit is reviewed by roborev (`.roborev.toml`: codex / gpt-5.6-sol).
