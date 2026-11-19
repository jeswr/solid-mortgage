// AUTHORED-BY Claude Opus 5.5
/**
 * Brackenridge Bank's link to the pods: the runtime configured as this app, the business KYB
 * demo mounted (Lens, step card, examiner obligations), a `World` acting as the credit desk on the
 * step's day, and the shared pod hooks. Every page of this app belongs to the business KYB demo.
 */
import { kybWorld } from "@mortgage/content/business-kyb/browser";
import {
  BUSINESS_KYB_HOLDER,
  businessKybLens,
  businessKybTour,
  KYB_COMPLIANCE,
} from "@mortgage/content/business-kyb/mount";
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

export const APP = "business-lender" as const;
export const ACTS_AS: PodOwner = "business-lender";

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
      holder: BUSINESS_KYB_HOLDER,
      ledger: { compliance: [...KYB_COMPLIANCE] },
      lens: businessKybLens(),
      registry: ORGS,
      runtime: { onEvent, resetDemo, setTourContext: trackTourContext(setTourContext) },
      tour: businessKybTour(),
    });
    return info.dayOne;
  })();
  return started;
}

/** A World acting as the credit desk on `day` (or the runtime's day). */
export async function lenderWorld(day?: number): Promise<World> {
  await startDemo();
  return kybWorld({ note, podFetch, ready, setDay }, ACTS_AS, day);
}

export const { useAction, usePodState } = createPodHooks<PodOwner>({
  events: { onEvent, onReset },
  refusalOf,
});

/** The journey functions, loaded when a screen first needs them (they carry the credential kit). */
export const journey = () => import("@mortgage/content/business-kyb/journey");
export const proof = () => import("@mortgage/content/business-kyb/proof");
