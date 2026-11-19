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

test("before Rosa shares anything, the pod refuses the queue's read of her medicines", async ({
  page,
}) => {
  await open(page, "./queue");
  await expectTrustSurfaces(page);
  await expect(page).toHaveTitle(/Corner Dispensary/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#006B3C");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    /Refused by the pod \(40[13]\)/,
    { timeout: 60_000 },
  );
  await expect(page.getByTestId("pharmacy-lines")).toHaveCount(0);
  await expect(page.locator('[data-tour="pharmacy-dispense"]')).toHaveCount(0);
  // The refusal is the pod's: M2 is requested, not given.
  expect([401, 403]).toContain((await readAs(page, "pharmacy", "rosa/medications/")).status);
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
});

test("not-found keeps the banner", async ({ page }) => {
  await open(page, "./no-such-page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expectTrustSurfaces(page);
  await expectAccessible(page, OUTSIDE_LENS);
});

test("steps 4 and 7 from their tour buttons, then the refusal after Rosa changes pharmacy", async ({
  page,
}) => {
  test.setTimeout(480_000);
  await throughGrants(page);

  // 4. The queue reads Rosa's list under M2 and compares it with the last supply.
  await gotoStep(page, "dispense", "/pharmacy/queue");
  await expect(page.getByTestId("line-ibuprofen")).toHaveAttribute("data-status", "stopped", {
    timeout: 60_000,
  });
  await expect(page.getByTestId("line-lisinopril")).toHaveAttribute("data-status", "changed");
  await expect(page.getByTestId("line-atorvastatin")).toHaveAttribute("data-status", "new");
  await expect(page.getByTestId("line-ibuprofen")).toContainText("Kidney function fell");
  await expect(page.getByTestId("pharmacy-allergies")).toContainText("Amoxicillin");
  const labels = page.getByTestId("label-preview");
  await expect(labels).toContainText("ATORVASTATIN 40 MG TABLET");
  await expect(labels).toContainText("LISINOPRIL 20 MG TABLET");
  await expect(labels).not.toContainText("IBUPROFEN");
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
  await act(page, "dispense");
  await expect(page.getByTestId("pharmacy-supplied")).toBeVisible({ timeout: 60_000 });
  // Read back: the supply is in Rosa's pod and in the pharmacy's own records.
  const dispensed = await readAs(page, "rosa", "rosa/medications/dispenses/atorvastatin-day-53");
  expect(dispensed.status).toBe(200);
  expect(dispensed.body).toContain("83367");
  const own = await readAs(page, "pharmacy", "pharmacy/dispensing/rosa-atorvastatin-day-53");
  expect(own.status).toBe(200);

  // 5 and 6: what the pharmacy does not see, then the practice stops the duplicate statin.
  await gotoStep(page, "not-shared", "/pharmacy/queue");
  await gotoStep(page, "consultation", "/clinic/consultation");
  await act(page, "consultation");

  // 7. Refresh reads the list again: simvastatin is now stopped, with the practice's reason.
  await gotoStep(page, "pharmacy-refresh", "/pharmacy/queue");
  await expect(page.locator('[data-tour="pharmacy-refresh"]')).toBeEnabled({ timeout: 60_000 });
  await act(page, "pharmacy-refresh");
  const refreshed = page.getByTestId("pharmacy-refreshed");
  await expect(refreshed.getByTestId("line-simvastatin")).toHaveAttribute("data-status", "stopped");
  await expect(refreshed.getByTestId("line-simvastatin")).toContainText("Duplicate statin");
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
  const statin = await readAs(page, "rosa", "rosa/medications/simvastatin");
  expect(statin.body).toContain("Duplicate statin");

  // 8 and 9: Alex's view, then Rosa withdraws M2 (the tour's own revoke button).
  await gotoStep(page, "carer", "/wallet/health/shared");
  await gotoStep(page, "revoke", "/wallet/health/sharing");
  await act(page, "revoke");

  // Back at the dispensary: our records still read, Rosa's list is refused.
  await open(page, "./queue");
  await expect(page.getByTestId("pharmacy-supplied")).toBeVisible({ timeout: 60_000 });
  await page.locator('[data-tour="pharmacy-refresh"]').click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Refused by the pod (403)",
    { timeout: 60_000 },
  );
  expect((await readAs(page, "pharmacy", "rosa/medications/simvastatin")).status).toBe(403);
  expect(
    (await readAs(page, "pharmacy", "pharmacy/dispensing/rosa-atorvastatin-day-53")).status,
  ).toBe(200);
  await expectAccessible(page, OUTSIDE_LENS);
});
