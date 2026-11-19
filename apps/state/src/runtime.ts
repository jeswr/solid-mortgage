// AUTHORED-BY Claude Opus 5.5
/**
 * State Online Services' link to the pods: the runtime configured as this app, the moving-house
 * demo mounted (Lens, step card), a `World` on the step's day, and the shared pod hooks.
 */
import { mortgageSeed, trackTourContext } from "@mortgage/content/mortgage/browser";
import { refusalOf } from "@mortgage/content/mortgage/reads";
import type { World } from "@mortgage/content/mortgage/world";
import { movingHouseWorld } from "@mortgage/content/moving-house/browser";
import { DAY } from "@mortgage/content/moving-house/facts";
import {
  MOVING_HOUSE_HOLDER,
  movingHouseLens,
  movingHouseTour,
} from "@mortgage/content/moving-house/mount";
import { ORGS } from "@mortgage/content/orgs";
import {
  isSmallBusinessLoanPage,
  LOAN_COMPLIANCE,
  SMALL_BUSINESS_LOAN_HOLDER,
  smallBusinessLoanLens,
  smallBusinessLoanTour,
} from "@mortgage/content/small-business-loan/mount";
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

export const APP = "state" as const;
export const ACTS_AS: PodOwner = "state";

export type { Outcome } from "@mortgage/demo-kit/react";

let started: Promise<string> | undefined;

/** Configure the runtime and mount the demo, once per page. Resolves with the demo's day 1. */
export function startDemo(): Promise<string> {
  started ??= (async () => {
    configure({ app: APP, registry: ORGS, seed: mortgageSeed() });
    const info = await ready();
    const calendar = createDemoCalendar(info.dayOne);
    const common = {
      app: APP,
      calendar: {
        dayOf: (date: string) => calendar.dayOf(date),
        label: (day: number) => calendar.label(day),
      },
      registry: ORGS,
      runtime: { onEvent, resetDemo, setTourContext: trackTourContext(setTourContext) },
    };
    // The Department of Revenue's business page (src/sections/small-business-loan/) belongs to the
    // small business loan; every other page to the moving-house demo.
    await mountDemo(
      isSmallBusinessLoanPage(location.pathname, APP, location.search)
        ? {
            ...common,
            holder: SMALL_BUSINESS_LOAN_HOLDER,
            ledger: { compliance: [...LOAN_COMPLIANCE] },
            lens: smallBusinessLoanLens(),
            tour: smallBusinessLoanTour(),
          }
        : {
            ...common,
            holder: MOVING_HOUSE_HOLDER,
            lens: movingHouseLens(),
            tour: movingHouseTour(),
          },
    );
    return info.dayOne;
  })();
  return started;
}

/** A World acting as the state on `day` (Driver Services works on the day after closing). */
export async function stateWorld(day: number = DAY.moved): Promise<World> {
  await startDemo();
  return movingHouseWorld({ note, podFetch, ready, setDay }, ACTS_AS, day);
}

export const { useAction, usePodState } = createPodHooks<PodOwner>({
  events: { onEvent, onReset },
  refusalOf,
});

/** The journey functions, loaded when a screen first needs them (they carry the credential kit). */
export const journey = () => import("@mortgage/content/moving-house/journey");
