// AUTHORED-BY Claude Opus 5.5
/**
 * How Juniper's portal reaches the pods: the shared browser world from
 * `@mortgage/content/mortgage/browser` (one seed, one key store, one World adapter for every
 * app), started once per page. Every button runs a journey function through `act(day, fn)`,
 * which moves the demo clock to the step's day first so the Lens dates the requests correctly.
 */
import { createBrowserWorld, mortgageSeed } from "@mortgage/content/mortgage/browser";
import type { World } from "@mortgage/content/mortgage/world";
import { ORGS } from "@mortgage/content/orgs";
import { createDemoCalendar, type DemoCalendar } from "@mortgage/demo-kit/calendar";
import { configure, note, podFetch, ready, setDay } from "@mortgage/pod-runtime";

export const APP = "lender" as const;

let calendarValue: DemoCalendar | undefined;
let starting: Promise<DemoCalendar> | undefined;

/** Configure and start the pod runtime (once per page). Resolves with the demo calendar. */
export function start(): Promise<DemoCalendar> {
  starting ??= (async () => {
    configure({ app: APP, registry: ORGS, seed: mortgageSeed() });
    const info = await ready();
    calendarValue = createDemoCalendar(info.dayOne);
    return calendarValue;
  })();
  return starting;
}

/** The demo calendar the runtime uses (day 1 is fixed when the pods were first seeded). */
export function calendar(): DemoCalendar {
  calendarValue ??= createDemoCalendar();
  return calendarValue;
}

/** The world on a given demo day, acting as Juniper. */
export function worldOn(day: number): World {
  return createBrowserWorld({ actsAs: APP, day, dayOne: calendar().dayOne, note, podFetch });
}

/** Run a journey function on its step's day. */
export async function act<T>(day: number, step: (world: World) => Promise<T>): Promise<T> {
  await setDay(day);
  return step(worldOn(day));
}
