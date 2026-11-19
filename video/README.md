<!-- AUTHORED-BY Claude Opus 5.5 -->

# video

The narrated demo videos (lane V1, build-plan.md §2): a recorder that turns each demo's script
into a 1080p MP4 with captions and chapters, recorded against the built static site. Ported from
the Solid Suite walkthrough recorder; one generic `scenes.ts` serves every demo
(docs/rebuild/video-scripts.md, "One scenes.ts for every demo").

| Path | What it is |
|---|---|
| `<demo>/narration.md` | The script: `## Title {#scene-id}` scenes, one paragraph per clip, `[do: …]`, `[then: …]`, `[pause: s]`. Words copied from docs/rebuild/video-scripts.md; the check fails if they drift |
| `<demo>/cards.html` | Title and end cards (`[do: card <id>]`); shared styles in `stage/cards.css` |
| `<demo>/claims.json` | Each spoken total and the ledger quantity it must equal |
| `record.ts` | Check, rehearse or record one demo |
| `voice.ts` | Prepare narration takes and split them into clips |
| `scenes.ts` | The actions: `card`, `step`, `act`, `ring`, `lens`, `ring-lens`, `chip`, `open` |
| `lib/` | Narration parser, the static check, screencast capture, the pointer and rings, the mux |
| `stage/` | The overlay injected into every page (pointer, rings, organisation chip, cross-fades) |

Demo ids: `mortgage`, `moving-house`, `business-kyb`, `small-dollar-lending`,
`medication-handover`, `small-business-loan`, `motor-claim`, `reusable-kyc`.

## Check (no browser, no voice)

```sh
pnpm run build                                   # the check reads content/dist
node --experimental-transform-types video/record.ts --check --strict [--demo <id> | --all]
pnpm exec vitest run --root video                # the same check as tests, plus negative cases
```

The check fails when a scene has no id or no spoken paragraph, an action is unknown or does not
resolve (a card that is not in `cards.html`, a step that is not in `content/<demo>/tour.ts`, an
`act` on a step with no action, a Lens view or part the Lens lacks, an organisation not in
`content/orgs.ts`), a built demo's tour step is never shown or is shown out of order, a spoken
total disagrees with its claim or with `content/` (applications and organisations in the
registry, the mortgage's eight grants G1 to G8), a number is spoken over `lens totals` with no
claim, or the words differ from docs/rebuild/video-scripts.md. A demo whose content does not
exist yet is checked against the `steps:` in its front matter, and its strict mode is off.

The recording repeats the totals check live: at `[do: lens totals]` it reads
`window.__demo.totals()` (the journey ledger the Lens computed from the pod's own events) and,
with `--strict`, fails if any claim differs. A claim on a demo's own quantity (`<demo>.<field>`,
such as `moving-house.reads`) is counted by that demo's `content/<demo>/ledger.ts` totals
function over the same log the Lens holds, the count its ledger page shows; the static check
fails if that function does not count the field.

## Record

```sh
pnpm run build
node --experimental-transform-types video/record.ts --demo mortgage --strict \
  --copy-to /path/to/also/keep/it
```

It serves `dist/` in-process with production routing (`tools/serve-dist.mjs`; or `--site <url>`
for a server already running), opens a fresh Chromium context (fresh demo data: the pods live in
that context's service worker and IndexedDB), and records 1280×720 CSS pixels at 1.5× through the
DevTools screencast. `step` deep-links to the step's page with `?tour=<demo>&step=<id>&present=1`
(or calls `window.__demo.goto` on the same page); `act` glides the pointer to the step's
`data-tour` target, clicks it, and waits until the tour marks the step done from the pod's
events. A step whose target first shows a hand-off instead of the step's own action (the
wallet's "Have Juniper Home Loans ask now" before Approve, when the request starts in another
app) has the hand-off pressed when the step is shown, so the request is on screen while the
narration describes it. `--rehearse` runs every action fast with no capture; `--only a,b` records
some scenes.

Output in `video/dist/<demo>/` (not in git; `tools/build-site.mjs` copies it to the site's
`/video/<demo>/`): `video.mp4`, `captions.vtt`, `chapters.vtt` (cue id = scene id, which the
welcome page's player seeks by), `poster.jpg`, `report.json` (duration, chapter times, the live
totals, warnings).

## Voice

ElevenLabs "George" (`JBFqnCBsd6RMkjVDRZzb`), `eleven_multilingual_v2`, one take per scene with
the paragraphs separated by `<break time="1.8s" />`; `lexicon.json` respells initialisms.

```sh
node --experimental-transform-types video/voice.ts text  --demo mortgage   # take texts, what is cached
node --experimental-transform-types video/voice.ts split --demo mortgage   # takes -> clips
```

A take is saved as `<voice>/raw/<scene>-<hash>.mp3`, the hash covering voice, model and text, so a
scene whose words are unchanged is never voiced again. `<voice>` defaults to `video/<demo>/voice/`
(ignored by git); pass `--voice` to both scripts and to `record.ts` to use a shared cache. A
paragraph with no clip is held for its estimated length and still captioned, so a silent draft
can be cut before the narration exists.
