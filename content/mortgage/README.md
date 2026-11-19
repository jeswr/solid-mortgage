# content/mortgage

The mortgage journey as data and plain functions: what is in each pod at the start, what each of
the 24 tour steps does to the pods, and the copy the tour shows. No React, no app code. The apps
supply buttons and screens and call into this directory; the headless test in
`content/test/mortgage/` calls the same functions against the real pod server.

| File | What it holds |
|---|---|
| `facts.ts` | The fictional scenario: people, property, figures, the simulated day of each event (`DAY`) |
| `world.ts` | `World` (the only thing a journey function needs) and the pod read and write helpers |
| `seed.ts` | `seedRequests()` (every pod's starting state) and `firstRun()` (issuer keys, status lists, the identity credential) |
| `acl.ts` | Builds WAC documents with `@solid/object` |
| `grants.ts` | Grants G1 to G8: request, approve, revoke, expire, and the ledger of their states |
| `issuers.ts` | Issue a credential into a pod, check one at source |
| `messages.ts` | Organisation-to-organisation inbox messages |
| `prequalification.ts` | The threshold proof: challenge, presentation, verification |
| `journey.ts` | One function per step (`JOURNEY`), and the agents that react to inbox messages (`agents`) |
| `mount.ts` | What every app passes to `mountDemo()`: `mortgageLens()`, `mortgageTour()`, `MORTGAGE_HOLDER` |
| `browser.ts` | The browser side: `createBrowserWorld`, `agentWorld`, the shared key store and `mortgageSeed()` for `configure({ seed })` |
| `tour.ts` | The 24 `TourStep`s: copy, `data-tour` names, expected pod events, Lens text, real-world rule |

## How an app uses it

### In the browser

```ts
import { configure, note, podFetch, ready, setTourContext } from "@mortgage/pod-runtime";
import { createBrowserWorld, mortgageSeed, trackTourContext } from "@mortgage/content/mortgage/browser";
import { JOURNEY, shareEmployment } from "@mortgage/content/mortgage/journey";

configure({ registry: ORGS, app: "payroll", seed: mortgageSeed() }); // every app: the same seed
const info = await ready();
const day = JOURNEY.find((beat) => beat.run === shareEmployment)?.day ?? 1;
await shareEmployment(
  createBrowserWorld({ actsAs: "payroll", podFetch, note, day, dayOne: info.dayOne }),
);
// mountDemo({ runtime: { onEvent, resetDemo, setTourContext: trackTourContext(setTourContext) } })
```

- `createBrowserWorld({ actsAs, podFetch, note?, day?, dayOne?, podOrigin?, fetch?, keys?, tour? })`:
  `fetchAs(actsAs)` is the injected `podFetch`. `fetchAs(other)` is a plain `fetch` with
  `x-demo-agent: <owner>`, `x-demo-via-agent: 1` and the tour tag recorded by
  `trackTourContext`. That works in path mode with the service worker only; in the
  dedicated-worker fallback and in host mode a cross-owner action must run in that
  organisation's agent (lane H1).
- `agentWorld(ctx)` builds the world inside an agent handler from the runtime's agent context
  (acts as `ctx.owner` through `ctx.podFetch`, on the day of the event).
- `keyFor` creates each owner's Ed25519 key on first use (non-extractable WebCrypto) in the
  IndexedDB database `mortgage-demo-keys`, store `keys`, keyed by pod owner, shared by every app.
- `mortgageSeed()` is `seedRequests()` plus `firstRun()` captured through a recording world. Pass
  the same seed from every app: whichever page starts the runtime first seeds the pods.

### The journey functions

```ts
import { JOURNEY, agents, shareEmployment } from "@mortgage/content/mortgage/journey";
```

A `World` is `{ podOrigin, calendar, day, fetchAs(owner), keyFor(owner), note(note) }`. The pod
runtime (lane L1) supplies it. `fetchAs(owner)` must hand the pod server that owner's WebID, so the
server, not this code, allows or refuses each request. `note()` is the Lens "app said" channel.

- A button calls the step's function, for example `shareEmployment(world)`. "Do it for me" calls
  the same function.
- A step whose beat list has two entries (`intent-to-proceed`, `cd-received`, `deliver-loan`) runs
  the first when the screen opens and the second on the button, or both in order.
- Organisations react to their inbox through `agents.*`. Each takes the URL of the message and acts
  only as its own organisation. In the journey functions they are called in line, so the tour is
  deterministic, and in the browser the agent runner calls them from the inbox as well.
- Each agent answers a message once. Before anything else it claims the message: it creates
  `handled/<message name>` in its own pod with `If-None-Match: *` (a `document`). Exactly one
  claim succeeds; a later or concurrent caller gets 412 and the agent returns `undefined`
  (`answerOnce`). An agent that throws after claiming deletes its claim before the error
  propagates, so the message is not left "taken in hand" by an answer that never came.
- A journey function calls its agent through `answerOrAwait` (`answerOrAwaitReply` for a reply in
  the sender's own inbox). When the agent returned `undefined`, it waits for the other caller's
  result: the reply in the sender's inbox, the access request in Alex's inbox (step 12), or the
  appraisal copy (step 13). If the claim disappears while it waits (the other caller failed), it
  runs the agent once more itself; it never runs it a third time, and a claim that stays held is
  only ever waited on (20 s by default, then an error).
- Steps 7 and 21 start in another app and finish in the wallet, so each has two halves around
  the wallet's `approveRequest(world, url)`:
  - step 7: `requestApplicationAccess(world)` (Juniper posts the G4 request, returns its URL),
    then `completeApplicationAccess(world)` (Alex's credit-report authorisation);
  - step 21: `requestServicerAccess(world)` (Juniper's boarding message to Marigold, then
    Marigold posts the G8 request, returns its URL), then `completeServicerConnection(world)`
    (payment mandate, Marigold's three reads, its transfer notice and escrow statement).

  A completion half throws unless the grant is active, and is safe to call again while it is.
  `approveApplicationAccess` and `connectServicer` are the one-call compositions the journey
  test runs.
- `agents.walletApplyExpiries(world)` removes the access rules of grants whose end has been
  reached. Call it whenever the simulated day advances. The journey calls it where an end falls
  inside a step.
- Every function throws `PodRequestError` (with `status`) if the pod refuses a request it needed.

## Simulated days

Day 1 is always a Monday (`createDemoCalendar`). `DAY` in `facts.ts`:

| Day | Event |
|---|---|
| 1 | Three credentials shared; pre-qualification proofs |
| 3 | Application (six items); credit report; automated underwriting |
| 4 | Loan Estimate delivered; intent to proceed |
| 5 | Appraisal and title ordered; G5 and G6 approved |
| 12 | Appraisal delivered (G2, G3 and G5 have ended) |
| 14 | Title commitment |
| 16 | Insurance bound |
| 31 | Employment re-verified; clear to close |
| 32 | Closing Disclosure delivered and received |
| 38 | Closing; recording (G1 ends) |
| 45 | Loan sold; owner's title policy (G6 ends) |
| 52 | Juniper's notice of servicing transfer |
| 70 | Servicing transfers; G8 |
| 72 | Alex revokes G4 |

`content/test/mortgage/tour.test.ts` checks the TRID and employment clocks for every Monday over
three years, because public holidays move against day 1.

## Pod layout

Paths are relative to the pod (`<podOrigin>/pods/<owner>/`). In `PodEvent.path` and in `tour.ts`
they carry a leading slash. A message or request is a POST to `/inbox/`; the pod assigns the name.

Alex's pod:

| Path | Shape | Written by |
|---|---|---|
| `profile/card`, `profile/contact` | `agent-profile`, `contact-details` | seed |
| `identity/identity-credential` | `identity-credential` | first run (signed by Alder Bank) |
| `property/subject-property`, `property/purchase-agreement` | `subject-property`, `purchase-agreement` | seed |
| `credentials/employment-income`, `-anchor` | `employment-income-credential`, `zk-operand-anchor` | Ledgerly (G1) |
| `credentials/assets` | `asset-credential` | Alder Bank (G2) |
| `credentials/credit-summary`, `-anchor` | `credit-score-credential`, `zk-operand-anchor` | Quillon (G3) |
| `inbox/request-gN-*` | `access-request` | the asking organisation |
| `policies/gN` | `odrl-policy` | the wallet |
| `consents/gN-given`, `-withdrawn`, `-expired` | `consent-receipt` | the wallet |
| `consents/g4-credit-report-authorisation` | `consent-receipt` | the wallet |
| `mortgage/juniper/application`, `score-notice`, `loan-estimate`, `appraisal`, `closing-disclosure`, `initial-escrow-statement`, `sale-notice`, `servicing-transfer-notice` | see `packages/data-model/shapes/README.md` | Juniper (G4) |
| `mortgage/closing/title-commitment`, `signed/*`, `settlement-statement`, `recording-receipt`, `owners-policy` | | Sextant (G6) |
| `insurance/evidence-of-insurance` | `evidence-of-insurance-credential` | Wrenfield (G7) |
| `banking/payment-mandate` | `payment-mandate` | Alex |
| `mortgage/servicing/transfer-notice`, `escrow-statement` | `servicing-notice`, `escrow-statement` | Marigold (G8) |

Organisation pods: every organisation has `profile/card` (public, carries its signing key) and
`inbox/` (any signed-in agent may append). Issuers have `status/list` (public) and `issued/*`
(a pointer per credential issued). Juniper has `loans/JHL-1001/` (`application`, `pointers/*`,
`orders/*`, `decision`, `closing-record`), `quotes/prequalification` and the public
`prequalification/challenge`. Copperfield has the last two. Quillon has `orders/JHL-1001/report`.
Castellan has `casefiles/JHL-1001/` (`source-checks/*`, `findings`) and `deliveries/JHL-1001`.
Plumbline has `orders/PV-7731/appraisal`. Sextant has `files/STE-2026-0417/commitment`. Marlow
County has the public `records/2026-0048113` (deed) and `records/2026-0048114` (mortgage).

## Grants

`GRANTS` in `grants.ts` is the specification; the ODRL policy and the ACL documents are built
from it. A grant's state is its latest consent record, and the ACL documents are recomputed from
the grants that are active, so a revoke or an expiry removes rules by the same code that added them.

| Grant | To | May | Ends |
|---|---|---|---|
| G1 | Ledgerly | write `credentials/employment-income` and its anchor | at closing |
| G2 | Alder Bank | write `credentials/assets` | after 7 days |
| G3 | Quillon | write `credentials/credit-summary` and its anchor | after 7 days |
| G4 | Juniper | read `profile/`, `identity/`, `credentials/`, `property/`, `insurance/`; read and write `mortgage/juniper/`. Castellan may read the three credentials. Quillon may read the credit-report authorisation | 60 days after closing, or on revoke (step 22) |
| G5 | Plumbline | read `property/subject-property`, `property/purchase-agreement` | when the report is delivered |
| G6 | Sextant | read `profile/card`, `property/purchase-agreement`; write `mortgage/closing/` | when the owner's policy is issued |
| G7 | Wrenfield | read `property/subject-property`, `mortgage/juniper/appraisal`; write `insurance/` | when the policy lapses |
| G8 | Marigold | read `profile/contact`, `insurance/`, `banking/payment-mandate`; read and write `mortgage/servicing/` (it reads back its own letters) | when servicing ends |

An issuer's grant is a write-only slot: Append on `credentials/` itself and Write on the one
resource. The issuer can create and replace that resource. It cannot read it back, list the
container, or write beside it. The journey test asserts each of these with a 403.

WAC grants whole resources. Wrenfield therefore can read the whole appraisal copy, not only the
property facts in it.

## `data-tour` names

The app lanes put `data-tour="<name>"` on these elements. `path` is the route this lane assumed
for the screen; an app lane may change a route by changing `tour.ts` in the same commit.

| Step | App | Route | `data-tour` | Element |
|---|---|---|---|---|
| 1 `welcome` | welcome | `/` | `tour-start` | Start button |
| 2 `payroll-share` | payroll | `/share` | `payroll-sign-send` | Sign and send |
| 3 `bank-share` | bank | `/share` | `bank-send` | Send |
| 4 `bureau-share` | bureau | `/summary` | `bureau-send` | Send summary to my pod |
| 5 `wallet-prove` | wallet | `/prove` | `wallet-prove` | Prove to two lenders |
| 6 `lender-b-received` | lender-b | `/received` | `lender-b-received` | The "What we received" panel |
| 7 `apply-consent` | wallet | `/requests` | `wallet-approve-g4` | Approve on Juniper's request |
| 8 `apply-submit` | lender | `/application` | `lender-submit-application` | Submit application |
| 9 `desk-credit-aus` | lender-desk | `/loans/JHL-1001/credit` | `desk-credit-aus` | Pull credit and run underwriting |
| 10 `aus-source-checks` | aus | `/casefiles/JHL-1001/source-checks` | `aus-source-checks` | The source checks table |
| 11 `intent-to-proceed` | lender | `/disclosures` | `lender-intent-to-proceed` | I intend to proceed |
| 12 `order-services` | lender-desk | `/loans/JHL-1001/verifications` | `desk-order-services` | Order services |
| 13 `appraisal-report` | appraisal | `/orders/PV-7731/field` | `appraisal-submit-report` | Submit the report |
| 14 `title-commitment` | title | `/files/STE-2026-0417/commitment` | `title-issue-commitment` | Issue commitment |
| 15 `insurance-bind` | insurer | `/quote` | `insurer-bind` | Bind coverage |
| 16 `refresh-clear` | lender-desk | `/loans/JHL-1001/conditions` | `desk-refresh-clear` | Refresh employment and clear to close |
| 17 `cd-received` | lender | `/disclosures` | `lender-cd-received` | I have received this |
| 18 `closing-sign` | title | `/files/STE-2026-0417/closing` | `title-sign` | Sign |
| 19 `county-record` | county | `/intake` | `county-record` | Record |
| 20 `deliver-loan` | lender-desk | `/loans/JHL-1001/post-closing` | `desk-deliver-loan` | Deliver the loan |
| 21 `servicer-connect` | wallet | `/requests` | `wallet-approve-g8` | Approve on Marigold's request |
| 22 `revoke-juniper` | wallet | `/sharing` | `wallet-revoke-juniper` | Revoke on Juniper's grant |
| 23 `denied-read` | lender-desk | `/loans/JHL-1001/verifications` | `desk-read-again` | Read bank data again |
| 24 `ledger` | welcome | `/journey` | `journey-ledger` | The journey ledger |

Steps 7 and 21 start in another app (Juniper's Start screen, Marigold's Connect screen) and hand
off to the wallet; the step's `app` is the wallet because the visitor's action is there.

## Inbox messages

Organisation to organisation: an `as:Announce` (`inbox-message` shape) POSTed to the recipient's
`inbox/` by `deliver()`. Fields: `actor` (sender WebID), `messageKind`, `summary`, `published`,
`loanNumber`, `objects` (the resources it is about) and `inReplyTo`. The sender shares each object
with the recipient in its own pod before it sends. Each delivery also emits an `org-to-org` note.

| `mort:MessageKind-…` | From → to | Objects | Step |
|---|---|---|---|
| `CreditReportOrder` | lender → bureau | the service order; Alex's credit-report authorisation | 9 |
| `CreditReportDelivery` | bureau → lender | the report in the bureau's pod | 9 |
| `CasefileSubmission` | lender → aus | the application; the three credential URLs in Alex's pod | 9 |
| `FindingsDelivery` | aus → lender | the findings document | 9 |
| `ServiceOrder` | lender → appraisal, lender → title | the service order | 12 |
| `AppraisalDelivery` | appraisal → lender | the signed appraisal | 13 |
| `CommitmentDelivery` | title → lender | the signed commitment | 14 |
| `RefreshRequest` | lender → payroll | the credential to re-issue | 16 |
| `RefreshDelivery` | payroll → lender | the re-issued credential | 16 |
| `ClosingInstructions` | lender → title | the underwriting decision | 18 |
| `ClosingConfirmation` | title → lender | none | 18 |
| `RecordingSubmission` | title → county | none | 19 |
| `RecordingConfirmation` | county → title, title → lender | the two public records | 19 |
| `LoanDelivery` | lender → aus | the closing record | 20 |
| `PurchaseConfirmation` | aus → lender | the purchase confirmation | 20 |
| `ServicingBoarding` | lender → servicer | none | 21 |

To Alex: an `odrl:Request` (`access-request` shape) POSTed to Alex's `inbox/` by
`requestAccess(world, code)`. The wallet lists the inbox and calls `approveRequest(world, url)`.

The threshold proof is JSON, not RDF, because the proof is bytes:

- `PrequalificationChallenge` at the lender's public `prequalification/challenge`:
  `{ type, lender, nonce, statements }`. Deleted once used, so a presentation cannot be replayed.
- `ThresholdPresentation` POSTed to the lender's `inbox/` as `application/json`:
  `{ type, holder, challenge, nonce, statements: [{ statement, proof, anchor }] }`.
- The lender's result is a `document` at `quotes/prequalification` (private to the lender).

## What is and is not checked

Checked by `content/test/mortgage/journey.test.ts`, on the real `@sparq-org/solid-server` wasm with
one WebID per organisation: every beat completes; every tour `expect` and `done` entry is produced
in its step; every Turtle resource in all 12 pods conforms to the closed SHACL shape of each type
it claims; every ACL document keeps its owner in control; 68 access probes between steps return
the status the grants imply (including 403 for each ended or revoked grant); the first employment
credential is revoked and the re-issued one verifies.

Not validated against SHACL: the six status lists (signed JSON-LD) and the two proof
presentations (JSON). The test asserts these are the only non-Turtle resources.

## Real-world rules: what was re-checked

The primary sources (consumerfinance.gov, ecfr.gov, law.cornell.edu, fanniemae.com) cannot be
fetched from the build container. On 19 November 2026 the rules marked K in design.md section a
were re-checked by web search, which returns passages of those pages:

| Row | Rule | Result |
|---|---|---|
| 4 | Six items make an application, 12 CFR 1026.2(a)(3)(ii) | Confirmed from the regulation text and its commentary |
| 9 | A Loan Estimate may be revised if the consumer does not indicate intent to proceed within 10 business days, 1026.19(e)(3)(iv)(E) | Confirmed from secondary sources quoting the rule. The tour copy does not state this rule; the Loan Estimate's `expires` date uses it |
| 14 | Appraisal copy promptly on completion or three business days before consummation, whichever is earlier, 12 CFR 1002.14(a)(1) | Confirmed from the regulation text |
| 21 | No right of rescission for a residential mortgage transaction, 1026.23(f)(1) | Confirmed from the regulation text |
| 27 | Initial escrow statement at settlement or within 45 calendar days, 1024.17(g) | Confirmed from a Federal Reserve compliance article quoting the rule |
| 3 | Purchase agreement, state contract law | Not checked: no single source |
| 22 | Funding and disbursement, state practice | Not checked: no single source |
| 23 | Recording, state recording law | Not checked: no single source. Step 19 cites no source |

Statements in `tour.ts` with no source id, to be reviewed by a person before the copy ships:

- Step 7: the permissible purpose for a credit report is in section 604 of the Fair Credit
  Reporting Act (15 U.S.C. 1681b). design.md lists no source for it (C8 is section 609).
- Step 22: that lenders must keep loan records for years (Regulation Z and Regulation B
  record-retention rules). The copy gives no period.
- Steps 1 and 24: the comparison with the conventional process is from
  `docs/research/mortgage-process.md`.

## Modelling decisions an app lane should know

- The Social Security number is typed into Juniper's form and is never stored in a pod. The pod
  holds the last four digits, in the identity credential.
- G5 and G6 have no step of their own: step 12 covers the two orders, the two requests and Alex's
  two approvals.
- Step 20 has a second beat on day 52: Juniper's notice that servicing will move, at least 15 days
  before day 70.
- The notice of sale (step 20) is from Castellan, the new owner, and is written into Juniper's
  drawer by Juniper, which still services the loan and holds the grant.
- Re-verifying employment (step 16) is a fresh credential from Ledgerly's payroll record in the
  same slot, and the first credential's status entry is revoked. Ledgerly cannot read the pod.
- Signing at closing is simulated and says so in each signed copy's description.
