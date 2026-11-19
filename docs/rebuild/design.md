<!-- AUTHORED-BY Claude Fable 5.2 -->

# Solid mortgage demo: rebuild design

Design of record for the rebuild in `jeswr/solid-mortgage`. Companion files: `flows.md` (other EDMA demos),
`video-scripts.md`, `build-plan.md`, `open-questions.md`. Implementers read this file first.

## 0. Decisions in one table

| Topic | Decision |
|---|---|
| Jurisdiction | US purchase mortgage, conventional conforming, fixed rate, one borrower, 20% down (so no mortgage insurance party) |
| Server | None. One static site. Pods run in the visitor's browser (sparq wasm Solid server in a service worker), seeded per visitor |
| Vercel | 1 project for every demo (`solid-mortgage`) + the existing static vocab project. The 8 app projects, 9 proxy projects and the EC2 box are retired |
| Origins | One registrable domain. Ships path-per-organisation (`/lender/…`) on `solid-mortgage.vercel.app`. The same build serves host-per-organisation when a custom domain is attached (open question 3) |
| Organisations | All fictional. 12 organisations, 13 apps, each a separate workspace package with its own design language |
| Access control | Real. Every pod request is evaluated by the pod server against WAC as the calling organisation's WebID. Sign-in is simulated and says so |
| Visualiser | "Solid Lens": a dock on every app page fed only by requests the pod actually answered |
| Guided path | 24 steps, 7 chapters, about 12 minutes; every step is a real action in a real app |
| Engine | New, domain-generic packages (pod runtime, tour, lens) built in this repo and used by every demo; upstreamed to `jeswr/solid-sdk` once two demos run on them |
| Kept from the old repo | `data-model` (extended), `vc-kit` (issue, verify, status, re-issue, live threshold proof), `vocab/mort.ttl`, the lint scripts, research docs |
| Deleted | All 9 Next.js apps, `scripts/demo/*` (gateway, overlay, proxies, LLM assistants), `deploy/hosted`, the dev OIDC issuer and DPoP service identities, vendored solid-server tarball |

## a. Accurate flow map

Scenario: Alex Rivera (fictional) buys 14 Larch Lane for $425,000 with $85,000 down and a $340,000 30-year fixed
loan. All figures carry the "illustrative figure, not an offer" tag.

Demo treatment: **I** = interactive step in the guided path, **S** = summarised (a labelled line in an app or in the
Lens, no click), **–** = out of scope and said so.

Source status: **S** = confirmed by web search on 19 Nov 2026; **R** = carried from `docs/research/mortgage-process.md`
(verified July 2026); **K** = standing rule cited to its primary source but not re-fetched (consumerfinance.gov,
fanniemae.com, ecfr.gov and law.cornell.edu are blocked from the build container). Re-check every **K** before copy ships.

| # | Stage | What really happens | Rule / timing | Src | Demo | Step |
|---|---|---|---|---|---|---|
| 1 | Pre-qualification | Estimate from self-reported or lightly checked data; not a commitment | None [C23] | R | I | 5 |
| 2 | Pre-approval | Lender verifies credit, income, assets; letter with conditions | Lender practice, 60–90 days | R | S (the lender's verified check is step 9) | – |
| 3 | Purchase agreement | Offer accepted; contract names price, parties, closing date | State contract law | K | S (seeded document in the pod) | – |
| 4 | Application (URLA / Form 1003) | Application exists once the lender has six items: name, income, SSN, property address, estimated value, loan amount | 12 CFR 1026.2(a)(3)(ii) [C1][C22] | K | I | 7, 8 |
| 5 | Credit report | Lender pulls a tri-merge report (hard inquiry, permissible purpose). Lender chooses Classic FICO or VantageScore 4.0; tri-merge still required | FHFA / GSE policy 2026 [C7]; FCRA §604 | S | I | 9 |
| 6 | Score disclosure | Lender gives the applicant the scores it used and the "Notice to the Home Loan Applicant" | FCRA §609(g), 15 U.S.C. 1681g(g) [C8] | S | I (lands in the pod) | 9 |
| 7 | AUS first run | Lender (not the borrower) submits the casefile to DU or LPA; gets a recommendation and conditions. With validation services the AUS fetches the vendor report itself from a reference number | Fannie B3-2-02 [C9] | S | I | 9, 10 |
| 8 | Loan Estimate | Delivered or mailed within 3 business days of application, and at least 7 business days before consummation | 12 CFR 1026.19(e)(1)(iii) [C2] | S | I | 11 |
| 9 | Intent to proceed | No fee except a credit-report fee before the consumer has the LE and says they will proceed; LE may lapse after 10 business days | 12 CFR 1026.19(e)(2)(i), (e)(3)(iv)(E) [C2] | S (fee rule), K (10-day cite) | I | 11 |
| 10 | Processing: orders | Processor orders appraisal, title, flood determination, tax transcripts | – | R | I | 12 |
| 11 | Tax transcripts | Borrower signs IRS Form 4506-C; an IVES participant pulls transcripts | IRS IVES [C10] | R | S | 12 |
| 12 | Flood determination | Standard Flood Hazard Determination Form, kept for the life of the loan | 42 U.S.C. 4104b [C15] | S | S | 12 |
| 13 | Appraisal | Ordered by the lender, directly or through an AMC; production staff may not select or influence the appraiser. Reported on the redesigned URAR (UAD 3.6), mandatory for new submissions since 2 Nov 2026 (exceptions to 19 May 2027) | AIR [C11]; 12 CFR 1026.42; UAD [C12] | S | I | 13 |
| 14 | Appraisal copy | Creditor gives the applicant a copy promptly on completion or 3 business days before consummation, whichever is earlier | Reg B, 12 CFR 1002.14(a)(1) [C13] | K | I (lands in the pod) | 13 |
| 15 | Title search and commitment | Title agent searches public records and issues an ALTA commitment: Schedule A, B-I requirements, B-II exceptions | ALTA forms [C14] | R | I | 14 |
| 16 | Homeowner's insurance | Evidence of insurance naming the lender as mortgagee is required before closing | Lender / GSE requirement [C16] | R | I | 15 |
| 17 | Underwriting, conditions | Underwriter (a person) makes the credit decision on the AUS findings and clears conditions | Credit documents ≤ 4 months old at note date [C6] | R | I | 16 |
| 18 | Pre-close employment check | Verbal VOE within 10 business days before the note date (120 calendar days if self-employed). Fannie removed the prescribed methods in Oct 2026; timing unchanged | Fannie B3-3.1-04, SEL-2026-09 [C4][C5] | S | I | 16 |
| 19 | Clear to close | All conditions met; file goes to closing | – | R | I | 16 |
| 20 | Closing Disclosure | Consumer must receive it at least 3 business days before consummation. A new 3-day wait only if APR becomes inaccurate, the product changes, or a prepayment penalty is added | 12 CFR 1026.19(f)(1)(ii), (f)(2)(ii) [C2][C3] | S | I | 17 |
| 21 | Closing | Settlement agent runs the signing (ink, hybrid, or eClosing with remote online notarisation where the state allows). Note, security instrument, deed. No 3-day rescission on a purchase | 12 CFR 1026.23(f)(1) [C18]; RON in 45 states + DC [C17] | K / R | I | 18 |
| 22 | Funding and disbursement | Lender wires funds; settlement agent disburses to seller, payoffs, fees | State practice | K | S (ledger in the title app) | 18 |
| 23 | Recording | Settlement agent records deed and security instrument with the county; public record | State recording law | K | I | 19 |
| 24 | eNote / MERS | eNote in an eVault with control tracked on the MERS eRegistry; loan registered on the MERS System | MERS [C17] | R | S | 20 |
| 25 | Sale to investor | Lender delivers the loan data and sells the loan; new owner notifies the borrower within 30 days | 12 CFR 1026.39 [C19] | S | I | 20 |
| 26 | Servicing transfer | Old servicer's notice ≥ 15 days before the transfer date, new servicer's ≤ 15 days after; 60 days' protection for misdirected payments. The borrower's consent is not needed | 12 CFR 1024.33(b), (c) [C20] | S | I | 21 |
| 27 | Escrow account | Servicer collects for taxes and insurance; initial escrow statement at settlement or within 45 days | 12 CFR 1024.17(g) [C21] | K | S (servicer dashboard) | 21 |
| – | Mortgage insurance, HMDA demographic data, tolerance cures, changed circumstances, joint applicants, appraisal waivers | Real, deliberately left out; listed on the "what this demo leaves out" page | – | – | – | – |

"Business day" has two meanings in TRID: for the 3-day LE delivery it is a day the creditor's offices are open; for the
7-day wait and the CD 3-day wait it is every calendar day except Sundays and federal holidays (12 CFR 1026.2(a)(6)).
The demo calendar (§d.7) implements both and is unit-tested against the CFPB example (closing Thursday ⇒ CD received Monday).

### What the old demo got wrong (all fixed here)

| # | Old demo | Why it is wrong | Rebuild |
|---|---|---|---|
| 1 | Alex grants the AUS access, then the visitor presses "Run AUS" in the GSE app | The lender submits to the AUS; the borrower has no relationship with it | Loan officer runs the AUS from the lender desk. Alex's application consent names the AUS as the lender's underwriting service, and it reads credentials at source by reference (the DU validation pattern) |
| 2 | A bureau-issued score credential in the pod is what the lender underwrites on | Lenders must pull their own tri-merge report; a consumer-held score is not accepted | Consumer-held credit summary is used only for pre-qualification. The lender's pull is its own step, and the FCRA score notice lands in the pod |
| 3 | No purchase contract, no explicit six-item trigger, no intent to proceed | LE timing starts at the six items; fees are restricted until intent to proceed | Seeded purchase agreement; six-item checklist on submit; LE with a visible deadline; "I intend to proceed" |
| 4 | Appraisal and title are "previews" after underwriting, one app with two tabs, no AMC | They are ordered in processing, by different companies, with appraiser independence | Separate appraisal (AMC + field appraiser) and title apps, ordered by the processor |
| 5 | "Title-clear credential" | The real artefact is a commitment with requirements and exceptions, then a policy after closing | ALTA-shaped commitment, then policy |
| 6 | No insurance, flood, transcripts, recording, sale, escrow | All are in the real flow | Insurance and recording are interactive; the rest are summarised lines |
| 7 | Alex "grants the servicer access" as the servicing transfer and "revokes the lender" | Servicing transfers without borrower consent; the lender keeps its legal record | Transfer notices arrive in the pod. The servicer asks only for what a borrower really supplies (contact, insurance, autopay). The revoke is of the lender's access to live data, with the retention caveat on screen |
| 8 | Employment credential "expires" and is re-issued | Freshness is the lender's 10-business-day rule, not issuer expiry | Lender desk shows "as of" date against the rule and asks the payroll provider to refresh |
| 9 | Every pod request ran as Alex; permissions were written but not enforced | The core claim was not demonstrated | Per-organisation identity; WAC enforced; a denied read is part of the tour |
| 10 | Closing platform as a separate organisation that owns the closing | The settlement agent runs closing; the eClose platform is its tool | Closing lives in the title and settlement app |
| 11 | Pre-qualification and pre-approval blurred | Different things (unverified vs verified) | Labelled separately; the proof step is pre-qualification only |
| 12 | LLM assistants in the wallet and lender | Needs a login or a key; not reproducible; off-message | Removed. The consent screen does the explaining |
| 13 | "Modelled on" real brands, one shared shadcn kit recoloured per app | Not signed off; apps looked the same | Fictional organisations, separate design languages (§b) |
| 14 | Needed an EC2 box and 17 Vercel projects | Cost and fragility | One static project |

### Sources

- [C1] CFPB, Reg Z §1026.2 definitions: https://www.consumerfinance.gov/rules-policy/regulations/1026/2/
- [C2] CFPB, Reg Z §1026.19: https://www.consumerfinance.gov/rules-policy/regulations/1026/19/
- [C3] CFPB, TRID FAQs: https://www.consumerfinance.gov/compliance/compliance-resources/mortgage-resources/tila-respa-integrated-disclosures/tila-respa-integrated-disclosure-faqs/
- [C4] Fannie Mae Selling Guide B3-3.1-04 (03/04/2026): https://selling-guide.fanniemae.com/sel/b3-3.1-04/verbal-verification-employment
- [C5] Fannie Mae SEL-2026-09 (7 Oct 2026): https://singlefamily.fanniemae.com/media/document/pdf/announcement-sel-2026-09-selling-guide-updates
- [C6] Fannie Mae B1-1-03, age of credit documents: https://selling-guide.fanniemae.com/sel/b1-1-03/allowable-age-credit-documents-and-federal-income-tax-returns
- [C7] Freddie Mac, credit score models and reports: https://sf.freddiemac.com/general/credit-score-models ; MBA statement 22 Apr 2026: https://www.mba.org/news-and-research/newsroom/news/2026/04/22/mba-statement-on-fhfa--hud-announcement-on-credit-score-modernization
- [C8] 15 U.S.C. 1681g: https://www.govinfo.gov/link/uscode/15/1681g
- [C9] Fannie Mae DU validation service: https://singlefamily.fanniemae.com/applications-technology/du-validation-service ; B3-2-02: https://selling-guide.fanniemae.com/sel/b3-2-02/du-validation-service
- [C10] IRS IVES: https://www.irs.gov/individuals/income-verification-express-service
- [C11] Fannie Mae Appraiser Independence Requirements: https://singlefamily.fanniemae.com/property-valuations/appraiser-independence-requirements ; Reg Z §1026.42: https://www.consumerfinance.gov/rules-policy/regulations/1026/42/
- [C12] Fannie Mae UAD: https://singlefamily.fanniemae.com/delivering/uniform-mortgage-data-program/uniform-appraisal-dataset ; exception notice: https://www.cotality.com/resources/gse-sept30-announcement-uad-3-6
- [C13] CFPB, Reg B §1002.14: https://www.consumerfinance.gov/rules-policy/regulations/1002/14/
- [C14] ALTA policy forms: https://www.alta.org/policies-and-standards/policy-forms/
- [C15] 42 U.S.C. 4104b: https://law.justia.com/codes/us/2021/title-42/chapter-50/subchapter-iii/sec-4104b/
- [C16] CFPB, why homeowner's insurance is required: https://www.consumerfinance.gov/ask-cfpb/what-is-homeowners-insurance-why-is-homeowners-insurance-required-en-162/
- [C17] MERS eRegistry FAQ: https://www.mersinc.org/products-services/mers-esuite/eregistry/faq ; RON states: https://www.mba.org/advocacy-and-policy/residential-policy-issues/remote-online-notarization
- [C18] CFPB, Reg Z §1026.23: https://www.consumerfinance.gov/rules-policy/regulations/1026/23/
- [C19] CFPB, Reg Z §1026.39: https://www.consumerfinance.gov/rules-policy/regulations/1026/39/
- [C20] CFPB, Reg X §1024.33: https://www.consumerfinance.gov/rules-policy/regulations/1024/33/
- [C21] CFPB, Reg X §1024.17: https://www.consumerfinance.gov/rules-policy/regulations/1024/17/
- [C22] Fannie Mae URLA: https://singlefamily.fanniemae.com/delivering/uniform-mortgage-data-program/uniform-residential-loan-application
- [C23] CFPB, prequalification vs preapproval: https://www.consumerfinance.gov/ask-cfpb/whats-the-difference-between-a-prequalification-letter-and-a-preapproval-letter-en-127/

Each tour step carries its rule and source in `realWorld` (§d.6), and a lint test fails if a step cites a source not in this list.

## b. Organisations and their apps

### b.1 Registry

Directory and URL slugs are role names, so a rename is a one-file change (`content/orgs.ts`). Names are placeholders
pending a trademark screen (open question 1).

| Slug | Fictional organisation | Role | Staff persona shown as signed in |
|---|---|---|---|
| `wallet` | Cairn | Alex's pod provider and personal data app | Alex Rivera |
| `payroll` | Ledgerly Payroll | Payroll provider for Alex's employer, Northfield Engineering | Alex (employee self-service) |
| `bank` | Alder Bank | Alex's current bank: account and asset data | Alex (online banking) |
| `bureau` | Quillon Credit Bureau | Consumer reporting agency | Alex (consumer view); a desk clerk (orders view) |
| `lender` | Juniper Home Loans, borrower portal | Lender, customer-facing | Alex |
| `lender-desk` | Juniper Home Loans, Loan Desk | Loan officer, processor, underwriter, closer, post-closing | Priya Nair and colleagues (role switcher) |
| `lender-b` | Copperfield Mortgage | Competing lender for pre-qualification | – (public page) |
| `aus` | Castellan Housing Finance | Secondary-market investor: automated underwriting and loan purchase | Service account |
| `appraisal` | Plumbline Valuation | Appraisal management company and its panel appraiser | Dana Okafor (coordinator), Sam Reyes (appraiser) |
| `title` | Sextant Title & Escrow | Title agent and settlement agent, including the signing | Morgan Hale (escrow officer) |
| `insurer` | Wrenfield Mutual | Homeowner's insurer | Alex |
| `county` | Marlow County (Recorder's office) | County land records | Clerk |
| `servicer` | Marigold Loan Servicing | Servicer after the sale | Alex |

Merged or dropped, and why: closing/eSign merged into the settlement agent (it is the settlement agent's job);
processor and underwriter merged into the lender desk (same company, same system); AMC and appraiser share one app
with two views (the handoff between them is the independence point); flood vendor, IRS transcripts, MERS and the eVault
are summarised lines because the borrower's data plays no part beyond a reference.

### b.2 Anti-template rules

1. Each app is its own workspace package with its own CSS tokens, type family (self-hosted open-licence fonts), layout
   archetype, icon style and voice. No shared component library for app chrome. Shared code is limited to: the engine
   client, the trust banner and interstitial from `@jeswr/solid-showcase-kit`, the data model, and headless primitives.
2. No two apps may share a layout archetype. A screenshot test renders each app's home screen and fails review if two
   are visually interchangeable (manual sign-off, screenshots attached to the PR).
3. Colours are original values. No real organisation's palette, logo or trade dress. Every name passes `check:insignia`,
   whose roster is every real organisation named anywhere in `docs/`.
4. Every app sets its own `<title>`, favicon and `theme-color`.

### b.3 App specifications

Notation: **R** read, **W** write, **A** append. `alex:` = Alex's pod; `own:` = the organisation's own store (also
Solid storage in the demo, standing in for its existing systems). Grants are listed in §b.4.

#### `wallet` — Cairn
- **Imitates:** a phone wallet or password manager. Single column, max 460 px, shown as a device card on desktop;
  bottom tab bar; 20 px radius cards; large touch targets. Nunito Sans. Warm off-white `#FAF6EF`, teal `#0F5C5A`,
  coral `#D9482B` reserved for revoke.
- **Screens:** Home (the pod's drawers and counts) · Documents (credential and document cards; detail shows issuer,
  signature check, dates, status) · Requests (the consent screen: who, which resources, purpose, until when, onward
  recipients; Approve / Decline) · Sharing (grants by organisation with scope, expiry, state; Revoke) · Prove (choose
  lenders and thresholds, generate proof) · Activity (consent receipts) · Inbox (documents delivered by organisations).
- **Does:** approve or decline requests, revoke, prove, read what arrived.
- **Pod:** R/W all of `alex:`; W `alex:/consents/`, `alex:/policies/`, ACLs; A to lender inboxes (proof presentations).
- **Grants needed:** none (owner).

#### `payroll` — Ledgerly Payroll
- **Imitates:** an employee self-service HR portal. Icon rail, tile dashboard, medium density. IBM Plex Sans.
  Indigo `#3D3A8C`, lime accent `#B7D334`, cool grey canvas.
- **Screens:** Dashboard · Pay (payslips) · Share verified employment (choose fields: employer, title, start date,
  base pay, year-to-date; preview; "Sign and send to my pod") · Verifications issued (log, refresh requests).
- **Does:** issue the employment and income credential; later answer a refresh request automatically.
- **Pod:** W `own:/issued/`, `own:/status/`; A `alex:/credentials/`.
- **Grants needed:** G1.

#### `bank` — Alder Bank
- **Imitates:** retail online banking. Top navigation, account cards, large serif numerals. Source Serif 4 headings,
  Inter body. Forest `#1F5135`, cream `#F4EFE3`.
- **Screens:** Accounts · Account detail (transactions) · Share verified account summary (accounts, two-month period,
  balances, 60-day average, large-deposit flag) · Connected services.
- **Does:** issue the asset credential.
- **Pod:** W `own:/issued/`, `own:/status/`; A `alex:/credentials/`.
- **Grants needed:** G2.

#### `bureau` — Quillon Credit Bureau
- **Imitates:** a utility. Consumer side is a narrow form-like disclosure page; business side is a bare orders table.
  System serif, grey-blue `#44546A`, no decoration.
- **Screens:** Your credit file summary → "Send summary to my pod" · Orders (business view: Juniper's order, permissible
  purpose, authorisation reference, delivered) · Inquiries log.
- **Does:** issue a consumer credit summary credential (no effect on the score); fulfil the lender's report order.
- **Pod:** A `alex:/credentials/`; R `alex:/consents/<authorisation>` (the credit-report authorisation, made readable to Quillon by the application consent);
  W `own:/orders/`; A `juniper:/inbox/` (report delivery, organisation to organisation).
- **Grants needed:** G3, and G4's authorisation clause. The lender's report does not pass through the pod; the Lens says so.

#### `lender` — Juniper Home Loans, borrower portal
- **Imitates:** a modern mortgage fintech portal. Wizard with a milestone tracker, generous whitespace. Manrope.
  Blue-green `#2B6777`, sand `#F2E9DC`.
- **Screens:** Start ("Apply with your pod" / "Fill in by hand") · Application review (1003 sections, each field with a
  source badge: "from your pod · issued by Ledgerly · signature checked") · Six-item checklist and Submit · Disclosures
  (Loan Estimate summary with deadline; "I intend to proceed"; later the Closing Disclosure with its waiting period and
  "I have received this") · Status (milestones; outstanding items) · Closing appointment.
- **Does:** request access, prefill, submit, proceed, acknowledge.
- **Pod:** R per G4; R/W `alex:/mortgage/juniper/` (application copy, LE, CD, notices); W `own:/loans/JHL-1001/`.
- **Grants needed:** G4.

#### `lender-desk` — Juniper Loan Desk
- **Imitates:** a loan origination system. Dark sidebar, pipeline table, loan file with tabs (Summary, 1003, Credit,
  AUS, Verifications, Appraisal, Title, Insurance, Conditions, Disclosures, Closing, Post-closing). 13 px, compact,
  monospace identifiers, status chips. JetBrains Mono + Inter Tight. Slate `#1E2530`, amber `#E0A100`.
- **Screens:** Pipeline · Loan file tabs as listed · Role switcher (loan officer, processor, underwriter, closer,
  post-closing) so each action shows whose job it is.
- **Does:** pull credit; run AUS; issue LE; order appraisal, title, flood, transcripts; review conditions; request
  employment refresh; clear to close; issue CD; fund; deliver the loan; transfer servicing; "Read bank data again"
  (the revoke test).
- **Pod:** R per G4. `own:/loans/JHL-1001/` holds the application snapshot, the credit report, AUS findings and
  *pointers* (URL, digest, issuer, as-of) to pod credentials, not document copies.
- **Grants needed:** G4.

#### `lender-b` — Copperfield Mortgage
- **Imitates:** a rate-quote landing page. Hero, bold display type, one call to action. Archivo Black + Archivo.
  Copper `#B4532A`, charcoal.
- **Screens:** Check if you pre-qualify · Result (illustrative quote) · "What we received" (the proof and the issuer
  anchors; nothing else).
- **Does:** verify a threshold proof.
- **Pod:** R `own:/inbox/` (proof presentation). No access to `alex:` at all.
- **Grants needed:** none.

#### `aus` — Castellan Housing Finance
- **Imitates:** a machine console. Split view: casefile list left, findings report right as a numbered message list.
  No consumer warmth. IBM Plex Mono + Plex Sans. Navy `#0B1F3A` on white, hairline rules.
- **Screens:** Casefiles · Findings report (recommendation, verification messages, conditions) · Source checks (each
  credential fetched at source: URL, issuer, signature, status, as-of date) · Loan delivery (post-closing datasets,
  purchase confirmation).
- **Does:** receive a casefile from the lender; fetch the named credentials from the pod; return findings; later accept
  delivery of the closed loan.
- **Pod:** R three credentials per G4's onward clause; R/W `own:/casefiles/`; A `juniper:/inbox/`.
- **Grants needed:** G4 (onward recipient). The findings are a recommendation; the underwriter decides.

#### `appraisal` — Plumbline Valuation
- **Imitates:** dispatch software plus a field app. Order board is kanban (New, Assigned, Inspected, In review,
  Delivered); the appraiser view is a phone frame with a checklist and big buttons. Barlow Condensed + Barlow.
  Safety orange `#E8590C`, graphite.
- **Screens:** Order board · Order detail (engagement, independence notice: assigned from the panel by rotation, lender
  sales staff not involved) · Field: inspection checklist, comparables, value and submit · Review and deliver.
- **Does:** accept the order, assign, inspect, report, deliver.
- **Pod:** R `alex:/property/subject-property`, `alex:/property/purchase-agreement`; W `own:/orders/`; A `juniper:/inbox/`
  (report). Juniper, as creditor, writes the borrower's copy to `alex:/mortgage/juniper/appraisal`.
- **Grants needed:** G5. Did not see: income, assets, credit.

#### `title` — Sextant Title & Escrow
- **Imitates:** a legal document room. File tree left, paper-like document viewer centre, parties and checklist right.
  Libre Caslon Text headings, Source Sans 3 body. Navy `#1B2A49`, parchment `#F3EBDD`.
- **Screens:** File overview · Title search (chain of title, liens found: the seller's mortgage to pay off, a utility
  easement) · Commitment (Schedule A, B-I, B-II) · Closing room (document list, signature fields, identity step;
  labelled "simulated: not a notarial act") · Disbursement ledger · Recording (submit, receive instrument numbers) ·
  Policy.
- **Does:** search, commit, close, disburse, record, issue the policy.
- **Pod:** R `alex:/profile/card` (name, how title will be held), `alex:/property/purchase-agreement`;
  W `alex:/mortgage/closing/` (commitment, signed copies, settlement statement, recording receipt, owner's policy);
  A `juniper:/inbox/`, `county:/inbox/`.
- **Grants needed:** G6. Did not see: income, assets, credit.

#### `insurer` — Wrenfield Mutual
- **Imitates:** a consumer quote-and-bind funnel. One question per screen, progress dots, abstract illustration.
  DM Sans, large type. Sky `#2F80ED`, yellow `#F5C518`.
- **Screens:** Start ("Use my pod to skip the form") · Property facts (prefilled: year built, area, construction, roof;
  each with its source) · Quote · Bind · Evidence of insurance (mortgagee clause naming Juniper, its successors and assigns).
- **Does:** quote from pod data, bind, write evidence of insurance.
- **Pod:** R `alex:/property/subject-property`, the property section of `alex:/mortgage/juniper/appraisal`;
  W `alex:/insurance/`.
- **Grants needed:** G7. This is the "home insurance from the mortgage pod" idea, placed where it really happens.

#### `county` — Marlow County, Recorder's office
- **Imitates:** a county government site. System fonts, blue links, bordered tables, breadcrumbs. No seal.
- **Screens:** eRecording intake (Sextant's submission; accept; instrument numbers) · Public records search.
- **Does:** record the deed and the security instrument.
- **Pod:** R/W `own:/records/` (public read). Nothing from `alex:`.
- **Grants needed:** none. **Solid is not involved in the register**: land records are public by law. The Lens says so.
  Showing a step where Solid does nothing makes the other steps credible.

#### `servicer` — Marigold Loan Servicing
- **Imitates:** a customer account portal. Dashboard with next payment and escrow breakdown, top tabs. Public Sans.
  Marigold `#E9A100`, charcoal `#2B2B2B`.
- **Screens:** Welcome (transfer notice: effective date, 60-day protection) · Connect your pod (contact details,
  insurance, autopay account) · Account · Escrow (taxes and insurance; initial statement) · Insurance tracking (reads
  the policy from the pod, so a renewal is seen without a letter).
- **Does:** deliver notices, request access, set up autopay, show escrow.
- **Pod:** R `alex:/profile/contact`, `alex:/insurance/`, `alex:/banking/payment-mandate`; RW `alex:/mortgage/servicing/` (it reads back its own letters).
- **Grants needed:** G8.

### b.4 Alex's pod and the grants

```
alex:/
  profile/card            WebID profile (schema:Person)
  profile/contact         address, phone, email
  identity/               identity credential (seeded)
  credentials/            employment-income, assets, credit-summary (+ anchors for the proof)
  property/               purchase-agreement, subject-property
  mortgage/juniper/       application copy, loan-estimate, score-notice, appraisal, closing-disclosure, sale-notice
  mortgage/closing/       title-commitment, signed copies, settlement-statement, recording-receipt, owners-policy
  mortgage/servicing/     transfer notices, escrow statement
  insurance/              evidence-of-insurance, policy
  banking/                payment-mandate
  inbox/                  access requests (append-only for signed-in agents)
  policies/               one ODRL policy per grant
  consents/               one DPV consent record per grant, change and revocation
```

| Grant | To | Access | Purpose | Ends | State at end of tour |
|---|---|---|---|---|---|
| G1 | Ledgerly | Append `credentials/`; may re-issue on Juniper's request | Deliver employment verification | Closing | Expired |
| G2 | Alder Bank | Append `credentials/` | Deliver asset verification | 7 days | Expired |
| G3 | Quillon | Append `credentials/` | Deliver credit summary | 7 days | Expired |
| G4 | Juniper; onward: Castellan (three credentials only); Quillon (the credit-report authorisation only) | Read `profile/`, `identity/`, `credentials/`, `property/`, `insurance/`; read and write `mortgage/juniper/` | Mortgage origination and underwriting | 60 days after closing (quality control) | **Revoked by Alex** |
| G5 | Plumbline | Read two `property/` resources | Appraisal | Report delivered | Expired |
| G6 | Sextant | Read `profile/card`, purchase agreement; write `mortgage/closing/` | Title and settlement | Policy issued | Expired |
| G7 | Wrenfield | Read property facts; write `insurance/` | Insurance quote and policy | While the policy is in force | Active |
| G8 | Marigold | Read `profile/contact`, `insurance/`, `banking/payment-mandate`; read and write `mortgage/servicing/` | Loan servicing | While Marigold services the loan | Active |

A grant is three things written together by the wallet: the WAC change (enforcement), an ODRL policy (scope, purpose,
expiry, onward recipients) and a DPV consent record (the audit entry). WAC has no expiry: the wallet removes the ACL
entry when the policy's date passes, and the Lens labels this "expiry applied by Alex's wallet". The audit trail is an
application feature, not a protocol feature, and the copy never claims otherwise (old decision 0006 stands).

Credentials (W3C VC 2.0, `eddsa-rdfc-2022`, Bitstring Status List): employment and income (Ledgerly), assets (Alder),
credit summary (Quillon), identity (seeded), appraisal (Plumbline; copy delivered by Juniper), title commitment
(Sextant), evidence of insurance (Wrenfield). Documents that are not attestations (LE, CD, notices, settlement
statement) are plain RDF resources with a `schema:DigitalDocument` description and an embedded summary.

### b.5 The guided path (24 steps)

| # | Chapter | App and screen | Visitor action | Lens headline |
|---|---|---|---|---|
| 1 | Welcome | Welcome → wallet Home | Start | Alex's pod: one store, Alex decides who reads it |
| 2 | 1 Get ready | payroll / Share verified employment | Sign and send | A signed credential is written to the pod. The payroll provider keeps the source record |
| 3 | | bank / Share verified account summary | Send | Same pattern, different issuer |
| 4 | | bureau / Credit file summary | Send (or "do it for me") | Three issuers, one place, all verifiable later without calling them |
| 5 | 2 Shop | wallet / Prove | Prove to two lenders | A proof, not the data: income ≥ $7,000 a month and score ≥ 620. No grant, no copy |
| 6 | | lender-b / What we received | Look | What the lender holds: a yes, and who vouches for it |
| 7 | 3 Apply | lender / Start → wallet / Requests | Approve the request | A grant: which resources, why, until when, and who else (the underwriting service) |
| 8 | | lender / Application review | Submit | The form is filled from the pod; each field shows its issuer. Six items complete: the clock starts |
| 9 | | lender-desk / Credit, AUS | Pull credit, run AUS | The lender's own report does not use the pod. The score notice is written to it |
| 10 | | aus / Source checks | Look | The underwriting service read three credentials at source, by reference |
| 11 | | lender / Disclosures | I intend to proceed | The Loan Estimate is delivered to the pod, inside the three-business-day limit |
| 12 | 4 Processing | lender-desk / Verifications | Order services | Four orders. Two need borrower data, and each asks for only its part |
| 13 | | appraisal / Field | Submit the report | The appraiser read the property and the contract. Not income, assets or credit |
| 14 | | title / Commitment | Issue commitment | The title agent read the name and the contract. The commitment lands in the pod |
| 15 | | insurer / Quote → Bind | Bind | Property facts reused from the appraisal. Evidence of insurance is written once and read by the lender |
| 16 | | lender-desk / Conditions | Refresh employment, clear to close | Re-verification is a re-issue, not a phone call. The old credential is revoked |
| 17 | 5 Closing | lender / Disclosures | I have received this | The Closing Disclosure is in the pod; three business days must pass |
| 18 | | title / Closing room | Sign | Signed copies go to the pod. The originals follow their own rules |
| 19 | | county / Recorder intake | Record | No Solid here: the land register is public. The receipt is linked from the pod |
| 20 | 6 After closing | lender-desk / Post-closing | Deliver the loan | The sale is between organisations. The notice to Alex lands in the pod |
| 21 | | servicer / Connect → wallet / Requests | Approve | The new servicer asks for three things and nothing more |
| 22 | | wallet / Sharing | Revoke Juniper | The grant is withdrawn; the access rule is removed |
| 23 | | lender-desk / Verifications | Read bank data again | 403. The pod refused. Records Juniper must keep by law are unaffected |
| 24 | Summary | Journey ledger | Read; follow a call to action | Who read what, under which grant, and what never left the pod |

Timing target: 30 seconds a step with "Do it for me", 12 minutes in total. Chapters are skippable; chapter 1 to 3 is a
5-minute short path offered on the welcome page.

## c. The Solid visualisation: "Solid Lens"

### c.1 Rule

The Lens shows two kinds of entry and never mixes them:

- **Pod saw** (solid border): a request the pod server answered. Derived from the request, the response status and,
  for access changes, the ACL document actually written. Nothing is reconstructed or sampled.
- **App said** (dashed border): something no pod request can show: a signature check, a proof verification, an
  organisation-to-organisation delivery, "no Solid in this step". Emitted by app code through `lens.note()`.

### c.2 Layout

Desktop (≥ 1180 px): a 376 px dock on the right of every app page; the app keeps the rest. It collapses to a 52 px
rail showing the organisation count and a pulse on activity. Below 1180 px it is a bottom sheet with a 64 px peek bar.
"Pop out" opens the Lens in its own window (useful on a second screen and in recordings).

```
┌──────────────────────────── app (its own design) ───────────────────────┬──────── Solid Lens ─────────────┐
│ [Concept demo banner: Juniper Home Loans is a fictional organisation]   │ STEP 13 of 24 · Processing     ▢│
│                                                                         │ Submit the appraisal            │
│                                                                         │ [Do it for me]   ‹ Back  Next › │
│                                                                         ├─────────────────────────────────┤
│                                                                         │ WHERE SOLID IS                  │
│                                                                         │ The appraiser read the property │
│                                                                         │ and the contract. Not income,   │
│                                                                         │ assets or credit.               │
│                                                                         │ ● pod read  ● grant G5          │
│                                                                         ├─────────────────────────────────┤
│                                                                         │      (Ledgerly)   (Alder)       │
│                                                                         │   (Quillon)  \     /            │
│                                                                         │           ┌───────────┐         │
│          the organisation's app                                         │ (Juniper)═│ ALEX'S POD│─(Sextant)│
│                                                                         │           │ ▤ Identity│         │
│                                                                         │           │ ▤ Income  │         │
│                                                                         │           │ ▤ Assets  │         │
│                                                                         │           │ ▣ Property│◀━●━(Plumbline)
│                                                                         │           │ ▤ Loan docs│        │
│                                                                         │           │ ▤ Insurance│        │
│                                                                         │           └───────────┘         │
│                                                                         │  ═ grant active  ┄ expired  ✕ revoked
│                                                                         ├─────────────────────────────────┤
│                                                                         │ [This step] Grants  Not shared  Raw
│                                                                         │ ● Plumbline read Subject property│
│                                                                         │   allowed by G5 · appraisal ·   │
│                                                                         │   until report delivered        │
│                                                                         │ ● Plumbline read Purchase agreement
│                                                                         │ ┄ Plumbline sent the report to  │
│                                                                         │   Juniper (not through the pod) │
│                                                                         │ ● Juniper wrote Appraisal copy  │
│                                                                         │   to Loan documents             │
│                                                                         │              [Journey ledger ▸] │
└─────────────────────────────────────────────────────────────────────────┴─────────────────────────────────┘
```

Zones, top to bottom:

1. **Step card.** Chapter, step title, "Do it for me", Back, Next (reads "Skip" until the step is done), the simulated
   date ("Day 12 · Fri") and a restart control. Hidden in free-play and in recording mode.
2. **Where Solid is.** One or two sentences from the step's `lens.headline`, plus involvement chips: `pod read`,
   `pod write`, `grant`, `credential`, `proof`, `denied`, `no Solid in this step`.
3. **Map.** Inline SVG. The pod is a cabinet with one drawer per top-level container, labelled in plain words. Around it
   sit only the organisations met so far; the current one is drawn larger with its own colour. Edges are grants.
4. **Inspector.** Four tabs:
   - *This step*: the entries for the current step in plain English ("Juniper read Employment and income · allowed by
     G4 · mortgage origination · until 60 days after closing").
   - *Grants*: a table of who, what, purpose, until, state; each row links to the wallet's Sharing screen.
   - *Not shared*: a running list per organisation of what it saw and what it did not ("Plumbline saw: property,
     contract. Did not see: income, assets, credit"), computed from the events against the pod's drawers.
   - *Raw*: method, path, status, the ACL diff, and the resource as Turtle, for technical viewers.

Clicking any entry or drawer opens a resource card: path, type (the FIBO or schema.org class, linked), who can read it
now, and for a credential what it proves: issuer, signature result, valid-from, as-of, status-list result.

### c.3 Map states and animation

| Event | Drawing |
|---|---|
| Read | A dot travels from the drawer to the organisation along the grant edge (blue, 600 ms); the drawer outline pulses |
| Write or append | A dot travels from the organisation into the drawer (green); the drawer count ticks up |
| Credential issued | Same as write, drawn as an envelope with a seal; on arrival the drawer shows a seal badge |
| Proof | A hollow tick travels from the pod to the lender; the drawer does not open; the caption reads "answer only" |
| Grant created | An edge draws from the pod to the organisation, labelled with its drawers; the affected drawers show a small key |
| Grant expired | The edge turns dashed grey and its key fades |
| Grant revoked | The edge turns red, retracts into the pod, and the key drops off the drawer |
| Denied | The dot leaves the organisation, stops at the cabinet wall, shows `403`, and returns red |
| Organisation to organisation | A dashed arc between the two organisations that does not touch the pod |
| No Solid | The map dims and a caption names the reason ("public register") |

All motion is under 800 ms, honours `prefers-reduced-motion` (state changes without travel), and every animated event
also appears as text in *This step*, so nothing is conveyed by motion alone. Colours meet WCAG AA and every state has a
shape or line-style difference as well as a colour.

### c.4 The revoke beat (steps 22 and 23)

1. In the wallet, Alex presses Revoke on Juniper. The Lens shows the ACL diff in plain words ("Removed: Juniper may read
   Income, Assets, Credit, Identity, Property, Insurance"), the edge retracts, and a pinned card appears: "Revoked just
   now. Next: see what Juniper gets."
2. The tour moves to the lender desk. "Read bank data again" sends the same request as step 9. The dot bounces; the
   entry reads "Juniper tried to read Assets · refused (403) · grant withdrawn 20 seconds ago".
3. A side-by-side card compares the step-9 entry (200, allowed by G4) with this one (403, no grant).
4. A fixed caveat sits under it: "Juniper still holds the loan file it is required to keep. What has ended is its
   access to Alex's data at source." This sentence is asserted in the e2e test.

### c.5 End of journey: the journey ledger

A full-page view (also reachable any time from the Lens):

- **Matrix.** Rows: pod resources grouped by drawer. Columns: organisations in the order met. Cells: read and write
  counts, shaded by grant state (active, expired, revoked, never). Row and column headers are sticky; the matrix is a
  real `<table>` and exports as CSV.
- **Totals strip**, computed from the log, never typed in: organisations involved; grants (active, expired, revoked);
  credentials issued and how many times each was reused; documents delivered to the pod; denied requests; uploads by
  the borrower (zero).
- **Timeline** by chapter with the simulated dates and the regulatory clocks (LE delivered on day n of 3; CD waiting
  period).
- **"Today" comparison**, clearly labelled illustrative: for each resource, which parties hold a copy in the
  conventional process (from `docs/research/mortgage-process.md` §3) beside who read it here.
- **Calls to action**: weekly meeting registration, forum, watch the other demos, restart.

### c.6 Accessibility

The Lens is a landmark (`<aside aria-label="Solid Lens">`). New entries are announced through a polite live region,
one sentence each. The map has a text alternative that is the *Grants* table. Everything is keyboard reachable; the
dock can be collapsed with one key and never traps focus. axe runs on every step with the Lens open and closed.

## d. Architecture

### d.1 Repo layout (rebuild in place)

```
apps/
  welcome/            front door, launcher, journey ledger page, video pages
  wallet/ payroll/ bank/ bureau/ lender/ lender-desk/ lender-b/ aus/
  appraisal/ title/ insurer/ county/ servicer/
packages/
  pod-runtime/        in-browser pods: service worker host, client, bridge, journal, events, org agents
  tour/               guided tour engine and step schema
  lens/               the Solid Lens custom element and the journey ledger
  demo-kit/           org registry types, appUrl(), demo calendar, trust wiring over solid-showcase-kit
  data-model/         kept: vocab bindings, SHACL shapes, typed wrappers (extended)
  vc-kit/             kept: issue, verify, status, re-issue, threshold proof
content/
  orgs.ts             the organisation registry (names, slugs, WebIDs, theme-color)
  mortgage/           tour.ts (the 24 steps), seed.ts, copy
e2e/                  Playwright: guided path, enforcement, persistence, axe
video/                recorder (from suite-video) + narration per demo
vocab/                mort.ttl (unchanged namespace)
tools/                build-site.mjs (assembles dist/), lint-iris, check-insignia, check-sources
vendor/               packed @jeswr tarballs not yet on npm (showcase-kit, solid-vc, …)
decisions/            add 0017 (this design), marking 0002, 0003, 0011, 0013, 0015 superseded
```

Stack: TypeScript, React 19, Vite (one build per app, `base: "/<slug>/"`), pnpm workspaces, Turbo, Biome, Vitest,
Playwright. No Next.js: there are no server routes left, and a static multi-page build is smaller and faster to deploy.

### d.2 In-browser pod runtime (`packages/pod-runtime`)

- **Server:** `@sparq-org/solid-server@0.1.8` from npm (its `./wasm` export is the web-target build; the vendored
  tarball and the exports patch are deleted). One `SolidServer` instance per pod, base URL `https://<pod-origin>/pods/<slug>/`.
  One pod for Alex and one per organisation (WebID profile, public key, status list, its own records).
- **Host:** a service worker at the pod origin intercepts `/pods/**` and dispatches to the right instance. Requests are
  serialised per pod; a 2 MiB body limit and trap recovery are carried over from `solid-kit/browser-pod/host.ts`
  (answer 503, discard the instance, rebuild from the journal).
- **Identity:** the host passes the caller's WebID as the server's `authenticatedWebid` argument, so WAC is evaluated
  by the pod server for every request. Path mode: the app's engine client sends `X-Demo-Agent: <slug>`, and the host
  maps slug to WebID from the registry. Host mode: the caller is identified by its origin (§d.5). An unknown or missing
  identity is anonymous.
- **Persistence:** IndexedDB. An append-only journal of successful state-changing requests (method, URL, headers, body,
  WebID, demo time). On start, and after the browser stops an idle worker, the host re-creates the instances and replays
  the journal with events suppressed. The seed is the first block of the journal. "Restart the demo" clears the journal.
- **Seed:** `content/<demo>/seed.ts` exports a list of requests (profiles, containers, ACLs, seeded documents) built
  with the data-model wrappers and `n3.Writer`. Issuer keys are generated per visitor with WebCrypto (Ed25519,
  non-extractable, stored in IndexedDB); the seeded identity credential is signed in the browser at first run. No
  private key ships in the bundle.
- **Events:** after each response the host emits a `PodEvent` (below) to every open page and appends it to an
  `events` store, which is what the Lens and the journey ledger read.
- **Organisation agents:** each organisation package may export `agent.ts`: handlers that react to a write in the
  organisation's own `inbox/` and act as that organisation (for example Castellan receiving a casefile and returning
  findings). They run in a worker started by the runtime, standing in for the organisation's back office. This is how
  one organisation reacts while the visitor is looking at another. Agents are plain functions over `podFetch`, so the
  whole journey also runs headless in Vitest.
- **Fallback:** where service workers are unavailable, the client runs the same host in a dedicated worker and
  rehydrates from the journal on each page. The honesty panel reports which mode is active.
- **First task for the lane:** characterise the 0.1.8 wasm API (what `authenticatedWebid = null` means, ACL
  inheritance, `acl:agent` matching) with tests before building on it.

```ts
// packages/pod-runtime (contract; implementers must keep these names)
export function ready(): Promise<RuntimeInfo>;               // resolves when pods are seeded and controlled
export function session(): Session;                           // { org: OrgSlug, webid: string, persona: string, simulated: true }
export const podFetch: typeof fetch;                          // the only way apps reach a pod
export function podUrl(owner: OrgSlug | "alex", path: string): string;
export function onEvent(cb: (e: LensEntry) => void, opts?: { replay?: boolean }): () => void;
export function note(n: AppNote): void;                       // "app said" entries
export function resetDemo(): Promise<void>;

export interface PodEvent {
  id: number; at: string;            // demo-calendar ISO time
  tour?: { demo: string; step: string };
  actor: { org: OrgSlug | "alex"; webid: string; viaAgent: boolean };
  pod: OrgSlug | "alex"; path: string; method: string; status: number;
  kind: "read" | "write" | "delete" | "grant" | "revoke" | "denied";
  resource?: { label: string; drawer: string; types: string[];
               credential?: { type: string; issuer: string; validFrom: string; asOf?: string } };
  acl?: { granted: AccessRule[]; revoked: AccessRule[] };   // from the ACL body actually written
  grant?: string;                    // IRI of the policy that allowed it, when one matches
}
export interface AppNote { kind: "verified" | "proof-verified" | "org-to-org" | "no-solid" | "clock" | "notified" | "grant-used";
                           org: OrgSlug; text: string; refs?: string[] }
export type LensEntry = ({ source: "pod" } & PodEvent) | ({ source: "app"; id: number; at: string } & AppNote);
```

### d.3 Sign-in per persona

There is no identity provider. Each app declares who it acts as; the engine shows "Signed in as Priya Nair, processor
(simulated)" in the trust banner. The honesty panel, linked from every banner, says in these words: sign-in is
simulated; access control is real (the pod server checks each request against the access rules for that organisation);
everything runs in your browser and nothing is sent to a server. The apps use ordinary Solid HTTP against `podFetch`,
so pointing them at a hosted pod with real Solid-OIDC is a later option, not part of this build.

### d.4 App-to-app handoff

- `appUrl(slug, path, params)` from `demo-kit` builds every cross-app link, so the path/host mode is one switch.
- Consent uses a redirect, as people expect from "Sign in with…": the requesting app writes an access request to
  `alex:/inbox/`, then navigates to `wallet/requests?request=<url>&return=<url>`. The wallet writes the grant and
  returns. No state travels in the URL except those two pointers.
- Organisation to organisation: a write to the recipient's `inbox/`, handled by its agent.
- Same-origin navigations use cross-document view transitions with the Lens as a named element, so it stays put while
  the app changes around it.

### d.5 Origins: why one domain, and how each organisation still gets its own host

A browser partitions storage and service workers by top-level site. `vercel.app` is on the Public Suffix List, so two
`*.vercel.app` projects are different sites and can never see the same in-browser pod. With no server, separate
vercel.app hosts per organisation are therefore impossible. Two modes, one build:

| | Path mode (ships first) | Host mode (when a custom domain exists) |
|---|---|---|
| URLs | `solid-mortgage.vercel.app/lender/…` | `lender.<domain>/…`, pods at `pods.<domain>` |
| Vercel | 1 project | The same project; one hostname added per organisation; `vercel.json` rewrites by host |
| Pod access | App calls `fetch` on the same origin; the service worker answers | App posts the request to a hidden iframe on `pods.<domain>` (same site, so not partitioned); the iframe fetches; its service worker answers |
| Caller identity | Declared by the app (`X-Demo-Agent`) | The browser-verified origin of the calling app |
| Cost | Nothing to set up | One wildcard DNS record; a spike to confirm same-site sharing in Chrome, Firefox and Safari |

Recommendation: build both into `podFetch` from the start (the bridge is about 100 lines), launch in path mode, switch
on host mode when Jesse provides a domain. Host mode is better on two counts: the address bar shows a different site
per organisation, and identity stops being self-declared.

### d.6 Tour engine (`packages/tour`)

Steps are data, validated at build time:

```ts
export interface TourStep {
  id: string; chapter: string; app: OrgSlug | "welcome"; path: string;
  title: string;                         // ≤ 8 words
  body: string;                          // ≤ 45 words, describes the action, not an outcome not yet shown
  action?: { target: string; label: string };        // [data-tour="<target>"]
  done: { event?: Partial<PodEvent>; note?: Partial<AppNote>; target?: string };
  mode: "interactive" | "summary";
  lens: { headline: string; chips: Chip[]; notShared?: string[] };
  realWorld: { stage: string; rule?: string; source?: string /* C-id from design.md */ };
  clock?: { day: number };               // simulated day this step happens on
  expect: Array<Partial<PodEvent> | Partial<AppNote>>; // asserted by e2e
}
```

- Completion is detected from Lens entries first, DOM targets second, so restyling an app cannot break the tour.
- State (demo, step, done set) lives in IndexedDB; `?tour=mortgage&step=<id>` deep-links.
- "Do it for me" moves a visible cursor to the target and clicks it. It never fakes an outcome.
- Every actionable element carries `data-tour="<name>"`; the names are part of each app's contract with the tour.
- `window.__demo` exposes `goto(stepId)`, `act()`, `lens(view)` and `present(on)` for the video recorder and e2e.
- Modes: guided (step card visible), free play (Lens only), present (`?present=1`: no step card, larger Lens type).

### d.7 Demo calendar

A simulated calendar makes the regulatory clocks visible without fake timestamps. Day 1 is the latest Monday at least
75 days before today; every date in the demo is therefore a real past date. Issuers stamp credentials with the
calendar's time; verifiers compare against it. `demo-kit/calendar.ts` implements both TRID business-day definitions
with the federal holiday table. The Lens shows "Day 12 · Fri (simulated calendar)". Days: 1 credentials and
pre-qualification; 3 application; 4 Loan Estimate and intent to proceed; 5 orders; 12 appraisal; 14 title commitment;
16 insurance; 31 employment refresh and clear to close; 32 Closing Disclosure; 38 closing and recording; 45 sale;
52 transfer notice; 70 servicing transfer; 72 revoke.

### d.8 Deployment

- `tools/build-site.mjs` runs each app's Vite build and assembles `dist/<slug>/`, `dist/pods-sw.js`, `dist/agents/`,
  `dist/video/`. `vercel.json`: `outputDirectory: dist`, a single-page fallback per slug, `noindex` headers everywhere,
  `Service-Worker-Allowed: /`, long-cache hashed assets, and `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`
  on `/wallet/prove` only (multithreaded proving; single-threaded fallback elsewhere).
- One production deployment per merge to `main`. Preview deployments only for pull requests labelled `preview`
  (`ignoreCommand`), which keeps well under Hobby's 100 a day.
- No serverless functions. No environment variables except the optional host-mode domain.
- The vocab project stays as it is: `https://solid-mortgage-vocab.vercel.app/mort#` is a permanent namespace.
- Old `solid-mortgage-*.vercel.app` projects: deploy a redirect to the new path once, delete after 30 days. Turn the
  EC2 box off when the new `main` is live.

### d.9 Keep, change, delete

| Item | Action |
|---|---|
| `packages/data-model` | Keep. Extend with shapes for: purchase agreement, subject property, loan estimate, closing disclosure, score notice, title commitment (replaces title-clear), evidence of insurance, settlement statement, recording receipt, servicing notice, access request, ODRL policy. Existing FIBO bindings stay; new terms must pass `lint:iris` or go in `mort.ttl` |
| `packages/vc-kit` | Keep issue, verify, status, re-issue and the live threshold proof with issuer operand anchors (values 8,500 and 742 keep their captured encodings). Drop precomputed-manifest proofs. Inject the demo calendar as the clock |
| `packages/solid-kit/browser-pod` | Superseded by `pod-runtime`; port the dispatch queue, body limit, trap recovery and their tests |
| `packages/solid-kit` auth, harness, dev issuer, service identities | Delete (no server-side boundary remains). `@jeswr/solid-pod-guard` is not used in the static build |
| `packages/ui` | Delete; use `@jeswr/solid-showcase-kit` for the banner, interstitial and metadata |
| `apps/*` (9 Next.js apps) | Delete after the new guided path passes e2e |
| `scripts/demo/*`, `deploy/hosted/*` | Delete. `activity.ts`'s ACL parsing moves into `pod-runtime` (rewritten on `@solid/object` access-control wrappers, not raw quads) |
| `scripts/lint-iris.mjs`, `check-insignia.mjs`, `check-mort-terms.mjs` | Keep, move to `tools/`. Insignia roster becomes "every real organisation name" |
| `docs/research`, `decisions` | Keep as history; add 0017 |
| `docs/sales` | Keep out of any public copy of the repo (it names outreach targets): open question 9 |
| Domain models | Hand-written wrappers stay for this build. Moving to `@jeswr/federation-codegen` (the suite rule for model packages) is a later lane using the oracle method |

### d.10 Showcase framework: honest evaluation

| Package | Fit | Verdict |
|---|---|---|
| `@jeswr/solid-showcase-kit` | Banner, interstitial, metadata, themes, insignia scanner | Reuse as is. Add one thing: a `fictional` organisation mode ("Juniper Home Loans is a fictional organisation") beside the existing "this is not {Org}" copy |
| `@jeswr/solid-showcase` | Walkthrough document, landing, chapters, launcher, ecosystem map | Reuse the idea, not the pages. Its deploy helpers (zone rewrites, env matrix, health routes, `podRoutes`) assume one Next.js project per app and server routes. Add a `./guided` schema (the `TourStep` above) and keep `parseWalkthrough`'s editorial budgets |
| `@jeswr/solid-pod-guard` | Server-side DPoP caller boundary | Not applicable without a server. Keep for hosted modes |
| `create-solid-demo` | Scaffolds the multi-zone Next.js monorepo | Wrong topology now. Add a `static` template after this build proves the engine |

What must be added so all demos share one engine: the pod runtime, the tour engine and the Lens. They are built here as
domain-generic packages (a grep gate bans mortgage terms in them) and move to `solid-sdk` in a later lane, with the
suite's `packages/<name>/SKILL.md` for each.

## e. Welcome page

Own branding ("Solid demos for EDMA members", EDMA Solid Community of Practice as convener). One page, in this order:

1. **Headline and one paragraph.** "See what changes when the customer holds the data." Then the explainer:

   > Solid is an open standard, now being standardised at the W3C, for keeping data in a pod: a web-addressable store
   > that belongs to the person or business the data is about. Applications do not import copies. They ask for access
   > to named resources, and the owner grants it for a stated purpose and period, and can withdraw it. For a data
   > manager that turns the usual model around: one authoritative copy at the source, access policy attached to the data
   > instead of rebuilt in every system, shared vocabularies such as FIBO so a field means the same to every reader, and
   > a record of who read what. These demos show that model inside processes you already run.

2. **Demo cards**, mortgage first. Each card: title, one sentence, sector tag, duration, a poster that plays the
   narrated video in place (self-hosted MP4 and WebVTT captions, `preload="none"`, chapter list that seeks), and two
   buttons: **Watch** and **Try it yourself** (starts the guided tour with fresh data). Demos not yet built show
   "Coming next" with no dead links.
3. **"One pod, four sectors"** strip: buy a home, insure it, tell everyone you moved, hand over a medication list.
4. **Explore the apps.** A launcher grid of every organisation app for free play, each tile in that app's own colours.
5. **What is real and what is simulated.** Four lines: real pod server, real access control, real signatures and proofs;
   simulated sign-in, simulated organisations and people, nothing leaves your browser.
6. **Join in.** Two buttons: register for the weekly meeting (`https://hub.edmcouncil.org/NC__Event?id=a0lVQ0000061alxYAA`)
   and the forum (`https://edmconnect.edmcouncil.org/solidforum/home`); a link to the source repository.
7. **Footer.** Concept-demo disclaimer, "all organisations and people are fictional", `noindex`.

Each video also has its own page (`/welcome/watch/<demo>`) with the transcript, for sharing and for people who cannot
play audio.
