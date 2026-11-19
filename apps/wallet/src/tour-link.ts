// AUTHORED-BY Claude Opus 5.5
/**
 * The wallet's view of the guided tour: which step the visitor is on, and a way to carry on
 * "Do it for me" after a hand-off stand-in (Requests.tsx). main.tsx links the engine once
 * `mountDemo` has mounted it; until then, and outside the guided tour, there is no step.
 */
import type { TourEngine } from "@mortgage/tour";
import { useSyncExternalStore } from "react";

let engine: TourEngine | undefined;
const listeners = new Set<() => void>();
const notify = () => {
  for (const listener of listeners) listener();
};

export function linkTour(tour: TourEngine): void {
  engine?.removeEventListener("change", notify);
  engine = tour;
  tour.addEventListener("change", notify);
  notify();
}

/** The id of the step the visitor is on, in guided or present mode; otherwise undefined. */
export function currentStepId(): string | undefined {
  if (engine === undefined || engine.mode === "free") return undefined;
  return engine.current?.id;
}

/** Click the current step's target again with the tour's cursor ("Do it for me", continued). */
export function continueTour(): Promise<unknown> {
  return engine === undefined ? Promise.resolve() : engine.act();
}

export function useTourStep(): string | undefined {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    currentStepId,
    () => undefined,
  );
}
