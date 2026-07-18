# Equifax — the credit-bureau + income-verification seats (two seats, one approach)

> **DRAFT — internal to EDMA's engagement team.** Pending legal review (sm-5q2);
> not cleared for external circulation.

*Concept demonstration — all data simulated; every app is framed role-first ("modelled on X",
never "by X"); no affiliation or endorsement implied; nothing here or in the demo is an offer
or solicitation of credit (decision 0002, R1). Equifax is not an EDMA member — this is an
external approach (org-map).*

## Where you sit in the ecosystem

Two roles at once. As the most mortgage-integrated credit bureau, you are an authorized report
supplier in Fannie Mae's validation programme (org-map role 3); the tri-merge credit report
(~$200 per pull, middle-of-three scoring) is stage 6 of every application [6]. Through
Equifax Workforce Solutions, The Work Number is the dominant instant income/employment
verifier: 823M+ employer-sourced records from ~5M employer contributors [7], with
mortgage-specific products such as "All Employers Within 60 Months" (org-map role 4) — and ADP
employment verifications are fulfilled through it (org-map).

## Your seat in the demo

`apps/verifications` (live: <https://solid-mortgage-verifications.vercel.app>) — two of its three distinctly branded issuer flows are yours (decision
0002): the flow modelled on The Work Number issues the **employment+income credential**, and
the Equifax-modelled flow issues the **credit-score credential**, both into the borrower's pod
(scene 1). Scene 4's freshness beat is also yours: the employment credential lapses against
the 10-business-day verbal-VOE rule [10] and is re-issued in one click through the existing
grant — issuer re-issue, not re-collection (decision 0007).

> SCREENSHOT-TODO: `apps/verifications` — The Work Number-modelled issuance flow (scene 1)
> and the scene-4 re-issue confirmation.

## The proposition

One approach covers two seats (org-map role 3). The demo's freshness model keeps the issuer at
the centre: recency comes from short-validity credentials re-issued *by you* through an
existing grant (decision 0007), so every downstream refresh — pre-approval, underwriting,
pre-close [10][22] — is an issuer event, with the credential reusable by every party the
borrower authorises. Your verification businesses already sell instant digital attestation
[7]; the pod makes each attestation borrower-held and chain-wide instead of single-lender.

## What building it for real entails

- Credential issuance endpoints on top of the existing verification products — same data,
  additionally delivered as signed credentials into the borrower's pod.
- Freshness/status infrastructure: short-validity re-issue for recency, status lists for
  revocation (decision 0007), honouring the industry's freshness windows (credit docs
  ≤ 4 months [12]; verbal VOE ≤ 10 business days [10]).
- Distinct branding for the two seats — the demo already models bureau and workforce flows
  separately (decision 0002).
- A GSE-acceptance path for pod-mediated reports, extending your existing authorized-supplier
  position (org-map role 3).

## The CDMC hook

For a non-member, CDMC-anchored conformance is the door into EDMA's community: issuer
infrastructure assessed against the framework 371 member organisations already use (role-map
sheet, read-me) turns "trust us" into a certificate the lender's data office recognises.

## The ask + next step

Join the partner phase as the double issuer — the external-approach list's first name
(SPEC §12). **Next step:** a demo walkthrough of scenes 1 and 4 with the mortgage-verticals
product teams, then scope an issuance pilot for one credential type (employment+income is the
demo's showpiece).

---

*Sources: bracketed numbers = `docs/research/mortgage-process.md` source list; org-map =
`docs/research/org-map.md`; role-map sheet = EDMA member/role directory (internal, 4 Jun 2026).*
