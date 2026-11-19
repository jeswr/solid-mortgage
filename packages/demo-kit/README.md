<!-- AUTHORED-BY Claude Opus 5.5 -->

# @mortgage/demo-kit

What every demo app and engine package shares. Browser-safe; React only under `./trust`.

| Import | Gives you |
|---|---|
| `@mortgage/demo-kit/contracts` | `PodEvent`, `AppNote`, `LensEntry`, `TourStep`, `Session`, and their parts `AccessRule`, `AccessMode`, `Chip`, `ChipKind`, `TOUR_STEP_LIMITS` |
| `@mortgage/demo-kit/registry` | `ORG_SLUGS`, `APP_SLUGS`, `OrgSlug`, `AppSlug`, `PodOwner`, `OrgRecord`, `OrgRegistry`, `displayName`, `webidPath`, `webidFor`, `podOwners` |
| `@mortgage/demo-kit/urls` | `appUrl`, `setUrlMode`, `urlMode`, `podOrigin`, `appSlugOfPath` |
| `@mortgage/demo-kit/calendar` | the demo calendar and TRID business-day arithmetic |
| `@mortgage/demo-kit/trust` | `DemoTrust`, `TrustBanner`, `useDemoOrg`, `demoPack`, `demoDocumentMeta`, `applyDocumentMeta` |
| `@mortgage/demo-kit` | everything except `./trust` |

The registry data (the thirteen records) is `ORGS` in `@mortgage/content/orgs`.

## Contracts

Copied from design.md §d.2 (`PodEvent`, `AppNote`, `LensEntry`) and §d.6 (`TourStep`), kept
verbatim so the two can be compared line by line. The runtime emits them, the Lens and the tour
read them; nobody redefines them. Design leaves three parts open, defined here:

- `AccessRule` — `{ agent, modes, resource, inherited }`: one authorisation from the ACL body
  actually written. `agent` is a WebID, or `http://xmlns.com/foaf/0.1/Agent` for anyone;
  `modes` are `"Read" | "Write" | "Append" | "Control"`; `resource` is the pod path the rule is
  about; `inherited` is true for an `acl:default` rule.
- `Chip` — `{ kind, label? }` where `kind` is one of the §c.2 chips (`"pod read"`, `"pod write"`,
  `"grant"`, `"credential"`, `"proof"`, `"denied"`, `"no Solid in this step"`) and `label` an
  optional qualifier such as `"G5"`.
- `Session` — `{ org, webid, persona, simulated: true }`, as the §d.2 comment describes.

`TOUR_STEP_LIMITS` holds the editorial limits: title ≤ 8 words, body ≤ 45 words.

## Registry and pods

`ORG_SLUGS` are the thirteen organisation apps (directory names and URL segments);
`APP_SLUGS` adds `welcome`. Each `OrgRecord` has `organisation` (the fictional name), optional
`product` (the second view of an organisation: "Loan Desk"), `short` (map label), `role`,
`persona` (who is shown signed in, `null` on a public page), optional `altPersonas`,
`themeColor` and `title`.

`actsAs` is the pod an app's requests are made as. It is the app's own slug except for
`lender-desk`, which acts as `lender` (one organisation, one pod, one WebID), and `wallet`, which
acts as `alex` (the wallet is Alex's own app). `podOwners(ORGS)` gives the twelve pods: Alex's
and eleven organisations' (Cairn needs none). A pod lives at `/pods/<owner>/` and its WebID is
`webidFor(owner, podOrigin)` = `<origin>/pods/<owner>/profile/card#me`.

## Links between apps

```ts
appUrl("wallet", "requests", { request: url, return: here }); // "/wallet/requests?request=…&return=…"
setUrlMode({ kind: "host", domain: "demo.example" });          // once at start-up, host mode
appUrl("lender", "status");                                    // "https://lender.demo.example/status"
podOrigin();                                                   // "" in path mode, "https://pods.demo.example" in host mode
```

## Demo calendar

Dates are `YYYY-MM-DD` strings computed in UTC. Day 1 is the latest Monday at least 75 days
before today (`demoDayOne()`); `createDemoCalendar(dayOne?)` gives `date(day)`, `dayOf(date)`,
`label(day)` ("Day 12 · Fri"), `time(day, "HH:MM")` (an ISO instant for `PodEvent.at` and
credential dates) and `clock(day)` (a `Date`, for vc-kit's `now`).

Business days follow 12 CFR 1026.2(a)(6): `"general"` = Monday to Friday except observed federal
holidays (every demo organisation's opening days), `"specific"` = every day except Sundays and
legal public holidays (a weekend holiday excludes both its date and its observed weekday, which is
the cautious reading for every rule below). Helpers: `federalHolidays(year)`, `isBusinessDay`,
`addBusinessDays`, `businessDaysBetween`, `withinBusinessDays`, `loanEstimateDeadline`
(3 general business days after application), `presumedReceipt` (mailbox rule),
`closingDisclosureDeadline` (3 specific business days before consummation: closing Thursday ⇒
received Monday), `earliestConsummationAfterClosingDisclosure`,
`earliestConsummationAfterLoanEstimate` (7 specific business days).

## Trust wiring

```tsx
import { ORGS } from "@mortgage/content/orgs";
import { DemoTrust, TrustBanner } from "@mortgage/demo-kit/trust";

<DemoTrust org={ORGS.lender}>
  <TrustBanner />            {/* on every route, including not-found */}
  …
</DemoTrust>
```

`TrustBanner` renders the `@jeswr/solid-showcase-kit` concept-demo banner (convener: EDMA Solid
Community of Practice; the "own" variant, since no real organisation is modelled), then
"<Organisation> is a fictional organisation." and, when a persona is set, "Signed in as <name>,
<role> (simulated)". Pass `signedInAs` to show the session's persona instead of the registry's.
The About link goes to `appUrl("welcome", "honesty")`. Each app also sets `<title>`,
`theme-color`, a favicon and `<meta name="robots" content="noindex, nofollow">` in its
`index.html`; `applyDocumentMeta(org, page?)` keeps them right after route changes.
