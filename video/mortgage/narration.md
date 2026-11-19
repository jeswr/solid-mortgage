---
title: A mortgage on Solid: thirteen applications, one pod
script: Mortgage
target: 4:50 · about 620 words
steps: welcome, payroll-share, bank-share, bureau-share, wallet-prove, lender-b-received, apply-consent, apply-submit, desk-credit-aus, aus-source-checks, intent-to-proceed, order-services, appraisal-report, title-commitment, insurance-bind, refresh-clear, cd-received, closing-sign, county-record, deliver-loan, servicer-connect, revoke-juniper, denied-read, ledger
---
<!-- AUTHORED-BY Claude Fable 5.2 (words, from docs/rebuild/video-scripts.md); Claude Opus 5.5 (split for the recorder) -->
<!-- Spoken words must stay equal to docs/rebuild/video-scripts.md: `record.ts --check` compares them. -->

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

[do: step wallet-prove]
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

[do: step desk-credit-aus]
[do: act]
On the lender's side, the loan officer pulls a credit report and runs automated underwriting. The lender's own credit report does not come from the pod, and the Lens says so.

[do: step aus-source-checks]
The underwriting service reads three credentials at source, and checks each signature.

[do: step intent-to-proceed]
[do: act]
The Loan Estimate arrives in the pod the next day, and Alex confirms they want to go ahead.

## Processing {#processing}

[do: step order-services]
[do: act]
The processor orders an appraisal, a title search, a flood check and tax transcripts.

[do: step appraisal-report]
[do: act]
The appraiser is assigned independently of the lender's sales staff. They read the property record and the purchase contract.

[do: lens not-shared]
They never see Alex's income, savings or credit.

[do: step title-commitment]
[do: act]
The title company reads a name and a contract, and writes its commitment to the pod.

[do: step insurance-bind]
[do: act]
The insurer quotes from property facts already in the pod, and writes evidence of insurance once, for the lender to read.

[do: step refresh-clear]
A month on, the lender must check employment again, within ten business days of closing.

[do: act]
That is a fresh credential from the payroll provider, not a phone call. The loan is clear to close.

## Closing {#closing}

[do: step cd-received]
[do: act]
The Closing Disclosure lands in the pod. Three business days must pass before signing.

[do: step closing-sign]
[do: act]
At the title company, Alex signs. Signed copies go to the pod.

[do: step county-record]
[do: act]
The deed is recorded with the county. Solid plays no part here, because land records are public. The Lens says that too.

## After closing {#after}

[do: step deliver-loan]
[do: act]
The lender sells the loan. That is between organisations, but the notice to Alex arrives in the pod.

[do: step servicer-connect]
[do: act]
A new company will collect the payments. It asks for three things: contact details, the insurance policy, and a payment account.

[do: step revoke-juniper]
The original lender no longer needs Alex's live data.

[do: act]
So Alex withdraws its access.

[do: step denied-read]
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
