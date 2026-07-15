# Research gaps — completeness critique of the fan-out

Reviewed all nine docs in `docs/research/` in full (2026-07-15). Four sections: cross-doc contradictions, questions a SPEC author cannot yet answer, spot-check verification of load-bearing claims, and missing research areas.

## 1. Contradictions between docs

Ranked by SPEC impact. "Lean" = suggested resolution, per the autonomous-decision rule.

| # | Docs | Contradiction | Lean |
|---|------|---------------|------|
| C1 | pod-host vs sdk-survey vs zkp-fit | **Three different VC rails named.** pod-host puts Microsoft Entra Verified ID on screen as "the VC issuance/verification rails"; sdk-survey names `@jeswr/solid-vc` (ProofSuite seam) as "the VC centrepiece"; zkp-fit requires dual-signed credentials (`eddsa-rdfc-2022` via sparq-vc lineage + Schnorr-BJJ attestation) produced by native Rust seed tooling. Entra issues did:web wallet credentials via a SaaS API — it cannot produce the Schnorr-attested, pod-resident, RDFC-canonicalized credentials the ZK story needs | Build on `@jeswr/solid-vc` + sparq seed tooling; demote Entra to a narrative slide (or drop). pod-host's "two-layer story" must not leak into the architecture |
| C2 | vocab §6 vs zkp-fit Q1 | **Cents encoding overflows the circuits.** vocab mandates money "in minor units (cents)" (`mort:monthlyGrossIncomeCents` — e.g. 850000 = 6 digits; `appraisedValueCents` ≈ 11 digits). zkp-fit: the only compiled integer filters are `filter_int_d{1..4}` — **≤ 4 decimal digits**. No cents-denominated mortgage value fits; appraised value doesn't fit even in whole dollars | Per-field scaled units pinned by SHACL (monthly income in whole USD d4; balances/appraisal in units-of-$100 or $1000). Rewrite vocab §6; rename `*Cents` fields before anything is minted |
| C3 | vocab §6 vs zkp-fit Q1/Q3 | **DTI linear inequality is presented as provable but is not.** vocab's table offers `debt × 10000 ≤ income × dtiBps` as a "threshold proof shape ... over two committed values". zkp-fit: "arithmetic over two hidden operands" is explicitly NOT provable (no compiled member); only recasts are (a) disclosed income + hidden debt ≤ public bound, or (b) bureau DTI-band credential | zkp-fit wins (grounded in `gate_count_snapshot.json`). Amend vocab §6 row; SPEC picks recast (a) or (b) or cuts DTI |
| C4 | org-map vs pod-host | **Mastercard EDMA membership.** org-map counts Mastercard-Finicity among the "7 of 12 roles land on EDMA members" (internal sheet, 4 Jun 2026); pod-host: "Not found on EDM Council member list … unconfirmed". Fresh web search (2026-07-15) also finds no public confirmation | Treat as unconfirmed in SPEC; re-check the internal sheet's provenance or ask EDMA before any claim in showcase copy |
| C5 | org-map vs vocab | **vLEI depth.** org-map: "Back every stakeholder org's WebID with a GLEIF vLEI (role credentials for signing officers)"; vocab: vLEI is KERI/ACDC, "out of scope for the RDF model; LEI-as-identifier only" | vocab wins for the build; org-map's rec survives only as product-phase narrative |
| C6 | mortgage-process vs org-map vs gpt56-sol | **App set and count disagree.** Demo journey = "four apps + pod browser" but needs **two competing lender apps** (scene 2) plus a **servicer app** (scene 5, "old + new"); org-map assigns 12 roles with **one** lender and **no servicer role at all** ("if a servicer role is ever added"); gpt56-sol budgets "~6 branded apps" | SPEC must publish the definitive app list. Suggest: demo apps = scene-driven subset (borrower/pod, 2 lenders, 2–3 issuer apps, closing/servicer, tour); org-map's 12 roles = product-phase mapping table, not the build list. Assign lender #2 (Truist or Fifth Third per org-map alternates) and a servicer org |
| C7 | mortgage-process + pod-host vs lws-survey | **The access "audit log" doesn't exist anywhere surveyed.** Scene 5 shows "the full access audit log"; pod-host claims a "WAC/ACP audit trail". WAC/ACP define authorization, not auditing; lws-survey's capability matrix lists no logging/audit surface on the sparq server | Design an app-level access-receipt ledger (DPV consent records + per-grant log resources in the pod — access-manager's receipt pattern extends naturally), or cut the beat. Do not imply the protocol provides it |
| C8 | sdk-survey vs lws-survey | **ACP.** sdk-survey lists `css-memory-acp.json` as a feature requirement on `@jeswr/solid-server` ("ACP mode"); lws-survey: wasm server is WAC-only, "No ACP" (note lws-survey's own CI row mentions "Solid WAC+ACP" conformance ratchets — likely native-core scope; unresolved internally) | Showcase is WAC-only. Strip ACP assumptions from copied patterns; ACP goes on the upstream wishlist, not the critical path |
| C9 | sdk-survey vs showcase-patterns | **Playwright harness shape.** sdk-survey recommends adopting solid-sdk's mandatory skill routing incl. the two-webServer config pattern; showcase-patterns: "No `webServer` block — global-setup owns the whole lifecycle" | Cross-app suite: showcase-patterns (global-setup, random ports). Single-app smoke: either; document once in SPEC |
| C10 | mortgage-process vs zkp-fit | **Scene-2 numbers.** "income ≥ $85k" (annual, 5 digits — violates the d4 budget) and "score ≥ 680" vs zkp-fit's monthly-USD encoding and 620 | Pin monthly income (e.g. ≥ $7,000/mo) and one score threshold in SPEC |
| C11 | mortgage-process (internal) | **Freshness ≠ revocation.** Scene 4 satisfies the 10-business-day VOE rule by hitting "the employment VC's status endpoint" — a status list signals revocation, not recency. Recency comes from `validFrom`/`validUntil` or re-issuance | Define freshness semantics: short-validity employment VC + issuer re-issue endpoint; status list only for revocation |
| C12 | pod-host (internal) | "Three EDMA-relevant logos" overstated: its own candidate table says Microsoft is a CDMC-workgroup participant, "not on visible member list as such" | Say "two confirmed members + one workgroup participant", or drop the Microsoft logo claim |
| C13 | showcase-patterns vs org-map | Example brands drift (Fannie Mae/Truist in showcase-patterns vs Freddie Mac/BofA picked in org-map) | Cosmetic; SPEC pins the org-map picks |

## 2. Questions a SPEC author cannot yet answer

| # | Question | Blocking | Notes |
|---|----------|----------|-------|
| Q1 | **Where do pods live in the deployed demo?** Vercel apps need a public, persistent, TLS Solid server + OIDC issuer. sparq wasm is 127.0.0.1, in-memory, no TLS, no issuer; CSS hosting (volunteering precedent: solid-test.jeswr.org) contradicts the CSS→sparq thesis. No doc addresses production pod hosting at all | Tasks 4, 8, 10 | The single biggest gap — see §4 M1 |
| Q2 | Which IdP do deployed (and browser-e2e) apps log into? solid-auth-core needs a real Solid-OIDC issuer; lws-survey calls browser-login OIDC a "genuine (d)" gap with three options and no decision | Tasks 4, 8 | Decide: CSS-as-IdP, hosted `oidc-provider` dev issuer, or e2e auth bypass + which for production demo |
| Q3 | **What binds the Tier A live in-browser proof to the employer-signed credential?** Standalone `filter_int_d4` proves a threshold over a private value; issuer/commitment binding lives in the Rust-only composed manifests (Tier B). If Tier A carries no live binding, scene-2 copy ("prove income from your employer credential") overstates it | Task 9, honesty panel | Needs a precise statement of the Tier A trust story (e.g. verifier accepts filter proof + precomputed attestation sub-proof pair) |
| Q4 | Presentation/exchange protocol between borrower and verifier apps: VP format, challenge-nonce transport, how the lender app verifies WebID holder-binding cross-origin. No doc names a protocol (OID4VP? bespoke POST? pod-mediated inbox?) | Tasks 7, 8, 9 | vocab rule 8 says "Solid-OIDC/DPoP proves WebID control" but not how the *lender app* sees that proof |
| Q5 | Credential status infrastructure: who hosts the status list (BitstringStatusList? sparq's hidden-index list?), does `@jeswr/solid-vc` implement `credentialStatus`, and what does scene 4's green tick actually check | Tasks 7, 9 | sdk-survey doesn't mention status support in solid-vc |
| Q6 | Definitive app list + org per app (see C6), incl. lender #2 and servicer | Task 2 | |
| Q7 | Per-field ZK unit scaling + digit budgets (see C2) — a table field-by-field | Task 2 | Must precede vocab publication |
| Q8 | DTI: recast (a), recast (b), or cut (see C3) | Task 2 | |
| Q9 | Project vocab host: `jeswr.github.io/solid-mortgage/vocab#` requires GitHub Pages on a repo that per house rules starts **private** (this repo has no remote yet). Public vocab repo, Vercel domain, or make solid-mortgage public? | Tasks 2, 3 | lint:iris will fail on unpublished `mort:` IRIs — ordering constraint |
|10 | Demo-org WebID domains: "domains we control" — which, concretely (subdomains of jeswr.org? per-app Vercel domains?) | Tasks 2, 3 | Interacts with no-minted-IRIs rule |
| Q11 | Branding level at build time: does the pod app ship as "Verizon Data Vault" (illustrative) now, or neutral until partner-phase consent? org-map says illustrative-until-consent; pod-host writes copy as if Verizon-branded | Task 2 | Also: consent interstitial default vs $150/mo gate — showcase-patterns leans interstitial; confirm |
| Q12 | Time simulation for regulatory beats: scene 4 is "30 days later" — pre-dated `validFrom` in fixtures, an app-level demo clock, or narration only? | Tasks 7, 8 | Freshness windows are the demo's hook; needs a mechanism |
| Q13 | Ordering of Jesse-gated unblocks: npm bootstrap publish of `@jeswr/solid-server` + mirror-publish sweep of the 9-package shortlist — before or parallel to scaffold (task 3)? | Tasks 3, 4 | Both flagged "ask Jesse" in two docs; neither scheduled |
| Q14 | Where do the borrower's ZK witness inputs live (private value, commitment openings, `operand_enc` fixtures) — in the pod beside the VC? Access-controlled how? | Task 9 | Tier B says "manifest beside the VC"; Tier A inputs unaddressed |
| Q15 | Delivery format of the CoP showcase (live presented vs self-serve links, date) — drives Tier A vs B emphasis, password-gating, and the 10-minute script's rigidity | Task 2 | Likely known to Jesse; not in any doc |

## 3. Spot-checks of load-bearing claims (verified 2026-07-15)

| Claim | Doc | Verdict | Evidence |
|-------|-----|---------|----------|
| FIBO IRIs dereference at ontology, term, and named-individual level as `text/turtle` | vocab | **Confirmed** | curl 200 `text/turtle` for `LOAN/LoansGeneral/LoanApplications/`, `Loans/LoanToValueRatio`, `MortgageOrigination/MortgageLoanPurpose-RealPropertyPurchase` |
| bbs-2023 is a CRD and provides selective disclosure/unlinkability only — no range/predicate proofs (the reason thresholds route through sparq) | vocab, zkp-fit | **Confirmed** | W3C TR page: CRD 07 Apr 2026; "selective disclosure and unlinkable derived proofs"; no range-proof mention |
| Verbal VOE ≤ 10 business days before note date (≤ 120 calendar days self-employed) | mortgage-process | **Confirmed — citation label wrong.** The rule is real but the section is **B3-3.1-04**, not "B3-3.1-07" as the doc's text and digest state (URL was correct) | selling-guide.fanniemae.com B3-3.1-04 |
| Verizon is an EDM Council member (joined Mar 2021) — the pod-host linchpin | pod-host | **Confirmed** | PR Newswire 10 Mar 2021: "Verizon has joined the membership expanding the Council's engagement into the telecommunications industry" |
| Next.js can set COOP/COEP via `headers()` → multithreaded bb.js on Vercel (~4x prove speedup) | zkp-fit | **Confirmed** | Next.js docs: arbitrary custom response headers; only immutable-asset `Cache-Control` is restricted |
| `@jeswr/solid-server` not on npm; CSS latest = 8.0.0-alpha.3 | lws-survey, sdk-survey | **Confirmed** | registry.npmjs.org: 404 / dist-tags `{latest: 8.0.0-alpha.3}` |
| eOriginal managed ~92% of MERS eRegistry eNotes | org-map | **Confirmed but dated** — 1,143,427 of 1,241,561 through **Jan 2022**; share today unknown. org-map does carry the caveat; showcase copy must too | Wolters Kluwer/Businesswire Jul 2022 release |
| Mastercard is an EDMA member | org-map | **Not confirmable** from public sources (search finds no membership announcement); see C4 | Web search 2026-07-15 |

No checked claim was materially wrong; one citation label (B3-3.1-07) needs fixing in mortgage-process.md, and two claims (Mastercard membership, 92% eNote share) need caveats before appearing in showcase copy.

## 4. Missing research areas

| # | Area | Why it matters | Priority |
|---|------|----------------|----------|
| M1 | **Deployed pod infrastructure + hosted IdP** for the live Vercel demo: which server (hosted CSS? native sparq-lws-core behind TLS? prod-solid-server?), where it runs, persistence, seeded personas, uptime, cost. Every doc covers dev/test only | Without it tasks 8/10/11 have no target; the CSS-vs-sparq answer differs for dev vs deployed | **P0 — needs its own research task** |
| M2 | **Credential presentation protocol** (Q4) — survey OID4VP/DIDComm/pod-inbox options against the Solid + solid-vc stack | Cross-app demo choreography and holder binding are the spine of scenes 2–4 | P0 |
| M3 | **Regulatory optics beyond trademark**: Reg N / MAP Rule (mortgage-ads deception), UDAAP, state mortgage-advertising and NMLS "lender" presentation rules for apps that *look like* lender portals. showcase-patterns covers nominative fair use only | Real-bank branding in a *mortgage* context is more regulated than a volunteering demo; disclaimers may need mortgage-specific wording | P1 |
| M4 | **Prior art survey**: existing VC/digital-identity mortgage pilots (MISMO digital-identity/eMortgage workgroups, GLEIF pilots, Finastra/Trinsic/Bloom-era POCs, GSE digital-ID initiatives) | EDMA members will ask "who else has done this"; originality and standards-alignment claims need grounding | P1 |
| M5 | **Persona + fixture design**: demo borrower personas (fair-lending-sensitive: avoid protected-class stereotyping in a mortgage demo), URLA-realistic values consistent with the ZK digit budgets (C2), joint-borrower scope decision | Fixture values are load-bearing for circuits, SHACL bounds, and optics | P1 |
| M6 | **Access-receipt/audit ledger design** (C7): DPV consent receipts + grant/revoke log as pod resources; what scene 5 renders | Scene 5's payoff beat currently has no implementable substrate | P1 |
| M7 | Status-list + freshness infrastructure (Q5, C11): hosting, issuance cadence, revocation demo | Scene 4 and the ZK revocation member both depend on it | P1 |
| M8 | Demo time-control mechanism (Q12) | Regulatory-timing beats are the script's skeleton | P2 |
| M9 | Operating budget for the deployed stack (pod host, domains, Vercel projects, optional $150/mo gate) — pieces exist in showcase-patterns/pod-host, no total | £300–400/mo-style budget discipline applies elsewhere; EDMA demo should have a number | P2 |
| M10 | CoP delivery logistics (Q15) — likely an ask-Jesse, not research | Shapes Tier A/B emphasis and gating | P2 |

## Sources

- All nine research docs (local): `docs/research/{mortgage-process,org-map,pod-host,vocab,zkp-fit,sdk-survey,lws-survey,showcase-patterns,gpt56-sol}.md`
- FIBO dereference checks (curl, Accept: text/turtle, 2026-07-15): https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/LoanApplications/ · https://spec.edmcouncil.org/fibo/ontology/LOAN/LoansGeneral/Loans/LoanToValueRatio · https://spec.edmcouncil.org/fibo/ontology/LOAN/RealEstateLoans/MortgageOrigination/MortgageLoanPurpose-RealPropertyPurchase
- W3C vc-di-bbs (CRD 2026-04-07, selective disclosure only): https://www.w3.org/TR/vc-di-bbs/
- Fannie Mae Selling Guide B3-3.1-04, Verbal Verification of Employment: https://selling-guide.fanniemae.com/sel/b3-3.1-04/verbal-verification-employment
- Verizon joins EDM Council (10 Mar 2021): https://www.prnewswire.com/news-releases/edm-council-enters-telecom-industry-as-verizon-joins-as-member-301244227.html
- Next.js `headers()` (arbitrary custom response headers): https://nextjs.org/docs/app/api-reference/config/next-config-js/headers
- npm registry (2026-07-15): https://registry.npmjs.org/@jeswr%2fsolid-server (404) · https://registry.npmjs.org/@solid%2fcommunity-server (latest 8.0.0-alpha.3)
- Wolters Kluwer eOriginal 92% of MERS eNotes through Jan 2022: https://www.businesswire.com/news/home/20220727005059/en/Wolters-Kluwer-eVault-capability-now-open-to-more-U.S.-lenders-via-Ginnie-Mae-Digital-Collateral-Program
- Mastercard EDM Council membership — no public confirmation found (search 2026-07-15): https://edmcouncil.org/page/aboutedmcouncilrevi
