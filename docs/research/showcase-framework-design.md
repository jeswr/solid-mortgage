<!-- AUTHORED-BY Claude Fable 5 -->

# showcase-framework-design — the generic walkthrough framework for jeswr/solid-sdk (sm-73)

Design of record for the sm-72 epic: extract the GENERIC components of the solid-mortgage
walkthrough into `jeswr/solid-sdk` so future use-case showcases (car hire, volunteering,
health, …) are cheap to build. Two headline deliverables, per Jesse's brief: (1) the tour
becomes a **generic website rendered from a JSON walkthrough document**; (2) a
**`create-solid-demo` scaffolder** (analogous to `create-solid-app`) bootstraps everything a
new use-case flow needs. Design only — build beads sm-74 (renderer), sm-75 (kit + pod
guard), sm-76 (scaffolder), sm-77 (mortgage migrates as first consumer).

Evidence base (all read, not recalled): `apps/tour/**`, `packages/ui/src/**`,
`apps/lender-boa/lib/server/{owner,pod-rail}.ts`, `packages/solid-kit/src/auth/service.ts`,
`packages/solid-kit/src/browser-pod/**`, `packages/vc-kit/src/seed-tooling/**`, decisions
0002/0005/0011/0012/0013/0015, `docs/research/{showcase-patterns,regn-optics,seeder-design}.md`,
sm-37 deploy learnings, `~/Documents/GitHub/jeswr/create-solid-app/**`, and
`solid-sdk/AGENTS.md` (mirror-publish model).

---

## 1. Generic-vs-specific inventory

Verdicts: **GENERIC** = moves upstream as-is (rename + de-brand only). **CONFIGURABLE** =
moves upstream behind a config seam (the seam is named). **USE-CASE** = stays in the
consumer repo (solid-mortgage), usually as *data* feeding a generic component.

### 1.1 The tour app (`apps/tour`)

| Component | Evidence | Verdict | Seam / what stays behind |
|---|---|---|---|
| Landing composition (hero → anchor stats → ecosystem → chapter grid → identity card) | `app/page.tsx` | GENERIC | All copy becomes `WalkthroughDocument.site` / `.anchors`; section order is an opinionated fixed default |
| Chapters-as-data (`Chapter`/`ChapterStep`/`TryLive` types, word budgets, `underneath`) | `app/content/chapters.ts` | GENERIC | Types → the JSON schema (§2). The five mortgage chapters are USE-CASE data. Budgets (40/65) become schema-level defaults, overridable |
| Editorial-limit enforcement (budgets, ≥2 steps, try-live on every step, `underneath` on VC/ZK scenes, registry-resolved deep links) | `test/chapters.test.ts` | GENERIC | Becomes `editorialFindings(doc)` in the renderer package; the consumer's test is a one-liner. `UNDERNEATH_REQUIRED_SCENES=[1,2,4]` generalises to per-chapter `underneathRequired: true` |
| ChapterPlayer (keyboard stepper + underneath `<details>`) | `app/components/chapter-player.tsx` | GENERIC | none |
| TryLiveButton (visible-but-disabled placeholder link on undeployed zones, aria-disabled, middle-click-safe) | `app/components/try-live.tsx` | GENERIC | none |
| Launcher dock (+ StatusDot) | `app/components/launcher.tsx`, `status-dot.tsx` | GENERIC | Dock order = `registry.launcherOrder` |
| Live-status probes (per-endpoint in-flight guard, 5 s budget, 30 s refresh, honest "not deployed") | `app/components/use-service-status.ts` | GENERIC | none |
| EcosystemMap (centre node + numbered roles, select-to-read, launch-if-app) | `app/components/ecosystem-map.tsx` | GENERIC | Roles/membership/summaries are USE-CASE data (`registry.roles`) |
| Single service registry (apps + roles + zone env names + health paths) | `app/content/services.ts` | GENERIC pattern, USE-CASE data | Becomes `WalkthroughDocument.registry` — the ONE source that drives map, launcher, try-live **and zone rewrites** (today `next.config.ts` duplicates the zone list; the framework derives it) |
| Demo identity card | `app/components/demo-identity-card.tsx`, `app/content/persona.ts` | GENERIC card, USE-CASE values | `persona.fields` is a generic label/value/copyable list; ZK-threshold pinning is a mortgage concern kept in mortgage fixtures |
| Examiner View (unbranded compliance checklist over public rules) | `app/content/examiner.ts`, `app/examiner/page.tsx` | GENERIC as "compliance lens" | `ComplianceCheck {rule, citation, citationUrl, observe, chapterSlug}` is domain-neutral; the TRID/RESPA checks are USE-CASE data |
| Quantified anchors with cited sources | `app/content/anchors.ts` | GENERIC shape, USE-CASE data | `Anchor {value, label, detail, source}` |
| Multi-zones shell rewrites | `apps/tour/next.config.ts` | CONFIGURABLE | `zoneRewrites(document)` factory; env-var names stay explicit per app in the registry |
| Health route (`{ok:true}` JSON) | `app/api/health/route.ts` | GENERIC | `healthRoute()` factory |
| `site.ts`, robots noindex, `demoMetadata` wiring | `app/site.ts`, `app/layout.tsx` | USE-CASE data over GENERIC helpers | |

### 1.2 The trust/branding pack (`packages/ui`)

| Component | Evidence | Verdict | Seam |
|---|---|---|---|
| Disclaimer copy pack (R1/R5/R6/R8 exact wording; banner, footer, interstitial paragraphs, metadata) | `src/disclaimers.ts` | CONFIGURABLE | Hardcodes `EDMA_NAME` and finance negations ("Not an offer of credit"). Seam: `createDisclaimerPack(branding)` closing over `{convener, domainNegations, description}`. Safety copy ("All data simulated", "Do not enter real personal information") is **non-removable by construction** — not configurable, only extendable |
| `DisclaimerVariant` "modelled"/"own" split | `src/disclaimers.ts` | GENERIC | none — the convener-vs-modelled distinction is domain-neutral |
| ConceptDemoBanner (R1, unremovable, adjacent to header) | `src/concept-demo-banner.tsx` | CONFIGURABLE | copy from the pack factory |
| AppShell (theme spread + banner + footer legal line + skip link) | `src/app-shell.tsx` | GENERIC | consumes pack + theme |
| HonestyPanel (real/simulated `<details>`) | `src/honesty-panel.tsx` | GENERIC | none; per-app content is USE-CASE data (`registry.apps[].honesty`) |
| IllustrativeFigure (R5 tag travels into screenshots) | `src/illustrative-figure.tsx` | CONFIGURABLE | tag text default `"illustrative figure, not an offer"`, overridable per branding config |
| DemoLockedField (R7; mandatory do-not-enter hint) | `src/demo-locked-field.tsx` | GENERIC | hint fixed by design |
| ConsentInterstitial (R8, cookie-persisted) | `src/consent-interstitial.tsx` | CONFIGURABLE | cookie prefix `sm-demo-consent-` → `branding.consentCookiePrefix` (default derived from use-case slug); paragraphs from the pack factory |
| CredentialCard / ReceiptCard / StatCard | `src/credential-card.tsx` etc. | GENERIC | none |
| Per-org theme factory (`paletteTokens(hue, primary, accent)` → oklch token set) | `src/themes.ts` | GENERIC factory, USE-CASE data | `orgThemes` (the 12 mortgage palettes) stays in mortgage; themes become registry data (`ThemeSpec`) |
| Insignia bright-line lint (R2: FDIC/EHL/NMLS/agency seals) | `scripts/check-insignia.mjs` | CONFIGURABLE | Generic scanner core + banned-marks **presets**; the current list ships as the `us-finance` preset. R3-style product-mark bans are per-walkthrough additions |

### 1.3 The decision-0015 auth boundary

| Component | Evidence | Verdict | Seam |
|---|---|---|---|
| `resolveAuthorizedPod` (bidirectional `pim:storage` binding: forward claim → allowlist → backward acknowledgment, fail-closed) | `apps/lender-boa/lib/server/owner.ts` | GENERIC | `LenderConfig` → `PodGuardConfig {allowedPodOrigins, allowInsecureLoopback}`; env name `MORTGAGE_POD_ALLOWED_ORIGINS` → `${envPrefix}_POD_ALLOWED_ORIGINS`. The stated trust assumption (owner-only-writable profile card) moves into the package SKILL.md verbatim |
| Pod-rail pipeline (authenticate ⇒ 401 → reject `pod`/`webid` overrides ⇒ 400 → validate body → bind pod → handler; lazy cached verifier; rate limiter; `simulated:true` watermark) | `apps/lender-boa/lib/server/pod-rail.ts` | GENERIC | `createPodRouteGuard(options)` — the scene handlers (`prefill`, `submit`, `freshness`) stay in lender-boa as injected handlers. Watermark key `simulated: true` is a fixed default |
| `createServicePodFetch` (client-credentials DPoP service identity, redirect-refusing, token cache + per-request proof) | `packages/solid-kit/src/auth/service.ts` | GENERIC | already config-parameterised; moves verbatim |
| `verifyApiRequest` / `createApiVerifier` wrappers | `packages/solid-kit/src/auth/api.ts` | GENERIC | thin wrapper over the already-upstream `@jeswr/solid-api-auth`; the guard package re-exports rather than duplicating |
| Loan/prefill/freshness/statements scene logic | `apps/lender-boa/lib/server/{loan,prefill,freshness,statements}.ts` | USE-CASE | consume the guard |

### 1.4 Runtime, seeding, protocol

| Component | Evidence | Verdict | Seam |
|---|---|---|---|
| Mode-1 in-browser pod runtime (SharedWorker host, postMessage protocol, simulated-login disclosure) | `packages/solid-kit/src/browser-pod/**` (decision 0011) | GENERIC | Own extraction: `@jeswr/solid-browser-pod` — **follow-up bead, not on the sm-74/75 critical path** (couples to the vendored sparq wasm tarball + patch) |
| Shape-driven synthetic data + pod provisioning | `@jeswr/synthetic-rdf`, `@jeswr/solid-seed` (seeder-design §2, sm-63/64) | GENERIC — **already upstream** | The framework does not re-own them; `create-solid-demo` wires them |
| Dev-server harness + fixture seeding | `packages/solid-kit/src/{harness,seed}.ts` | GENERIC-ish | Superseded by `@jeswr/solid-seed` per seeder-design §4; not re-extracted here |
| VC seed tooling (dual-sign, operand anchors, Tier B manifest capture) | `packages/vc-kit/src/seed-tooling/**` | USE-CASE (for this framework) | sparq-ZK-specific; its generic future is a vc-kit/upstream-sparq concern, out of showcase scope. The framework only standardises the honesty *labelling* ("proved offline · verified live", decision 0012) as document data |
| VP-POST presentation rail (decision 0012) | `apps/lender-*` + vc-kit | USE-CASE | protocol pattern documented in the scaffolder's generated docs, not extracted as code |
| ZK honesty posture (decision 0005: research-grade caveats, digit budgets, enumeration caveat) | honesty-panel content, `underneath` copy | USE-CASE data over GENERIC honesty surfaces | |

### 1.5 Deploy model (decisions 0011/0013, sm-37 learnings)

| Component | Evidence | Verdict | Seam |
|---|---|---|---|
| One shared domain, N zone apps via shell rewrites (PSL/storage-partitioning constraint) | decision 0011; `apps/tour/next.config.ts` | GENERIC | `zoneRewrites(document)` + scaffolded per-app `vercel.json` |
| Per-app Vercel project: `rootDirectory=apps/<x>`, cleared build/output overrides, turbo-ignore | sm-37 notes; `apps/*/vercel.json` | GENERIC | scaffolder emits these + `docs/deploy.md` with the sm-37 gotchas (partial Git-integration auto-projects fail without rootDirectory; single-app CLI deploy from app dir fails) |
| `MORTGAGE_TRUST_FORWARDED_HEADERS=1` on every pod-route app (DPoP htu behind proxy) | sm-37 notes | CONFIGURABLE | `${envPrefix}_TRUST_FORWARDED_HEADERS`; scaffolder writes it into the env matrix as REQUIRED for every app with a pod-guard route |
| SSO/preview gating decision + consent-interstitial posture | sm-37 note (3); decision 0002 | GENERIC guidance | generated `docs/deploy.md` section |
| Neutral hostnames (R4: no org marks in slugs) | decision 0002 R4 | GENERIC rule | scaffolder derives slugs from role names, never from `modelledOn` |

---

## 2. The JSON walkthrough schema

One document drives the whole tour site. Opinionated defaults are stated inline; the
TypeScript types are normative, the JSON-Schema is generated from them (zod v4 →
`z.toJSONSchema()`) and shipped as a package artifact.

`$schema` resolution: the artifact is exported at
`@jeswr/solid-showcase/schema/walkthrough.v1.json` (package subpath export). A hosted,
dereferenceable IRI is a follow-up gated on solid-sdk repo visibility — no minted IRI until
it actually resolves (house rule).

### 2.1 TypeScript types (normative)

```ts
/** The whole tour site, as data. Version is a literal — breaking changes bump it. */
export interface WalkthroughDocument {
  version: 1;
  site: SiteIdentity;
  branding: BrandingConfig;
  persona: DemoPersonaCard;
  anchors: QuantifiedAnchor[];        // 0–6; landing stat row
  registry: ServiceRegistry;          // the ONE source for map/launcher/try-live/zones
  chapters: WalkthroughChapter[];     // ≥1, scene numbers contiguous from 1
  editorial?: EditorialLimits;        // defaults applied when absent
  compliance?: ComplianceLens;        // the "Examiner View" generalised
  deploy: DeployConfig;
}

export interface SiteIdentity {
  /** e.g. "Solid Mortgage Tour" */
  appName: string;
  /** Publishing organisation (the convener) — drives the "own" disclaimer variant. */
  organization: string;
  heroTitle: string;
  /** Two-sided value headline, e.g. "Borrowers own their data. Every party gets scoped access." */
  heroLead: string;
  heroParagraph: string;
  startCtaLabel?: string;             // default "Start the tour"
  exploreCtaLabel?: string;           // default "Explore the ecosystem"
}

export interface BrandingConfig {
  /** Convener display name substituted through every disclaimer string. */
  convener: string;
  /**
   * Domain-specific offer negations appended to the fixed safety copy,
   * e.g. ["Nothing here is an offer of credit."]. The fixed copy
   * ("All data simulated", "Do not enter real personal information") is
   * NOT configurable and always renders.
   */
  domainNegations: string[];
  /** One sentence for meta/OG descriptions. */
  description: string;
  aboutHref?: string;                 // default "/"
  consentCookiePrefix?: string;       // default `${deploy.slug}-demo-consent-`
  illustrativeTag?: string;           // default "illustrative figure, not an offer" (R5)
  /** R2 additions on top of a named preset. Presets ship with the kit. */
  insigniaPreset?: "us-finance" | "none";  // default "none"
  bannedMarks?: { pattern: string; reason: string }[];
}

export interface DemoPersonaCard {
  name: string;
  /** MUST self-identify as fictional, e.g. "… — fictional persona, all data simulated". */
  descriptor: string;
  fields: PersonaField[];
  /** Rendered under the card, e.g. the ZK thresholds the values are pinned to. */
  footnote?: string;
}
export interface PersonaField {
  label: string;
  value: string;
  copyable?: boolean;                 // default true
  note?: string;
}

export interface QuantifiedAnchor {
  id: string;
  value: string;                      // "~$11,600"
  label: string;                      // "to originate one loan"
  detail: string;
  source: { name: string; url: string };  // url must be public + dereferenceable
}

export interface ServiceRegistry {
  /** Keyed by slug. The shell itself registers too (zoneEnv absent). */
  apps: Record<string, RegisteredApp>;
  /** Launcher dock order; every entry must be a key of `apps`. */
  launcherOrder: string[];
  roles: EcosystemRole[];
  /** Slug of the centre role (the data-subject's own vault/pod). */
  center: string;
}

export interface RegisteredApp {
  slug: string;
  appName: string;
  /** Role-first honest branding: "modelled on X". Never "by X". */
  modelledOn: string;
  /** In-shell path (zone rewrite prefix, or a tour-local route). */
  path: string;
  /** Env var the shell rewrite reads; absent = tour-local surface. */
  zoneEnv?: string;
  healthPath: string;
  /** Palette-inspired theme, NEVER brand-guideline values (decision 0002). */
  theme?: ThemeSpec;
  /** HonestyPanel content for this app — single-sourced here so apps and tour agree. */
  honesty?: { real: string[]; simulated: string[] };
}

export interface ThemeSpec {
  hue: number;                        // neutral hue anchor
  primary: string;                    // oklch(...)
  accent: string;
  primaryForeground?: string;
  accentForeground?: string;
  /** For AppShell framing: "primary mortgage lender". */
  role: string;
}

export interface EcosystemRole {
  slug: string;
  /** Value-chain number; absent for the centre node. */
  roleNumber?: number;
  role: string;
  modelledOn: string;
  /** Honest recruitment framing, e.g. "EDMA member", "External approach". */
  membership: string;
  summary: string;
  scene?: number;
  /** Keys of registry.apps; empty = mapped seat with no app (shown honestly). */
  apps: string[];
  center?: boolean;
}

export interface WalkthroughChapter {
  slug: string;
  scene: number;                      // 1-based, contiguous, in array order
  title: string;
  /** The regulation/industry anchor the scene dramatizes. */
  anchor: string;
  lead: string;                       // ≤ editorial.maxLeadWords
  steps: ChapterStep[];               // ≥ editorial.minSteps
  /** Plain-English "what just happened underneath". */
  underneath?: string[];
  /** Enforce presence of `underneath` (the VC/ZK/protocol beats). */
  underneathRequired?: boolean;       // default false
}
export interface ChapterStep {
  title: string;
  body: string;                       // ≤ editorial.maxStepWords
  tryLive: { app: string; label: string };  // app must be a registry key
}

export interface EditorialLimits {
  maxLeadWords?: number;              // default 40
  maxStepWords?: number;              // default 65
  minSteps?: number;                  // default 2
  minUnderneathChars?: number;        // default 20 per point
}

export interface ComplianceLens {
  /** e.g. "Examiner View". */
  title: string;
  /** Mandatory non-affiliation statement rendered in the lens chrome. */
  nonAffiliation: string;
  checks: ComplianceCheck[];
}
export interface ComplianceCheck {
  id: string;
  rule: string;                       // the public rule, plain English
  citation: string;
  citationUrl: string;                // public + dereferenceable
  scene: number;
  chapterSlug: string;                // must resolve
  observe: string;                    // what the lens checks in the demo journey
}

export interface DeployConfig {
  /** Use-case slug, e.g. "mortgage" — drives cookie prefix + generated names. */
  slug: string;
  /** Env-var prefix, e.g. "MORTGAGE" — drives *_TRUST_FORWARDED_HEADERS etc. */
  envPrefix: string;
}
```

Validation rules beyond types (enforced by `parseWalkthrough`, all with
chapter/step-naming error messages):

| Rule | Default |
|---|---|
| Every `steps[].tryLive.app` and `roles[].apps[]` resolves in `registry.apps` | hard error |
| Every `launcherOrder` entry resolves; no duplicates | hard error |
| Exactly one role has `center: true` and matches `registry.center` | hard error |
| `scene` numbers contiguous 1..N in array order; slugs unique | hard error |
| Word budgets (lead/step), `minSteps` | hard error (editorial gates are the point) |
| `underneathRequired` ⇒ `underneath` non-empty, each point ≥ 20 chars | hard error |
| `compliance.checks[].chapterSlug` resolves | hard error |
| `persona.descriptor` contains "fictional" or "simulated" | hard error (honesty floor) |
| `modelledOn` never appears inside `appName` (role-first rule, R4-adjacent) | warning |

### 2.2 JSON-Schema (generated artifact, condensed)

The shipped artifact is generated; this condensed form pins the shape for review:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "walkthrough.v1.json",
  "type": "object",
  "required": ["version", "site", "branding", "persona", "anchors",
               "registry", "chapters", "deploy"],
  "properties": {
    "version": { "const": 1 },
    "site": {
      "type": "object",
      "required": ["appName", "organization", "heroTitle", "heroLead", "heroParagraph"],
      "properties": {
        "appName": { "type": "string", "minLength": 1 },
        "organization": { "type": "string", "minLength": 1 },
        "heroTitle": { "type": "string" },
        "heroLead": { "type": "string" },
        "heroParagraph": { "type": "string" },
        "startCtaLabel": { "type": "string" },
        "exploreCtaLabel": { "type": "string" }
      }
    },
    "branding": {
      "type": "object",
      "required": ["convener", "domainNegations", "description"],
      "properties": {
        "convener": { "type": "string", "minLength": 1 },
        "domainNegations": { "type": "array", "items": { "type": "string" } },
        "description": { "type": "string" },
        "aboutHref": { "type": "string" },
        "consentCookiePrefix": { "type": "string", "pattern": "^[a-z0-9-]+-$" },
        "illustrativeTag": { "type": "string" },
        "insigniaPreset": { "enum": ["us-finance", "none"] },
        "bannedMarks": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["pattern", "reason"],
            "properties": { "pattern": { "type": "string" }, "reason": { "type": "string" } }
          }
        }
      }
    },
    "persona": {
      "type": "object",
      "required": ["name", "descriptor", "fields"],
      "properties": {
        "name": { "type": "string" },
        "descriptor": { "type": "string" },
        "footnote": { "type": "string" },
        "fields": {
          "type": "array", "minItems": 1,
          "items": {
            "type": "object",
            "required": ["label", "value"],
            "properties": {
              "label": { "type": "string" }, "value": { "type": "string" },
              "copyable": { "type": "boolean", "default": true },
              "note": { "type": "string" }
            }
          }
        }
      }
    },
    "anchors": {
      "type": "array", "maxItems": 6,
      "items": {
        "type": "object",
        "required": ["id", "value", "label", "detail", "source"],
        "properties": {
          "id": { "type": "string" }, "value": { "type": "string" },
          "label": { "type": "string" }, "detail": { "type": "string" },
          "source": {
            "type": "object", "required": ["name", "url"],
            "properties": {
              "name": { "type": "string" },
              "url": { "type": "string", "format": "uri", "pattern": "^https://" }
            }
          }
        }
      }
    },
    "registry": {
      "type": "object",
      "required": ["apps", "launcherOrder", "roles", "center"],
      "properties": {
        "apps": {
          "type": "object",
          "additionalProperties": {
            "type": "object",
            "required": ["slug", "appName", "modelledOn", "path", "healthPath"],
            "properties": {
              "slug": { "type": "string", "pattern": "^[a-z0-9-]+$" },
              "appName": { "type": "string" },
              "modelledOn": { "type": "string" },
              "path": { "type": "string", "pattern": "^/" },
              "zoneEnv": { "type": "string", "pattern": "^[A-Z][A-Z0-9_]*$" },
              "healthPath": { "type": "string", "pattern": "^/" },
              "theme": {
                "type": "object",
                "required": ["hue", "primary", "accent", "role"],
                "properties": {
                  "hue": { "type": "number" },
                  "primary": { "type": "string" }, "accent": { "type": "string" },
                  "primaryForeground": { "type": "string" },
                  "accentForeground": { "type": "string" },
                  "role": { "type": "string" }
                }
              },
              "honesty": {
                "type": "object", "required": ["real", "simulated"],
                "properties": {
                  "real": { "type": "array", "items": { "type": "string" } },
                  "simulated": { "type": "array", "items": { "type": "string" } }
                }
              }
            }
          }
        },
        "launcherOrder": { "type": "array", "items": { "type": "string" }, "uniqueItems": true },
        "roles": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["slug", "role", "modelledOn", "membership", "summary", "apps"],
            "properties": {
              "slug": { "type": "string" }, "roleNumber": { "type": "integer", "minimum": 1 },
              "role": { "type": "string" }, "modelledOn": { "type": "string" },
              "membership": { "type": "string" }, "summary": { "type": "string" },
              "scene": { "type": "integer", "minimum": 1 },
              "apps": { "type": "array", "items": { "type": "string" } },
              "center": { "type": "boolean" }
            }
          }
        },
        "center": { "type": "string" }
      }
    },
    "chapters": {
      "type": "array", "minItems": 1,
      "items": {
        "type": "object",
        "required": ["slug", "scene", "title", "anchor", "lead", "steps"],
        "properties": {
          "slug": { "type": "string", "pattern": "^[a-z0-9-]+$" },
          "scene": { "type": "integer", "minimum": 1 },
          "title": { "type": "string" }, "anchor": { "type": "string", "minLength": 10 },
          "lead": { "type": "string" },
          "steps": {
            "type": "array", "minItems": 2,
            "items": {
              "type": "object",
              "required": ["title", "body", "tryLive"],
              "properties": {
                "title": { "type": "string", "minLength": 1 },
                "body": { "type": "string" },
                "tryLive": {
                  "type": "object", "required": ["app", "label"],
                  "properties": {
                    "app": { "type": "string" },
                    "label": { "type": "string", "minLength": 1 }
                  }
                }
              }
            }
          },
          "underneath": { "type": "array", "items": { "type": "string", "minLength": 20 } },
          "underneathRequired": { "type": "boolean", "default": false }
        }
      }
    },
    "editorial": {
      "type": "object",
      "properties": {
        "maxLeadWords": { "type": "integer", "default": 40 },
        "maxStepWords": { "type": "integer", "default": 65 },
        "minSteps": { "type": "integer", "default": 2 },
        "minUnderneathChars": { "type": "integer", "default": 20 }
      }
    },
    "compliance": {
      "type": "object",
      "required": ["title", "nonAffiliation", "checks"],
      "properties": {
        "title": { "type": "string" },
        "nonAffiliation": { "type": "string", "minLength": 20 },
        "checks": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["id", "rule", "citation", "citationUrl", "scene",
                         "chapterSlug", "observe"],
            "properties": {
              "id": { "type": "string" }, "rule": { "type": "string" },
              "citation": { "type": "string" },
              "citationUrl": { "type": "string", "format": "uri", "pattern": "^https://" },
              "scene": { "type": "integer" }, "chapterSlug": { "type": "string" },
              "observe": { "type": "string" }
            }
          }
        }
      }
    },
    "deploy": {
      "type": "object",
      "required": ["slug", "envPrefix"],
      "properties": {
        "slug": { "type": "string", "pattern": "^[a-z0-9-]+$" },
        "envPrefix": { "type": "string", "pattern": "^[A-Z][A-Z0-9_]*$" }
      }
    }
  }
}
```

Cross-reference rules (§2.1 table) are code-level in `parseWalkthrough` — JSON-Schema
cannot express registry resolution.

### 2.3 Worked example — the mortgage walkthrough as this JSON (elided)

Values below are lifted verbatim from `apps/tour/app/content/*.ts`; `…` marks elision (the
full document is the sm-77 migration artifact).

```jsonc
{
  "version": 1,
  "site": {
    "appName": "Solid Mortgage Tour",
    "organization": "EDMA Solid Community of Practice",
    "heroTitle": "Solid Mortgage Tour",
    "heroLead": "Borrowers own their data. Every party in the mortgage gets scoped, revocable, receipted access — instead of yet another unmanaged copy.",
    "heroParagraph": "A US mortgage today is expensive and slow largely because the same facts about the borrower are collected, verified, copied, and re-verified by over a dozen parties…"
  },
  "branding": {
    "convener": "EDMA Solid Community of Practice",
    "domainNegations": ["Nothing here is an offer of credit."],
    "description": "Concept demonstration by the EDMA Solid Community of Practice. All data simulated.",
    "insigniaPreset": "us-finance"
  },
  "persona": {
    "name": "Alex Rivera",
    "descriptor": "First-time homebuyer — fictional persona, all data simulated",
    "fields": [
      { "label": "Monthly gross income", "value": "$8,250" },
      { "label": "Credit score", "value": "742" },
      { "label": "Monthly debts", "value": "$1,240" },
      { "label": "Verified assets", "value": "$64,500" },
      { "label": "Employer", "value": "Meridian Logistics LLC (fictional employer)" }
    ],
    "footnote": "Values are pinned to the scene-2 proof thresholds: income ≥ $7,000/mo, credit score ≥ 620, debts ≤ floor(0.43 × income)."
  },
  "anchors": [
    {
      "id": "cost-to-originate",
      "value": "~$11,600",
      "label": "to originate one loan",
      "detail": "Average cost to originate a loan (Q3 2023)…",
      "source": {
        "name": "Freddie Mac, 2024 Cost to Originate Study",
        "url": "https://sf.freddiemac.com/docs/pdf/cost-to-originate-full-study-2024.pdf"
      }
    }
    // … days-to-close, gse-days-saved, breach-scale
  ],
  "registry": {
    "apps": {
      "tour": {
        "slug": "tour", "appName": "Solid Mortgage Tour",
        "modelledOn": "EDMA Solid Community of Practice",
        "path": "/", "healthPath": "/api/health",
        "theme": { "hue": 260, "primary": "oklch(0.279 0.041 260)",
                   "accent": "oklch(0.55 0.1 250)", "role": "convener" }
      },
      "wallet": {
        "slug": "wallet", "appName": "Data Vault", "modelledOn": "Verizon",
        "path": "/wallet", "zoneEnv": "MORTGAGE_WALLET_ZONE_URL",
        "healthPath": "/wallet/api/health",
        "theme": { "hue": 270, "primary": "oklch(0.22 0.012 270)",
                   "accent": "oklch(0.5 0.19 20)", "role": "consumer data custodian" },
        "honesty": {
          "real": ["Reads and writes go to a real in-browser Solid pod over the Solid protocol", "…"],
          "simulated": ["Login is simulated in Mode 1 — the honesty panel says so on screen", "…"]
        }
      },
      "lender-boa": {
        "slug": "lender-boa", "appName": "Mortgage Origination",
        "modelledOn": "Bank of America",
        "path": "/lender-boa", "zoneEnv": "MORTGAGE_PRIMARY_LENDER_ZONE_URL",
        "healthPath": "/lender-boa/api/health",
        "theme": { "hue": 262, "primary": "oklch(0.36 0.11 262)",
                   "accent": "oklch(0.52 0.16 20)", "role": "primary mortgage lender" }
      }
      // … verifications, lender-53, gse, property, closing, examiner
    },
    "launcherOrder": ["tour", "wallet", "verifications", "lender-boa",
                      "lender-53", "gse", "property", "closing"],
    "roles": [
      {
        "slug": "vault", "center": true, "role": "Borrower data vault",
        "modelledOn": "Verizon", "membership": "EDMA member", "scene": 1,
        "apps": ["wallet"],
        "summary": "Alex Rivera's pod: profile, credential wallet, access grants…"
      },
      {
        "slug": "lender", "roleNumber": 1, "role": "Lender / originator",
        "modelledOn": "Bank of America", "membership": "EDMA member", "scene": 3,
        "apps": ["lender-boa", "lender-53"],
        "summary": "Full origination portal: ZK pre-qual verification…"
      }
      // … roles 2–12 incl. app-less seats (standards, org-identity, insurance)
    ],
    "center": "vault"
  },
  "chapters": [
    {
      "slug": "fill-the-vault", "scene": 1, "title": "Fill the vault",
      "anchor": "The three issuer roles are the ones the GSEs already accept from digital verification suppliers.",
      "lead": "Three verifiers issue Alex Rivera's employment, asset, and credit credentials straight into a Data Vault Alex controls. Issued once, reusable everywhere Alex chooses.",
      "underneathRequired": true,
      "steps": [
        {
          "title": "Employment and income, attested",
          "body": "An issuer modelled on The Work Number — the employer-sourced verification role the GSEs already accept — signs an employment-and-income credential…",
          "tryLive": { "app": "verifications", "label": "Open the issuer flows" }
        }
        // … 2 more steps
      ],
      "underneath": [
        "Each credential is a W3C Verifiable Credential 2.0 (JSON-LD), signed by its issuer and written into the pod's credentials container over the Solid protocol.",
        "…"
      ]
    }
    // … scenes 2–5 (shop-without-undressing, one-click-application,
    //   nothing-goes-stale, close-and-stay-in-control)
  ],
  "compliance": {
    "title": "Examiner View",
    "nonAffiliation": "This view is illustrative. It is not affiliated with, or endorsed by, the Consumer Financial Protection Bureau (CFPB) or any government agency.",
    "checks": [
      {
        "id": "trid-loan-estimate",
        "rule": "Loan Estimate delivered or placed in the mail no later than the third business day after the creditor receives the application (12 CFR 1026.19(e)(1)(iii)).",
        "citation": "Regulation Z §1026.19(e)(1)(iii) (TRID)",
        "citationUrl": "https://www.consumerfinance.gov/rules-policy/regulations/1026/19/",
        "scene": 3, "chapterSlug": "one-click-application",
        "observe": "The demo delivers the Loan Estimate straight into the borrower's pod with a receipted timestamp…"
      }
      // … 4 more checks
    ]
  },
  "deploy": { "slug": "mortgage", "envPrefix": "MORTGAGE" }
}
```

---

## 3. Upstream package boundaries

Three new packages in `jeswr/solid-sdk` `packages/*`, plus one follow-up. Conventions:
SKILL.md colocated in each package, no committed dist, mirror-publish to
`jeswr/<pkg>` per `solid-sdk/AGENTS.md` rules 2–3, `pnpm run gate` green.

### 3.1 `@jeswr/solid-showcase` — the JSON-driven walkthrough site (sm-74)

React 19 components + document schema. Browser-safe; Next-aware only at the
`/next` subpath (zone rewrites, metadata helpers).

```ts
// schema + validation
export type { WalkthroughDocument /* …all §2.1 types */ };
export function parseWalkthrough(json: unknown): WalkthroughDocument; // throws named errors
export function editorialFindings(doc: WalkthroughDocument): EditorialFinding[];

// page-level renderers (the whole tour as four components)
export function ShowcaseLayout(props: { document: WalkthroughDocument; children: ReactNode });
export function ShowcaseLanding(props: { document: WalkthroughDocument });
export function ShowcaseChapterPage(props: { document: WalkthroughDocument; slug: string });
export function ShowcaseCompliancePage(props: { document: WalkthroughDocument });

// building blocks (all currently in apps/tour/app/components/)
export { ChapterPlayer, EcosystemMap, Launcher, TryLiveButton,
         DemoIdentityCard, StatusDot, useServiceStatuses };

// subpath "@jeswr/solid-showcase/next"
export function zoneRewrites(doc: WalkthroughDocument,
  opts?: { fallbackSuffix?: string }): Promise<Rewrite[]>;   // replaces apps/tour/next.config.ts zones
export function healthRoute(): { GET(): Response };
export function showcaseMetadata(doc: WalkthroughDocument): Metadata; // via kit demoMetadata, variant "own"
```

Moves here: `apps/tour/app/components/*` (7 files), the data *types* from
`apps/tour/app/content/*.ts`, the editorial assertions from `apps/tour/test/chapters.test.ts`,
the zone table from `apps/tour/next.config.ts`, `apps/tour/app/api/health/route.ts`.

Deps: `@jeswr/solid-showcase-kit` (AppShell, disclaimers, StatCard), `zod` (v4, schema +
JSON-Schema emission), `react`. No RDF deps — this package never touches triples.

### 3.2 `@jeswr/solid-showcase-kit` — disclaimer/branding/trust pack (sm-75)

The whole of `packages/ui`, de-branded behind `createDisclaimerPack`.

```ts
// copy factories (all of packages/ui/src/disclaimers.ts, parameterised)
export interface DisclaimerPack { /* bannerFullCopy, bannerCompactCopy, footerLegalLine,
  interstitialParagraphs, demoTitle, demoDescription, demoMetadata, illustrativeTag,
  demoFieldHint — same shapes as today */ }
export function createDisclaimerPack(branding: BrandingConfig): DisclaimerPack;

// components (from packages/ui/src/*, now taking the pack or a React context provider)
export { ShowcaseTrustProvider };   // provides pack + theme to the components below
export { AppShell, ConceptDemoBanner, ConsentInterstitial, HonestyPanel,
         IllustrativeFigure, DemoLockedField, CredentialCard, ReceiptCard, StatCard };

// themes (factory generic; palette data stays with consumers)
export { paletteTokens, themeCssProperties };
export function themeFromSpec(spec: ThemeSpec, modelledOn: string): OrgTheme;

// subpath "@jeswr/solid-showcase-kit/testing"
export function insigniaFindings(text: string,
  opts: { preset?: "us-finance"; bannedMarks?: BannedMark[] }): InsigniaFinding[];
export const disclaimerAssertions: { /* e2e helpers asserting banner/footer presence */ };

// subpath "@jeswr/solid-showcase-kit/deploy"
export function envMatrix(doc: WalkthroughDocument): EnvVarSpec[];  // incl. *_TRUST_FORWARDED_HEADERS
export function appVercelJson(app: RegisteredApp): object;          // turbo-ignore + framework pin
```

Opinionated invariants preserved in code, not config: the banner is rendered by AppShell
unconditionally (four-Ps adjacency); safety copy is non-removable; DemoLockedField's hint
always renders; interstitial keeps the §4.2 four-paragraph structure with only the
convener/negation substitutions.

Deps: `@jeswr/app-shell` (`cn`), `react`. Browser-safe except `/deploy` (pure functions,
node-agnostic anyway) and `/testing`.

### 3.3 `@jeswr/solid-pod-guard` — the decision-0015 auth boundary (sm-75)

`"securityCritical": true`. Node-only. Never auto-merged.

```ts
export interface PodGuardConfig {
  trustedOidcIssuers: string[];
  allowedPodOrigins: string[];
  allowInsecureLoopback?: boolean;   // dev/e2e only
  trustForwardedHeaders?: boolean;   // required behind Vercel/proxies (sm-37)
}
export function configFromEnv(envPrefix: string, env?: NodeJS.ProcessEnv): PodGuardConfig;

/** L2: bidirectional pim:storage binding (verbatim from apps/lender-boa/lib/server/owner.ts). */
export function resolveAuthorizedPod(webid: string, config: PodGuardConfig,
  seams?: OwnerBindingSeams): Promise<string>;

/** L1–L2 pipeline factory (from pod-rail.ts): authenticate → reject pod/webid overrides →
 *  validate body → bind pod → handler. Fail-closed order is fixed, not configurable. */
export function createPodRouteGuard(options: PodGuardOptions): PodRouteGuard;
export interface PodRouteGuard {
  handle(request: Request, handler: (caller: AuthenticatedPodCaller,
    body: Record<string, unknown>) => Promise<Response>): Promise<Response>;
}

/** L4 service identity (verbatim from packages/solid-kit/src/auth/service.ts). */
export function createServicePodFetch(options: ServicePodFetchOptions): typeof fetch;

export { PodAccessError, type AuthenticatedPodCaller };
```

Deps: `@jeswr/solid-api-auth` (verify), `@jeswr/fetch-rdf` + `@solid/object` (profile
reads, house RDF rule), `@jeswr/guarded-fetch` (DNS-pinned SSRF guard), `jose`, `n3`
(DataFactory only). The decision-0015 trust assumption (owner-only-writable
`<pod>profile/card`) and the L3 subject-binding requirement (`credentialSubject == webid`,
which stays a *consumer* obligation) go in SKILL.md as operator requirements.

### 3.4 Dependency edges + what moves where

```
solid-showcase ──▶ solid-showcase-kit          (AppShell, pack, StatCard)
create-solid-demo ─▶ (scaffolds consumers of) showcase, kit, pod-guard,
                     synthetic-rdf, solid-seed  (both already upstream, seeder-design §2)
solid-pod-guard ──▶ solid-api-auth, fetch-rdf, guarded-fetch   (no showcase deps)
```

| Existing merged code | Destination |
|---|---|
| `packages/ui/src/{disclaimers,concept-demo-banner,app-shell,honesty-panel,illustrative-figure,demo-locked-field,consent-interstitial,credential-card,receipt-card,stat-card}.ts(x)` | `@jeswr/solid-showcase-kit` |
| `packages/ui/src/themes.ts` — `paletteTokens`/`themeCssProperties` | kit; `orgThemes` data → mortgage `walkthrough.json` `theme` specs |
| `apps/tour/app/components/*` | `@jeswr/solid-showcase` |
| `apps/tour/app/content/*.ts` | types → showcase schema; values → mortgage `walkthrough.json` |
| `apps/tour/test/chapters.test.ts` assertions | `editorialFindings` in showcase |
| `apps/tour/next.config.ts` zone table | `zoneRewrites(doc)` in showcase `/next` |
| `apps/lender-boa/lib/server/owner.ts` | `@jeswr/solid-pod-guard` (verbatim, config renamed) |
| `apps/lender-boa/lib/server/pod-rail.ts` pipeline scaffolding | `createPodRouteGuard`; scene handlers stay in lender-boa |
| `packages/solid-kit/src/auth/service.ts` | `@jeswr/solid-pod-guard` |
| `scripts/check-insignia.mjs` scanner core | kit `/testing` + `us-finance` preset; the CI wiring stays per-repo |
| `packages/solid-kit/src/browser-pod/**` | `@jeswr/solid-browser-pod` — follow-up bead (couples to vendored sparq wasm) |
| `packages/vc-kit/**`, scene logic, `packages/data-model` | stay in solid-mortgage |

---

## 4. `create-solid-demo` — the scaffolder (sm-76)

Unscoped npm name (npx convention, mirroring `create-solid-app`); lives at
`solid-sdk/packages/create-solid-demo`, mirror-published to `jeswr/create-solid-demo`.
Follows create-solid-app's proven conventions: bundled `template/` in the tarball, Node 24
native type-stripping (no build step), the dotfile-rename gotcha (`npmrc`→`.npmrc`,
`gitignore`→`.gitignore`, `env.example`→`.env.example` — npm pack strips the literals),
`--no-install`, scaffold tests that gate the generated repo.

### 4.1 UX

```sh
npx create-solid-demo my-demo \
  --use-case car-hire \
  --convener "Open Data Institute" \
  --negation "Nothing here is an offer of hire or insurance." \
  --app wallet:"Data Vault":"consumer data custodian" \
  --app issuer:"Licence Verification":"driving-licence verifier" \
  --app hire:"Hire Desk":"vehicle hire operator"
```

| Flag | Meaning | Default / prompt |
|---|---|---|
| `--use-case <slug>` | `deploy.slug`; derives `envPrefix` (upper-snake) + cookie prefix | prompted |
| `--convener <name>` | `branding.convener` + `site.organization` | prompted |
| `--negation <line>` | repeatable; `branding.domainNegations` | prompted (≥1 required) |
| `--app slug:name:role` | repeatable; registers a zone app + skeleton | prompted (≥1) |
| `--modelled-on slug=Org` | repeatable; sets `modelledOn` per app (else the role text) | role text |
| `--insignia-preset us-finance` | branding preset | `none` |
| `--no-install` / `--seed` | as create-solid-app (`--seed` boots the dev pod + seeds the persona via `@jeswr/solid-seed`) | install; no seed |

Interactive mode asks exactly the flag set above, nothing more; every answer lands in
`apps/tour/content/walkthrough.json`, which is the single thing a team edits afterwards.
The generated walkthrough starts with ONE placeholder chapter per app that already passes
`parseWalkthrough` (budgets respected, try-live wired), so the site renders end-to-end
before any real content is written.

### 4.2 Generated tree

```
my-demo/
├── AGENTS.md                      # house conventions; CLAUDE.md symlink
├── package.json  pnpm-workspace.yaml  turbo.json  biome.json  .npmrc (ignore-scripts)
├── apps/
│   ├── tour/                      # the shell zone
│   │   ├── app/layout.tsx         # <ShowcaseLayout document={walkthrough}>
│   │   ├── app/page.tsx           # <ShowcaseLanding …>
│   │   ├── app/chapters/[slug]/page.tsx
│   │   ├── app/compliance/page.tsx        # only if lens configured later
│   │   ├── app/api/health/route.ts        # healthRoute()
│   │   ├── content/walkthrough.json       # THE document (single edit surface)
│   │   ├── test/walkthrough.test.ts       # expect(editorialFindings(doc)).toEqual([])
│   │   ├── next.config.ts                 # zoneRewrites(walkthrough)
│   │   └── vercel.json                    # appVercelJson output
│   └── <slug>/  (one per --app)
│       ├── app/layout.tsx         # AppShell + themeFromSpec + ConsentInterstitial
│       ├── app/page.tsx           # HonestyPanel wired from registry honesty
│       ├── app/api/health/route.ts
│       ├── app/api/pod/example/route.ts   # createPodRouteGuard sample (401s anonymous)
│       ├── lib/server/config.ts           # configFromEnv("<ENVPREFIX>")
│       └── vercel.json
├── packages/
│   └── data-model/                # SHACL shapes dir + vocab stub + check:shapes script
├── seeds/
│   ├── persona.ts                 # demo persona fixture (matches walkthrough.persona)
│   └── seed.config.ts             # @jeswr/synthetic-rdf shapes + @jeswr/solid-seed layout
├── e2e/
│   ├── playwright.config.ts       # per-suite local Solid server (house pattern)
│   └── disclaimers.spec.ts        # kit disclaimerAssertions on every app + axe gate
├── scripts/
│   ├── lint-iris.mjs              # HEAD-check every IRI, 7-day cache (house rule)
│   └── check-insignia.mjs         # thin wrapper over kit insigniaFindings + preset
├── docs/deploy.md                 # env matrix (envMatrix output) + sm-37 gotchas:
│                                  #   rootDirectory per app, cleared build overrides,
│                                  #   <PREFIX>_TRUST_FORWARDED_HEADERS=1 on pod-route apps,
│                                  #   preview-SSO vs interstitial posture, neutral slugs (R4)
└── .github/workflows/ci.yml      # lint → typecheck → test → build (+ lint:iris, insignia)
```

Parallels to `create-solid-app`: same bin argument parser shape, same scaffold-then-verify
test style (`test/scaffold.test.ts` gates `pnpm lint/typecheck/test` inside a scaffolded
tree), same template-source-of-truth seam (`resolveTemplateDir()`). Differences: pnpm
workspace + turbo (multi-app) instead of a single npm app; no interactive auth flow (the
tour has no Solid login of its own — showcase-patterns §1).

---

## 5. Migration — solid-mortgage as first consumer (sm-77)

| Step | Change | Proof |
|---|---|---|
| 1 | Author `apps/tour/content/walkthrough.json` from today's `content/*.ts` (mechanical; §2.3 shows the mapping) | `parseWalkthrough` passes; `editorialFindings` empty |
| 2 | Replace `apps/tour/app/{page,layout}.tsx`, `chapters/[slug]`, `examiner`, `components/*`, `next.config.ts` zones with the four showcase renderers + `zoneRewrites` | DOM-level parity: existing e2e selectors (`data-chapter-player`, `data-try-live`, `data-launcher`, `data-ecosystem-map`, `data-honesty-panel`) unchanged; visual spot-check |
| 3 | Delete `packages/ui`; apps import `@jeswr/solid-showcase-kit`; mortgage keeps only its theme specs (now registry data) and any mortgage-only composites | disclaimer unit tests re-point at `createDisclaimerPack(mortgageBranding)` and assert the EXACT current strings — zero copy drift is the extraction proof |
| 4 | lender-boa adopts `@jeswr/solid-pod-guard`: `owner.ts`/`pod-rail.ts` shrink to config + scene handlers | the existing pod-rail security tests (401-before-params, 400 overrides, 403 fail-closed, 503 unconfigured) run unchanged against the guard |
| 5 | `scripts/check-insignia.mjs` re-implemented over kit `/testing` with `us-finance` preset | same findings on the current tree (golden run) |
| 6 | Consumption per decision 0009's mechanism (workspace/packed-tarball pins until npm publish) | `pnpm run gate` green |

What proves the extraction overall: (a) mortgage renders identically from JSON; (b) no
generic component code remains in solid-mortgage (grep gate for the moved filenames);
(c) `create-solid-demo` scaffolds a *different* use case whose CI gates green without
touching framework code.

## 6. Acceptance criteria for the build beads

### sm-74 — `@jeswr/solid-showcase`

1. Package at `solid-sdk/packages/solid-showcase`; SKILL.md colocated; no committed dist; workspace `pnpm run gate` green.
2. `parseWalkthrough` enforces every §2.1 validation rule with chapter/step-naming errors; property-tested against malformed documents (unknown try-live app, budget overrun, missing required underneath, duplicate slugs).
3. JSON-Schema artifact generated from the zod schema, exported at `schema/walkthrough.v1.json`, and asserted in a test to stay in sync with the types.
4. The mortgage walkthrough (fixture: §2.3 completed) renders via the four page renderers; component tests cover: keyboard stepper, try-live honest degradation (live/checking/not-deployed), launcher placeholder-link pattern, ecosystem map selection, compliance checklist, persona card copy actions.
5. `zoneRewrites(mortgageDoc)` reproduces the rewrite output of today's `apps/tour/next.config.ts` (unit test with env set/unset).
6. Zero use-case strings in `src/` (grep gate: mortgage/EDMA/lender/org names) — all such strings enter via the document.

### sm-75 — `@jeswr/solid-showcase-kit` + `@jeswr/solid-pod-guard`

1. Kit: all ten `packages/ui` components moved; `createDisclaimerPack(mortgageBranding)` reproduces today's exact strings (existing `packages/ui/test/disclaimers.test.ts` vectors ported as golden tests); safety copy proven non-removable (no prop/config path can drop it).
2. Kit: `/testing` insignia scanner reproduces `scripts/check-insignia.mjs` findings under the `us-finance` preset (golden run against the mortgage tree); `/deploy` `envMatrix` includes `*_TRUST_FORWARDED_HEADERS` for every app with a pod route.
3. Kit is browser-safe at the root export (no node builtins); SKILL.md documents the R1–R8 knob surface and what is deliberately NOT configurable.
4. pod-guard: `"securityCritical": true`; pipeline order fixed and proven by porting the lender-boa pod-rail test suite (anonymous ⇒ 401 before param validation; overrides ⇒ 400; binding failure ⇒ 403; unconfigured ⇒ 503; zero-or-multiple allowlisted claims ⇒ 403 never pick-first).
5. pod-guard: `createServicePodFetch` moved with its full test suite (redirect refusal, token cache, per-request proof, secret never echoed); decision-0015 trust assumption + L3 consumer obligation documented in SKILL.md; adversarial review before merge, never auto-merged.
6. Both: mirror-publish dry-run clean; no cyclic deps (kit ⇏ showcase; guard ⇏ either).

### sm-76 — `create-solid-demo`

1. Package at `solid-sdk/packages/create-solid-demo` (unscoped npm name); npx-runnable via Node 24 type-stripping; template ships in the tarball with the dotfile-rename shims (verified via `npm pack` in a test, per create-solid-app's gotcha note).
2. Flags + prompts per §4.1; generated `walkthrough.json` passes `parseWalkthrough`; placeholder chapters pass editorial gates.
3. Scaffold test: generated repo runs `pnpm lint`, `typecheck`, `test` green in CI (the create-solid-app `scaffold-tsc` pattern); the sample pod-guard route returns 401 to an anonymous request in a generated-app test.
4. Generated `docs/deploy.md` contains the sm-37 learnings (rootDirectory, cleared overrides, `*_TRUST_FORWARDED_HEADERS`, preview-SSO posture, R4 neutral slugs).
5. SKILL.md teaches the end-to-end flow: scaffold → edit walkthrough.json → seed → deploy.

### Sequencing note

sm-74 and sm-75 are parallel except `ShowcaseLayout`/`ShowcaseLanding`, which consume kit
components — build kit's `createDisclaimerPack` + `AppShell` first within sm-75, or land
sm-75 first. sm-76 depends on both (unchanged). sm-77 last (unchanged).

## 7. Follow-up beads filed from this design

| Bead | Title | Why |
|---|---|---|
| new | Extract `@jeswr/solid-browser-pod` (Mode-1 in-browser pod runtime) upstream | Generic per §1.4 but couples to the vendored sparq wasm patch — off the sm-74/75 critical path |
| new | Host the walkthrough JSON-Schema at a dereferenceable IRI | Blocked on solid-sdk repo visibility; until then the schema is a package artifact only (no minted IRIs) |
