# USAA — the homeowners-insurance seat

> **DRAFT — internal to EDMA's engagement team.** Pending legal review (sm-5q2);
> not cleared for external circulation.

*Concept demonstration — all data simulated; every app is framed role-first ("modelled on X",
never "by X"); no affiliation or endorsement implied; nothing here or in the demo is an offer
or solicitation of credit (decision 0002, R1).*

## Where you sit in the ecosystem

Both sides of the closing table. You are the #3 US homeowners insurer (6.9% share, $11.9B
direct premiums written 2024) *and* a top-20 bank mortgage originator ($875M Q1 2025) — the
one EDMA member that lives the lender's checklist and the carrier's binder request at once
(org-map role 12). Proof of homeowners insurance is commonly required about 3 business days
before closing [23][24] — one more document chased by phone and PDF today.

## Your seat in the demo

*(Live demo front door: <https://solid-mortgage.vercel.app> — every deployed app links from the
tour shell.)*

Honestly stated: the insurance-binder credential is a named partner-phase extension, not one
of the eight demo apps (SPEC §2, product-phase extensions; decision 0002). What the demo
already shows is the mechanics your seat would reuse: scene 4's pre-close freshness check —
lapsed credential, one-click issuer re-issue through an existing grant — is exactly the
binder-before-closing pattern [23][24]. Your membership-restricted customer base is irrelevant
for a demo (org-map role 12); your lender side is portrayed generically by the two lender
apps.

> SCREENSHOT-TODO: `apps/closing` pre-close checklist (scene 5 run-up) — the beat the
> insurance credential would slot into.

## The proposition

The role-map's demand-side pitch (R8/R9 family): cut data-sharing friction and differentiate
on trust with consent-governed customer data (role-map sheet). Sharpened: no other member sees
the duplicated-document problem from both directions — as the lender chasing the binder and
the carrier issuing it. An insurance-binder credential issued once into the member's pod
serves the lender, the servicer's escrow, and every refinance without another round of
paperwork (mortgage-process §3: binder copies today sit with carrier, lender, and servicer
escrow).

## What building it for real entails

- An insurance-binder credential issuer: binder/declaration data signed into the
  policyholder's pod, replacing the emailed PDF.
- Freshness and renewal semantics — annual renewal maps naturally onto credential re-issue;
  status lists cover mid-term cancellation (decision 0007).
- Optional second seat: a USAA-modelled lender variant reusing the origination-portal pattern
  the BofA-modelled app demonstrates.
- Field mapping into the CoP's FIBO↔MISMO v3.4 binding table so the binder credential is
  readable by any conformant lender or servicer (org-map role 9).

## The CDMC hook

One organisation, two regulated data estates (insurance + banking). CDMC-anchored pod
governance (master narrative §3) gives both sides a single conformance story for
consumer-permissioned data — assessed once, used by both business lines.

## The ask + next step

Join the partner phase to add the insurance seat — the first-listed product-phase extension
(SPEC §2). **Next step:** a demo walkthrough focused on scenes 4–5, then scope the
insurance-binder credential pilot with your insurance product and data teams.

---

*Sources: bracketed numbers = `docs/research/mortgage-process.md` source list; org-map =
`docs/research/org-map.md`; role-map sheet = EDMA member/role directory (internal, 4 Jun 2026).*
