// AUTHORED-BY Claude Opus 5.5
/**
 * Finchly Loans's link to the pods: the runtime configured as this app, the small-dollar lending
 * demo mounted (Lens, step card), worlds acting as Finchly Loans with the story prepared, and the
 * shared pod hooks. Every page of this app belongs to the lending demo.
 */
import { mortgageSeed, trackTourContext } from "@mortgage/content/mortgage/browser";
import { refusalOf } from "@mortgage/content/mortgage/reads";
import type { World } from "@mortgage/content/mortgage/world";
import { ORGS } from "@mortgage/content/orgs";
import { lendingPages } from "@mortgage/content/small-dollar-lending/browser";
import {
  SMALL_DOLLAR_HOLDER,
  smallDollarLens,
  smallDollarTour,
} from "@mortgage/content/small-dollar-lending/mount";
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

export const APP = "fintech-lender" as const;
export const ACTS_AS: PodOwner = "fintech-lender";

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
      holder: SMALL_DOLLAR_HOLDER,
      lens: smallDollarLens(),
      registry: ORGS,
      runtime: { onEvent, resetDemo, setTourContext: trackTourContext(setTourContext) },
      tour: smallDollarTour(),
    });
    return info.dayOne;
  })();
  return started;
}

const pages = lendingPages({ note, podFetch, ready, setDay }, ACTS_AS);

/** A World acting as Finchly Loans on `day` (the clock moves there), the story prepared. */
export async function appWorld(day?: number): Promise<World> {
  await startDemo();
  return pages(day);
}

export const { useAction, usePodState } = createPodHooks<PodOwner>({
  events: { onEvent, onReset },
  refusalOf,
});

/** The journey functions, loaded when a screen first needs them (they carry the credential kit). */
export const journey = () => import("@mortgage/content/small-dollar-lending/journey");
