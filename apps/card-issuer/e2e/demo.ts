// AUTHORED-BY Claude Opus 5.5
/**
 * Driving the reusable-KYC tour from a test, through the tour engine's own `window.__demo`
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

const trim = (path: string) => path.replace(/\/$/, "");

/** Open a tour step: the engine moves the clock and navigates to `/<app>/<path>` if needed. */
export async function gotoStep(page: Page, step: string, at: string): Promise<void> {
  // Not awaited inside the page: the engine may navigate, which ends this evaluation.
  await page.evaluate((id) => {
    void (window as DemoWindow).__demo?.goto(id);
  }, step);
  await page.waitForURL((url) => trim(url.pathname) === at, { timeout: 60_000 });
  await onStep(page, step);
}

/** "Do it for me": the engine clicks the step's tour button; resolves when the step is done. */
export async function act(page: Page, step: string): Promise<void> {
  const target = await page.evaluate(() => (window as DemoWindow).__demo?.act());
  expect(target).toBe("clicked");
  await stepDone(page, step);
}

/**
 * "Do it for me" on step 2, which hands over to Alex's wallet: Pennant sends the request, the
 * wallet's consent screen opens and the tour's cursor approves, then the wallet returns to
 * Pennant. The click is not awaited inside the page, since the page navigates away.
 */
export async function actThroughWallet(page: Page, step: string): Promise<void> {
  await page.evaluate(() => {
    void (window as DemoWindow).__demo?.act();
  });
  await page.waitForURL((url) => trim(url.pathname) === "/wallet/kyc/consent", {
    timeout: 60_000,
  });
  await page.waitForURL((url) => trim(url.pathname) === "/card-issuer/apply", {
    timeout: 120_000,
  });
  await stepDone(page, step);
}

/** Start the reusable-KYC tour fresh at its first step, on Alder Bank's identity page. */
export async function startTour(page: Page): Promise<void> {
  await page.goto("/bank/kyc?tour=reusable-kyc&step=attestation");
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, undefined, {
    timeout: 60_000,
  });
  await onStep(page, "attestation");
}

/** The Alex WebID-relative pod path of the statement, and Pennant's WebID. */
export const STATEMENT = "alex/credentials/kyc-attestation";
export const PENNANT = "/pods/card-issuer/profile/card#me";
