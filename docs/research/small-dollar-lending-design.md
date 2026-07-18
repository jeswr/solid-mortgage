<!-- AUTHORED-BY Claude Fable 5 -->

# Small-dollar lending showcase — grounding + design (sm-qz3j.1)

Design of record for the SECOND Solid showcase: a US **small-dollar / consumer-installment
lending** journey (a ~$2,000 personal installment loan), built on the generic
`@jeswr/solid-showcase` walkthrough framework (`docs/research/showcase-framework-design.md`)
via `create-solid-demo`. Research grounding for every quantified claim is cited inline and
indexed in `docs/research/small-dollar-lending-sources.md`. Facts are cited; **design
choices are marked as such**. All web facts verified July 2026.

Same trust rails as the mortgage showcase: role-first "modelled on X" branding, visible
"concept demonstration — not affiliated with or endorsed by <org>" disclaimers on every
branded surface, `noindex`, no real PII, fictional personas only. EDMA membership claims
come from the internal EDMA role-map sheet (snapshot 4 Jun 2026, via
`docs/research/org-map.md`) and are **flagged for re-verification before any partner
outreach**.

---

## 1. Why this vertical (the demo's thesis)

- Unsecured personal lending is at record scale: **$276B in balances across 26.4M
  consumers** (Q4 2025), with a record **7.2M originations in Q3 2025** and subprime
  borrowers leading growth [1][2].
- The excluded alternative is brutal: **12M Americans/year** use payday loans, averaging
  8 loans of $375 and **$520 in fees**, at a typical **391% APR** ($15 per $100 per two
  weeks) [3]; only 19 states + DC cap small-loan APRs in the 16–36% band, and Delaware and
  Missouri cap nothing at all [4][5].
- The people locked out are the thin-file/no-file population: FinRegLab estimates **about
  one-third of US adults have thin or no credit files** and another quarter score below
  prime [6]; Prism Data puts **76M US consumers** at "little to no traditional credit
  history" [7]. (Caution: the famous CFPB "26M credit invisibles" figure was **formally
  corrected in June 2025** — the corrected estimate is ~13.5M (5.8%) in 2010 falling to
  **~7M (2.7%) by December 2020** [8][9]. Demo copy must use the corrected numbers or the
  FinRegLab/industry framings, never the retracted 26M/45M.)
- Cash-flow underwriting demonstrably fixes the exclusion: FinRegLab's independent study
  (six providers incl. Oportun and Petal, analysis by Charles River Associates) found
  cash-flow variables **predictive of credit risk on their own and additive to bureau
  data** [6][10]; Prism's consortium CashScore v4 claims **+28% approvals at flat risk, or
  −16% defaults** [7]; Oportun alone has helped **1.1M+ people with no FICO score start a
  credit history** [11][12].
- The data rails for it exist and are consolidating: FDX's API now carries **130M+
  consumer account connections** (~75% of the addressable US market) and was recognised by
  the CFPB as an open-banking standard-setting body in January 2025 [13][14] — while the
  CFPB's §1033 personal-financial-data-rights rule itself is **enjoined and being
  rewritten** (April 2026 compliance date passed unenforced) [15][16]. A borrower-held
  Solid pod is the market-led answer that doesn't wait for the rulemaking.
- The fraud and PII stakes are as sharp as in mortgage: the 2017 Equifax breach exposed
  **147M people** and settled for up to $700M [17]; synthetic-identity fraud is the
  fastest-growing credit-fraud category with annual US loss estimates ranging **$6B (Fed,
  2016) to $20B+ (industry, citing Boston Fed)** [18][19] (spread flagged in §9 —
  pick one figure before copy lands).

**Thesis**: the mortgage showcase proved "reusable verified data kills a 44-day, $11.6k
process". The lending showcase proves the same architecture at the other end of the
market: **a 10-minute, $2,000 decision where the winning move is inclusion** — permissioned
cash-flow data + reusable VCs turn a thin-file decline into a priced approval, without the
borrower re-surrendering their identity, payroll, and bank history to every lender they
shop.

## 2. The real journey — ground truth

Stages of a US small-dollar / personal installment loan, with the regulatory or market
anchor for each. (Structure mirrors `mortgage-process.md`.)

| # | Stage | What happens today | Anchor / timing |
|---|-------|--------------------|-----------------|
| 1 | Shopping / pre-qualification | Borrower rate-shops online; each lender's soft-pull pre-qual form re-collects PII (name, address, SSN last-4, income). High-APR products dominate search results for near-prime | 19 states + DC cap $500-loan APRs 16–36%; 43 states + DC cap a $2,000 2-year loan; DE/MO cap nothing [4][5] |
| 2 | Application | Full application: identity, income, housing cost, SSN. Online lenders decision in minutes-to-hours | Fifth Third personal loans: $2,000–$50,000, online apply for existing customers [20] |
| 3 | Identity verification & fraud screen | KYC/CIP: document or data-based IDV, phone-intelligence signals, synthetic-identity screen | Socure consortium: 2,700+ customers, ~2B identities; Sigma Synthetic Fraud claims $3B+ prevented in a year [19]; Prove Pre-Fill pre-populates applications from carrier-verified phone identity [21] |
| 4 | Income / employment verification | Instant database hit (The Work Number: 823M+ records) or consumer-permissioned payroll connection (Argyle, Truework, Pinwheel, Truv); fallback = pay-stub upload | The Work Number scale [22]; Argyle/Truework/Pinwheel serve personal lending explicitly [23] |
| 5 | Bank-account / cash-flow permissioned data | Borrower links bank account via aggregator (Plaid, Mastercard Open Banking/Finicity, MX); lender sees balances, income streams, NSF/overdraft events | FDX API: 130M+ consumer account connections [13]; FCRA-compliant cash-flow scores now flow through CRAs (Plaid Check; Prism CashScore distributed via Equifax) [24][7] |
| 6 | Underwriting decision | Bureau score + (increasingly) cash-flow score; AI-lender automation is the benchmark: **91% of Upstart loans fully automated**, 43% more approvals vs a traditional model | Upstart 2024 automation + approval-lift claims [25]; FinRegLab predictiveness findings [6]; bank small-dollar products (Huntington Standby Cash) underwrite on **deposit history, not credit score** [26] |
| 7 | Adverse action or offer | Declines require an ECOA/Reg B adverse-action notice with principal reasons; approvals require TILA/Reg Z closed-end disclosures (APR, finance charge, payment schedule) | Reg B §1002.9 (30 days); Reg Z §§1026.17–18 [27][28] |
| 8 | Funding / disbursement | ACH (next-day), or instant: push-to-card (Mastercard Send / Visa Direct, ≤30 min), RTP, FedNow. 72% of consumers pick instant when offered; SoFi funds 82% same-day; OneMain "as fast as an hour" | Push-to-card + RTP/FedNow rails [29]; instant-preference stat [29]; SoFi/OneMain funding claims [30] |
| 9 | Servicing / repayment | Mostly lender-self-serviced; autopay via ACH debit. CFPB Payday Rule payment provisions (in effect **30 March 2025**): no third withdrawal attempt after two consecutive failures without fresh authorization; advance notice of first attempt. Reg E bans conditioning credit on preauthorized EFT | 12 CFR 1041 payment provisions [31][32]; EFTA/Reg E §1005.10(e) [33] |
| 10 | Credit reporting / graduation | On-time payments furnished to bureaus build the file (Huntington reports Standby Cash activity; Oportun's model graduates no-file borrowers) | Huntington reporting [26]; Oportun 1.1M first-time credit histories [11] |
| 11 | Repeat borrowing | The dominant pattern at this end of the market — and today every new loan repeats steps 1–5 from zero | Pew: payday borrowers average 8 loans/yr [3] |

### Pain points Solid + VCs demonstrably fix

| Pain | Evidence | Solid/VC fix |
|------|----------|--------------|
| Repeated PII surrender while shopping | Every pre-qual form re-collects identity + income; each lender stores a copy. Bureau-scale custody failure: Equifax 2017, 147M people [17] | ZK pre-qual: prove eligibility predicates to N lenders with zero PII left behind |
| Re-verification per application | Income and bank data re-pulled per lender, per loan; verifier fees per pull; repeat borrowers (8 loans/yr [3]) restart every time | VCs issued once into the pod, re-presented in seconds; freshness = `validUntil` + status list, not re-collection |
| Thin-file exclusion | ~1/3 of adults thin/no-file [6]; 76M little-to-no history [7]; excluded borrowers land at 391% APR [3] | Permissioned cash-flow VC + cash-flow score make the invisible visible: +28% approvals at flat risk [7] |
| Fraud / synthetic identity | $6B–$20B+/yr loss estimates [18][19]; 44% of FIs rank synthetic ID their top-tracked threat [19] | Issuer-signed identity VC (IDV done once, strongly) + holder binding beats per-lender form data that synthetics game |
| Slow funding for urgent needs | Banks up to 7 days; online 1–5 days typical [30] — while the borrower's car sits in the shop | Verified-at-presentation data collapses decision time; instant rails (push-to-card/RTP) close the loop in minutes [29] |
| No visibility or control | Borrower can't enumerate who holds their bank history; aggregator grants outlive the loan | Pod access panel: scoped ODRL grants, DPV consent receipts, one-click revocation after payoff |
| Repayment coercion risk | Failed-withdrawal cascades drove the 1041 payment provisions [31]; Reg E compulsory-use ban exists for a reason [33] | Repayment authorization as an explicit, inspectable, revocable grant with the 1041 rails enforced in code |

## 3. Role assignments — real organisations

**Design choice**: prefer EDMA members where a real member owns the seat; best-fit US
entity otherwise. Membership from the internal sheet (4 Jun 2026) — **re-verify all
flags before outreach**. Result: **7 of 12 roles land on EDMA members** (Fifth Third,
Mastercard ×2 seats, Verizon, GLEIF, EDMA/OMG itself, plus a deep member bench on the
lender seat: Huntington, Bank of America, USAA, Navy Federal).

| # | Role | Primary (modelled on) | EDMA? | Alternates | Why this org owns the seat |
|---|------|----------------------|-------|-----------|----------------------------|
| 1 | Bank installment lender (primary lender app) | **Fifth Third Bank** | **Member + DEP Founder** | Huntington (M — Standby Cash, deposit-history underwriting, no credit-score check [26]); Bank of America (M — Balance Assist: $500 / flat $5, 1.6M loans >$700M since 2020 [34]); USAA (M — personal loans funded ≤1 business day [35]); Navy Federal (M) | Deepest EDMA engagement of any candidate (DEP Founder, same rationale as mortgage org-map); a real unsecured personal-loan product at exactly the demo's ticket: **$2,000–$50,000, next-business-day funding, digital apply for existing customers** [20] |
| 2 | Cash-flow / mission-driven fintech lender (competing lender app) | **Oportun** | No | Upstart (91% full automation [25]), OneMain, Avant, Petal (card-shaped) | The canonical US mission-driven installment lender for thin-file borrowers: **$300–$10,000 loans; $22B disbursed over 20 years; 1.1M+ customers with no FICO score started credit histories**; a FinRegLab cash-flow study participant [11][12][6]. Its seat *is* the inclusion story |
| 3 | Credit bureau (traditional score + furnishing) | **Equifax** | No | TransUnion (publisher of the market's benchmark personal-loan data [1]), Experian | Continuity with the mortgage showcase (one partner approach covers both demos); owns The Work Number (role 4) **and distributes Prism CashScore/attributes** (role 6) [24] — one org, three rails |
| 4 | Income / employment verification | **Equifax Workforce Solutions (The Work Number)** | No | Argyle, Truework, Pinwheel, Truv (consumer-permissioned payroll; all serve personal lending [23]) | Dominant instant VOIE database (823M+ records) [22]; the payroll-API firms are the consumer-permissioned counterweight and the better *conceptual* fit for pod-mediated data — Argyle is the named alternate if a second issuer brand is wanted |
| 5 | Bank-data aggregator / open banking | **Mastercard (Open Banking / Finicity)** | Member¹ | Plaid, MX, Akoya (bank-owned, FDX-native) | Same seat it holds in the mortgage demo; member¹; account-verification + lending data products in production. ¹Membership from internal sheet only — **re-verify** (org-map C4) |
| 6 | Cash-flow underwriting analytics (the score) | **Prism Data** | No | Nova Credit (Cash Atlas), Plaid Check (Plaid's CRA [24]), Petal-adjacent tooling | Pioneered the consortium cash-flow score; **CashScore v4: +28% approvals at flat risk / −16% defaults; 76M-consumer thin-file framing**; FCRA-positioned and distributed through Equifax and Plaid [7][24] |
| 7 | Identity verification & fraud | **Socure** | No | Prove (phone-centric Pre-Fill [21]), Alloy (orchestration), SentiLink (synthetic specialist), Mitek/Jumio (doc IDV) | Scale + synthetic focus: consortium of 2,700+ customers, ~2B identities, Sigma Synthetic Fraud with $3B+ claimed prevented [19]. Issues the demo's identity VC |
| 8 | Disbursement rail | **Mastercard (Mastercard Send)** | Member¹ | Visa Direct, The Clearing House RTP, FedNow (operated by the Federal Reserve — 12 Reserve Banks are members, but government rails are referenced generically, not branded — same treatment as CFPB in mortgage) | Push-to-card delivers to any debit card in ≤30 min [29]; one member org credibly owns both open-banking data (5) and money movement (8) — mirrors Equifax's dual seat in mortgage |
| 9 | Servicing / repayment platform | **The lender self-services** (industry norm at this ticket size); platform nod: **LoanPro** | No | Peach Finance; bank core systems | Fintech installment lenders overwhelmingly self-service; LoanPro is the named modern servicing core (and publicly documents 1041 payment-provision compliance [32]). **Design choice**: no separate servicer brand/app — repayment is a scene in the winning lender's app |
| 10 | Data / standards steward | **EDMA/OMG (FIBO)** jointly with **FDX** | EDMA itself (FDX: no) | — | FIBO LOAN's LoansSpecific/ConsumerLoans ontology grounds the RDF loan model (dereference-check in the data-model bead) [36]; FDX is the CFPB-recognised open-banking standards body whose API shapes the cash-flow VC payloads (130M+ connections) [13][14]. The FIBO↔FDX field binding table is this demo's CoP standards artifact (analogue of the mortgage FIBO↔MISMO table) |
| 11 | Organisational identity | **GLEIF** | Member (GLEIF Americas) | — | Same seat as mortgage: stakeholder orgs referenced by LEI; vLEI is product-phase narrative |
| 12 | Regulator lens | **CFPB — represented generically, never impersonated** | No | FDIC (M), Federal Reserve Banks (M), state regulators (unbrandable), DoD (MLA) | Unbranded "Examiner View" over public rules: Reg Z disclosures, Reg B adverse action, 12 CFR 1041 payment provisions, MLA 36% MAPR, Reg E compulsory-use ban (§7) |
| — | Borrower data vault | **Verizon** | Member | — | **Design choice**: reuse mortgage decision 0003 — the consumer-scale data custodian seat ("where the borrower's pod lives") is use-case-independent, and reusing the brand shows EDMA members that *the vault carries across verticals* — the whole point of the second demo |

### EDMA-member bench specific to this vertical

| Member | Fit |
|--------|-----|
| Huntington | The strongest *product* fit on the bench: Standby Cash is a live bank small-dollar line ($100–$750 instant, up to $1,000 with autopay history) underwritten on **checking-account history, not credit score** — the demo's cash-flow-underwriting beat is literally its product logic [26]. First-call alternate for role 1 |
| Bank of America | Balance Assist: $500 for a flat $5 in three installments; 1.6M loans / $700M+ since 2020 [34] |
| USAA, Navy Federal | Member personal-loan lenders (USAA funds in ≤1 business day [35]; NFCU is the largest US credit union) — credit-union/military-flavoured lender variants |
| PNC, Citizens, M&T, Regions, Zions, Wintrust, Flagstar | Bank-lender bench (Regions also has a documented small-dollar product history) |
| Velera | CUSO infrastructure if a credit-union lender variant is built |
| ADP | Payroll system of record — candidate direct issuer of income VCs in the partner phase (verifications fulfilled via The Work Number today) |
| FDIC, Federal Reserve Banks, U.S. Treasury | Regulator-adjacent conveners for role 12 (never branded) |

### Gaps and cautions

- **No EDMA member** owns: credit bureau, income-verification database, cash-flow
  analytics, identity/fraud, or the regulator lens — external-approach list for the
  partner phase (Equifax again covers two seats with one approach; adding Prism's
  Equifax distribution makes it effectively three).
- Fifth Third's online personal-loan apply is **limited to existing customers ≤$25k**
  [20] — the demo dramatizes an idealized open flow; the one-pager for Fifth Third
  should present pod-based onboarding as the fix for exactly that limitation.
- Mastercard and Verizon membership: internal-sheet only (org-map C4) — re-verify.
- Government rails (FedNow) and agencies (CFPB, DoD/MLA) are referenced generically with
  non-affiliation disclaimers, per the mortgage examiner-view treatment.

## 4. The Solid value proposition for small-dollar lending

What the architecture buys, pain-by-pain (mechanisms are the same stack as the mortgage
showcase — pods + WAC grants + DPV receipts + W3C VC 2.0 + sparq ZK — so the second demo
also proves the *stack* is use-case-generic):

1. **Borrower-controlled data vault** — identity, payroll, and bank-transaction data live
   in the borrower's pod, not in N lender CRMs. The Equifax-147M [17] lesson becomes an
   architecture: parties get scoped, revocable, receipted access instead of copies.
2. **Reusable VCs** — identity (IDV-issuer-signed), income/employment
   (payroll-attested), and bank cash-flow (aggregator-attested, FDX-shaped) credentials
   are issued **once** and re-presented to any lender. The 8-loans-a-year repeat borrower
   [3] onboards once, ever.
3. **Eliminated re-verification** — freshness is `validFrom`/`validUntil` + Bitstring
   Status List, checked in seconds; a lapsed income VC is a one-click re-issue through the
   existing grant (mortgage scene-4 pattern reused).
4. **Faster, more inclusive decisioning** — the cash-flow VC carries the
   FinRegLab-validated signal [6]; a lender consuming it can decision a thin-file
   borrower in seconds (the 91%-automated benchmark [25]) and approve where a
   bureau-only model declines (+28% at flat risk [7]).
5. **ZK for privacy-preserving eligibility** — the sparq Noir/UltraHonk rail proves
   pre-qual predicates without disclosure: `net monthly income ≥ X`, `cash-flow score ≥
   Y`, `NSF events in last 90 days = 0`. **House rule carried over (decision 0005)**: ZK
   only where the property is *not* disclosed downstream — shopping/pre-qual only; once a
   lender is chosen, the application uses granted VC access, because Reg Z/Reg B
   compliance needs actual figures.
6. **Consent you can read** — every grant/revocation writes a DPV consent receipt; the
   repayment authorization is an ODRL policy the borrower can inspect and revoke, with
   the 1041 two-failed-attempts rail [31] enforced in code — regulation rendered as
   architecture, which is the Examiner View's whole pitch.
7. **Policy tailwind without policy dependency** — §1033 is enjoined and being rewritten
   [15][16]; FDX keeps standardising anyway [13]. A pod-held, FDX-shaped cash-flow VC
   gives EDMA members a consumer-data-portability story that is real today and lands on
   whatever the final rule says.

## 5. Demo personas (fictional — no real PII)

| Field | Value |
|-------|-------|
| Name | **Maya Torres** — fictional persona, all data simulated |
| Age / situation | 27, Columbus OH; transmission failure — needs **$2,000** within days to keep her commute to work |
| Work | W-2 shift supervisor at *Brightline Staffing LLC* (fictional employer) + weekend rideshare income |
| Credit file | **Thin file**: 14 months of history, two tradelines; bureau score **612** (near-prime) — priced out or declined on bureau data alone |
| Cash flow | Net monthly deposits **$2,860** across two income streams; **0 NSF/overdraft events in the last 90 days**; average daily balance $940 |
| Simulated cash-flow score | **720** (illustrative scale — pin to the real CashScore range during build, §9) |
| Loan sought | $2,000, 18-month installment, target APR < 36% |

**ZK threshold pinning (design choice, mirrors Alex Rivera)**: persona values are pinned
above the scene-2 proof thresholds — income ≥ $2,200/mo, cash-flow score ≥ 660, NSF₉₀ = 0
— and the persona card footnote states the pinning. Secondary personas (walk-on, not
played): a *Brightline Staffing* payroll officer (income-VC issuance) and a loan officer
per lender. The fictional-descriptor rule (`persona.descriptor` must contain
"fictional"/"simulated") is enforced by `parseWalkthrough`.

## 6. The walkthrough — five scenes

Regulatory/market timings are the script's skeleton; each scene names its anchor.
(~10 minutes; structure identical to the mortgage five-scene arc so the framework renders
both from data alone.)

| # | Scene | Beat | Anchor |
|---|-------|------|--------|
| 1 | **Fill the vault** | Three issuer flows write VCs into Maya's Data Vault: identity VC (Socure-modelled IDV, done once, strongly), employment+income VC (The Work Number-modelled), bank cash-flow VC + cash-flow-score VC (Mastercard Open Banking-modelled connection feeding a Prism-modelled score) | FCRA-regulated cash-flow scores exist today (Plaid Check CRA; CashScore via Equifax) [24][7]; FDX-shaped payloads [13] |
| 2 | **Shop without stripping** | Maya proves `income ≥ $2,200/mo ∧ cash-flow score ≥ 660 ∧ NSF₉₀ = 0` via ZK to **two competing lenders** (Fifth Third-modelled bank; Oportun-modelled fintech) — no PII, no credit pull, no copies left behind. Both return priced pre-qual offers | The alternative for near-prime shoppers is a 391%-APR market [3]; ZK scoped to pre-qual only (decision 0005 carried over) |
| 3 | **One decision, two models** | Maya picks the fintech lender; scoped pod grant; application prefills from the pod; cash-flow underwriting approves in seconds at 32.9% APR where the bureau-only model priced her out — the Reg Z disclosure lands back in the pod. Contrast card: the bank's bureau-only counter-decision with its Reg B adverse-action reasons | 91% of the AI-lender benchmark's loans are fully automated [25]; +28% approvals at flat risk from cash-flow data [7]; Reg Z §§1026.17–18, Reg B §1002.9 [27][28] |
| 4 | **Funded in minutes** | Maya grants disbursement access; a Mastercard-Send-modelled push-to-card payment lands in ≤30 minutes, receipt in the pod. Contrast card: banks take up to 7 days; 72% of consumers choose instant when offered | Push-to-card ≤30 min [29]; instant-preference and funding-time stats [29][30] |
| 5 | **Repay, build, stay in control** | Repayment autopay as an inspectable ODRL grant with the 1041 rails visible (advance notice; no third attempt after two failures without fresh authorization); on-time payments issue a **repayment-history VC** (the credit-building graduation beat — 1.1M+ first-time credit histories [11]); at payoff Maya **revokes** the lender's bank-data access and reads the consent-receipt ledger. Closing beat: "her next loan is one click — the vault is already full" | 12 CFR 1041 payment provisions, in effect 30 Mar 2025 [31]; Reg E compulsory-use ban [33]; furnishing/graduation practice [26][11] |

**Scene-3 design note (the demo's signature beat)**: the mortgage demo's drama was *speed
and staleness*; this demo's drama is **inclusion** — the same borrower, same data,
decisioned two ways on screen: bureau-only (decline/price-out, with the adverse-action
notice rendered honestly) vs bureau+cash-flow (approve). This is FinRegLab's finding [6]
made walkable, and it is why the fintech-lender seat exists.

### 6.1 Application registry (build plan for create-solid-demo)

Seven zone apps + shell. Slugs are **role-derived, never org-derived** (R4 rule from the
framework design). `deploy: { slug: "lending", envPrefix: "LENDING" }`.

| Slug | App | Modelled on | Role | Scenes |
|------|-----|-------------|------|--------|
| `tour` | Small-Dollar Lending Tour (shell) | EDMA Solid Community of Practice | Convener; chapters, ecosystem map, Examiner View | all |
| `wallet` | Data Vault | Verizon | Borrower pod: credentials, grants, receipts, revocation | 1–5 |
| `verifications` | Verification Center (three issuer flows) | Socure / The Work Number / Mastercard Open Banking + Prism Data | Identity, income, cash-flow VC issuance | 1 |
| `bank-lender` | Personal Loan Desk | Fifth Third Bank | Bank installment lender; ZK pre-qual verify; bureau-only decisioning contrast | 2, 3 |
| `fintech-lender` | Installment Lending | Oportun | Cash-flow-underwriting lender; full origination: pre-qual → application → decision → funding → servicing | 2–5 |
| `bureau` | Credit File | Equifax | Traditional score VC + furnishing endpoint (receives scene-5 repayment reporting) | 1, 3, 5 |
| `disbursement` | Instant Payout | Mastercard (Send) | Push-to-card funding rail; payment receipt into pod | 4 |
| — (in tour) | Examiner View | unbranded (CFPB/DoD rules, non-affiliation stated) | Compliance lens (§7) | all |

**Design choices**: (a) `bureau` is a thin app (one issue flow + one furnishing view) —
foldable into `verifications` if the build wants 6 apps; (b) servicing lives inside
`fintech-lender` (§3 role 9); (c) the vault/wallet is the registry `center`, as in
mortgage.

### 6.2 Credential & data flows

| Credential (VC 2.0, JSON-LD) | Issuer app | Consumed by | Notes |
|------------------------------|-----------|-------------|-------|
| Identity VC | `verifications` (Socure-modelled) | both lenders, `disbursement` | KYC/CIP once; holder-bound (L3 subject binding = consumer obligation per pod-guard SKILL) |
| Employment+Income VC | `verifications` (TWN-modelled) | both lenders | ZK-participating (income threshold); dual-signed at seed time (decision 0004 pattern) |
| Bank Cash-Flow VC | `verifications` (Mastercard OB-modelled) | `fintech-lender`, Prism-modelled scorer | FDX-shaped attribute set: deposit streams, NSF₉₀, balance stats; ZK-participating (NSF₉₀ = 0) |
| Cash-Flow Score VC | `verifications` (Prism-modelled) | both lenders | ZK-participating (score threshold); derived-from link to the cash-flow VC |
| Credit Score VC | `bureau` | `bank-lender` (scene-3 contrast) | Traditional score; the "old rail" |
| Loan Offer / Reg Z Disclosure | lender apps | `wallet` | Lands in pod; TILA fields (APR, finance charge, schedule) |
| Disbursement Receipt | `disbursement` | `wallet` | Push-to-card confirmation, timestamps the ≤30-min beat |
| Repayment-History VC | `fintech-lender` | `bureau` (furnishing), future lenders | The graduation credential; scene-5 close |
| DPV consent receipts + ODRL grants | `wallet` (pipeline) | all | Every access receipted; repayment authorization is an ODRL policy with 1041 rails |

**Data model (design choice, to be confirmed in the data-model bead)**: FIBO LOAN
`LoansSpecific/ConsumerLoans` + `LoansGeneral` for the loan resource [36]; FDX API
semantics as a **documentation-level field mapping** for the cash-flow VC (the FIBO↔FDX
binding table = this demo's CoP standards artifact); schema.org person/postal; DPV
consent; ODRL policies; W3C VC 2.0. Same RDF discipline: `@solid/object` +
`@rdfjs/wrapper`, `@jeswr/fetch-rdf`, closed SHACL shapes, `lint:iris` gate, **no minted
IRIs** — any residue vocab goes to the decision-0010 vocab site.

### 6.3 Quantified anchors (landing stat row, ≤6 per schema)

| id | value | label | source |
|----|-------|-------|--------|
| `market-scale` | $276B | record unsecured personal-loan balances, 26.4M consumers (Q4 2025) | TransUnion [1] |
| `payday-apr` | 391% | typical payday APR — the market thin-file borrowers get left to | CFPB/Pew [3] |
| `thin-file` | ~1 in 3 | US adults with thin or no credit file | FinRegLab [6] |
| `cashflow-lift` | +28% | approvals at flat risk with consortium cash-flow scoring | Prism Data [7] |
| `breach` | 147M | people exposed in the 2017 credit-bureau breach | FTC [17] |
| `instant` | ≤30 min | push-to-card funding vs up to 7 days at a traditional bank | TabaPay/US News [29][30] |

### 6.4 Compliance lens ("Examiner View") checks

Same generalised `ComplianceLens` structure; non-affiliation statement covers CFPB **and
DoD**. All rules public + dereferenceable:

| id | Rule | Citation | Scene |
|----|------|----------|-------|
| `reg-z-disclosures` | Closed-end credit disclosures (APR, finance charge, schedule) before consummation | Reg Z §§1026.17–18 [28] | 3 |
| `reg-b-adverse-action` | Adverse-action notice with specific principal reasons within 30 days | Reg B §1002.9 [27] | 3 |
| `fcra-permissible-purpose` | Consumer reports (incl. cash-flow scores from CRAs) only on permissible purpose; consumer-permissioned pulls documented | FCRA §604 (15 U.S.C. §1681b) [24] | 1–2 |
| `payday-payment-provisions` | No third payment-withdrawal attempt after two consecutive failures without new authorization; advance notice of first attempt | 12 CFR 1041 subpart C [31] | 5 |
| `mla-mapr` | 36% MAPR cap + MLA-status check for covered borrowers | 32 CFR 232 [37] | 2–3 |
| `reg-e-compulsory-use` | Credit may not be conditioned on preauthorized electronic repayment | Reg E §1005.10(e) [33] | 5 |

### 6.5 What carries over vs what's new (build economics)

**Carries over unchanged** (the framework dividend): walkthrough renderer + editorial
gates, disclaimer/trust kit, pod-guard auth boundary, Mode-1 in-browser pods +
Mode-2a org-pod multiplexer (decision 0011/0013), ZK Tier A/B machinery + honesty panels
(decision 0005), VP-POST + ODRL/DPV dual rail (decision 0012), seeding
(`@jeswr/synthetic-rdf` + `@jeswr/solid-seed`), deploy model (multi-zones, per-app Vercel
projects). **New for this demo**: the lending walkthrough JSON, per-org themes ×7,
lending SHACL shapes + FIBO-ConsumerLoans bindings + FDX mapping doc, the
two-models-one-borrower decisioning beat, the push-to-card receipt flow, the
repayment-grant/1041 rails, and a `NSF₉₀ = 0` ZK predicate (equality-to-zero — confirm
digit-budget fit in the vc-kit bead).

## 7. Partner-phase approach list

Outreach leads (member-first): **Fifth Third (DEP Founder — now with seats in BOTH
demos)**, Mastercard (dual seat: open banking + Send; after membership re-verification),
Huntington (product-level fit on Standby Cash), Bank of America, USAA, Navy Federal,
Verizon (vault, cross-demo), GLEIF. External approaches: **Equifax** (bureau + TWN +
Prism distribution — one approach, three rails), **Oportun** (the inclusion story),
**Prism Data**, **Socure**, **FDX** (standards engagement, mirroring MISMO). Regulatory
convening via member public bodies (FDIC, Reserve Banks) — never branding.

## 8. Success criteria

Each EDMA member recognises its seat (the apps are 1:1 with real product rails: Standby
Cash's deposit-history underwriting, Fifth Third's personal-loan desk, Mastercard's two
rails); the demo lands the inclusion thesis in one sitting; and the walkthrough JSON is
authored **without any framework code changes** — proving create-solid-demo's promise
(this is the framework's first-scaffold acceptance test, per showcase-framework-design
§5 note (c)).

## 9. Research gaps (resolve before build/outreach)

| # | Gap | Action |
|---|-----|--------|
| G1 | EDMA membership for Mastercard, Verizon, Fifth Third, Huntington, USAA, Navy Federal is internal-sheet-sourced (4 Jun 2026) | Re-verify against edmcouncil.org before outreach (org-map C4 pattern) |
| G2 | Synthetic-identity loss figures span $6B–$35B/yr depending on source and year [18][19] | Pick one primary-sourced figure (Fed publications) before any copy lands |
| G3 | CashScore's numeric range/scale unverified (prismdata.com blocked our fetch; claims taken from its press release) | Verify via the Equifax product sheet [24] during the verifications-app bead; adjust persona value 720 |
| G4 | Huntington Standby Cash limits differ across sources ($100–$750 instant vs $1,000 at launch) [26] | Re-check current terms if Huntington becomes role-1 primary |
| G5 | §1033 status is actively moving (enjoined; ANPR Aug 2025; new proposal expected) [15][16] | Re-verify wording before deploy; keep demo copy status-agnostic ("regardless of where the rule lands") |
| G6 | No dedicated prior-art pass for consumer-lending VC/pod pilots (mortgage `prior-art.md` covers the adjacent ground; FormFree Passport and FinRegLab are the closest) | Run a scoped prior-art sweep at build time; reuse mortgage prior-art table structure |
| G7 | FIBO ConsumerLoans class coverage for installment-loan terms (payment schedule, APR) not yet dereference-checked class-by-class [36] | Data-model bead: dereference-check + SHACL authoring; fall back to LoansGeneral + residue vocab if thin |
| G8 | The credit-invisibles headline number post-correction (7M? 13.5M? one-third thin-file?) [8][9][6] | Editorial decision before copy: use FinRegLab "≈1 in 3 thin/no-file" as the anchor; never cite 26M/45M |
| G9 | Fifth Third existing-customer-only online apply [20] | Frame in the Fifth Third one-pager as the limitation the pod flow removes |

## Sources

Numbered index in `docs/research/small-dollar-lending-sources.md` (same numbering).
