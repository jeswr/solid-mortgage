# 0009 — SDK consumption path + the two Jesse-gated unblocks

**Status:** accepted (autonomous, 2026-07-15) — resolves research-gaps Q13 ordering
**Input:** docs/research/sdk-survey.md, lws-survey.md

Consume solid-sdk packages as **`github:jeswr/<pkg>#<sha>` pins** against the standalone/mirror
repos (committed dist, ignore-scripts-safe). Rejected: pnpm git-subdir installs of the monorepo
(no dist), submodules, copying the mirror-publish flow.

Sequencing — nothing blocks the scaffold:
1. **Mirror-publish sweep** (agent-doable bead in solid-sdk): guarded-fetch, solid-auth-core,
   solid-session-restore, rdf-serialize, solid-vc, solid-odrl, app-shell, solid-elements,
   solid-components — so pins are monorepo-current. Until then, pin standalone HEAD shas.
2. **npm bootstrap publish of `@jeswr/solid-server`** (+ Trusted Publisher registration) —
   credential-gated on Jesse (`needs:user` bead). Until then the dev harness vendors a packed
   tarball built from the sparq checkout.
3. The solid-sdk CSS→sparq migration (sm-6) is gated on the npm publish + dev-issuer gap, per
   lws-survey — not on this repo's scaffold.

Harness rule (C9 + sdk-survey): ONE shared harness module in `packages/solid-kit` owns Solid
server boot + account/pod seeding; cross-app e2e uses global-setup-owned lifecycle with random
ports; the CSS→sparq swap must be a single-module change.
