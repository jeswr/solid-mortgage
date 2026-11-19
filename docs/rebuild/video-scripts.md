<!-- AUTHORED-BY Claude Fable 5.2 -->

# Narrated video scripts

One script per demo, in the format the existing recorder already parses
(`/mnt/project-files/suite-video/source`: `narration.md`, `scenes.ts`, `record.ts`, `split.ts`).

## How to use this file

- Split it into `video/<demo>/narration.md`, one per `# ` heading below, each with its `title:` front matter.
- `## Title {#id}` starts a scene and a chapter marker. Each paragraph is one narration clip. `[do: …]` runs as the
  paragraph starts, `[then: …]` after it, `[pause: s]` holds.
- Voice: ElevenLabs "George", as before. British English spelling and phrasing; US mortgage terms keep their US names
  (Loan Estimate, Closing Disclosure, escrow). Reason: the earlier videos set the voice, and the audience is
  international.
- Pace: the suite video ran about 130 words a minute including pauses. Word counts and target lengths are given per
  script.
- Record against `pnpm preview` of the static site with `?present=1` (no step card, larger Lens type), 1280×720 at
  1.5× scale, fresh demo data per recording.
- Numbers spoken aloud (organisations, grants, reads) must equal the journey ledger's totals. `record.ts --strict`
  reads them from `window.__demo.totals()` and fails on a mismatch.
- Scripts for demos 5 to 8 are written against `flows.md` and will need a pass once those apps exist.

### One `scenes.ts` for every demo

The tour engine exposes `window.__demo` (`design.md` §d.6), so the recorder needs only these generic actions:

| Action | What the recorder does |
|---|---|
| `card <id>` | Shows a title card from `video/<demo>/stage/cards.html#<id>`, cross-fading from the last frame |
| `step <step-id>` | `__demo.goto(id)`: navigates to that tour step's app and screen and waits until it has drawn |
| `act` | Moves the visible cursor to the current step's `data-tour` target, clicks, and waits for the step's `done` condition |
| `ring <name>` | Rings the element `[data-tour="<name>"]` in the app |
| `lens <view>` | Switches the Solid Lens: `map`, `step`, `grants`, `not-shared`, `raw`, `ledger`, `totals`, `examiner` |
| `ring-lens <part>` | Rings part of the Lens: `headline`, `map`, `last` (newest entry), `edge:<org-slug>`, `drawer:<name>` |
| `chip <text>` | Sets the corner label naming the organisation on screen (set automatically by `step`; use to override) |
| `open <slug> <path>` | Free navigation outside the tour order |

Step ids below are normative: `content/<demo>/tour.ts` must use them.

---

# Mortgage

```
title: A mortgage on Solid: thirteen applications, one pod
target: 4:50 · about 620 words
steps: welcome, payroll-share, bank-share, bureau-share, prove, lender-b-received, apply-consent, apply-submit,
       credit-aus, aus-sources, loan-estimate, order-services, appraisal, title-commitment, insurance, conditions,
       closing-disclosure, signing, recording, sale, servicer, revoke, refused, ledger
```

## Thirteen applications, one pod {#intro}

[do: card title]
This is a mortgage, from the first enquiry to the first payment, rebuilt on Solid. Twelve organisations take part. All of them are fictional, and each has its own application.

[do: card copies]
Today, each of those organisations collects its own copy of the borrower's documents. Here the borrower, Alex, keeps the data in a pod, and each organisation asks for the part it needs.

[do: step welcome]
[do: ring-lens map]
The panel on the right is the Solid Lens. It shows every read, every write and every permission as it happens.

## Getting ready {#ready}

[do: step payroll-share]
Alex starts with the payroll provider their employer uses.

[do: act]
It signs a statement of employment and income, and writes it to the pod as a verifiable credential.

[do: step bank-share]
[do: act]
The bank does the same for savings.

[do: step bureau-share]
[do: act]
And the credit bureau, for a credit summary. Three issuers, one place, and each record can be checked later without calling the issuer.

## Shopping without handing over data {#shop}

[do: step prove]
Now Alex shops around. Two lenders ask the same thing: is income at least seven thousand dollars a month, and is the credit score at least six hundred and twenty?

[do: act]
The wallet answers with a proof. Each lender learns yes or no, and nothing else.

[do: step lender-b-received]
This is everything the second lender holds: an answer, and who vouches for it.

## Applying {#apply}

[do: step apply-consent]
Alex's offer on a house is accepted, so it is time to apply. The lender asks for access, and the wallet shows what is being asked: which records, for what purpose, until when, and who else will see them.

[do: act]
[then: ring-lens edge:lender]
Approving creates a grant. You can see it appear in the Lens.

[do: step apply-submit]
The application fills itself in from the pod. Every field shows where it came from.

[do: act]
Once the lender has six key items, US rules give it three business days to send a Loan Estimate.

[do: step credit-aus]
[do: act]
On the lender's side, the loan officer pulls a credit report and runs automated underwriting. The lender's own credit report does not come from the pod, and the Lens says so.

[do: step aus-sources]
The underwriting service reads three credentials at source, and checks each signature.

[do: step loan-estimate]
[do: act]
The Loan Estimate arrives in the pod the next day, and Alex confirms they want to go ahead.

## Processing {#processing}

[do: step order-services]
[do: act]
The processor orders an appraisal, a title search, a flood check and tax transcripts.

[do: step appraisal]
[do: act]
The appraiser is assigned independently of the lender's sales staff. They read the property record and the purchase contract.

[do: lens not-shared]
They never see Alex's income, savings or credit.

[do: step title-commitment]
[do: act]
The title company reads a name and a contract, and writes its commitment to the pod.

[do: step insurance]
[do: act]
The insurer quotes from property facts already in the pod, and writes evidence of insurance once, for the lender to read.

[do: step conditions]
A month on, the lender must check employment again, within ten business days of closing.

[do: act]
That is a fresh credential from the payroll provider, not a phone call. The loan is clear to close.

## Closing {#closing}

[do: step closing-disclosure]
[do: act]
The Closing Disclosure lands in the pod. Three business days must pass before signing.

[do: step signing]
[do: act]
At the title company, Alex signs. Signed copies go to the pod.

[do: step recording]
[do: act]
The deed is recorded with the county. Solid plays no part here, because land records are public. The Lens says that too.

## After closing {#after}

[do: step sale]
[do: act]
The lender sells the loan. That is between organisations, but the notice to Alex arrives in the pod.

[do: step servicer]
[do: act]
A new company will collect the payments. It asks for three things: contact details, the insurance policy, and a payment account.

[do: step revoke]
The original lender no longer needs Alex's live data.

[do: act]
So Alex withdraws its access.

[do: step refused]
[do: act]
When the lender tries to read the bank data again, the pod refuses. The lender keeps the loan file the law requires it to keep. What has ended is its access to Alex's data at source.

## The whole journey {#ledger}

[do: step ledger]
This is the whole journey on one page: every organisation, every record, every grant, and what each one never saw.

[do: lens totals]
Thirteen applications. Eight grants. No documents uploaded.

[do: card join]
Everything you saw ran in a browser, on open standards. Try it yourself from the welcome page, or join the EDMA Solid Community of Practice. We meet every week.

[pause: 2.5]

---

# Moving house: tell everyone once

```
title: Moving house: tell everyone once
target: 3:00 · about 390 words
steps: address, change, who, driver-services, treasurer, insurer, readers, revoke-bank, correction, ledger
```

## One address {#intro}

[do: card title]
Alex has just bought a house. Now six organisations need the new address: the state, the county, the bank, the insurer, the employer's payroll, and the mortgage servicer.

[do: card forms]
Usually that is six forms, and six copies of an address that slowly drift apart.

[do: step address]
In Alex's pod there is one address. It is described the way a data team would describe a data product: one owner, a stated purpose, and a list of consumers.

## Change it once {#change}

[do: step change]
[do: act]
Alex changes it once. The proof of address is already in the pod: the deed recorded at closing.

[do: step who]
Then Alex chooses who should know.

[do: act]
[then: ring-lens map]
Six standing grants, all to the same record, each for one purpose: keeping the address current.

## Everyone reads the same record {#read}

[do: step driver-services]
The state's driver services reads the address and its evidence.

[do: act]
It issues a new licence credential, and withdraws the old one.

[do: step treasurer]
The county treasurer reads it, so tax bills go to the right house.

[do: step insurer]
The insurer reads it, and the car policy follows Alex to the new address.

[do: step readers]
[do: lens step]
The bank, the payroll provider and the servicer read the same record. Six readers, one copy, no forms.

## Taking one away {#revoke}

[do: step revoke-bank]
Alex is closing the old bank account, so the bank no longer needs to know.

[do: act]
Its grant is withdrawn.

[do: step correction]
[do: act]
A week later Alex corrects the unit number. Five organisations pick up the correction. The bank asks, and the pod refuses.

[do: ring-lens last]
The bank's copy is now out of date, and it knows it is. That is the difference between holding a copy and reading the source.

## One record, six organisations {#ledger}

[do: step ledger]
[do: lens totals]
One record. Six organisations. Eleven reads. Every one of them is listed here with the grant that allowed it.

[do: card join]
This is the same pod that carried Alex's mortgage. To build the next sector with us, join the EDMA Solid Community of Practice.

[pause: 2.5]

---

# Business KYB with LEI

```
title: Know your business, once
target: 3:40 · about 470 words
steps: vault, org-identity, officer, ownership, onboarding-consent, due-diligence, proof, disclosed-grant,
       ownership-change, both-banks, revoke, examiner
```

## A business has a pod too {#intro}

[do: card title]
Northwind Logistics is a small freight company. It wants a bank account and a credit line. Both banks must know who the business is, and who owns it.

[do: card pack]
Today that means sending the same formation documents and ownership chart to each bank, and sending them again when anything changes.

[do: step vault]
Here, Northwind has a pod. It starts empty.

## Issued once {#issue}

[do: step org-identity]
[do: act]
A registry issues the company's identity, with its legal entity identifier. The identifier in this demo is illustrative, and is not a real one.

[do: step officer]
[do: act]
It states who may act for the company.

[do: step ownership]
[do: act]
And it records the four owners and their shares. The full ownership table now sits in Northwind's pod, and nowhere else.

## Onboarding from the pod {#onboard}

[do: step onboarding-consent]
[do: act]
The first bank asks to read the identity and the ownership record, for customer due diligence. Northwind's managing member approves.

[do: step due-diligence]
[do: act]
The bank runs the check the rule requires: every owner with a quarter or more, and the person in control. It reads signed data, checks each signature, and opens the account.

## Proving without disclosing {#prove}

[do: step proof]
The second bank is only quoting for a credit line. It does not need the ownership table yet. It needs one answer: is there any owner above a quarter that we have not been told about?

[do: act]
Northwind answers with a proof. The bank learns the answer, and not the shares.

[do: step disclosed-grant]
[do: act]
Once the bank decides to lend, the rule needs the real values. So the proof gives way to a grant.

## Nothing goes stale {#fresh}

[do: step ownership-change]
[do: act]
One owner sells his stake. The registry issues a new ownership record and withdraws the old one.

[do: step both-banks]
[do: lens step]
Both banks read the new record through the grants they already have. Nobody starts onboarding again.

## Control and audit {#control}

[do: step revoke]
[do: act]
Northwind closes its account at the first bank and withdraws the grant. The bank's next read is refused. It keeps the due diligence record it must keep. It can no longer refresh it.

[do: step examiner]
[do: lens examiner]
For a supervisor, the ledger lists each due diligence obligation beside the grant and the reads that met it.

[do: card join]
One set of credentials, two banks, no document packs. If your organisation issues or relies on business identity, we would like you in the Community of Practice.

[pause: 2.5]

---

# Small-dollar lending

```
title: A small loan, the same afternoon
target: 3:40 · about 470 words
steps: vault, identity, income, cash-flow, credit-summary, prove, apply, decision, decline-notice, payout,
       repayments, revoke
```

## Two thousand dollars, this week {#intro}

[do: card title]
Maya's car has broken down, and she needs two thousand dollars to fix it. Her credit file is thin. Her income and her bank account tell a better story.

[do: step vault]
Maya has a pod. It is empty.

## Filling it {#fill}

[do: step identity]
[do: act]
An identity service checks who she is, once, and gives her a credential.

[do: step income]
[do: act]
Her employer's payroll provider states her income. This is the same application you saw in the mortgage demo, issuing to a different person.

[do: step cash-flow]
[do: act]
Her bank summarises her account: regular deposits, and no returned payments in ninety days.

[do: step credit-summary]
[do: act]
And the credit bureau adds its view: a score of six hundred and twelve, from a short history.

## Two quotes, nothing handed over {#shop}

[do: step prove]
[do: act]
Maya asks two lenders for a quote. Each receives a proof that she clears its thresholds. Neither receives her name, her income or her transactions.

## One decision, two models {#decide}

[do: step apply]
[do: act]
She picks one and applies. The lender is granted her identity, income and cash-flow records for thirty days, and the consent is recorded before the first read.

[do: step decision]
The lender shows both ways of deciding. On the credit score alone, she is declined. With cash flow as well, she is approved.

[do: act]
The loan disclosure is written to her pod. It is hers to keep.

[do: step decline-notice]
The bank that looked only at the score sends its decline, with reasons, to the same place.

## Paid out {#payout}

[do: step payout]
[do: act]
A payment service sends the money to her card. It is granted one record, once: where to pay. It sees nothing else.

## Repaying, and leaving {#repay}

[do: step repayments]
[do: act]
Each payment made on time is added to a repayment credential in her pod, and reported to the bureau. The thin file gets thicker.

[do: step revoke]
When the loan is paid off, Maya withdraws the lender's access.

[do: act]
The lender asks for her bank data again, and the pod refuses.

[do: lens totals]
Five issuers, two lenders, one payment service. The next time Maya applies for anything, the pod is already full.

[do: card join]
Try it from the welcome page, or join us at the EDMA Solid Community of Practice.

[pause: 2.5]

---

# Medication handover

```
title: One medication list, from ward to pharmacy to practice
target: 3:10 · about 410 words
steps: health, discharge, grants, dispense, not-shared, consultation, pharmacy-refresh, carer, revoke, ledger
note: provisional until the apps exist. Every clinical detail is fictional. Add no statistics without a source.
```

## Leaving hospital {#intro}

[do: card title]
Rosa is going home from hospital. Her medicines have changed: one stopped, one dose raised, one new.

[do: card letters]
Usually that news travels by letter, and is typed again at the pharmacy and at her doctor's practice. Mistakes happen at each retyping.

[do: step health]
Rosa's medication list is in her pod.

## Written once {#discharge}

[do: step discharge]
[do: act]
On the ward, the pharmacist records the three changes, with a reason for each. The list is written once, in a standard health format, where everyone else will read it.

## Three grants, three scopes {#grants}

[do: step grants]
Rosa decides who can see it.

[do: act]
Her pharmacy can read her medicines and allergies. Her doctor's practice can read and update her health record. Her son, Alex, can read the list, because he helps with her care.

## The pharmacy {#pharmacy}

[do: step dispense]
The pharmacist opens the list and sees what changed since the last supply.

[do: act]
They dispense, and record it in the pod.

[do: step not-shared]
[do: lens not-shared]
The pharmacy saw medicines and allergies. It did not see the discharge summary.

## The practice {#practice}

[do: step consultation]
A week later, Rosa's doctor opens the same list.

[do: act]
They stop a duplicate. That change is written to the same record, with the doctor's name against it.

[do: step pharmacy-refresh]
[do: act]
The pharmacy sees it on its next read. The practice and the pharmacy never exchanged a message.

[do: step carer]
And Alex sees the current list in his own wallet, read-only.

## Changing pharmacy {#revoke}

[do: step revoke]
Rosa moves to a pharmacy nearer home, and withdraws the old one's access.

[do: act]
Its next read is refused. It keeps its own dispensing records, as it must. It no longer sees the live list.

## One list {#ledger}

[do: step ledger]
[do: lens totals]
One list, three organisations writing to it, every change signed with a name and a reason.

[do: card join]
If your organisation works with health data, help us shape this one. Join the EDMA Solid Community of Practice.

[pause: 2.5]

---

# Small business loan

```
title: A business loan from live data
target: 3:00 · about 390 words
steps: publish-cash-flow, tax-compliance, apply, assessment, decision, monitoring, quarter, revoke, ledger
note: provisional until the apps exist.
```

## Borrowing to grow {#intro}

[do: card title]
Northwind Logistics wants a loan for new equipment. A lender will ask for a year of bank statements, tax records, and the company's ownership.

[do: card reuse]
Northwind already proved who it is and who owns it, when it opened its bank account. That work does not need doing twice.

## Data from the source {#source}

[do: step publish-cash-flow]
[do: act]
Northwind asks its bank to keep a record of its cash flow up to date in the company's pod. The bank publishes the business's own data to the business.

[do: step tax-compliance]
[do: act]
The state revenue department confirms that Northwind's tax filings are up to date.

## The application {#apply}

[do: step apply]
[do: act]
The lender asks for four things: identity, ownership, tax status and cash flow. Northwind approves, for thirty days, for one purpose: a credit decision.

[do: step assessment]
[do: act]
The lender reads twelve months of cash flow at source. No statements are exported, and nothing is retyped. Each signature is checked.

[do: step decision]
[do: act]
The decision, and the reasons for it, are written back to Northwind's pod.

## A standing grant {#monitor}

[do: step monitoring]
Loans like this come with conditions, checked every quarter.

[do: act]
Northwind grants the lender a quarterly read of its cash flow, for as long as the loan is open. The frequency and the end date are part of the grant.

[do: step quarter]
[do: act]
Three months on, the check is a read. Nobody prepares a certificate.

## Repaid {#revoke}

[do: step revoke]
[do: act]
When the loan is repaid, Northwind withdraws the grant, and the lender's next read is refused.

[do: step ledger]
[do: lens totals]
Two issuers, one lender, one decision written back, and a monitoring arrangement the borrower could read and end.

[do: card join]
If you lend to small businesses, or supply data to those who do, join the EDMA Solid Community of Practice.

[pause: 2.5]

---

# Motor claim

```
title: A motor claim where everyone sees only their part
target: 3:00 · about 390 words
steps: new-claim, report, claims-desk, repairer-consent, job-card, not-shared, approve-estimate, complete,
       refused, close
note: provisional until the apps exist.
```

## A bump in a car park {#intro}

[do: card title]
Someone has reversed into Alex's car. A claim involves a driver, an insurer and a repairer, and usually a lot of forwarded email.

[do: step new-claim]
[do: act]
Alex starts the claim in their own pod: what happened, photos, and the other driver's details.

## The insurer {#insurer}

[do: step report]
[do: act]
Alex reports it to the insurer and grants access to three things: the driving licence, the policy, and this claim.

[do: step claims-desk]
[do: act]
The claims handler checks the licence and the cover. Both are signed credentials, so there is nobody to ring. Then they write a damage report into the claim.

## The repairer {#repairer}

[do: step repairer-consent]
The car needs a body shop.

[do: act]
Alex gives the repairer the damage report and the photos, and nothing more, until the job is done.

[do: step job-card]
[do: act]
The workshop opens the job, reads those two things, and writes its estimate back.

[do: step not-shared]
[do: lens not-shared]
The repairer did not see the licence, the policy, or the other driver's details. It had no reason to.

[do: step approve-estimate]
[do: act]
The insurer reads the estimate where the repairer wrote it, and approves it.

## When the job ends, so does the access {#revoke}

[do: step complete]
[do: act]
The repair is finished and the invoice is filed. The repairer's grant was for this job, so it ends here.

[do: step refused]
[do: act]
If the workshop opens the photos again, the pod refuses.

[do: step close]
[do: act]
Alex closes the claim and withdraws the insurer's access to it. The insurer still reads the policy. It no longer reads the claim.

[do: lens totals]
Three parties, two grants, each scoped to one job.

[do: card join]
We are looking for insurers to help shape this model. Join the EDMA Solid Community of Practice.

[pause: 2.5]

---

# Reusable KYC

```
title: Verified once, accepted twice
target: 2:50 · about 370 words
steps: attestation, card-consent, card-verify, not-shared, used-up, reissue, ledger
note: provisional until the apps exist. Check the reliance wording against 31 CFR 1020.220(a)(6) before recording.
```

## The same checks, again {#intro}

[do: card title]
When Alex opened a bank account, the bank checked who they were. Now Alex wants a credit card from another company, which must run its own checks.

[do: card twice]
Usually that means the same passport, the same proof of address, and another copy of both.

## What the bank can say {#attest}

[do: step attestation]
[do: act]
Alex asks the bank for a statement of what it verified: which checks, by what method, and when. The statement is signed, and holds no images of documents. It goes into Alex's pod.

## One read {#apply}

[do: step card-consent]
The card company offers a choice: fill in the form, or use a verified identity.

[do: act]
Alex grants it one record, to be read once, within the hour. It is the narrowest grant in these demos.

[do: step card-verify]
[do: act]
The card company reads the statement and checks three things: the signature, that the statement has not been withdrawn, and that the bank is on its list of issuers it has an agreement with.

[do: ring-lens last]
That agreement matters. One institution may rely on another's checks only under conditions, and the list stands for those conditions.

[do: step not-shared]
[do: lens not-shared]
The card company did not see the identity document, the bank account, or anything else in the pod.

## Used once {#revoke}

[do: step used-up]
[do: act]
If it asks again, the pod refuses. A one-time grant is used up.

[do: step reissue]
Later, Alex loses the identity document.

[do: act]
The bank withdraws its statement and issues a new one. Anyone checking the old statement will see that it no longer stands.

## Two kinds of withdrawal {#ledger}

[do: step ledger]
[do: lens totals]
One set of checks, two institutions, one read. And two ways to take something back: the owner withdraws access, and the issuer withdraws its word.

[do: card join]
To work on reusable identity with other EDMA members, join the Solid Community of Practice.

[pause: 2.5]
