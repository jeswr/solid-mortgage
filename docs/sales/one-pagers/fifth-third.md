# Fifth Third Bank — the competing-lender seat

*Concept demonstration — all data simulated; every app is framed role-first ("modelled on X",
never "by X"); no affiliation or endorsement implied; nothing here or in the demo is an offer
or solicitation of credit; all quoted rates in the demo are illustrative figures (decision
0002, R1/R5).*

## Where you sit in the ecosystem

A retail mortgage lender ($1.4B Q1 2025 originations, org-map role 1 alternates) — and, with
Freddie Mac, one of only two Data Excellence Program founders on this map, the deepest EDMA
engagement of any candidate bank (org-map). Pre-qualification today requires borrowers to hand
income and asset detail to every lender they shop [1] — a structural over-disclosure the demo
removes.

## Your seat in the demo

`apps/lender-53` — the thin competing pre-qualification surface in scene 2. The borrower
proves **income ≥ $7,000/month AND credit score ≥ 620** with a zero-knowledge proof; the app
modelled on Fifth Third verifies the proof and returns an illustrative rate quote without ever
seeing the underlying numbers. No credit pull; if the borrower walks away, there is no income
or credit data for the lender to retain (master narrative, scene 2).

> SCREENSHOT-TODO: `apps/lender-53` pre-qual result card (scene 2, proof verified, quote
> returned).

## The proposition

Your demo seat is deliberately the smallest in the map — a thin verify-and-quote surface, the
cheapest possible on-ramp to the ecosystem. The role-map's customer-facing pitch is the
sharpened version: differentiate on trust — give customers real consent control ahead of the
regulation that will demand it (role-map sheet, R9). As a DEP founder you are sequenced as an
outreach co-lead with Freddie Mac (SPEC §12; decision 0002): the two founders open the partner
phase from both sides of the AUS relationship.

## What building it for real entails

- A production pre-qual endpoint that verifies threshold proofs — gated on external audit of
  the proving stack, which is research-grade today and says so on screen (master narrative §6).
- Wiring verified-threshold pre-quals into your real pricing engine (demo quotes are
  illustrative figures only, R5).
- Compliance review of no-pull pre-qualification against your existing pre-qual/pre-approval
  policies [1].
- Optional phase 2: grow the thin surface into a full origination portal — the pattern the
  BofA-modelled app demonstrates.

## The CDMC hook

As a DEP founder your data organisation already lives in EDMA's frameworks. The partner phase
anchors consumer-permissioned intake to CDMC-grade governance (master narrative §3) — a
first-mover position among regional banks on a conformance story your risk function already
speaks.

## The ask + next step

Co-lead the partner phase with Freddie Mac (DEP-founders-first — SPEC §12). **Next step:** a
10-minute demo walkthrough with your digital-mortgage / innovation leads, then scope the
pre-qual pilot: one verified-threshold quote surface, no borrower PII retained.

---

*Sources: bracketed numbers = `docs/research/mortgage-process.md` source list; org-map =
`docs/research/org-map.md`; role-map sheet = EDMA member/role directory (internal, 4 Jun 2026).*
