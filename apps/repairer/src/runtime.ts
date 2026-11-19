// AUTHORED-BY Claude Opus 5.5
/**
 * Anvil Collision Repair's link to the pods: the runtime configured as this app, the motor-claim
 * demo mounted (Lens, step card), a `World` acting as the repairer, and the shared pod hooks.
 */
import { mortgageSeed, trackTourContext } from "@mortgage/content/mortgage/browser";
import { refusalOf } from "@mortgage/content/mortgage/reads";
import type { World } from "@mortgage/content/mortgage/world";
import { motorClaimWorld } from "@mortgage/content/motor-claim/browser";
import {
  MOTOR_CLAIM_HOLDER,
  motorClaimLens,
  motorClaimTour,
} from "@mortgage/content/motor-claim/mount";
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

export const APP = "repairer" as const;
export const ACTS_AS: PodOwner = "repairer";

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
      holder: MOTOR_CLAIM_HOLDER,
      lens: motorClaimLens(),
      registry: ORGS,
      runtime: { onEvent, resetDemo, setTourContext: trackTourContext(setTourContext) },
      tour: motorClaimTour(),
    });
    return info.dayOne;
  })();
  return started;
}

/**
 * A World acting as the repairer. With a day, the demo clock moves there first (an action);
 * without one (reading Anvil's own records) the clock is left where it is.
 */
export async function repairerWorld(day?: number): Promise<World> {
  await startDemo();
  return motorClaimWorld({ note, podFetch, ready, setDay }, ACTS_AS, day);
}

export const { useAction, usePodState } = createPodHooks<PodOwner>({
  events: { onEvent, onReset },
  refusalOf,
});

/** The journey functions, loaded when a screen first needs them (they carry the credential kit). */
export const journey = () => import("@mortgage/content/motor-claim/journey");
