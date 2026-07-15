# Org map — real organisations for each mortgage-showcase role

Assigns a real organisation to each stakeholder app in the Solid mortgage showcase, preferring EDMA members (source: EDMA member/role directory, internal sheet snapshot 4 Jun 2026), else the most relevant US entity to approach for the build-it-for-real phase. Market facts web-verified July 2026.

**Result: 7 of 12 roles land on EDMA members** (Bank of America, Freddie Mac, Mastercard-Finicity, Wolters Kluwer, EDMA/OMG itself, GLEIF, USAA). Equifax covers two roles with one approach. Only appraisal, title, and the regulator lens have no plausible member.

## Role assignments

| # | Role | Primary | EDMA? | Alternates | Why this org for the real-product approach |
|---|------|---------|-------|-----------|---------------------------------------------|
| 1 | Lender / originator | **Bank of America** | Member | Truist (M), PNC (M), Fifth Third (M + DEP Founder), Citi (M) | Largest EDMA-member retail mortgage bank — $4.6B Q1 2025 originations vs PNC $4.5B, Truist $4.0B, Citi $3.1B, Fifth Third $1.4B (Goldman's $5.1B is not retail-branded lending). Its Digital Mortgage Experience (81% of applications initiated digitally, prefills from data on file) is exactly the pod-prefill story the showcase tells. |
| 2 | GSE / automated underwriting | **Freddie Mac** | Member + **DEP Founder** | Fannie Mae (M) | DEP-founder status = deepest EDMA engagement of the pair; Loan Product Advisor + AIM already accepts consumer-permissioned digital income/asset data (Finicity first service provider) — the AUS app models LPA/AIM. Fannie (DU + DU validation service) is the natural second app if the real phase wants dual-AUS realism. |
| 3 | Credit bureau | **Equifax** | No | Experian, TransUnion | Most mortgage-integrated bureau: authorized in Fannie's DU validation service and owner of The Work Number, so one approach covers roles 3+4. Brand the two apps distinctly (Equifax credit vs The Work Number). If per-app brand diversity is preferred, Experian takes the bureau app. |
| 4 | Income / employment verification | **Equifax Workforce Solutions (The Work Number)** | No | Mastercard-Finicity VOIE (M), Argyle, Truework, ADP (M, data source) | Dominant instant VOIE: 823M+ employer-sourced records, mortgage-specific "All Employers Within 60 Months", DU-validation report supplier. EDMA-member route if member preference dominates: Mastercard-Finicity VOIE is GSE-accepted too. Employer-sourced VOIE vs bank-sourced open banking (role 5) makes the two verification VC issuers usefully distinct in the demo. |
| 5 | Asset verification / open banking | **Mastercard (Finicity / Mastercard Open Banking)** | Member | Plaid, Akoya, FormFree | EDMA member and the first/initial service provider for Freddie's AIM (assets, income, direct-deposit income) plus a DU-validation report supplier — the only open-banking player with both member status and dual-GSE acceptance. |
| 6 | Appraisal / valuation | **Cotality (formerly CoreLogic)** | No | Clear Capital, ICE Mortgage Technology, (Altus Group — assessed, not fit) | Largest property data/analytics provider (CLIP property identifier, AVMs, appraisal workflow tools); rebranded Mar 2025. Clear Capital is the most approachable innovator (Universal Data Collection supports Fannie Value Acceptance + Property Data and Freddie ACE+ PDR) — good first call if Cotality stalls. EDMA member Altus Group is CRE-intelligence (Argus), not residential appraisal — no fit. |
| 7 | Title + settlement | **First American** | No | Fidelity National Financial, Old Republic, Stewart | Largest single title underwriter (23.1% of 2025 premiums vs Fidelity National Title 14.5%, Old Republic 14.0%, Stewart 10.9%; the FNF *family* is the largest group) and the strongest data/tech posture (First American Data & Analytics, Endpoint digital closing). |
| 8 | E-closing / RON | **Wolters Kluwer (eOriginal)** | **Member** | Proof (Notarize), Docusign Notary, Snapdocs, ICE Encompass eClose | Under-recognised member catch: eOriginal (acquired 2020) powers MERS eNote Solutions and managed ~92% of all eNotes on the MERS eRegistry (through Jan 2022); Ginnie Mae digital-collateral eVault. Covers eClosing/eNote/eVault; pair with Proof (leading RON platform) or MISMO-certified Docusign Notary for the notarisation session itself. |
| 9 | Data / standards steward | **EDM Association / OMG (FIBO)** credited jointly with **MISMO** | EDMA itself (MISMO: no) | — | FIBO's LOAN domain includes Mortgages and MortgageOrigination ontologies (incl. HMDA concepts) — the RDF vocabulary for pod data. MISMO (MBA subsidiary) v3.4 is the operative industry standard (URLA/ULAD, SMART Docs, RON standards). Credit both: pod data in FIBO-LOAN terms, VC payloads mapped to MISMO v3.4 fields, and publish the FIBO↔MISMO binding table — which *is* the CoP's "bindings" deliverable. MISMO workgroups are open to non-members: join the eMortgage/RON workgroup for the real phase. |
| 10 | Organisational identity | **GLEIF** | Member (GLEIF Americas) | — (unique; Interac (M) only for a Canadian variant) | vLEI = LEI-anchored verifiable credentials with role credentials (OOR/ECR) for signing officers — the natural credential behind every stakeholder org's WebID. Non-commercial, neutral, already mapped in the CoP sheet as identifier authority. |
| 11 | Regulator lens | **CFPB — represented generically, not impersonated** | No | FDIC (M), Federal Reserve Banks (12 are members), U.S. Treasury (M), FHFA | Build an unbranded "Examiner View" app: neutral government styling, no CFPB name/logo in the chrome, a visible "illustrative — not affiliated with or endorsed by any agency" disclaimer, and content drawn from public rules (TRID Loan Estimate / Closing Disclosure timelines, HMDA fields — both already in FIBO LOAN's HMDA coverage). For the real phase, invite EDMA-member public bodies (FDIC, Federal Reserve banks) as supervisory observers rather than seeking CFPB branding. |
| 12 | Homeowners insurance | **USAA** | Member | AIG (M, commercial/specialty focus), Donegal Insurance Group (M, regional), State Farm (non-member, #1 at 18.2%) | #3 US homeowners insurer (6.9% share, $11.9B DPW 2024) *and* an EDMA member *and* itself a top-20 bank mortgage originator ($875M Q1 2025) — one org that understands both sides of the closing. Membership-restricted customer base (military) is irrelevant for a demo. |

## EDMA members not previously considered that plausibly fit (sheet-4 scan)

| Member | Status | Plausible fit |
|--------|--------|---------------|
| Fifth Third Bank | Member; **DEP Founder** | Lender alternate with the deepest EDMA engagement of any candidate bank (volume is small: $1.4B Q1 2025) |
| Wolters Kluwer | Member | E-closing/eNote/eVault via eOriginal — adopted above as role 8 primary |
| ADP | Member | Payroll system of record; its employment verifications are fulfilled through The Work Number — candidate direct issuer of employer-sourced income/employment VCs in the real phase |
| USAA | Member | Homeowners insurance — adopted as role 12 primary; also a mortgage lender |
| PNC, Citizens Financial Group, M&T Bank, Huntington, Flagstar, Regions, Zions, Wintrust | Members | Bank-lender bench; Flagstar/M&T bring servicing heritage if a servicer role is ever added |
| Navy Federal Credit Union | Member | Largest US credit union; credit-union-flavoured lender variant |
| Arvest Bank | Member | Regional bank with a substantial mortgage servicing arm |
| Velera | Member | Credit-union service organisation — infrastructure partner for a credit-union lender variant |
| Sagen | Member | Private mortgage insurer (Canada) — if a 13th "mortgage insurance (PMI)" stakeholder is added there is **no US MI member** (MGIC/Arch/Radian/Essent/Enact are all non-members); Sagen fits only a Canadian variant |
| AIG, Donegal Insurance Group | Members | Insurance bench for role 12 |
| FDIC, 12 Federal Reserve Banks, U.S. Treasury, SEC, Indiana MPH | Members | Regulator-adjacent participants for role 11 convening |
| Verizon | Member | Consumer-scale borrower-pod hosting (already mapped R3 in the CoP sheet) — candidate brand for "where the borrower's pod lives" |
| Microsoft, Google, Snowflake | Members | Infrastructure/hosting, not stakeholder branding |
| Interac, Equitable Bank (CA); Nationwide Building Society, NatWest, Lloyds (UK) | Members | Non-US localisation variants only |

## Gaps and cautions

- **No EDMA member** exists for: credit bureau, appraisal (residential), title, regulator, or US mortgage insurance. These are the external-approach list for the real phase.
- **MERS eRegistry** (eNote system of record) is owned by ICE (non-member); the demo can reference it generically as "the eNote registry" without ICE branding.
- All showcase apps use *illustrative* branding until the named org consents — same non-impersonation treatment as the CFPB app for any org that has not signed on.

## Sources

- EDMA member directory + role map (internal): `/Users/jesght/.claude/projects/-Users-jesght-Documents-GitHub-jeswr-solid-mortgage/95574b57-dc0f-49f0-96e6-da23ea936933/tool-results/b7bzgvwfm.txt` (sheets 2 & 4, snapshot 4 Jun 2026)
- Bank mortgage origination rankings Q1 2025 — National Mortgage News: <https://www.nationalmortgagenews.com/list/20-banks-with-the-largest-mortgage-origination-volume>
- BofA Digital Mortgage Experience: <https://www.bankofamerica.com/mortgage/digital-mortgage-experience/>; 81% digital-initiation stat: <https://newsroom.bankofamerica.com/content/newsroom/press-releases/2022/02/record-81--of-bank-of-america-mortgage-applications-initiated-th.html>
- EDM Council Data Excellence Program founders (Freddie Mac, Fifth Third, LSEG, KPMG, PwC, Ortecha, Element22…): <https://edmcouncil.org/announcement/edm-council-launches-data-excellence-program/>
- Freddie Mac AIM + Finicity (initial service provider): <https://freddiemac.gcs-web.com/news-releases/news-release-details/freddie-mac-announces-latest-borrower-capacity-solution-aim>; AIM for assets: <https://sf.freddiemac.com/docs/pdf/fact-sheet/auto_asset_assess.pdf>
- Fannie Mae DU validation service report vendors (Finicity, Equifax…): <https://singlefamily.fanniemae.com/applications-technology/desktop-underwriter-validation-service/du-validation-service-verification-report-vendors>
- The Work Number scale (823M+ records): <https://theworknumber.com/>; mortgage products ("All Employers Within 60 Months"): <https://theworknumber.com/all-press/-/story/equifax-enhances-mortgage-verification-solutions-available-through-the-work-number>
- ADP employment verification fulfilled via The Work Number: <https://assets.equifax.com/wfs/theworknumber/assets/sbs-reference-guide.pdf>
- Cotality rebrand (Mar 2025), CLIP: <https://www.cotality.com/press-releases/meet-cotality>
- Clear Capital Universal Data Collection for Fannie Value Acceptance + Property Data / Freddie ACE+ PDR: <https://www.clearcapital.com/solutions/gse-data-collection/>
- Title underwriter market share 2025 (First American 23.1%, FNT 14.5%, Old Republic 14.0%, Stewart 10.9%) — ALTA: <https://www.alta.org/news-and-publications/press-release/ALTA-Reports-2025-Market-Share-and-Title-Insurance-Premium-Volume>
- Wolters Kluwer eOriginal — MERS eNote Solutions + 92% eVault share: <https://www.wolterskluwer.com/en/news/merscorp-holdings-launches-mers-enote-solutions-powered-by-eoriginal>; Ginnie Mae digital collateral: <https://www.wolterskluwer.com/en/news/wolters-kluwer-evault-capability-now-open-to-more-us-lenders-via-ginnie-mae-digital-collateral>; product: <https://www.wolterskluwer.com/en/solutions/eoriginal/digital-mortgage>
- Proof (Notarize) RON platform landscape: <https://www.proof.com/blog/get-to-know-the-top-10-remote-online-notarization-platforms-in-2025>; Docusign Notary MISMO RON certification: <https://www.docusign.com/blog/docusign-notary-now-mismo-certified-remote-online-notarization>
- MISMO (MBA subsidiary): <https://en.wikipedia.org/wiki/MISMO>; v3.4 reference model: <https://www.mismo.org/standards-resources/mismo-product/mismo-version-3-4>; URLA/ULAD on MISMO v3.4: <https://sf.freddiemac.com/tools-learning/uniform-mortgage-data-program/ulad>; RON workgroup (open participation): <https://www.mismo.org/get-involved/workgroup/remote-online-notarization-dwg>
- FIBO LOAN — Mortgages ontology: <https://spec.edmcouncil.org/fibo/ontology/LOAN/RealEstateLoans/Mortgages/>; Mortgage Origination ontology: <https://spec.edmcouncil.org/fibo/ontology/LOAN/RealEstateLoans/MortgageOrigination/>; repo (incl. HMDA coverage): <https://github.com/edmcouncil/fibo>
- GLEIF vLEI: <https://www.gleif.org/en/vlei/introducing-the-verifiable-lei-vlei>
- Homeowners insurers 2024 (State Farm 18.2%, Allstate 9.0%, USAA 6.9%…) — III/NAIC: <https://www.iii.org/fact-statistic/facts-statistics-insurance-company-rankings>
- CFPB TRID rules (regulator-lens content source): <https://www.consumerfinance.gov/compliance/compliance-resources/mortgage-resources/tila-respa-integrated-disclosures/>
