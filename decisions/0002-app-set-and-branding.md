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
