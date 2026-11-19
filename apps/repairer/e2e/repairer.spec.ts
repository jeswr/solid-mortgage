// AUTHORED-BY Claude Opus 5.5
/**
 * Anvil Collision Repair on the built site: the trust surfaces on every route, the job card
 * before Alex grants anything, and the three steps the workshop owns (5, 8 and 9), each pressed
 * by its own tour button and read back from the pods. Step 9 is the pod's own 403.
 */
import { expect, type Page, test } from "@playwright/test";
import {
  expectAccessible,
  expectNoSideScroll,
  expectTrustSurfaces,
  OUTSIDE_LENS,
  open,
  readAs,
} from "../../../test-support/e2e.ts";
import { act, gotoStep, startTour } from "./demo.ts";

const CLAIM = "alex/claims/CLM-1";
const ANVIL = "/pods/repairer/profile/card#me";

async function checkPage(page: Page): Promise<void> {
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
}

/** Steps 1 to 4 by the tour's own buttons, in the wallet and at Wrenfield. */
async function upToTheJobCard(page: Page): Promise<void> {
  await startTour(page);
  await act(page, "new-claim");
  for (const [step, at] of [
    ["report", "/insurer/claims"],
    ["claims-desk", "/insurer/claims/desk"],
    ["repairer-consent", "/wallet/claim/requests"],
  ] as const) {
    await gotoStep(page, step, at);
    await act(page, step);
  }
}

test("the job board renders with the trust banner and its own metadata", async ({ page }) => {
  await open(page, "./");
  await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
  await expectTrustSurfaces(page);
  await expect(page).toHaveTitle(/Anvil Collision Repair/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#1F1D1A");
  await expect(page.getByRole("heading", { level: 1, name: "Job board" })).toBeVisible();
  await expect(page.getByTestId("job-status")).toHaveText("Waiting for access", {
    timeout: 60_000,
  });
  await checkPage(page);
});

test("not-found keeps the banner", async ({ page }) => {
  await open(page, "./no-such-page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expectTrustSurfaces(page);
  await checkPage(page);
});

test("before Alex grants anything, the job card can open nothing", async ({ page }) => {
  await open(page, "./jobs/CLM-1");
  await expect(page.getByTestId("job-status")).toHaveText("Waiting for access", {
    timeout: 60_000,
  });
  for (const target of ["repairer-write-estimate", "repairer-complete-job", "repairer-open-photos"])
    await expect(page.locator(`[data-tour="${target}"]`)).toBeDisabled();
  await checkPage(page);
  // Anvil keeps no job record yet, and the pod would refuse it Alex's claims folder.
  expect((await readAs(page, "repairer", "repairer/jobs/CLM-1")).status).toBe(404);
  expect([401, 403, 404]).toContain((await readAs(page, "repairer", "alex/claims/")).status);
});

test("steps 5, 8 and 9 from their tour buttons: estimate, completion, then the pod refuses", async ({
  page,
}) => {
  test.setTimeout(480_000);
  await upToTheJobCard(page);

  // 5. The job card: Anvil reads the damage report and the photos, and writes the estimate.
  await gotoStep(page, "job-card", "/repairer/jobs/CLM-1");
  await expect(page.getByTestId("job-status")).toHaveText("Open", { timeout: 60_000 });
  await expect(page.getByTestId("job-grant")).toContainText("grant C2 from Alex");
  await checkPage(page);
  await act(page, "job-card");
  await expect(page.getByTestId("job-damage-items").getByRole("listitem")).toHaveCount(2);
  await expect(
    page.getByRole("list", { name: "Photos from Alex's pod" }).getByRole("img"),
  ).toHaveCount(2);
  await expect(page.getByTestId("job-estimate")).toContainText("$1,415.50");
  await checkPage(page);
  // Read back: the estimate is in Alex's claim folder, written by Anvil; Anvil may not read it.
  const estimate = await readAs(page, "alex", `${CLAIM}/estimate`);
  expect(estimate.status).toBe(200);
  expect(estimate.body).toContain(ANVIL);
  const job = await readAs(page, "repairer", "repairer/jobs/CLM-1");
  expect(job.status).toBe(200);
  expect(job.body).toContain("ActiveActionStatus");

  // 7 at Wrenfield, so the job can be completed against an approved estimate.
  await gotoStep(page, "approve-estimate", "/insurer/claims/desk");
  await act(page, "approve-estimate");

  // 8. Complete the job: the invoice is filed and Alex's wallet ends grant C2.
  await gotoStep(page, "complete", "/repairer/jobs/CLM-1");
  await expect(page.getByTestId("job-status")).toHaveText("Estimate approved", {
    timeout: 60_000,
  });
  await checkPage(page);
  await act(page, "complete");
  await expect(page.getByTestId("job-invoice")).toContainText("ended grant C2");
  await expect(page.getByTestId("job-status")).toHaveText("Complete", { timeout: 60_000 });
  await expect(page.locator('[data-tour="repairer-complete-job"]')).toBeDisabled();
  await checkPage(page);
  const invoice = await readAs(page, "alex", `${CLAIM}/invoice`);
  expect(invoice.status).toBe(200);
  expect(invoice.body).toContain(ANVIL);
  expect((await readAs(page, "repairer", "repairer/jobs/CLM-1")).body).toContain(
    "CompletedActionStatus",
  );
  expect((await readAs(page, "alex", `${CLAIM}/photos/.acl`)).body).not.toContain(ANVIL);

  // 9. Open the photos again: the pod refuses with 403, and the page says so.
  await gotoStep(page, "refused", "/repairer/jobs/CLM-1");
  await act(page, "refused");
  const refused = page.getByTestId("job-refused");
  await expect(refused).toContainText("403");
  await expect(refused).toContainText("Refused by Alex's pod.");
  await checkPage(page);
  expect((await readAs(page, "repairer", `${CLAIM}/photos/rear-bumper.svg`)).status).toBe(403);
  expect((await readAs(page, "repairer", `${CLAIM}/damage-report`)).status).toBe(403);
  // Wrenfield still reads the damage report under C1.
  expect((await readAs(page, "insurer", `${CLAIM}/damage-report`)).status).toBe(200);
});
