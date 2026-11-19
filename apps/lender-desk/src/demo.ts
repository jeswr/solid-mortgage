// AUTHORED-BY Claude Opus 5.5
/**
 * The Loan Desk's wiring to the pod runtime and the mortgage journey. Every button calls a
 * journey function from `@mortgage/content/mortgage/journey` with a `World` built by the shared
 * browser module, on the step's simulated day. Screens read through `podFetch` only.
 */
import {
  createBrowserWorld,
  mortgageSeed,
  trackTourContext,
} from "@mortgage/content/mortgage/browser";
import type { World } from "@mortgage/content/mortgage/world";
import { ORGS } from "@mortgage/content/orgs";
import { configure, note, podFetch, ready, setDay, setTourContext } from "@mortgage/pod-runtime";

export const APP = "lender-desk" as const;
/** The pod the desk acts as: Juniper Home Loans (one organisation, one WebID). */
export const ACTS_AS = ORGS[APP].actsAs;

let configured = false;
/** Day 1 of the demo calendar, as the runtime reported it. */
let dayOne: string | undefined;

/** Configure the runtime once and resolve when the pods are seeded and the page is controlled. */
export async function startRuntime(): ReturnType<typeof ready> {
  if (!configured) {
    configure({ app: APP, registry: ORGS, seed: mortgageSeed() });
    configured = true;
  }
  const info = await ready();
  dayOne = info.dayOne;
  return info;
}

/**
 * The runtime's `setTourContext`, tracked so that requests the journey makes for another
 * organisation carry the same tour tag. Pass it to `mountDemo`.
 */
export const tourContext = trackTourContext(setTourContext);

/** The journey's world on simulated day `day`, acting as Juniper. */
export function worldOn(day: number): World {
  return createBrowserWorld({
    actsAs: ACTS_AS,
    day,
    note,
    podFetch,
    ...(dayOne === undefined ? {} : { dayOne }),
  });
}

/** Move the demo clock to `day`, then run a journey function there. */
export async function runOn<T>(day: number, step: (world: World) => Promise<T>): Promise<T> {
  await setDay(day);
  return step(worldOn(day));
}
