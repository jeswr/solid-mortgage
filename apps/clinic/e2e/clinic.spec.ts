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
import { act, gotoStep, throughGrants } from "./demo.ts";

test("today's list renders with the trust banner and its own metadata", async ({ page }) => {
  await open(page, "./");
  await expectTrustSurfaces(page);
  await expect(page).toHaveTitle(/Larch Lane Family Practice/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#5B4F7C");
  await expect(page.getByRole("heading", { level: 1, name: "Today's list" })).toBeVisible();
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
});

test("not-found keeps the banner", async ({ page }) => {
  await open(page, "./no-such-page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expectTrustSurfaces(page);
  await expectAccessible(page, OUTSIDE_LENS);
});

test("before Rosa shares her record, the pod refuses the practice", async ({ page }) => {
  await open(page, "./consultation");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    /Refused by the pod \(40[13]\)/,
    { timeout: 60_000 },
  );
  await expect(page.locator('[data-tour="clinic-save-consultation"]')).toHaveCount(0);
  expect([401, 403]).toContain((await readAs(page, "clinic", "rosa/medications/")).status);
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
});

test("step 6 from its tour button: the practice stops the duplicate statin", async ({ page }) => {
  test.setTimeout(480_000);
  await throughGrants(page);
  await gotoStep(page, "dispense", "/pharmacy/queue");
  await act(page, "dispense");
  await gotoStep(page, "not-shared", "/pharmacy/queue");

  await gotoStep(page, "consultation", "/clinic/consultation");
  await expect(page.getByTestId("clinic-duplicate")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("clinic-summary")).toContainText("Imani Brooks");
  await expect(page.getByTestId("med-ibuprofen")).toContainText("Kidney function fell");
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
  await act(page, "consultation");
  await expect(page.getByTestId("clinic-saved")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("med-simvastatin")).toHaveAttribute("data-active", "false", {
    timeout: 60_000,
  });
  await expectAccessible(page, OUTSIDE_LENS);

  // Read back: the stop and its reason in Rosa's pod; the practice's record points at her.
  const statin = await readAs(page, "rosa", "rosa/medications/simvastatin");
  expect(statin.body).toContain("Duplicate statin");
  const why = await readAs(page, "rosa", "rosa/medications/provenance/simvastatin-day-60");
  expect(why.status).toBe(200);
  expect(why.body).toContain("Lena Marsh");
  const encounter = await readAs(page, "clinic", "clinic/consultations/rosa-day-60");
  expect(encounter.status).toBe(200);
  expect(encounter.body).toContain("/pods/rosa/profile/card#me");
  expect(encounter.body).not.toContain("Simvastatin");
});
