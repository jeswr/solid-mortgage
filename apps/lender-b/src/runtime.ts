// AUTHORED-BY Claude Opus 5.5
/**
 * Copperfield reaches the pods through the shared browser world (one seed and one key store for
 * every app, `@mortgage/content/mortgage/browser`). It acts only as itself: it has no grant in
 * Alex's pod, and every read here is of its own pod.
 */
import { createBrowserWorld, mortgageSeed } from "@mortgage/content/mortgage/browser";
import { DAY } from "@mortgage/content/mortgage/facts";
import type { World } from "@mortgage/content/mortgage/world";
import { ORGS } from "@mortgage/content/orgs";
import { createDemoCalendar, type DemoCalendar } from "@mortgage/demo-kit/calendar";
import { configure, note, podFetch, ready } from "@mortgage/pod-runtime";

export const APP = "lender-b" as const;

let calendarValue: DemoCalendar | undefined;
let starting: Promise<DemoCalendar> | undefined;

export function start(): Promise<DemoCalendar> {
  starting ??= (async () => {
    configure({ app: APP, registry: ORGS, seed: mortgageSeed() });
    const info = await ready();
    calendarValue = createDemoCalendar(info.dayOne);
    return calendarValue;
  })();
  return starting;
}

export function calendar(): DemoCalendar {
  calendarValue ??= createDemoCalendar();
  return calendarValue;
}

/** Pre-qualification happens on day 1 of the story. */
export function world(): World {
  return createBrowserWorld({
    actsAs: APP,
    day: DAY.credentials,
    dayOne: calendar().dayOne,
    note,
    podFetch,
  });
}
