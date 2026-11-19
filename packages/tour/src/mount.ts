// AUTHORED-BY Claude Opus 5.5
/**
 * `mountDemo()`: the one call an app makes to get the Solid Lens, the tour's step card, view
 * transitions between apps and `window.__demo`. The runtime is passed in (from
 * `@mortgage/pod-runtime`), so this package depends on its contract, not its code.
 */
import { createDemoCalendar } from "@mortgage/demo-kit/calendar";
import type { LensEntry, TourStep } from "@mortgage/demo-kit/contracts";
import type { AppSlug, OrgRegistry } from "@mortgage/demo-kit/registry";
import {
  defineSolidLens,
  type LedgerTotals,
  type LedgerViewOptions,
  type LensCalendar,
  type LensConfig,
  type LensStep,
  type LensView,
  type SolidLens,
} from "@mortgage/lens";
import { parseTourParams, TourEngine, type TourParams } from "./engine.js";
import { validateTour } from "./schema.js";
import { idbStore, type TourState, type TourStore } from "./store.js";

/** What mount needs from the pod runtime (design.md §d.2 contract names). */
export interface DemoRuntime {
  onEvent(cb: (entry: LensEntry) => void, opts?: { replay?: boolean }): () => void;
  resetDemo?(): Promise<void>;
  /** Optional: lets the runtime tag the events it emits with the current step. */
  setTourContext?(ctx: { demo: string; step: string } | null): void;
}

export interface MountOptions {
  app: AppSlug;
  registry: OrgRegistry;
  runtime: DemoRuntime;
  holder?: { name: string };
  tour?: { demo: string; steps: TourStep[]; sources?: Iterable<string> };
  /** Lens layout and copy: drawers, grant handles, caveat, record drawers, links. */
  lens?: Omit<LensConfig, "registry" | "app" | "holder" | "calendar">;
  ledger?: LedgerViewOptions;
  calendar?: LensCalendar;
  store?: TourStore;
  navigate?: (url: string) => void;
  /** Where to put the Lens (default `document.body`). */
  container?: HTMLElement;
  /** URL to parse for tour parameters (default `location.href`). */
  href?: string;
}

export interface MountedDemo {
  lens: SolidLens;
  tour: TourEngine | undefined;
  unmount(): void;
}

export interface DemoApi {
  goto(stepId: string): Promise<void>;
  act(): Promise<string>;
  lens(view: LensView): void;
  present(on: boolean): Promise<void>;
  totals(): LedgerTotals;
  state(): { step?: string; done: string[]; mode: string } | undefined;
}

declare global {
  interface Window {
    __demo?: DemoApi;
  }
}

const HOST_STYLE_ID = "solid-lens-host-style";
const HOST_CSS = `
:root { --solid-lens-inset-right: 0px; --solid-lens-inset-bottom: 0px; }
:where(body) { padding-right: var(--solid-lens-inset-right); padding-bottom: var(--solid-lens-inset-bottom); }
@view-transition { navigation: auto; }
@media (prefers-reduced-motion: reduce) { @view-transition { navigation: none; } }
`;
const SEEN_KEY = "solid-lens:last-seen";

type Seen = { pod: number; app: number };

function readSeen(): Seen {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    const v = raw ? (JSON.parse(raw) as Partial<Seen>) : {};
    return { pod: Number(v.pod ?? 0), app: Number(v.app ?? 0) };
  } catch {
    return { pod: 0, app: 0 };
  }
}

function writeSeen(seen: Seen | null): void {
  try {
    if (seen === null) sessionStorage.removeItem(SEEN_KEY);
    else sessionStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    // Storage refused (private mode): entries simply animate again on the next page.
  }
}

function toLensStep(tour: TourEngine, step: TourStep): LensStep {
  const index = tour.steps.indexOf(step);
  return {
    id: step.id,
    chapter: step.chapter,
    title: step.title,
    body: step.body,
    index: index + 1,
    total: tour.steps.length,
    done: tour.isDone(step.id),
    ...(step.action ? { actionLabel: step.action.label } : {}),
    ...(step.clock ? { day: step.clock.day } : {}),
    headline: step.lens.headline,
    chips: step.lens.chips,
    canGoBack: index > 0,
  };
}

export async function mountDemo(opts: MountOptions): Promise<MountedDemo> {
  defineSolidLens();
  const doc = document;
  const url = new URL(opts.href ?? window.location.href);
  const params: TourParams = parseTourParams(url.search);
  const windowMode = url.searchParams.get("solidLens") === "window";

  if (!doc.getElementById(HOST_STYLE_ID)) {
    const style = doc.createElement("style");
    style.id = HOST_STYLE_ID;
    style.textContent = HOST_CSS;
    doc.head.append(style);
  }

  const lens = doc.createElement("solid-lens");
  if (windowMode) lens.setAttribute("layout", "window");
  else lens.setAttribute("popout", "");
  const onInset = (ev: Event) => {
    const { right, bottom } = (ev as CustomEvent<{ right: number; bottom: number }>).detail;
    doc.documentElement.style.setProperty("--solid-lens-inset-right", `${right}px`);
    doc.documentElement.style.setProperty("--solid-lens-inset-bottom", `${bottom}px`);
  };
  lens.addEventListener("lens-inset", onInset);
  (opts.container ?? doc.body).append(lens);

  let calendar = opts.calendar;
  if (!calendar) {
    const c = createDemoCalendar();
    calendar = { label: (d) => c.label(d), dayOf: (d) => c.dayOf(d) };
  }
  lens.configure({
    ...opts.lens,
    registry: opts.registry,
    app: opts.app,
    calendar,
    ...(opts.holder ? { holder: opts.holder } : {}),
  });
  lens.ledgerOptions = { ...opts.ledger };

  // Tour.
  let tour: TourEngine | undefined;
  if (opts.tour) {
    const steps = validateTour(
      opts.tour.steps,
      opts.tour.sources ? { sources: opts.tour.sources } : {},
    );
    tour = await TourEngine.create(
      {
        demo: opts.tour.demo,
        steps,
        app: opts.app,
        store: opts.store ?? idbStore(),
        ...(opts.navigate ? { navigate: opts.navigate } : {}),
        href: () => opts.href ?? window.location.href,
        doc,
      },
      params,
    );
    lens.setSteps(
      steps.map((s) => ({
        id: s.id,
        chapter: s.chapter,
        title: s.title,
        ...(s.clock ? { day: s.clock.day } : {}),
      })),
    );
    tour.watchTargets();
  }

  const show = () => {
    if (!tour) {
      lens.setMode("free");
      lens.setStep(null);
      return;
    }
    lens.setMode(windowMode && tour.mode === "guided" ? "guided" : tour.mode);
    const step = tour.current;
    lens.setStep(tour.mode === "free" || !step ? null : toLensStep(tour, step));
    opts.runtime.setTourContext?.(
      step && tour.mode !== "free" ? { demo: tour.demo, step: step.id } : null,
    );
  };
  show();
  tour?.addEventListener("change", show);

  // A second window (the popped-out Lens) follows the tour through a broadcast channel.
  const channel =
    typeof BroadcastChannel === "function" ? new BroadcastChannel("solid-lens-tour") : undefined;
  tour?.addEventListener("change", () =>
    channel?.postMessage({ demo: tour?.demo, state: tour?.snapshot() }),
  );
  channel?.addEventListener("message", (ev: MessageEvent<{ demo?: string; state?: TourState }>) => {
    if (!tour || ev.data?.demo !== tour.demo || !ev.data.state) return;
    tour.adopt(ev.data.state);
  });

  // Entries: replayed ones (already shown on an earlier page) rebuild state silently.
  const seen = readSeen();
  let subscribing = true;
  const stop = opts.runtime.onEvent(
    (entry) => {
      const key = entry.source === "pod" ? "pod" : "app";
      const replayed = subscribing || entry.id <= seen[key];
      if (entry.id > seen[key]) {
        seen[key] = entry.id;
        writeSeen(seen);
      }
      lens.push(entry, { replayed });
      tour?.ingest(entry, { replayed });
    },
    { replay: true },
  );
  subscribing = false;

  // Lens controls.
  const on = (name: string, fn: () => unknown) => {
    const h = () => void fn();
    lens.addEventListener(name, h);
    return () => lens.removeEventListener(name, h);
  };
  const offs = [
    on("lens-act", () => tour?.act()),
    on("lens-next", () => tour?.next()),
    on("lens-back", () => tour?.back()),
    on("lens-restart", async () => {
      await opts.runtime.resetDemo?.();
      writeSeen(null);
      await tour?.restart();
    }),
    on("lens-popout", () => {
      const u = new URL(window.location.href);
      u.searchParams.set("solidLens", "window");
      window.open(u.href, "solid-lens", "popup,width=420,height=900");
    }),
  ];

  // window.__demo for the video recorder and the end-to-end suite.
  const api: DemoApi = {
    goto: async (id) => tour?.goto(id),
    act: async () => (tour ? tour.act() : "no-action"),
    lens: (view) => lens.view(view),
    present: async (onOff) => {
      if (tour) await tour.setMode(onOff ? "present" : "guided");
      else lens.setMode(onOff ? "present" : "free");
    },
    totals: () => lens.totals(),
    state: () => {
      if (!tour) return undefined;
      const s = tour.snapshot();
      return { step: s.stepId, done: s.done, mode: s.mode };
    },
  };
  window.__demo = api;

  // Resume "Do it for me" after arriving from another page.
  if (tour && params.act) {
    const clean = new URL(window.location.href);
    clean.searchParams.delete("act");
    history.replaceState(history.state, "", clean.href);
    void tour.act().catch((err) => console.warn("[tour] could not act:", err));
  }

  return {
    lens,
    tour,
    unmount() {
      stop();
      for (const off of offs) off();
      lens.removeEventListener("lens-inset", onInset);
      tour?.dispose();
      channel?.close();
      lens.remove();
      if (window.__demo === api) delete window.__demo;
    },
  };
}
