// AUTHORED-BY Claude Opus 5.5
/** Shared steps for the Loan Desk specs: the harness page, pod reads, axe and the 390 px check. */
import AxeBuilder from "@axe-core/playwright";
import { type BrowserContext, expect, type Page } from "@playwright/test";
import type { PodRead } from "./harness/api.ts";

/** Opens the harness in this context; its pods are the ones the app pages see. */
export async function openHarness(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  page.on("pageerror", (error) => console.error(`harness: ${error.message}`));
  await page.goto("/e2e-harness/");
  await expect(page.locator("#harness-state")).toHaveText("ready", { timeout: 90_000 });
  return page;
}

/** Plays journey beats that belong to other apps. */
export async function beats(harness: Page, ...names: string[]): Promise<void> {
  await harness.evaluate((list) => window.harness.run(...list), names);
}

/** GET a pod resource as its owner (or as `reader`). */
export function read(harness: Page, owner: string, path: string, reader?: string) {
  return harness.evaluate(([o, p, r]) => window.harness.read(o as string, p as string, r), [
    owner,
    path,
    reader,
  ] as const) as Promise<PodRead>;
}

/** Every beat before Juniper's first step: credentials shared, access approved, applied. */
export const UP_TO_APPLICATION = [
  "welcome",
  "share-employment",
  "share-assets",
  "share-credit-summary",
  "approve-application-access",
  "submit-application",
];

/** WCAG 2.1 AA, no violations. */
export async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
}

/** No horizontal page scroll; on failure, names the elements that stick out. */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const report = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll("body *")]
      .filter((element) => element.getBoundingClientRect().right > width + 1)
      .slice(0, 5)
      .map((element) => `${element.tagName.toLowerCase()}.${element.className}`);
    return { overflow: document.documentElement.scrollWidth - width, wide };
  });
  expect(report.overflow, `${page.url()} overflows: ${report.wide.join(", ")}`).toBeLessThanOrEqual(
    0,
  );
}

/** Clicks a tour target and waits for its action bar to report; fails with the bar's message. */
export async function press(page: Page, target: string): Promise<string> {
  const button = page.locator(`[data-tour="${target}"]`);
  await expect(button).toHaveCount(1);
  await expect(button).toBeEnabled({ timeout: 60_000 });
  await button.click();
  const status = page.locator(".action-bar").filter({ has: button }).getByRole("status");
  await expect(status).toBeVisible({ timeout: 180_000 });
  const text = (await status.textContent()) ?? "";
  expect(await status.getAttribute("class"), text).toContain("action-ok");
  return text;
}

/** The trust banner, the fictional line and noindex: on every route, including not-found. */
export async function expectTrustSurfaces(page: Page): Promise<void> {
  await expect(page.locator("[data-demo-trust]")).toBeVisible();
  await expect(page.locator("[data-demo-fictional]")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
}
