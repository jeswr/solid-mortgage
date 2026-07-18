# The numbers — quantified-benefits one-sheet

> **DRAFT — internal to EDMA's engagement team.** Pending legal review (sm-5q2);
> not cleared for external circulation.

One page for EDMA engagement conversations. Every figure is cited to `docs/research/`
(bracketed numbers = the source list in `docs/research/mortgage-process.md`; `org-map` =
`docs/research/org-map.md`). No figure appears here that is not in the research.

## What a mortgage costs today

| Figure | Value | Source |
|---|---|---|
| Average cost to originate a loan (Q3 2023) | **~$11,600** — up ~$3,000 vs Q4 2020 | mortgage-process [34] |
| Top-quartile vs bottom-quartile lender cost/loan | **$6,900 vs $16,500** | mortgage-process [34] |
| Cost/loan, 2025 (MBA): top 20% vs bottom 20%; Q3 2025 avg | **$10,074 vs $12,603; $11,109** | mortgage-process [35][36] |
| Average time from offer to close (ICE, 2024–2025) | **41–44 days** | mortgage-process [37] |

## What verified digital data already saves — the GSEs' own numbers

| Figure | Value | Source |
|---|---|---|
| Days cut by Fannie Mae's DU validation service | **up to 12 days** | mortgage-process [20] |
| Freddie Mac LPA automation, per loan | **$165–$388 saved, 2.2–12.36 hrs, up to 8 days cycle time** | mortgage-process [34] |
| Digital-tool users vs non-users (Freddie study) | **~$1,500 (14%) cheaper (~$10,800 vs ~$12,300), ~5 days faster (~34 vs ~39 days)** | mortgage-process [34] |
| eNote loans vs paper | **fund up to 5 days faster, save >$200/loan** | mortgage-process [31][32] |
| eNote share of MERS registrations (Oct 2025) | **12.86%; 3M+ eNotes total** | mortgage-process [31] |

The showcase extends this proven arithmetic beyond the GSE programmes to every party in the
chain — and gives the borrower the controls.

## What duplication costs today (the demo removes it)

| Figure | Value | Source |
|---|---|---|
| Tri-merge credit report | **~$200 per pull** | mortgage-process [6] |
| IRS tax transcript (4506-C/IVES) | **$4 per transcript, per pull** | mortgage-process [13] |
| Same facts collected at | **pre-approval, application, underwriting, and again pre-close** | mortgage-process §4 [10][22] |
| Freshness windows forcing re-verification | **credit docs ≤ 4 months old [12]; verbal VOE ≤ 10 business days before note [10]; credit refresh from first pull to closing [22]** | mortgage-process §4 |

**Demo answer:** a credential is issued once into the borrower's pod; freshness is a one-click
re-issue through an existing grant — re-collection eliminated (SPEC scene 4).

## Who holds the borrower's data — before and after

| | Today | In the demo |
|---|---|---|
| Copies | **12 artifact classes, each held by 2–4 parties** (lender, AUS/GSE, vendor, agent…); the servicing file — "a full copy of most of the above" — passes to **every successive servicer** | **Source data lives once, in the borrower's pod**; parties get scoped, revocable, receipted access — durable copies only where retention rules require them |
| Borrower visibility | Cannot enumerate who holds what | Grant/revocation receipt ledger, on screen (app-level, decision 0006) |
| Source | mortgage-process §3 | SPEC §2 scene 5 |

## Why copies are a liability

| Figure | Value | Source |
|---|---|---|
| Mr. Cooper breach (2023) | **14.7M people** | mortgage-process [38] |
| First American exposure (2019) | **885M title documents; $1M NYDFS penalty** | mortgage-process [39] |
| Mortgage-sector breach aggregate, Oct 2023–Oct 2025 | **47M+ Americans** (secondary source — prefer the two above when precision matters) | mortgage-process [40], research-gaps §3 |

## The rails already exist

| Figure | Value | Source |
|---|---|---|
| The Work Number (instant employment/income verification) | **~5M employer contributors, 823M+ records** | mortgage-process [7] |
| BofA mortgage applications initiated digitally | **81%** | org-map, role 1 |
| Value-chain roles in the demo held by EDMA members | **7 of 12** — incl. two Data Excellence Program founders (Freddie Mac, Fifth Third) | org-map |
| Regulatory clocks the demo hits on screen | **Loan Estimate ≤ 3 business days [4][5]; Closing Disclosure ≥ 3 business days before closing [5][25]; servicing-transfer notices 15 days / 60-day grace [30]** | mortgage-process §1 |

---

*Concept demonstration — data simulated, organisations shown role-first ("modelled on X"), no
affiliation or endorsement implied. Caveats that travel with these numbers: Mastercard's EDMA
membership is publicly unconfirmed; the eOriginal ~92% eNote share is dated Jan 2022; Microsoft
is a CDMC workgroup participant, not a member (research-gaps §3). Refresh due after the apps
ship (sales PLAN item 2).*
