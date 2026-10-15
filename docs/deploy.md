# Deploying the showcase to Vercel (sm-37)

> **Hosted guided tour (current).** The full tour (auto-login, pod activity log, guided
> steps) runs as ONE server process — `pnpm demo` in hosted mode — and every public
> `*.vercel.app` link is a thin Vercel proxy project in front of it, so each app keeps its
> own origin. See "Hosted guided tour" at the end of this file. The per-app Next.js
> deployments described below are the earlier, standalone (Mode-1) setup.

One Vercel project per app, all from this single monorepo, in the personal scope
**jeswr / "Jesse Wright's projects"**. Project names are **neutral** (R2/R4: no org marks —
`lender-a`, not the branded org) so no public hostname carries an insignia.

## Project matrix

| app dir | package | Vercel project | production URL |
|---|---|---|---|
| `apps/tour` | `@mortgage/app-tour` | `solid-mortgage` (the shell) | https://solid-mortgage.vercel.app |
| `apps/wallet` | `@mortgage/app-wallet` | `solid-mortgage-wallet` | https://solid-mortgage-wallet.vercel.app |
| `apps/verifications` | `@mortgage/app-verifications` | `solid-mortgage-verifications` | https://solid-mortgage-verifications.vercel.app |
| `apps/lender-boa` | `@mortgage/app-lender-boa` | `solid-mortgage-lender-a` | https://solid-mortgage-lender-a.vercel.app |
| `apps/lender-53` | `@mortgage/app-lender-53` | `solid-mortgage-lender-b` | https://solid-mortgage-lender-b.vercel.app |
| `apps/gse` | `@mortgage/app-gse` | `solid-mortgage-underwriting` | https://solid-mortgage-underwriting.vercel.app |
| `apps/property` | `@mortgage/app-property` | `solid-mortgage-property` | https://solid-mortgage-property.vercel.app |
| `apps/closing` | `@mortgage/app-closing` | `solid-mortgage-closing` | https://solid-mortgage-closing.vercel.app |
| `apps/vocab` | `@mortgage/vocab` | `solid-mortgage-vocab` | https://solid-mortgage-vocab.vercel.app |

## Per-project configuration

Set via `PATCH https://api.vercel.com/v9/projects/<name>` (or the dashboard):

- `rootDirectory` = `apps/<app>` — **required**; without it the build fails with
  `NEXT_NO_VERSION` (the repo-root `package.json` has no `next`).
- `framework` = `nextjs`.
- `installCommand` = `pnpm install --frozen-lockfile` (lockfile discipline; pnpm resolves the
  workspace root upward from the root directory).
- `buildCommand` / `outputDirectory` = **null** (cleared). The per-app `vercel.json` sets the
  turbo build (`pnpm --dir ../.. exec turbo run build --filter=<package>`); a project-level
  override silently wins over `vercel.json` and is the #1 historical failure cause here.
- `ignoreCommand` comes from `vercel.json` too: `npx turbo-ignore --fallback=HEAD^1`, so a git
  push rebuilds only affected apps. (It applies to git-triggered builds only.)

Every app dir carries its own `vercel.json` — `apps/vocab/vercel.json` was the last one added.
The root `turbo.json` build task declares `"env": ["MORTGAGE_*"]`: turbo ≥2 runs in **strict
env mode**, and without the allowlist the tour shell's rewrites would silently bake in the
`*.invalid` fallbacks at build time.

## Deploy method — CLI, from a git WORKTREE (not a plain checkout)

Git-triggered deploys are **BLOCKED** on this account with seat block
`COMMIT_AUTHOR_REQUIRED` (Hobby-plan commit-author attribution). Deploy with the CLI instead —
full-repo upload; the server builds using `rootDirectory`. Single-app deploys from inside an
app dir fail (no workspace context).

**Gotcha (this is why `closing` blocked for ~6 deploys):** the Vercel CLI also attaches the
git **HEAD commit author** it detects in the working directory. Deploying from a normal git
checkout attaches the local author (e.g. `ubuntu@…ec2-internal`), which is not associated with
the Vercel account → the deployment is `BLOCKED` with `COMMIT_AUTHOR_REQUIRED`, instantly and
with no build logs. Deploy from a **git worktree** instead — there `.git` is a pointer *file*,
so the CLI detects no commit author (`meta.githubCommitAuthorEmail: null`) and the build runs.
(Equivalently: strip git metadata / deploy from a non-git copy.)

```sh
# from a git WORKTREE root (git worktree add …), NOT the primary checkout.
# .vercel/project.json holds {projectId, orgId}; token via env or --token.
npx vercel@latest deploy --prod --yes --token "$VERCEL_TOKEN"
# verify the deployment's meta.githubCommitAuthorEmail is null; if it's your
# checkout's author, it will BLOCK — redeploy from a worktree.
```

Order matters (chicken-and-egg): deploy the 8 zone projects first, collect their production
URLs, set those URLs as env vars on the `solid-mortgage` (tour) project, then deploy the tour
shell last so its rewrites resolve.

## Environment-variable matrix

### Zone URLs — on the `solid-mortgage` (tour) project only

The tour shell proxies each zone via `next.config.ts` rewrites; the env names below are the
source of truth in `apps/tour/next.config.ts` and `e2e/apps.spec.ts` (`zoneEnv`). Values are
the zone production URLs (no trailing slash). Targets: production + preview.

| env var | zone app | value |
|---|---|---|
| `MORTGAGE_WALLET_ZONE_URL` | wallet | https://solid-mortgage-wallet.vercel.app |
| `MORTGAGE_VERIFICATIONS_ZONE_URL` | verifications | https://solid-mortgage-verifications.vercel.app |
| `MORTGAGE_PRIMARY_LENDER_ZONE_URL` | lender-boa | https://solid-mortgage-lender-a.vercel.app |
| `MORTGAGE_COMPARISON_LENDER_ZONE_URL` | lender-53 | https://solid-mortgage-lender-b.vercel.app |
| `MORTGAGE_UNDERWRITING_ZONE_URL` | gse | https://solid-mortgage-underwriting.vercel.app |
| `MORTGAGE_PROPERTY_ZONE_URL` | property | https://solid-mortgage-property.vercel.app |
| `MORTGAGE_CLOSING_ZONE_URL` | closing | https://solid-mortgage-closing.vercel.app |

`apps/vocab` is not a tour zone (no rewrite, no zone env var). No zone app needs a sibling
zone's URL — only the shell holds the matrix.

The zone URLs are read **at build time** (rewrites), so changing one requires a tour redeploy.

### `MORTGAGE_TRUST_FORWARDED_HEADERS=1` — on every pod-route project

Set (production + preview) on all 7 apps whose API routes run the authenticated DPoP rail:
**closing, lender-a (lender-boa), lender-b (lender-53), underwriting (gse), verifications,
property, wallet**. Without it, DPoP `htu` computed from the internal host mismatches the
public URL and every authenticated call 401s (proven in the sm-33 e2e).

The shared config (`apps/lender-boa/lib/server/config.ts`) also honours Vercel's built-in
`VERCEL=1`, so this is belt-and-braces on Vercel — but it is load-bearing on any other
proxied host, so it stays in the matrix. `tour` and `vocab` have no pod routes and don't
need it.

### Service identities (not set yet)

Pod-route apps fail **closed** (503 on their pod routes) until their service identity env
(`MORTGAGE_*_SERVICE_WEBID` etc., see each app's `lib/server/config.ts`) is configured
against a live pod host. That wiring is a separate bead — the deploys above are healthy
with the rails unconfigured.

## Deployment protection — CORRECTED posture (verified live 2026-07-17)

**Vercel Authentication (SSO) protection stays ON for all 9 projects**
(`deploymentType: all_except_custom_domains`) — but on the current **Hobby plan that mode
does NOT cover the production domain**. Verified against the live deployments:

- **Gated (302 → `vercel.com/sso-api`)**: every deployment URL and the team-scoped
  production aliases (`<project>-jesse-wrights-projects-776f60ef.vercel.app`).
- **PUBLIC (anonymous 200)**: the auto-assigned production domains
  `<project>.vercel.app` — i.e. every URL in the tables above. Vercel Authentication for
  production deployments requires a paid plan; the API rejects
  `deploymentType: "all"` with `invalid_sso_protection` on this account.

So while legal review (sm-5q2) and Freddie consent (sm-6sw) stay open, the production
surfaces are protected only by `noindex` robots metadata, `robots.txt Disallow`, the
"concept demonstration" disclaimers, and obscurity — **not** by an auth wall.
**DECISION (Jesse, 2026-07-17): accept the public exposure for now.** The lead reviewed the
verified posture above and chose to keep the production surfaces public, relying on the
`noindex` + `robots.txt Disallow` + concept-demonstration disclaimers already in place (all
confirmed live on every branded surface). This is a deliberate choice, not an unresolved gap.
Revisit — and apply one of the two options below — **if the sm-5q2 legal review or sm-6sw
partner consent concludes that an auth wall is required**. Tracked as **sm-1f0**.

Gating options, kept here for when/if that decision changes (either works):

1. Remove the `<project>.vercel.app` production domain from each project
   (`DELETE /v9/projects/<name>/domains/<name>.vercel.app`) so the only reachable
   production URLs are the SSO-gated team-scoped aliases — reversible, one call per
   project when legal clears; or
2. Upgrade the account so Vercel Authentication can cover production
   (`deploymentType: "all"`).

Exception: **`solid-mortgage-vocab` must stay publicly dereferenceable** — it hosts the
`mort` vocabulary namespace (`https://solid-mortgage-vocab.vercel.app/mort`) that
`pnpm run lint:iris` HEAD-checks; the sm-18 `TEMPORARILY_UNDEPLOYED_HOSTS` exemption in
`scripts/lint-iris.mjs` can be lifted now that it is live.

Do **not** disable Vercel Authentication on any project, and treat any domain change as
lead-sign-off territory.

## Verifying a deploy

1. `GET https://api.vercel.com/v13/deployments/<id>` → `readyState: READY`.
2. `curl -sI https://<project>-jesse-wrights-projects-776f60ef.vercel.app/` → expect a
   **302 to `vercel.com/sso-api`** (with a `_vercel_sso_nonce` cookie): the SSO gate on
   deployment URLs/team aliases. The `<project>.vercel.app` production domain answers
   **anonymously** on this plan (see the protection section above) — a 200 there is the
   current expected state, not proof the gate is off.
3. App-level checks: each zone app answers 200 under its basePath (`/<zone-prefix>`),
   `GET /<prefix>/api/health` returns `{"ok":true,...}`, the `noindex` robots meta +
   `robots.txt Disallow` are present, and wallet/lender-a/lender-b send COOP/COEP.
   For checks against a *gated* URL, use a **protection-bypass-for-automation** secret:
   `PATCH /v1/projects/<name>/protection-bypass` with `{"generate":{}}` → send it as
   `x-vercel-protection-bypass: <secret>`, then **revoke it**
   (`{"revoke":{"secret":"<secret>"}}`) when done — don't leave standing bypass
   credentials on demo surfaces.
4. Tour zone wiring: after SSO, `https://<tour-url>/wallet` (etc.) must render the zone app,
   not a 404 — each prefix proxies `MORTGAGE_*_ZONE_URL`.

## Known account states

- `tour` (stray project, `rootDirectory: null`) predates `solid-mortgage` — untouched, do not
  reuse, do not delete without lead sign-off.
- Git-integration deploys stay BLOCKED until the commit-author seat issue is resolved; the
  checked-in `vercel.json` `ignoreCommand` arms itself when that returns. Until then, deploys
  are CLI-only (see above).


## Hosted guided tour

**Server.** Any Ubuntu 24.04 host with ports 4400–4408 reachable from Vercel (public
internet). Provision it with `deploy/hosted/setup-server.sh` (EC2 user-data or `sudo bash`):
it installs Node 25.1.0 and pnpm, clones and builds the repo at `DEMO_REF` (default `main`),
and installs the `solid-mortgage-demo` systemd unit (`deploy/hosted/solid-mortgage-demo.service`).
The unit runs `scripts/demo/start.ts` with `DEMO_BIND_HOST=0.0.0.0`, `DEMO_POD_PORT=4408`,
`DEMO_IDLE_RESET_MINUTES=30`, `DEMO_LLM=off`, and `DEMO_PUBLIC_ORIGINS` from
`/etc/solid-mortgage/demo.env` (seeded from `deploy/hosted/origins.json`). To redeploy:
re-run the setup script (it fetches, rebuilds and restarts).

**Proxies.** `node scripts/demo/vercel-proxies.ts http://<server-host>` writes one directory per
public origin under `.deploy/vercel/<project>/` with a `vercel.json` that rewrites every path
to that app's port. Each project needs `framework`, `rootDirectory`, `buildCommand`,
`installCommand` and `outputDirectory` cleared (they still carry the Next.js settings above),
then deploy from its directory: `vercel deploy --prod --yes` (the directories are not git
repos, so the commit-author block above does not apply). `solid-mortgage-pod` is a new
project: the pod's public origin, which the Data Vault fetches from the browser.

**Behaviour.** All visitors share one demo borrower and pod. Starting the guided tour resets
the data (rate-limited to once per 15 s), and it also resets after 30 minutes without traffic.
The assistants are scripted unless an Anthropic API key is configured on the server
(`ANTHROPIC_API_KEY` and `DEMO_LLM=on` in `/etc/solid-mortgage/demo.env`, plus the Claude Code
CLI installed for the `demo` user) — never a personal Claude login.
