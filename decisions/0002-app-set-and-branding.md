# 0002 — Definitive app set + organisation branding

**Status:** accepted (autonomous, 2026-07-15) — resolves research-gaps C6/C13/Q6/Q11
**Inputs:** docs/research/org-map.md, mortgage-process.md (5-scene demo), showcase-patterns.md

## App list (8 Vercel projects)

| App | Modelled on | EDMA member | Role in the journey |
|---|---|---|---|
| `apps/tour` | EDMA Solid CoP (own branding) | convener | Pitch front door: ecosystem map, 5-scene guided journey, launcher, demo identity card; includes the unbranded **Examiner View** chapter (CFPB lens, explicitly not-affiliated) |
| `apps/wallet` | **Verizon** ("Data Vault") | yes | Borrower pod manager: profile, credential wallet, access grants, consent-receipt ledger, revocation (decision 0006) |
| `apps/verifications` | **The Work Number (Equifax)** / **Mastercard Finicity** / **Equifax** | no / yes¹ / no | One app, three distinctly-branded issuer flows: employment+income VC, asset VC, credit-score VC |
| `apps/lender-boa` | **Bank of America** | yes | Full origination portal: ZK pre-qual verify, application with pod prefill, LE/CD timeline, loan-officer pipeline |
| `apps/lender-53` | **Fifth Third Bank** | yes (DEP Founder) | Thin competing pre-qual/rate-quote surface — the second verifier in the ZK shopping scene |
| `apps/gse` | **Freddie Mac** (LPA-style AUS) | yes (DEP Founder) | Automated underwriting over the granted loan file: decision + findings |
| `apps/property` | **Cotality** + **First American** | no / no | Two branded flows: appraisal VC; title-clear VC |
| `apps/closing` | **Wolters Kluwer (eOriginal)** + **Truist** (servicer) | yes / yes | eClose (CD timeline, eNote beat) + servicing transfer: borrower grants the Truist-modelled servicer, revokes the lender |

¹ Mastercard's membership is from the internal sheet, publicly unconfirmed (C4) — re-verify before outreach copy.

The org-map's full 12-role table remains the **product-phase mapping**; this list is the
scene-driven build subset. Servicer = Truist (member; keeps all-member servicing story and avoids
casting a non-member breach-victim brand). Second lender = Fifth Third over Truist because DEP
Founder status makes it the outreach co-lead with Freddie Mac.

## Branding rules (Q11 — ship illustrative branding now)

Role-first framing everywhere: "modelled on **X**", never "by X". Name + palette-inspired
theming only — **no logos or trade dress**. Every app: unremovable shared ConceptDemoBanner
(e2e-asserted), `simulated: true` watermark on every API payload, production `noindex` +
robots.txt, cookie-persisted consent interstitial. No password gate by default (skip the
$150/mo Vercel feature) unless an org objects. Per-org brand sign-off is a partner-phase gate.
Microsoft, if mentioned in copy, is "CDMC workgroup participant", not member (C12).

## Addendum — sm-39 Reg N / UDAAP / trademark optics review (autonomous, 2026-07-15)

Grounding + exact copy in `docs/research/regn-optics.md`. Rules R1–R8 tighten the above
(prior wording superseded where they conflict):

- **R1** Banner copy v2: adds source-negation ("this is not {Org}") and offer-negation
  ("not an offer of credit"); adjacent to the brand header; every route incl. 404/500.
- **R2** Bright-line insignia ban: never render "Member FDIC"/FDIC marks, deposit-insurance
  claims, Equal Housing Lender/Opportunity logos, HUD/FHA/VA/agency seals, or NMLS IDs /
  license numbers (real or invented). Lint + e2e enforced. (12 U.S.C. § 1828(a)(4) binds
  *any person* — not merely optics.)
- **R3** No GSE product marks on public surfaces: `apps/gse` UI says "automated underwriting
  service (AUS) — the Freddie Mac role", never "Loan Product Advisor"/"LPA" (Freddie ToU
  requires written consent for product identifiers).
- **R4** Neutral deploy hostnames: no org marks/abbreviations in Vercel slugs or any public
  hostname (repo dir names may stay); no custom domains containing marks, ever.
- **R5** Illustrative-figure tag adjacent to every rendered rate/fee/payment/decision
  ("6.875% — illustrative figure, not an offer"), shared component so it travels into
  screenshots.
- **R6** Link-preview disclaimers: `<title>` suffix "— Concept Demo (not {Org})" + meta/OG
  description leading with the non-affiliation line.
- **R7** Demo-locked forms: prefilled demo personas; no free-entry SSN/DOB-format fields;
  "do not enter real information" hint on editable fields; no page styled as an org's login.
- **R8** Interstitial copy v2 (regn-optics §4.2) replaces prior wording; adds "not built by
  {Org}", "no offer or solicitation", "do not enter real personal or financial information".
