# Showcase patterns from the volunteering suite

Reusable patterns extracted from `~/Documents/GitHub/jeswr/volunteering-with-fable` (finished 6-app Solid demo suite, deployed live as `svs-*` Vercel projects). Patterns only — its app implementations are not to be copied.

## 1. What made it work as a stakeholder pitch: the Ecosystem Tour

A dedicated sixth app (`apps/demo`) is the front door. It has **no Solid login of its own — it "explains, deep-links and hands over"** (`apps/demo/README.md`). Components:

| Element | Pattern | Where |
|---|---|---|
| Landing `/` | One-screen narrative hero (two-sided value headline: "Volunteers own their data. Services compete to serve them."), primary CTA = start tour, secondary = "Open any app", interactive ecosystem map (hover/focus explains, click launches), chapter-index grid, "honesty strip" footer disclaimer | `apps/demo/src/app/page.tsx` |
| Guided tour `/tour` | 8 chapters, linear stepper, fully keyboard-navigable, `?chapter=N` deep links each chapter | `apps/demo/src/app/tour/page.tsx`, `components/tour.tsx` |
| Chapter format | Pure data: `slug / title / lead / body[] / underneath[] / live`. Every chapter has a plain-English **"What just happened underneath"** disclosure (coordination-layer-visible principle) and **exactly one "Try this live"** deep link into the right route of the right app | `apps/demo/src/lib/chapters.ts` |
| Editorial constraints machine-enforced | Unit tests assert: each chapter ≤ 170 words (reads in under a minute), has an "underneath" section, has exactly one live destination | `chapters.test.ts` |
| Try-this-live | `{service, path, label}` → button; when the target app isn't deployed, the button stays **visible but disabled** (aria-disabled, focusable) with an explanation — "the story remains honest about what's wired in this environment" | `components/try-live.tsx` |
| Launcher dock | Persistent on every page: fixed right rail ≥ 1280 px, floating "Apps" button + bottom sheet below. Lists all apps + the pod server with live status dots (client-side HEAD probes, periodic refresh): **Live / Starting… / Not deployed** | `components/launcher.tsx`, `use-service-status.ts`, `lib/probe.ts` |
| Single service registry | One `SERVICES` array (id, name, audience, description, envVar) drives the map, the launcher and try-live buttons "so names and one-liners never drift" | `lib/services.ts` |
| Demo identity card | Copy-ready seeded login (email / password / WebID, copy buttons) so a stakeholder can log into every app in seconds; all-three-or-none env parsing; degrades to "create a pod" guidance. Separate staff-login card for the provider-side chapter | `components/demo-identity-card.tsx`, `lib/env.ts` |
| Everything optional | All env optional by design: a missing app URL → "not deployed" row + disabled try-live; partial deployments still demo well | `lib/env.ts` |

**Demo seeding:** the local-stack global-setup provisions the demo volunteer **before** building the demo app (because `NEXT_PUBLIC_*` is inlined at build time) and shares the account with the e2e specs via a state file (`decisions/2026-06-10-demo-volunteer-in-global-setup.md`, `e2e/global-setup.ts`). The provider portal's DB seed creates the demo opportunities + staff accounts, so the scripted journey (chapters map 1:1 onto SPEC §6 flows) works on first load.

**Honesty as pitch material:** the mocked part (DBS) is framed as the policy message — chapter 4 says outright "the check itself is simulated and clearly watermarked. That gap is part of the message." For the mortgage suite, any simulated leg (e.g. credit pull, AUS decision) should be narrated the same way, and the ZKP chapters should use the same "what just happened underneath" device to explain proofs without revealing (which also aligns with the don't-prove-revealed-properties rule).

**Carry over wholesale:** dedicated tour app + chapters-as-data + editorial tests + single service registry + launcher dock + demo identity card + honest degradation. Rewrite content and visuals only.

## 2. Deploy model

One repo → N Vercel projects (six), each with **Root Directory** set to its `apps/<dir>`; everything else pinned by a per-app `vercel.json` (`docs/deploy.md`):

```json
{ "framework": "nextjs",
  "buildCommand": "next build --webpack",
  "ignoreCommand": "npx turbo-ignore --fallback=HEAD^1" }
```

- `turbo-ignore` walks the Turborepo graph: a push rebuilds only the apps whose dependency subtree changed. Keep this with pnpm.
- Workspace packages export TypeScript source directly → no package pre-build step; Vercel's default root-workspace install hoists them ("Include source files outside Root Directory" left on).
- **Env matrix** (`docs/deploy.md`): cross-link `NEXT_PUBLIC_<APP>_URL` vars per app, CORS origins on the API-serving app, `PUBLIC_BASE_URL` for webhooks, `did:web` matching each deployment domain, signing keys env-only via `scripts/generate-keys.mjs`. The docs describe a two-pass first deploy (deploy → learn URLs → fill cross-links → redeploy); in practice the deploy used **deterministic project names/aliases (`svs-*.vercel.app`) chosen up-front**, so the whole matrix was set before the first deploy — one pass. Do that: pick `solid-mortgage-*` (or an EDMA slug) aliases first and write the matrix into `docs/deploy.md` before deploying.
- Tour app deploys last (it is all cross-links). Its `NEXT_PUBLIC_DEMO_*` login is public by design — only ever a throwaway demo pod.

**The sanitized-mirror trick and whether solid-mortgage needs it.** The volunteering suite was NOT deployed from the raw repo: `vercel deploy` (CLI) uploads the working tree, and uploading ODI-internal `docs/research/` material from the agent session was blocked by the output classifier. Fix: `git archive HEAD | tar -x -C /tmp/svs-mirror` plus a `.vercelignore` excluding `docs/`, and deploy from the mirror (memory: project-volunteering-suite-deploy). That was a **content-sensitivity workaround, not a Vercel requirement**. For solid-mortgage:

- Preferred: **Vercel Git integration** (house style: auto-deploy on push). Builds clone from GitHub server-side; nothing is uploaded from the local machine, so no mirror is ever needed. Requirement: the Vercel GitHub app must be granted access to the private repo — request it at repo setup (the EDMA microsite is stuck on CLI-only deploys precisely because this grant is missing).
- If CLI-deploying before that grant lands: solid-mortgage's `docs/research/` is Claude-authored from public sources (no third-party-confidential content), so **direct CLI deploy of the raw repo is fine — no mirror needed**. Still add a root `.vercelignore` excluding `docs/` as hygiene (smaller uploads, and it future-proofs against sensitive docs arriving later, e.g. EDMA-member material in the product phase).

## 3. Branding: fictional vs real, and the real-org recommendation

How the volunteering suite drew the line:

| Brand | Real/fictional | Why | Disclaimer mechanics |
|---|---|---|---|
| Aldergate VMS (provider portal) | Fictional | Board decision: no preference among competing VMS providers | Persistent "Demo organisation" `Badge` in the app chrome (`apps/vms-portal/src/components/chrome.tsx`); landing copy "Aldergate VMS is a fictional demo organisation… **simulated** DBS check"; admin dashboard banner; layout `<meta>` description says "(demo organisation)"; finder repeats it at the hand-off (`emergency-page.tsx`) |
| Yoti, OneID, GOV.UK Wallet | Real names | The **real services are actually integrated** (sandbox/prod) — the name refers to the true source of the verification (nominative use); no logos/trade dress copied | Issuer routes name them factually as adapter options; unavailable ones ship dark with an explanatory panel |
| "Volunteer Opportunities Finder — powered by the National Data Library" | Neutral/public-infrastructure byline | Consumer app must not favour any provider | — |
| Mock DBS API | — | No real API exists | Every API response carries `"simulated": true` (machine-level watermark), OpenAPI doc says "simulated service" |
| Tour landing | — | — | "Honesty strip" footer: fictional org + simulated checks + why the gap is the message |

No `noindex`, no `robots.txt`, no password gate anywhere (grep-verified) — everything is public, which was acceptable because the only org brand was fictional.

**Recommendation for the mortgage suite (apps branded to real orgs — Fannie Mae / Truist / Equifax etc. — as a partnership pitch).** This is a step beyond Aldergate: the apps would *function as if they were the org's*. The honest pattern, layered:

1. **Nominative posture.** Use the org name to identify its real role in the mortgage process; use no logos, trade dress or lookalike domains. Nominative fair use requires (INTA): use only as much of the mark as necessary, and **no suggestion of sponsorship or endorsement** — which makes the disclaimer non-optional. Safer variant that keeps the pitch value: brand the **role** first and the org as an instance — "Lender portal — modelled on Truist", "GSE underwriting — the Fannie Mae role" — rather than presenting the app *as* Truist.
2. **Persistent banner, unremovable by construction.** A `ConceptDemoBanner` in the shared ui package rendered by the shared AppShell (the Aldergate badge pattern, hardened): "Concept demonstration for the EDMA Solid Community of Practice. Not affiliated with, or endorsed by, {org}. Data is simulated." Repeat in the footer and each app's `<meta>` description; assert its presence in a shared e2e check so no app can ship without it.
3. **Machine-level watermarks.** Any API response that mimics a real org's output (credit report, AUS findings, VOE) carries `"simulated": true` — the mock-DBS pattern.
4. **noindex + robots.** Vercel auto-sets `X-Robots-Tag: noindex` on *preview* deployments only; production domains are indexable (and the header is NOT set on custom domains assigned to non-production branches). So set `X-Robots-Tag: noindex` explicitly on production for every branded app (vercel.json `headers` or Next metadata `robots`), plus `robots.txt` disallow. Cheap, removes the "Googled Truist, found a fake Truist" failure mode.
5. **Access gating — proportionate options.** Vercel Password Protection on production needs Enterprise or the Pro **Advanced Deployment Protection add-on ($150/month)**; Vercel Authentication is free on all plans but only protects previews on Hobby and demands Vercel accounts — wrong audience for EDMA members. Default recommendation: **consent interstitial + noindex**, no platform password gate — a lightweight shared interstitial ("concept demonstration… brands illustrate roles, no endorsement implied → Continue", cookie-persisted), optionally with a shared access code in middleware if EDMA wants the links semi-private. Escalate to the paid password gate only if a named org asks or before circulation beyond the CoP.
6. **Exit path.** Because this pitches a real product phase, plan for per-org sign-off: the moment an EDMA member org engages, swap "modelled on X" for their sanctioned branding; until then the disclaimers stay.

## 4. Test architecture: keep vs adapt vs drop

**Keep (pattern-portable):**

| Pattern | Detail | Where |
|---|---|---|
| Editorial unit tests on tour content | word-count / structure / one-live-link assertions | `apps/demo/src/lib/chapters.test.ts` |
| axe gate as a helper, per page *and per state* | inject axe-core, assert zero WCAG 2.x A/AA violations; run in light + dark and at 375 px | `apps/chat/e2e/helpers.ts` (`expectAxeClean`), `apps/demo/e2e/*` |
| `lint:iris` | HEAD-check (GET fallback) every http(s) IRI in RDF data, 7-day on-disk cache, skips localhost/example/`did:`/`urn:`; CI-fails on unreachable IRIs. Copy nearly verbatim | `scripts/lint-iris.mjs` |
| Cross-app integration e2e | ONE global-setup boots the pod server, external-API mocks and ALL apps as production builds on **random free ports**, cross-wires env, writes a state JSON for workers; one browser context walks real navigations across app origins and asserts pod state node-side; `workers: 1` for shared-state journeys | `e2e/global-setup.ts`, `e2e/playwright.config.ts` |
| Deterministic demo/e2e outcomes | mock outcomes keyed on seeded identities; fresh account per write test; keys generated in setup | `e2e/support/accounts.ts`, BUILD-PLAN §E2E |
| Launcher-state e2e trick | boot tiny 204-stub servers (Live), an allocated-but-dead port (Starting…), and leave one app unconfigured (Not deployed) — all three launcher states deterministic | `apps/demo/e2e/global-setup.ts` |
| No `webServer` block | global-setup owns the whole lifecycle because app env depends on ports known only at setup time | per-app `playwright.config.ts` |

**Adapt:** the per-app in-memory CSS harness (`startTestCss()` in `packages/solid-kit/testing`: random port, seeded accounts/pods, custom CSS config + Handlebars template for `pim:storage`, returns `{baseUrl, accounts, stop()}`). The mortgage suite runs the **sparq WASM Solid server (@jeswr/solid-server)** instead — keep the harness *interface* exactly (`{baseUrl, accounts, stop()}` + `provisionAccount` + client-credentials minting) so specs stay portable, and re-implement provisioning against sparq's account surface. Budget for gaps (task #5 upstreaming): CSS-specific bits that won't transfer are the Handlebars seeding templates and the CSS `.oidc/token` client-credentials flow.

**Drop / redesign:**

- Building all six apps as production builds inside e2e global-setup, forced by `NEXT_PUBLIC_*` build-time inlining. Cost: bounded concurrency 2 ("5 parallel Next builds OOM CI"), 240 s test timeouts, slow local loop. Mitigate with a runtime config endpoint (fetch a JSON of app URLs at runtime instead of inlining), or per-journey app subsets, or accept and offload to CI.
- The CJS/ESM `createRequire` hack for loading the issuer's mock server (`e2e/global-setup.ts` lines 42–58) — make every workspace ESM from day one.

## 5. Anti-patterns / dated choices to avoid

| Old suite | New suite | Why |
|---|---|---|
| npm workspaces (`packageManager: npm@11`) | pnpm | current house style; faster installs, stricter hoisting |
| Custom UI kit: ~27 hand-written shadcn-*style* primitives, each with its own test file (`packages/ui/src/components/button.tsx` + `button.test.tsx` …) | shadcn/ui generated components; author + test only suite-specific composites (ConsentPanel/CoordinationBanner/CredentialCard equivalents) | reimplementing commodity primitives was the single largest avoidable authorship+maintenance cost |
| `next build --webpack` flag scattered across vercel.json, scripts and e2e | decide the bundler once (default Turbopack on current Next) and don't scatter opt-outs | four places had to agree on the flag |
| Cross-link URLs as build-time `NEXT_PUBLIC_*` | consider runtime config for cross-links | build-time inlining caused the two-pass-deploy problem and the rebuild-everything e2e setup |
| Vercel project names decided at deploy time | choose deterministic project aliases before first deploy; record the env matrix in `docs/deploy.md` up-front | enabled the one-pass deploy of the old suite once discovered |
| CLI mirror deploy + `/tmp` key files + Python deploy driver | Vercel Git integration from day one (grant the GitHub app repo access at creation) | the entire mirror/driver apparatus was debt from missing the Git integration |
| Turbo + turbo-ignore | **keep** (with pnpm) | per-app build-skipping on push is exactly right for N-projects-one-repo |
| Local main ahead of origin (undeployed commits, deploy mirror went stale) | push frequently; deploys track `main` | the 2026-06-11 redeploy shipped from a stale mirror snapshot first |

Also worth keeping from the old repo's process (not code): decisions logged per-file in `decisions/`, a living SPEC with a decision-log table, research digests kept "public-safe" by construction (`docs/research/project-context.md` header) — the latter is what would have made the mirror trick unnecessary.

## Sources

- Volunteering suite (local): `~/Documents/GitHub/jeswr/volunteering-with-fable` — `SPEC.md`, `docs/BUILD-PLAN.md`, `docs/deploy.md`, `apps/demo/README.md`, `apps/demo/src/lib/{chapters,services,env}.ts`, `apps/demo/src/components/{launcher,try-live,demo-identity-card}.tsx`, `apps/demo/e2e/global-setup.ts`, `e2e/global-setup.ts`, `e2e/playwright.config.ts`, `apps/chat/e2e/helpers.ts`, `apps/vms-portal/src/components/chrome.tsx`, `scripts/lint-iris.mjs`
- Live deployment record: memory note `project_volunteering_suite_deploy.md` (svs-* projects, mirror deploy, classifier block)
- Vercel Deployment Protection (methods, plans, $150/mo Pro add-on for production Password Protection): https://vercel.com/docs/deployment-protection
- Vercel preview deployments auto-`X-Robots-Tag: noindex` (production/custom-domain exception): https://vercel.com/kb/guide/are-vercel-preview-deployment-indexed-by-search-engines
- Nominative fair use (three-factor test incl. no suggestion of sponsorship/endorsement), INTA: https://www.inta.org/fact-sheets/fair-use-of-trademarks-intended-for-a-non-legal-audience/
