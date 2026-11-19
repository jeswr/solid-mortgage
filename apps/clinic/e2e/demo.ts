// AUTHORED-BY Claude Opus 5.5
/**
 * Driving the medication-handover tour from a test, through the tour engine's own `window.__demo`
 * (packages/tour/src/mount.ts): `goto` opens a step (navigating to its app when needed) and
 * `act` presses the step's tour button, exactly as "Do it for me" does.
 */
import { expect, type Page } from "@playwright/test";

interface DemoWindow {
  __demo?: {
    goto(step: string): Promise<void>;
    act(): Promise<string>;
    state(): { step?: string; done: string[]; mode: string } | undefined;
  };
}

/** Wait until this page's tour engine is mounted and on `step`. */
export async function onStep(page: Page, step: string): Promise<void> {
  await page.waitForFunction((id) => (window as DemoWindow).__demo?.state()?.step === id, step, {
    timeout: 90_000,
  });
}

/** Wait until the tour has marked `step` done. */
export async function stepDone(page: Page, step: string, timeout = 180_000): Promise<void> {
  await page.waitForFunction(
    (id) => (window as DemoWindow).__demo?.state()?.done.includes(id) === true,
    step,
    { timeout },
  );
}

/**
 * Open a tour step: the engine moves the clock and navigates to the step's page, `/<app>/<path>`
 * (the old page's engine already reports the new step, so the URL is what tells them apart).
 */
export async function gotoStep(page: Page, step: string, at: string): Promise<void> {
  // Not awaited inside the page: the engine navigates, which ends this evaluation.
  await page.evaluate((id) => {
    void (window as DemoWindow).__demo?.goto(id);
  }, step);
  await page.waitForURL((url) => url.pathname.replace(/\/$/, "") === at, { timeout: 60_000 });
  await onStep(page, step);
}

/** "Do it for me": the engine clicks the step's tour button; resolves when the step is done. */
export async function act(page: Page, step: string): Promise<void> {
  const target = await page.evaluate(() => (window as DemoWindow).__demo?.act());
  expect(target).toBe("clicked");
  await stepDone(page, step);
}

/** Start the medication-handover tour fresh at its first step, in Rosa's wallet. */
export async function startTour(page: Page): Promise<void> {
  await page.goto("/wallet/health?tour=medication-handover&step=health");
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, undefined, {
    timeout: 60_000,
  });
  await onStep(page, "health");
}

/** Steps 1 to 3 by the tour's own buttons: the ward signs, then Rosa approves the sharing. */
export async function throughGrants(page: Page): Promise<void> {
  await startTour(page);
  await gotoStep(page, "discharge", "/hospital/discharge");
  await act(page, "discharge");
  await gotoStep(page, "grants", "/wallet/health/requests");
  await act(page, "grants");
}
