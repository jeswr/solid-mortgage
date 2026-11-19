// AUTHORED-BY Claude Opus 5.5
/**
 * Sextant's link to the pods: the runtime configured as this app, the demo mounted (Lens, step
 * card, view transitions), a `World` for the journey functions, and the shared hooks
 * (`@mortgage/demo-kit/react`) bound to this runtime: read pod state, run an action that the pod
 * may refuse, and free play's catch-up.
 */
import {
  createBrowserWorld,
  mortgageSeed,
  trackTourContext,
} from "@mortgage/content/mortgage/browser";
import { beatsBefore } from "@mortgage/content/mortgage/catch-up";
import { MORTGAGE_HOLDER, mortgageLens, mortgageTour } from "@mortgage/content/mortgage/mount";
import { refusalOf } from "@mortgage/content/mortgage/reads";
import type { World } from "@mortgage/content/mortgage/world";
import { ORGS } from "@mortgage/content/orgs";
import { createDemoCalendar } from "@mortgage/demo-kit/calendar";
import { createCatchUp, createPodHooks } from "@mortgage/demo-kit/react";
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

export const APP = "title" as const;
export const ACTS_AS: PodOwner = "title";

export { beatsBefore, SKIPPED_IN_CATCH_UP, stepsBefore } from "@mortgage/content/mortgage/catch-up";
export type { CatchUpState, Outcome } from "@mortgage/demo-kit/react";
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

/** Which pods' changes make a screen read again. */
export type Watch = readonly PodOwner[];

export const { outcomeOf, useAction, usePodState } = createPodHooks<PodOwner>({
  events: { onEvent, onReset },
  refusalOf,
});

/** The journey functions, loaded when an action first needs them (they carry the credential kit). */
export const journey = () => import("@mortgage/content/mortgage/journey");

/** Free play: restart the demo from its seed, then run every earlier beat, in order. */
export const { catchUpTo, useCatchUp } = createCatchUp({
  async beatsBefore(step) {
    return (await beatsBefore(step)).map((beat) => ({
      name: beat.name,
      run: async () => beat.run(await worldOn(beat.day)),
    }));
  },
  reset: resetDemo,
});
