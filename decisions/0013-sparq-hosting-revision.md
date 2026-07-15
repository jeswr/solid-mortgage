# 0013 — Hosting revision: Fastify dev host (upstream) + read-only sparq pods on Vercel

**Status:** accepted (Jesse-directed investigation, 2026-07-15) — amends decision 0011
**Inputs:** docs/research/fastify-host.md, vercel-sparq-hosting.md

## Localhost dev server → framework-mounted, upstream

Jesse's intent: the localhost dev Solid server is the sparq core served through a real web
framework (Fastify), not a bespoke listener. Findings: today's `@jeswr/solid-server` host is
bare `node:http`; **no Fastify/framework-host plan existed anywhere in sparq** (1,258 beads,
research docs, all GitHub issues searched) — so the request is now on record as
**[sparq-org/sparq#2323](https://github.com/sparq-org/sparq/issues/2323)**: a
transport-agnostic `createSolidPod().dispatch()` factored out of `attachTrapRecoveryHandler`,
a first-party Fastify plugin at `@jeswr/solid-server/fastify` (optional peer dep), and
re-exported building blocks (the `exports` map currently blocks any downstream adapter without
tarball patching). The same dispatcher serves the in-browser service-worker pod host — one
primitive, two consumers.

Meanwhile: the sm-4 harness starts on `startSolidServer` (nothing Fastify-specific blocks it);
if Fastify composition is needed before #2323 lands, a ~120-line stopgap plugin goes in
`packages/solid-kit` against the vendored tarball (exports patch), deleted when upstream ships.
Known adapter traps are documented in fastify-host.md §3 (content-type parser removal,
repeated response headers, 2 MiB/413 parity, trap-recycle).

## Hosted demo pods → read-only sparq-wasm on Vercel (Mode 2a), CSS demoted (Mode 2b)

Verified feasible and adopted: **org/stakeholder pods run on sparq-lws-wasm inside one
multiplexed Vercel Node/Fluid function** (`app/pods/[org]/[[...path]]` in the shell app on the
shared demo domain), **hard read-only** per Jesse's requirement — only GET/HEAD/OPTIONS
(+ POST solely for the query-only `/sparql`), everything anonymous over a seeded WAC
public-read ACL so authorization evaluation stays real. Measured: full artifact 2.74 MiB raw /
849 KB gzip, 3–6 ms compile — trivially inside the 250 MB Node bundle limit; module-scope
`SolidServer`s persist on warm Fluid instances; path-prefixed base URLs make org WebIDs
genuinely dereferenceable (no-minted-IRIs rule satisfied). **$0/mo standing** on Hobby.
Rejected: Edge runtime (1 MB gz cap, buffer wasm-compile disallowed, Vercel recommends Node);
ephemeral-writes mode (Fluid instance sharing ⇒ co-tenant-visible vandalism on one warm
instance, absent on another — dishonest to demo).

Mode 1 (per-visitor in-browser writable borrower pod) is unchanged. **Mode 2b:** hosted CSS is
demoted from always-on to deploy-on-demand, needed only for real Solid-OIDC login beats and
facilitated cross-visitor multi-actor sessions.

## Consequences

- sm-38 repurposed to the Mode-2a pods function; Mode-2b CSS kit is a new low-priority bead;
  sm-52 (needs:user hosting/DNS) downgraded — nothing standing to provision.
- Upstream queue additions (sm-5): #2323 implementation; npm bootstrap publish (sm-50)
  remains the vendored-tarball unblock.
- Abuse posture: noindex + Vercel Firewall rate limits; worst case is the Hobby function
  pausing till month-end, never a bill.
