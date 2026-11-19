// AUTHORED-BY Claude Opus 5.5
/** Lens test harness: drives `<solid-lens>` from the recorded fixture log. */
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import "../../src/index.js";
import type { LensStep, SolidLens } from "../../src/index.js";
import events from "../fixtures/events.json" with { type: "json" };
import { CONFIG } from "../fixtures/registry.js";

const ENTRIES = events as LensEntry[];
const params = new URLSearchParams(location.search);

const lens = document.createElement("solid-lens") as SolidLens;
if (params.get("layout") === "window") lens.setAttribute("layout", "window");
if (params.has("popout")) lens.setAttribute("popout", "");
document.body.append(lens);
lens.addEventListener("lens-inset", (ev) => {
  const { right, bottom } = (ev as CustomEvent<{ right: number; bottom: number }>).detail;
  document.documentElement.style.setProperty("--solid-lens-inset-right", `${right}px`);
  document.documentElement.style.setProperty("--solid-lens-inset-bottom", `${bottom}px`);
});
lens.configure({ ...CONFIG, app: "county", revokeCaveat: params.get("caveat") ?? undefined });
lens.setSteps([
  { id: "certify", chapter: "Get ready", title: "Get certified", day: 1 },
  { id: "itinerary", chapter: "Get ready", title: "Plan the route", day: 1 },
  { id: "permit", chapter: "Permits", title: "Apply for a permit", day: 3 },
  { id: "cover", chapter: "Cover", title: "Get rescue cover", day: 4 },
  { id: "hut", chapter: "Cover", title: "Book a hut", day: 5 },
  { id: "withdraw", chapter: "After the trip", title: "Withdraw access", day: 9 },
  { id: "retry", chapter: "After the trip", title: "Try again", day: 9 },
]);
lens.ledgerOptions = {
  today: [
    {
      resource: "Route plan",
      holders: ["Fernhollow", "Kestrel", "a printed copy at the trailhead"],
    },
  ],
  todaySource: "fixture copy",
  callsToAction: [{ label: "Read about pods", href: "#pods" }],
  onRestart: () => location.reload(),
};

let cursor = 0;
const events_: string[] = [];
for (const name of ["lens-act", "lens-next", "lens-back", "lens-restart", "lens-popout"]) {
  lens.addEventListener(name, () => events_.push(name));
}

function stepOf(id: string, index: number, extra: Partial<LensStep> = {}): LensStep {
  return {
    id,
    chapter: "Permits",
    title: `Fixture step ${id}`,
    body: "Press the button to send the request.",
    index,
    total: 7,
    done: false,
    actionLabel: "Send",
    day: index,
    headline: "Fernhollow reads only what the permit needs.",
    chips: [{ kind: "pod read" }, { kind: "grant", label: "T2" }, { kind: "denied" }],
    canGoBack: index > 1,
    ...extra,
  };
}

const harness = {
  lens,
  entries: ENTRIES,
  emitted: events_,
  /** Push the next `n` fixture entries live. */
  next(n = 1, replayed = false) {
    for (let i = 0; i < n && cursor < ENTRIES.length; i++) {
      const e = ENTRIES[cursor++];
      if (e) lens.push(e, { replayed });
    }
    lens.flush();
  },
  /** Push entries until (and including) the one with this id. */
  through(id: number, replayed = false) {
    while (cursor < ENTRIES.length) {
      const e = ENTRIES[cursor++];
      if (!e) break;
      lens.push(e, { replayed });
      if (e.id === id) break;
    }
    lens.flush();
  },
  step(id: string, index: number, extra: Partial<LensStep> = {}) {
    lens.setStep(stepOf(id, index, extra));
    lens.flush();
  },
  free() {
    lens.setStep(null);
    lens.setMode("free");
    lens.flush();
  },
};

declare global {
  interface Window {
    harness: typeof harness;
  }
}
window.harness = harness;
if (params.has("replay")) harness.next(ENTRIES.length, true);
document.documentElement.dataset.ready = "true";
