# US Residential Mortgage Application Process — Ground Truth

Research input for the EDMA Solid Community of Practice mortgage showcase. Maps the end-to-end process the demo dramatizes, the actors, the artifacts, and the pain points Solid + Verifiable Credentials demonstrably fix. All regulatory timings verified against CFPB / GSE sources as of July 2026.

## 1. Stages, end to end

| # | Stage | What happens | Key timing rule |
|---|-------|-------------|-----------------|
| 1 | Pre-qualification | Estimate based on **unverified, self-reported** income/assets/debt; possibly a soft credit check. Not a commitment [1] | None |
| 2 | Pre-approval | Lender **verifies** credit, income, assets, employment from documents; issues a letter for an amount, with conditions [1] | Letter typically valid 60–90 days (lender practice) |
| 3 | Application (URLA / Form 1003) | Borrower completes the redesigned Uniform Residential Loan Application (Fannie Form 1003 / Freddie Form 65), mandatory for GSE loans since 1 Mar 2021; data submitted to AUS as the MISMO v3.4-based ULAD dataset [2][3] | Six items (name, income, SSN, property address, estimated value, loan amount) = a TRID "application" → triggers disclosures [4] |
| 4 | Loan Estimate (TRID) | Lender must deliver the Loan Estimate within **3 business days** of application [4][5] | ≤ 3 business days after application |
| 5 | Processing | Processor assembles the file: orders credit, verifications, appraisal, title; chases missing documents | Credit documents must be ≤ 4 months old on the note date [12] |
| 6 | Credit — tri-merge | Residential Mortgage Credit Report merges Equifax + Experian + TransUnion files and scores; qualifying score = middle of three (lower borrower's middle score on joint apps) [6] | — |
| 7 | VOE / VOI | Employment/income verified instantly against payroll databases — The Work Number (Equifax): ~5M employer contributors, 823M+ records — or via Argyle, Truework, Truv, Finicity [7][8][9] | Verbal VOE ≤ **10 business days** before note date (≤ 120 calendar days if self-employed) [10] |
| 8 | VOA — open banking | Borrower permissions read access to bank accounts via aggregators (Finicity/Mastercard, Plaid, Akoya, Blend, PointServ...); report feeds DU validation service / Freddie AIM for rep-and-warranty relief [8][9][11] | Asset statements ≤ 4 months old on note date [12] |
| 9 | Tax transcripts (IRS 4506-C / IVES) | Borrower signs Form 4506-C authorizing an IVES participant to pull return/W-2/1099 transcripts direct from the IRS; 1–3 business days, $4/transcript [13] | — |
| 10 | Appraisal | Lender (usually via an AMC for appraiser independence) orders valuation. Legacy: URAR Form 1004/UAD 2.6. New: single dynamic URAR under **UAD 3.6** — limited production 8 Sep 2025, broad production 26 Jan 2026, mandatory for GSE loans 2 Nov 2026 [14][15] | Copy to borrower promptly upon completion or 3 business days before consummation, whichever earlier (ECOA Reg B §1002.14) [16] |
| 11 | Title search + commitment | Title company searches public records; issues ALTA Commitment (Sch. A facts, Sch. B-I requirements, Sch. B-II exceptions) promising a lender's (and owner's) title policy at closing [17][18] | — |
| 12 | Automated underwriting (AUS) | Casefile run through Fannie **Desktop Underwriter (DU)** or Freddie **Loan Product Advisor (LPA)**; findings report lists approval/eligibility + documentation conditions. DU validation service ("Day 1 Certainty") / Freddie AIM digitally validate income/assets/employment [19][20][9] | DU validation can cut up to 12 days off the process [20] |
| 13 | Conditional approval → clear to close | Underwriter approves subject to conditions (LOEs, updated stubs, appraisal repairs, title cures); when satisfied, file returns for final review → "clear to close" [21] | Typically 1–2 weeks conditional → final [21] |
| 14 | Pre-close re-verification | Verbal VOE re-run inside the 10-day window [10]; credit refresh / Undisclosed Debt Monitoring from first pull to closing (Fannie Loan Quality Initiative) [22]; proof of homeowners insurance (binder), commonly required ~3 business days before closing [23][24] | See per-item rules |
| 15 | Closing Disclosure (TRID) | Final terms/costs; borrower must receive it ≥ **3 business days** before consummation [5][25] | ≥ 3 business days before closing |
| 16 | Closing | Wet (all ink), hybrid (eSign package + ink notarized docs), or full eClosing with RON. Permanent RON laws in 45 states + DC (Feb 2025); MISMO publishes RON standards [26][27]. eNote = transferable record under ESIGN §201(c)/UETA §16; **MERS eRegistry** is the system of record for Controller + Location of the Authoritative Copy [28][29] | — |
| 17 | Post-close | Loan sold to GSE (eNote via Transfer of Control on eRegistry); servicing transfers: goodbye letter ≥ 15 days before effective date, hello letter ≤ 15 days after, 60-day payment grace period (RESPA §1024.33) [30] | See per-item rules |

eNote adoption: 12.86% of MERS System registrations (Oct 2025), 3M+ eNotes total; eNote loans fund up to 5 days faster and save >$200/loan [31][32].

## 2. Actors

| Actor | Role | Showcase app? |
|-------|------|---------------|
| Borrower | Applies; today re-supplies the same documents to each party | Yes — pod owner |
| Loan officer / lender | Originates, discloses (LE/CD), funds | Yes |
| Processor | Assembles file, orders third-party services | Fold into lender app |
| Underwriter | Decisions the loan against AUS findings + conditions | Fold into lender app |
| Credit bureaus (Equifax, Experian, TransUnion) + CRA reseller | Tri-merge credit report + scores [6] | Yes — issuer of credit VC |
| Employer / payroll verifier (The Work Number, Argyle, Truework, Truv) | Instant VOE/VOI from payroll data [7][9] | Yes — issuer of employment/income VC |
| Bank-data aggregator (Finicity, Plaid, Akoya) | Consumer-permissioned account data for VOA; Akoya is bank-owned, API-only, FDX-based [11][33] | Yes — issuer of asset VC |
| IRS (via IVES participant) | Tax transcripts on 4506-C consent [13] | Optional |
| Appraiser / AMC | URAR valuation (UAD 3.6 XML) [14] | Yes — issuer of valuation VC |
| Title company / title insurer | Search, ALTA commitment, lender's + owner's policies [17] | Yes — issuer of title VC |
| Settlement agent / notary (incl. RON platform) | Conducts closing, notarizes, disburses, records [26] | Yes — closing app |
| Homeowners-insurance carrier | Binder/declaration required before closing [23][24] | Optional — insurance VC |
| GSEs (Fannie Mae, Freddie Mac) | AUS (DU/LPA), validation services, buy the loan [19][9] | Simulated backend |
| MERS / ICE | eRegistry: Controller/Location of eNote Authoritative Copy [28] | Simulated registry |
| Servicer (old + new) | Collects payments; RESPA transfer notices [30] | Yes — post-close scene |
| CFPB | Regulator: TRID, Reg B, Reg X [5][16][30] | Context only |

## 3. Artifacts and who holds copies today

| Artifact | Producer | Format today | Copies held by |
|----------|----------|--------------|----------------|
| URLA / Form 1003 + ULAD dataset | Borrower + LO | PDF + MISMO v3.4 XML [2] | Lender LOS, AUS/GSE, investor |
| Loan Estimate, Closing Disclosure | Lender | PDF (MISMO CD/LE datasets exist) [5] | Lender, borrower (PDF), investor |
| Tri-merge credit report | CRA reseller ← 3 bureaus | Proprietary + MISMO | Reseller, lender, AUS/GSE |
| VOE/VOI report | Payroll verifier | Vendor report, reissued to DU/LPA [8][9] | Verifier, lender, GSE |
| VOA report | Aggregator | Vendor report → DU/AIM [8][9] | Aggregator, lender, GSE |
| Tax transcripts | IRS via IVES | Transcript files [13] | IVES participant, lender |
| Appraisal (URAR) | Appraiser via AMC | UAD XML + PDF [14] | AMC, lender, GSE (UCDP), borrower copy [16] |
| ALTA title commitment / policy | Title company | PDF [17] | Title co., lender, settlement agent |
| Insurance binder | Carrier | PDF [23] | Carrier, lender, servicer escrow |
| AUS findings (DU Findings Report) | GSE AUS | PDF + JSON [19] | Lender, GSE |
| Note / eNote, security instrument | Settlement | Paper or SMART Doc eNote in eVault [28][29] | Custodian/eVault, county recorder (mortgage/deed), MERS eRegistry (control record) |
| Servicing file | Servicer | Full copy of most of the above [30] | Every successive servicer |

The structural point for the showcase: **every verification is a vendor-held report about the borrower, copied into every downstream party's systems**; the borrower holds none of it and cannot see who has what.

## 4. Pain points Solid + VCs demonstrably fix

| Pain point | Evidence / quantification | Solid/VC fix |
|------------|---------------------------|--------------|
| Cost to originate | Avg ~$11,600/loan (Q3 2023, up ~$3,000 vs Q4 2020); top-quartile ~$6,900 vs bottom ~$16,500 [34]. MBA 2025: $10,074 (top 20%) vs $12,603 (bottom 20%); Q3 2025 avg $11,109 [35][36] | Reusable verified data cuts the fulfillment/verification labour that drives the spread |
| Slow closes | 41–44 days offer-to-close (ICE, 2024–2025) [37]; digital-tool users close ~5 days faster at ~$1,500 (14%) lower cost; LPA automation saves 2.2–12.36 hrs and $165–$388/loan, up to 8 days cycle time [34] | Verifications arrive as already-issued VCs; no ordering/waiting loop |
| Repeated document upload | Same income/asset/employment facts collected separately at pre-approval, application, underwriting, and re-verified before closing [10][22]; each verifier bills per pull (e.g. $4/IRS transcript [13]; tri-merge ~$200 [6]) | One pod-held credential, granted per party; issuers attest once |
| Stale verifications / re-verification before closing | Hard freshness windows force redundancy: credit docs ≤4 months [12], verbal VOE ≤10 business days before note [10], credit refresh + UDM from first pull to closing [22] | VC issuance date + status/revocation endpoint = freshness checkable in seconds without re-collection |
| PII sprawl across parties | Mr. Cooper breach: 14.7M people (2023) [38]; First American: 885M title documents exposed (2019, $1M NYDFS penalty) [39]; 47M+ Americans affected by mortgage-sector breaches Oct 2023–Oct 2025 [40] | Data stays in the pod; parties get scoped, revocable, logged access instead of copies |
| Borrower has no visibility/control | TRID's mandated 3-day review windows exist because borrowers otherwise see terms only at the table [5][25]; borrowers cannot enumerate who holds their file (see §3) | Pod access-control panel: who sees what, grant/revoke, full audit trail |
| Over-disclosure at pre-qualification | Pre-qual requires handing income/asset detail to every lender being shopped [1] | ZKP-over-VC: prove "income ≥ X ∧ score ≥ Y" to multiple lenders without revealing values (sparq) |

ZKP scoping note (house rule): use ZKP only where the property is *not* disclosed downstream — i.e. pre-qualification/shopping. Once the borrower proceeds with a lender, the URLA needs actual figures, so the demo should switch from ZKP proofs to granted VC access at application time.

## 5. Recommended 10-minute demo journey

Minimal compelling subset — five scenes, four apps + pod browser. Cuts: tax transcripts, AMC/appraisal internals, title internals, MERS mechanics (referenced verbally or as timeline events, not played).

| Scene | ~Time | Stage(s) dramatized | Beat |
|-------|------|--------------------|------|
| 1. Collect credentials | 2 min | Pre-application | Payroll provider app issues Employment+Income VC to pod; bank/aggregator app issues Asset VC; credit-bureau VC arrives. Borrower sees them in the pod |
| 2. Shop anonymously (ZKP) | 2 min | Pre-qualification | Borrower proves `income ≥ $85k ∧ middle score ≥ 680` to two competing lender apps via sparq ZKP-over-VC — lenders return rate quotes without ever seeing the numbers |
| 3. Apply in one click | 2 min | Application + LE | Borrower picks a lender, grants scoped pod access; URLA prefills from pod data; Loan Estimate lands **back in the pod** within the 3-day rule; AUS-style instant "approved with conditions" |
| 4. Freshness, not re-collection | 2 min | Pre-close re-verification | 30 days "later": lender's pre-close check hits the employment VC's status endpoint (10-business-day VOE rule) — green tick, no new paperwork. Contrast card: "today this is a phone call to your employer" |
| 5. Close + take back control | 2 min | CD, closing, post-close | Closing Disclosure delivered to pod ≥3 days early; eSign ceremony; loan "sold" — new servicer requests access, borrower approves it and **revokes the old lender's access** on-screen, viewing the full access audit log |

Why this subset: it hits every §4 pain point once, keeps a single borrower-centric narrative, showcases both Solid access control (scenes 3, 5) and ZKP-over-VC (scene 2) without violating the no-proof-of-revealed-properties rule, and every timing beat cites a real regulation (TRID 3-day LE/CD, 10-day VOE) so EDMA members recognize their own compliance obligations.

Product-phase extensions (not in the 10 min): appraisal VC on UAD 3.6 data, ALTA title-commitment VC, IRS 4506-C flow, eNote/eRegistry control transfer, servicing-transfer goodbye/hello automation.

## Sources

1. CFPB — Prequalification vs preapproval: https://www.consumerfinance.gov/ask-cfpb/whats-the-difference-between-a-prequalification-letter-and-a-preapproval-letter-en-127/
2. Fannie Mae — Uniform Residential Loan Application (Form 1003): https://singlefamily.fanniemae.com/delivering/uniform-mortgage-data-program/uniform-residential-loan-application
3. FHLB MPF — Redesigned URLA mandatory 1 Mar 2021: https://www.fhlbmpf.com/docs/default-source/2021-announcements/mpf-announcement-2021-36c.pdf
4. CFPB — Loan Estimate and Closing Disclosure guide (six-item application trigger): https://www.consumerfinance.gov/about-us/blog/loan-estimate-and-closing-disclosure-choose-right-home-loans/
5. CFPB — When do I get a Closing Disclosure (3-business-day rules): https://www.consumerfinance.gov/ask-cfpb/when-do-i-get-a-closing-disclosure-en-179/
6. Rocket Mortgage — Tri-merge credit reports: https://www.rocketmortgage.com/learn/tri-merge-credit-report
7. Equifax — The Work Number (scale: ~5M employers, 823M+ records): https://theworknumber.com/ and https://legalclarity.org/the-work-number-how-equifaxs-verification-database-works/
8. Fannie Mae — DU validation service verification report vendors: https://singlefamily.fanniemae.com/applications-technology/desktop-underwriter-validation-service/du-validation-service-verification-report-vendors
9. Freddie Mac — AIM service providers (income: Argyle, Equifax TWN, Experian, Finicity, Truework, Truv; assets: Blend, Informative Research, Plaid, PointServ): https://sf.freddiemac.com/tools-learning/technology-tools/our-solutions/aim-service-providers and https://sf.freddiemac.com/tools-learning/loan-advisor/our-solutions/aim-asset-income-modeler
10. Fannie Mae Selling Guide B3-3.1-04 — Verbal VOE (10 business days / 120 days self-employed): https://selling-guide.fanniemae.com/sel/b3-3.1-04/verbal-verification-employment
11. Plaid — Mortgage asset/income verification automation: https://plaid.com/blog/mortgage-automation-2023/
12. Fannie Mae Selling Guide B1-1-03 — Allowable age of credit documents (4 months): https://selling-guide.fanniemae.com/sel/b1-1-03/allowable-age-credit-documents-and-federal-income-tax-returns
13. IRS — Income Verification Express Service (IVES) / Form 4506-C: https://www.irs.gov/individuals/income-verification-express-service and https://www.irs.gov/individuals/irs-income-verification-express-service-ives-faqs
14. Fannie Mae — Uniform Appraisal Dataset (UAD 3.6): https://singlefamily.fanniemae.com/delivering/uniform-mortgage-data-program/uniform-appraisal-dataset
15. Freddie Mac — UAD redesign timeline (broad production 26 Jan 2026; mandatory 2 Nov 2026): https://sf.freddiemac.com/docs/pdf/fact-sheet/uad-redesign-timeline.pdf
16. CFPB — Regulation B §1002.14, appraisal copy delivery: https://www.consumerfinance.gov/rules-policy/regulations/1002/14/
17. ALTA — Policy forms and commitment structure: https://www.alta.org/policies-and-standards/policy-forms/
18. First American — Understanding your title commitment: https://www.firstam.com/home-buying-guide/understanding-your-title-commitment/
19. Fannie Mae — Desktop Underwriter and DU Findings Report: https://singlefamily.fanniemae.com/applications-technology/desktop-underwriter-desktop-originator and https://selling-guide.fanniemae.com/sel/b3-2-11/du-underwriting-findings-report
20. Fannie Mae — Day 1 Certainty (up to 12 days saved): https://singlefamily.fanniemae.com/applications-technology/day-1-certainty
21. Bankrate — Conditional approval; Rocket — conditional → clear to close (1–2 weeks): https://www.bankrate.com/mortgages/conditional-approval/ and https://www.rocketmortgage.com/learn/conditional-approval
22. The Mortgage Reports — Fannie Mae Loan Quality Initiative credit re-pull; Certified Credit — credit refresh & undisclosed debt monitoring: https://themortgagereports.com/4163/fannie-mae-loan-quality-initiative and https://www.certifiedcredit.com/what-is-a-credit-refresh-why-is-it-so-important-the-impact-of-undisclosed-liabilities/
23. CFPB — Why homeowners insurance is required: https://www.consumerfinance.gov/ask-cfpb/what-is-homeowners-insurance-why-is-homeowners-insurance-required-en-162/
24. Policygenius — Insurance proof ~3 business days before closing: https://www.policygenius.com/homeowners-insurance/buying-homeowners-insurance-before-closing/
25. CFPB — Know Before You Owe / TRID: https://www.consumerfinance.gov/know-before-you-owe/
26. Stavvy — States allowing RON (45 + DC, Feb 2025): https://blog.stavvy.com/which-states-allow-remote-online-notarization
27. MBA — RON adoption map / MISMO RON standards: https://www.mba.org/advocacy-and-policy/residential-policy-issues/remote-online-notarization
28. MERS — eRegistry FAQ (transferable records, Authoritative Copy, ESIGN §201(c)/UETA §16): https://www.mersinc.org/products-services/mers-esuite/eregistry/faq
29. ICE — eNotes and the MERS eRegistry whitepaper: https://mortgagetech.ice.com/publicdocs/mortgage/whitepaper-enote.pdf
30. CFPB — Regulation X §1024.33 servicing transfers (15-day notices, 60-day grace): https://www.consumerfinance.gov/rules-policy/regulations/1024/33/
31. ICE — MERS eRegistry surpasses 3M eNotes; record 12.86% eNote share (Oct 2025): https://ir.theice.com/press/news-details/2026/ICE-Announces-MERS-eRegistry-Surpasses-3-Million-eNotes/default.aspx and https://mortgagetech.ice.com/blog/a-digital-milestone-mers-system-hits-record-enote-share
32. Docutech — eNote growth, ~5 days faster funding, >$200/loan savings: https://blog.docutech.com/enotes-at-scale-what-mers-eregistry-growth-means-for-digital-mortgage-execution
33. Akoya — bank-owned open-finance network (Fidelity, The Clearing House + 11 banks; FDX APIs; lending/verification use cases): https://akoya.com/ and https://akoya.com/use-cases/lending-and-credit-enhancement
34. Freddie Mac — 2024 Cost to Originate Study (avg ~$11,600 Q3 2023; $6,900 vs $16,500 quartiles; digital users ~$10,800 vs ~$12,300 and ~34 vs ~39 days; LPA saves 2.2–12.36 hrs, $165–$388/loan, up to 8 days): https://sf.freddiemac.com/docs/pdf/cost-to-originate-full-study-2024.pdf
35. MBA — IMBs post improved net production profits in 2025 ($10,074 top-20% vs $12,603 bottom-20% cost/loan): https://www.mba.org/news-and-research/newsroom/news/2026/04/16/independent-mortgage-bankers-post-improved-net-production-profits-in-2025
36. MBA — IMB Q3 2025 performance ($11,109/loan): https://www.mba.org/news-and-research/newsroom/news/2025/11/18/imbs-report-production-profits-in-third-quarter-of-2025
37. Rocket Mortgage (citing ICE Mortgage Technology) — 41–44 days average time to close, 2024–2025: https://www.rocketmortgage.com/learn/time-to-close-on-a-house
38. BleepingComputer — Mr. Cooper breach, 14.7M people: https://www.bleepingcomputer.com/news/security/mortgage-giant-mr-cooper-data-breach-affects-147-million-people/
39. Cybersecurity Dive — First American 885M-document exposure, $1M NYDFS settlement: https://www.cybersecuritydive.com/news/new-york-1m-settlement-first-american/700849/
40. breached.company — Mortgage-industry breach aggregate, 47M+ Americans (Oct 2023–Oct 2025; secondary source): https://breached.company/the-mortgage-industrys-data-breach-epidemic-how-47-million-americans-had-their-financial-lives-exposed/
