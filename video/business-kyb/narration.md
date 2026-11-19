---
title: Know your business, once
script: Business KYB with LEI
target: 3:40 · about 470 words
steps: vault, org-identity, officer, ownership, onboarding-consent, due-diligence, proof, disclosed-grant, ownership-change, both-banks, revoke, examiner
---
<!-- AUTHORED-BY Claude Fable 5.2 (words, from docs/rebuild/video-scripts.md); Claude Opus 5.5 (split for the recorder) -->
<!-- Spoken words must stay equal to docs/rebuild/video-scripts.md: `record.ts --check` compares them. -->

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
