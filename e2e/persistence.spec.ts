// AUTHORED-BY Claude Opus 5.5
/**
 * Acceptance test 7 (build-plan.md §4, design.md §d.2): reload mid-tour, and stop the service
 * worker mid-tour; the pods, the event log and the tour state survive, and the tour resumes.
 */
import { expect, type Page, test } from "@playwright/test";
import { appActingAs, podOwners } from "./support/journey.ts";
import { isAclPath, isOk, isPodEntry, podLogSoon, podRelative, podRequest } from "./support/pod.ts";
import { waitForRuntime } from "./support/site.ts";
import { loadMortgageTour } from "./support/tour-content.ts";
import { tourState, walkTour } from "./support/walk.ts";

interface Snapshot {
  state: unknown;
  log: unknown[];
  resources: Record<string, { status: number; body: string }>;
}

async function snapshot(page: Page): Promise<Snapshot> {
  const log = await podLogSoon(page);
  const written = new Map<string, { owner: string; path: string }>();
  for (const e of log.filter(isPodEntry)) {
    const path = podRelative(e.path, e.pod);
    if (e.kind === "write" && isOk(e.status) && !isAclPath(path) && !path.endsWith("/")) {
      written.set(`${e.pod} ${path}`, { owner: e.pod, path });
    }
  }
  const resources: Snapshot["resources"] = {};
  for (const [key, { owner, path }] of written) {
    const owned = owner as Parameters<typeof appActingAs>[0];
    const response = await podRequest(page, appActingAs(owned), owned, path);
    resources[key] = { body: response.body, status: response.status };
  }
  return {
    log,
    resources,
    state: await tourState(page),
  };
}

test("7 Persistence: reload and a stopped service worker keep state, and the tour resumes", async ({
  page,
  context,
}) => {
  test.setTimeout(30 * 60_000);
  const tour = await loadMortgageTour();
  const middle = Math.floor(tour.steps.length / 2);
  const first = await walkTour(page, tour, { to: middle });
  expect(first.error, `walking to step ${middle}`).toBeUndefined();
  expect(podOwners().length).toBeGreaterThan(1);

  const before = await snapshot(page);
  expect(Object.keys(before.resources).length, "resources written so far").toBeGreaterThan(0);

  // 1. Reload.
  await page.reload();
  await waitForRuntime(page, { tour: true });
  const afterReload = await snapshot(page);
  expect(afterReload.state, "tour state after reload").toEqual(before.state);
  expect(afterReload.log.slice(0, before.log.length), "event log after reload").toEqual(before.log);
  expect(afterReload.resources, "pod resources after reload").toEqual(before.resources);

  // 2. Stop the service worker (as the browser does to an idle worker), then use the pods again.
  const cdp = await context.newCDPSession(page);
  await cdp.send("ServiceWorker.enable");
  await cdp.send("ServiceWorker.stopAllWorkers");
  await page.waitForTimeout(500);
  const afterStop = await snapshot(page);
  expect(afterStop.state, "tour state after the worker stopped").toEqual(before.state);
  expect(afterStop.log.slice(0, before.log.length), "event log after the worker stopped").toEqual(
    before.log,
  );
  expect(afterStop.resources, "pod resources after the worker stopped").toEqual(before.resources);

  // 3. The tour resumes: the next step completes from here.
  const resumed = await walkTour(page, tour, { from: middle, open: false, to: middle + 1 });
  expect(resumed.error, `resuming at step ${middle + 1}`).toBeUndefined();
  expect(resumed.windows[0]?.completed).toBe(true);
  expect(resumed.windows[0]?.missing, "expect items of the resumed step").toEqual([]);
});
