<!-- AUTHORED-BY Claude Opus 5.5 -->

# @mortgage/tour

The guided-tour engine and step schema (design.md §d.6), and `mountDemo()`: the one call an app
makes to get the Solid Lens, the step card, view transitions and `window.__demo`.
Domain-neutral: the steps come from `content/<demo>/tour.ts`.

| Import | Gives you |
|---|---|
| `@mortgage/tour/mount` | `mountDemo`, `DemoRuntime`, `MountOptions`, `DemoApi` |
| `@mortgage/tour` | `TourEngine`, `validateTour`, `tourStepSchema`, `matchesPartial`, `matchesExpectation`, `completesStep`, `idbStore`, `memoryStore`, `TourCursor`, `waitForTarget`, `parseTourParams` |

## Mounting in an app

```ts
import { ORGS } from "@mortgage/content/orgs";
import { onEvent, resetDemo, setTourContext } from "@mortgage/pod-runtime";
import { mountDemo } from "@mortgage/tour/mount";

await mountDemo({
  app: "bank",
  registry: ORGS,
  holder: { name: "Alex" },
  runtime: { onEvent, resetDemo, setTourContext },   // setTourContext is optional
  tour: { demo: "<demo>", steps: TOUR, sources: SOURCE_IDS },
  lens: { drawers, grants, recordDrawers, revokeCaveat, grantsHref, ledgerHref },
  ledger: { today, todaySource, callsToAction, compliance }, // compliance: the examiner view's obligations
});
```

Also put the view-transition opt-in in the app's `index.html`, so the incoming page has opted
in before it renders (mount injects it too, but only after the page has rendered, which is too
late for the page being navigated to):

```html
<style>@view-transition { navigation: auto; }</style>
```

Mount appends `<solid-lens>` to `<body>` and keeps `--solid-lens-inset-right` and
`--solid-lens-inset-bottom` on `<html>` (376/52 px for the dock, 64 px for the sheet's peek); a
low-specificity rule pads `<body>` by them. Fixed-position app chrome should use the same
variables.

## Steps

`validateTour(steps, { sources })` checks every step against the `TourStep` contract
(demo-kit) and throws `TourValidationError` listing all problems: title ≤ 8 words, body ≤ 45
words, unique ids, known app and organisation slugs, `data-tour` names in lower-case-hyphen
form, interactive steps have an `action` and a completion, `done.event` and `done.note` not
both, every `realWorld.source` known when `sources` is given. Mount validates on start.

## Completion

- A step that names `done.event` (pod event) or `done.note` (app note) completes only when a
  matching entry arrives. Patterns match partially: every named key must match; paths match
  when equal or when the entry path ends with the pattern (`/documents/a` matches
  `/pods/alex/documents/a`).
- Only a step with neither completes from a click on its `done.target` (`[data-tour=…]`) on
  its own page. Restyling an app therefore cannot break the tour.
- A live entry can complete the current step; a replayed one only if its `tour` tag names the
  current step. **Pod-runtime should tag events** with the step given to
  `setTourContext({ demo, step })`, so a step completed during a cross-app redirect is still
  recognised on the page the visitor lands on.
- `summary` steps without a completion are done when reached. The tour never advances on its
  own: Next reads "Skip" until the step is done.

## "Do it for me"

`act()` on the step's page waits (up to 10 s) for `[data-tour=<action.target>]` to exist and be
enabled, scrolls it into view, moves a visible cursor to it (no travel under reduced motion)
and calls the element's own `click()`. On another page it navigates there with `act=1`, and
mount acts on arrival.

## URL parameters and state

`?tour=<demo>&step=<id>` deep-links; `?present=1` turns on present mode (no step card, larger
Lens type); `?tour=off` is free play; `act=1` resumes "Do it for me"; `solidLens=window` is the
popped-out Lens. State (demo, step, done set, mode) lives in IndexedDB (`solid-demo-tour`),
falling back to memory. A popped-out Lens window follows the tour over a `BroadcastChannel`.
Entries already shown on an earlier page in this tab (tracked in `sessionStorage`) replay
silently; new ones animate.

## `window.__demo`

`goto(stepId)`, `act()`, `lens(view)` (`"step" | "grants" | "not-shared" | "raw" | "ledger" | "examiner"`),
`present(on)`, `totals()` (the journey ledger totals), `state()`.

## Tests

`pnpm test`: schema, matching, engine with fake-indexeddb, and the grep gate that keeps
domain terms out of this package and `@mortgage/lens`. `pnpm test:e2e`: a three-step fictional
trail-expedition demo on three pages (`test/harness/`), run with "Do it for me" end to end,
resumed after a reload, plus modes, deep links, reduced motion and axe. The harness runtime is
a stand-in for the event contract only; it is not a pod and checks no access.
