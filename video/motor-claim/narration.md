---
title: A motor claim where everyone sees only their part
script: Motor claim
target: 3:00 · about 390 words
steps: new-claim, report, claims-desk, repairer-consent, job-card, not-shared, approve-estimate, complete, refused, close
note: provisional until the apps exist.
---
<!-- AUTHORED-BY Claude Fable 5.2 (words, from docs/rebuild/video-scripts.md); Claude Opus 5.5 (split for the recorder) -->
<!-- Spoken words must stay equal to docs/rebuild/video-scripts.md: `record.ts --check` compares them. -->

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
