# Pod Host — trusted branded pod host for the borrower's pod + data wallet

**Question**: which EDMA member org's brand goes on the borrower's Solid pod and data wallet (EDMA role R3, Managed Pod Hosting / Data-Custody Operator)?

**Constraints**: EDMA member (partnership phase) · consumer-trustable in a US mortgage context · credibly neutral (not a loan counterparty) · plausible as a real managed-pod-hosting business.

## Recommendation

**Primary: Verizon** — branded consumer front (**"Verizon Data Vault"**), with a two-layer story: **powered by Snowflake** (governed-data custody layer) and **Microsoft Entra Verified ID** (VC issuance rails). Verizon is the only candidate that simultaneously clears all four constraints: confirmed EDMA member with board-level history, a household consumer brand with ~100M+ retail billing relationships, zero mortgage counterparty role, and existing paid consumer data/identity products (Verizon Cloud, Identity Secure, Verizon ID) that make managed pod hosting a plausible product-line extension rather than fiction.

| | Pick | When to prefer instead |
|---|---|---|
| **Primary** | **Verizon** (front brand) + Snowflake/Entra behind | Default. Matches the internal role map (R3 primary, R9 secondary "consumer data wallet pilot"). |
| **Runner-up 1** | **Mastercard** ("Mastercard Data Vault") | If the partner phase confirms Mastercard EDMA membership, or if the wallet/VC-presentation UX (not pod custody) becomes the hero of the demo — its Identity Attribute Verification + mDL wallet push is the closest real product to our VC flow. |
| **Runner-up 2** | **Snowflake** (sole brand, "secured by Snowflake") | If the primary audience shifts from consumers to EDMA data-management practitioners — Snowflake has the deepest EDMA engagement of any candidate (co-built CDMC, first CDMC-assessed platform) and the demo then showcases CDMC-governed custody. Needs no consumer-brand credibility in that framing. |

## Candidate evaluation

| Candidate | EDMA engagement | US consumer trust | Neutrality vs loan | Data-custody track record | Wallet-brand test |
|---|---|---|---|---|---|
| **Verizon** | Member since Mar 2021 (EDMA's telecom entry); CDAO Linda Avery joined EDM Council board 2022 | Fortune Most Admired #1 in telecom 2025; ACSI 75, only carrier to improve 2025; 35× J.D. Power network quality. Negative: $46.9M FCC location-data fine (upheld Sept 2025) | Clean — no mortgage or consumer-lending business | Verizon Cloud (consumer storage, unlimited tier), Identity Secure (consumer ID protection), Verizon ID (enterprise identity-proofing app), DBIR security franchise | "Verizon Data Vault" scans naturally beside Verizon Cloud / Digital Secure product family |
| **Mastercard** | Not found on EDM Council member list (363 members, partial view) — unconfirmed | Kantar BrandZ #7 most valuable US brand; payments brands rank high on trust | Near-clean — not a lender, but "credit card brand" adjacency in a mortgage flow could confuse | Identity Attribute Verification (2024), mDL + digital-wallet identity push (2025), EUDI Wallet advisor | "Mastercard Data Vault" strong, but reads payments-first |
| **Snowflake** | Deepest: co-created CDMC, first platform independently CDMC-assessed (KPMG, 2021) | None — no consumer brand; 2024 customer-credential campaign (AT&T, Ticketmaster; ~160 customer environments) is its only consumer-facing headline | Clean — pure infrastructure | Governed data cloud is the actual product; CDMC control mapping published | Fails as front brand; excellent as "powered by" |
| **Microsoft / Google** | CDMC workgroup participants (major cloud providers); not on visible member list as such | Microsoft #3 Axios Harris 2025 (80.7) — but "big techs" score *lowest* of all counterparty types for data custody (BIS: median 2/7, >⅓ no trust at all, 12% high trust) | Clean | Entra Verified ID = production W3C VC issuance/verification (did:web, status lists) — our natural VC infra | "Microsoft Data Vault" triggers the big-tech data-trust penalty; keep infrastructural |
| **US bank trust arm** (BofA, Citi, Amex confirmed EDMA members) | Confirmed members | Highest category trust: traditional FIs median 5/7 (BIS); banks trusted 6:1 over next industry for fraud protection (ABA/Morning Consult 2025) | **Fails** — BofA/Citi originate mortgages; a lender custodying the borrower's pod is the conflict the demo exists to remove. Note BIS: minority respondents trust FIs significantly less (4.2 vs 4.7) — bad look for mortgage-fairness framing | Strong custody heritage | "Chase Data Vault" credible but conflicted |
| **IoM fiduciary cluster** (Equiom, IQ-EQ) | Via IoM Data Asset Foundations partnership with EDM Association (legislation has Royal Assent) | None in US; offshore-fiduciary optics are wrong for a US consumer | Clean | Real fiduciary custody, but of *enterprise* data assets | Fails consumer test; reserve for a later "data as asset" enterprise chapter |

## Why Verizon wins

1. **Only candidate passing all four constraints at once.** Banks fail neutrality, Mastercard fails (unconfirmed) membership, Snowflake and IoM fail consumer brand, hyperscalers fail consumer data-trust.
2. **The role map already commits to it** — R3 primary, R9 secondary: "host citizen/consumer Pods at carrier scale and pilot a consumer data wallet." Carrier economics genuinely fit R3: recurring billing, retail stores for identity proofing, existing $10/mo Identity Secure attach motion.
3. **Product adjacency makes the demo credible as a real business.** Verizon already sells consumer data custody (Verizon Cloud) and identity protection (Identity Secure), and operates an enterprise identity-proofing app (Verizon ID). "Verizon Data Vault — your mortgage data, in your pod, on Verizon" is a plausible SKU, not a costume.
4. **The trust liability is the demo's thesis.** Verizon's FCC location-data fine is a real blemish — and the Solid architecture is precisely the remediation: the borrower's data sits in *their* pod under *their* access control; Verizon custodies but cannot monetise. The showcase narrative should name this inversion explicitly ("the carrier that was fined for selling your location now can't see your loan file"). This turns the weakest fact into the strongest slide.

### Two-layer story (front brand + infrastructure)

| Layer | Org | Role in demo |
|---|---|---|
| Consumer front | **Verizon** | "Verizon Data Vault" pod + wallet UI; identity proofing at retail; account recovery |
| Governed custody | **Snowflake** | "Powered by Snowflake" — CDMC-governed storage/audit plane; speaks EDMA's own framework back to the membership |
| VC rails | **Microsoft Entra Verified ID** | Issuance/verification of W3C VCs (employer, bank, IRS-transcript credentials) — production API, did:web, revocation status lists |

This gives three EDMA-relevant logos on one screen without any of them touching the loan decision.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Verizon location-data fine surfaces in partner-phase press | Lead with it: Solid pod = structural answer; user-held keys + WAC/ACP audit trail |
| Telecom not measured in BIS trust ranking; unknown whether consumers accept a carrier as data custodian | Demo copy leans on Verizon's *existing* paid custody products (Cloud, Identity Secure) as precedent |
| Verizon board seat (Avery) may have lapsed since 2022 | Partner phase re-verifies current EDMA engagement before outreach |
| Snowflake "powered-by" invites 2024 breach questions | Position pods as customer-key-held (the 2024 campaign was customer credential hygiene, not platform compromise — CSA analysis); MFA/passkey-by-default in the demo |
| README disclaimer discipline | All apps carry the existing INTERNAL/DEMO disclaimer; no real Verizon marks beyond nominal branding |

## Sources

- EDM Council — Verizon joins (telecom entry, Mar 2021): https://www.prnewswire.com/news-releases/edm-council-enters-telecom-industry-as-verizon-joins-as-member-301244227.html
- EDM Council — Linda Avery (Verizon CDAO) board addition: https://edmcouncil.org/announcement/edm-council-board-of-directors-addition-linda-avery-verizon-chief-data-analytics-officer/
- EDM Council member list (363 members; BofA/Citi/Amex confirmed, Mastercard/Google/Verizon not on visible page — paginated): https://edmcouncil.org/page/listofmembersreview
- FCC fines Verizon $46M for location-data violations (Apr 2024): https://www.fcc.gov/document/fcc-fines-verizon-46m-location-data-violations
- CNBC — Second Circuit upholds $46.9M fine (Sept 2025): https://www.cnbc.com/2025/09/10/us-court-upholds-verizon-46point9-million-fine-over-location-data.html
- BIS Bulletin 42 — Whom do consumers trust with their data? (FIs median 5/7; big techs median 2/7, >⅓ no trust; minority-respondent FI gap 4.2 vs 4.7): https://www.bis.org/publ/bisbull42.pdf
- ABA / Morning Consult — banks trusted 6:1 over next industry for fraud protection (Oct 2025): https://www.aba.com/about-us/press-room/press-releases/fall-2025-morning-consult-survey-results-consumer-satisfaction
- ACSI Telecommunications Study 2025 (Verizon 75, only brand to improve): https://theacsi.org/news-and-resources/press-releases/2025/05/20/press-release-telecommunications-cell-phone-and-smartwatch-study-2025/
- Fortune Most Admired 2025 — Verizon #1 in telecom: https://www.telecomreviewamericas.com/articles/telecom-operators/verizon-named-telecoms-most-admired-company-bold-innovation-and-customer-centric-vision
- Verizon J.D. Power network-quality record: https://www.verizon.com/about/news/verizon-remains-americas-best-wireless-network
- Verizon Cloud (consumer storage): https://www.verizon.com/solutions-and-services/verizon-cloud/
- Verizon Identity Secure (consumer identity protection): https://www.verizon.com/support/identity-secure-faqs/
- Verizon ID service guide (enterprise identity proofing app): https://www.verizon.com/business/service_guide/reg/verizon_id.pdf
- Axios Harris Poll 100, 2025 (Microsoft #3, 80.7): https://www.axios.com/2025/05/20/axios-harris-poll-company-reputation-ranking
- Snowflake first CDMC assessment (KPMG, 14 key controls): https://edmcouncil.org/announcement/snowflake-achieves-first-cloud-data-management-capabilities-cdmc-assessment/
- CDMC workgroup composition (100+ companies incl. major cloud providers): https://www.businesswire.com/news/home/20210914005433/en/Snowflake-Achieves-First-Cloud-Data-Management-Capabilities-CDMC-Assessment
- Snowflake 2024 customer-credential campaign (UNC5537; ~160 customers; AT&T, Ticketmaster): https://en.wikipedia.org/wiki/Snowflake_data_breach and https://cloudsecurityalliance.org/blog/2025/05/07/unpacking-the-2024-snowflake-data-breach
- CNBC — AT&T breach via Snowflake account (Jul 2024): https://www.cnbc.com/2024/07/12/snowflake-shares-slip-after-att-says-hackers-accessed-data.html
- Mastercard Identity Attribute Verification launch (Oct 2024): https://www.biometricupdate.com/202410/mastercard-launches-identity-attribute-verification-based-on-payment-card-data
- Mastercard mDL / digital-wallet identity push (Aug 2025): https://www.biometricupdate.com/202508/mastercard-wants-everyone-to-have-a-digital-wallet-and-mdl-to-make-id-like-payments
- Kantar BrandZ — Mastercard #7: https://www.kantar.com/north-america/inspiration/brands/faster-stronger-smarter-outpacing-its-competitors-mastercard-rises-to-7
- Microsoft Entra Verified ID (W3C VC issuance/verification, did:web, status lists): https://learn.microsoft.com/en-us/entra/verified-id/
- EDM Association × Isle of Man — Data Asset Foundations initiative: https://edmcouncil.org/data-asset-foundations-initiative/
- IoM Data Asset Foundations legislation Royal Assent: https://www.financeisleofman.com/news/isle-of-man-data-asset-foundations-legislation-receives-royal-assent/
