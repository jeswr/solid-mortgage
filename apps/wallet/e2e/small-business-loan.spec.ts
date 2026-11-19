// AUTHORED-BY Claude Opus 5.5
/**
 * Cairn's small business loan screens (steps 3, 6, 8 and 9) against the real pods: Northwind
 * approves S2 and S3 from their tour buttons and withdraws S3 on repayment; each grant is read
 * back from the pod, and the pod refuses Brackenridge before S2 and after the withdrawal.
 */
import { expect, type Page, test } from "@playwright/test";
import {
  expectAccessible,
  expectNoSideScroll,
  expectTrustSurfaces,
  OUTSIDE_LENS,
  readAs,
} from "../../../test-support/e2e.ts";
import { actStep, openStep, playLoanUpTo } from "../../business-lender/e2e/loan-demo.ts";

test.setTimeout(600_000);

async function checkPage(page: Page): Promise<void> {
  await expectTrustSurfaces(page);
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
}

const card = (who: string) => `/pods/${who}/profile/card#me`;

test("steps 3, 6, 8 and 9: Northwind's grants from their tour buttons", async ({ page }) => {
  // 3. Brackenridge's request is waiting; the pod refuses it until Northwind approves.
  await playLoanUpTo(page, "apply");
  const request = page.getByTestId("wallet-loan-request-s2");
  await expect(request).toBeVisible({ timeout: 90_000 });
  await expect(request).toContainText("Credit decision");
  await expect(request).toContainText("30 days");
  await checkPage(page);
  expect(
    (await readAs(page, "business-lender", "northwind/credentials/tax-compliance")).status,
  ).toBe(403);
  await actStep(page, "apply");
  await expect(page.getByTestId("wallet-loan-approved")).toContainText("Grant S2 given");
  const s2 = await readAs(page, "northwind", "northwind/policies/s2");
  expect(s2.status).toBe(200);
  expect((await readAs(page, "northwind", "northwind/consents/s2-given")).status).toBe(200);
  for (const path of ["credentials/org-identity", "finance/cash-flow"]) {
    expect((await readAs(page, "northwind", `northwind/${path}.acl`)).body).toContain(
      card("business-lender"),
    );
  }

  // 4 and 5 (the lender).
  await openStep(page, "assessment");
  await actStep(page, "assessment");
  await openStep(page, "decision");
  await actStep(page, "decision");

  // 6. The monitoring request, sent with the decision: quarterly, until repaid.
  await openStep(page, "monitoring");
  const monitoring = page.getByTestId("wallet-loan-request-s3");
  await expect(monitoring).toBeVisible({ timeout: 90_000 });
  await expect(monitoring).toContainText("quarterly, until repaid");
  await checkPage(page);
  await actStep(page, "monitoring");
  const s3 = await readAs(page, "northwind", "northwind/policies/s3");
  expect(s3.status).toBe(200);
  expect(s3.body).toContain("P3M");

  // 7 (the lender).
  await openStep(page, "quarter");
  await actStep(page, "quarter");

  // 8. Repaid: S3 withdrawn; the pod refuses Brackenridge's next read.
  await openStep(page, "revoke");
  await expect(page.getByTestId("wallet-loan-grant-s2")).toContainText("Ended", {
    timeout: 60_000,
  });
  await checkPage(page);
  await actStep(page, "revoke");
  await expect(page.getByTestId("wallet-loan-withdrawn")).toContainText("refused by the pod (403)");
  expect((await readAs(page, "northwind", "northwind/consents/s3-withdrawn")).status).toBe(200);
  expect((await readAs(page, "business-lender", "northwind/finance/cash-flow")).status).toBe(403);
  await expect(page.getByTestId("wallet-loan-grant-s3")).toContainText("Withdrawn");

  // 9. The ledger: the totals from the log, the examiner view, Northwind's documents.
  await openStep(page, "ledger");
  await expect(page.getByTestId("wallet-loan-issuers")).toHaveText("2", { timeout: 60_000 });
  await expect(page.getByTestId("wallet-loan-lenders")).toHaveText("1");
  await expect(page.getByTestId("wallet-loan-decisions")).toHaveText("1");
  await expect(page.locator("journey-ledger .obligation")).toHaveCount(4, { timeout: 60_000 });
  await checkPage(page);
  await page.goto("/wallet/loan?tour=off");
  await expect(page.getByTestId("wallet-loan-notice")).toContainText(
    "Notice of action taken: approved",
    { timeout: 60_000 },
  );
  await expect(page.getByTestId("wallet-loan-cash-flow")).toContainText("months");
  await checkPage(page);
});
