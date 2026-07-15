# seeder-design — ontology-driven deterministic synthetic-data seeding (sm-62)

Design of record for the SPEC §7 seeding directive: dev/e2e pod data comes from a deterministic
generator that inspects the ontologies + SHACL shapes the apps work with; the generic tooling is
built upstream in `jeswr/solid-sdk` **in its entirety** — `@jeswr/synthetic-rdf` (shape-driven
generation, §3) and `@jeswr/solid-seed` (pod provisioning + writes through the harness
interface, §4) — with solid-mortgage layering only mort shapes and persona overrides (§5).
Downstream build beads: sm-63 (synthetic-rdf), sm-64 (solid-seed), sm-65 (mort layer).
Inputs: `packages/solid-kit/src/harness.ts` + `seed.ts`, `vocab/mort.ttl`,
`docs/research/vocab.md` §5 (shapes land with sm-19), decisions 0005 (digit budgets),
0011 (Mode-1 in-browser pod), 0012 (operand anchors, backdated employment VC).

## 1. Survey of existing tooling (web-verified 2026-07-15)

| Tool | What it is | Constraint coverage | Deterministic? | Licence / maintenance | Verdict |
|---|---|---|---|---|---|
| [RDFGraphGen](https://github.com/etnc/RDFGraphGen) (PyPI `rdf-graph-gen`) | Python/rdflib synthetic-graph generator from SHACL shapes ([paper](https://arxiv.org/html/2407.17941v2)) | `sh:minCount/maxCount`, `sh:in`, `sh:pattern`, `sh:datatype`, `sh:minInclusive/maxInclusive`, `sh:lessThan`, `sh:node`, `sh:class`, `sh:and/or/xone`; predicate paths only; requires non-recursive shapes | **No** — no seed option; stochastic value pick from schema.org dictionaries → name heuristics → random | MIT; v1.2 May 2025, single academic group | Closest prior art for *resolution-order* design; unusable as-is: no determinism, fixed `example.org#NodeN` IRIs, no override layer, Python subprocess in a TS monorepo, no browser story |
| [rudof `generate`](https://rudof-project.github.io/rudof/cli_usage/generate.html) (`rudof_generate` crate) | Rust CLI/lib generating synthetic RDF from ShEx **or** SHACL | `sh:datatype`, `sh:in`, `sh:pattern`, cardinality, `sh:node` refs, `sh:closed`; TOML-configurable field generators; parallel generation | **Yes** — `--seed` for reproducible output | Apache-2.0/MIT; very active (v0.3.6 Jul 2026, WESO group); Python bindings (`pyrudof`), **no npm/JS bindings, no browser build of the generator** | Best-engineered existing generator; wrapping means shelling to a native binary — kills the browser-safe Mode-1 requirement, IRI policy is fixed (`example.org/User-1`), overrides would be post-hoc graph rewrites, cross-version output stability not contracted |
| TopBraid Composer [Random Data Generator](https://topbraidcomposer.org/html/DataGenerator.htm) (`datagen.ttl`) | Java desktop tooling: spec graph imports schema + datagen module | SHACL property shapes drive which values are produced; cardinality/value-type narrowing in the spec graph | Not documented | Proprietary; Composer free edition discontinued May 2020, Maestro no longer actively developed | Dead end — legacy proprietary desktop tool |
| [LinkML](https://linkml.io/linkml/generators/index.html) | Schema language + generator framework | Generates *schema artifacts* (including SHACL **from** LinkML); no instance-data synthesizer in core | n/a | Apache-2.0; very active | Wrong direction; adopting it would also force a lossy SHACL→LinkML translation of the sm-19 shapes |
| PyGraft / GRR / GAIA / Tab2KG | Academic KG synthesizers ([RDFGraphGen §related work](https://arxiv.org/html/2407.17941v2)) | Schema/ontology-driven benchmark-scale graphs; none consume SHACL for app-conformant fixtures | Varies | Academic, low maintenance | Benchmark territory (as are WatDiv/gMark/LUBM) — not fixture seeding |
| ShEx-side (wiGen, [sheXer](https://github.com/weso/shexer)) | wiGen: one-off 2017 stress-data generator; sheXer: extracts shapes *from* data | — | — | Abandoned / wrong direction | No; rudof already covers ShEx-driven generation |
| JS/npm ecosystem | `rdf-validate-shacl`, `shacl-engine` (validators), `@rdfine/generator` (code-gen), `mocker-data-generator`/faker (non-RDF) | **No SHACL instance generator exists on npm**; `rdf-mock`/`rdf-create` do not exist as packages | — | — | Green field |
| Seeded-faker bridges | faker-js / Python Faker seeded value pools | Value quality only, no shape awareness | Within one version only — [faker docs](https://fakerjs.dev/guide/usage.html): "you may get different values for the same seed" across versions | MIT; active | Not a core dependency; acceptable as an *optional pinned-version plugin* for pretty labels |

### Build-vs-wrap verdict: **build fresh** (with borrowed design, not borrowed code)

No candidate satisfies the load-bearing requirements simultaneously: (a) RDF/JS-native
TypeScript consumable as a `@jeswr/solid-sdk` workspace package, (b) **browser-safe core**
(decision 0011 Mode-1 seeds an in-browser pod), (c) determinism as a *contract* — byte-stable
across runs, machines and shape evolution, not merely a `--seed` flag, (d) caller-controlled
IRI allocation (pod-relative resources, not `example.org`), (e) a pinned-override persona layer
with non-perturbation semantics (§3.3). rudof gets (c-lite) and constraint breadth but is a
native binary with no JS distribution; RDFGraphGen gets constraint breadth but is
nondeterministic Python. Both are wrong-shaped to wrap; neither is wrong to *learn from* —
§3.4's resolution order matches the intersection of what both prove supportable. Two survey
takeaways are adopted directly: rudof's seeded-generation UX, and validating generator output
with an independent SHACL engine instead of trusting the generator (the JS validators —
`shacl-engine`, `rdf-validate-shacl` — are mature even though no JS generator exists).

## 2. Package split and dependency posture

| Package | Scope | Depends on | Explicitly not |
|---|---|---|---|
| `@jeswr/synthetic-rdf` | SHACL shapes graph → conforming RDF/JS instances | `@rdfjs/types`, `@jeswr/rdf-serialize` (sanctioned n3 serialiser), a SHACL validator (dev/test only) | No network, no Node built-ins, no LLM, no faker in core |
| `@jeswr/solid-seed` | generator output + pod-layout spec → provisioned accounts + written resources | `@rdfjs/types`, `@solid/object` (ACL authoring) | No server boot (harness owns lifecycles), no Node built-ins in core |

Both live in the `jeswr/solid-sdk` monorepo with colocated SKILL.md (suite convention).
solid-mortgage consumes them via the packed-tarball/workspace mechanism of decision 0009 and
layers `packages/data-model` shapes + persona overrides in `packages/solid-kit` (sm-65).

## 3. `@jeswr/synthetic-rdf`

### 3.1 Contract

Output is a **pure function** of `(package version, shapes graph, ontology graph, seed,
targets, overrides, now)`. Same inputs ⇒ byte-identical Turtle on any machine, any OS, any
run. Consequences baked into the design:

- **Seeded PRNG, no ambient entropy.** xoshiro128\*\* (integer-only via `Math.imul`, so
  IEEE-754/platform drift is unrepresentable), seeded by hashing the caller's string seed
  (cyrb128). `Math.random`, `Date.now`, and `crypto.getRandomValues` are lint-banned in src.
- **Wall clock is an input.** Temporal defaults (e.g. an `xsd:date` within a window) derive
  from an explicit `now` option — deterministic goldens pass a fixed instant; demo seeding
  passes the real clock (needed for decision 0012's genuinely-near-expiry VC, §5.2).
- **Hierarchical sub-streams, not one sequence.** Every generated value draws from a
  sub-stream keyed by `hash(seed, shapeIri, instanceIndex, propertyPath, occurrence)`.
  Adding a property to a shape, raising an instance count, or pinning one override therefore
  perturbs **only** the values it names — everything else stays bit-identical. (A single
  linear PRNG sequence — rudof's model — reshuffles the world on any edit; that breaks
  golden-file tests and scripted demos.)
- **No iteration-order dependence.** Shapes, property shapes and quads are canonically
  sorted (by `sh:order` where present, then term order) before any stream is consumed;
  serialisation sorts quads and pins prefixes.

### 3.2 IRI / bnode allocation

- Instance IRIs are minted by a caller-replaceable allocator; default
  `${base}${slug(shapeName)}/${index}` under `base` (default `urn:synthetic:` — a
  deliberately non-dereferenceable *placeholder scheme*, never a fake HTTP domain; the
  no-minted-IRIs rule applies to published data, and §4.2 rebases every IRI into the pod's
  real IRI space before anything is written).
- Sub-streams are keyed on `(shape, index, path)` — **never on the minted IRI** — so two
  personas seeded under different pod origins get identical generated values.
- Bnodes (nested bnode-shaped `sh:node` values) get deterministic labels from the canonical
  traversal (`_:i{index}n{k}`), so N-Quads/Turtle goldens are stable.

### 3.3 Pinned-override layer (scripted personas)

Overrides are exact values for named `(shape, instance, propertyPath)` coordinates:

- **Merge semantics:** an override *replaces* the full generated value set for that property
  on that instance; unnamed properties still generate; unnamed instances are untouched.
  An override naming a property the (closed) shape does not allow is an error — overrides are
  inside the conformance boundary, not an escape hatch.
- **Identity pins are two distinct kinds** (so §4.2 rebasing stays well-defined):
  `{fragment}` pins the instance's *destination-relative* name (rewritten to
  `{resource IRI}#{fragment}` at seed time), while `{external}` pins a *real, absolute* IRI
  (e.g. the persona's WebID) that rebasing preserves verbatim. Because a runtime `NamedNode`
  is invisible to source lints, external pins are **rejected unless exact-listed in the
  caller-supplied `allowedExternalIris` set** (default: empty — reject all). An exact-match
  set, not a predicate: a callback could admit whole prefixes of minted IRIs, an enumerated
  set cannot. The set is constructed from an explicit registry module in the consuming repo's
  source — persona WebIDs etc. — which IS what the repo's IRI-dereferenceability lint
  HEAD-checks; runtime exact-matching plus source-linting the registry together close the
  minted-IRI hole. Absolute IRIs under the placeholder base are always rejected.
- **Non-perturbation:** because streams are coordinate-keyed (§3.1), pinning one field never
  changes any sibling value. Tested by golden diff: flip one override, assert the delta is
  exactly that field.
- **Conformance:** validation (§3.5) runs *after* merge — a pinned value violating the shape
  (e.g. out of a decision-0005 digit budget) fails loudly at seed time, not at demo time.

### 3.4 Generator resolution order

Constraints are conjunctive; the first applicable strategy *drives* generation and the
remaining constraints are *checked* (violation = loud error, never silent nonconforming data):

1. **Pinned override** (§3.3)
2. **`sh:hasValue`** — the shape fixed the value
3. **`sh:in`** — deterministic pick from the enumeration (covers every SKOS-concept-valued
   mort property: `mort:maritalStatus`, `mort:titleStatus`, `mort:decisionStatus`, …)
4. **`sh:node` / `sh:class`** — recurse into the referenced shape (depth budget, default 3;
   cycle detection errors — mirrors RDFGraphGen's non-recursive requirement) or link into the
   already-generated instance pool for shared targets
5. **`sh:datatype` + facets** (`sh:min/maxInclusive`, `sh:min/maxExclusive`,
   `sh:min/maxLength`) — typed uniform draw within bounds. *This is where decision 0005
   binds:* the sm-19 shapes pin per-field bounds, so every generated `mort:creditScoreValue`
   is 300–850 and every `mort:monthlyGrossIncomeUsd`/`mort:totalMonthlyDebtUsd` sits inside
   its 4-digit budget with no mort-specific code in the generator
6. **`sh:pattern`** — deterministic expansion of a documented regex subset (literals, char
   classes, `\d`/`\w`, `{n,m}`/`?`/`+`/`*` with expansion caps, alternation); unsupported
   pattern syntax errors loudly
7. **Type-specific defaults** — per-datatype fallback (neutral word-lists for strings, window
   around `now` for dates), consultable *plugins* run here: an optional OWL/RDFS-range hint
   plugin (ontology input), an optional predicate-name-heuristics plugin (RDFGraphGen's tier),
   an optional pinned-version faker plugin. Plugins are deterministic functions of the
   sub-stream — they add value *quality*, never entropy.

Cardinality: count drawn from the instance's sub-stream within
`sh:minCount..min(sh:maxCount, minCount+2)` (default 1 when unconstrained). Closed shapes:
only declared properties are emitted, so `sh:closed true` + `sh:ignoredProperties` (the sm-19
convention) holds by construction. Out of v1 scope, error loudly: `sh:lessThan`-style
inter-field ordering (personas pin the DTI-coherent fields, §5.1), `sh:sparql`,
`sh:qualifiedValueShape`, non-predicate paths, `sh:languageIn`/`sh:uniqueLang` beyond a single
`@en` default.

### 3.5 Self-conformance gate

Two layers, with distinct dependency postures:

- **In core (always on, zero extra deps):** the driving strategy checks the *conjunctive*
  facets of the property it generated (§3.4) and errors loudly on any documented-unsupported
  constraint — nonconforming data is never emitted silently.
- **Independent validation (injected, required by default):** the merged output is checked by
  a real SHACL engine so the generator is never its own referee — in-core checks alone cannot
  catch bugs in their own targeting/constraint logic. `generate()` **requires** a
  `ShaclValidator`; the engine is injected (a `@jeswr/synthetic-rdf/validate` subpath export
  adapts `shacl-engine` for the one-liner) so the core still has no hard engine dependency.
  Skipping it is an explicit, greppable act: `generateUnchecked()` — same signature minus the
  validator — exists for bundle-sensitive browser paths whose exact inputs already passed a
  checked golden in CI, and its name is the warning label.

### 3.6 API sketch

```ts
import type { BlankNode, DatasetCore, NamedNode, Quad, Term } from "@rdfjs/types";

export interface SyntheticRdfOptions {
  shapes: DatasetCore;                     // SHACL shapes graph (caller loads it; no fetching)
  ontology?: DatasetCore;                  // optional OWL/RDFS range hints (plugin tier 7)
  seed: string;                            // REQUIRED and explicit — determinism is the contract
  now?: Date;                              // temporal anchor; REQUIRED if any temporal default fires
  targets?: readonly TargetSpec[];         // default: every sh:NodeShape with a target, count 1
  overrides?: readonly ShapeOverride[];    // pinned persona coordinates (§3.3)
  base?: string;                           // default "urn:synthetic:" — rebased by solid-seed
  mintIri?: (shape: NamedNode, index: number, base: string) => NamedNode;
  plugins?: readonly ValueGenerator[];     // tier-7 deterministic value-quality plugins
  maxDepth?: number;                       // sh:node recursion budget (default 3)
  validator: ShaclValidator;               // REQUIRED independent SHACL check (§3.5)
  /** {external} identity pins are accepted ONLY if exact-listed here (§3.3). Default:
   *  empty. Built from a source registry module that the repo's IRI-dereferenceability
   *  lint covers; an exact set (not a predicate) so prefix-shaped policies cannot
   *  readmit minted IRIs. */
  allowedExternalIris?: ReadonlySet<string>;
}

/** Adapter seam so the core never hard-depends on a SHACL engine. */
export interface ShaclValidator {
  validate(data: DatasetCore, shapes: DatasetCore):
    Promise<{ conforms: boolean; report: string }>;
}
// import { shaclEngineValidator } from "@jeswr/synthetic-rdf/validate"  ← optional adapter

export interface TargetSpec { shape: NamedNode; count: number; }

export interface ShapeOverride {
  shape: NamedNode;
  index?: number;                          // default 0
  /** Identity pin (§3.3): destination-relative fragment, or a real external IRI kept verbatim. */
  id?: { fragment: string } | { external: NamedNode };
  values?: Readonly<Record<string, Term | readonly Term[]>>;  // propertyPath IRI → exact terms
}

export interface GeneratedInstance {
  shape: NamedNode;
  index: number;
  focus: NamedNode | BlankNode;
  quads: readonly Quad[];                  // full instance subtree incl. nested bnodes
}

export interface SyntheticRdfResult {
  dataset: DatasetCore;                    // union of all instances
  instances: readonly GeneratedInstance[];
  /** Canonically sorted, pinned prefixes — byte-stable given equal inputs. */
  toTurtle(options?: { prefixes?: Readonly<Record<string, string>>; baseIri?: string }): string;
}

export function generate(options: SyntheticRdfOptions): Promise<SyntheticRdfResult>;
/** Escape hatch WITHOUT the independent SHACL check (§3.5) — the name is the warning. */
export function generateUnchecked(options: Omit<SyntheticRdfOptions, "validator">): SyntheticRdfResult;

/** Tier-7 plugin: return terms or undefined to pass. MUST draw only from context.random. */
export interface ValueGenerator {
  generate(context: GenerationContext): readonly Term[] | undefined;
}
export interface GenerationContext {
  shape: NamedNode; index: number; focus: NamedNode | BlankNode;
  property: PropertyConstraints;           // parsed sh:* facets for the current path
  random: SubStream;                       // coordinate-keyed deterministic stream
  now?: Date;
  ontology?: DatasetCore;
}
export interface SubStream {
  int(minInclusive: number, maxInclusive: number): number;
  pick<T>(items: readonly T[]): T;
  fork(key: string): SubStream;
}
```

### 3.7 Explicit non-goals

No LLM or statistical-realism generation (determinism is the contract; uniform draws only,
distribution plugins are a later seam). No network access (shapes/ontology arrive as
datasets). No OWL reasoning (Simple entailment, matching the ZK rail). No full regex. No
benchmark-scale features (that is rudof/WatDiv territory). No RDF parsing — callers parse;
the package speaks RDF/JS in and RDF/JS + Turtle out.

## 4. `@jeswr/solid-seed`

### 4.1 Harness seam (server-agnostic, structural)

solid-seed depends on *structural* interfaces that solid-kit's harness
(`SolidTestAccount`/`SolidTestServer`) already satisfies — no import edge, so any server
implementation behind the decision-0009 single-module swap works, as does the Mode-1
in-browser pod (whose dispatch is fetch-compatible):

```ts
export interface SeedTarget {
  webid: string;
  baseUrl: string;                         // pod origin; every resource path resolves against it
  authFetch: typeof fetch;
}
export interface AccountProvisioner {
  provisionAccount(webid?: string): Promise<SeedTarget>;
}
```

**Browser-safe core:** no Node built-ins anywhere in the main entry point — inputs are fetch
functions, RDF/JS datasets and strings. Server boot, ports and `node:http` stay in solid-kit;
solid-seed only ever *receives* live targets (or a provisioner). This single constraint is
what lets one seeding path serve the dev server, Playwright global-setup, and the Mode-1
in-browser pod.

### 4.2 Pod-layout spec

```ts
export interface PodLayout { pods: readonly PodSpec[]; }

export interface PodSpec {
  account: { target: SeedTarget } | { provision: { webid?: string } };
  /** Static entries, or expanders that materialise several related resources from ONE
   *  computation (e.g. one credential issuance → VC + anchor VCs + witness, §5.2). */
  resources: readonly (ResourceSpec | ResourceExpander)[];
}

export type ResourceExpander =
  (context: PodContext) => readonly ResourceSpec[] | Promise<readonly ResourceSpec[]>;

export interface ResourceSpec {
  path: string;                            // pod-root-relative: "/mortgage/credentials/income"
  source: DataSource;
  contentType?: string;                    // text/turtle default; application/ld+json for VCs
  access?: AccessSpec;                     // authored via @solid/object wrappers (house rule)
}

export type DataSource =
  | { instance: InstanceRef }              // a GeneratedInstance from synthetic-rdf
  | { dataset: DatasetCore }
  | { body: string };                      // pre-built (expanders emit these, §5.2)

export interface InstanceRef { shape: string; index?: number; }
export interface PodContext {
  webid: string; baseUrl: string;
  resolve(path: string): string;           // absolute resource IRI
  instances(shape: string): readonly GeneratedInstance[];
}

export interface AccessSpec {
  publicRead?: boolean;
  agents?: readonly { webid: string; modes: readonly ("read"|"write"|"append"|"control")[] }[];
}

export interface SeedOptions {
  layout: PodLayout;
  data?: SyntheticRdfResult;               // resolves InstanceRef sources
  provisioner?: AccountProvisioner;        // required iff any pod says "provision"
  mode?: "create" | "ensure" | "replace";  // default "create"
}

export interface SeedManifest {
  pods: readonly { webid: string; baseUrl: string;
                   resources: readonly { path: string; url: string; status: "created"|"skipped"|"replaced" }[] }[];
}

export function seedPods(options: SeedOptions): Promise<SeedManifest>;
```

**IRI rebasing.** Generated instances carry placeholder-base IRIs (§3.2). At write time the
instance's focus IRI becomes `{resource IRI}#{fragment}` (default fragment `it`, or the
override-pinned fragment) and cross-instance references are rewritten term-level from the
same mapping. Exactly one class of absolute IRI survives rebasing untouched: `{external}`
identity pins and any other real-world IRIs already present in the data (vocab terms, WebIDs,
FIBO individuals). Placeholder-base IRIs never reach a pod — an unmapped one at write time is
an error. Serialisation emits **relative IRIs with no base directive** for the rebased terms,
so the server resolves them against the resource URL — the same portability trick `seed.ts`'s
`publicReadAcl` uses, now applied to all seeded data; bodies containing only fragment-pinned
identities are therefore byte-identical across pod origins, and `{external}` pins (which are
origin-specific by nature) are the documented exception. Values are unaffected by rebasing
(§3.2 keying).

**Idempotence.** `create` keeps `seed.ts`'s strict `If-None-Match: *` semantics (a doubly
seeded pod is a harness bug — e2e default). `ensure` skips 412s (long-lived dev server
restarts). `replace` unconditionally PUTs — with deterministic bytes this converges: re-seeding
is a no-op state-wise. The manifest reports which branch each resource took.

**Expander groups: preflight consistency + convergent recovery.** The resources returned by
one `ResourceExpander` are mutually dependent (a VC and its anchors are cryptographically
paired, §5.2), so per-resource mode branching cannot apply inside a group. LDP offers no
multi-resource transaction, so the guarantee is honestly two-part rather than "atomic":

- *Preflight:* `ensure` probes existence of every member and either skips the whole group
  (all exist) or writes the whole group (none exist) — a partially existing group is an error
  naming the offending members, never a silent mix of an old VC with newly issued anchors.
  `create` fails if any member exists (each write additionally carries `If-None-Match: *`,
  so a probe-to-write race still cannot clobber); `replace` rewrites the whole group.
- *Recovery:* a failed PUT mid-group aborts the run; the manifest names written vs unwritten
  members, and the documented repair is a `replace` re-run — deterministic bytes (§3.1) make
  that convergent, so partial state is always driveable to consistency. Concurrent writers
  are out of scope by assumption: seeding targets pods under the caller's exclusive control
  (per-suite harness instances, the dev server before app traffic, the Mode-1 in-browser
  pod), and the design does not claim safety against a concurrently mutating pod.

Expanders run exactly once per seed run (their output is what defines the group's member
paths); the group decision governs the writes. The manifest reports groups as units.

**ACLs.** `AccessSpec` is authored through `@solid/object` access-control wrappers — the
generic upstream package must not replicate `seed.ts`'s pre-authored string template (house
rule: never string-concat `.acl`; the template was a bootstrap exemption). WAC first (the sparq
server speaks WAC); the wrapper layer keeps an ACP door open via `wacToAcp`.

### 4.3 Consumption points

| Consumer | Wiring |
|---|---|
| Dev server | boot harness (solid-kit) → `seedPods({mode: "ensure"})` |
| e2e global-setup | per-suite `startSolidServer()` → `seedPods({mode: "create"})`; account-per-write-test isolation unchanged |
| Mode-1 in-browser pod | tour app passes the in-browser pod's fetch as a `SeedTarget` — same layout module, zero Node APIs |

## 5. solid-mortgage layering (sm-65 scope)

### 5.1 Inputs and persona overrides

- **Shapes in:** `packages/data-model/shapes/` (sm-19) exported programmatically as a
  `DatasetCore` (new bead, §6) — the digit-budget bounds ride in on the shapes, so the
  generic generator enforces decision 0005 for free; a pinned value outside a budget is a
  seed-time validation failure.
- **Personas:** one `ShapeOverride[]` bundle per scripted persona in
  `packages/solid-kit/src/personas/`. Values are **fair-lending-aware**: scripted outcomes
  (approve/deny/conditions) are pinned orthogonally to any protected-class proxy — names,
  addresses and localities across personas are chosen so no ethnicity/sex/age-coded attribute
  correlates with an outcome (the Examiner View makes this scrutiny part of the demo). The
  generic package's neutral word-lists cover unpinned instances.
- Unpinned background instances (other applicants in a lender's list view, etc.) come from
  the same seed — visually plausible, byte-stable, no persona work.

### 5.2 Credential pipeline seam (sm-26 interface)

VCs are not PUT as raw generated Turtle — they pass through vc-kit issuance. The seam is a
solid-seed `ResourceExpander` (§4.2) wrapping one solid-mortgage-defined interface that sm-26
implements — **one `issue()` call materialises all of its resources** (VC + anchor VCs +
witness), so issuance is never repeated per resource and the outputs stay mutually consistent:

```ts
/** Implemented by sm-26 tooling (packages/vc-kit); consumed by the sm-65 layout module. */
export interface CredentialSeedPipeline {
  issue(input: {
    claims: GeneratedInstance;             // synthetic-rdf output for the credential subject
    credentialType: NamedNode;             // e.g. mort:EmploymentIncomeCredential
    subjectWebid: string;
    validFrom: Date; validUntil?: Date;    // explicit — the injected clock, never ambient
    hiddenFields?: readonly NamedNode[];   // fields needing operand anchors (decision 0012)
  }): Promise<{
    vc: string;                            // dual-signed JSON-LD (eddsa-rdfc-2022 + Schnorr-BJJ)
    anchors: readonly { field: NamedNode; operandEnc: string; vc: string }[];  // mort:ZkOperandAnchor VCs
    witness?: string;                      // borrower-only witness resource beside the VC
  }>;
}

/** sm-65 layout module: one issuance → N ResourceSpecs via a solid-seed expander. */
const incomeCredential: ResourceExpander = async (context) => {
  const issued = await pipeline.issue({ /* claims, hiddenFields, validity… */ });
  return [
    { path: "/mortgage/credentials/income", source: { body: issued.vc },
      contentType: "application/ld+json", access: incomeAccess },
    ...issued.anchors.map((anchor, i) => ({
      path: `/mortgage/credentials/income-anchor-${i}`,
      source: { body: anchor.vc }, contentType: "application/ld+json", access: anchorAccess })),
    ...(issued.witness === undefined ? [] : [{
      path: "/mortgage/credentials/income-witness",
      source: { body: issued.witness }, access: ownerOnly }]),
  ];
};
```

Contract points: `operandEnc` is computed (`encode_int_literal`) from the **same RDF literal
the generator placed in `claims`** — the seam passes terms, not re-parsed strings, so the
anchor can never drift from the seeded value. The **backdated employment VC** (decision 0012)
is just pinned pipeline input: `validFrom: now − 30d, validUntil: now + 14d` with the real
demo clock — genuinely near-expiry, no fake clock anywhere; goldens use a fixed `now`.

### 5.3 What stays in solid-mortgage

Only: the shapes export, persona override bundles, the layout module mapping shapes to the
SPEC §5 pod paths (`/mortgage/credentials/income`, …) with per-resource access rules, and the
`CredentialSeedPipeline` implementation. Zero generation or seeding logic — if any appears
here, it belongs upstream (extract-repeated-logic rule).

## 6. Acceptance criteria for the build beads

### sm-63 — `@jeswr/synthetic-rdf`

1. ESM TypeScript, RDF/JS types; **no Node built-ins, `Math.random`, `Date.now`, or
   `crypto.getRandomValues` in src** (lint-enforced).
2. Determinism: golden-file test asserting byte-identical `toTurtle()` for a fixed
   `(shapes, seed, targets, overrides, now)`, run green on a CI matrix of ubuntu + macos and
   two Node majors.
3. Resolution order of §3.4 implemented with per-tier unit tests: `sh:hasValue`, `sh:in`,
   datatype facets (both inclusive/exclusive bounds + length), pattern subset, `sh:node`
   recursion (depth cap + cycle error), `sh:minCount/maxCount`, closed shapes.
4. Non-perturbation: flipping one override changes exactly that field's quads (golden diff).
5. Self-conformance: in-core conjunctive facet checks always on; `generate()` requires an
   injected `ShaclValidator` (`./validate` adapter provided); the only unvalidated path is the
   explicitly named `generateUnchecked()`; every documented-unsupported constraint errors
   loudly (test per constraint). Core has no hard dependency on any SHACL engine.
   `{external}` identity pins are rejected unless exact-listed in `allowedExternalIris`
   (rejection test incl. placeholder-base and unregistered absolute IRIs).
6. Out-of-shape override → error; out-of-bounds pinned value → validation failure (test uses
   a decision-0005-style digit-budget shape).
7. SKILL.md + README; PR to `jeswr/solid-sdk` (Jesse-owned — PR in-scope).

### sm-64 — `@jeswr/solid-seed`

1. Browser-safe core: no Node built-ins in the main entry (enforced by a bundler/lint check);
   structural `SeedTarget`/`AccountProvisioner` — **no dependency on solid-kit or any server**.
2. Seeds a multi-pod layout against `@jeswr/solid-server` in tests: provisioned accounts,
   nested containers, correct `content-type`s.
3. Modes: `create` 412-fails on re-seed; `ensure` skips; `replace` re-run leaves pod state
   byte-identical (read-back assertion). Expander groups follow the preflight + convergent-
   recovery semantics of §4.2: partially existing group under `ensure` errors naming the
   offending members (partial-group test); aborted mid-group write is repaired by a
   `replace` re-run (recovery test); group `create` writes carry `If-None-Match: *`.
4. IRI rebasing: cross-instance references resolve to real pod IRIs; serialised bodies use
   relative IRIs (portability test: same layout on two origins ⇒ identical bodies for
   fragment-pinned data); `{external}` identity pins survive verbatim; an unmapped
   placeholder-base IRI at write time errors. `ResourceExpander` entries materialise once
   per seed run (single-issuance test, §5.2).
5. ACLs authored via `@solid/object` wrappers — no string-templated `.acl` (review gate);
   owner-control preserved on every ACL (the `seed.ts` lockout lesson, as a test).
6. Manifest returned and accurate per mode.
7. SKILL.md + README; PR to `jeswr/solid-sdk`.

### Bead updates (filed from repo root with `discovered-from:sm-62`)

| Action | Content |
|---|---|
| `bd update sm-63` | Point description at this doc §3 + §6 acceptance criteria |
| `bd update sm-64` | Point description at this doc §4 + §6 acceptance criteria |
| `bd create` (new, P2, `surface:packages/data-model`) | Programmatic shapes-graph export: `packages/data-model` exposes the sm-19 shapes as an RDF/JS `DatasetCore` (plus per-shape IRIs) so the sm-65 layer can feed the seeder without re-parsing files at every call site |

sm-65 already carries the rest of §5 (personas, layout, pipeline wiring, Mode-1 + e2e + dev
integration); no scope change needed there.
