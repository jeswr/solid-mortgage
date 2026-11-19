// AUTHORED-BY Claude Opus 5.5
import { expect, test } from "@playwright/test";
import {
  expectAccessible,
  expectNoSideScroll,
  expectTrustSurfaces,
  OUTSIDE_LENS,
  open,
  readAs,
} from "../../../test-support/e2e.ts";

test("the pipeline renders with the trust banner and its own metadata", async ({ page }) => {
  await open(page, "./");
  await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
  await expectTrustSurfaces(page);
  await expect(page).toHaveTitle(/Brackenridge Bank Commercial Credit/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#7A2335");
  await expect(page.getByRole("heading", { level: 1, name: "Credit pipeline" })).toBeVisible();
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
});

test("not-found keeps the banner", async ({ page }) => {
  await open(page, "./no-such-page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expectTrustSurfaces(page);
  await expectAccessible(page, OUTSIDE_LENS);
});

test("before Northwind grants K2, the pod refuses the deal sheet's read", async ({ page }) => {
  await open(page, "./deal");
  await expect(page.getByTestId("lender-refused")).toContainText(/Refused by the pod \(40[134]\)/, {
    timeout: 90_000,
  });
  await expect(page.getByTestId("lender-owners")).toHaveCount(0);
  await expect(page.getByTestId("lender-covenants")).toContainText("Awaiting proof");
  expect([401, 403, 404]).toContain(
    (await readAs(page, "business-lender", "northwind/credentials/beneficial-ownership")).status,
  );
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
});
