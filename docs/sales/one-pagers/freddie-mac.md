# Freddie Mac — the automated-underwriting seat

> **DRAFT — internal to EDMA's engagement team.** Pending legal review (sm-5q2);
> not cleared for external circulation.

*Concept demonstration — all data simulated; every app is framed role-first ("modelled on X",
never "by X"); no affiliation or endorsement implied; nothing here or in the demo is an offer
or solicitation of credit (decision 0002, R1). The demo uses no GSE product identifiers (R3) —
sanctioned naming is a partner-phase gate.*

## Where you sit in the ecosystem

Every conforming loan file passes through a GSE automated underwriting system, whose findings
drive the documentation conditions the rest of the process chases [19][21]. Your programmes
already accept consumer-permissioned digital income and asset data — the Mastercard
open-banking arm (Finicity) was the first service provider (org-map role 2). And your own 2024
Cost to Originate Study quantifies both the problem and the payoff: ~$11,600 average cost to
originate, with automation saving $165–$388 and 2.2–12.36 hours per loan and up to 8 days of
cycle time [34].

## Your seat in the demo

`apps/gse` (live: <https://solid-mortgage-underwriting.vercel.app>) — presented as "automated underwriting service (AUS) — the Freddie Mac role".
Scene 3: instant findings over a loan file the borrower granted, prefilled from pod-held
credentials. Scene 4: the pre-close freshness check finds the employment credential lapsed
(verbal VOE ≤ 10 business days before note, B3-3.1-04 [10]); one click re-issues it through
the existing grant and the AUS re-runs — re-issue, not re-collection.

> SCREENSHOT-TODO: `apps/gse` findings screen after the scene-4 re-run.

## The proposition

You are one of two Data Excellence Program founders on this map — the deepest EDMA engagement
of any organisation here (org-map). Your validation programmes already proved the mechanism:
verified digital data cuts up to 12 days [20] and $165–$388 per loan [34]. The showcase
generalises that arithmetic beyond GSE intake to every party in the chain, with the borrower
holding the data — expressed in FIBO, the ontology EDMA/OMG stewards, mapped field-by-field to
MISMO v3.4 (org-map role 9). The role-map's sponsor pitch applies verbatim: put your name on
the sector's defining Solid pilot and steer it to your priorities (role-map sheet, R11).

## What building it for real entails

- Accept pod-mediated, credential-based verification reports into AUS intake alongside today's
  vendor reports — a pilot-scoped intake path, not a platform rewrite.
- Co-define freshness and status semantics with issuers (short-validity re-issue for recency;
  status lists for revocation only — decision 0007).
- Dual-AUS realism: Fannie Mae is the natural second app if the partner phase wants both GSEs
  (org-map role 2).
- Written consent for sanctioned product naming and branding, replacing the demo's
  deliberately generic "AUS" treatment (decision 0002, R3).

## The CDMC hook

The partner phase anchors pod custody and data governance to CDMC — the assessment framework
your data organisation already works within as a DEP founder. "Consumer-permissioned data,
held to CDMC-grade governance" is the sentence for the risk committee (master narrative §3).

## The ask + next step

Co-lead the partner phase — DEP founders are the first conversations (SPEC §12). **Next
step:** a working session with the CoP conveners to walk scenes 3–4 and scope a pilot in which
one loan file's income and asset verifications arrive as pod-held credentials.

---

*Sources: bracketed numbers = `docs/research/mortgage-process.md` source list; org-map =
`docs/research/org-map.md`; role-map sheet = EDMA member/role directory (internal, 4 Jun 2026).*
