# Master pitch narrative — the Solid Mortgage Showcase

For EDMA's engagement/sales team. This is the story you tell, the demo you walk through, and
the ask you make. Every number is cited to `docs/research/` (bracketed numbers = the source
list in `mortgage-process.md`); the companion one-page of figures is
[`benefits-one-sheet.md`](benefits-one-sheet.md). Nothing here claims more than the research
supports — the honest-limits appendix at the end is part of the pitch, not a disclaimer to
hide.

**Glossary (the only four technical terms you need):**

- **Pod** — a personal online data store the borrower owns and controls. Think "the
  borrower's own filing cabinet, with a lock they hold".
- **Verifiable credential (VC)** — a digitally signed attestation ("Equifax says this
  person's score is X") that anyone can check without phoning the issuer.
- **Zero-knowledge proof (ZK)** — a way to prove a fact *about* hidden data ("income is at
  least $7,000/month") without revealing the data itself.
- **CDMC** — Cloud Data Management Capabilities, EDMA's own data-management assessment
  framework.

---

## 1. The pitch in one paragraph

A US mortgage today costs about $11,600 to originate and takes 41–44 days to close, largely
because the same facts about the borrower — income, assets, credit — are collected, verified,
copied, and re-verified by over a dozen parties, none of whom the borrower can see or control.
The showcase rebuilds that journey on Solid: the borrower's verified data lives in a pod they
control, verifications arrive once as reusable verifiable credentials, and every party gets
scoped, revocable, receipted access instead of yet another unmanaged copy. Each application in the demo is
modelled on a real organisation's seat in the value chain — most of them EDMA members — so
every member watching sees their own role, working, on screen.

## 2. Why now — the quantified pain

Four numbers carry the story. All are from `docs/research/mortgage-process.md` §4.

**It costs too much.** Average cost to originate a loan: ~$11,600 (Q3 2023), up ~$3,000 since
Q4 2020; top-quartile lenders spend ~$6,900 while bottom-quartile lenders spend ~$16,500
[34]. That spread is mostly fulfillment and verification labour — exactly the work reusable
verified data removes.

**It takes too long.** 41–44 days from offer to close (ICE, 2024–2025) [37]. The delay is not
underwriting judgement; it is ordering, waiting for, and re-checking verifications.

**The industry already knows data fixes this.** The GSEs' own programmes prove the mechanism:
Fannie Mae's DU validation service cuts up to 12 days off the process [20]; Freddie Mac's LPA
automation saves 2.2–12.36 hours and $165–$388 per loan, and up to 8 days of cycle time [34].
The showcase generalises what the GSEs built for themselves to every party in the chain — and
hands the borrower the keys.

**Copies are a liability.** Every verification today is a vendor-held report about the
borrower, copied into every downstream party's systems (`mortgage-process.md` §3). The result:
the Mr. Cooper breach exposed 14.7 million people (2023) [38]; First American exposed 885
million title documents (2019, $1M NYDFS penalty) [39]. Data that is accessed in place rather
than copied by default means far fewer standing copies to breach — and every authorization
that was ever granted is on the record.

And the borrower — the person all this data is about — holds none of it, cannot see who has
what, and re-supplies the same documents at pre-approval, application, underwriting, and again
before closing [10][22].

## 3. What the Solid CoP brings

The EDMA Solid Community of Practice is not selling a vendor product. It brings three things
only a standards community can:

1. **A working, standards-grounded demonstration.** Eight applications covering the whole
   journey, each modelled on a real organisation's role — seven of the twelve value-chain
   roles land on EDMA members (`org-map.md`). The verifier apps are 1:1 with real
   GSE-approved supplier roles (Freddie AIM / Fannie DU validation programmes), so the demo
   is not a hypothetical ecosystem: it is the existing one, re-plumbed.

2. **The bindings deliverable.** Pod data is expressed in FIBO — EDMA/OMG's own finance
   ontology, whose LOAN domain already covers mortgages and mortgage origination — and mapped
   field-by-field to MISMO v3.4, the operative industry data standard behind the URLA/ULAD
   application dataset (`org-map.md` role 9). That **FIBO↔MISMO binding table** is the CoP's
   standards artifact: reusable by every member whether or not they build an app.

3. **A conformance story in EDMA's own language.** The partner phase hooks pod custody and
   data governance into **CDMC** — the assessment framework EDMA's members already use.
   "Consumer-permissioned data, held to CDMC-grade governance" is a sentence every EDMA data
   officer can take to their risk committee.

## 4. The demo — five scenes, ten minutes, presenter script

One borrower — **Alex Rivera** (a fictional persona; all data is simulated) — goes from
first verification to a closed, transferred loan. Each scene names the real regulation it
dramatizes, because the compliance clock is the part of the story every member already lives
with. Scene design source: `mortgage-process.md` §5 and `SPEC.md` §2.

> **Before you start:** the tour app is the front door — it has the ecosystem map, the scene
> launcher, and a copy-ready demo identity. Every app carries a "concept demonstration"
> banner; leave it visible, it is part of the honesty story (§6 below).

### Scene 1 — Fill the vault (~2 min)

**What you show.** Three issuer flows — modelled on The Work Number, on Finicity, and on
Equifax — each issue a credential (employment+income, assets, credit score) into Alex's Data
Vault, the wallet app modelled on Verizon. Alex watches them arrive in the pod.

**Talking points.**
- "These three issuers aren't inventions. They're the roles the GSEs already accept for
  digital verification under Freddie's AIM and Fannie's DU validation programmes [8][9]. The
  Work Number alone covers 823M+ employer-sourced records [7]."
- "The difference from today: the report lands in *Alex's* pod, not just in a vendor
  database. Issued once, reusable everywhere Alex chooses."
- "Today each of these is a separate per-pull fee — a tri-merge credit report runs around
  $200 [6] — billed again every time a new party needs it."

### Scene 2 — Shop without undressing (~2 min)

**What you show.** Alex approaches two competing lenders — a full origination portal modelled
on Bank of America and a thin pre-qual surface modelled on Fifth Third — and proves
**income ≥ $7,000/month AND credit score ≥ 620** using a zero-knowledge proof. Both lenders
return rate quotes. Neither ever sees the underlying numbers. No credit pull happened.

**Talking points.**
- "Pre-qualification today means handing income and asset detail to every lender you shop
  [1]. Here, Alex proves *just the threshold* — the lenders learn 'qualified', nothing else."
- "The lenders never received the underlying numbers — if Alex walks away, there is no
  income or credit data for them to retain."
- "Open the 'what just happened underneath' panel — and note the honesty panel beside it:
  this proving stack is research-grade, not yet externally audited. We say so on screen." (Full
  points in §6.)

**Watch-outs.** Do not claim ZK for the rest of the journey. Once Alex picks a lender, the
application needs real figures — the demo deliberately switches from proofs to granted access
at that point, and saying so builds credibility. And in the default in-browser mode the
sign-in — including the holder binding when a proof is presented — is simulated and labelled
as such on screen; real authenticated presentation happens in the live multi-actor mode
(§6, decisions 0011/0012).

### Scene 3 — One-click application (~2 min)

**What you show.** Alex picks the BofA-modelled lender and grants it scoped access to the pod.
The URLA (the standard application form, Form 1003) prefills from pod data. The Loan Estimate
lands back *in Alex's pod*.

**Talking points.**
- "The regulation here is TRID: the Loan Estimate must be delivered within 3 business days of
  application [4][5]. Watch it arrive in the pod, inside the window, with a receipt."
- "Prefill from data on file is exactly the experience the industry's own digital leaders
  sell — Bank of America reports 81% of its mortgage applications are initiated digitally
  (`org-map.md`). The pod makes that experience portable to *every* lender, not just the
  biggest."
- "Note what 'granted access' means: scoped to named resources, revocable, and receipted —
  a managed alternative to today's unmanaged copies. (Parties with legal retention duties
  still keep what regulation requires — own that if asked; see §6.)"

### Scene 4 — Nothing goes stale (~2 min)

**What you show.** Thirty days pass (the demo seeds the employment credential with a real
back-dated issuance — no fake clock). The lender's pre-close freshness check finds the
credential is now too old to satisfy its freshness window (the 10-business-day
employment-verification rule below). One click, and the issuer re-issues it through the grant
Alex already gave. The Freddie-LPA-modelled underwriting app re-runs on the granted data.

**Talking points.**
- "The rule being dramatized: verbal verification of employment no more than 10 business days
  before the note date (Fannie Selling Guide B3-3.1-04) [10], and credit documents no older
  than 4 months [12]. Today that rule means a phone call to an employer and re-collected
  paperwork."
- "Here, freshness is a re-issue, not a re-collection. Seconds, through consent that already
  exists."
- "This is the beat the GSE numbers price: up to 12 days saved by DU validation [20],
  $165–$388/loan by LPA automation [34]. The showcase extends that arithmetic past the GSEs to
  the whole chain."

### Scene 5 — Close, and stay in control (~2 min)

**What you show.** The Closing Disclosure arrives in the pod 3 days before closing. Alex
eSigns in the eClose flow modelled on Wolters Kluwer's eOriginal. The loan's servicing then
transfers to a servicer modelled on Truist: the new servicer requests access, **Alex approves
it, revokes the original lender, and reads the consent-receipt ledger** — every grant and
every revocation, receipted.

**Talking points.**
- "Two regulations close the story: TRID's 3-business-day Closing Disclosure window [5][25],
  and RESPA's servicing-transfer notices [30]."
- "The eClose rail is real industry plumbing: eNotes are 12.86% of MERS registrations and
  counting, and eNote loans fund up to 5 days faster, saving over $200/loan [31][32]."
- "The final screen is the whole pitch in one view: the borrower can enumerate exactly who
  has been granted access to what, and when each grant was revoked — something no participant
  in today's process can do (`mortgage-process.md` §3)."

**Watch-out.** The ledger is built by the wallet application, not by the Solid protocol
itself — if asked, say "the receipts are an application feature layered on the open standard"
(decision 0006). Never imply the protocol audits for free.

## 5. The ask — from demo to partner build

The showcase converts when a member recognises their seat and takes it. The sequence:

1. **Recognise your seat.** Every app maps to a role a real organisation holds today, and 7
   of 12 roles are already covered by EDMA members (`org-map.md`). The per-organisation
   one-pagers (companion documents) name each member's seat, what the demo shows in their
   colours, and what building it for real entails.
2. **Founders first.** Freddie Mac and Fifth Third are both Data Excellence Program founders —
   the deepest EDMA engagement in the map — and both are on screen in the demo (the AUS and
   the second lender). They are the first conversations (`SPEC.md` §12).
3. **The concrete ask per member:** join the partner phase — co-build the production version
   of your role's app, on your sanctioned branding, against the CoP's FIBO↔MISMO bindings,
   with CDMC conformance as the governance frame. A per-role product proposal (scope, effort
   bands, pilot structure) follows for each org that engages.
4. **What EDMA gets regardless:** the binding table and the working reference implementation
   are CoP deliverables — standards value even for members who only watch.

Five roles have no member today — credit bureau, appraisal, title, the regulator lens, and US
mortgage insurance (`org-map.md`). The plan per gap: external approaches for three (Equifax,
Cotality, First American), MISMO engaged through its open workgroups, the regulator lens
convened through member public bodies (FDIC, Federal Reserve banks) rather than the CFPB, and
US mortgage insurance an open recruitment gap. The gaps are themselves a talking point: the
CoP is recruiting the missing seats.

## 6. Appendix — honest limits (say these before you are asked)

This section is presenter ammunition, not small print. Leading with honesty is what
distinguishes a standards community from a vendor pitch.

**What is simulated.**
- All personas and data are fictional; every API response is watermarked `simulated: true`.
- In the default visitor mode, pods run *in the visitor's own browser* and the login is
  simulated — including the holder binding when a proof is presented — and the honesty panel
  on screen says so. A second, live multi-actor mode runs on a hosted community Solid server
  with real logins and authenticated presentation, framed as an interoperability proof
  (decisions 0011/0012).
- No real credit pull, no real GSE underwriting, no real eNote registry: the AUS findings,
  eClose ceremony, and registry beats are simulations of the real artifacts.
- The 30-day time jump in scene 4 uses credentials seeded with back-dated validity windows —
  no clock is faked.
- The consent-receipt ledger is an application-level feature built by the wallet (decision
  0006) — the Solid protocol provides the access control; the receipts are ours. It records
  grants and revocations (a complete authorization history), not every individual read.
- Receipted access reduces unnecessary durable copies; it cannot technically prevent an
  authorised recipient retaining what it fetched, and regulated parties (lenders, servicers)
  still keep what retention rules require. The honest claim: **authorizations** become
  scoped, enumerable, and revocable. What a recipient retained is outside the ledger's
  sight — copies are fewer, not zero, and revoking a grant does not claw back a retained
  copy.

**ZK honesty panel (repeated verbatim on every proving surface — decision 0005, zkp-fit).**
- The proving stack is **research-grade**: internally re-audited, external cryptographer
  sign-off still pending. A passing proof is not a production guarantee.
- The honest claim is "the value is not disclosed and cannot be forged" — **not** "the
  verifier cannot possibly learn it". For low-entropy values (a credit score has 551 possible
  values) a determined verifier could enumerate candidates.
- Some composed proofs are precomputed offline and verified live — the screen labels these
  "proved offline · verified live". A live proof only counts alongside its issuer-signed
  anchor credential; the demo enforces that check.

**Branding status.**
- Every app is a **concept demonstration**: role-first framing ("modelled on X", never "by
  X"), name and palette only, no logos or trade dress, an unremovable on-screen disclaimer of
  affiliation, no search indexing, and a consent interstitial (decision 0002).
- No named organisation has endorsed the demo. Per-org sign-off is the gate before any
  member's sanctioned branding replaces the illustrative treatment.
- The Examiner View is unbranded and states its non-affiliation with the CFPB.

**Claim caveats (research-gaps.md §3 — bake these into your delivery).**
- **Mastercard's EDMA membership** comes from the internal role-map sheet and could not be
  confirmed from public sources — re-verify before using it in outreach.
- **eOriginal's ~92% share of MERS eRegistry eNotes is dated January 2022**; the share today
  is unknown. Say "historically managed the overwhelming majority" with the date, or omit.
- **Microsoft** is a CDMC *workgroup participant*, not a listed member — never "member".
- The 47M+ mortgage-breach aggregate (Oct 2023–Oct 2025) is from a secondary source [40];
  prefer the two primary-sourced breaches (14.7M people [38], 885M documents [39]) when
  precision matters.

---

*Sources: bracketed numbers refer to the source list in `docs/research/mortgage-process.md`;
named files are in `docs/research/` and `decisions/`. Refresh pass due after the apps ship
(sales PLAN item 1).*
