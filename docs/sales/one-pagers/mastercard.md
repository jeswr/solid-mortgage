# Mastercard (Open Banking / Finicity) — the asset-verification seat

> **Verify before use.** Mastercard's EDMA membership comes from the internal role-map sheet
> (4 Jun 2026); a public edmcouncil.org search could not independently confirm it
> (research-gaps C4). Re-verify with EDMA before this page goes out or any member-based claim
> is made in conversation.

*Concept demonstration — all data simulated; every app is framed role-first ("modelled on X",
never "by X"); no affiliation or endorsement implied; nothing here or in the demo is an offer
or solicitation of credit (decision 0002, R1).*

## Where you sit in the ecosystem

Asset verification / open banking: borrowers permission read access to their bank accounts and
the resulting report feeds the GSEs' validation programmes for rep-and-warranty relief
[8][9][11]. Your open-banking arm (Finicity) was the first service provider for Freddie Mac's
borrower-capacity assessment programmes and is also a report supplier in Fannie Mae's
validation programme — the only open-banking player with both (sheet-listed) member status and
dual-GSE acceptance (org-map role 5).

## Your seat in the demo

`apps/verifications` — the Finicity-modelled flow is one of three distinctly branded issuer
flows in scene 1: it issues the **asset credential** into the borrower's pod, alongside the
employment/income and credit-score issuers. Bank-sourced open banking and employer-sourced
payroll verification are deliberately distinct issuers in the demo (org-map role 4).

> SCREENSHOT-TODO: `apps/verifications` Finicity-modelled asset-credential issuance flow
> (scene 1).

## The proposition

The role-map sheet's pitch for you: *"Build consent-first payment and identity experiences on
Solid"* (role-map sheet, R9 — consent-driven payments/identity aligns with pods). Sharpened
for this showcase: your consumer-permissioning rails are the closest thing in production to
pod grants — issuing the verification's result as a borrower-held, reusable credential is a
product extension of what Finicity already does for the GSE programmes, not a pivot. Whoever
issues the asset credential sits in every mortgage the borrower shops.

## What building it for real entails

- A credential-issuance endpoint on top of existing open-banking aggregation: the same
  verification, delivered additionally as a signed credential into the borrower's pod.
- Freshness and revocation infrastructure: short-validity re-issue for recency, status lists
  for revocation (decision 0007) — asset statements must be ≤ 4 months old on the note date
  [12].
- Presentation-protocol alignment: the demo's verifier rail is shaped for OID4VP-style
  migration (decision 0012), matching where open-banking identity work is heading.
- A GSE-acceptance path for pod-mediated reports, building on your existing dual-GSE supplier
  positions (org-map role 5).

## The CDMC hook

Conformance is the trust mark: the CoP anchors pod custody and consent governance to CDMC
(role-map sheet, read-me). For a network whose product *is* trusted permissioning, a
CDMC-anchored conformance badge on consent rails is a marketable asset across EDMA's
member base.

## The ask + next step

**Step zero: confirm the membership status with EDMA (research-gaps C4).** Then: a demo
walkthrough with the open-banking product team — scene 1 (issuance) plus scene 4 (re-issue
freshness) — and scope an asset-credential issuance pilot beside the existing GSE report
rails.

---

*Sources: bracketed numbers = `docs/research/mortgage-process.md` source list; org-map =
`docs/research/org-map.md`; role-map sheet = EDMA member/role directory (internal, 4 Jun 2026).*
