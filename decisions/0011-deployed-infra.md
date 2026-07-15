# 0011 — Deployed demo infrastructure: in-browser pods by default, one hosted server for live mode

**Status:** accepted (autonomous, 2026-07-15) — resolves research-gaps Q1/Q2/M1/M9
**Input:** docs/research/deployed-infra.md

**Mode 1 (default visitor experience, $0):** per-visitor sparq-wasm pods in the browser — the
`@jeswr/solid-server` core built `--target web`, hosted in a SharedWorker/service-worker pod
runtime, persona picker, seeded on load. Login is simulated and the honesty panel says so.
Hard constraint discovered: `vercel.app` is on the Public Suffix List and Chrome 115+ partitions
ALL storage by top-level site, so cross-origin sharing architectures (iframe hub, SW proxy,
pod tab) are impossible — therefore **all eight apps serve under ONE shared domain via Next.js
multi-zones (plain rewrites; NOT Vercel's $250/project Microfrontends product)**, shell = the
tour app.

**Mode 2 (live multi-actor):** one hosted **CSS 7.1.9** instance (pin it; npm latest is
8.0.0-alpha.3) — pod host AND real Solid-OIDC issuer in one process — in-memory with seeded
accounts, nightly restart-reset, registration disabled, rate-limited, noindex + interstitial.
Host on Fly shared-cpu-1x 512MB (~$3.32/mo) or a vhost on the existing EC2/Caddy box
(solid-test.jeswr.org precedent, ~$0 marginal); `solid-mortgage.jeswr.org` DNS is a
`needs:user` nicety, fly.dev domain works meanwhile. Demo copy frames CSS as an **interop
proof** — the primary path runs on sparq.

**Partner-phase migration:** swap storage to sparq-lws-core native + Keycloak 26.4+ (DPoP
official) once three upstream items land: GHCR image publish (sparq bead sq-lmz40), real
S3/object_store BlobStore (today in-memory-only with a boot guard rejecting durable-index +
ephemeral-blob), fixture seeding beyond alice/bob. These join the sm-5 upstream queue. Apps
change only runtime-config base URLs. Note: sparq's `deploy/paas/lws/` configs DO target the
LWS server — they are inert only because the image is unpublished.

Deployed apps use stable Client Identifier Documents (solid-client-id pattern); no silent
iframe re-auth cross-origin — refresh tokens or visible redirects.
