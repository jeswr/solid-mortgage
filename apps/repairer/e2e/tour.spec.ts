// AUTHORED-BY Claude Opus 5.5
/**
 * The whole motor-claim tour on the built site (flows.md section 7), step by step through the
 * tour engine, across Alex's wallet, Wrenfield Mutual and Anvil Collision Repair: every
 * interactive step by its own tour button, every step's page checked for accessibility and phone
 * width, and each step's effect read back from the pods. Read-backs before step 10 are made as
 * Alex or from an organisation's own pod, so they do not change the ledger's totals.
 */
import { expect, type Page, test } from "@playwright/test";
import {
  expectAccessible,
  expectNoSideScroll,
  OUTSIDE_LENS,
  readAs,
} from "../../../test-support/e2e.ts";
import { act, gotoStep, startTour } from "./demo.ts";

test.setTimeout(600_000);

const CLAIM = "alex/claims/CLM-1";
const pod = (org: string) => `/pods/${org}/profile/card#me`;

async function checkPage(page: Page): Promise<void> {
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
}

const metric = (page: Page, key: string) => page.locator(`[data-metric="motor-claim.${key}"]`);

test("the motor-claim tour, all ten steps, with the pods read back", async ({ page }) => {
  // 1. Alex starts the claim file in Alex's own pod.
  await startTour(page);
  await checkPage(page);
  await act(page, "new-claim");
  await expect(page.getByTestId("mc-incident")).toBeVisible({ timeout: 60_000 });
  const incident = await readAs(page, "alex", `${CLAIM}/incident`);
  expect(incident.status).toBe(200);
  expect(incident.body).toContain(`${CLAIM}/photos/rear-bumper.svg`);
  expect((await readAs(page, "alex", `${CLAIM}/other-party`)).status).toBe(200);

  // 2. Report it to Wrenfield: grant C1 over the licence, the policy and the claim folder.
  await gotoStep(page, "report", "/insurer/claims");
  await checkPage(page);
  await act(page, "report");
  await expect(page.getByTestId("mc-case")).toBeVisible({ timeout: 60_000 });
  expect((await readAs(page, "alex", "alex/policies/c1")).status).toBe(200);
  expect((await readAs(page, "alex", "alex/consents/c1-given")).status).toBe(200);
  expect((await readAs(page, "alex", `${CLAIM}/.acl`)).body).toContain(pod("insurer"));
  expect((await readAs(page, "alex", `${CLAIM}/.acl`)).body).not.toContain(pod("repairer"));
  expect((await readAs(page, "insurer", "insurer/claims/CLM-1")).status).toBe(200);

  // 3. The claims desk checks licence and policy at source and writes the damage report.
  await gotoStep(page, "claims-desk", "/insurer/claims/desk");
  await checkPage(page);
  await act(page, "claims-desk");
  await expect(page.getByTestId("mc-checks").getByRole("listitem")).toHaveCount(2);
  await expect(page.getByTestId("mc-checks")).not.toContainText("Failed");
  await checkPage(page);
  const report = await readAs(page, "alex", `${CLAIM}/damage-report`);
  expect(report.status).toBe(200);
  expect(report.body).toContain(pod("insurer"));
  expect((await readAs(page, "insurer", "insurer/claims/CLM-1-checks/driver-licence")).status).toBe(
    200,
  );

  // 4. Alex lets Anvil see the damage report and the photos: grant C2.
  await gotoStep(page, "repairer-consent", "/wallet/claim/requests");
  await expect(page.getByTestId("mc-request-c2")).toBeVisible({ timeout: 60_000 });
  await checkPage(page);
  await act(page, "repairer-consent");
  expect((await readAs(page, "alex", "alex/consents/c2-given")).status).toBe(200);
  expect((await readAs(page, "alex", `${CLAIM}/photos/.acl`)).body).toContain(pod("repairer"));
  await expect
    .poll(async () => (await readAs(page, "repairer", "repairer/jobs/CLM-1")).status, {
      timeout: 60_000,
    })
    .toBe(200);

  // 5. The job card reads those two things and writes the estimate back.
  await gotoStep(page, "job-card", "/repairer/jobs/CLM-1");
  await expect(page.getByTestId("job-status")).toHaveText("Open", { timeout: 60_000 });
  await checkPage(page);
  await act(page, "job-card");
  await expect(page.getByTestId("job-estimate")).toContainText("$1,415.50");
  await checkPage(page);
  expect((await readAs(page, "alex", `${CLAIM}/estimate`)).body).toContain(pod("repairer"));

  // 6. What the workshop never saw, from the log.
  await gotoStep(page, "not-shared", "/wallet/claim/seen");
  await expect(metric(page, "repairer-things")).toHaveAttribute("data-value", "2", {
    timeout: 60_000,
  });
  const notSeen = page.getByTestId("mc-not-seen").getByRole("listitem");
  await expect(notSeen).toHaveCount(4);
  await expect(page.getByTestId("mc-not-seen")).not.toContainText("(read)");
  await checkPage(page);

  // 7. Wrenfield reads the estimate where Anvil wrote it, and approves it.
  await gotoStep(page, "approve-estimate", "/insurer/claims/desk");
  await checkPage(page);
  await act(page, "approve-estimate");
  await expect(page.getByTestId("mc-estimate")).toContainText("$1,415.50");
  expect((await readAs(page, "insurer", "insurer/claims/CLM-1")).body).toContain(
    `${CLAIM}/estimate`,
  );

  // 8. The job is complete; the invoice ends grant C2.
  await gotoStep(page, "complete", "/repairer/jobs/CLM-1");
  await expect(page.getByTestId("job-status")).toHaveText("Estimate approved", {
    timeout: 60_000,
  });
  await checkPage(page);
  await act(page, "complete");
  await expect(page.getByTestId("job-status")).toHaveText("Complete", { timeout: 60_000 });
  expect((await readAs(page, "alex", `${CLAIM}/invoice`)).status).toBe(200);
  expect((await readAs(page, "alex", `${CLAIM}/photos/.acl`)).body).not.toContain(pod("repairer"));
  expect((await readAs(page, "alex", `${CLAIM}/.acl`)).body).toContain(pod("insurer"));

  // 9. The workshop opens the photos again: the pod refuses (403).
  await gotoStep(page, "refused", "/repairer/jobs/CLM-1");
  await act(page, "refused");
  await expect(page.getByTestId("job-refused")).toContainText("403");
  await checkPage(page);

  // 10. Alex closes the claim and withdraws C1; P1, the policy grant, stays.
  await gotoStep(page, "close", "/wallet/claim/sharing");
  await expect(page.getByTestId("mc-grant-c1")).toContainText("Active", { timeout: 60_000 });
  await checkPage(page);
  await act(page, "close");
  await expect(page.getByTestId("mc-grant-c1")).toContainText("Withdrawn", { timeout: 60_000 });
  await expect(page.getByTestId("mc-grant-c2")).toContainText("Expired");
  await expect(page.getByTestId("mc-grant-p1")).toContainText("Active");
  await expect(metric(page, "parties")).toHaveAttribute("data-value", "3");
  await expect(metric(page, "grants")).toHaveAttribute("data-value", "2");
  await expect(metric(page, "denied")).toHaveAttribute("data-value", "1");
  await checkPage(page);
  expect((await readAs(page, "alex", "alex/consents/c1-withdrawn")).status).toBe(200);
  expect((await readAs(page, "alex", `${CLAIM}/.acl`)).body).not.toContain(pod("insurer"));
  expect((await readAs(page, "alex", "alex/insurance/motor-policy.acl")).body).toContain(
    pod("insurer"),
  );

  // Every step of the tour is done.
  const done = await page.evaluate(
    () => (window as unknown as { __demo: { state(): { done: string[] } } }).__demo.state().done,
  );
  expect([...done].sort()).toEqual(
    [
      "new-claim",
      "report",
      "claims-desk",
      "repairer-consent",
      "job-card",
      "not-shared",
      "approve-estimate",
      "complete",
      "refused",
      "close",
    ].sort(),
  );

  // After the tour, the pod's answers are the grants': Wrenfield reads the policy, not the claim.
  expect((await readAs(page, "insurer", "alex/insurance/motor-policy")).status).toBe(200);
  expect((await readAs(page, "insurer", `${CLAIM}/incident`)).status).toBe(403);
  expect((await readAs(page, "repairer", `${CLAIM}/damage-report`)).status).toBe(403);
});
