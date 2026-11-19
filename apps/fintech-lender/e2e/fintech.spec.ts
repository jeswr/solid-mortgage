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

test("the start page renders with the trust banner and its own metadata", async ({ page }) => {
  await open(page, "./");
  await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
  await expectTrustSurfaces(page);
  await expect(page).toHaveTitle(/Finchly Loans/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#5B3FD1");
  await expect(
    page.getByRole("heading", { level: 1, name: "Small loans, decided on what you earn" }),
  ).toBeVisible();
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
});

test("not-found keeps the banner", async ({ page }) => {
  await open(page, "./no-such-page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expectTrustSurfaces(page);
  await expectAccessible(page, OUTSIDE_LENS);
});

test("before Maya applies, the pod refuses Finchly's reads", async ({ page }) => {
  await open(page, "./apply");
  await expect(page.getByTestId("fintech-access")).toContainText(/40[13]/, { timeout: 60_000 });
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);

  await open(page, "./decision");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    /Refused by the pod \(40[13]\)/,
    { timeout: 60_000 },
  );
  await expect(page.getByTestId("fintech-bureau-only")).toHaveCount(0);
  expect([401, 403]).toContain(
    (await readAs(page, "fintech-lender", "maya/credentials/cash-flow")).status,
  );
  expect(
    (await readAs(page, "fintech-lender", "fintech-lender/loans/fl-2048-decision")).status,
  ).toBe(404);
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
});

test("the servicing page at phone width", async ({ page }) => {
  await open(page, "./servicing");
  await expect(page.locator('[data-tour="fintech-pay"]')).toBeVisible();
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
});
