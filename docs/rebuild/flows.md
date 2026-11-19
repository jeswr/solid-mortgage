<!-- AUTHORED-BY Claude Fable 5.2 -->

# The other EDMA flows

Which of the 18 ideas to build, in what order, and how each runs on the engine specified in `design.md` (pod runtime,
tour, Solid Lens). Read `design.md` §b.2 (anti-template rules), §c (Lens) and §d first.

## 1. Recommendation

| Order | Demo | Sector | New apps | Reused apps | Why here |
|---|---|---|---|---|---|
| 1 | Mortgage (includes home insurance) | Finance, insurance | 13 | – | Flagship; builds the engine. "Home insurance from the mortgage pod" is step 15 of the mortgage path, where it really happens, so it needs no separate demo |
| 2 | Moving house: tell everyone once | Government | 1 (`state`) | wallet, county, bank, insurer, payroll, servicer | Cheapest new sector; continues Alex's story the day after closing |
| 3 | Business KYB with LEI | Finance | 2 (`registry`, `business-lender`) | wallet, bank | Already built and tested as a domain; strongest for GLEIF and bank members |
| 4 | Small-dollar lending | Finance | 3 (`idv`, `fintech-lender`, `payout`) | wallet, payroll, bank, bureau | Already built and tested as a domain |
| 5 | Medication handover | Healthcare | 3 (`hospital`, `pharmacy`, `clinic`) | wallet | Completes the four sectors on the microsite |
| 6 | Small business loan | Finance | 0 (new sections) | wallet, bank, state, business-lender | Almost free once 2 and 3 exist |
| 7 | Motor claim | Insurance | 1 (`repairer`) | wallet, state, insurer | Insurance lead; reuses the licence issuer from 2 |
| 8 | Reusable KYC | Finance | 1 (`card-issuer`) | wallet, bank | Shortest script |

Demos 3 and 4 touch path sets disjoint from demo 2 and can be built in parallel with it.

Not now: remortgage and affordability refresh (the mortgage path already shows re-verification and the lender handover;
either is a good later chapter), car finance (same shape as small-dollar lending), quote with verified data, life
underwriting, small business cover, research consent, carer access (partly shown in demo 5), second opinion, housing
assistance, bereavement, diplomas. Each is a content folder plus one or two apps once the engine exists.

### Lending and KYB: port, not link

They cannot be "deployed only". As built, both are Next.js multi-zone sites whose apps call server routes guarded by
`@jeswr/solid-pod-guard`; without a hosted pod and identity provider those routes answer 503, and a hosted pod is what
the no-server rule removes. So:

| Carries over unchanged | Rebuilt |
|---|---|
| `packages/data-model` (shapes, vocab, wrappers), `packages/vc-kit` (issue, verify, status, re-issue, the proof circuits including KYB's completeness scan), personas and seeds, walkthrough copy, the use-case documents, the journey e2e scenarios as headless tests | The apps, as static apps on the engine with fictional organisations; the wallet is the one shared `wallet` app; tours become `content/<demo>/tour.ts` |

Before first public deploy: lending's `urn:example:lend#` terms and KYB's planned `solid-kyb-vocab.vercel.app`
namespace both move to the single vocab project (open question 7). After the port, archive `jeswr/solid-lending` and
`jeswr/solid-kyb` with a pointer.

### What every demo shares

- One site, one Vercel project, one engine. A demo is `content/<demo>/{tour.ts, seed.ts}` plus the apps it needs.
- One wallet. The same Cairn app holds Alex's, Maya's, Rosa's and Northwind's pods. That is the point of Solid, and it
  halves the work.
- An organisation that appears in two demos is the same app with a new section and the same design (Alder Bank is one
  bank). New organisations follow the anti-template rules.
- Every tour ends with a revoke, a refused read, and the journey ledger.
- Every organisation is fictional; the trust banner, `noindex` and the honesty panel are inherited.

New organisations (placeholder names, open question 1):

| Slug | Organisation | Imitates | Design language |
|---|---|---|---|
| `state` | State Online Services (Driver Services; Department of Revenue) | A state government services portal | Wide header band, numbered form steps, plain sans (Public Sans), navy and white, no imagery |
| `registry` | Halyard LEI Services and business register | A registry search and filing site | Search-first, record pages as definition lists, monospace identifiers, teal and grey |
| `business-lender` | Brackenridge Bank, commercial credit desk | A relationship manager's deal sheet | Two-pane deal view, covenant table, serif headings, burgundy and stone |
| `idv` | Trueline Identity | An identity-check funnel on a phone | Camera-frame steps, progress ring, black and electric green |
| `fintech-lender` | Finchly Loans | A mobile-first lending app | Big number sliders, card stack, rounded, violet and mint |
| `payout` | Swiftline Payouts | A payment status page | Single status timeline, receipt, mono numerals, blue-black |
| `hospital` | Riverbend General Hospital, ward system | A clinical record | Patient banner, dense tabs, table of medicines with change markers, clinical blue and white |
| `pharmacy` | Corner Dispensary | A dispensing workstation | Queue on the left, label preview on the right, high contrast, green |
| `clinic` | Larch Lane Family Practice | A consultation screen | Timeline of encounters, problem list, calm grey-violet |
| `repairer` | Anvil Collision Repair | A workshop tablet | Job cards, photo grid, large buttons, yellow and black |
| `card-issuer` | Pennant Card | A card application page | One long form that collapses when prefilled, bold red and white |

`county` is the mortgage path's Marlow County app (Recorder), which gains a Treasurer section in demo 2.

## 2. Moving house: tell everyone once

Alex has closed on 14 Larch Lane. Six organisations need the new address. Title avoids "Tell Us Once", which is the
name of a real UK government service. Setting stays in the US to continue Alex's story (open question 5).

- **Persona and pod:** Alex. New resources: `alex:/profile/address` (the one authoritative address, with an effective
  date), `alex:/profile/address.dprod` (a data product description: owner, purpose, consumers), `alex:/identity/driver-licence`.
- **Standards shown:** schema.org `PostalAddress`; W3C Core Location Vocabulary (`locn:Address`, the SEMIC core
  vocabulary); DPROD for the data product description; DPV purposes; ODRL policies; VC 2.0 for the licence.
- **Pattern difference from the mortgage:** standing access and change notification, instead of one-off reads.

| # | App | Visitor action | Pod | Grant / credential | Lens headline |
|---|---|---|---|---|---|
| 1 | wallet / Home | Open "Your address" | R `profile/address` | – | One address, one owner, described as a data product |
| 2 | wallet / Address | Change it once, effective today; attach evidence | W `profile/address`; link to `mortgage/closing/recording-receipt` | The recorded deed is the proof of address | One write. The evidence was already in the pod from closing |
| 3 | wallet / Who should know | Tick six organisations, approve | W six policies, six consent records, ACL | H1–H6: read `profile/address`, purpose "keep my address current", until withdrawn | Six standing grants to one resource |
| 4 | state / Driver Services | Look; press "Update licence" | R `profile/address`, recording receipt; W `identity/driver-licence` | Licence credential re-issued with the new address; old one revoked | The agency read the address and its evidence, and wrote back a new credential |
| 5 | county / Treasurer | Look | R `profile/address` | – | Tax bills now go to the right place. No form |
| 6 | insurer / Policies | Look | R `profile/address` | – | The car's garaging address updated itself; the premium note is illustrative |
| 7 | Lens / This step | Read | – | – | Bank, payroll and servicer read the same resource. Six readers, one copy |
| 8 | wallet / Sharing | Revoke Alder Bank (Alex is closing the account) | ACL change, consent record | H3 revoked | The rule is removed |
| 9 | wallet / Address | Correct the unit number | W `profile/address` | – | Five organisations read the correction. Alder's request is refused (403) and its record is now stale |
| 10 | Journey ledger | Read | – | – | One resource, six organisations, eleven reads, no forms |

- **Revoke moment:** steps 8 and 9. The refused read is triggered by the next change, so the viewer sees that revocation
  has a consequence for the organisation, not only for Alex.
- **Engine reuse:** all of it. New engine feature: change notification. The runtime tells subscribed organisation
  agents that a resource changed; the Lens labels it "notified by the demo runtime; the Solid Notifications Protocol in
  production".
- **Apps:** one new (`state`), plus small sections in `county`, `insurer`, `bank`, `payroll`, `servicer` that show the
  address they hold and where it came from.

## 3. Business KYB with LEI

Northwind Logistics LLC (fictional) opens a business account and a credit line. Jordan Blake is managing member.
Owners: Jordan 42%, Priya 28%, Marcus 18%, Dana 12%. Design of record for the domain: `docs/research/kyb-demo-design.md`.

- **Pod:** `northwind:` (an organisation's pod, operated by Jordan). `credentials/` holds organisational identity,
  officer authorisation, beneficial ownership.
- **Standards shown:** LEI (ISO 17442) with illustrative, never-issued identifiers; FIBO Business Entities
  (LegalEntities, OwnershipAndControl); the FinCEN customer due diligence rule (31 CFR 1010.230) as the test being
  run; VC 2.0; Bitstring Status List; a zero-knowledge threshold proof.

| # | App | Visitor action | Pod | Grant / credential | Lens headline |
|---|---|---|---|---|---|
| 1 | wallet (business) / Home | Open | R `northwind:` | – | A business has a pod too. It is empty |
| 2 | registry / Entity record | Issue organisational identity | A `credentials/` | Organisational identity credential (illustrative LEI, legal form) | Issued once, by the party that knows |
| 3 | registry / Officers | Issue officer authorisation | A `credentials/` | Officer authorisation (Jordan may act) | Who may sign is a credential, not a board minute in a PDF |
| 4 | registry / Ownership | Issue beneficial ownership | A `credentials/` | Beneficial ownership (four owners, basis points) | The full cap table is in the pod and nowhere else |
| 5 | bank / Business onboarding | Apply; approve the request in the wallet | W policy, consent, ACL | K1: Alder reads identity and ownership, purpose "customer due diligence", 1 year | A scoped grant replaces the document pack |
| 6 | bank / Due diligence | Run the check | R two credentials | Signature and status checked | Owners at or above 25% and the control person, read from signed data. Account opened |
| 7 | business-lender / Pre-decision | Ask for a proof; prove in the wallet | A `brackenridge:/inbox/` | Threshold proof: no undisclosed owner holds 25% or more | The lender learns the answer, not the cap table |
| 8 | business-lender / Deal sheet | Request the due diligence record; approve | W policy, consent, ACL | K2: Brackenridge reads the two credentials | Once a decision is made the rule needs real values, so the proof gives way to a grant |
| 9 | registry / Ownership | Record Marcus selling 18% to Jordan; re-issue | A `credentials/`; status list updated | New ownership credential; old one revoked | A change is a re-issue. Stale data is marked as stale at the source |
| 10 | Lens / This step | Read | R by both banks' agents | – | Both banks read the new ownership through the grants they already have. Nobody re-onboards |
| 11 | wallet / Sharing | Revoke Alder Bank; then bank / Due diligence: read again | ACL change; refused read | K1 revoked | 403. The bank keeps the due diligence record it must keep; it cannot refresh it |
| 12 | Journey ledger / Examiner view | Read | – | – | Each due diligence obligation, with the grant and the reads that met it |

- **Revoke moment:** step 11.
- **Engine reuse:** all of it, plus one engine addition: an *examiner view* tab in the journey ledger, driven by a
  `compliance` list in the demo's content (obligation, rule, the entries that satisfy it). It replaces the old
  "Examiner View" page and is available to every demo.
- **Proof:** port `vc-kit` as it is. The lane measures in-browser proving time for the completeness circuit and labels
  it "proved live" or "proved earlier, verified live" accordingly.

## 4. Small-dollar lending

Maya Torres (fictional) needs $2,000 this week for a car repair. Design of record for the domain:
`docs/research/small-dollar-lending-design.md`.

- **Pod:** `maya:`. `credentials/` holds identity, income, cash flow, credit summary, later repayment history.
- **Standards shown:** FIBO loans; VC 2.0; threshold proof; Reg Z closed-end disclosure and Reg B adverse action notice
  as documents delivered to the pod; ODRL for the repayment mandate.

| # | App | Visitor action | Pod | Grant / credential | Lens headline |
|---|---|---|---|---|---|
| 1 | wallet / Home | Open | R `maya:` | – | An empty pod |
| 2 | idv / Check | Verify identity | A `credentials/` | Identity credential | Verified once, strongly, and reusable |
| 3 | payroll / Share verified employment | Send | A `credentials/` | Income credential ($2,860 a month, two income streams) | Same issuer app as the mortgage, different person |
| 4 | bank / Share cash-flow summary | Send | A `credentials/` | Cash-flow credential (deposits, balances, no returned payments in 90 days, cash-flow score 720) | The bank's data, in Maya's hands |
| 5 | bureau / Credit file summary | Send | A `credentials/` | Credit summary (612, thin file) | Both views of Maya now sit side by side |
| 6 | wallet / Prove | Prove to two lenders | A two lender inboxes | Threshold proof: income ≥ $2,200, cash-flow score ≥ 660, no returned payments | Two quotes. Neither lender holds anything about her |
| 7 | fintech-lender / Apply | Apply; approve in the wallet | W policy, consent, ACL | L1: Finchly reads identity, income, cash flow; 30 days | A grant, with a consent record written before the first read |
| 8 | fintech-lender / Decision | Look at both models; accept | R three credentials; W `loans/finchly/disclosure` | – | Bureau only: declined. Bureau and cash flow: approved. The disclosure is Maya's to keep |
| 9 | bank / Personal loans | Look | W `loans/alder/adverse-action` | – | The decline arrives with its reasons, in the pod |
| 10 | payout / Status | Authorise the payout in the wallet | R `banking/payout-instruction` | L2: Swiftline reads one resource, once | The payment rail saw the instruction and nothing else |
| 11 | fintech-lender / Servicing | Make the payments (one click) | A `credentials/` | Repayment history credential; furnished to the bureau | On-time payments become a credential that builds her file |
| 12 | wallet / Sharing | Revoke Finchly; then fintech-lender: read again | ACL change; refused read | L1 revoked | 403. Paid off, access ended |

- **Revoke moment:** step 12.
- **Engine reuse:** all of it. `payroll`, `bank` and `bureau` are the mortgage apps with one more section each.

## 5. Medication handover

Rosa Rivera (fictional, Alex's mother) is discharged from hospital with a changed medication list. Everything clinical
is fictional and labelled "not clinical guidance".

- **Pod:** `rosa:`. `health/medications/` (current list and each statement), `health/allergies`, `health/discharge/`.
- **Standards shown:** FHIR R5 in RDF (`MedicationStatement`, `MedicationRequest`, `MedicationDispense`,
  `AllergyIntolerance`, `Provenance`); medicine codes as FHIR codings (RxNorm by default; SNOMED CT only with a licence
  and a healthcare member co-owning, open question 6); VC 2.0 for the clinicians' organisational identity.
- **Pattern difference:** several organisations write to the same record; provenance on every change; delegated access
  for a carer.

| # | App | Visitor action | Pod | Grant / credential | Lens headline |
|---|---|---|---|---|---|
| 1 | wallet (Rosa) / Health | Open | R `health/` | M1 (seeded, given at admission): Riverbend writes `health/` during the stay | Rosa's medication list lives in her pod |
| 2 | hospital / Discharge medicines | Reconcile: one stopped, one dose changed, one new; sign | W `health/medications/`, `health/discharge/summary` | Provenance on each change (who, when, why) | The ward wrote the list once, with reasons, where everyone else will read it |
| 3 | wallet / Requests | Approve pharmacy and practice; add Alex as carer | W three policies, consents, ACL | M2: pharmacy reads medicines and allergies. M3: practice reads and writes `health/`. M4: Alex reads medicines | Three grants with three different scopes |
| 4 | pharmacy / Queue | Open Rosa; dispense | R medicines, allergies; W `health/medications/dispenses/` | – | The pharmacist sees the change against the last supply. No fax, no retyping |
| 5 | Lens / Not shared | Read | – | – | The pharmacy saw medicines and allergies. Not the discharge summary |
| 6 | clinic / Consultation | Open Rosa; stop a duplicate; save | R `health/`; W one statement | Provenance | The practice changed the same record. Its own system keeps a pointer, not a copy |
| 7 | pharmacy / Queue | Refresh | R medicines | – | The pharmacy sees the practice's change on its next read |
| 8 | wallet (Alex) / Shared with me | Look | R medicines | M4 | A carer sees the current list, read-only |
| 9 | wallet (Rosa) / Sharing | Change pharmacy: revoke Corner Dispensary; then pharmacy: refresh | ACL change; refused read | M2 revoked | 403. Past dispensing records stay with the pharmacy; the live list does not |
| 10 | Journey ledger | Read | – | – | One list, three writers, three readers, every change attributed |

- **Revoke moment:** step 9.
- **Engine reuse:** all of it. Engine addition: the Lens resource card shows a change history when a resource carries
  provenance. The wallet gains a "Shared with me" screen (delegation).
- **No unverified statistics.** The welcome card for this demo gets a quantified anchor only when one is sourced.

## 6. Small business loan

Northwind Logistics, already onboarded in demo 3, asks Brackenridge Bank for a $150,000 equipment loan.

- **Pod:** `northwind:`. New: `finance/cash-flow` (twelve months of account activity, kept current by the bank),
  `credentials/tax-compliance`, `loans/brackenridge/`.
- **Standards shown:** FIBO loans and business entities; LEI; VC 2.0; ODRL for a standing monitoring grant; the notice
  of action taken on a business credit application (Reg B) as a document in the pod.
- **Pattern difference:** live data kept current in the pod by its source, and a standing grant for covenant monitoring.

| # | App | Visitor action | Pod | Grant / credential | Lens headline |
|---|---|---|---|---|---|
| 1 | bank / Business banking | Turn on "Keep my pod up to date" | W `finance/cash-flow` | S1: Alder writes one resource | The bank publishes the business's own data to the business |
| 2 | state / Department of Revenue | Issue tax compliance | A `credentials/` | Tax compliance credential (filings up to date, annual turnover band) | A second issuer, a second fact |
| 3 | business-lender / New application | Apply; approve | W policy, consent, ACL | S2: Brackenridge reads identity, ownership, tax compliance and cash flow; purpose "credit decision"; 30 days | Due diligence from demo 3 is reused. Nothing is re-collected |
| 4 | business-lender / Deal sheet | Run the assessment | R four resources | Signatures and status checked | Twelve months of cash flow read at source, not from statements |
| 5 | business-lender / Decision | Approve; send the decision | W `loans/brackenridge/decision`, `loans/brackenridge/terms` | – | The decision and its reasons are written back to the business |
| 6 | wallet / Requests | Approve covenant monitoring | W policy, consent, ACL | S3: Brackenridge reads cash flow quarterly while the loan is open | A standing grant with a stated frequency and end |
| 7 | business-lender / Covenants | Advance one quarter (simulated calendar) | R `finance/cash-flow` | S3 | The quarterly check is a read. No covenant certificate |
| 8 | wallet / Sharing | Loan repaid: revoke; then business-lender: read again | ACL change; refused read | S3 revoked | 403 |
| 9 | Journey ledger | Read | – | – | Two issuers, one lender, one decision written back |

- **Revoke moment:** step 8.
- **Engine reuse:** all of it; no new app.

## 7. Motor claim

Alex's car is hit in a car park.

- **Pod:** `alex:`. New: `claims/CLM-1/` (incident report, photos, other party's details, damage report, estimate,
  invoice), `insurance/motor-policy`.
- **Standards shown:** VC 2.0 for the licence and the policy; schema.org terms plus project terms with a documented
  field mapping to ACORD first-notice-of-loss data. ACORD has no public RDF vocabulary; the mapping is documentation
  until an insurance member co-owns the model (open question 6).
- **Pattern difference:** the claimant holds the claim file; the insurer and the repairer each see a different slice.

| # | App | Visitor action | Pod | Grant / credential | Lens headline |
|---|---|---|---|---|---|
| 1 | wallet / New claim | Record the incident: photos, other party's details | W `claims/CLM-1/` | – | The claim file starts in Alex's pod |
| 2 | insurer / Claims | Report the claim; approve | W policy, consent, ACL | C1: Wrenfield reads licence, motor policy and the claim folder; writes `claims/CLM-1/`; until the claim closes | The insurer reads what it needs for this claim |
| 3 | insurer / Claims desk | Check licence and policy; write the damage report | R licence, policy, claim; W `claims/CLM-1/damage-report` | Signatures and status checked | Licence and cover verified without a phone call |
| 4 | wallet / Requests | Approve the repairer | W policy, consent, ACL | C2: Anvil reads the damage report and photos only; writes estimate and invoice; until the job is complete | The repairer gets the damage, not the driver |
| 5 | repairer / Job card | Open the job; write the estimate | R damage report, photos; W `claims/CLM-1/estimate` | – | The workshop read two things |
| 6 | Lens / Not shared | Read | – | – | Anvil did not see: licence, policy, the other party's details |
| 7 | insurer / Claims desk | Approve the estimate | R estimate | – | The insurer reads the estimate where the repairer wrote it |
| 8 | repairer / Job card | Complete; write the invoice | W `claims/CLM-1/invoice` | C2 expires on completion | The grant ended with the job |
| 9 | repairer / Job card | Open the photos again | Refused read | – | 403 |
| 10 | wallet / Sharing | Close the claim: revoke Wrenfield's claim access; journey ledger | ACL change | C1 revoked | The policy grant stays. The claim grant is gone |

- **Revoke moment:** steps 8 to 10: an automatic expiry and a manual revoke.
- **Engine reuse:** all of it. `state` issues the licence (from demo 2); `insurer` gains a claims desk.

## 8. Reusable KYC

Alex, a customer of Alder Bank, applies for a card from Pennant.

- **Pod:** `alex:`. New: `credentials/kyc-attestation`.
- **Standards shown:** VC 2.0; Bitstring Status List; FIBO parties; a trusted-issuer list published by a fictional
  scheme. Honest framing: a bank may rely on another institution's identity checks only under conditions, including an
  agreement between them (31 CFR 1020.220(a)(6); re-check before copy ships). The trusted-issuer list stands for that
  agreement. "Bank B checks the signature only" would overstate it.

| # | App | Visitor action | Pod | Grant / credential | Lens headline |
|---|---|---|---|---|---|
| 1 | bank / Your identity | Get the attestation | A `credentials/` | KYC attestation (what was checked, how, when; no document images) | Bank A states what it verified |
| 2 | card-issuer / Apply | Choose "Use verified identity"; approve | W policy, consent, ACL | Y1: Pennant reads one credential, once, within an hour | The narrowest grant in the suite |
| 3 | card-issuer / Apply | Look | R `credentials/kyc-attestation` | Signature, status, and issuer on the scheme's list | Verified in a second. No documents uploaded |
| 4 | Lens / Not shared | Read | – | – | Pennant did not see: the ID document, accounts, anything else |
| 5 | card-issuer / Apply | Refresh | Refused read | Y1 used | 403. A one-time grant is used up |
| 6 | bank / Your identity | Report the ID lost: revoke and re-issue | Status list updated; A `credentials/` | Old attestation revoked | The issuer can withdraw what it said |
| 7 | Journey ledger | Read | – | – | One check, two banks, one read |

- **Revoke moment:** step 5 (the grant) and step 6 (the credential). This demo shows both kinds of revocation.
- **Engine reuse:** all of it. Engine addition: one-time grants (the wallet removes the rule after the first successful
  read, and the Lens labels it "one-time grant, closed by Alex's wallet").

## 9. The connected story

The welcome page orders demos 1, 2, 5 and 7 as one year in one family's pods: buy a home, tell everyone once, hand over
a medication list, claim on the car insurance. The journey ledger has an "all demos" view that puts every organisation
that touched Alex's pod on one matrix, which is the picture the ideas document asks for ("the same pod serving a dozen
organisations").
