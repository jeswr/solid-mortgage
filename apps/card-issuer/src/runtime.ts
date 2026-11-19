// AUTHORED-BY Claude Opus 5.5
/**
 * Pennant Card's link to the pods: the runtime configured as this app, the reusable-KYC demo
 * mounted (Lens, step card), a `World` acting as Pennant on the step's day, and the shared pod
 * hooks. Every page of this app belongs to the reusable-KYC demo.
 */
import { mortgageSeed, trackTourContext } from "@mortgage/content/mortgage/browser";
import { refusalOf } from "@mortgage/content/mortgage/reads";
import type { World } from "@mortgage/content/mortgage/world";
import { ORGS } from "@mortgage/content/orgs";
import { reusableKycWorld } from "@mortgage/content/reusable-kyc/browser";
import { DAY } from "@mortgage/content/reusable-kyc/facts";
import {
  REUSABLE_KYC_HOLDER,
  reusableKycLens,
  reusableKycTour,
} from "@mortgage/content/reusable-kyc/mount";
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

export const APP = "card-issuer" as const;
export const ACTS_AS: PodOwner = "card-issuer";

export type { Outcome } from "@mortgage/demo-kit/react";

let started: Promise<string> | undefined;
let tourMode: () => string | undefined = () => undefined;

/** Configure the runtime and mount the demo, once per page. Resolves with the demo's day 1. */
export function startDemo(): Promise<string> {
  started ??= (async () => {
    configure({ app: APP, registry: ORGS, seed: mortgageSeed() });
    const info = await ready();
    const calendar = createDemoCalendar(info.dayOne);
    const { tour } = await mountDemo({
      app: APP,
      calendar: { dayOf: (date) => calendar.dayOf(date), label: (day) => calendar.label(day) },
      holder: REUSABLE_KYC_HOLDER,
      lens: reusableKycLens(),
      registry: ORGS,
      runtime: { onEvent, resetDemo, setTourContext: trackTourContext(setTourContext) },
      tour: reusableKycTour(),
    });
    if (tour !== undefined) tourMode = () => tour.mode;
    return info.dayOne;
  })();
  return started;
}

/** Is the tour presenting (the recorder's mode)? Then the wallet hand-off approves by itself. */
export function presenting(): boolean {
  return tourMode() === "present";
}

/** A World acting as Pennant on the day Alex applies. */
export async function cardWorld(): Promise<World> {
  await startDemo();
  return reusableKycWorld({ note, podFetch, ready, setDay }, ACTS_AS, DAY.apply);
}

export const { useAction, usePodState } = createPodHooks<PodOwner>({
  events: { onEvent, onReset },
  refusalOf,
});

export { onReset };

/** The journey functions, loaded when a screen first needs them (they carry the credential kit). */
export const journey = () => import("@mortgage/content/reusable-kyc/journey");
