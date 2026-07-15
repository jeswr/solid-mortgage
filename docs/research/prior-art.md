# Prior art: VC / digital-identity pilots in mortgage and finance

Grounded answer to the EDMA-member question "who else has done this?", and ammunition for the
sales pack's objection handling (sm-58). Every claim web-verified July 2026; links inline.
Pattern across all of it: **many efforts proved one slice — document integrity, vendor-rail
verification, a credential wallet, an org credential, a ledger, or a pod — but none combined a
user-held general data store + cross-party credential reuse + zero-knowledge disclosure +
receipted consent.** That combination is this showcase.

## 1. MISMO — the industry's own standards track

MISMO (the MBA's standards body) is where US mortgage "digital trust" work actually lands.
Three strands matter.

### 1.1 SMART Doc V3 "Verifiable Profile" + eVault/eNote standards

- The [Verifiable Profile SMART Doc Development Workgroup](https://www.mismo.org/get-involved/workgroup/verifiable-smart-doc-3-0-profile-development-workgroup)
  produces a profile of [SMART Doc V3](https://www.mismo.org/standards-resources/mismo-product/smart-doc-version-3)
  where loan-document **data travels with the PDF and is automatically verified against the
  document image** — "verifiable" here means document/data integrity, not W3C Verifiable
  Credentials. Sample documents and title/closing use cases are in progress.
- [eVault Standards and SMART Doc Validation Rules](https://www.mismo.org/standards-resources/mismo-product/evault-standards-and-smart-doc-validation-rules)
  were updated through 2025 ([MBA, July 2025](https://www.mba.org/news-and-research/newsroom/news/2025/07/17/mismo-publishes-updated-evault-standards-and-smart-doc--validation-rules);
  final status October 2025). eVaults hold the authoritative eNote copy; control is recorded in
  the **central MERS eRegistry** — a registry-of-record model, not holder-held credentials.
- A [Digital Interoperability Community of Practice](https://www.mismo.org/get-involved/workgroup/digital-interoperability)
  (eVault vendors, doc vendors, lenders, GSEs) works on eVault/eDoc interoperability, and an
  [eClosing white paper](https://www.mismo.org/standards-resources/mismo-product/eclosing-white-paper)
  (candidate recommendation, July 2026) gives the adoption roadmap.

**Proved**: the industry wants tamper-evident, machine-readable loan artifacts, and will
standardise them; eNotes with central registries work at scale.
**Lacked**: everything is lender/vault-side. The borrower holds nothing, reuses nothing across
parties, and discloses everything; "verifiable" stops at document integrity. No selective
disclosure, no consent trail visible to the consumer.
**Status**: active standards track; certification programmes running.

### 1.2 Remote Online Notarization (RON) identity standards

[MISMO RON Standards (V2 in public comment 2024–2026)](https://www.mismo.org/standards-resources/mismo-product/remote-online-notarization-standards)
define credential analysis and borrower identification requirements for online notarization,
with a [compliance certification](https://www.mismo.org/events-education/certifications/emortgage-technology-certification/ron)
held by dozens of providers.

**Proved**: regulator-acceptable *remote identity proofing* of borrowers at closing is
standardisable — the identity moment of the mortgage is already digital.
**Lacked**: identity is proofed per-event and discarded; nothing reusable is issued to the
borrower. **Status**: adopted; V2 revision in flight.

### 1.3 Blockchain white paper (2023)

MISMO's [blockchain white paper](https://www.mismo.org/about-MISMO/news/2023/07/20/mismo-releases-white-paper-focused-on-blockchain-in-the-mortgage-industry)
surveys DLT opportunities in mortgage. No VC or decentralised-identity standard has followed
from it to date — the closest MISMO artifact to W3C VCs remains the (differently named)
Verifiable Profile above. **Gap our showcase fills**: an actual W3C VC 2.0 data model over
MISMO-shaped verification data.

## 2. GSE digital-verification programmes (adjacent prior art)

- **Fannie Mae [Day 1 Certainty / DU validation service](https://singlefamily.fanniemae.com/applications-technology/day-1-certainty)**:
  DU validates income, employment and assets against reports from
  [approved third-party vendors](https://singlefamily.fanniemae.com/applications-technology/desktop-underwriter-validation-service/du-validation-service-verification-report-vendors)
  (The Work Number, Finicity, FormFree, Argyle, …), giving lenders rep-and-warrant relief and
  [up to 12 days cycle-time saved](https://getblueprint.io/day-1-certainty/).
- **Freddie Mac AIM** (Asset and Income Modeler in Loan Product Advisor) is the
  [equivalent programme](https://docs.argyle.com/integrations/d1c-aim/verifications) — same
  vendor rails, same relief model.
- **FHFA's [Velocity TechSprint](https://www.fhfa.gov/programs/fintech/techsprint/2023)**
  (July 2023, first-ever FHFA TechSprint) put "direct-to-source data", digital trust and
  borrower experience on the regulator's agenda; the
  [key-themes report](https://www.fhfa.gov/sites/default/files/2024-01/FHFA-Velocity-TechSprint-An-Analysis-of-Key-Themes-December_2023.pdf)
  frames data digitisation as the lever for cost and access.

**Proved**: source-verified digital data measurably cuts origination time and cost, and the
GSEs will grant *rep-and-warrant relief* for it — the strongest possible institutional
endorsement of verified-data rails. Our scene-1 issuers are deliberately 1:1 with these
approved-vendor roles.
**Lacked**: verifications are vendor-to-lender API calls. Each lender re-pulls; the borrower
never holds the verification, can't reuse it with a second lender, can't see who accessed
what, and full raw values flow every time (no minimisation, let alone ZK).
**Status**: production, industry-wide; this is the incumbent rail we re-plumb through the pod.

## 3. US mortgage VC proofs-of-concept

### FormFree Passport / Web5 DCX — the closest prior effort

[FormFree](https://formfree.com/passport/) (a GSE-approved verification vendor) built
**Passport**, a borrower wallet holding a "Financial DNA" credit profile **as a Verifiable
Credential**, with an ability-to-pay (RIKI) score, developed in Block/TBD's Web5 incubation
programme ([TBD: "Shifting Loan Power to Borrowers"](https://developer.tbd.website/blog/shifting-loan-power-to-borrowers/)).
FormFree also open-sourced **DCX**, a Web5 credential-exchange server implementing Presentation
Exchange. Then Block
[shut down TBD in November 2024](https://techcrunch.com/2024/11/07/block-scales-back-tidal-investment-and-shutters-tbd-in-favor-of-bitcoin-mining/)
to fund bitcoin mining; the Web5 SDK and DID utilities were
[handed to the Decentralized Identity Foundation](https://volodymyrpavlyshyn.medium.com/sunset-of-tbd-what-the-future-of-dwns-looks-like-eb1cea5159a9).

**Proved**: a real mortgage-verification vendor believed borrower-held VCs were the next step,
and got a wallet product to market framing "the borrower carries their qualification".
**Lacked**: single-vendor issuance (one issuer, one score), a proprietary wallet rather than a
general user-held data store, no ZK (the VC carries the profile, presentation reveals it), no
multi-party journey (no AUS, title, closing, servicing legs), and its platform substrate (Web5)
was discontinued underneath it.
**Status**: Passport still marketed by FormFree; the Web5 rails it bet on are community-run at
DIF. **Objection-handling line**: the thesis was validated by an incumbent GSE vendor; what
died was a corporate platform, not the standard — we build on W3C VC 2.0 + Solid, both open
standards with multiple implementations.

## 4. VC-era lending and identity POCs — and their lessons

| Effort | What it was | Proved | Lacked | Status today |
|---|---|---|---|---|
| **[Bloom](https://bloom.co/protocol)** (2017–2022) | Ethereum-era "reusable identity + credit history" protocol (BloomID/BloomIQ/BloomScore), [$31M ICO](https://www.sec.gov/enforcement-litigation/administrative-proceedings/33-11089-s), TransUnion partnership | Consumer appetite post-Equifax for user-controlled credit data; early attestation model | Token-financed, on-chain anchoring, no lender-side rail, no privacy tech beyond hashing | Dormant: [SEC settlement (Aug 2022)](https://www.ledgerinsights.com/bloom-sec-crypto-token-security/) over the unregistered ICO; no public activity since 2022 |
| **[Trinsic](https://rileyparkerhughes.medium.com/why-verifiable-credentials-arent-widely-adopted-why-trinsic-pivoted-aee946379e3b)** (2019–2024 as VC platform) | General-purpose VC issuance/wallet platform, hundreds of customers | VCs are easy to *issue*; dozens of paying pilots | Founder's own post-mortem (Oct 2024): interoperability paradox, cold-start UX, no use-case concentration — "1 breakaway story per 500 sign-ups" | Pivoted to an identity-*acceptance* network aggregating existing IDs |
| **CULedger → [Bonifii](https://bonifii.com/) MemberPass** (2019–) | Credit-union consortium issuing VC-based member KYC credentials; [Lone Star CU pilot](https://bonifii.com/bonifii-blog/) (2023), CU*BASE core integration (Dec 2023) | Regulated US lenders can issue and accept VCs for member authentication in production | Single-purpose (call-centre/login KYC), closed consortium, no data credentials, no borrower store | Acquired by [Metallicus](https://www.memberpass.com/) (2024); continues as an auth product |

**Lesson for the sales pack**: horizontal VC platforms failed for want of an anchor ecosystem
and a burning use case. Mortgage supplies both — a $11.6k/loan cost problem, existing
GSE-approved verifier roles to map issuers onto, and (in the EU) regulation about to *require*
wallet acceptance. The showcase is vertical-first, which is precisely what the failures
weren't.

## 5. GLEIF vLEI — organisational identity in finance

The [verifiable LEI (vLEI)](https://www.gleif.org/en/organizational-identity/lei-vlei/the-verifiable-lei-vlei)
is GLEIF's cryptographically verifiable org credential (KERI/ACDC). In finance:
[BIS Innovation Hub Project Aperta](https://www.biometricupdate.com/202606/gleif-bis-test-vlei-as-trust-layer-for-cross-border-open-finance)
(reported June 2026, with authorities in UK/UAE/Brazil/Hong Kong/India) used vLEIs as the trust
layer for cross-border open-finance data sharing, showing reusable org credentials cut repeated
KYB/onboarding; commercial vLEI issuance is live (QVIs incl. CFCA, SHECA), and GLEIF runs a
[partners programme](https://tradetreasurypayments.com/posts/gleif-launches-global-partners-programme-to-advance-lei-and-vlei-adoption-across-financial-and-digital-identity-systems)
to push adoption.

**Proved**: verifiable *organisational* credentials work and regulators will pilot them; the
"reusable credential kills repeated onboarding" argument now has central-bank backing.
**Lacked**: vLEI identifies the *institution*, not the consumer or their data — it's the
complement, not the competitor.
**Status**: commercial, growing. Our design references stakeholder orgs by LEI today and
positions vLEI as product-phase org auth (SPEC §3, C5) — i.e. we *adopt* this prior art.

## 6. Land-registry and property pilots

| Pilot | When | What happened | Proved / lacked | Status |
|---|---|---|---|---|
| **HM Land Registry "Digital Street"** ([Computer Weekly](https://www.computerweekly.com/news/252461839/HM-Land-Registry-completes-blockchain-trial)) | 2018–19 | Corda-prototype digital transfer of a real house sale (Mishcon de Reya, Shieldpay, Yoti) | Proved end-to-end digital property transfer is feasible; explicitly a proof-of-concept only — ledger-centric, nothing consumer-held | Not productised. Separately, HMLR's ["Sign your mortgage deed"](https://www.gov.uk/government/news/hm-land-registry-is-making-it-easier-to-remortgage) digital deed service *did* go live with major lenders — the non-DLT slice shipped |
| **Lantmäteriet + ChromaWay (Sweden)** ([CoinDesk](https://www.coindesk.com/markets/2018/06/15/swedens-land-registry-demos-live-transaction-on-a-blockchain), [Computer Weekly](https://www.computerweekly.com/news/450421958/Sweden-trials-blockchain-for-land-registry-management)) | 2016–18 | Private-blockchain property transaction testbed with SBAB Bank, Landshypotek, Telia | Claimed contract-to-title time cut from ~4 months to days; small-scale pilot only | Demonstrated 2019, then did not advance to production |
| **Teton County, WY + Medici Land Governance** ([GlobeNewswire](https://www.globenewswire.com/news-release/2019/06/17/1869648/0/en/Medici-Land-Governance-Makes-Teton-County-Wyoming-the-First-County-in-the-USA-with-Blockchain-Registered-Land.html)) | 2019 | First US county with land records (deeds, mortgages, lien releases) mirrored to a blockchain | Proved US county recorders will adopt novel record rails; records-on-chain ≠ credentials anyone holds | One-county deployment; no VC layer followed |
| **BC LTSA "BC Property Connect" + Lawyer Credential** ([LTSA](https://ltsa.ca/property-owners/bc-property-connect/about-bc-property-connect/), [CBABC pilot](https://cbabc.org/news/LTSA-Lawyer-Credential-Pilot-Program)) | 2024– | Canadian land-title authority building **digital-trust credentials**: owner credentials connecting a verified person to their interest in land, and LSBC-issued lawyer credentials for e-signing filings | The most current land-registry VC programme: a government registry issuing credentials to *people* against title data | Pilot phase; [public launch slated 2026](https://privatelenderassociation.ca/bc-property-connect-launching-in-2026-what-bc-property-owners-need-to-know/). Registry-scoped: no general data store, no lending journey |

## 7. EU: EUDI wallet and eIDAS 2.0

Under eIDAS 2.0 every member state must offer a certified
[EU Digital Identity Wallet](https://digital-strategy.ec.europa.eu/en/policies/eudi-wallet-implementation)
by end-2026, and regulated relying parties — banks included — must accept it shortly after.
Four Large-Scale Pilots (2023–25) validated wallet flows including **bank-account opening**
across borders; bank-facing analyses ([Wultra](https://www.wultra.com/blog/top-use-cases-for-banks-with-the-eudi-wallet),
[Truvity](https://www.truvity.com/blog/eudi-wallet-in-practice-real-use-cases-banks-can-already-test-today))
name **mortgage/loan applications with verified income attestations + qualified e-signature**
as the flagship high-value use case, but no dedicated mortgage LSP ran — account-opening and
QES are the validated legs.

**Proved**: regulation can force wallet acceptance at every EU bank; attestations
(EAAs/QEAAs) give a legal frame for exactly our scene-1 credentials.
**Lacked**: wallet-only (attestations, not a general user data store — no place for the loan
file itself to live), issuance is centralised/qualified-TSP-shaped, ZK/BBS+ selective
disclosure still unsettled in the ARF, and mortgage remains a slideware use case.
**Status**: rollout in progress, deadline end-2026. **Objection-handling line**: for European
EDMA members this is the regulatory tailwind — the showcase is the EUDI mortgage story built
out further (store + ZK + receipts) before their competitors get there.

## 8. Solid-specific financial-data pilots

- **NatWest (with Inrupt, 2020)** — one of the first enterprise Solid pilots
  ([CNBC](https://www.cnbc.com/2020/11/09/tim-berners-lee-attracts-nhs-bbc-natwest-to-inrupts-solid-platform.html),
  [Inrupt case study](https://inrupt.com/solid-enterprise-natwest-bbc)): customer "life
  moments" (marriage, new business) written once to a NatWest-hosted pod and reused across
  apps, with offers driven off pod data. Proved a tier-1 retail bank will host pods and build
  on them. Lacked: bank-hosted rather than borrower-chosen pods, no VCs, no cross-institution
  reuse, no lending journey; pilot did not become a product.
- **Flanders / Athumi (2022–, in production)** — the Flemish government's data utility runs a
  production Solid pod platform ([Inrupt case study](https://www.inrupt.com/case-study/flanders-strengthens-trusted-data-economy),
  [Athumi](https://athumi.eu/en/technologies/solid)). Live/announced use cases: HR career data
  ("My Career" with Randstad — payslip/diploma sharing,
  [called the first end-to-end production Solid use case in an ING-published review](https://medium.com/ing-blog/controlling-your-personal-data-with-a-solid-based-data-vault-is-reality-f780e5228893)),
  [student certificates via itsme](https://athumi.eu/en/blog/news/athumi-and-itsme-launch-innovative-solution-to-replace-student-certificates),
  and a real-estate use case (sharing EPC/energy data for housing and renovation advice) with
  **KBC bank listed among partners**. Proved: government-scale production Solid, GDPR-framed,
  with real employers and a bank in the ecosystem. Lacked: no mortgage/lending journey yet, no
  VC layer, no ZK — the pods carry documents, not proofs.
- **ODI-era stewardship** — since October 2024 the
  [Solid project sits under the ODI](https://theodi.org/news-and-events/news/odi-and-solid-come-together-to-give-individuals-greater-control-over-personal-data/),
  giving the governance story institutional weight. (Note: we found **no publicly verifiable
  BNP Paribas Solid pilot**; BNP Paribas' documented decentralised-lending work is
  [Finastra Fusion LenderComm](https://www.finastra.com/press-media/finastras-fusion-lendercomm-now-live-based-blockchain-architecture)
  — Corda-based *syndicated-lending* data sharing between banks (with Natixis, SocGen,
  NatWest), which proved bank appetite for shared lending rails but involved no consumer, no
  credentials and no user-held data. If EDMA members recall a BNP/ODI Solid engagement, source
  it before citing.)

## 9. Differentiation summary

Columns: **Store** = user-held general data store; **Reuse** = credential/data reuse across
independent parties; **ZK** = zero-knowledge / minimal disclosure; **Consent** = user-visible
grant + receipt + revocation trail.

| Prior effort | Store | Reuse | ZK | Consent | Status (07/2026) | What our showcase adds over it |
|---|---|---|---|---|---|---|
| MISMO Verifiable Profile / eVault + MERS | — | — (vault-to-vault) | — | — | Active standards | Borrower-held data + VCs instead of registry-held documents |
| MISMO RON identity standards | — | — (per-event proofing) | — | — | Adopted, V2 in flight | Identity proofing that *issues* a reusable credential |
| Fannie D1C / Freddie AIM | — | — (per-lender re-pull) | — | — | Production, industry-wide | Same verified data, held by the borrower, reused across lenders, minimally disclosed |
| FHFA Velocity TechSprint | — | — | — | — | Ideas stage | A running implementation of its "direct-to-source + trust" themes |
| FormFree Passport (Web5) | wallet only | single-issuer | — | — | Product live; Web5 substrate wound down (11/2024) | Multi-issuer open-standard VCs, general pod, ZK pre-qual, full journey |
| Bloom | — (chain-anchored) | intended | — | — | Dormant since SEC 2022 | Standards-based, no token, lender-rail-shaped |
| Trinsic (platform era) | wallet only | horizontal | — | — | Pivoted 2024 | Vertical anchor ecosystem (the missing ingredient its founder named) |
| Bonifii MemberPass | — | within consortium | — | — | Acquired (Metallicus), auth-only | Data credentials + store, not just login KYC |
| GLEIF vLEI / BIS Aperta | — | org-level ✓ | — | — | Commercial + CB pilots | Consumer-side counterpart; we consume vLEI, not compete |
| HMLR Digital Street | — (ledger) | — | — | — | PoC ended; e-deed service live | User-held records instead of a ledger prototype |
| Lantmäteriet/ChromaWay | — (ledger) | — | — | — | Not advanced post-2019 | Same |
| Teton County / Medici | — (ledger) | — | — | — | One county, no VC layer | Same |
| BC LTSA Property Connect | — | registry-scoped ✓ | — | — | Pilot; 2026 launch | Whole lending journey around the title credential |
| EUDI wallet (banking) | wallet only | ✓ (regulated) | partial/unsettled | partial | Rollout, deadline end-2026 | The loan file has a home (pod); ZK today; receipts today |
| NatWest Solid pilot | ✓ (bank-hosted) | — | — | — | Pilot, not productised | VCs + ZK + multi-institution journey on the pod |
| Flanders/Athumi | ✓ | ✓ (HR/education) | — | — | **Production** | The finance/mortgage journey + VC + ZK layer it hasn't built |
| **This showcase** | **✓ pod (WAC)** | **✓ 8 apps / 16-party chain** | **✓ Noir/UltraHonk predicates** | **✓ DPV receipts + revocation + freshness** | Demo → partner build | — |

### The three objection-handling sentences (feed sm-58)

1. **"Who else has done this?"** — Everyone has done a piece: the GSEs proved verified digital
   data saves 12 days, FormFree proved a mortgage vendor will issue borrower-held VCs, Athumi
   proved production pods at government scale, GLEIF+BIS proved reusable credentials kill
   repeated onboarding, and the EU is legislating wallet acceptance into every bank. Nobody
   has put the pieces together — that is this showcase.
2. **"Didn't VC/blockchain pilots fail?"** — The failures were horizontal platforms (Trinsic's
   own post-mortem), token projects (Bloom), and ledgers with no consumer (HMLR, Lantmäteriet).
   None had an anchor vertical, a user-held store, or privacy tech; we start from all three.
3. **"Is it real technology?"** — Solid pods run in production in Flanders; vLEIs are
   commercially issued; W3C VC 2.0 is a ratified standard; our ZK stack proves live in-browser.
   The only thing unproven is the combination — which is exactly what a showcase is for.
