<!-- AUTHORED-BY Claude Opus 5.5 -->

# 0017 — Static rebuild: one site, pods in the visitor's browser, fictional organisations

**Status:** accepted (Jesse-directed rebuild, 2026-11-19). Design of record: the rebuild
`design.md` (§0 summarised here), with `build-plan.md` for the lanes.
**Supersedes:** 0002 (app set and real-organisation branding), 0003 (branded pod host),
0011 (deployed infrastructure), 0013 (sparq hosting revision), 0015 (cross-app auth model).

## Decision

| Topic | Decision |
|---|---|
| Jurisdiction | US purchase mortgage, conventional conforming, fixed rate, one borrower, 20% down (no mortgage insurance party) |
| Server | None. One static site. Pods run in the visitor's browser (sparq's wasm Solid server, `@sparq-org/solid-server@0.1.8`, in a service worker), seeded per visitor |
| Vercel | One project (`solid-mortgage`) for every demo, plus the existing static vocab project. The 8 app projects, 9 proxy projects and the EC2 box are retired |
| Origins | One registrable domain. Ships path-per-organisation (`/lender/…`) on `solid-mortgage.vercel.app`; the same build serves host-per-organisation when a custom domain is attached |
| Organisations | All fictional: 12 organisations, 13 apps, each its own workspace package with its own design language. Real organisation names are banned from rendered output (`check:insignia`) |
| Access control | Real. Every pod request is evaluated by the pod server against WAC as the calling organisation's WebID. Sign-in is simulated and says so |
| Visualiser | "Solid Lens": a dock on every app page fed only by requests the pod actually answered |
| Guided path | 24 steps in 7 chapters, about 12 minutes; every step is a real action in a real app |
| Engine | New domain-generic packages (`pod-runtime`, `tour`, `lens`) built here, upstreamed to `jeswr/solid-sdk` once two demos run on them |
| Kept | `data-model` (extended), `vc-kit` (issue, verify, status, re-issue, live threshold proof), `vocab/mort.ttl`, the lint scripts (now in `tools/`), research docs |
| Deleted | All Next.js apps (moved to `legacy/` by lane L0, removed on 19 Nov 2026 once the static site was live and the old per-app Vercel projects redirected to it; their code is in the git history before the removal commit), `scripts/demo/*`, `deploy/hosted`, the dev OIDC issuer and DPoP service identities, the vendored solid-server tarball and its patch |

Stack: TypeScript, React 19, Vite (one build per app, `base: "/<slug>/"`), pnpm workspaces,
Turbo, Biome, Vitest, Playwright. No Next.js: no server routes remain.

## What each superseded decision loses

- **0002** chose eight apps branded to real organisations. Now: thirteen apps for twelve
  fictional organisations (`content/orgs.ts`), and real names are on the insignia roster.
- **0003** chose a branded third-party pod host. Now: Alex's pod is provided by the fictional
  Cairn and runs in the browser.
- **0011** and **0013** chose in-browser pods for some flows plus hosted sparq pods and a
  server for live mode. Now: no server at all; every pod is in-browser.
- **0015** defined a DPoP caller boundary between apps. Now: there is no server-side boundary;
  the pod server enforces WAC against the caller WebID the runtime passes it (declared per app
  in path mode, the browser-verified origin in host mode).

Decisions 0004–0010, 0012, 0014 and 0016 stand unless the rebuild design says otherwise
(0016's seed values carry into `content/mortgage/seed.ts`).
