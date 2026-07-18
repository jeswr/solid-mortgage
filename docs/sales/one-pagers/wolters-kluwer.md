# Wolters Kluwer (eOriginal) — the eClosing seat

> **DRAFT — internal to EDMA's engagement team.** Pending legal review (sm-5q2);
> not cleared for external circulation.

*Concept demonstration — all data simulated; every app is framed role-first ("modelled on X",
never "by X"); no affiliation or endorsement implied; nothing here or in the demo is an offer
or solicitation of credit (decision 0002, R1).*

## Where you sit in the ecosystem

E-closing, eNote and eVault: through the eOriginal acquisition (2020) you power MERS eNote
Solutions and historically managed the overwhelming majority of eNotes on the MERS eRegistry —
~92% through January 2022 (the share today is unverified; org-map role 8, research-gaps §3) —
plus the Ginnie Mae digital-collateral eVault. The digital-closing rails are already paying:
eNotes are 12.86% of MERS registrations (Oct 2025, 3M+ total) and eNote loans fund up to
5 days faster, saving over $200/loan [31][32].

## Your seat in the demo

`apps/closing` (live: <https://solid-mortgage-closing.vercel.app>) — the eClose flow modelled on eOriginal, scene 5: the Closing Disclosure
arrives in the borrower's pod at least 3 business days before closing (TRID [5][25]), the
borrower eSigns, and the eNote beat references "the eNote registry" generically (the demo
carries no registry-operator branding — org-map, gaps). The notarisation session itself is a
partner slot: the org-map pairs you with a RON platform such as Proof or a MISMO-certified
notary product (org-map role 8).

> SCREENSHOT-TODO: `apps/closing` eSign ceremony with the CD-delivered timeline (scene 5).

## The proposition

The org-map calls you the under-recognised member catch of the whole exercise (org-map
role 8): you are the EDMA member already operating the industry's digital-original custody
layer. The showcase adds the borrower's side of that story — the closing package lands in a
pod the borrower controls, with a consent receipt for every access grant. You proved
digital originals win on speed and cost [31][32]; the pod extends the same custody discipline
to the borrower's copy of the file.

## What building it for real entails

- Pod delivery of the borrower-facing closing package (CD, signed copies, receipts) beside the
  existing eVault flow — the authoritative-copy eNote stays in the eVault; the pod holds the
  borrower's copies and consent receipts.
- A RON partner for the notarisation session (Proof or a MISMO-certified notary product —
  org-map role 8).
- Alignment through MISMO's open workgroups, whose e-closing and RON standards you already
  build against (org-map roles 8–9).
- Freshness/status semantics for closing-package credentials (decision 0007).

## The CDMC hook

The role-map directory tags Wolters Kluwer Tier 1 supply-side with an assurance/implementation
role family (role-map sheet, sheet 4) — for a compliance-solutions house, the CoP's
CDMC-anchored conformance scheme is adjacent product territory, not just a governance
checkbox: help define what certified pod custody of closing artifacts looks like.

## The ask + next step

Take the eClosing seat in the partner phase (SPEC §12). **Next step:** a scene-5 walkthrough
with the eOriginal product team — CD-to-pod delivery, eSign, and the servicing-transfer
handoff — then scope a pilot adding pod delivery of the borrower package to an existing eClose
flow.

---

*Sources: bracketed numbers = `docs/research/mortgage-process.md` source list; org-map =
`docs/research/org-map.md`; role-map sheet = EDMA member/role directory (internal, 4 Jun 2026).*
