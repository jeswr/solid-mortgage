// AUTHORED-BY Claude Opus 5.5
/**
 * Shared steps for this app's Playwright suite. Pod reads go through the page's own origin, so
 * the REAL service-worker pods answer them, and the pod server checks access for the owner the
 * request names (path mode's `x-demo-agent`). Nothing is mocked.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** GET a pod resource as `owner` (or anonymously with `null`) from inside the page. */
export async function readAs(
  page: Page,
  owner: string | null,
  path: string,
): Promise<{ status: number; body: string }> {
  return page.evaluate(
    async ({ owner, path }) => {
      const headers: Record<string, string> = { accept: "text/turtle" };
      if (owner !== null) headers["x-demo-agent"] = owner;
      const response = await fetch(`/pods/${path}`, { credentials: "omit", headers });
      return { body: await response.text(), status: response.status };
    },
    { owner, path },
  );
}

/** axe, WCAG 2.1 AA. */
export async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .exclude("solid-lens")
    .analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

/** No horizontal scroll at a 390 px phone width. */
export async function expectNoSideScroll(page: Page): Promise<void> {
  const size = page.viewportSize();
  await page.setViewportSize({ height: 844, width: 390 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  if (size !== null) await page.setViewportSize(size);
}

/** Free play: restart the demo and run the earlier steps, then wait until that has finished. */
export async function catchUp(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Restart and run the earlier steps" }).click();
  await expect(page.getByRole("heading", { name: "Catching up" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Catching up" })).toHaveCount(0, {
    timeout: 200_000,
  });
  // A failed run leaves the panel with an alert.
  await expect(page.locator(".catch-up [role=alert]")).toHaveCount(0);
}

/** Let the demo start (seeded pods, service worker in control). */
export async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, undefined, {
    timeout: 60_000,
  });
}
