# Truist — the servicer seat

> **DRAFT — internal to EDMA's engagement team.** Pending legal review (sm-5q2);
> not cleared for external circulation.

*Concept demonstration — all data simulated; every app is framed role-first ("modelled on X",
never "by X"); no affiliation or endorsement implied; nothing here or in the demo is an offer
or solicitation of credit (decision 0002, R1).*

## Where you sit in the ecosystem

A major bank originator ($4.0B Q1 2025 — org-map role 1 alternates) cast in the demo's
servicer seat, keeping the servicing story inside the EDMA member base (decision 0002). The
servicing file is the worst copy-sprawl artifact in the whole process: "a full copy of most of
the above", passed to **every successive servicer** (mortgage-process §3). RESPA governs the
handoff — goodbye letter ≥ 15 days before the effective date, hello letter ≤ 15 days after,
60-day payment grace (Reg X §1024.33) [30].

## Your seat in the demo

`apps/closing` (live: <https://solid-mortgage-closing.vercel.app>) — the servicing-transfer beat of scene 5: the loan is sold, the Truist-modelled
servicer **requests** access to the loan file, the borrower approves the grant, revokes the
original lender, and reads the consent-receipt ledger — every grant and revocation, receipted.
It is the payoff screen of the entire demo: the borrower enumerates exactly who has been
granted access to what, something no participant in today's process can do (mortgage-process
§3; master narrative, scene 5).

> SCREENSHOT-TODO: `apps/closing` servicing-transfer approval + the wallet ledger view it
> triggers (scene 5).

## The proposition

Today a servicing transfer means boarding a copied file; every successive servicer inherits
the copy and the liability that travels with it (mortgage-process §3). In the demo the
transfer is a *grant handoff*: the new servicer gets scoped, receipted access; the old
lender's grant is revoked on screen. The role-map's demand-side pitch (R8/R9 family) applies:
cut data-sharing friction, differentiate on trust (role-map sheet). For the servicing
business specifically: the party that receives loans by transfer benefits most from files
whose provenance and access history arrive machine-readable.

## What building it for real entails

- Servicing-transfer choreography over pod grants — honestly scoped: real transfers operate
  under servicing authority and do not require borrower consent [30], so the production design
  is authority-based access transfer with borrower *notification* and receipts, and boarding
  never blocks on borrower action (the demo's approval beat dramatizes visibility, not a
  consent requirement).
- Honest retention design: regulated servicing records you must keep are still kept — the
  claim is enumerable, revocable *authorizations*, not zero copies (master narrative §6).
- RESPA notice automation (goodbye/hello letters, §1024.33 [30]) as a product-phase extension
  (SPEC §2).
- Optional second seat: a lender variant — you are also a top-five member bank by origination
  volume (org-map role 1 alternates).

## The CDMC hook

Servicing custody is a data-governance problem EDMA's own framework was built for: the partner
phase anchors transfer custody and consent governance to CDMC (master narrative §3) — a
conformance story your data office can assess with tools it already uses.

## The ask + next step

Take the servicer seat in the partner phase. **Next step:** a scene-5 walkthrough with your
servicing and digital teams — transfer request, grant, revocation, ledger — then scope a pilot
modelling one servicing transfer as a grant handoff.

---

*Sources: bracketed numbers = `docs/research/mortgage-process.md` source list; org-map =
`docs/research/org-map.md`; role-map sheet = EDMA member/role directory (internal, 4 Jun 2026).*
