<!-- AUTHORED-BY Claude Opus 5.5 -->
# content/motor-claim

Demo 7, the motor claim (flows.md section 7), as data and plain functions. Alex's parked car is
reversed into. Alex starts the claim file in Alex's own pod; Wrenfield Mutual (the insurer) and
Anvil Collision Repair (the repairer) each see a different slice of it, under two grants the pod
enforces; the repairer's grant ends with the job, and Alex withdraws the insurer's claim grant
when the claim closes, while the standing policy grant stays. No React, no app code: the wallet,
insurer and repairer apps call into this directory, and `content/test/motor-claim/` runs the same
functions against the real pod server.

| File | What it holds |
|---|---|
| `facts.ts` | The fictional scenario: the car, the policy, the other driver, the damage, the estimate, the simulated days (`DAY`) and the pod paths |
| `photos.ts` | The two photos, as SVG drawings stored as images in Alex's pod |
| `prepare.ts` | The starting point, brought about once on the first page: the driver licence (State Online Services), the standing grant P1 and the motor policy credential (Wrenfield) |
| `grants.ts` | P1, C1, C2: request, approve, notify, withdraw, expire (on the same grant machinery as the mortgage) |
| `claim.ts` | Alex's claim file: write it, read it back |
| `insurer.ts` | Wrenfield's claims desk: report (C1), check licence and policy at source, damage report, referral, estimate approval |
| `repairer.ts` | Anvil's job card and back office: the C2 request, the job record, the estimate, the invoice, the refused read |
| `messages.ts` | Organisation-to-organisation messages of the claim, answered once |
| `journey.ts` | One function per step, plus Alex's two wallet steps (approve the repairer, close the claim) |
| `agents.ts` | The repairer's inbox handler and the wallet's expiry pass, for the apps' `src/agent.ts` |
| `ledger.ts` | Step 10's totals, computed from the Lens log |
| `mount.ts` | What the apps pass to `mountDemo()`: `motorClaimLens()`, `motorClaimTour()`, `isMotorClaimPage()` |
| `browser.ts` | `motorClaimWorld()`, a `World` for a page on the day of its step |
| `tour.ts` | The ten `TourStep`s |
| (`../mortgage/grant-lock.ts`) | The one lock every grant change takes; the motor-claim steps that check a grant before changing it hold it across both |

## The grants

| Code | To | Reads | Writes | Ends |
|---|---|---|---|---|
| P1 | Wrenfield | `insurance/motor-policy` | `insurance/motor-policy` | while the policy is in force (given before the story) |
| C1 | Wrenfield | `identity/driver-licence`, `insurance/motor-policy`, `claims/CLM-1/` | `claims/CLM-1/` | when the claim closes: Alex withdraws it (step 10) |
| C2 | Anvil | `claims/CLM-1/damage-report`, `claims/CLM-1/photos/` | appends `estimate` and `invoice` to `claims/CLM-1/` | when the job is complete: the invoice is the evidence, and Alex's wallet expires it (step 8) |

Anvil can create its estimate and invoice but cannot read them back, list the claim folder, or open
the incident report, the other driver's details, the licence or the policy: the journey test probes
each of those and gets the pod's 403.

The Lens counts grants per organisation, so its total after step 10 is two (Wrenfield, Anvil):
Wrenfield still holds P1, Anvil's C2 has expired.

## Vocabulary and the ACORD mapping

ACORD has no public RDF vocabulary (open question 6), so the claim file uses schema.org and the
project vocabulary (`vocab/mort.ttl`), with shapes in `packages/data-model/shapes/`. The mapping
below to the data a US first notice of loss usually carries is documentation only, until an
insurance member co-owns the model. No ACORD identifier appears in any resource.

| First-notice-of-loss data | Resource | Term |
|---|---|---|
| Claim or reference number | incident report, claim case | `schema:identifier` |
| Policy number | motor policy credential | `schema:identifier` on the credential subject |
| Coverages, deductible | motor policy credential | `mort:coverage`, `mort:deductible` |
| Policy period | motor policy credential | `schema:validFrom`, `schema:validThrough` |
| Date and time of loss | incident report | `mort:occurredAt` |
| Location of loss | incident report | `schema:location` |
| Description of the accident | incident report | `schema:description` |
| Insured vehicle (make and model, VIN, colour) | incident report, damage report, policy | `mort:vehicle` → `schema:Car` with `schema:name`, `schema:vehicleIdentificationNumber`, `schema:color` |
| Photos | incident report, damage report | `schema:image` |
| Other driver: name, telephone | other party's details | `schema:name`, `schema:telephone` |
| Other driver's insurer and policy number | other party's details | `mort:insurerName`, `schema:identifier` |
| Other vehicle and plate | other party's details | `mort:vehicle` → `schema:Car` with `schema:identifier` |
| Damage description | damage report | `mort:damageItem`, `schema:description` |
| Repair estimate amount | estimate | `mort:lineItem`, `mort:totalAmount` |
| Repair invoice | invoice | `schema:Invoice`, `schema:referencesOrder`, `schema:totalPaymentDue` |
| Claim status | claim case (insurer's and repairer's own pods) | `schema:actionStatus` |

## Limits

- The Lens's "not shared" view works per drawer. The claim folder is one drawer that both
  organisations read parts of, so the resource-level answer ("Anvil did not see the other driver's
  details") is on the wallet's "Who saw what" page (`/wallet/claim/seen`), computed from the log.
- `prepare.ts` repeats the moving-house demo's private set-up of the state's status drawer, so that
  this demo does not depend on that one having run.
