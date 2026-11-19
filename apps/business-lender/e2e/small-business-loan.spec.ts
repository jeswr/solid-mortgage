// AUTHORED-BY Claude Opus 5.5
/**
 * Brackenridge Bank's equipment loan pages (small business loan, steps 4, 5 and 7) against the
 * real pods: each step from its own tour button with its record read back, and the pod refusing
 * the desk before S2, its write-back once S2 has ended, and its covenant read once S3 is
 * withdrawn.
 */
import { expect, type Page, test } from "@playwright/test";
import {
  expectAccessible,
  expectNoSideScroll,
  expectTrustSurfaces,
  OUTSIDE_LENS,
  readAs,
} from "../../../test-support/e2e.ts";
import { actStep, openStep, playLoanUpTo } from "./loan-demo.ts";

test.setTimeout(600_000);

async function checkPage(page: Page): Promise<void> {
  await expectTrustSurfaces(page);
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
}

/** The page with the tour off, ready to press by hand. */
async function freePlay(page: Page, path: string): Promise<void> {
  await page.goto(`${path}?tour=off`);
  await expect(page.getByRole("status").filter({ hasText: "Connecting" })).toHaveCount(0, {
    timeout: 60_000,
  });
}

test("before Northwind approves S2, the pod refuses the assessment", async ({ page }) => {
  await playLoanUpTo(page, "apply");
  await freePlay(page, "/business-lender/loan");
  await checkPage(page);
  await page.locator('[data-tour="lender-loan-assess"]').click();
  await expect(page.getByTestId("lender-refused")).toContainText(/Refused by the pod \(40[13]\)/, {
    timeout: 60_000,
  });
  await expect(page.getByTestId("lender-deal-sheet")).toHaveCount(0);
  expect(
    (await readAs(page, "business-lender", "business-lender/credit/northwind/assessment")).status,
  ).toBe(404);
});

test("steps 4, 5 and 7 from their tour buttons, with the refusals after S2 and S3 end", async ({
  page,
}) => {
  // 4. The assessment: three credentials checked at source, twelve months measured.
  await playLoanUpTo(page, "assessment");
  await checkPage(page);
  await actStep(page, "assessment");
  await expect(page.getByTestId("lender-deal-sheet")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("lender-sheet-dscr")).toHaveText("1.75x");
  const assessment = await readAs(
    page,
    "business-lender",
    "business-lender/credit/northwind/assessment",
  );
  expect(assessment.status).toBe(200);
  expect(assessment.body).toContain("CashFlowAssessment");
  await checkPage(page);

  // 5. The decision: three documents written into Northwind's pod under S2.
  await openStep(page, "decision");
  await checkPage(page);
  await actStep(page, "decision");
  await expect(page.getByTestId("lender-terms")).toContainText("$150,000", { timeout: 60_000 });
  await expect(page.getByTestId("lender-notice-name")).toContainText("approved");
  for (const path of ["decision", "terms", "notice-of-action"]) {
    expect((await readAs(page, "northwind", `northwind/loans/brackenridge/${path}`)).status).toBe(
      200,
    );
  }
  await checkPage(page);

  // 6 (wallet). S3 approved.
  await openStep(page, "monitoring");
  await actStep(page, "monitoring");

  // 7. The quarter's covenant test, read under S3.
  await openStep(page, "quarter");
  await checkPage(page);
  await actStep(page, "quarter");
  await expect(page.getByTestId("lender-quarter")).toContainText("Met", { timeout: 60_000 });
  const test1 = await readAs(
    page,
    "business-lender",
    "business-lender/credit/northwind/covenant-test-q1",
  );
  expect(test1.status).toBe(200);
  expect(test1.body).toContain("covenantsMet");
  await checkPage(page);

  // S2 has ended (its 30 days ran out): the pod refuses another write-back.
  await freePlay(page, "/business-lender/loan/decision");
  await page.locator('[data-tour="lender-loan-decide"]').click();
  await expect(page.getByTestId("lender-refused")).toContainText("Refused by the pod (403)", {
    timeout: 60_000,
  });

  // 8 (wallet). S3 withdrawn: the next covenant read is refused.
  await openStep(page, "revoke");
  await actStep(page, "revoke");
  await freePlay(page, "/business-lender/loan/covenants");
  await page.locator('[data-tour="lender-loan-quarter"]').click();
  await expect(page.getByTestId("lender-refused")).toContainText("Refused by the pod (403)", {
    timeout: 60_000,
  });
  await checkPage(page);
});
