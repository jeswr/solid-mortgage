// AUTHORED-BY Claude Opus 5.5
/**
 * The tour engine (design.md §d.6). Holds the current step and the done set, persists them,
 * follows deep links, completes steps from Lens entries first and `data-tour` clicks second,
 * and drives "Do it for me". It never fakes an outcome: a step is done only when the pod (or the
 * app, for an app note) reports what the step names, or the visitor clicks its target.
 */
import type { LensEntry, TourStep } from "@mortgage/demo-kit/contracts";
import type { AppSlug } from "@mortgage/demo-kit/registry";
import { appUrl } from "@mortgage/demo-kit/urls";
import { type ActOptions, TourCursor, waitForTarget } from "./cursor.js";
import { completesByEntry, completesStep } from "./match.js";
import { memoryStore, type TourMode, type TourState, type TourStore } from "./store.js";

export interface TourOptions {
  demo: string;
  steps: TourStep[];
  /** The app this page belongs to. */
  app: AppSlug;
  store?: TourStore;
  /** Full navigation to another page (default `location.assign`). */
  navigate?: (url: string) => void;
  /** The page URL of a step (default `appUrl(step.app, step.path, params)`). */
  urlFor?: (step: TourStep, params: Record<string, string>) => string;
  /** The current page URL (default `location.href`). */
  href?: () => string;
  doc?: Document;
}

export interface TourChange {
  step: TourStep | undefined;
  index: number;
  done: boolean;
  mode: TourMode;
}

/** URL parameters the tour reads (design.md §d.6). */
export interface TourParams {
  demo?: string;
  step?: string;
  present?: boolean;
  act?: boolean;
  free?: boolean;
}

export function parseTourParams(search: string): TourParams {
  const q = new URLSearchParams(search);
  const out: TourParams = {};
  const tour = q.get("tour");
  if (tour === "off") out.free = true;
  else if (tour) out.demo = tour;
  const step = q.get("step");
  if (step) out.step = step;
  if (q.get("present") === "1") out.present = true;
  if (q.get("act") === "1") out.act = true;
  return out;
}

const trim = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

export class TourEngine extends EventTarget {
  readonly demo: string;
  readonly steps: readonly TourStep[];
  readonly app: AppSlug;
  private readonly store: TourStore;
  private readonly navigateTo: (url: string) => void;
  private readonly urlFor: (step: TourStep, params: Record<string, string>) => string;
  private readonly href: () => string;
  private readonly doc: Document;
  private readonly cursor = new TourCursor();
  private state: TourState;
  private clickListener: ((ev: Event) => void) | undefined;

  private constructor(opts: TourOptions, state: TourState) {
    super();
    this.demo = opts.demo;
    this.steps = opts.steps;
    this.app = opts.app;
    this.store = opts.store ?? memoryStore();
    this.navigateTo = opts.navigate ?? ((url) => window.location.assign(url));
    this.urlFor = opts.urlFor ?? ((step, params) => appUrl(step.app, step.path, params));
    this.href = opts.href ?? (() => window.location.href);
    this.doc = opts.doc ?? document;
    this.state = state;
  }

  /** Load saved state, then apply a deep link (`?tour=<demo>&step=<id>`, `?present=1`). */
  static async create(opts: TourOptions, params: TourParams = {}): Promise<TourEngine> {
    if (opts.steps.length === 0) throw new Error("a tour needs at least one step");
    const store = opts.store ?? memoryStore();
    const first = opts.steps[0]?.id ?? "";
    const saved = await store.load(opts.demo);
    const state: TourState =
      saved && opts.steps.some((s) => s.id === saved.stepId)
        ? { ...saved, done: saved.done.filter((id) => opts.steps.some((s) => s.id === id)) }
        : { demo: opts.demo, stepId: first, done: [], mode: "guided" };
    if (params.demo === opts.demo && params.step && opts.steps.some((s) => s.id === params.step)) {
      state.stepId = params.step;
      if (state.mode === "free") state.mode = "guided";
    }
    if (params.free) state.mode = "free";
    if (params.present) state.mode = "present";
    const engine = new TourEngine({ ...opts, store }, state);
    await store.save(state);
    return engine;
  }

  // ---- state ---------------------------------------------------------------------------------

  get current(): TourStep | undefined {
    return this.steps.find((s) => s.id === this.state.stepId);
  }

  get index(): number {
    return this.steps.findIndex((s) => s.id === this.state.stepId);
  }

  get mode(): TourMode {
    return this.state.mode;
  }

  isDone(stepId: string): boolean {
    return this.state.done.includes(stepId);
  }

  snapshot(): TourState {
    return structuredClone(this.state);
  }

  private async commit(): Promise<void> {
    await this.store.save(this.state);
    const step = this.current;
    this.dispatchEvent(
      new CustomEvent<TourChange>("change", {
        detail: {
          step,
          index: this.index,
          done: step ? this.isDone(step.id) : false,
          mode: this.state.mode,
        },
      }),
    );
  }

  // ---- completion ----------------------------------------------------------------------------

  /**
   * Offer a Lens entry. Live entries can complete the current step; replayed ones only when
   * tagged with it, so an old entry never completes a new step.
   */
  ingest(entry: LensEntry, opts: { replayed?: boolean } = {}): boolean {
    const step = this.current;
    if (!step || this.isDone(step.id) || this.state.mode === "free") return false;
    if (opts.replayed) {
      const tagged =
        entry.source === "pod" && entry.tour?.demo === this.demo && entry.tour.step === step.id;
      if (!tagged) return false;
    }
    if (!completesStep(step, entry)) return false;
    void this.markDone(step.id);
    return true;
  }

  /** Listen for clicks on `data-tour` targets (the second completion signal). */
  watchTargets(): void {
    if (this.clickListener) return;
    this.clickListener = (ev: Event) => {
      const step = this.current;
      if (!step || this.isDone(step.id) || completesByEntry(step) || !step.done.target) return;
      const el = ev.target instanceof Element ? ev.target.closest("[data-tour]") : null;
      if (el?.getAttribute("data-tour") === step.done.target && this.onStepPage(step))
        void this.markDone(step.id);
    };
    this.doc.addEventListener("click", this.clickListener, true);
  }

  /**
   * Take state saved by another window of the same demo (the popped-out Lens). Does not save
   * again, and ignores a state equal to the current one, so two windows never echo each other.
   */
  adopt(state: TourState): void {
    if (state.demo !== this.demo || !this.steps.some((s) => s.id === state.stepId)) return;
    if (JSON.stringify(state) === JSON.stringify(this.state)) return;
    this.state = structuredClone(state);
    const step = this.current;
    this.dispatchEvent(
      new CustomEvent<TourChange>("change", {
        detail: {
          step,
          index: this.index,
          done: step ? this.isDone(step.id) : false,
          mode: this.state.mode,
        },
      }),
    );
  }

  async markDone(stepId: string): Promise<void> {
    if (this.isDone(stepId)) return;
    this.state.done = [...this.state.done, stepId];
    await this.commit();
  }

  // ---- navigation ----------------------------------------------------------------------------

  /** Is this page the step's page? */
  onStepPage(step: TourStep): boolean {
    const here = new URL(this.href());
    const there = new URL(this.urlFor(step, {}), here);
    return here.origin === there.origin && trim(here.pathname) === trim(there.pathname);
  }

  stepUrl(step: TourStep, extra: Record<string, string> = {}): string {
    return this.urlFor(step, { tour: this.demo, step: step.id, ...extra });
  }

  /** Make `stepId` current; navigates when the step lives on another page. */
  async goto(stepId: string): Promise<void> {
    const step = this.steps.find((s) => s.id === stepId);
    if (!step) throw new Error(`unknown step: ${stepId}`);
    this.state.stepId = stepId;
    if (this.state.mode === "free") this.state.mode = "guided";
    await this.commit();
    if (step.mode === "summary" && !step.done.target && !completesByEntry(step))
      await this.markDone(step.id);
    if (!this.onStepPage(step)) this.navigateTo(this.stepUrl(step));
  }

  async next(): Promise<void> {
    const i = this.index;
    const step = this.steps[i + 1];
    if (step) await this.goto(step.id);
    else this.dispatchEvent(new CustomEvent("finish"));
  }

  async back(): Promise<void> {
    const step = this.steps[this.index - 1];
    if (step) await this.goto(step.id);
  }

  async setMode(mode: TourMode): Promise<void> {
    this.state.mode = mode;
    await this.commit();
  }

  /** Forget progress and return to the first step. */
  async restart(): Promise<void> {
    await this.store.clear(this.demo);
    const first = this.steps[0];
    this.state = { demo: this.demo, stepId: first?.id ?? "", done: [], mode: "guided" };
    await this.commit();
    if (first) this.navigateTo(this.stepUrl(first));
  }

  /**
   * "Do it for me": on the step's page, move the cursor to its target and click it; elsewhere,
   * navigate there first (`act=1` resumes on arrival). Resolves when the click has happened.
   */
  async act(opts: ActOptions = {}): Promise<"clicked" | "navigating" | "no-action"> {
    const step = this.current;
    if (!step?.action) return "no-action";
    if (!this.onStepPage(step)) {
      this.navigateTo(this.stepUrl(step, { act: "1" }));
      return "navigating";
    }
    const el = await waitForTarget(step.action.target, { doc: this.doc, ...opts });
    await this.cursor.clickElement(el, this.doc);
    return "clicked";
  }

  dispose(): void {
    if (this.clickListener) this.doc.removeEventListener("click", this.clickListener, true);
    this.clickListener = undefined;
    this.cursor.remove();
  }
}
