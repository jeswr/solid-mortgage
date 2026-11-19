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

test("the record renders with the trust banner and its own metadata", async ({ page }) => {
  await open(page, "./");
  await expectTrustSurfaces(page);
  await expect(page).toHaveTitle(/Riverbend General Hospital/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#14558F");
  await expect(page.getByRole("region", { name: "Patient" })).toContainText("Amoxicillin");
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
});

test("not-found keeps the banner", async ({ page }) => {
  await open(page, "./no-such-page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expectTrustSurfaces(page);
  await expectAccessible(page, OUTSIDE_LENS);
});

test("step 2 from its tour button, then the pod refuses the ward once the stay's grant ends", async ({
  page,
}) => {
  test.setTimeout(360_000);
  await startTour(page);

  // 2. The ward reads Rosa's list under M1 and signs the discharge.
  await gotoStep(page, "discharge", "/hospital/discharge");
  await expect(page.locator('[data-tour="hospital-sign-discharge"]')).toBeEnabled({
    timeout: 60_000,
  });
  const changes = page.getByTestId("hospital-changes");
  await expect(changes.locator('tr[data-change="stopped"]')).toContainText("Ibuprofen");
  await expect(changes.locator('tr[data-change="dose-changed"]')).toContainText("20 mg");
  await expect(changes.locator('tr[data-change="new"]')).toContainText("Atorvastatin");
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
  await act(page, "discharge");
  await expect(page.getByTestId("hospital-signed")).toBeVisible({ timeout: 60_000 });
  await expectAccessible(page, OUTSIDE_LENS);

  // Read back: each change is in Rosa's pod with the reason recorded beside it.
  const lisinopril = await readAs(page, "rosa", "rosa/medications/lisinopril");
  expect(lisinopril.status).toBe(200);
  expect(lisinopril.body).toContain("Lisinopril 20 mg tablet");
  const why = await readAs(page, "rosa", "rosa/medications/provenance/ibuprofen-day-53");
  expect(why.status).toBe(200);
  expect(why.body).toContain("Kidney function fell");
  expect(why.body).toContain("Imani Brooks");
  expect((await readAs(page, "rosa", "rosa/medications/requests/atorvastatin")).status).toBe(200);
  expect((await readAs(page, "rosa", "rosa/discharge/summary")).status).toBe(200);

  // 3. Rosa approves the sharing at 14:30; M1 ended at 14:00, so the ward's access is gone.
  await gotoStep(page, "grants", "/wallet/health/requests");
  await act(page, "grants");
  await open(page, "./discharge");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Refused by the pod (403)",
    { timeout: 60_000 },
  );
  expect((await readAs(page, "hospital", "rosa/medications/lisinopril")).status).toBe(403);
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
});
