// AUTHORED-BY Claude Opus 5.5
/**
 * Acceptance test 8 (build-plan.md §4, design.md §c.2): "Restart the demo" returns every pod to
 * its seed and clears the Lens; a second full run then passes.
 *
 * "Back to the seed" is judged two ways: the Alex-pod containers read the same as they did
 * before the first run (same browser, same per-visitor keys), and every resource the first run
 * wrote answers with the same status as on a freshly seeded browser.
 */
import { expect, type Page, test } from "@playwright/test";
import { appActingAs } from "./support/journey.ts";
import { describeEntry } from "./support/match.ts";
import { isAclPath, isOk, isPodEntry, podLogSoon, podRelative, podRequest } from "./support/pod.ts";
import { openApp, type PodOwner, siteOrigin, waitForRuntime } from "./support/site.ts";
import { loadMortgageTour } from "./support/tour-content.ts";
import { tourState, walkTour } from "./support/walk.ts";

const ALEX_CONTAINERS = [
  "/",
  "/identity/",
  "/credentials/",
  "/property/",
  "/mortgage/",
  "/insurance/",
  "/banking/",
  "/inbox/",
  "/policies/",
  "/consents/",
];

async function containers(page: Page): Promise<Record<string, { status: number; body: string }>> {
  const out: Record<string, { status: number; body: string }> = {};
  for (const path of ALEX_CONTAINERS) {
    const r = await podRequest(page, "wallet", "alex", path);
    out[path] = { body: r.body, status: r.status };
  }
  return out;
}

test("8 Reset: Restart the demo returns the pods to the seed and a second run passes", async ({
  page,
  browser,
}) => {
  test.setTimeout(60 * 60_000);
  const tour = await loadMortgageTour();
  const firstStep = tour.steps[0];
  if (firstStep === undefined) throw new Error("the tour has no steps");

  await openApp(page, "wallet");
  const seedContainers = await containers(page);

  const first = await walkTour(page, tour);
  expect(first.error, "first full run").toBeUndefined();
  const written = new Map<string, { owner: PodOwner; path: string }>();
  for (const e of (await podLogSoon(page)).filter(isPodEntry)) {
    const path = podRelative(e.path, e.pod);
    if (e.kind === "write" && isOk(e.status) && !isAclPath(path)) {
      written.set(`${e.pod} ${path}`, { owner: e.pod, path });
    }
  }
  expect(written.size, "resources the first run wrote").toBeGreaterThan(0);

  // Restart from the Lens (the visitor's control), accepting any confirmation.
  page.on("dialog", (dialog) => void dialog.accept());
  const restart = page
    .locator("solid-lens")
    .getByRole("button", { name: /restart/i })
    .first();
  await expect(restart, "the Lens's restart control").toBeVisible({ timeout: 15_000 });
  await restart.click();
  const confirm = page.getByRole("button", { name: /^(restart|yes|confirm)/i });
  if (
    await confirm
      .first()
      .isVisible()
      .catch(() => false)
  )
    await confirm.first().click();

  await expect
    .poll(async () => (await tourState(page))?.step, {
      message: "tour back at step 1",
      timeout: 30_000,
    })
    .toBe(firstStep.id);
  await waitForRuntime(page, { tour: true });
  await expect
    .poll(
      async () =>
        (await podLogSoon(page)).filter((e) => e.source === "pod" && e.kind !== "read").length,
      {
        message: "the event log is cleared (only the test's own reads may follow)",
        timeout: 30_000,
      },
    )
    .toBe(0);
  expect((await tourState(page))?.done ?? [], "no step done after restart").toEqual([]);

  expect(await containers(page), "Alex's containers equal their seed state").toEqual(
    seedContainers,
  );

  const fresh = await browser.newContext({ baseURL: `${siteOrigin()}/` });
  const freshPage = await fresh.newPage();
  await openApp(freshPage, "wallet");
  const differences: string[] = [];
  for (const { owner, path } of written.values()) {
    const reset = await podRequest(page, appActingAs(owner), owner, path);
    const seeded = await podRequest(freshPage, appActingAs(owner), owner, path);
    if (reset.status !== seeded.status) {
      differences.push(
        `${owner}:${path} answers ${reset.status} after restart, ${seeded.status} on a fresh seed`,
      );
    }
  }
  await fresh.close();
  expect(differences, "resources not returned to the seed").toEqual([]);

  const second = await walkTour(page, tour);
  const log = await podLogSoon(page).catch(() => []);
  expect(
    second.error,
    `second full run (last entries: ${log.slice(-5).map(describeEntry).join("; ")})`,
  ).toBeUndefined();
  const missing = second.windows
    .filter((w) => w.missing.length > 0)
    .map((w) => `${w.id}: ${w.missing.join(", ")}`);
  expect(missing, "expect items in the second run").toEqual([]);
});
