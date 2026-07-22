# GLEIF-anchored business KYB showcase — design-of-record (sm-4f1z)

Design of record for **Demo 3**: reusable **organisational-identity + beneficial-ownership**
credentials for US small-and-mid-size-business (SMB) KYB onboarding — the scientifically
selected winner of `docs/research/demo3-poc-selection.md` (**Candidate B, weighted score
4.65/5**, vs. runner-up insurance portability at 3.75/5). This document expands that
selection's §7 design sketch into the full build design, mirroring
`docs/research/small-dollar-lending-design.md`'s structure and depth. **Design/research only —
no app is built here.**

Same trust rails as Demos 1–2: role-first "modelled on X" branding, visible "concept
demonstration — not affiliated with or endorsed by <org>" disclaimers on every branded surface,
`noindex`, no real PII, fictional personas only, W3C VC 2.0 + FIBO-grounded RDF, sparq
Noir/UltraHonk ZK with the honesty panel, WAC + DPV consent receipts. EDMA membership claims
come from the internal role-map sheet (snapshot 4 Jun 2026, via `docs/research/org-map.md`) and
are **flagged for re-verification before any partner outreach**. All web facts cited here were
verified or re-verified **2026-07-22** (FIBO-BE dereferenceability checks are new to this
document — see §3).

**The lending demo's vocab mistake, and how this doc avoids it.** Demo 2 shipped
`urn:example:lend#` — a non-dereferenceable placeholder namespace — as a build-time error (now
tracked as a follow-up bead). This design specifies the Demo 3 project vocab as a **named,
real, to-be-published Vercel URL** from the start (§3.5), following the mortgage decision-0010
pattern exactly: **no `kyb:` IRI is minted into committed RDF before that project is live.**

---

## 1. Use case + goal

**Thesis.** A US business proves who it is and who controls it **once**, holds that proof in a
pod it controls, and reuses it across every bank, regulator, and counterparty that needs
it — instead of re-submitting formation documents, EIN letters, and cap tables to each new
relying party from scratch. This is the organisational-identity/trust layer that Demos 1 and 2
both explicitly *deferred* ("vLEI is product-phase narrative only" — SPEC §3 C5, decision 0004,
org-map row 10) — Demo 3 is where that layer finally gets built.

**The pain, quantified** (full citations + verification caveats in
`docs/research/demo3-poc-selection.md` §5, §8 — repeated here only where load-bearing):

- **70% of banks lose clients** to slow business-onboarding
  ([Fintech Global](https://fintech.global/2025/10/08/70-of-banks-lose-clients-due-to-slow-onboarding/)).
  A regional-bank KYB automation case study documents onboarding cut **from 5 days to under 24
  hours** ([iComply](https://icomplyis.com/smarter-kyb-for-u-s-community-banks-uncovering-risk-in-smb-accounts/)).
- **AML/KYC/sanctions penalties: $1.23B in H1 2025, a 417% YoY increase** (North America alone
  up 565%) — the KYB-specific, load-bearing regulatory-cost figure
  ([Fenergo](https://resources.fenergo.com/newsroom/regulatory-penalties-for-global-financial-institutions-skyrocket-417-in-h1-2025)).
  (The originally-drafted "$19.3B AML fines" figure was corrected in the selection doc: that
  number is *global regulatory fines*, FTX-fraud-skewed, not AML/KYB-specific — never repeat it.)
- **The reusable-org-credential thesis is live and member-led.** GLEIF's vLEI is an
  organisation-anchored Verifiable Credential now in open pilot registration, convened via the
  2026 **GLEIF Partners Programme**
  ([GLEIF](https://www.gleif.org/en/organizational-identity/introducing-the-verifiable-lei-vlei)).
  The **BIS Innovation Hub's Project Aperta** (reported 2026) tested vLEI as a cross-border
  open-finance trust layer with UK/UAE/Brazil/Hong Kong/India monetary authorities, reporting
  (directionally, no hard metric) that "reusable organizational credentials could reduce
  repeated onboarding checks and accelerate account opening" for SMEs
  ([Biometric Update](https://www.biometricupdate.com/202606/gleif-bis-test-vlei-as-trust-layer-for-cross-border-open-finance)).
- **The pain survives regulatory turmoil because it is anchored in the bank's own obligation,
  not a reporting mandate.** FinCEN's March 2025 interim final rule removed beneficial-ownership
  **reporting** for US domestic companies (Corporate Transparency Act), exempting >99% of
  previously-covered entities
  ([FinCEN](https://www.fincen.gov/news/news-releases/fincen-removes-beneficial-ownership-reporting-requirements-us-companies-and-us)).
  But the demo's pain is the **bank Customer Due Diligence (CDD) Rule** — 31 CFR §1010.230 (live,
  verified 2026-07-22: <https://www.ecfr.gov/current/title-31/subtitle-B/chapter-X/part-1010/subpart-C/section-1010.230>)
  — which independently requires a covered financial institution to identify and verify, at
  account opening, **each individual owning ≥25% of a legal-entity customer** plus **one control
  person**, regardless of the CTA's reporting-side status. On 13 Feb 2026 FinCEN granted
  exceptive relief from *re-verifying* beneficial owners when an *existing* customer opens
  *another account at the same bank*
  ([Mintz](https://www.mintz.com/insights-center/viewpoints/54751/2026-02-18-fincen-eases-beneficial-ownership-verification)) —
  which narrows same-bank-repeat-account pain but leaves untouched the pain this demo
  dramatizes: **the full 25%-threshold verification obligation still applies at every new
  bank.** Demo copy must say "each new bank," never "each new account."

**Complementary, not a third lending demo.** Demos 1–2 are both *consumer* credit journeys
sharing the same rails (Mastercard/Finicity, Equifax/Work Number, GLEIF-as-org-identity-only).
Demo 3 opens a genuinely new **B2B / business-banking** audience and finally exercises GLEIF as
an active **issuer**, not a reference.

---

## 2. Stakeholder cast / app registry

### 2.1 Roles (ecosystem map — ports `demo3-poc-selection.md` §7(a) into registry form)

Real EDMA-member organisations where a member owns the seat; concept-demo "modelled on X, not
affiliated with or endorsed by X" framing throughout (decision 0002 / regn-optics rules
R1–R8, carried over verbatim). Membership per `org-map.md` snapshot (4 Jun 2026) —
**re-verify before outreach** (Mastercard¹, Verizon¹ flagged, per org-map C4).

| Role slug | Role | Modelled on | EDMA? | Apps | Scene(s) |
|---|---|---|---|---|---|
| `vault` (**center**) | Business data vault | **Verizon** | Member¹ | `vault` | 1–6 |
| `org-identity` | Organisational-identity + officer-role issuer | **GLEIF** | Member | `issuers` | 1 |
| `bo-registrar` | Incorporation + beneficial-ownership data source | *unbranded business registry / FinCEN BO source* | — | `issuers` | 1 |
| `bank-onboarding` | Business banking KYB relying party | **Bank of America** | Member | `bank-onboarding` | 2, 4 |
| `bank-credit` | Competing KYB relying party + credit line | **Fifth Third Bank** | Member + **DEP Founder** | `bank-credit` | 3, 5, 6 |
| `open-finance` | Business account / cash-flow verification rail | **Mastercard (Open Banking)** | Member¹ | — (folded into `bank-onboarding`) | 2 |
| `regulator` | Compliance lens over the FinCEN CDD Rule | *unbranded "Examiner View"* | — | — (inside `tour`) | 6 |
| `standards` | Data / standards steward | **EDMA/OMG (FIBO-BE)** + **GLEIF (LEI)** | itself | — | all |

¹ Mastercard and Verizon membership are internal-sheet-only (org-map C4) — re-verify before
outreach.

### 2.2 Application registry (build plan for `create-solid-demo`)

**Five zone apps + tour shell — six total**, matching the effort band the selection doc scoped
(§7(f): "per-org themes for ~6 apps"). Slugs are **role-derived, never org-derived** (R4 rule).
`deploy: { slug: "kyb", envPrefix: "KYB" }`.

| Slug | App | Modelled on | Role | Scenes |
|---|---|---|---|---|
| `tour` | KYB Trust Tour (shell) | EDMA Solid Community of Practice | Convener; chapters, ecosystem map, launcher, Examiner View | all |
| `vault` | Business Data Vault | Verizon | Business pod: org-identity/BO/officer credentials, access grants, consent-receipt ledger, revocation | 1–6 |
| `issuers` | Formation & Identity Registrar | **GLEIF**-modelled (2 flows: org-identity, officer-authorization) + unbranded registry-modelled (1 flow: incorporation + beneficial-ownership) | Three issuer flows, one app (mirrors Demos 1–2's `verifications` pattern) | 1 |
| `bank-onboarding` | Business Banking Onboarding | Bank of America | Full KYB/CDD relying party: consumes org-identity + BO VCs directly (disclosed — CDD needs actual values); folds in the Mastercard-modelled business-account-verification flow | 2, 4 |
| `bank-credit` | Business Credit Desk | Fifth Third Bank | ZK beneficial-ownership predicate at pre-decision; credit-line underwriting; ownership-change re-check | 3, 5 |

**Design choices** (mirroring the lending demo's foldable-app pattern): (a) Mastercard's
open-finance/account-verification rail is a **data flow inside `bank-onboarding`**, not a
seventh app — it has a mapped ecosystem-map role with `apps: []` (the framework's honest
"mapped seat, no dedicated app" pattern), same treatment `showcase-framework-design.md` gives
app-less roles; (b) the Examiner View lives inside `tour`, as in Demos 1–2; (c) scene 4's
"reuse" contrast is narrated inside `vault` + `tour` chapter content rather than a seventh app
(§5, scene 4) — no new interactive surface is required to make the reuse payoff land.

---

## 3. Credential + data model

### 3.1 Grounding — FIBO Business Entities is a direct hit, and it is more complete than the
selection doc's hedge suggested

`demo3-poc-selection.md` §7(d) flagged `BE/LegalEntities/LegalPersons` and
`BE/OwnershipAndControl/OwnershipParties` as returning "303/See-Other today" and asked the
data-model bead to confirm class-by-class coverage. **Re-verified 2026-07-22, resolved
positively**: the 303 is standard HTTP content negotiation (`Accept: text/turtle` → 303 → the
concrete `.ttl` representation, final status 200) — **exactly the same pattern already verified
for the LOAN modules in `docs/research/vocab.md`**, not a dereferenceability failure. Fetched
directly (`curl -H "Accept: text/turtle" -L`, final `200 text/turtle` in every case):

| Module | Namespace IRI | Final status |
|---|---|---|
| Legal Persons | `https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LegalPersons/` | 200 `text/turtle` |
| LEI Entities | `https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LEIEntities/` | 200 `text/turtle` |
| Ownership Parties | `https://spec.edmcouncil.org/fibo/ontology/BE/OwnershipAndControl/OwnershipParties/` | 200 `text/turtle` |
| Executives | `https://spec.edmcouncil.org/fibo/ontology/BE/OwnershipAndControl/Executives/` | 200 `text/turtle` |
| Formal Business Organizations | `https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/FormalBusinessOrganizations/` | 200 `text/turtle` |

Not only does FIBO-BE cover the domain — the **LEIEntities** module is explicitly modelled from
GLEIF's own data: its class/property comments carry `cmns-av:adaptedFrom` annotations citing
`gleif.org/en/about-lei/common-data-file-format/...` and **ISO 17442/ISO 20275** directly. This
means the FIBO-BE ↔ GLEIF LEI binding (§3.4) is not an analogy EDMA is asked to accept — **FIBO
already states the binding as ontology provenance.** All maturity: `Release` (not Provisional).

### 3.2 The three new VC types

| VC type (`kyb:` local name) | Primary vocab (real, verified IRIs) | Issuer (modelled on) | ZK-participating? |
|---|---|---|---|
| **Organisational-Identity Credential** | `fibo-be-le-lei:LEIRegisteredEntity` (⊑ `cmns-org:LegalPerson`, `owl:equivalentClass [isIdentifiedBy some LegalEntityIdentifier]`) + `fibo-be-le-lei:LegalEntityIdentifier` (ISO 17442) + `fibo-be-le-lei:EntityLegalForm`/`hasLegalForm` (ISO 20275 code) + `fibo-be-le-lp:BusinessEntity`; `schema:Organization` as secondary display type | GLEIF | No — disclosed at KYB (bank needs the actual LEI/entity-form to check its own sanctions/registry lookups) |
| **Beneficial-Ownership Credential** | `fibo-be-oac-opty:EntityOwnership`, `EntityOwner`/`ConstitutionalOwner`/`Investor`, `hasOwningEntity`/`hasOwnedEntity`, `fibo-be-le-lei:hasOwnershipPercentage` (`xsd:decimal`, GLEIF-Level-2-Relationship-Record-adapted) | unbranded registry/FinCEN-BO-source-modelled | **Yes** — the ZK predicate (§4) proves a threshold/completeness property over this credential's per-owner percentages without disclosing them pre-decision |
| **Officer-Authorization Credential** | `fibo-be-oac-exec:Signatory`, `CorporateOfficer`, `AuthorizedIndividual`, `hasSigningAuthorityFor`, `isOfficerOf`, `hasCorporateOfficer` — the vLEI **OOR** (Official Organizational Role) / **ECR** (Engagement Context Role) analogue, as a plain W3C VC | GLEIF (same issuer surface as org-identity — vLEI's own OOR/ECR credentials are issued by the same Qualified vLEI Issuer ecosystem) | No |

**vLEI posture (unchanged from Demos 1–2, now actively exercised rather than deferred).**
GLEIF's vLEI runs on **KERI/ACDC**, not W3C VC 2.0 JSON-LD (SPEC §3 C5, decision 0004, org-map
row 10). This demo does **not** claim to *be* vLEI. It builds **W3C VC 2.0 credentials carrying
the LEI (and the OOR/ECR role concepts) as identifiers/claims**, with on-screen copy stating
"vLEI is the product-phase upgrade path" — the exact pattern Demos 1–2 already use for GLEIF,
now finally dramatized as working scenes instead of a reference. Verified directly against
GLEIF's own vLEI page (2026-07-22): vLEI "enables counterparties to computationally verify the
identity, authority, and role of people acting on behalf of any legal entity," governed by
**ISO 17442-3** (2024) — which is exactly why this demo splits an Organisational-Identity VC
(entity, LEI-anchored) from an Officer-Authorization VC (role, OOR/ECR-analogue) rather than one
undifferentiated credential.

### 3.3 SHACL shapes (four, each `sh:closed true`, pyshacl-validated in CI)

| Shape | Resource | Key constraints |
|---|---|---|
| `OrganisationalIdentityCredentialShape` | `/kyb/credentials/org-identity` | `sh:class fibo-be-le-lei:LEIRegisteredEntity`; LEI string constrained to ISO 17442's 20-char alphanumeric lexical form (with the demo's own **obviously-fictional marker** — see §7); `hasLegalForm` `sh:in` an `EntityLegalFormScheme` individual set (LLC, Corp, LLP at minimum) |
| `BeneficialOwnershipCredentialShape` | `/kyb/credentials/beneficial-ownership` | ≥1 `EntityOwnership` blank-node-or-IRI members, each `sh:class fibo-be-oac-opty:EntityOwnership`, each with exactly one `hasOwningEntity` (range `cmns-org:LegalPerson`), one `hasOwnedEntity` (Northwind), and a ZK-provable **`kyb:ownershipPercentageBps`** companion (`xsd:integer`, `sh:minInclusive 0`, `sh:maxInclusive 10000`) alongside the disclosed `fibo-be-le-lei:hasOwnershipPercentage` (`xsd:decimal`) — same disclosed-plus-ZK-scaled-companion pattern as `vocab.md` §6's `mort:*Cents` fields; sum-to-10000bps is a shape-adjacent *data* invariant checked at seed time, not SHACL-expressible |
| `OfficerAuthorizationCredentialShape` | `/kyb/credentials/officer-authorization` | `sh:class fibo-be-oac-exec:Signatory` (or `CorporateOfficer`); `hasSigningAuthorityFor` → Northwind; subject WebID = `credentialSubject.id` (holder-binding, per house rule) |
| `KybCddDecisionShape` | `/kyb/decision` (bank-written) | `kyb:cddDecisionStatus` (SKOS: opened / declined / pending-review — no FIBO status individuals found in the fetched BE modules, same gap pattern as mortgage's `mort:decisionStatus`), `kyb:cddCheckDate`, references to the specific org-identity + BO credential versions checked (freshness audit trail) |

### 3.4 The standards artifact — FIBO Business Entities ↔ GLEIF LEI ↔ FinCEN CDD binding table

This **is** the CoP deliverable (analogue of Demo 1's FIBO↔MISMO table and Demo 2's FIBO↔FDX
table) — and per §3.1, FIBO's own ontology provenance annotations make this binding unusually
well-documented rather than inferred.

| FIBO-BE concept (verified IRI, local name) | GLEIF concept | FinCEN CDD concept (31 CFR §1010.230) | `kyb:` project term |
|---|---|---|---|
| `fibo-be-le-lei:LEIRegisteredEntity` | LEI-registered legal entity (GLEIF golden record, Level 1) | "legal entity customer" | `kyb:OrganisationalIdentityCredential` |
| `fibo-be-le-lei:LegalEntityIdentifier` (ISO 17442) | the LEI code itself | entity identifier on the CDD certification form | — (disclosed literal) |
| `fibo-be-le-lei:EntityLegalForm`/`hasLegalForm` (ISO 20275 code list) | GLEIF's Entity Legal Form (ELF) code list | entity-type field | — |
| `fibo-be-le-lp:BusinessEntity` | — | scope of "legal entity customer" (excludes sole proprietorships/trusts per the Rule's carve-outs) | — |
| `fibo-be-oac-opty:EntityOwnership`, `hasOwningEntity`, `hasOwnedEntity` | GLEIF **Level 2 Relationship Record** (`isDirectlyConsolidatedBy` etc. — same module family) | the ownership prong of beneficial ownership | `kyb:BeneficialOwnershipCredential` |
| `fibo-be-le-lei:hasOwnershipPercentage` (`xsd:decimal`) — **its own annotation says "adapted from" the GLEIF LEI CDF relationship-record format** | GLEIF RR "percentage of ownership" | the **≥25%** beneficial-owner threshold (the ZK predicate operand, §4) | `kyb:ownershipPercentageBps` (ZK-provable scaled companion) |
| `fibo-be-oac-opty:ConstitutionalOwner`/`EntityOwner`/`Investor` | — | "beneficial owner" (ownership prong) | — |
| `fibo-be-oac-exec:Signatory`, `CorporateOfficer`, `AuthorizedIndividual`, `hasSigningAuthorityFor`, `isOfficerOf` | vLEI **OOR** (Official Organizational Role) analogue | the **control person** prong (one required regardless of ownership %) + the authorized signer opening the account | `kyb:OfficerAuthorizationCredential` |

### 3.5 Project vocab (`kyb:`) — real, published URL, no repeat of the lending mistake

Per decision-0010's exact pattern: a **dedicated, tiny Vercel project**, not a `urn:example:`
placeholder.

| Aspect | Decision |
|---|---|
| Project | `solid-kyb-vocab` (new Vercel project, mirrors `solid-mortgage-vocab`) |
| Namespace | `https://solid-kyb-vocab.vercel.app/kyb#` — hash namespace, single fetch, no conneg infra needed |
| Artefacts | One source of truth `vocab/kyb.ttl` → Turtle + JSON-LD + HTML (pyLODE) at the namespace URL, exactly like `mort.ttl` |
| **Hard rule** | **No `kyb:` IRI is minted into committed RDF before this project is live** — same veto-window discipline as decision 0010 |
| Known residue (candidates, minted only at publication) | `kyb:OrganisationalIdentityCredential`, `kyb:BeneficialOwnershipCredential`, `kyb:OfficerAuthorizationCredential` (credential subtypes — FIBO has the underlying classes but not W3C-VC-typed wrappers, same pattern as mortgage's `mort:EmploymentIncomeCredential` etc.), `kyb:ownershipPercentageBps` (ZK-scaled companion), `kyb:cddDecisionStatus` (SKOS ×3 — no FIBO status individuals found), `kyb:BeneficialOwnershipVerificationPurpose` (a `dpv:Purpose` `skos:Concept` — DPV core has no KYB/CDD-specific purpose concept, the same gap `vocab.md` §3.4 notes for mortgage underwriting) |
| CI | Every `kyb:` term used in code/shapes must exist in the published file; `lint:iris` 7-day-cache gate covers `kyb:` like any other namespace; FIBO-BE `Release`-maturity modules re-checked on FIBO quarterly releases (same discipline `vocab.md` recommends for `Provisional` LOAN modules — BE modules used here are all `Release`, lower churn risk) |
| Everything else | schema.org secondary/display typing only (`schema:Organization`, `schema:Person`, `schema:PostalAddress`); DPV for consent; ODRL for grant policies; W3C VC 2.0 credential envelope — same as Demos 1–2 |

---

## 4. The ZK predicate

**Statement:** *"No undisclosed beneficial owner holds ≥25% of Northwind Logistics LLC — the
disclosed ownership set is complete."* This is the demo's signature ZK beat and, per the
selection doc's red-team (§6), the **one genuinely novel circuit** and principal build risk —
it is a **set/threshold/completeness** predicate, not the single hidden-operand numeric
inequality (`filter_int_d{1..4}`) the current sparq circuits compile for a single value
(`zkp-fit.md` Q1). This design decomposes it into what is and isn't provable today per
`zkp-fit.md`'s actual compiled circuit family list:

| Sub-proof | Circuit member (per `zkp-fit.md`) | Tier | What it proves |
|---|---|---|---|
| Per-owner ≥25% threshold | `filter_int_d4` (income/score pattern reused — `kyb:ownershipPercentageBps` ≤ 4 digits, 0–10000) | **A — live, in-browser** | For each disclosed owner the bank is told is "≥25%", the hidden basis-points value really is ≥2500, without revealing the exact percentage |
| Completeness of the disclosed-owner set (no undisclosed owner ≥25% exists) | `scan_k{1,2}_n{16,64}_r{4,8}` (BGP scan with completeness) combined with the per-owner filter and `hidden_issuer_d4` (issuer-in-trusted-set) + `revoke_unset_d10` (not-revoked) | **B — precomputed offline, verified live** | The full owner list committed in the Beneficial-Ownership Credential's graph has been scanned completely and every owner above threshold is exactly the disclosed set — the composed manifest sparq's `sparq-zk-compose` builds via native `nargo`/`bb`, matching the `ProofManifest` pattern already used for Demos 1–2's cross-credential join beat |
| Holder binding | `holder_pok` | A | Jordan (the presenting WebID) controls the credential being proved over |

**Operands/anchors** (per decision 0012's mandatory posture, carried over unchanged): every
Tier A statement requires an issuer-signed **operand-anchor VC**
(`kyb:ZkOperandAnchor`: field IRI + `operandEnc` + subject WebID + `credentialStatus`,
`eddsa-rdfc-2022`) — a bare filter proof is forgeable without it. The Beneficial-Ownership
Credential is therefore **dual-signed at seed time** (decision 0004 pattern): `eddsa-rdfc-2022`
for the standards-disclosure story, Schnorr-over-Baby-JubJub for the ZK commitment, exactly as
Demos 1–2's income/score credentials are.

**Why Tier B, not a single novel Tier-A circuit.** The selection doc's mitigation (§6) is
adopted as-is: fall back to **Tier B** ("proved offline · verified live," decision 0012 copy) for
the completeness beat if the live composed circuit isn't ready in time, and/or scope the ZK
beat down further to "owner-count ≤ N disclosed" as a simpler fallback predicate. **File a
`vc-kit` research spike bead before the walkthrough script commits to the live-proof claim in
scene 3** — this is this demo's equivalent of Demos 1–2's cross-credential `join_eq` beat, but
harder, because it composes scan + per-owner filter + issuer-membership + revocation in one
manifest rather than a two-credential join.

**House rule respected throughout:** the ZK beat only runs at the *pre-decision* moment (Bank
of Fifth Third's pre-qual/pre-decision screen, scene 3); once the bank proceeds to the actual
CDD record, it reads the **disclosed** Organisational-Identity + Beneficial-Ownership VCs via
granted pod access — because CDD compliance needs the actual owner names and percentages on
file, not a proof (the same disclosed-vs-ZK split Demos 1–2 already use at their application
step).

---

## 5. The journey — six scenes

Persona: **Jordan Blake**, Managing Member of **Northwind Logistics LLC** (fictional freight/
logistics SMB, Kansas City MO — all data simulated), opening business banking and a credit line
at two banks. Regulatory/market anchors are the script's skeleton (mirrors Demos 1–2's
five-scene convention, extended to six per this demo's explicit "second bank reuse" beat).

| # | Scene | Beat | Real vs. simulated | Anchor |
|---|---|---|---|---|
| 1 | **Fill the vault** | Pod seeded with Northwind's org profile + four beneficial owners' identity stubs. GLEIF-modelled `issuers` flow issues an **Organisational-Identity VC** (LEI-anchored, ISO 17442/20275-shaped) and an **Officer-Authorization VC** (Jordan as CEO/signatory, OOR/ECR-analogue). An unbranded registry/FinCEN-BO-source-modelled flow issues a **Beneficial-Ownership VC** listing all four owners' basis-points stakes | Real: pod writes over the Solid protocol, W3C VC 2.0 issue+verify (`eddsa-rdfc-2022`), dual-signed Schnorr commitment for the ZK operand. Simulated: no real LEI issuance, no real GLEIF vLEI (KERI/ACDC); `simulated: true` on every payload | vLEI OOR/ECR concept (GLEIF, verified 2026-07-22); FIBO-BE LEIEntities/Executives modules |
| 2 | **Onboard without re-submitting** | Bank of America-modelled `bank-onboarding` runs its full **KYB/CDD check** by consuming the org-identity + BO VCs directly from the pod (disclosed — CDD needs actual values, not a proof) — no re-collection of formation documents, EIN letter, or cap table. Mastercard-modelled business-account verification folds in as a data flow. Account opened. Contrast card: today's 5-day, document-heavy KYB grind | Real: pod-guard-mediated read via `resolveAuthorizedPod`, DPV consent receipt on grant. Simulated: no real bank CDD system, no real Mastercard API call | FinCEN CDD Rule, 31 CFR §1010.230; iComply 5-day→24-hour case study |
| 3 | **Prove ownership without exposing the cap table (ZK)** | Jordan applies for a credit line at Fifth-Third-modelled `bank-credit`; proves via **ZK** (§4: Tier A per-owner threshold + Tier B composed completeness) that no undisclosed owner ≥25% exists, without revealing the sub-25% owners or the exact percentages of the ≥25% owners. Once the bank proceeds, Jordan grants full VC access for the actual CDD record | Real: Noir/UltraHonk in-browser proving (Tier A), bb.js live sub-proof verification of the precomputed manifest (Tier B). Simulated/research-grade: the composed completeness circuit is unaudited (`sq-qhy4`); honesty panel mandatory | CDD 25% beneficial-ownership threshold; decision 0012 ZK binding posture |
| 4 | **Reuse, not re-collection (the payoff)** | An unbranded third-relying-party moment (Northwind's insurance renewal / merchant-processor account) pulls the **same** org-identity + BO credentials from the vault with zero re-collection — narrated inside `vault`'s grant list and `tour`'s chapter content (no new app: the vault already shows both banks' grants scoped to the *same* underlying VCs, proving no third copy was ever made). Contrast card quantifies the counterfactual: 70% of banks lose clients to slow onboarding; $1.23B in H1-2025 AML/KYC penalties, +417% YoY | Real: the vault's actual grant list (already populated by scenes 2–3). Simulated: the third relying party is narrated, not a live app | Fenergo H1-2025 penalty growth; Fintech Global 70%-loss stat |
| 5 | **Nothing goes stale** | Marcus Webb (an 18%, below-threshold owner) sells his stake to Jordan; the Beneficial-Ownership VC is **re-issued through the existing grant** (Jordan now ≥60%); the Bitstring Status List revokes the stale VC; **both** Bank of America and Fifth Third see the fresh ownership on their next read — neither re-runs KYB from scratch | Real: reissue + status-list revocation over the Solid protocol. Simulated: backdated validity window (no fake clock — same `validFrom`/`validUntil` seeding trick as Demos 1–2's freshness scene) | CDD ongoing-monitoring obligation; freshness = re-issue, status list = revocation only (decision 0007) |
| 6 | **Control, audit, and the regulator view** | Jordan reads the **consent-receipt ledger** (which banks/registrar were granted what), optionally revokes a bank's access, and the unbranded **Examiner View** shows the CDD Rule satisfied via a scoped, receipted regulator grant instead of a filing. Close: "the next bank Northwind walks into needs nothing new — the vault is already full" | Real: WAC grant/revoke + DPV consent receipt (app-level ledger, decision 0006). Simulated: the ledger is an app feature, not a protocol guarantee | FinCEN CDD Rule; RESPA-transfer-analogue framing carried from Demo 1's closing scene |

---

## 6. Framework reuse

Consistent with the selection doc's success criterion ("no framework code changes should be
required — same bar as Demo 2"):

| Package | Reused as-is | New for this demo |
|---|---|---|
| `@jeswr/solid-showcase` | `parseWalkthrough`, `editorialFindings`, all four page renderers, `zoneRewrites`, `envMatrix`, `appVercelJson`, `healthRoute` | The KYB `walkthrough.json` document (site/branding/persona/anchors/registry/chapters/compliance/deploy) — pure data |
| `@jeswr/solid-showcase-kit` | `AppShell`, `ConceptDemoBanner`, `ConsentInterstitial`, `HonestyPanel`, `IllustrativeFigure`, `DemoLockedField`, `CredentialCard`, `ReceiptCard`, `StatCard`, `createDisclaimerPack`, `themeFromSpec`, `insigniaFindings` (`us-finance` preset) | Five new theme specs (one per zone app) |
| `@jeswr/solid-pod-guard` | `resolveAuthorizedPod`, `createPodRouteGuard`, `createServicePodFetch` unchanged — both bank apps' pod routes | None — config only (`KYB_POD_ALLOWED_ORIGINS` etc.) |
| `vc-kit` | W3C VC 2.0 issue/verify/status/reissue, dual-sign witness tooling, Tier A/B honesty labelling, operand-anchor pattern | **The beneficial-ownership completeness circuit** (§4) — this demo's one genuinely new `vc-kit` research artifact, needing a scan+filter+hidden-issuer+revocation composed manifest that neither Demo 1 nor Demo 2 required |
| `@jeswr/synthetic-rdf` + `@jeswr/solid-seed` | Shape-driven generation + pod provisioning, unchanged | New SHACL shapes (§3.3) feed the generator; Northwind + four-owner persona fixtures |
| `create-solid-demo` | Scaffolds the new repo end-to-end | This is the scaffolder's **third** distinct consumer (mortgage was the migration source, lending the first external scaffold) — a good acceptance test that the tool generalises across a *B2B* use-case shape, not just consumer-credit |
| Deploy model | Mode-1 in-browser business vault + Mode-2a org-pod multiplexer (GLEIF/registrar/both banks) per decisions 0011/0013; multi-zones; VP-POST + ODRL/DPV dual rail per decision 0012 | None |

---

## 7. Personas (fictional — no real PII)

| Field | Value |
|---|---|
| Business | **Northwind Logistics LLC** — fictional freight/logistics SMB, Kansas City, MO. All data simulated |
| Entity form | LLC (ISO 20275 Entity Legal Form code) |
| Fictional LEI | An obviously-non-issued, ISO-17442-shaped 20-character placeholder, clearly marked in the credential and honesty panel as "illustrative — not a GLEIF-issued LEI" (same non-fabrication discipline as Demos 1–2's "no real LEIs for demo-brand orgs" rule, `vocab.md` §3.5) |
| Managing Member / CEO / signatory | **Jordan Blake** — 42% ownership (`ownershipPercentageBps: 4200`), also the control person and Officer-Authorization VC subject |
| Co-founder / CFO | **Priya Nandakumar** — 28% ownership (`2800` bps) — second ≥25% beneficial owner |
| Early investor | **Marcus Webb** — 18% ownership (`1800` bps, below threshold; sells to Jordan in scene 5) |
| Early investor | **Dana Reyes** — 12% ownership (`1200` bps, below threshold) |

**ZK threshold pinning** (design choice, mirrors Alex Rivera/Maya Torres): the four stakes sum
to exactly 10,000 bps (100%), with Jordan and Priya pinned **above** the 2,500-bps (25%) proof
threshold and Marcus and Dana pinned **below** it — so the scene-3 completeness proof has a real
disclosed/undisclosed boundary to demonstrate. The persona card footnote states the pinning
explicitly, per the `persona.descriptor`/`footnote` schema fields
(`showcase-framework-design.md` §2.1) and the fictional-descriptor enforcement rule.

---

## 8. Honest simulated-vs-real scope, and build-effort estimate

### 8.1 Simulated-vs-real scope

- **No real LEI issuance and no real GLEIF vLEI (KERI/ACDC)** — credentials are W3C VC 2.0 with
  an obviously-fictional LEI-shaped identifier; vLEI is stated on screen as the product-phase
  upgrade.
- **No real FinCEN BO-registry query and no real bank CDD system** — every payload carries
  `simulated: true`.
- **Business and all four owners are fictional personas** — no real EIN, formation documents, or
  cap table.
- **The beneficial-ownership completeness ZK predicate is research-grade** — same mandatory
  honesty panel as Demos 1–2 (unaudited, `sq-qhy4`); Tier A (per-owner threshold) is real live
  in-browser proving, Tier B (completeness) may run as a precomputed-offline/verified-live
  manifest if the composed circuit spike isn't ready in time.
- **CTA/FinCEN regulatory status is fluid** — demo copy stays status-agnostic on the CTA's
  reporting-side turmoil and grounds all pain in the bank CDD Rule (31 CFR §1010.230), which is
  independent of CTA reporting; copy says "each new bank," never "each new account," to stay
  accurate post the Feb-2026 exceptive relief.
- **The consent-receipt ledger is an app-level feature** (decision 0006 pattern), not a protocol
  guarantee.
- **Scene 4's third relying party is narrated, not a live app** — an honest scope choice to keep
  the app count at five zone apps + shell (§2.2).

### 8.2 Rough build-effort estimate (app-by-app bands, comparable to Demo 2's scope)

| Surface | Band | Why |
|---|---|---|
| `tour` (+ Examiner View) | **Small** | Pure data-authoring against the unchanged renderer — no new framework code |
| `vault` | **Small–Medium** | Reuses `solid-pod-guard`/`solid-showcase-kit`; three new credential types to render + grant/revoke UI extensions |
| `issuers` (3 flows: org-identity, officer-authorization, BO) | **Medium** | Multi-owner BO issuance UI is new relative to Demos 1–2's single-subject credentials |
| `bank-onboarding` | **Medium** | Full KYB/CDD consumption flow + pod-guard route + contrast card; folds in the Mastercard data flow |
| `bank-credit` | **Medium–Large** | ZK Tier A per-owner proof + Tier B composed-manifest verification + credit decision + the ownership-change re-check (scene 5) |
| Data-model bead (4 SHACL shapes + binding table + `kyb:` vocab site) | **Medium** | Grounding is unusually strong (§3.1) — lower research risk than a typical new-domain shape-authoring bead |
| **`vc-kit` beneficial-ownership completeness circuit spike** | **Large — the dominant unknown** | Composes scan + per-owner filter + hidden-issuer + revocation in one manifest; **front-load this spike before the walkthrough script commits to scene 3's live-proof claim**, exactly as the selection doc's red-team recommends (§6 there) |

**Overall**: comparable to Demo 2's total scope, with the beneficial-ownership completeness
circuit as the single largest risk — everything else draws directly on already-proven framework
machinery and unusually well-grounded FIBO-BE/GLEIF vocabulary.

---

## 9. Open questions / decisions for the lead

1. **Repo location.** Demo 2 (small-dollar lending) lives in its own sibling repo
   (`jeswr/solid-lending`), scaffolded via `create-solid-demo`, not inside `solid-mortgage`.
   Demo 3 likely follows the same pattern — needs a repo name decision (e.g. `jeswr/solid-kyb`)
   before the scaffold step. `needs:user`.
2. **Vocab host confirmation.** §3.5 proposes `solid-kyb-vocab.vercel.app/kyb#`, mirroring
   decision 0010 exactly. Confirm before the first `kyb:` IRI is minted; a `jeswr.org` DNS alias
   is a `needs:user` nicety that must land *before* first mint if wanted (same rule as decision
   0010) — otherwise the `.vercel.app` namespace is permanent.
3. **Fictional-LEI representation.** Needs a concrete design decision on how the demo renders an
   obviously-non-issued, ISO-17442-shaped identifier so it can never be mistaken for a real LEI
   (e.g., a documented reserved test-range prefix) — file as a data-model bead before seeding.
4. **Name-use consent.** GLEIF, Bank of America, Fifth Third, and Mastercard need the same
   nominative-fair-use sign-off posture as Demos 1–2 (decision 0002 / regn-optics R1–R8) before
   any outreach copy ships; Mastercard's EDMA membership needs re-verification (org-map C4,
   carried over unchanged).
5. **ZK circuit scope-down fallback.** If the `vc-kit` completeness-circuit spike (§8.2) shows
   the composed manifest is too costly for the build timeline, fall back to the selection doc's
   simpler alternative — "owner-count ≤ N disclosed" — rather than slipping the scene-3 script.
   Decide before the walkthrough JSON locks scene 3's copy.
6. **CTA/FinCEN regulatory re-verification.** The CTA/BOI-reporting status is actively moving
   (§1) — re-verify wording immediately before build/deploy, not just at design time, per the
   same discipline Demo 2 applied to the enjoined §1033 rule.
7. **Scene 4's third relying party.** This design keeps it narrated-only to hold the app count at
   five zone apps (§2.2, §8.1). If build capacity allows, the lead may prefer a live sixth app
   instead — a scope call, not a design defect.
8. **Beads/epic creation.** This document is design/research only; no beads were created or
   touched. Turning §2–§8 into an epic + child beads (mirroring the sm-3..sm-11 mortgage
   decomposition and the lending epic) is the natural next step once the lead accepts this
   design — deferred to that follow-on session.

---

## References

Primary grounding: `docs/research/demo3-poc-selection.md` (the scoring/selection design of
record this document expands), `docs/research/small-dollar-lending-design.md` (structural
template), `SPEC.md`, `docs/research/org-map.md`, `docs/research/zkp-fit.md`,
`docs/research/showcase-framework-design.md`, `docs/research/showcase-patterns.md`,
`docs/research/vocab.md`, `decisions/0002.md`, `decisions/0004.md`, `decisions/0005.md`,
`decisions/0006.md`, `decisions/0007.md`, `decisions/0009.md`, `decisions/0010.md`,
`decisions/0011.md`, `decisions/0012.md`, `decisions/0013.md`, `decisions/0016.md`.

**FIBO Business Entities (fetched + dereferenceability-verified 2026-07-22, `Accept:
text/turtle`, final status in every case `200 text/turtle`):**
- Legal Persons — <https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LegalPersons/>
- LEI Entities — <https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LEIEntities/>
- Ownership Parties — <https://spec.edmcouncil.org/fibo/ontology/BE/OwnershipAndControl/OwnershipParties/>
- Executives — <https://spec.edmcouncil.org/fibo/ontology/BE/OwnershipAndControl/Executives/>
- Formal Business Organizations — <https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/FormalBusinessOrganizations/>
- FIBO home / governance — <https://spec.edmcouncil.org/fibo/> and <https://github.com/edmcouncil/fibo>

**GLEIF / vLEI:**
- Introducing the verifiable LEI (vLEI) — <https://www.gleif.org/en/organizational-identity/introducing-the-verifiable-lei-vlei>
- GLEIF Partners Programme (2026) — <https://tradetreasurypayments.com/posts/gleif-launches-global-partners-programme-to-advance-lei-and-vlei-adoption-across-financial-and-digital-identity-systems>
- BIS + GLEIF Project Aperta — <https://www.biometricupdate.com/202606/gleif-bis-test-vlei-as-trust-layer-for-cross-border-open-finance>
- GLEIF LEI model in RDF — <https://www.gleif.org/en/lei-data/semantic-representation-of-the-lei/lei-model-in-rdf-resource-description-framework>

**FinCEN / CDD / CTA (31 CFR §1010.230 verified live 2026-07-22):**
- eCFR, 31 CFR §1010.230 (CDD Rule, beneficial ownership) — <https://www.ecfr.gov/current/title-31/subtitle-B/chapter-X/part-1010/subpart-C/section-1010.230>
- FinCEN, removes BOI reporting for US companies (interim final rule, Mar 2025) — <https://www.fincen.gov/news/news-releases/fincen-removes-beneficial-ownership-reporting-requirements-us-companies-and-us>
- Mintz, FinCEN eases beneficial-ownership re-verification (Feb 2026 exceptive relief) — <https://www.mintz.com/insights-center/viewpoints/54751/2026-02-18-fincen-eases-beneficial-ownership-verification>

**Pain evidence (KYB):**
- Fintech Global, 70% of banks lose clients to slow onboarding — <https://fintech.global/2025/10/08/70-of-banks-lose-clients-due-to-slow-onboarding/>
- Fenergo, regulatory penalties up 417% in H1 2025 ($1.23B) — <https://resources.fenergo.com/newsroom/regulatory-penalties-for-global-financial-institutions-skyrocket-417-in-h1-2025>
- iComply, KYB for US community banks (5-day → under-24-hour case study) — <https://icomplyis.com/smarter-kyb-for-u-s-community-banks-uncovering-risk-in-smb-accounts/>

All other market/regulatory citations (candidate scoring, red-team, runner-up rationale) are in
`docs/research/demo3-poc-selection.md` §5, §8 and are not repeated here except where directly
load-bearing for this design.
