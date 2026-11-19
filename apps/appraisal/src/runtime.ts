// AUTHORED-BY Claude Opus 5.5
/**
 * Plumbline's link to the pods: the runtime configured as this app, the demo mounted (Lens, step
 * card, view transitions), a `World` for the journey functions, and two hooks the screens use to
 * read pod state and to run an action that the pod may refuse.
 */
import {
  createBrowserWorld,
  mortgageSeed,
  trackTourContext,
} from "@mortgage/content/mortgage/browser";
import { MORTGAGE_HOLDER, mortgageLens, mortgageTour } from "@mortgage/content/mortgage/mount";
import { TOUR } from "@mortgage/content/mortgage/tour";
import { PodRequestError, type World } from "@mortgage/content/mortgage/world";
import { ORGS } from "@mortgage/content/orgs";
import { createDemoCalendar } from "@mortgage/demo-kit/calendar";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import {
  configure,
  note,
  onEvent,
  onReset,
  podFetch,
  podUrl,
  ready,
  resetDemo,
  setDay,
  setTourContext,
} from "@mortgage/pod-runtime";
import { mountDemo } from "@mortgage/tour/mount";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

export const APP = "appraisal" as const;
export const ACTS_AS: PodOwner = "appraisal";

export { podFetch, podUrl };

let started: Promise<string> | undefined;

/** Configure the runtime and mount the demo, once per page. Resolves with the demo's day 1. */
export function startDemo(): Promise<string> {
  started ??= (async () => {
    configure({ app: APP, registry: ORGS, seed: mortgageSeed() });
    const info = await ready();
    const calendar = createDemoCalendar(info.dayOne);
    await mountDemo({
      app: APP,
      calendar: { dayOf: (date) => calendar.dayOf(date), label: (day) => calendar.label(day) },
      holder: MORTGAGE_HOLDER,
      lens: mortgageLens(),
      registry: ORGS,
      runtime: { onEvent, resetDemo, setTourContext: trackTourContext(setTourContext) },
      tour: mortgageTour(),
    });
    return info.dayOne;
  })();
  return started;
}

/** A World on `day`: the demo clock moves there first, so the Lens shows the right date. */
export async function worldOn(day: number): Promise<World> {
  const dayOne = await startDemo();
  await setDay(day);
  return createBrowserWorld({ actsAs: ACTS_AS, day, dayOne, note, podFetch });
}

/** What a read or an action ended in. A 401 or 403 is a refusal by the pod, shown as such. */
export type Outcome<T> =
  | { state: "loading" }
  | { state: "ok"; value: T }
  | { state: "refused"; status: number; method: string; url: string }
  | { state: "error"; message: string };

export function outcomeOf<T>(error: unknown): Outcome<T> {
  if (error instanceof PodRequestError && (error.status === 401 || error.status === 403)) {
    return { method: error.method, state: "refused", status: error.status, url: error.url };
  }
  return { message: error instanceof Error ? error.message : String(error), state: "error" };
}

/** Which pods' changes make a screen read again. */
export type Watch = readonly PodOwner[];

/** Read pod state, and read it again when a watched pod changes or the demo restarts. */
export function usePodState<T>(
  load: () => Promise<T>,
  watch: Watch,
  deps: readonly unknown[] = [],
) {
  const [outcome, setOutcome] = useState<Outcome<T>>({ state: "loading" });
  const loadRef = useRef(load);
  loadRef.current = load;
  const generation = useRef(0);
  const reload = useCallback(() => {
    const mine = ++generation.current;
    loadRef
      .current()
      .then((value) => {
        if (mine === generation.current) setOutcome({ state: "ok", value });
      })
      .catch((error: unknown) => {
        if (mine === generation.current) setOutcome(outcomeOf<T>(error));
      });
  }, []);
  useEffect(() => {
    reload();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(reload, 150);
    };
    const stopEvents = onEvent((entry) => {
      if (
        entry.source === "pod" &&
        entry.kind !== "read" &&
        entry.kind !== "denied" &&
        watch.includes(entry.pod as PodOwner)
      )
        soon();
    });
    const stopReset = onReset(reload);
    return () => {
      clearTimeout(timer);
      stopEvents();
      stopReset();
    };
    // biome-ignore lint/correctness/useExhaustiveDependencies: the caller's inputs, as in useEffect
  }, deps);
  return { outcome, reload };
}

/** Run an action; a pod refusal ends as `refused`, never as a silent failure. */
export function useAction() {
  const [outcome, setOutcome] = useState<Outcome<true> | { state: "idle" } | { state: "running" }>({
    state: "idle",
  });
  const run = useCallback(async (action: () => Promise<unknown>) => {
    setOutcome({ state: "running" });
    try {
      await action();
      setOutcome({ state: "ok", value: true });
    } catch (error) {
      console.error(error);
      setOutcome(outcomeOf<true>(error));
    }
  }, []);
  return { outcome, run };
}

/**
 * Free play: run the journey's earlier beats, in order, so this screen has something to work on.
 * The two pre-qualification proof beats (steps 5 and 6) are skipped: nothing later depends on
 * them, and the proof belongs on the wallet's isolated route.
 */
export const SKIPPED_IN_CATCH_UP: ReadonlySet<string> = new Set([
  "wallet-prove",
  "lender-b-received",
]);

/** The journey functions, loaded when an action first needs them (they carry the credential kit). */
export const journey = () => import("@mortgage/content/mortgage/journey");

export async function beatsBefore(step: string) {
  const { JOURNEY } = await journey();
  const index = JOURNEY.findIndex((beat) => beat.step === step);
  if (index < 0) throw new Error(`no beat belongs to step ${step}`);
  return JOURNEY.slice(0, index).filter((beat) => !SKIPPED_IN_CATCH_UP.has(beat.step));
}

/** How many tour steps the catch-up runs before `step`. */
export function stepsBefore(step: string): number {
  const index = TOUR.findIndex((s) => s.id === step);
  return TOUR.slice(0, Math.max(index, 0)).filter((s) => !SKIPPED_IN_CATCH_UP.has(s.id)).length;
}

/**
 * Where a catch-up run is. It lives outside React so a screen that re-renders mid-run (the
 * condition that offered the catch-up becomes false as soon as an early beat lands) still shows
 * the progress, and step buttons stay disabled until the run is over.
 */
export interface CatchUpState {
  readonly running: boolean;
  readonly beat?: string;
  readonly error?: string;
}

let catchUpState: CatchUpState = { running: false };
const catchUpListeners = new Set<() => void>();

function setCatchUp(next: CatchUpState): void {
  catchUpState = next;
  for (const listener of catchUpListeners) listener();
}

function subscribeCatchUp(listener: () => void): () => void {
  catchUpListeners.add(listener);
  return () => catchUpListeners.delete(listener);
}

export function useCatchUp(): CatchUpState {
  return useSyncExternalStore(subscribeCatchUp, () => catchUpState);
}

/** Restart the demo from its seed, then run every earlier beat: the same order every time. */
export async function catchUpTo(step: string): Promise<void> {
  if (catchUpState.running) return;
  setCatchUp({ beat: "restarting", running: true });
  try {
    await resetDemo();
    for (const beat of await beatsBefore(step)) {
      setCatchUp({ beat: beat.name, running: true });
      await beat.run(await worldOn(beat.day));
    }
    setCatchUp({ running: false });
  } catch (error) {
    setCatchUp({ error: error instanceof Error ? error.message : String(error), running: false });
  }
}
