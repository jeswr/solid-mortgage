// AUTHORED-BY Claude Opus 5.5
/**
 * Riverbend General Hospital's link to the pods: the runtime configured as this app, the medication-handover
 * demo mounted (Lens, step card), a `World` on the step's day (the pods brought to the demo's
 * start first), and the shared pod hooks.
 */
import { medicationWorld } from "@mortgage/content/medication-handover/browser";
import {
  MEDICATION_HOLDER,
  medicationLens,
  medicationTour,
} from "@mortgage/content/medication-handover/mount";
import { mortgageSeed, trackTourContext } from "@mortgage/content/mortgage/browser";
import { refusalOf } from "@mortgage/content/mortgage/reads";
import type { World } from "@mortgage/content/mortgage/world";
import { ORGS } from "@mortgage/content/orgs";
import { createDemoCalendar } from "@mortgage/demo-kit/calendar";
import { createPodHooks } from "@mortgage/demo-kit/react";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import {
  configure,
  note,
  onEvent,
  onReset,
  podFetch,
  ready,
  resetDemo,
  setDay,
  setTourContext,
} from "@mortgage/pod-runtime";
import { mountDemo } from "@mortgage/tour/mount";

export const APP = "hospital" as const;
export const ACTS_AS: PodOwner = "hospital";

export type { Outcome } from "@mortgage/demo-kit/react";

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
      holder: MEDICATION_HOLDER,
      lens: medicationLens(),
      registry: ORGS,
      runtime: { onEvent, resetDemo, setTourContext: trackTourContext(setTourContext) },
      tour: medicationTour(),
    });
    return info.dayOne;
  })();
  return started;
}

/**
 * A World acting as this app's organisation. With `day`, the demo clock moves there first (an
 * action on its own day); without, the clock stays where the tour put it (a read).
 */
export async function appWorld(day?: number): Promise<World> {
  await startDemo();
  return medicationWorld({ note, podFetch, ready, setDay }, ACTS_AS, day);
}

export const { useAction, usePodState } = createPodHooks<PodOwner>({
  events: { onEvent, onReset },
  refusalOf,
});

/** The journey functions, loaded when a screen first needs them. */
export const journey = () => import("@mortgage/content/medication-handover/journey");
