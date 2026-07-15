<!-- AUTHORED-BY Claude Fable 5 -->

# Reg N / MAP Rule / UDAAP — regulatory optics of real-org-branded demo surfaces (sm-39)

**Date:** 2026-07-15 · **Bead:** sm-39 · **Inputs:** decisions/0002-app-set-and-branding.md,
docs/research/showcase-patterns.md §3
**Question:** the showcase ships apps that *look like* lender/GSE/CRA portals branded
"modelled on Bank of America / Fifth Third / Freddie Mac / Equifax…". What do US
mortgage-advertising and adjacent rules actually restrict, do they reach a non-commercial
concept demo, and what must the disclaimers say?

**Verdict up front:** none of the mortgage-specific advertising regimes (Reg N, UDAAP,
Reg Z advertising, SAFE Act/state licensing) applies to the demo as designed, because every
one of them triggers on a *commercial communication about, or the offering of, a real
consumer credit product* — and the demo offers nothing. The two live exposures are
**(a) trademark / false-endorsement law (Lanham Act §43(a))**, where the practical risk is a
brand-enforcement C&D, and **(b) a small set of bright-line prohibitions that apply to *any
person* regardless of commerce — chiefly FDIC-insurance insignia (12 U.S.C. § 1828(a)(4))**.
Both are fully mitigable by disclaimer design + a short list of "never render" items
(§4–§5). The rules do, however, tell us *exactly what the disclaimers must negate and how
prominent they must be*, and decision 0002's current banner copy under-covers this (§5).

---

## 1. What the rules restrict, and to whom they apply

### 1.1 Regulation N — the MAP Rule (12 CFR Part 1014)

Verified against the rule text ([12 CFR 1014.1](https://www.law.cornell.edu/cfr/text/12/1014.1),
[.2](https://www.law.cornell.edu/cfr/text/12/1014.2),
[.3](https://www.law.cornell.edu/cfr/text/12/1014.3)) and the FTC's final-rule preamble
([76 FR 43826, Jul 22 2011](https://www.govinfo.gov/content/pkg/FR-2011-07-22/pdf/2011-18605.pdf)).

The operative prohibition (§ 1014.3, intro):

> "It is a violation of this part for any person to make any material misrepresentation,
> expressly or by implication, in any commercial communication, regarding any term of any
> mortgage credit product."

Three definitional gates, all of which must be passed before the rule applies (§ 1014.2):

| Gate | Rule text | Does the demo pass it? |
|---|---|---|
| **Person** | "any individual, group, unincorporated association, limited or general partnership, corporation, or other business entity" | Yes — everyone is a "person". |
| **Commercial communication** | "any written or oral statement, illustration, or depiction … that is designed to effect a sale or create interest in purchasing goods or services" (any medium, incl. the internet) | Partially — see analysis below. |
| **Mortgage credit product** | "any form of credit that is secured by real property or a dwelling and that is **offered or extended to a consumer** primarily for personal, family, or household purposes" | **No.** Nothing is offered or extended to any consumer; every rate, fee, LE/CD and decision is simulated. |

Scope (§ 1014.1): "This part applies to persons over which the Federal Trade Commission has
jurisdiction under the Federal Trade Commission Act." The preamble confirms banks, thrifts,
federal credit unions, bona fide non-profits and common carriers are outside it: "The Final
Rule does not cover the practices of entities that are excluded from the FTC's jurisdiction"
(76 FR 43827), and lists who *is* covered: "Mortgage lenders, mortgage brokers, mortgage
servicers, and real estate brokers advertise and market mortgage products. In addition,
advertising agencies, home builders, lead generators, rate aggregators, and others also may
market and advertise mortgage products to consumers" (76 FR 43828). Note the non-profit
carve-out is not absolute: FTC jurisdiction covers entities "organized to carry on business
for their own profit **or that of their members**" (15 U.S.C. § 44, quoted at 76 FR 43827
n.15) — an EDMA-style consortium pitching a commercial product phase should not lean on
non-profit status.

**Is a concept demo a "commercial communication"?** Honest answer: the showcase is not pure
non-commercial speech. It is a partnership pitch designed to create interest in a product
phase — that is "designed to … create interest in purchasing goods or services" in the
ordinary sense. The robust defence is not "we are non-commercial"; it is that **no
misrepresentation is made "regarding any term of any mortgage credit product"** because (a)
no mortgage credit product is offered or extended to any consumer, and (b) with prominent
disclaimers + simulated watermarks, no representation is *material* to a *reasonable
consumer* (the deception elements, §1.3). Conclusion: **outside Reg N as designed; the
disclaimers are what keep it outside.**

**Why Reg N still matters to us:** two of its enumerated misrepresentation categories are
precisely the confusion vectors our branding creates, and regulators treat them as the core
harms of lender-lookalike communications:

> **(n)** "The association of the mortgage credit product or any provider of such product
> with any other person or program, including but not limited to misrepresentations that:
> (1) The provider is, or is affiliated with, any governmental entity or other
> organization; or (2) The product is or relates to a government benefit, or is endorsed,
> sponsored by, or affiliated with any government or other program"
>
> **(o)** "The source of any commercial communication, including but not limited to
> misrepresentations that a commercial communication is made by or on behalf of the
> consumer's current mortgage lender or servicer"

An app that renders as a Bank of America-palette origination portal is an (n)+(o)-shaped
artefact. The disclaimer must therefore negate **source and affiliation explicitly**, not
just say "demo".

### 1.2 UDAAP — Dodd-Frank §§ 1031/1036

Verified against [12 U.S.C. § 5481(6)](https://www.law.cornell.edu/uscode/text/12/5481),
[§ 5531(a)](https://www.law.cornell.edu/uscode/text/12/5531), and the
[CFPB UDAAP exam manual](https://files.consumerfinance.gov/f/documents/cfpb_unfair-deceptive-abusive-acts-practices-udaaps_procedures.pdf).

Who it reaches: "covered person" = "any person that engages in offering or providing a
consumer financial product or service" (§ 5481(6)), plus their "service providers"; the
Bureau may act "to prevent a covered person or service provider from committing or engaging
in an unfair, deceptive, or abusive act or practice" (§ 5531(a)). **A concept demo offering
no consumer financial product or service is not a covered person; CFPB UDAAP does not
apply.** (This flips the moment a partner-phase pilot touches real consumers.)

What it teaches us anyway — the CFPB deception test (exam manual, UDAAP 5):

> "A representation, omission, act or practice is deceptive when (1) [it] misleads or is
> likely to mislead the consumer; (2) The consumer's interpretation … is reasonable under
> the circumstances; and (3) The misleading representation, omission, act, or practice is
> material."

and its disclaimer-design corollaries, which directly constrain our banner/interstitial
mechanics:

- "Written disclosures may be insufficient to correct a misleading statement …
  oral or fine print disclosures … may be insufficient to cure a misleading headline or a
  prominent written representation. Similarly, a deceptive act or practice may not be cured
  by subsequent truthful disclosures." (UDAAP 5) — *the brand header is our "headline"; the
  corrective text must sit at the same prominence tier, on every page, before interaction.*
- The FTC "four Ps": is the statement **prominent**, **presented** understandably, **placed**
  where consumers look, in close **proximity** to the claim it qualifies? (UDAAP 5–6)
- FTC final-rule preamble, same point: "A disclaimer or qualifying statement may correct a
  misleading impression, but only if it is sufficiently clear and prominent to convey the
  qualifying information effectively, i.e., it is both noticed and understood by consumers …
  'accurate information in the text may not remedy a false headline'" (76 FR 43828).

### 1.3 FTC Act § 5 (UDAP)

"Unfair or deceptive acts or practices in or affecting commerce, are hereby declared
unlawful" ([15 U.S.C. § 45(a)(1)](https://www.law.cornell.edu/uscode/text/15/45)); banks,
thrifts and federal credit unions are excluded from FTC jurisdiction (§ 45(a)(2)), and FTC
jurisdiction over "corporations" reaches only entities organized for their own profit or
that of their members (§ 44). Same deception elements as §1.2 (the CFPB test is borrowed
from the FTC's 1983 Deception Policy Statement). Reaches "any person… in or affecting
commerce" — broader than UDAAP's covered-person gate, but the deception elements
(reasonable-consumer + materiality) are defeated by the same prominent-disclaimer design.
State "mini-FTC-act" UDAP statutes mirror this and often add private rights of action —
another reason the disclaimers are non-optional even with no regulator interested.

### 1.4 TILA / Reg Z advertising (12 CFR 1026.24)

"Advertisement means a commercial message in any medium that promotes, directly or
indirectly, a credit transaction" ([12 CFR 1026.2(a)(2)](https://www.law.cornell.edu/cfr/text/12/1026.2)).
If a page were an advertisement: it "shall state only those terms that actually are or will
be arranged or offered by the creditor" (§ 1026.24(a) — fake rates would per se fail), and
stating a payment amount, payment count/period, downpayment or finance-charge amount is a
"triggering term" requiring APR + full-terms disclosures (§ 1026.24(d),
[Cornell](https://www.law.cornell.edu/cfr/text/12/1026.24)). **The demo promotes no credit
transaction, so it is not a Reg Z advertisement** — but this is the regime that makes
"illustrative figures" hygiene mandatory: any screenshot of our fake pricing that migrates
into promotional collateral must carry its "illustrative — not an offer" tag with it
(§5, rule R5).

### 1.5 SAFE Act / NMLS and state mortgage-advertising rules

- Federal trigger: a "loan originator" is an individual who "takes a residential mortgage
  loan application; and offers or negotiates terms of a residential mortgage loan **for
  compensation or gain**" ([12 U.S.C. § 5102(4)(A)](https://www.law.cornell.edu/uscode/text/12/5102)).
  Reg Z's parallel definition adds the advertising limb: a person who "in expectation of
  direct or indirect compensation or other monetary gain … through advertising or other
  means of communication represents to the public that such person can or will perform any
  of these activities" ([12 CFR 1026.36(a)(1)](https://www.law.cornell.edu/cfr/text/12/1026.36)).
  The demo takes no applications, negotiates nothing, expects no compensation from any
  consumer transaction, and represents (with disclaimers) that it *cannot* perform these
  activities. **No licensing trigger.**
- State advertising rules attach to licensees' commercial solicitation, e.g. Texas:
  "'advertisement' [is] a commercial message in any medium that promotes, directly or
  indirectly, a residential mortgage loan transaction or is otherwise designed to solicit
  residential mortgage loan origination business", and licensee ads must display "the
  mortgage company's name and NMLS ID"
  ([7 TAC § 56.203](https://www.law.cornell.edu/regulations/texas/7-Tex-Admin-Code-SS-56-203));
  California prohibits licensee advertising that is "false, misleading, or deceptive"
  ([Cal. Fin. Code § 22161](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=FIN&sectionNum=22161)).
  **Implication for us is inverted:** NMLS IDs and license numbers are *licensee
  credentials*. Rendering a real org's NMLS ID would deepen the impersonation; rendering an
  invented one would simulate a regulatory credential. **Never display NMLS IDs or license
  numbers, real or invented** (§5, rule R2).

### 1.6 Bright-line insignia rules that apply to ANY person (not just lenders)

- **FDIC**: "No person may represent or imply that any deposit liability, obligation,
  certificate, or share is insured or guaranteed by the Corporation" and no person may use
  "Federal Deposit", "FDIC" etc. in advertising/solicitation materials to imply insurance
  ([12 U.S.C. § 1828(a)(4)](https://www.law.cornell.edu/uscode/text/12/1828)); implemented
  by [12 CFR Part 328 subpart B](https://www.law.cornell.edu/cfr/text/12/328.102) ("No
  person may knowingly make false or misleading representations about deposit insurance").
  [18 U.S.C. § 709](https://www.law.cornell.edu/uscode/text/18/709) adds criminal exposure
  for misusing FDIC/Federal Home Loan Bank words or falsely representing insured status
  (checked: § 709 does *not* name Fannie/Freddie). A demo "Bank of America"-styled portal
  showing **"Member FDIC"** would be a representation to *any* viewer that deposits are
  insured — this is the one place a demo can violate a real statute with no commerce
  analysis at all. **Absolute ban.**
- Same logic, weaker statutes, for **Equal Housing Lender / Equal Housing Opportunity
  logos, HUD/FHA/VA marks** (FHA-approved lenders must use HUD-registered business names
  and FHA/fair-housing logos under HUD rules, 76 FR 43829 n.53 — these are credentials of
  approved entities, not decorations). Ban alongside FDIC insignia.

### 1.7 Trademark: Lanham Act § 43(a) + GSE brand policies

The real-world enforcement channel for "your demo looks like our portal" is not a
regulator, it is the org's brand-protection team. Basis:
[15 U.S.C. § 1125(a)(1)](https://www.law.cornell.edu/uscode/text/15/1125): liability for
any person whose use in commerce of a name/symbol "is likely to cause confusion … as to
the affiliation, connection, or association of such person with another person, or as to
the origin, sponsorship, or approval of his or her goods, services, or commercial
activities by another person" — the false-endorsement tort our branding flirts with.
Nominative fair use (per the INTA summary already in showcase-patterns §3) is the defence:
use only as much of the mark as needed, and **no suggestion of sponsorship or endorsement**.
Role-first framing ("modelled on X", no logos/trade dress) + explicit non-affiliation
disclaimers is exactly this posture.

GSE-specific (both verified):

- **Freddie Mac** [Terms of Use](https://www.freddiemac.com/terms): "You may not use Freddie
  Mac's name, logo, designs, **product identifiers**, slogans, trademarks, or service marks
  in any advertising, publicity or promotion, or in any other commercial manner without the
  prior written consent of Freddie Mac." A partnership-pitch showcase is "publicity or
  promotion" on its face. "Loan Product Advisor"/"LPA" is a product identifier —
  **do not put it on any public surface**; say "automated underwriting service (AUS)".
- **Fannie Mae** [Trademarks](https://www.fanniemae.com/about-us/trademarks): "commercial
  use of any of the trademarks by any third-party is subject to approval by Fannie Mae's
  Corporate Communications and Legal departments" (and may require a licence). Same
  treatment if Fannie is ever cast.

Trademark law's nominative-use defence likely beats a terms-of-use claim for pure
referential naming — but Freddie Mac is a DEP-Founder outreach target: **ask, don't
litigate-in-theory** (needs:user bead, §6).

---

## 2. Risk assessment for our branded surfaces

Overall: **regulatory risk LOW** (no covered communication/product, no covered person);
**brand-enforcement risk LOW-to-MODERATE** (driven by visibility and by how "portal-like"
each surface is); **one bright line** (insignia, §1.6). Per surface:

| Surface (decision 0002) | Brand cast | Specific risk | Rating & mitigation |
|---|---|---|---|
| `apps/lender-boa` (BoA), `apps/lender-53` (Fifth Third) | Full origination portal / rate-quote surface | Highest confusion potential: portal chrome + rates + application flow is the § 1014.3(n)/(o) + § 1125(a) pattern; also the *phishing-lookalike* pattern (a BoA-styled page with SSN-shaped inputs is what Safe Browsing and BoA's brand-monitoring vendors hunt) | **Moderate → Low** with: banner v2 + interstitial (§4), no login page styled as the bank's, demo-locked forms (no free SSN/DOB entry), noindex, neutral deploy slugs (no "boa" in any public hostname) |
| `apps/gse` (Freddie Mac) | AUS decision + findings | Freddie ToU bars promotional use of name/product identifiers without written consent; "LPA" is a product identifier | **Moderate → Low**: role-first UI ("AUS — the Freddie Mac role"), never "Loan Product Advisor"/"LPA" in UI; written consent is a partner-phase gate (bead) |
| `apps/verifications` (The Work Number / Finicity / Equifax) | Issuer flows | "The Work Number" is an Equifax product mark; Mastercard brand enforcement is famously strict (we use no logos, which removes most of it) | **Low**: names-only nominative use + banner v2; Mastercard membership itself still unconfirmed (C4, decision 0002 fn) |
| `apps/closing` (Wolters Kluwer + Truist), `apps/wallet` (Verizon), `apps/property` (Cotality + First American) | eClose/servicing, pod manager, appraisal/title | Same false-endorsement shape, lower confusion stakes (not consumer-facing credit surfaces) | **Low**: banner v2 + interstitial |
| `apps/tour` (own branding) | Pitch front door | Carries the Examiner View (CFPB lens) — must not imply CFPB endorsement (§ 1014.3(n)(1) shape: affiliation with "any governmental entity") | **Low**: keep the existing "explicitly not-affiliated" framing; never render CFPB logo/seal (18 U.S.C. § 709 family protects agency insignia) |
| All apps | — | "Member FDIC", EHL/EHO logos, NMLS IDs, license numbers, HUD/FHA/VA marks | **Bright line — never render** (§1.6); enforce by lint + e2e |

Two cross-cutting notes:

1. **The pitch is commercial.** Do not defend any surface as "non-commercial speech" in
   copy or in outreach; defend it as *truthful and prominently disclaimed*. That defence
   holds in every regime above; the non-commercial one doesn't.
2. **Purpose drift is the real hazard.** Every analysis above flips when a real partner
   pilot touches a real consumer: the partner is a covered person (UDAAP), pages become
   advertisements (Reg Z/Reg N), state licensing applies to whoever operates the flow.
   Partner phase must re-run this analysis with counsel (needs:user bead).

---

## 3. What the current decision-0002 disclaimer under-covers

Current banner: "Concept demonstration for the EDMA Solid Community of Practice. Not
affiliated with, or endorsed by, {org}. Data is simulated."

Gaps against §1:

| Gap | Why it matters |
|---|---|
| Doesn't negate the **offer** ("nothing here is an offer of credit / no products available") | Reg N gate 3, Reg Z § 1026.24(a): affiliation-negation alone leaves "is this a real rate?" open |
| Doesn't negate **source** ("not built or operated by {org}") | § 1014.3(o) is about who the communication is *from*, not just endorsement |
| No "**do not enter real personal information**" | The phishing-lookalike optics of branded portals with forms; also demo-integrity rule 7 in AGENTS.md |
| No prominence spec tied to the brand header | UDAAP manual: fine print can't cure a prominent headline; the org-palette header *is* the headline |
| Nothing at the link-preview layer (`<title>`, meta description) | noindex stops crawlers, not shared links; the out-of-context Slack/Teams preview is the likeliest confused first impression |

---

## 4. Recommended disclaimer copy (EXACT)

`{Org}` = the modelled organisation; `{role}` = the journey role ("mortgage lender",
"automated underwriting service", …). Copy is shared from `packages/ui` so wording is
identical across apps and e2e-assertable.

### 4.1 Banner — persistent, every route (incl. 404/500), not dismissible, rendered by the shared AppShell adjacent to (directly below) the brand header

> **Concept demo — this is not {Org}.** A research prototype by the EDMA Solid Community of
> Practice, modelled on the {role} role. All data is simulated. Nothing here is an offer of
> credit. **[About this demo]**

Mobile-compressed variant (same element, `sm:` breakpoint):

> **Concept demo — not {Org}.** Simulated data. Not an offer of credit. **[About]**

### 4.2 Interstitial — first visit per app, cookie-persisted, affirmative continue (blocks interaction until acknowledged)

> ## You're entering a concept demonstration
>
> This site is a research prototype built by the **EDMA Solid Community of Practice** to
> show how a US mortgage journey could work on Solid personal data stores.
>
> It is modelled on the role **{Org}** plays in that journey. It was **not built by {Org}**
> and is **not affiliated with, sponsored by, or endorsed by {Org}**. The {Org} name is
> used only to identify that market role.
>
> **Everything here is simulated.** Rates, fees, credit decisions, documents, and personas
> are fictitious and illustrative. Nothing on this site is an offer or solicitation of
> credit or of any financial product or service.
>
> **Do not enter real personal or financial information.** Use the demo personas provided.
>
> **[ I understand — enter the demo ]**  ·  [Learn more about the project]

("Learn more" → `apps/tour`.)

### 4.3 Footer legal line — every page

> Concept demonstration · EDMA Solid Community of Practice · Not affiliated with, sponsored
> by, or endorsed by {Org} · All data simulated · Not an offer of credit · Do not enter
> real personal information

### 4.4 Inline figure tag — adjacent to every rendered rate/fee/payment/decision (four-Ps proximity)

> `6.875% — illustrative figure, not an offer`

(Shared `<IllustrativeFigure>` component in `packages/ui`; the tag travels with the number
into any screenshot.)

### 4.5 Link-preview layer

- `<title>` suffix on every branded app: `… — Concept Demo (not {Org})`
- Meta/OG description first sentence: `Concept demonstration by the EDMA Solid Community of
  Practice — not affiliated with {Org}. All data simulated.`
- Existing: production `X-Robots-Tag: noindex` + robots.txt + `"simulated": true` on every
  API payload (keep).

---

## 5. Changes to decision 0002's branding rules

Applied as an addendum to `decisions/0002-app-set-and-branding.md` in this PR
(Jesse veto per convention):

- **R1 — Banner copy v2** (§4.1) replaces the 0002 banner text: adds source-negation
  ("this is not {Org}") and offer-negation ("not an offer of credit"), placed adjacent to
  the brand header, present on every route including error pages.
- **R2 — Regulatory-insignia ban (bright line):** never render "Member FDIC"/FDIC marks,
  deposit-insurance claims, Equal Housing Lender/Opportunity logos, HUD/FHA/VA/Ginnie
  marks, CFPB or other agency seals, or NMLS IDs / state license numbers (real or
  invented). Enforce with a lint script (grep apps/ for `FDIC|NMLS|Equal Housing|Member
  FDIC` etc.) + shared e2e assertion.
- **R3 — GSE product marks:** public UI for `apps/gse` says "automated underwriting service
  (AUS) — the Freddie Mac role"; never "Loan Product Advisor" or "LPA" on a public surface
  (Freddie ToU: product identifiers need written consent). "LPA-style" stays fine in
  internal docs.
- **R4 — Neutral deploy hostnames:** Vercel project slugs / public hostnames must not
  contain org marks or recognisable abbreviations (no `boa`, no `fifththird`/`53`-as-5/3
  branding in hostnames); repo directory names (`apps/lender-boa`) may stay (private repo).
  No custom domains containing any org mark, ever.
- **R5 — Illustrative-figure tags** (§4.4) on every money/rate/decision figure.
- **R6 — Link-preview disclaimers** (§4.5): title suffix + meta description.
- **R7 — Demo-locked forms:** application flows prefill demo personas; no free-entry
  SSN/DOB-format fields (masked, disabled, or picker-driven); any editable field carries
  the "do not enter real information" hint. No page styled as an org's *login* page.
- **R8 — Interstitial copy v2** (§4.2) replaces the 0002 interstitial wording;
  cookie-persisted per app; e2e-asserted alongside the banner.
- Unchanged from 0002: role-first framing, no logos/trade dress, `simulated: true`
  watermarks, noindex+robots, no password gate by default, per-org sign-off as
  partner-phase gate.

---

## 6. Items needing human legal review before partner phase (filed as needs:user beads)

| Item | Why human-gated |
|---|---|
| US counsel review of all branded surfaces (Lanham § 43(a) nominative-use posture, GSE ToU exposure, state UDAP) before circulation beyond the EDMA CoP | Legal judgement + engagement of counsel |
| Freddie Mac written consent for name use (and decision whether the GSE app keeps the Freddie name or falls back to unbranded "GSE role") before any outreach collateral uses it | Freddie ToU requires *prior written consent*; also an outreach-relationship call |
| Per-org brand sign-off tracker (BoA, Fifth Third, Verizon, Equifax/The Work Number, Mastercard/Finicity, Truist, Wolters Kluwer, Cotality, First American) before partner outreach | Decision 0002 already gates this; needs a human owner and sequencing with EDMA outreach |
| Partner-phase regulatory re-scope: the moment any pilot touches a real consumer, Reg N / UDAAP / Reg Z / SAFE-Act licensing analyses all flip — counsel must re-run them for the pilot design | Cannot be resolved by demo-side mitigations |

Engineering follow-up (not user-gated): implement §4–§5 (banner v2, interstitial v2,
insignia lint, illustrative tags, neutral slugs, demo-locked forms) — filed as a
discovered-from:sm-39 bead on `surface:packages/ui`.

---

## 7. Sources

All load-bearing claims verified against the linked primary text on 2026-07-15.

- [12 CFR 1014.1](https://www.law.cornell.edu/cfr/text/12/1014.1) · [1014.2](https://www.law.cornell.edu/cfr/text/12/1014.2) · [1014.3](https://www.law.cornell.edu/cfr/text/12/1014.3) (Reg N)
- FTC MAP final rule preamble, [76 FR 43826 (Jul 22, 2011)](https://www.govinfo.gov/content/pkg/FR-2011-07-22/pdf/2011-18605.pdf) — covered entities, FTC-jurisdiction exclusions, deception + disclaimer-prominence discussion
- [12 U.S.C. § 5481](https://www.law.cornell.edu/uscode/text/12/5481) (covered person / service provider) · [§ 5531](https://www.law.cornell.edu/uscode/text/12/5531) (UDAAP authority)
- [CFPB UDAAP examination procedures (v.2, Oct 2012)](https://files.consumerfinance.gov/f/documents/cfpb_unfair-deceptive-abusive-acts-practices-udaaps_procedures.pdf) — deception test, four Ps, disclosure-cure limits
- [15 U.S.C. § 45](https://www.law.cornell.edu/uscode/text/15/45) (FTC Act § 5) · [15 U.S.C. § 1125](https://www.law.cornell.edu/uscode/text/15/1125) (Lanham § 43(a))
- [12 CFR 1026.2(a)(2)](https://www.law.cornell.edu/cfr/text/12/1026.2) · [1026.24](https://www.law.cornell.edu/cfr/text/12/1026.24) · [1026.36(a)(1)](https://www.law.cornell.edu/cfr/text/12/1026.36) (Reg Z)
- [12 U.S.C. § 5102](https://www.law.cornell.edu/uscode/text/12/5102) (SAFE Act)
- [7 TAC § 56.203](https://www.law.cornell.edu/regulations/texas/7-Tex-Admin-Code-SS-56-203) (Texas mortgage-company advertising) · [Cal. Fin. Code § 22161](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=FIN&sectionNum=22161)
- [12 U.S.C. § 1828(a)(4)](https://www.law.cornell.edu/uscode/text/12/1828) · [12 CFR 328.102](https://www.law.cornell.edu/cfr/text/12/328.102) · [18 U.S.C. § 709](https://www.law.cornell.edu/uscode/text/18/709) (insured-status / name misuse)
- [Freddie Mac Terms of Use](https://www.freddiemac.com/terms) · [Fannie Mae Trademarks](https://www.fanniemae.com/about-us/trademarks)
