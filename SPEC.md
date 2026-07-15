# Solid Mortgage Showcase — SPEC

Design of record. Research grounding: `docs/research/` (read `research-gaps.md` first — every
contradiction it raises is resolved by a numbered decision in `decisions/`). Task tracking:
beads (`bd`), prefix `sm-`. This SPEC is scene-driven: everything exists to make the five-scene
demo land with EDMA member organisations, then convert into a partner-built product.

## 1. Purpose

Show that Solid removes the defining frictions of a US mortgage application — repeated document
collection, stale verifications, PII sprawl across ~16 parties, zero borrower visibility — by
putting the borrower's data in a pod they control, verifications in reusable verifiable
credentials, and every access behind a consented, receipted grant. Quantified anchors for the
narration (sources in `docs/research/mortgage-process.md`): ~$11,600 cost to originate, 41–44
days to close, up to 12 days saved by GSE data-validation programmes, 14.7M-person and
885M-document industry breaches.

Audience: EDMA Solid CoP member organisations. Success = each org recognises its own seat in
the value chain (the apps are 1:1 with real GSE-approved verifier roles) and signs up to build
the production version.

## 2. The journey — five scenes

Regulatory timings are the script's skeleton; each scene names its rule.

| # | Scene | Beat | Anchor |
|---|---|---|---|
| 1 | **Fill the vault** | The Work Number, Finicity, and Equifax flows issue employment+income, asset, and credit-score VCs into the borrower's Data Vault | GSE-accepted verification suppliers (AIM / DU validation) |
| 2 | **Shop without undressing** | Borrower proves income ≥ $7,000/mo ∧ score ≥ 620 to **two competing lenders** (BofA-modelled, Fifth Third-modelled) via ZK — no values revealed, no credit pull, no PII left behind | ZK scoped to pre-qual only (decision 0005) |
| 3 | **One-click application** | Borrower picks a lender, grants scoped pod access; URLA prefills from the pod; Loan Estimate lands back in the pod | TRID: LE ≤ 3 business days |
| 4 | **Nothing goes stale** | 30 days later, pre-close freshness check: employment VC `validUntil` lapsed → one-click re-issue through the existing grant; AUS (Freddie-LPA-modelled) re-runs on granted data | Verbal VOE ≤ 10 business days (B3-3.1-04); freshness = re-issue, status list = revocation only (decision 0007) |
| 5 | **Close and stay in control** | CD 3 days early → eClose (eOriginal-modelled) → servicing transfers to the Truist-modelled servicer: borrower approves the new grant, revokes the lender, and reads the **consent-receipt ledger** — every access, receipted | TRID CD rule; RESPA transfer; ledger is app-level (decision 0006) |

Product-phase extensions (not in the 10-minute script): IRS 4506-C, UAD 3.6 appraisal
internals, ALTA title commitment detail, eNote/MERS eRegistry transfer, insurance binder.

## 3. Architecture

- **Pods**: every persona (borrower Alex Rivera + each stakeholder org) has a Solid pod +
  WebID. Dev/test pods run on sparq's WASM Solid server (§7). Deployed demo (decision 0011):
  **Mode 1 default = per-visitor in-browser sparq-wasm pods** in a SharedWorker runtime on ONE
  shared domain (Chrome storage partitioning + the vercel.app PSL entry make cross-origin pod
  sharing impossible — hence multi-zones, §8); **Mode 2a = org/stakeholder pods on a hard
  read-only multiplexed sparq-wasm Vercel Node/Fluid function** (seeded WAC public-read,
  GET/HEAD/OPTIONS + query-only /sparql, $0/mo, org WebIDs dereferenceable — decision 0013);
  **Mode 2b = deploy-on-demand CSS** only for real-login beats and facilitated multi-actor
  sessions. Partner phase migrates to sparq-lws-core native + Keycloak once the sm-5 upstream
  items land.
- **Credentials**: W3C VC 2.0 JSON-LD via `@jeswr/solid-vc`; ZK-participating credentials
  dual-signed at seed time by sparq native tooling (decision 0004). Stored in the pod under
  `/credentials/`, access-controlled; ZK witness inputs beside them, borrower-only.
- **ZK**: sparq Noir/UltraHonk stack, Tier A live in-browser (`filter_int_d3/d4`,
  noir_js + bb.js pinned, COOP/COEP for multithreading), Tier B native-precomputed manifests
  verified live (decision 0005). Honesty panel on every ZK surface.
- **Access control**: WAC only (C8). Grants created/revoked by the wallet; every change writes
  a DPV consent receipt (decision 0006).
- **Presentation protocol** (decision 0012): dual rail — challenge'd **VP-POST** to the
  verifier's API (per-session nonce, DPoP-bound Solid-OIDC holder auth via
  `@jeswr/solid-api-auth`, OID4VP-`direct_post`-shaped for partner-phase migration) for proofs;
  **pod-native ODRL/DPV grants** (access-manager pipeline) for data access. Every Tier A live
  proof requires the issuer-signed **operand-anchor VC** check — a bare filter proof is
  forgeable (deterministic salt-free operand_enc). Tier B copy: "proved offline · verified
  live". Bitstring Status List 1.0 per issuer; scene-4 freshness via backdated seeded VCs
  (validFrom −30d / validUntil +14d) — no fake clock.
- **Org identity**: stakeholder orgs referenced by GLEIF LEI in RDF; vLEI is product-phase
  narrative only (C5). Demo WebIDs on domains we control; no minted IRIs (decision 0010).

## 4. Applications

Eight apps (decision 0002 — full table with org rationale there): `tour` (EDMA CoP front door +
Examiner View), `wallet` (Verizon-modelled Data Vault — decision 0003), `verifications` (three
branded issuer flows), `lender-boa` (full origination portal), `lender-53` (thin competing
pre-qual), `gse` (Freddie-LPA-modelled AUS), `property` (Cotality appraisal + First American
title flows), `closing` (eOriginal-modelled eClose + Truist-modelled servicer handoff).

Per app: Next.js App Router + shadcn/ui + Tailwind, per-org theme tokens from `packages/ui`,
shared ConceptDemoBanner (unremovable, e2e-asserted), `simulated: true` on every API payload,
noindex. The tour app follows the volunteering tour pattern: chapters-as-data, single service
registry driving map/launcher/try-this-live, live-status dock, copy-ready demo identity,
"what just happened underneath" panels for the ZK beats.

## 5. Data model

FIBO-primary (LOAN/FBC/FND modules — dereference-checked), URLA-aligned controlled vocabularies
from FIBO named individuals; MISMO v3.4/ULAD as a **documentation-level field mapping**
(`docs/mismo-mapping.md` — the CoP bindings deliverable); schema.org for person/address; DPV
for consent; ODRL for grant policies; VC 2.0 for credentials. Residue vocab (`mort:`) published
per decision 0010 — **no `mort:` IRI minted before the vocab site is live**. Nine resource
shapes (borrower profile; employment+income, asset, credit-score, appraisal-value, title-clear
credentials; loan application; underwriting decision; closing record) each with one closed
SHACL shape, pyshacl-validated in CI. ZK-provable fields use per-field scaled units within
digit budgets (decision 0005) — the field-by-field table lives in `packages/data-model` and
supersedes vocab.md §6 where they conflict.

All RDF through `@solid/object` + `@rdfjs/wrapper`; fetch via `@jeswr/fetch-rdf`; Turtle +
JSON-LD only; `.acl` only via access-control wrappers; `lint:iris` gates CI.

## 6. Trust & honesty rails

Branding: role-first ("modelled on X"), name + palette only, no logos/trade dress, consent
interstitial, per-org sign-off before partner-phase use (decision 0002). Copy constraints from
research: Mastercard membership caveated (C4); eOriginal share dated Jan-2022; Microsoft =
workgroup participant (C12). ZK honesty panel verbatim on every proving surface (decision
0005). The Examiner View is unbranded and states non-affiliation with the CFPB. Reg N/MAP-Rule
optics review is a P1 bead before deploy (M3).

## 7. Dev/test infrastructure

Dev + e2e Solid server = sparq `@jeswr/solid-server` (sparq-lws-wasm), vendored as a packed
tarball until Jesse's npm bootstrap publish (needs:user). The dev host converges on a
Fastify-mounted pod (upstream ask [sparq#2323](https://github.com/sparq-org/sparq/issues/2323):
`createSolidPod().dispatch()` + first-party Fastify plugin; stopgap plugin in solid-kit only
if needed sooner — decision 0013). ONE harness module in
`packages/solid-kit` owns boot + account/pod seeding ({baseUrl, accounts, stop()},
provisionAccount) so the server implementation is a single-module swap (decision 0009);
per-suite in-memory instances on random ports; multi-identity WAC tests lift sparq's
oidc.test.mjs dev-issuer fixture with oidc:true. Poll with If-None-Match (no notifications in
wasm — upstream queue). Cross-app e2e: global-setup-owned lifecycle. Unit = Vitest;
e2e = Playwright + axe per state. Upstream gap queue for sparq (sm-5 children): dev-issuer
module in the Node host, host-level multi-pod provisioning, changed-topic metadata + host-side
WebSocketChannel2023, JS-exposed store/body limits, GHCR image publish + S3 BlobStore + fixture
seeding (the decision-0011 partner-phase gate), plus whatever the harness work surfaces.

**Ontology-driven synthetic seeding** (Jesse-directed): dev/e2e pod data comes from a
deterministic generator that inspects the ontologies + SHACL shapes the apps work with and
produces conforming instance data (seeded PRNG, stable IRI allocation, pinned overrides for the
scripted demo personas — e.g. the backdated employment VC). The generic tooling is built
upstream in jeswr/solid-sdk in its entirety — `@jeswr/synthetic-rdf` (shape-driven generation)
and `@jeswr/solid-seed` (account/pod provisioning + resource writes through the harness
interface) — with solid-mortgage layering only the mort-specific shapes and persona overrides.
Design starts from a survey of existing SHACL/RDF synthesis tooling before building anew.

## 8. Deployment

Eight Vercel projects from this one private repo, served under **one shared demo domain via
Next.js multi-zones** (plain rewrites; NOT the paid Microfrontends product) with the tour app
as shell — required by decision 0011's in-browser pod mode. Per-app `vercel.json` +
`npx turbo-ignore`; deterministic aliases before first deploy; env matrix in `docs/deploy.md`;
root `.vercelignore` excludes docs/. Plus the `solid-mortgage-vocab` project (decision 0010)
and the Mode-2 hosted CSS instance (Fly ~$3/mo or existing EC2 vhost; `needs:user` for DNS).
COOP/COEP headers on proving/verifying apps — verify they coexist with zone rewrites during the
deploy bead.

## 9. Quality bar

`pnpm run gate` (Turbo affected: lint → build → typecheck → test) green on every PR; roborev on
every commit (Sol reviews; Fable security reviews — decision 0008); Copilot review addressed
before merge; axe on every e2e state; `lint:iris` and SHACL in CI; drain-verify never
auto-merges security surfaces. Model division of labour per decision 0008 — Sol never owns its
own acceptance tests.

## 10. Work breakdown

The full decomposition lives in beads (`bd list`), created by the sm-2 planning pass:
epics sm-3..sm-11 with fine-grained children, `surface:*` labels for collision-free drain
dispatch, `needs:user` for Jesse-gated unblocks (npm bootstrap publish; vocab domain choice;
Vercel GitHub-app access; CoP delivery-format question Q15).

## 11. EDMA sales enablement pack

The showcase converts through EDMA's people, not by itself. `docs/sales/PLAN.md` defines the
full pack (Jesse-directed): master pitch narrative + quantified-benefits sheet; tailored
per-organisation one-pagers (built from the org-map propositions + "your seat in the demo"
mapping); contact & outreach plan (public roles/EDMA-internal routes, DEP-founders-first
sequencing); recorded demos (scripted Playwright captures of the full 10-minute journey plus
per-stakeholder cuts, once apps are live); technical FAQ + the FIBO↔MISMO binding table
packaged as the CoP standards artifact; and a partner-phase product-proposal template per
role. Built in full at the point each input exists (text after research ✓, recordings after
deploy) — tracked as the sales epic in beads.

## 12. Partner-phase approach list

Outreach leads: **Freddie Mac and Fifth Third (both DEP Founders)**, then Bank of America,
Mastercard (after membership re-verification), Wolters Kluwer, Verizon, USAA, GLEIF within the
member base; external approaches for the four roles with no member: **Equifax** (bureau + The
Work Number), **Cotality** (appraisal), **First American** (title), plus MISMO engagement via
open workgroups. PMI has no US member — external-recruitment gap. Full rationale:
`docs/research/org-map.md`.
