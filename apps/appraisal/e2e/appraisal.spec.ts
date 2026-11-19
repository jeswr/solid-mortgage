// AUTHORED-BY Claude Opus 5.5
import { expect, test } from "@playwright/test";
import { catchUp, expectAccessible, expectNoSideScroll, open, readAs } from "./helpers.ts";

test("the board renders with the trust banner, its own metadata, axe and no side scroll", async ({
  page,
}) => {
  await open(page, "./");
  await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
  await expect(page.getByText("Plumbline Valuation is a fictional organisation.")).toBeVisible();
  await expect(page).toHaveTitle(/Plumbline Valuation/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#E8590C");
  await expect(page.getByRole("heading", { name: "Order board" })).toBeVisible();
  await expectAccessible(page);
  await expectNoSideScroll(page);
});

test("not-found keeps the banner", async ({ page }) => {
  await open(page, "./no-such-screen");
  await expect(page.getByRole("heading", { name: "No such screen" })).toBeVisible();
  await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
  await expectAccessible(page);
});

test("step 13: the appraiser reads two documents, then submits the signed report", async ({
  page,
}) => {
  await open(page, "./orders/PV-7731/field");
  await catchUp(page);

  // Assigned on the board; the order detail shows the engagement and refuses a read outside G5.
  await page.getByRole("link", { exact: true, name: "Board" }).click();
  await expect(page.getByRole("link", { name: /PV-7731/ }).first()).toBeVisible();
  await expect(page.locator(".column", { hasText: "Assigned" }).locator(".ticket")).toBeVisible();
  await expectAccessible(page);
  await expectNoSideScroll(page);

  await page.getByRole("link", { name: "Order PV-7731" }).click();
  await expect(page.getByRole("heading", { name: "Independence" })).toBeVisible();
  await page.getByRole("button", { name: "Try to read Alex's credit summary" }).click();
  await expect(page.getByRole("alert")).toContainText("Refused by the pod (403)");
  await expectAccessible(page);
  await expectNoSideScroll(page);

  // The field app shows the property as read from Alex's pod under G5.
  await page.getByRole("link", { exact: true, name: "Field" }).click();
  await expect(page.getByText("14 Larch Lane").first()).toBeVisible();
  const submit = page.locator('[data-tour="appraisal-submit-report"]');
  await expect(submit).toBeEnabled();
  await expectAccessible(page);
  await expectNoSideScroll(page);
  await submit.click();
  await expect(page.getByText("Report delivered.")).toBeVisible({ timeout: 60_000 });
  await expect(submit).toBeDisabled();

  // The pods, read back as their owners.
  const report = await readAs(page, "appraisal", "appraisal/orders/PV-7731/appraisal");
  expect(report.status).toBe(200);
  expect(report.body).toContain("428000");
  expect((await readAs(page, "alex", "alex/mortgage/juniper/appraisal")).status).toBe(200);
  // G5's end evidence is in Alex's pod; the wallet (another app) applies the expiry.
  expect((await readAs(page, "appraisal", "alex/mortgage/juniper/appraisal")).status).toBe(403);

  await page.getByRole("link", { exact: true, name: "Review" }).click();
  await expect(page.getByRole("heading", { name: "Appraisal report PV-7731" })).toBeVisible();
  await expect(page.getByText("Sam Reyes, licence")).toBeVisible();
  await expectAccessible(page);
  await expectNoSideScroll(page);
});
