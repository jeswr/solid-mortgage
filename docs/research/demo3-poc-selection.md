# Demo 3 — scientific PoC selection (sm-4f1z)

Design-of-record decision for **Demo 3** of the Solid showcase suite: which single
Proof-of-Concept use case to build next, chosen to best support **adoption of Solid**
(personal/organisational data pods + Verifiable Credentials) while making **best use of EDMA
(EDM Council) membership**. This is **research + design only** — no app is built here; the build
is the follow-on epic, and the OMG/EDMC use-case doc (sm-qrfu) is blocked on this selection.

Method mirrors the rigor of the existing `docs/research/*` docs: explicit weighted rubric,
1–5 scoring with a one-line justification per cell, web-grounded market evidence with citations
(accessed **2026-07**), an adversarial red-team of the top two, and a winner design sketch.
Every quantitative claim carries a citation or is flagged as unverified. EDMA-membership claims
are taken from the internal role-map sheet via `docs/research/org-map.md` (snapshot 4 Jun 2026)
and inherit its **re-verify-before-outreach** caveat (Mastercard/Verizon membership are
internal-sheet-only — org-map C4).

**Result:** the winner is **Candidate B — reusable organisational-identity + beneficial-ownership
credentials for business (SMB) KYB onboarding**, weighted score **4.65 / 5**. Runner-up:
**Candidate F — insurance underwriting / claims-history portability**, **3.75 / 5**.

---

## 1. Design constraints Demo 3 must satisfy

Three hard constraints frame the whole selection (from `SPEC.md`, the two prior demos, and the
epic sm-4f1z):

1. **Complementary, not a third lending variant.** Demo 1 = US mortgage origination
   (`docs/use-case.md`); Demo 2 = US small-dollar consumer-installment lending
   (`docs/research/small-dollar-lending-design.md`). Both are *consumer* credit journeys that
   already lean heavily on the same rails: Mastercard/Finicity open banking, Equifax/The Work
   Number income verification, a borrower identity VC issued in scene 1, GLEIF for *organisational*
   identity (with **vLEI explicitly deferred to "product-phase narrative only"** — SPEC §3 C5,
   decision 0004). A candidate that repeats those rails scores badly on marginal impact however
   large its raw market.
2. **Best use of EDMA membership.** Demo 3's differentiator is leverage of the member base. A
   candidate whose key players are *not* members (or where the anchoring role has no member)
   is weaker even if the market pain is real.
3. **Buildable on the existing framework** (`@jeswr/solid-showcase`, `@jeswr/solid-showcase-kit`,
   `@jeswr/solid-pod-guard`, `vc-kit`, `@jeswr/synthetic-rdf` + `@jeswr/solid-seed`,
   `create-solid-demo`) with the established house rules: W3C VC 2.0 JSON-LD + FIBO-grounded RDF,
   sparq Noir/UltraHonk ZK with the honesty panel, WAC + DPV consent receipts, no minted IRIs,
   concept-demo non-impersonation branding.

---

## 2. Candidate generation

Ten distinct candidates spanning sectors beyond mortgage/lending (candidate J is included for
completeness against the epic's explicit "healthcare-adjacent" example even though it scores
weakest — see §5, §8). One-line description + which
EDMA member(s) own the pivotal role. (Membership per `org-map.md`; "—" = no member owns the
pivotal role, which is itself a scoring signal.)

| ID | Candidate | One-line | Pivotal EDMA member(s) |
|----|-----------|----------|------------------------|
| **A** | Cross-bank **consumer KYC/identity reuse** | A consumer holds an issuer-signed identity VC in a pod and re-presents it to every new bank instead of re-running CIP/IDV from scratch | Banks as relying parties; **no member issues consumer identity** (GLEIF is entity-only) |
| **B** | **SMB / business KYB onboarding** — reusable org-identity + beneficial-ownership VCs | A business holds a GLEIF-anchored organisational-identity VC + a beneficial-ownership (UBO) VC + officer-authorization VC in a pod, re-used across banks for KYB/CDD and shown to regulators on demand | **GLEIF** (LEI / vLEI root of trust), all bank members as relying parties, Mastercard (open finance) |
| **C** | **Regulatory reporting / supervised data sharing** (SupTech) | Regulators pull permissioned, VC-attested views from bank-held pods instead of periodic batch submissions (call reports, BSA/AML, HMDA, stress-test data) | **FDIC, 12 Federal Reserve Banks, U.S. Treasury, SEC** (all members) — but as supervisors, not co-builders |
| **D** | **Open-banking data portability / account-switching** | A pod is the neutral, persistent store of transaction history a consumer grants to a new bank, instead of re-linking via an aggregator each time | Mastercard/Finicity (**already the anchor in Demos 1–2**), Verizon (vault) |
| **E** | **Gig / 1099 income-verification network** (ADP) | Gig/freelance workers accumulate payroll/1099 pay-stream VCs in a pod to prove income for loans/rentals without a fresh manual verification each time | **ADP** (new payroll-data seat), Mastercard, Fannie Mae/Freddie Mac (GSE income docs) |
| **F** | **Insurance underwriting / claims-history portability** | A policyholder's pod holds portable CLUE-equivalent claims-history + telematics VCs to carry verified risk history to a new insurer at quote time | **USAA, AIG, Donegal** (three insurer members); **no member** owns the data-broker (CLUE/telematics) role |
| **G** | **Telco-anchored reusable digital identity** (Verizon as *issuer*) | A carrier issues a SIM-swap-resistant phone-possession identity VC into a pod, reused across financial services | **Verizon** — but as an issuer it does not occupy today; already cast as the *vault* in Demos 1–2 |
| **H** | **ESG / data-provenance VCs for financial disclosures** (FIBO-grounded) | Corporates/issuers emit provenance-tracked emissions/sustainability data as VCs for lending / green-bond eligibility, grounded in FIBO | **GLEIF, Freddie Mac / Fannie Mae** (Green MBS), Wolters Kluwer, MISMO |
| **I** | **Cross-institution consent-receipt / data-lineage** (clean-room alternative) | A horizontal pod product recording purpose-scoped, revocable consent receipts + data-access provenance across any use case | Snowflake / Microsoft / Google (infra members) |
| **J** | **Healthcare-adjacent: portable benefits-eligibility credential via payroll** | A worker's pod holds an ADP-modelled benefits-eligibility/HSA-balance VC, reused across job changes for COBRA/marketplace/new-employer enrollment instead of re-proving eligibility each time | **ADP** (payroll issuer) — no EDMA member on the health-plan, EHR, PBM, or HSA-custodian side |

---

## 3. Scoring rubric — criteria, weights, and why

Six criteria; weights sum to 1.00. The epic names **likelihood of success** and **impact of
success** as the headline pair, so together they carry half the weight. **EDMA-member fit** is
the second-order differentiator specific to Demo 3's mandate ("best use of EDMA membership"), so
it is the largest single supporting weight. **Data-sensitivity fit** is a gate: if Solid's
permissioned-pod + ZK/VC model gives no real advantage, the candidate should not win regardless
of market size. **Existing pain** and **reusability** are necessary hygiene but discriminate less
(most candidates have large pain; most produce *some* reusable artifact), so they are tie-breaker
weights.

| Criterion | Weight | What a 5 looks like | Why this weight |
|-----------|:---:|---------------------|-----------------|
| **Likelihood of success** | **0.25** | Tech proven, demo-able in 4–6 scenes, a real partner would plausibly co-build, no fatal regulatory/feasibility blocker | Headline criterion (epic). A dazzling-but-improbable PoC does not advance adoption |
| **Impact of success** | **0.25** | High marginal value *for this suite* — opens a genuinely new sector/audience and moves the adoption needle; not redundant with Demos 1–2 | Headline criterion (epic). Weighted for *marginal* impact, which penalises adjacency to existing demos |
| **EDMA-member fit** | **0.20** | Pivotal roles are members (ideally DEP founders / neutral standards bodies), and the PoC activates a member/asset the prior demos left on the table | Demo 3's explicit reason to exist; the sharpest differentiator vs. simply "another good PoC" |
| **Data-sensitivity fit** | **0.15** | The data is genuinely sensitive AND pod + selective-disclosure/ZK + receipted consent give a *concrete* advantage over the status quo | Gate criterion — where Solid's model gives no edge, the demo is theatre |
| **Existing pain / demand** | **0.10** | Large, quantified, *currently unsolved* pain with citations | Necessary but weakly discriminating — almost every candidate has a big TAM number |
| **Reusability** | **0.05** | Produces reusable vocab / SHACL / binding tables / patterns the CoP can standardise beyond this demo | Genuine CoP value, but a tie-breaker: the framework already supplies most reusable machinery |

Weighted total = Σ(score × weight). Range 1.00–5.00.

---

## 4. Scoring matrix

Scores 1–5; justification per cell. Weighted total and rank in the last two columns.

### 4.1 Headline pair — Likelihood & Impact

| ID | Likelihood (0.25) | Impact (0.25) |
|----|-------------------|---------------|
| A | **4** — tech trivial, huge pain; but consumer-identity is the most *contested* space (EUDI wallet, mDL, Prove) and duplicates Demos 1–2 scene-1 issuance | **3** — big story but low *marginal* impact: it is literally the existing scene-1 identity VC, generalised |
| **B** | **4** — vLEI/org-credential momentum is real and demo-able; the only snag is KERI-vs-W3C-VC format, resolved by building W3C VCs with LEI-as-identifier (§7) | **5** — completes the org-identity/trust layer both prior demos *deferred*, and opens a new B2B (business-banking) audience |
| C | **2** — regulators will not co-build/sponsor a demo; batch reporting is deeply entrenched; a partner build is the hardest sell in the set | **5** — transformative *if* it landed; supervisory data-sharing is a paradigm shift |
| D | **3** — buildable, but rides the enjoined §1033 rule and adds little the incumbents don't do | **2** — highest redundancy: Demos 1–2 already *are* the open-banking story |
| E | **4** — buildable; new ADP seat; FCRA "consumer report" question is a real but navigable caveat | **3** — thematically *adjacent* to Demos 1–2 (both verify income for lending); risks reading as "Demo 2.5" |
| F | **3** — demo-able with strong narrative, but insurer competitive reluctance to share underwriting data + no member data-broker + FCRA/CLUE already gives portability | **4** — genuinely new sector (insurance); max complementarity with the two credit demos |
| G | **2** — speculative: no public Verizon identity-issuer initiative; telcos monetise real-time APIs and won't cede to holder-held VCs; brand-role confusion (vault vs. issuer) | **3** — reusable telco identity is a real theme, but not clearly Solid-shaped |
| H | **3** — buildable and FIBO-grounded, but US/EU disclosure mandates are *receding* (§5), removing the compliance-urgency hook | **3** — new sector but softening tailwind; Fannie closed its ESG dept (a live headwind) |
| I | **2** — least demo-able: no single persona journey; collapses back into a vertical to be legible | **2** — infrastructure-only; hard to make a 4–6 scene story land |
| J | **2** — HIPAA/ERISA both attach the moment health-plan data is touched; no HIPAA-grounded shape/compliance-lens work exists anywhere in the repo today; quantified pain is unverifiable (§5) | **2** — a real sector, but the repo's health-adjacent grounding is thinnest of all ten — likely reads as under-researched on stage |

### 4.2 Supporting criteria — EDMA-fit, Data-sensitivity, Pain, Reusability

| ID | EDMA-fit (0.20) | Data-sensitivity (0.15) | Pain (0.10) | Reuse (0.05) |
|----|------------------|--------------------------|-------------|--------------|
| A | **3** — banks are relying parties, but *no member issues consumer identity*; weak differentiation | **5** — identity PII; pod + ZK selective disclosure is a textbook fit | **5** — eKYC market $1.32B (2026) → $7.18B (2035); 68% abandon onboarding | **2** — identity VC already exists in the framework; little *new* reusable vocab |
| **B** | **5** — **GLEIF** (a member; the neutral, non-commercial vLEI root of trust) anchors it, every bank member is a relying party, Mastercard for open finance, FinCEN as the compliance lens | **5** — beneficial-ownership / cap-table PII is highly sensitive; "prove no undisclosed ≥25% owner" is a clean ZK/selective-disclosure predicate | **4** — 70% of banks lose clients to slow onboarding; AML/KYC/sanctions penalties $1.23B in H1 2025 (+417% YoY) | **5** — FIBO Business Entities ↔ GLEIF LEI ↔ FinCEN CDD binding table — squarely EDMA/OMG's own domain |
| C | **3** — FDIC/Fed/Treasury/SEC are members, but as supervisors, not sponsors | **4** — supervisory data; pod-mediated pull is real, but access model is institutional not personal | **5** — $155.3B financial-crime compliance spend; BSA/AML > $60B/yr | **4** — reg-reporting vocab (FIBO-FND) is reusable |
| D | **2** — reuses Demo 1–2's cast; no *new* member activated | **3** — transaction data, but aggregators already permission it | **5** — FDX at 114M connections; 73% considered switching | **2** — nothing new over Demos 1–2 |
| E | **4** — activates **ADP** as a genuinely new seat; Mastercard (Argyle tie-in), GSEs | **4** — income data; reusable income VC is a good pod fit | **4** — 70–83M US gig workers; ~$674B sector | **3** — income VC largely exists already |
| F | **4** — **USAA, AIG, Donegal** — three insurer members anchor it; but the CLUE/telematics data-broker role has *no member* | **5** — claims + telematics/location data is maximally sensitive; consent-first pod is a strong answer to the GM/Verisk enforcement pattern (§5) | **3** — 86% unaware CLUE drives premiums; "$13B underwriting inefficiency" is *weakly sourced* (§8) | **3** — new insurance shapes; FIBO insurance coverage is thinner than its LOAN/BE domains |
| G | **3** — Verizon is a member but the issuer role is speculative/confusing | **4** — phone-possession identity is sensitive and anti-fraud-relevant | **4** — telecom identity market $8.17B (2026); ~$23B ATO losses (2023) | **2** — little reusable vocab; KERI-adjacent |
| H | **4** — GLEIF + Freddie/Fannie Green MBS + Wolters Kluwer + MISMO; FIBO is EDMA's own asset | **3** — ESG data is disclosed, not private; pod advantage is provenance not confidentiality | **3** — greenwashing fines (DWS €25M); disclosure cost ~$675K/yr per issuer | **4** — FIBO-grounded provenance vocab is reusable |
| I | **3** — Snowflake/Microsoft/Google are members and real clean-room vendors | **3** — meta-layer over data; advantage is real but abstract | **4** — data clean-room market $1.52B → $7.73B | **3** — DPV consent-receipt patterns (note: **DPV is W3C, not EDMA** — §8) |
| J | **2** — only **ADP** is a plausible member, issuer-side only; the health-plan/EHR/PBM/HSA-custodian roles have no member at all — breaks the "every member sees their seat" thesis worse than any other candidate | **4** — health-adjacent eligibility data is genuinely sensitive; the *theoretical* pod+consent fit is strong even though buildability (left column) is weak | **2** — no primary-sourced COBRA/benefits-portability pain figure found; DOL's COBRA pages describe the mechanism with no usage statistics (§5) | **2** — no FIBO health domain to ground vocab in; would need a new, unreviewed vocab area |

### 4.3 Weighted totals and ranking

| Rank | ID | Candidate | Likelihood | Impact | EDMA | Data-sens | Pain | Reuse | **Weighted** |
|:---:|:---:|-----------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **1** | **B** | **SMB / business KYB (org-identity + beneficial ownership)** | 4 | 5 | 5 | 5 | 4 | 5 | **4.65** |
| **2** | **F** | Insurance underwriting / claims-history portability | 3 | 4 | 4 | 5 | 3 | 3 | **3.75** |
| 3 | E | Gig / 1099 income verification (ADP) | 4 | 3 | 4 | 4 | 4 | 3 | **3.70** |
| 4 | A | Cross-bank consumer KYC reuse | 4 | 3 | 3 | 5 | 5 | 2 | **3.70** |
| 5 | C | Regulatory reporting / SupTech | 2 | 5 | 3 | 4 | 5 | 4 | **3.65** |
| 6 | H | ESG / data-provenance VCs | 3 | 3 | 4 | 3 | 3 | 4 | **3.25** |
| 7 | G | Telco-anchored identity (Verizon issuer) | 2 | 3 | 3 | 4 | 4 | 2 | **2.95** |
| 8 | D | Open-banking data portability | 3 | 2 | 2 | 3 | 5 | 2 | **2.70** |
| 9 | I | Consent-receipt / clean-room alternative | 2 | 2 | 3 | 3 | 4 | 3 | **2.60** |
| 10 | J | Healthcare-adjacent benefits-eligibility portability | 2 | 2 | 2 | 4 | 2 | 2 | **2.30** |

Worked example (winner B): 4(.25)+5(.25)+5(.20)+5(.15)+4(.10)+5(.05) = 1.00+1.25+1.00+0.75+0.40+0.25 = **4.65**.
Candidates E and A tie at 3.70; the red-team (§6) and the complementarity constraint (§1) break the
order in favour of neither — F is the clear #2 because it is the only high-scorer that opens a
*new sector* with member anchors, whereas E and A both suffer adjacency/redundancy to the two
existing consumer-credit demos.

---

## 5. Web-grounded evidence (per candidate, with citations)

Every load-bearing number, with its source and any verification caveat. Accessed 2026-07.

**A — Consumer KYC reuse.** Global e-KYC market USD **1.32B (2026) → 7.18B (2035)**, ~20.7% CAGR
([VMR](https://www.vmr.biz/blog/e-kyc-market-15920)); **68%** of consumers have abandoned a digital
bank application mid-onboarding, and abandonment averages **40–60%** when onboarding exceeds
10 minutes ([MX](https://www.mx.com/blog/account-opening-stats/),
[Jumio](https://www.jumio.com/how-to-reduce-customer-abandonment/)); drop-off is **49%** with
micro-deposit verification vs **1%** with instant account verification (MX). Synthetic-identity
fraud loss estimates span **$6B–$20B+/yr** (`small-dollar-lending-design.md` §1). *Contested space:*
Prove's phone-centric identity already serves **9 of the top 10** US FIs
([Prove](https://www.prove.com/blog/what-is-phone-centric-identity)); the EU EUDI wallet is mandated
into every member state by end-2026 (`prior-art.md` §7).

**B — SMB / business KYB (winner).** **70% of banks lose clients** to slow onboarding
([Fintech Global](https://fintech.global/2025/10/08/70-of-banks-lose-clients-due-to-slow-onboarding/),
[GBG](https://www.gbg.com/en-us/blog/ubo-verification/)). **Correction from the original draft**
(verified 2026-07-22 — the two figures below were re-sourced after the cited pages did not
actually contain them): **$19.3B in global *regulatory* fines were recorded in 2024**, the
highest on record — but this is skewed by the unrelated **$12.7B FTX fraud penalty**, not
KYB-specific, so treat it as market-tone evidence, not an AML/KYB-attributable number
([Fintech.Global](https://fintech.global/2025/02/19/global-regulatory-fines-soar-to-record-breaking-19-3bn-in-2024/),
[Shufti Pro](https://shuftipro.com/blog/kyb-in-banking/)). The AML-specific, KYB-relevant figure is
sharper: **139 AML/KYC/sanctions penalties totalling $1.23B in H1 2025**, a **417% YoY increase**
on H1 2024's $238.6M, with North America alone up 565%
([Fenergo](https://resources.fenergo.com/newsroom/regulatory-penalties-for-global-financial-institutions-skyrocket-417-in-h1-2025)).
A regional-bank KYB automation case study documents onboarding cut **from 5 days to under 24 hours**
([iComply](https://icomplyis.com/smarter-kyb-for-u-s-community-banks-uncovering-risk-in-smb-accounts/)) —
consistent with, though a different vendor than, Sumsub's own **24-hours-to-17-seconds** and
**50%-reduction** case studies for the same KYB-friction story
([Sumsub KYB guide](https://sumsub.com/blog/kyb-guide/)). The reusable-org-credential thesis is *live and member-led*:
GLEIF's **vLEI** is an organisation-based Verifiable Credential now in open pilot registration, and
the **GLEIF Partners Programme** (2026) convenes banks, corporates and vendors on exactly this
([GLEIF](https://www.gleif.org/en/organizational-identity/introducing-the-verifiable-lei-vlei),
[Trade Treasury Payments](https://tradetreasurypayments.com/posts/gleif-launches-global-partners-programme-to-advance-lei-and-vlei-adoption-across-financial-and-digital-identity-systems)).
**BIS Innovation Hub Project Aperta** (reported 2026) tested vLEI as the trust layer for cross-border
open finance with monetary authorities from the **UK, UAE, Brazil, Hong Kong and India**, showing
"reusable organizational credentials could reduce repeated onboarding checks and accelerate account
opening" for SMEs ([Biometric Update](https://www.biometricupdate.com/202606/gleif-bis-test-vlei-as-trust-layer-for-cross-border-open-finance),
[GLEIF press release PDF](https://www.gleif.org/media/pages/newsroom/press-releases/bis-collaborates-with-gleif-to-use-leis-in-cross-border-open-finance-prototype/4fc37b3d9b-1780317252/2026-05-29_bis-collaborates-with-gleif-to-use-leis-in-cross-border-open-finance-prototype_v1.0.pdf))
— Aperta reports *no hard metric*, so cite it as directional. **Regulatory context (fluid — red-team §6):**
FinCEN's March 2025 interim final rule removed beneficial-ownership *reporting* for US domestic
companies, exempting **>99% of previously covered entities**; a final rule is expected in 2026 and
the CTA remains on the books
([FinCEN](https://www.fincen.gov/news/news-releases/fincen-removes-beneficial-ownership-reporting-requirements-us-companies-and-us),
[Holland & Knight](https://www.hklaw.com/en/insights/publications/2026/06/what-happened-to-fincens-corporate-transparency-act)).
Critically, the demo's pain is the **bank CDD Rule** (verify the entity + each ≥25% beneficial owner
at account opening), which is a *bank* obligation independent of the CTA reporting requirement — so
the KYB pain survives the CTA turmoil. **One further currency update the original draft missed**
(added 2026-07-22): on **13 Feb 2026 FinCEN issued exceptive relief** letting banks skip
*re-verifying* beneficial owners **every time an existing customer opens another account at the
same institution** — verification is now required at initial onboarding, on risk triggers, or
per the bank's own risk-based programme
([Mintz](https://www.mintz.com/insights-center/viewpoints/54751/2026-02-18-fincen-eases-beneficial-ownership-verification),
[Mayer Brown](https://www.mayerbrown.com/en/insights/publications/2026/02/more-is-not-always-better-fincen-grants-risk-based-relief-from-repeat-beneficial-ownership-verification-requirements)).
This narrows *same-bank repeat-account* pain but leaves the demo's actual pain untouched: the
25%-threshold verification obligation still applies in full at **every new relying party** — exactly
the *cross-institution* reuse story scene 2 dramatizes (Northwind onboards at a *second*, different
bank). Demo copy should say "each new bank" pain, never "each new account," to stay accurate post-relief.

**C — Regulatory reporting / SupTech.** Financial institutions spent **$155.3B** on financial-crime
compliance operations plus **$34.7B** on related technology; AML compliance alone runs **>$60B/yr**;
smaller community banks spend **8.7–20%** of operating expenses on compliance
([Fourthline](https://www.fourthline.com/blog/how-much-do-banks-spend-on-compliance)). FinCEN opened
a 2025 RFI on AML compliance costs, signalling appetite to reduce burden
([Mayer Brown](https://www.mayerbrown.com/en/insights/publications/2025/10/fincen-issues-request-for-information-on-aml-compliance-costs-is-the-juice-worth-the-squeeze)).
Precedent for digital regulatory reporting exists abroad (Bank of England / FCA DRR pilots), but no
US regulator co-builds vendor demos.

**D — Open-banking portability.** FDX API at **114M** consumer account connections (up 50% YoY),
~9B calls/month ([Open Banking Expo](https://www.openbankingexpo.com/news/fdx-api-adoption-hits-114m-customer-connections/));
**73%** of consumers considered switching banks in the past year, **48%** left after digital friction
([The Financial Brand](https://thefinancialbrand.com/news/customer-experience-banking/financial-marketers-bank-switch-new-account-primary-loyalty-112891)).
Incumbents already own the reusable-connection layer (Plaid, Akoya, MX, Finicity —
[comparison](https://www.fintegrationfs.com/post/plaid-vs-akoya-a-comprehensive-comparison-of-financial-data-aggregators)).
**CFPB §1033 is enjoined and under reconsideration** — the 1 Apr 2026 compliance date passed without
binding effect, and an ANPR reopened even whether banks may charge for data access
([Cozen O'Connor](https://www.cozen.com/news-resources/publications/2026/section-1033-compliance-date-open-banking-rule-enjoined-and-under-reconsideration),
[Moore & Van Allen](https://www.mvalaw.com/data-points/cfpb-enjoined-from-enforcing-personal-financial-data-rights-rule-1033)).

**E — Gig / 1099 income.** US freelance/gig workforce **~70–83M people (~36% of workers)**, a
**~$674B** sector ([Oysterlink](https://oysterlink.com/spotlight/gig-economy-statistics/),
[Fortunly](https://fortunly.com/statistics/gig-economy-statistics/)); GSE underwriting is built around
W-2/paystub evidence, disadvantaging 1099 filers
([Prudent AI](https://www.prudent.ai/blog/why-traditional-income-verification-falls-short-for-gig-workers));
Equifax's own Work Number ships a *manual, non-instant* self-employed VOE product, confirming a
coverage gap in the exact vendor role Demos 1–2 use
([Equifax](https://assets.equifax.com/assets/wfs/efx-ws-2102_the_work_number-self_employed_verification.pdf)).
Incumbents: Argyle (took a **Mastercard** strategic investment, Sept 2025), Pinwheel, Truework
([CB Insights](https://www.cbinsights.com/research/argyle-competitors-atomic-pinwheel-sterling-wage-truework-accurate-background-finch/),
[Argyle](https://www.argyle.com/industries/gig-economy)).

**F — Insurance portability (runner-up).** **86%** of Americans are unaware insurers use prior claims
history (CLUE) to price new premiums, and CLUE errors are "far from rare"
([United Policyholders](https://uphelp.org/clue-report-this-surprising-database-can-drive-up-your-homeowners-insurance-premiums/),
[Texas DOI](https://www.tdi.texas.gov/blog/get-a-free-clue-about-your-insurance-claims-history.html)); a
frequently-cited **"$13B underwriting inefficiency"** figure could only be verified via a secondary
source repeating a McKinsey attribution — **treat as indicative, not load-bearing**
([Sky.ai citing McKinsey](https://www.usesky.ai/article/digital-underwriting-gap-why-73-of-insurers-are-losing-13b-to-legacy-systems)).
Incumbents: LexisNexis operates both CLUE and the cross-carrier **Telematics Exchange**
([LexisNexis](https://risk.lexisnexis.com/products/telematics-exchange)). **Regulatory cautionary tale
(strong narrative asset):** in 2026 California settled with GM over selling driving/location data to
brokers Verisk and LexisNexis without adequate consent, and **Verisk shut its driver-behaviour product**
after FTC action ([The Record](https://therecord.media/data-broker-shuts-product-driver-patterns)) —
proof that regulators punish exactly the non-consented cross-party sharing a consent-first Solid model
corrects.

**G — Telco identity.** Telecom identity/authentication market **$8.17B (2026) → 15.32B (2031)**
([Mordor Intelligence](https://www.mordorintelligence.com/industry-reports/telecom-identity-and-authentication-services-market));
SIM-swap losses to the FBI **~$26M (2024)**, broader account-takeover **~$23B (2023)**
([Efani](https://www.efani.com/blog/sim-swap-fraud-statistics-2026),
[Deepstrike](https://deepstrike.io/blog/sim-swap-scam-statistics-2025)). Incumbents run *real-time
carrier APIs*, not pod-held VCs: Prove, GSMA Mobile Connect (47 deployments), Vodafone TrustHub
(Mordor). No public Verizon reusable-identity-issuer initiative was found — only branded-calling-ID
work ([Numeracle](https://www.numeracle.com/press-releases/verizon-bcid)) — making the "modelled on
Verizon" issuer framing speculative.

**H — ESG provenance.** **400+** greenwashing enforcement actions logged globally in 2026; DWS fined
**€25M** ([IssueWire](https://www.issuewire.com/400-greenwashing-enforcement-actions-in-2026-new-data-shows-regulators-targeting-esg-claims-1862352417121949),
[Anti-Greenwash Charter](https://antigreenwashcharter.org/the-biggest-greenwashing-fines-of-2025-and-what-they-teach-us/));
climate-disclosure compliance ~**$675K/yr** per issuer, investors ~**$1.37M/yr** validating ESG data
([ESG Today](https://www.esgtoday.com/study-reveals-cost-of-climate-disclosure-for-issuers-and-investors/)).
**Softening mandate (red-flag):** the SEC proposed *rescinding* its 2024 climate rule in May 2026
([SEC](https://www.sec.gov/rules-regulations/2026/05/s7-2026-19)), and the EU CSRD was narrowed by
the Feb 2026 Omnibus package (scope now >1,000 employees / >€450M turnover, waves 2–3 delayed to FY2028)
([Consilium](https://www.consilium.europa.eu/en/press/press-releases/2026/02/24/council-signs-off-simplification-of-sustainability-reporting-and-due-diligence-requirements-to-boost-eu-competitiveness/),
[KPMG](https://kpmg.com/xx/en/our-insights/ifrg/2025/esrs-eu-omnibus.html)); Fannie Mae closed its ESG
department in April 2025 ([Ballotpedia](https://news.ballotpedia.org/2025/04/29/fannie-mae-closes-esg-department/)).

**I — Consent-receipt / clean-room.** Data clean-room market **$1.52B (2025) → 7.73B (2034)**
([Growth Market Reports](https://growthmarketreports.com/report/data-clean-room-market)); LiveRamp
acquired Habu for **$200M** ([MarTech](https://martech.org/liveramp-acquires-data-clean-room-start-up-habu/)).
The consent-receipt space already has a standard — **Kantara's Consent Receipt Specification**, which
FDX recognises for financial data sharing
([Kantara](https://kantarainitiative.org/download/consent-receipt-specification/),
[FDX](https://www.financialdataexchange.org/FDX/FDX/News/Media-Mentions/FDX-and-Kantara.aspx)).

**J — Healthcare-adjacent benefits portability.** This candidate's pain is the **weakest-evidenced
of all ten**: DOL's own COBRA guidance describes the 18–36-month continuation mechanism and
premium-plus-2%-admin-fee structure but publishes **no usage or friction statistics**
([DOL EBSA](https://www.dol.gov/agencies/ebsa/about-ebsa/our-activities/resource-center/faqs/cobra-continuation-health-coverage-workers))
— flagged here as an **unverified pain claim**, not asserted. The competing infrastructure is
federally-scaled and unrelated in data domain: **TEFCA** exchanged **~1 billion health records**
by early 2026 (up from ~10M in Jan 2025) across 9,000+ connected organisations, and the Social
Security Administration itself joined TEFCA in spring 2026 for benefits-determination exchange
([HHS/ONC](https://www.hhs.gov/press-room/onc-strengthens-tefca-one-billion-health-records-exchanged.html),
[Becker's](https://www.beckershospitalreview.com/healthcare-information-technology/ehrs/whats-new-with-tefca-in-2026-3-updates/))
— TEFCA moves *clinical* records, not payroll-issued benefits-eligibility, so it is adjacent prior
art rather than a direct competitor, but it shows the scale of infrastructure already dominating
health data exchange. HIPAA and ERISA both attach the instant health-plan data is touched, a
materially heavier compliance lift than this repo's FIBO/MISMO-grounded finance work, with **zero
HIPAA-aligned shapes or compliance-lens content anywhere in the codebase today** — the weakest
buildability of the ten candidates.

---

## 6. Adversarial red-team of the top two

### B — SMB / business KYB (winner). "Why this could fail / what would kill it."

- **Credential-format mismatch (technical).** GLEIF's vLEI runs on **KERI/ACDC**, not W3C VC 2.0
  JSON-LD — and SPEC §3 C5 + decision 0004 already rule that "vLEI is KERI/ACDC, out of scope for the
  RDF model; LEI-as-identifier only." A demo that claimed to *be* vLEI would contradict the framework
  and need net-new KERI tooling the `vc-kit` stack doesn't have. **Mitigation (and why it survives):**
  build the credentials as **W3C VC 2.0 org-identity + beneficial-ownership VCs carrying the LEI as an
  identifier**, and position vLEI as the *product-phase upgrade* — which is *exactly* the pattern the
  two existing demos already use for GLEIF (org identity by LEI now, vLEI as narrative). So the winner
  is consistent with prior decisions, not in tension with them. The org-map C5 rule becomes a feature:
  Demo 3 is the demo that finally *shows* the org-identity layer the others deferred.
- **CTA regulatory turmoil (regulatory).** If the pitch leans on Corporate-Transparency-Act *reporting*,
  the March 2025 domestic exemption (>99% of entities) guts it. **Mitigation:** anchor the pain in the
  **bank CDD Rule** (KYB at account opening), which is unaffected, and treat the CTA's fluidity
  status-agnostically — the same move Demo 2 made with the enjoined §1033 rule. The fluidity is itself a
  talking point ("the pod-held credential lands wherever the final rule does").
- **Partner willingness.** Would a bank co-build a KYB demo? KYB is a *cost centre* every bank wants
  cheaper, and GLEIF is a **neutral, non-commercial member** ideal as the anchoring issuer (no
  competitive threat), with BIS Aperta and the Partners Programme giving air cover. Lower partner-risk
  than a lender demo, not higher.
- **ZK feasibility (scope).** The signature ZK beat — "prove no *undisclosed* beneficial owner ≥25%"
  or "the disclosed owner set is complete" — is a **set/threshold/count predicate**, not the numeric
  `filter_int_d{1..4}` inequality the current sparq circuits compile (zkp-fit; SPEC §3). This is the
  one genuinely novel circuit and the **principal build risk**. **Mitigation:** fall back to Tier B
  (precomputed manifest, "proved offline · verified live" per decision 0012) if the live circuit isn't
  ready, and/or scope the ZK beat to a simpler "entity in good standing / owner-count ≤ N disclosed"
  predicate. File as a `vc-kit` research bead before committing the scene.
- **Demo-in-scope.** A business persona onboarding at two banks + a regulator view is a clean 5-scene
  arc (§7) — comparable scope to Demo 2. Not a killer.

### F — Insurance portability (runner-up). "Why this could fail / what would kill it."

- **No member owns the data-broker role (EDMA-fit).** The pivotal CLUE/telematics aggregator
  (LexisNexis/Verisk) is **not** an EDMA member, so the most load-bearing app would carry a generic/
  unbranded role — weakening the "every member sees their seat" pitch that is Demo 3's whole point.
- **Incumbent already provides portability (impact).** CLUE is an FCRA consumer report a consumer can
  already pull free annually; the demo must justify what a pod/VC layer adds *beyond* existing FCRA
  access — a harder "why now" than KYB's.
- **Insurer competitive reluctance (partner willingness).** Underwriting/claims data is a competitive
  moat; USAA/AIG/Donegal have weaker incentive to enable a portable credential that lets a rival price
  their book than banks have to cut KYB cost.
- **Regulatory chill (regulatory).** The GM/Verisk enforcement makes cross-party driving-data sharing a
  hot stove; the demo must be scrupulously consent-first and framed as a *corrective*, not a re-creation
  of the pattern regulators just punished. Powerful narrative, but a live compliance-optics risk.
- **Weak headline pain citation (evidence).** Its biggest number ($13B) is only secondarily sourced (§5).

**Does the red-team change the ranking?** No — it *confirms* it. B's risks are all *mitigable within the
existing framework and prior decisions* (format → W3C-VC + LEI; CTA → CDD anchor; ZK → Tier-B fallback),
while F's core weaknesses are *structural* (no member data-broker, incumbent already provides
portability, insurer reluctance). B stays the winner; F stays the runner-up.

---

## 7. Recommendation — Candidate B, and its design sketch

**Build Demo 3 as the reusable organisational-identity + beneficial-ownership KYB journey**: a
fictional business opens accounts and credit at competing banks and satisfies a regulator's view,
carrying GLEIF-anchored organisational-identity, beneficial-ownership, and officer-authorization
credentials in its own pod instead of re-submitting formation documents and cap tables to each party.
This is the **highest-leverage** choice because it (1) opens a new **B2B / business-banking** sector
complementary to the two consumer-credit demos, and (2) finally *builds* the **GLEIF / org-identity
trust layer** that Demos 1 and 2 both explicitly deferred — turning "vLEI is product-phase narrative"
into a working scene, with GLEIF (a neutral member) as the anchor and every bank member as a relying
party.

### (a) Stakeholder cast (real EDMA members; concept-demo non-impersonation framing throughout)

| Role | Modelled on | EDMA? | Notes |
|------|-------------|:---:|-------|
| Convener / tour shell + Examiner View | **EDMA Solid CoP** | itself | Chapters-as-data, ecosystem map, compliance lens |
| Business data vault (pod host) | **Verizon** | Member¹ | Reuse decision 0003 — the vault carries across verticals; here it holds the *business's* pod |
| Organisational-identity issuer / root of trust | **GLEIF** | Member | Issues the LEI-anchored org-identity VC; **vLEI is the product-phase upgrade** (W3C VC 2.0 now) |
| Beneficial-ownership / incorporation-data issuer | *unbranded business registry / FinCEN BO source* | — | Generic, non-affiliation stated (same treatment as CFPB in Demos 1–2); no member owns this seat |
| Business bank #1 (KYB relying party) | **Bank of America** | Member | Business-banking onboarding; consumes the pod credentials |
| Business bank #2 (competing KYB relying party) | **Fifth Third** | Member + **DEP Founder** | Credit-line application; the ZK ownership-threshold beat |
| Open-finance / account-verification rail | **Mastercard** | Member¹ | Business account verification |
| Regulator / compliance lens | *unbranded "Examiner View"* over **FinCEN CDD Rule** | — | FDIC / Federal Reserve Banks (members) as convened observers, never branded |
| Standards steward | **EDMA/OMG (FIBO Business Entities)** + **GLEIF LEI** | itself | The FIBO-BE ↔ LEI ↔ FinCEN-CDD binding table = the CoP artifact |

¹ Verizon and Mastercard membership are internal-sheet-only (org-map C4) — re-verify before outreach.

### (b) The walkthrough — five scenes

Persona: **Jordan Blake**, owner of **Northwind Logistics LLC** (fictional business + owners, all data
simulated), opening business banking and a credit line at two banks.

| # | Scene | Beat | Anchor |
|---|-------|------|--------|
| 1 | **Fill the business vault** | GLEIF-modelled issuer writes a **Organisational-Identity VC** (LEI-anchored) into Northwind's pod; a registry-modelled issuer writes an **Incorporation + Beneficial-Ownership VC** (UBO list, ≥25% owners, control person); an **Officer-Authorization VC** attests Jordan may bind the entity | vLEI = org VC + role credentials (OOR/ECR analogue), modelled as W3C VC |
| 2 | **Onboard without re-submitting (KYB reuse)** | Bank #1 (BofA-modelled) runs its **CDD/KYB** check by *consuming* the org-identity + beneficial-ownership VCs from the pod — no re-collection of formation docs, EIN letter, or cap table. Account opened. Contrast card: today's 5-day, document-heavy KYB | FinCEN CDD Rule (verify entity + each ≥25% beneficial owner) |
| 3 | **Prove ownership without exposing the cap table (ZK)** | Jordan applies for a credit line at Bank #2 (Fifth-Third-modelled); proves via **ZK** that *no undisclosed owner ≥25% exists* / the disclosed owner set is complete — selective disclosure of the ownership predicate without revealing other owners' stakes/PII. Once the bank proceeds, granted VC access supplies the actual CDD record (ZK scoped to the predicate — decision 0005 house rule) | CDD 25% beneficial-ownership threshold |
| 4 | **Nothing goes stale** | An owner sells their stake; the Beneficial-Ownership VC is **re-issued through the existing grant**; the status list revokes the stale one; both banks see fresh ownership on their next check | CDD ongoing-monitoring; freshness = re-issue, status list = revocation (decision 0007) |
| 5 | **Control, audit, and the regulator view** | Jordan reads the **consent-receipt ledger** (which banks/regulators were granted what), revokes Bank #1 after closing that account, and the unbranded **Examiner View** shows the CDD Rule satisfied via a scoped, receipted regulator grant instead of a filing. Close: "open the next business account in one click — the vault is already full" | RESPA-analogue transfer / CDD; ledger is app-level (decision 0006) |

### (c) Framework packages reused

`@jeswr/solid-showcase` (walkthrough renderer + editorial gates), `@jeswr/solid-showcase-kit`
(disclaimer/trust pack, AppShell, credential/receipt cards, honesty panel), `@jeswr/solid-pod-guard`
(the KYB banks' pod-route auth boundary), `vc-kit` (W3C VC 2.0 issue/verify/status/reissue + sparq ZK
Tier A/B + honesty labelling), `@jeswr/synthetic-rdf` + `@jeswr/solid-seed` (shape-driven seeding),
`create-solid-demo` (scaffolds the new use case — Demo 3 is the framework's next
first-scaffold acceptance test after lending). Deploy model: Mode-1 in-browser pods + Mode-2a org-pod
multiplexer (decisions 0011/0013); VP-POST + ODRL/DPV dual rail (decision 0012); multi-zones (decision
0011). **No framework code changes should be required** — same success criterion as Demo 2.

### (d) New vocab / VC types

- **Organisational-Identity VC** — grounded in **FIBO Business Entities** (`BE/LegalEntities/LegalPersons`)
  + schema.org `Organization`; **LEI as identifier** (no KERI/ACDC — W3C VC 2.0 per decision 0004 / org-map C5).
- **Beneficial-Ownership VC** — FIBO `BE/OwnershipAndControl` (ownership parties, control) + the FinCEN
  CDD 25% concept; UBO list with ownership %.
- **Officer-Authorization VC** — the vLEI OOR/ECR role-credential analogue, as a W3C VC.
- **KYB/CDD-Decision (account-open) record.**
- **New ZK predicate** — beneficial-ownership *set/threshold/count* proof ("no undisclosed ≥25% owner").
  This is **not** the existing numeric `filter_int` inequality — flag as a `vc-kit` research bead; Tier-B
  precompute is the fallback (§6).
- **Standards artifact** — the **FIBO Business Entities ↔ GLEIF LEI ↔ FinCEN CDD** binding table, the CoP
  deliverable analogous to the FIBO↔MISMO (Demo 1) and FIBO↔FDX (Demo 2) tables.
- Residue vocab → the decision-0010 vocab site pattern (dedicated Vercel project, no minted IRI before
  the vocab is live). *FIBO-BE class coverage must be dereference-checked class-by-class in the
  data-model bead* (`BE/LegalEntities/LegalPersons` and `BE/OwnershipAndControl/OwnershipParties` return
  303/See-Other today; confirm the specific ownership-percentage and control-person classes exist, else
  fall back to residue vocab).

### (e) Honest simulated-vs-real scope

- **No real LEI issuance and no real GLEIF vLEI (KERI/ACDC)** — credentials are modelled as W3C VC 2.0;
  vLEI is stated on screen as the product-phase upgrade.
- **No real FinCEN BO-registry query and no real bank CDD system** — all payloads `simulated: true`.
- **Business and owners are fictional personas** — no real EIN, formation docs, or cap table.
- **The beneficial-ownership ZK predicate is research-grade** (same honesty panel as Demos 1–2) and may
  run **Tier B** ("proved offline · verified live") if the live circuit isn't ready.
- **CTA/FinCEN status is fluid** (domestic exemption removed >99% of entities from BOI *reporting* as of
  Mar 2025; final rule expected 2026) — demo copy stays status-agnostic and grounds the pain in the bank
  **CDD Rule**, which is independent of CTA reporting (the §1033-handling pattern from Demo 2).
- **The consent-receipt ledger is an app-level feature** (decision 0006), not a protocol guarantee.

### (f) Rough build-effort estimate

Comparable to Demo 2. The framework carries the renderer / trust / auth / seed / deploy dividend, so the
**new** work is: the KYB walkthrough JSON; per-org themes for ~6 apps (tour+examiner, vault,
org-identity issuer, registry/BO issuer, 2 banks); FIBO-BE + beneficial-ownership SHACL shapes + the
LEI/CDD binding table; the two-banks KYB-reuse beat; and the **beneficial-ownership ZK predicate** (the
one genuinely novel, critical-path circuit — the principal effort risk). Effort band: **similar to Demo 2's
scope**, with the ZK predicate as the dominant unknown; front-load a `vc-kit` spike on the set/threshold
circuit before committing scene 3's live-proof claim.

### Runner-up — F (Insurance), and why it lost

Insurance portability (3.75) is the strongest *new-sector* alternative and has three insurer members
(USAA/AIG/Donegal) plus a vivid consent-first narrative from the GM/Verisk enforcement. It lost to B on
three structural points the red-team confirmed: **(1) EDMA-fit** — the pivotal CLUE/telematics data-broker
role has *no member*, so the load-bearing app is unbranded, whereas B's anchor (GLEIF) *is* a neutral
member and every relying party is a member bank; **(2) marginal impact / "why now"** — CLUE already gives
FCRA portability, so F must justify what a pod adds, while B *builds the org-identity layer the whole suite
deferred*; and **(3) likelihood** — insurer reluctance to enable a rival-priceable portable credential and a
live regulatory chill on telematics sharing, vs. B's cost-centre alignment and neutral-issuer air cover
(BIS Aperta, GLEIF Partners Programme). F remains the best fast-follow if a fourth demo is scoped.

---

## 8. Corrections and caveats surfaced during research

Flagged explicitly so they do not leak into build/sales copy:

- **DPV is a W3C artifact, not EDMA's.** The Data Privacy Vocabulary is maintained by the **W3C DPVCG**
  ([w3id.org/dpv](https://w3id.org/dpv/)), *not* EDMA/OMG. Candidate I's premise ("grounded in EDMA's own
  DPV work") was factually wrong and is corrected here; EDMA's real standards asset is **FIBO**. Demos
  1–2 already use DPV correctly as a *W3C* vocabulary (decision 0006) — no change needed there, but never
  attribute DPV to EDMA.
- **vLEI is not purely "organisational" — it is entity-anchored but role/person-carrying.**
  Verified directly against GLEIF's own page (2026-07-22): the vLEI "enables counterparties to
  computationally verify the identity, authority, and **role of people acting on behalf of** any
  legal entity," combining the LEI (entity), an individual's identity, and their organisational
  role — governed by **ISO 17442-3** (2024)
  ([GLEIF](https://www.gleif.org/en/organizational-identity/introducing-the-verifiable-lei-vlei)).
  It still cannot be borrowed for a *personal, non-role* identity story (candidate A), which is why
  A scores low on EDMA-fit — but candidate B's design already gets this right by splitting an
  **Organisational-Identity VC** (entity, LEI-anchored) from an **Officer-Authorization VC** (the
  OOR/ECR role-credential analogue) rather than treating vLEI as one undifferentiated org credential
  (§7(d)).
- **Insurance "$13B underwriting inefficiency"** is secondarily sourced only — do not make it load-bearing.
- **Project Aperta reports no hard metric** — cite it as directional evidence of momentum, not a number.
- **ESG disclosure mandates are receding** (SEC rescission proposal May 2026; EU CSRD narrowed Feb 2026;
  Fannie closed its ESG dept) — any future ESG demo must not lean on a compliance-urgency hook.
- **Membership re-verification** — Mastercard and Verizon membership are internal-sheet-only (org-map C4);
  re-verify against edmcouncil.org before any outreach that names them.
- **Two figures in the original draft did not check out against their cited sources and were
  re-sourced 2026-07-22** (verification pass, this section): the winner's headline "$19.3B AML
  fines (2024)" was actually **global regulatory fines** (FTX-skewed, not AML-specific — replaced
  with the AML-specific **$1.23B H1-2025, +417% YoY** Fenergo figure), and the "5 days → under 24
  hours" KYB case study was misattributed to Sumsub (it is real, but sourced to iComply) — see §5.
  Neither figure was fabricated; both were mis-cited. Treat this as a reminder that every number in
  this doc should be re-spot-checked before it lands in sales copy, not only trusted because a URL
  is present.
- **A tenth candidate (J, healthcare-adjacent) was added after the initial draft** to cover the
  epic's explicit "healthcare-adjacent" example; it scores lowest of all ten (2.30) on thin,
  largely unverifiable pain evidence and the weakest EDMA-member fit in the set (§2, §4, §5).

---

## 9. References

All URLs accessed 2026-07. Repo grounding: `docs/research/org-map.md`,
`docs/research/small-dollar-lending-design.md`, `docs/research/prior-art.md`,
`docs/research/research-gaps.md`, `docs/research/showcase-framework-design.md`, `SPEC.md`,
`decisions/000{2,3,4,5,6,7,10,11,12,13}.md`.

**KYB / vLEI / beneficial ownership (winner):**
- Sumsub, KYB Verification Guide — https://sumsub.com/blog/kyb-guide/
- Shufti Pro, KYB in Banking — https://shuftipro.com/blog/kyb-in-banking/
- GBG, UBO verification — https://www.gbg.com/en-us/blog/ubo-verification/
- Fintech Global, 70% of banks lose clients to slow onboarding — https://fintech.global/2025/10/08/70-of-banks-lose-clients-due-to-slow-onboarding/
- GLEIF, Introducing the verifiable LEI (vLEI) — https://www.gleif.org/en/organizational-identity/introducing-the-verifiable-lei-vlei
- GLEIF Partners Programme (2026) — https://tradetreasurypayments.com/posts/gleif-launches-global-partners-programme-to-advance-lei-and-vlei-adoption-across-financial-and-digital-identity-systems
- BIS + GLEIF Project Aperta — https://www.biometricupdate.com/202606/gleif-bis-test-vlei-as-trust-layer-for-cross-border-open-finance
- GLEIF/BIS press release (PDF) — https://www.gleif.org/media/pages/newsroom/press-releases/bis-collaborates-with-gleif-to-use-leis-in-cross-border-open-finance-prototype/4fc37b3d9b-1780317252/2026-05-29_bis-collaborates-with-gleif-to-use-leis-in-cross-border-open-finance-prototype_v1.0.pdf
- FinCEN, removes BOI reporting for US companies (interim final rule) — https://www.fincen.gov/news/news-releases/fincen-removes-beneficial-ownership-reporting-requirements-us-companies-and-us
- Holland & Knight, What happened to FinCEN's CTA? (2026) — https://www.hklaw.com/en/insights/publications/2026/06/what-happened-to-fincens-corporate-transparency-act
- Morgan Lewis, US CTA insights — https://www.morganlewis.com/topics/us-corporate-transparency-act
- FIBO Business Entities — LegalPersons — https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LegalPersons/
- FIBO Business Entities — Ownership & Control — https://spec.edmcouncil.org/fibo/ontology/BE/OwnershipAndControl/OwnershipParties/
- Fintech.Global, global regulatory fines $19.3bn in 2024 (FTX-skewed, not AML-specific) — https://fintech.global/2025/02/19/global-regulatory-fines-soar-to-record-breaking-19-3bn-in-2024/
- Fenergo, regulatory penalties for global FIs up 417% in H1 2025 ($1.23B) — https://resources.fenergo.com/newsroom/regulatory-penalties-for-global-financial-institutions-skyrocket-417-in-h1-2025
- iComply, KYB for US community banks (5-day → under-24-hour case study) — https://icomplyis.com/smarter-kyb-for-u-s-community-banks-uncovering-risk-in-smb-accounts/
- Mintz, FinCEN eases beneficial-ownership re-verification (Feb 2026 exceptive relief) — https://www.mintz.com/insights-center/viewpoints/54751/2026-02-18-fincen-eases-beneficial-ownership-verification
- Mayer Brown, FinCEN risk-based relief from repeat beneficial-ownership verification (Feb 2026) — https://www.mayerbrown.com/en/insights/publications/2026/02/more-is-not-always-better-fincen-grants-risk-based-relief-from-repeat-beneficial-ownership-verification-requirements

**Consumer KYC / identity:**
- VMR, e-KYC market — https://www.vmr.biz/blog/e-kyc-market-15920
- MX, account-opening stats — https://www.mx.com/blog/account-opening-stats/
- Jumio, reducing onboarding abandonment — https://www.jumio.com/how-to-reduce-customer-abandonment/
- Prove, phone-centric identity — https://www.prove.com/blog/what-is-phone-centric-identity

**Regulatory reporting / compliance cost:**
- Fourthline, how much banks spend on compliance — https://www.fourthline.com/blog/how-much-do-banks-spend-on-compliance
- Mayer Brown, FinCEN RFI on AML compliance costs — https://www.mayerbrown.com/en/insights/publications/2025/10/fincen-issues-request-for-information-on-aml-compliance-costs-is-the-juice-worth-the-squeeze

**Open banking / §1033:**
- Open Banking Expo, FDX 114M connections — https://www.openbankingexpo.com/news/fdx-api-adoption-hits-114m-customer-connections/
- The Financial Brand, bank-switching intent — https://thefinancialbrand.com/news/customer-experience-banking/financial-marketers-bank-switch-new-account-primary-loyalty-112891
- Fintegration, Plaid vs Akoya — https://www.fintegrationfs.com/post/plaid-vs-akoya-a-comprehensive-comparison-of-financial-data-aggregators
- Cozen O'Connor, §1033 enjoined & under reconsideration — https://www.cozen.com/news-resources/publications/2026/section-1033-compliance-date-open-banking-rule-enjoined-and-under-reconsideration
- Moore & Van Allen, CFPB enjoined from enforcing 1033 — https://www.mvalaw.com/data-points/cfpb-enjoined-from-enforcing-personal-financial-data-rights-rule-1033

**Gig / income:**
- Oysterlink, gig economy statistics — https://oysterlink.com/spotlight/gig-economy-statistics/
- Fortunly, gig economy statistics — https://fortunly.com/statistics/gig-economy-statistics/
- Prudent AI, income verification for gig workers — https://www.prudent.ai/blog/why-traditional-income-verification-falls-short-for-gig-workers
- Equifax, The Work Number self-employed VOE — https://assets.equifax.com/assets/wfs/efx-ws-2102_the_work_number-self_employed_verification.pdf
- CB Insights, Argyle competitors — https://www.cbinsights.com/research/argyle-competitors-atomic-pinwheel-sterling-wage-truework-accurate-background-finch/

**Insurance (runner-up):**
- United Policyholders, CLUE reports — https://uphelp.org/clue-report-this-surprising-database-can-drive-up-your-homeowners-insurance-premiums/
- Texas DOI, free CLUE report — https://www.tdi.texas.gov/blog/get-a-free-clue-about-your-insurance-claims-history.html
- Sky.ai citing McKinsey, $13B underwriting gap (indicative only) — https://www.usesky.ai/article/digital-underwriting-gap-why-73-of-insurers-are-losing-13b-to-legacy-systems
- LexisNexis Telematics Exchange — https://risk.lexisnexis.com/products/telematics-exchange
- The Record, data-broker shuts driver-behaviour product — https://therecord.media/data-broker-shuts-product-driver-patterns

**Telco identity:**
- Mordor Intelligence, telecom identity & authentication market — https://www.mordorintelligence.com/industry-reports/telecom-identity-and-authentication-services-market
- Efani, SIM-swap fraud statistics 2026 — https://www.efani.com/blog/sim-swap-fraud-statistics-2026
- Deepstrike, SIM-swap scam statistics — https://deepstrike.io/blog/sim-swap-scam-statistics-2025
- Numeracle, Verizon BCID — https://www.numeracle.com/press-releases/verizon-bcid

**ESG:**
- IssueWire, 400 greenwashing enforcement actions 2026 — https://www.issuewire.com/400-greenwashing-enforcement-actions-in-2026-new-data-shows-regulators-targeting-esg-claims-1862352417121949
- ESG Today, cost of climate disclosure — https://www.esgtoday.com/study-reveals-cost-of-climate-disclosure-for-issuers-and-investors/
- SEC, proposed rescission of climate-disclosure rules (May 2026) — https://www.sec.gov/rules-regulations/2026/05/s7-2026-19
- Council of the EU, CSRD Omnibus simplification (Feb 2026) — https://www.consilium.europa.eu/en/press/press-releases/2026/02/24/council-signs-off-simplification-of-sustainability-reporting-and-due-diligence-requirements-to-boost-eu-competitiveness/
- Ballotpedia, Fannie Mae closes ESG department — https://news.ballotpedia.org/2025/04/29/fannie-mae-closes-esg-department/

**Consent-receipt / clean-room:**
- Growth Market Reports, data clean-room market — https://growthmarketreports.com/report/data-clean-room-market
- MarTech, LiveRamp acquires Habu — https://martech.org/liveramp-acquires-data-clean-room-start-up-habu/
- Kantara, Consent Receipt Specification — https://kantarainitiative.org/download/consent-receipt-specification/
- FDX + Kantara — https://www.financialdataexchange.org/FDX/FDX/News/Media-Mentions/FDX-and-Kantara.aspx
- W3C Data Privacy Vocabulary (DPV) — https://w3id.org/dpv/

**Healthcare-adjacent (candidate J):**
- DOL EBSA, COBRA continuation coverage FAQs (no usage statistics published) — https://www.dol.gov/agencies/ebsa/about-ebsa/our-activities/resource-center/faqs/cobra-continuation-health-coverage-workers
- HHS/ONC, TEFCA strengthens — one billion health records exchanged — https://www.hhs.gov/press-room/onc-strengthens-tefca-one-billion-health-records-exchanged.html
- Becker's Hospital Review, what's new with TEFCA in 2026 — https://www.beckershospitalreview.com/healthcare-information-technology/ehrs/whats-new-with-tefca-in-2026-3-updates/
