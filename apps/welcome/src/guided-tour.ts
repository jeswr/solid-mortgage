// AUTHORED-BY Claude Opus 5.5
/**
 * The welcome page's link to the pods, loaded after the first render (it carries the pod runtime,
 * the seed, the tour and the Lens, which the front door's first load does not): the tour and the
 * Solid Lens mounted like every organisation app, "Try it yourself" restarting the demo from its
 * seed before the tour opens, and the journey ledger fed from the pods' request log.
 */
import { mortgageSeed, trackTourContext } from "@mortgage/content/mortgage/browser";
import { MORTGAGE_HOLDER, mortgageLens, mortgageTour } from "@mortgage/content/mortgage/mount";
import { TOUR } from "@mortgage/content/mortgage/tour";
import { ORGS } from "@mortgage/content/orgs";
import { createDemoCalendar } from "@mortgage/demo-kit/calendar";
import { defineJourneyLedger, type JourneyLedger } from "@mortgage/lens";
import {
  configure,
  onEvent,
  onReset,
  ready,
  resetDemo,
  setTourContext,
} from "@mortgage/pod-runtime";
import { mountDemo } from "@mortgage/tour/mount";

const APP = "welcome" as const;

let started: Promise<string> | undefined;

/** Configure the pod runtime as the welcome page and wait for the pods. Resolves with day 1. */
function startPods(): Promise<string> {
  started ??= (async () => {
    configure({ app: APP, registry: ORGS, seed: mortgageSeed() });
    return (await ready()).dayOne;
  })();
  return started;
}

/** The demo calendar from day 1, as the Lens and the ledger show dates. */
async function calendar() {
  const days = createDemoCalendar(await startPods());
  return { dayOf: (date: string) => days.dayOf(date), label: (day: number) => days.label(day) };
}

/** Mount the tour's step card and the Solid Lens on this page. */
export async function mountGuidedTour(): Promise<void> {
  await mountDemo({
    app: APP,
    calendar: await calendar(),
    holder: MORTGAGE_HOLDER,
    lens: mortgageLens(),
    registry: ORGS,
    runtime: { onEvent, resetDemo, setTourContext: trackTourContext(setTourContext) },
    tour: mortgageTour(),
  });
}

/** Restart the demo from its seed (fresh data), then open the tour at `href`. */
export async function startFresh(href: string): Promise<void> {
  await startPods();
  await resetDemo();
  window.location.assign(href);
}

/**
 * Render the journey ledger (`<journey-ledger>` from `@mortgage/lens`) into `mount`, fed with
 * every entry of the pods' request log, now and as it grows; a restart of the demo empties it.
 * `onChange` hears whether the log has any entry. Returns the unsubscribe.
 */
export async function mountJourneyLedger(
  mount: HTMLElement,
  onChange: (hasEntries: boolean) => void,
): Promise<() => void> {
  defineJourneyLedger();
  const ledger = document.createElement("journey-ledger") as JourneyLedger;
  const config = {
    ...mortgageLens(),
    app: APP,
    calendar: await calendar(),
    holder: MORTGAGE_HOLDER,
    registry: ORGS,
  };
  const options = {
    headingLevel: 2 as const,
    steps: TOUR.map((step) => ({
      chapter: step.chapter,
      id: step.id,
      title: step.title,
      ...(step.clock ? { day: step.clock.day } : {}),
    })),
  };
  ledger.configure(config, options);
  mount.append(ledger);
  let entries = 0;
  const stopEvents = onEvent(
    (entry) => {
      ledger.push(entry, { replayed: true });
      if (entries++ === 0) onChange(true);
    },
    { replay: true },
  );
  const stopReset = onReset(() => {
    entries = 0;
    ledger.configure(config, options);
    onChange(false);
  });
  return () => {
    stopEvents();
    stopReset();
    ledger.remove();
  };
}
