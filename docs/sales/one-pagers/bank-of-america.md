# Bank of America — the originating-lender seat

> **DRAFT — internal to EDMA's engagement team.** Pending legal review (sm-5q2);
> not cleared for external circulation.

*Concept demonstration — all data simulated; every app is framed role-first ("modelled on X",
never "by X"); no affiliation or endorsement implied; nothing here or in the demo is an offer
or solicitation of credit; all rates shown in the demo are illustrative figures (decision
0002, R1/R5).*

## Where you sit in the ecosystem

The largest EDMA-member retail mortgage bank — $4.6B Q1 2025 originations (org-map role 1).
Your Digital Mortgage Experience already tells the demo's story from the lender side: 81% of
your mortgage applications are initiated digitally, prefilled from data on file (org-map).
What no lender can do today is prefill from verified data the borrower *brings* — that is the
gap the pod closes.

## Your seat in the demo

`apps/lender-boa` (live: <https://solid-mortgage-lender-a.vercel.app>) — the full origination portal (decision 0002). Scene 2: verify a
zero-knowledge pre-qual proof (income ≥ $7,000/month AND score ≥ 620) without seeing the
values. Scene 3: the borrower grants scoped pod access; the URLA (Form 1003) prefills from
pod-held credentials and the Loan Estimate lands back in the borrower's pod inside TRID's
3-business-day window [4][5]. Scene 4: the pre-close freshness check resolves by issuer
re-issue through the existing grant, not re-collection [10].

> SCREENSHOT-TODO: `apps/lender-boa` URLA prefill view (scene 3) and LE-delivered timeline
> card.

## The proposition

You already sell prefill-from-data-on-file as a differentiator (org-map). The pod makes that
experience deeper and cheaper: verifications arrive as already-issued credentials instead of
ordered-and-awaited vendor reports — the loop that drives the $6,900-vs-$16,500 per-loan cost
spread between top- and bottom-quartile lenders [34] and the 41–44-day close [37]. The
role-map's demand-side pitch (R8/R9 family): cut data-sharing friction and differentiate on
trust with consent-governed customer data (role-map sheet). The showcase gives you that story
on a standards substrate — FIBO + MISMO v3.4 bindings — rather than another vendor lock-in.

## What building it for real entails

- A pod-grant intake path into your loan origination stack: scoped, revocable read access to
  named credential resources, alongside existing vendor-report channels.
- URLA/ULAD field mapping via the CoP's FIBO↔MISMO v3.4 binding table (org-map role 9) — the
  mapping work is a CoP deliverable, not yours alone.
- Retention design: granted access replaces unmanaged copies; you still retain what regulation
  requires — the honest claim is scoped, enumerable, revocable *authorizations* (master
  narrative §6).
- ZK pre-qualification productionisation is gated on external audit of the proving stack
  (research-grade today, stated on screen).

## The CDMC hook

"Consumer-permissioned data, held to CDMC-grade governance" (master narrative §3) — the
conformance frame your data office already uses, applied to borrower-permissioned intake. The
partner phase makes that assessable, not aspirational.

## The ask + next step

Take the flagship-lender seat in the partner phase (SPEC §12 sequences you immediately after
the two DEP founders). **Next step:** a demo walkthrough with your digital-mortgage and data
office leads — scenes 2–4 run in under seven minutes — then scope a prefill-portability pilot
on one loan product.

---

*Sources: bracketed numbers = `docs/research/mortgage-process.md` source list; org-map =
`docs/research/org-map.md`; role-map sheet = EDMA member/role directory (internal, 4 Jun 2026).*
