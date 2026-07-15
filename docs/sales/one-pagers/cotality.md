# Cotality — the appraisal / valuation seat

*Concept demonstration — all data simulated; every app is framed role-first ("modelled on X",
never "by X"); no affiliation or endorsement implied; nothing here or in the demo is an offer
or solicitation of credit (decision 0002, R1). Cotality is not an EDMA member — this is an
external approach (org-map).*

## Where you sit in the ecosystem

The largest property data and analytics provider — the CLIP property identifier, AVMs, and
appraisal workflow tools; rebranded from CoreLogic in March 2025 (org-map role 6). The
appraisal itself is mid-transition: the single dynamic URAR under UAD 3.6 entered broad
production 26 Jan 2026 and becomes mandatory for GSE loans on 2 Nov 2026 [14][15], and Reg B
requires the borrower's copy promptly on completion or 3 business days before consummation
[16] — a delivery obligation the pod is built for.

## Your seat in the demo

`apps/property` — the Cotality-modelled flow issues the **appraisal-value credential** that
feeds the underwriting file (decision 0002). Honestly scoped: appraisal internals are a
product-phase extension, not one of the five scripted scenes — in the 10-minute cut your
credential is referenced from the loan file rather than played on stage (SPEC §2). The seat
exists in the build today; the spotlight grows in the partner phase.

> SCREENSHOT-TODO: `apps/property` appraisal-value credential issuance flow.

## The proposition

Appraisal has no EDMA member — the role is an open seat on the map (org-map, gaps). Two
angles, both yours: issue the valuation as a borrower-held credential — giving the borrower a
durable copy the moment it exists, *supporting* the creditor's Reg B delivery obligation [16]
(delivery timing and evidence of receipt remain the creditor's compliance duty, not the
credential's) — and put CLIP forward as the property
identifier the CoP's bindings resolve to — the role-map's identifier pitch, "make your
identifier the default in every conformant pod" (role-map sheet, R5), applied to property
rather than organisations.

## What building it for real entails

- An appraisal-value credential issuer over UAD 3.6 data — the new dynamic URAR is already
  structured data [14], the natural signing input.
- CLIP proposed into the CoP's FIBO↔MISMO v3.4 binding table as the property-identifier
  column (org-map roles 6/9).
- Freshness/status semantics for valuations (decision 0007) — appraisal validity windows are
  underwriting conditions like any other document age rule [12].
- Scope decision: credential-only issuer first; full appraisal-workflow integration (AMC
  ordering, borrower delivery) as the later phase (SPEC §2, product-phase extensions).

## The CDMC hook

For a data-and-analytics business approaching EDMA from outside, CDMC-anchored conformance is
the introduction: property-data custody and issuance assessed against the framework EDMA's 371
member organisations already use (role-map sheet, read-me) — and a seat at the table where the
sector's property-identifier binding gets decided.

## The ask + next step

Take the open appraisal seat in the partner phase (SPEC §12, external approaches). **Next
step:** a demo walkthrough with the property-data / mortgage-solutions team — the property app
plus scene 3's underwriting file — then scope an appraisal-value credential pilot on UAD 3.6
data.

---

*Sources: bracketed numbers = `docs/research/mortgage-process.md` source list; org-map =
`docs/research/org-map.md`; role-map sheet = EDMA member/role directory (internal, 4 Jun 2026).*
