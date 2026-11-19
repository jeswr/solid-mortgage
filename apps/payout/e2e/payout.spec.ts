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
import { act, gotoStep, startTour } from "./demo.ts";

test("the start page renders with the trust banner and its own metadata", async ({ page }) => {
  await open(page, "./");
  await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
  await expectTrustSurfaces(page);
  await expect(page).toHaveTitle(/Swiftline Payouts/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#0E1A2B");
  await expect(page.getByRole("heading", { level: 1, name: "Payouts" })).toBeVisible();
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
});

test("not-found keeps the banner", async ({ page }) => {
  await open(page, "./no-such-page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expectTrustSurfaces(page);
  await expectAccessible(page, OUTSIDE_LENS);
});

test("before Maya authorises a payout, the pod refuses Swiftline", async ({ page }) => {
  await open(page, "./status");
  await page.getByRole("button", { name: "Read again" }).click();
  await expect(page.getByTestId("payout-second-read")).toContainText(
    /Refused by the pod \(40[134]\)/,
    { timeout: 60_000 },
  );
  expect([401, 403, 404]).toContain(
    (await readAs(page, "payout", "maya/banking/payout-instruction")).status,
  );
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
});

test("step 10 from its tour button: one record, read once, then refused", async ({ page }) => {
  await startTour(page);
  await gotoStep(page, "payout", "/payout/status");
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);

  await act(page, "payout");
  await expect(page.getByTestId("payout-receipt")).toContainText("3318");
  await expect(page.locator('[data-tour="payout-authorise"]')).toBeDisabled();
  await expectAccessible(page, OUTSIDE_LENS);

  // Read back: Maya's instruction and her grant records, Swiftline's receipt (shared with
  // Finchly) and its confirmation in Finchly's inbox.
  expect((await readAs(page, "maya", "maya/banking/payout-instruction")).status).toBe(200);
  expect((await readAs(page, "maya", "maya/policies/l2")).status).toBe(200);
  expect((await readAs(page, "maya", "maya/consents/l2-given")).status).toBe(200);
  expect((await readAs(page, "maya", "maya/consents/l2-used")).status).toBe(200);
  const receipt = await readAs(page, "payout", "payout/payouts/fl-2048");
  expect(receipt.status).toBe(200);
  expect(receipt.body).toContain("FL-2048");
  expect((await readAs(page, "fintech-lender", "payout/payouts/fl-2048")).status).toBe(200);

  // The one-time grant closed after the first read: the page's second read and ours are refused.
  await page.getByRole("button", { name: "Read again" }).click();
  await expect(page.getByTestId("payout-second-read")).toContainText("Refused by the pod (403)");
  await expect(page.getByTestId("payout-second-read")).toContainText("one-time grant closed");
  expect((await readAs(page, "payout", "maya/banking/payout-instruction")).status).toBe(403);
  const acl = (await readAs(page, "maya", "maya/banking/payout-instruction.acl")).body;
  expect(acl).not.toContain("/pods/payout/profile/card#me");
});
