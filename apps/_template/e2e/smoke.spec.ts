// AUTHORED-BY Claude Opus 5.5
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("home renders with the trust banner, metadata and no axe violations", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
  await expect(page.getByText("Example Organisation is a fictional organisation.")).toBeVisible();
  await expect(page).toHaveTitle("App template");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#5B4B8A");
  await page.locator('[data-tour="template-example"]').click();
  await expect(page.locator('[data-tour="template-example"]')).toHaveText("Done");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("the self-hosted font loads from the app's own origin", async ({ page }) => {
  const fontRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "font") fontRequests.push(request.url());
  });
  await page.goto("./");
  await page.evaluate(() => document.fonts.ready);
  expect(fontRequests.length).toBeGreaterThan(0);
  for (const url of fontRequests) expect(new URL(url).pathname).toMatch(/^\/_template\/assets\//);
});
