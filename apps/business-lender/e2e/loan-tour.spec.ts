// AUTHORED-BY Claude Opus 5.5
/**
 * The whole small business loan tour on the built site (flows.md section 6), from a cold start
 * (a new browser context: the first step brings the pods to the business onboarding demo's end),
 * across Alder Bank, the Department of Revenue, Northwind's wallet and Brackenridge Bank: every
 * interactive step by its own tour button, each page checked for accessibility and phone width,
 * and each step's effect read back from the pods. Read-backs are made as Northwind or as the
 * organisation in its own pod, so the test does not add organisation reads to the ledger.
 */
import { expect, type Page, test } from "@playwright/test";
import {
  expectAccessible,
  expectNoSideScroll,
  expectTrustSurfaces,
  OUTSIDE_LENS,
  readAs,
} from "../../../test-support/e2e.ts";
import { actStep, openStep, startLoanTour } from "./loan-demo.ts";

test.setTimeout(900_000);

async function checkPage(page: Page): Promise<void> {
  await expectTrustSurfaces(page);
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
}

const card = (who: string) => `/pods/${who}/profile/card#me`;
const own = (page: Page, path: string) => readAs(page, "northwind", `northwind/${path}`);

test("the small business loan tour, all nine steps, with the pods read back", async ({ page }) => {
  // 1. Alder Bank keeps Northwind's cash flow record (S1: write one resource, read nothing).
  await startLoanTour(page);
  await checkPage(page);
  await actStep(page, "publish-cash-flow");
  await expect(page.getByTestId("bank-published")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("bank-read-back")).toContainText("Refused by the pod (403)");
  const cashFlow = await own(page, "finance/cash-flow");
  expect(cashFlow.status).toBe(200);
  expect(cashFlow.body).toContain("CashFlowRecord");
  expect((await own(page, "policies/s1")).status).toBe(200);
  // Demo 3's register credentials are in the pod, reused, not collected again.
  expect((await own(page, "credentials/beneficial-ownership")).status).toBe(200);
  const s1Acl = (await own(page, "finance/cash-flow.acl")).body;
  expect(s1Acl).toContain(card("bank"));

  // 2. The Department of Revenue's tax compliance credential.
  await openStep(page, "tax-compliance");
  await checkPage(page);
  await actStep(page, "tax-compliance");
  await expect(page.getByTestId("state-tax-credential")).toContainText("Compliant", {
    timeout: 60_000,
  });
  const tax = await own(page, "credentials/tax-compliance");
  expect(tax.status).toBe(200);
  expect(tax.body).toContain("TaxComplianceCredential");
  expect(tax.body).not.toContain("932100");
  expect((await readAs(page, "state", "state/issued/tax-compliance-northwind-v1")).status).toBe(
    200,
  );

  // 3. Brackenridge's application request; Northwind approves S2.
  await openStep(page, "apply");
  await expect(page.getByTestId("wallet-loan-request-s2")).toBeVisible({ timeout: 90_000 });
  await checkPage(page);
  await actStep(page, "apply");
  expect((await own(page, "policies/s2")).status).toBe(200);
  expect((await own(page, "consents/s2-given")).status).toBe(200);
  const s2Acl = (await own(page, "credentials/tax-compliance.acl")).body;
  expect(s2Acl).toContain(card("business-lender"));

  // 4. The assessment at source.
  await openStep(page, "assessment");
  await checkPage(page);
  await actStep(page, "assessment");
  await expect(page.getByTestId("lender-deal-sheet")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("lender-sheet-dscr")).toHaveText("1.75x");
  for (const label of ["org-identity", "beneficial-ownership", "tax-compliance"]) {
    await expect(page.getByTestId(`lender-check-${label}`)).toContainText("Verified");
  }
  expect(
    (await readAs(page, "business-lender", "business-lender/credit/northwind/assessment")).status,
  ).toBe(200);
  await checkPage(page);

  // 5. The decision and the three documents written back.
  await openStep(page, "decision");
  await checkPage(page);
  await actStep(page, "decision");
  await expect(page.getByTestId("lender-notice-name")).toContainText(
    "Notice of action taken: approved",
    { timeout: 60_000 },
  );
  const notice = await own(page, "loans/brackenridge/notice-of-action");
  expect(notice.status).toBe(200);
  expect(notice.body).toContain("1002.9");
  expect((await own(page, "loans/brackenridge/terms")).body).toContain("BusinessLoanTerms");

  // 6. Brackenridge's monitoring request; Northwind approves S3, quarterly.
  await openStep(page, "monitoring");
  await expect(page.getByTestId("wallet-loan-request-s3")).toBeVisible({ timeout: 90_000 });
  await checkPage(page);
  await actStep(page, "monitoring");
  const s3 = await own(page, "policies/s3");
  expect(s3.status).toBe(200);
  expect(s3.body).toContain("P3M");

  // 7. A quarter on: S2 has ended, the covenant test reads under S3.
  await openStep(page, "quarter");
  await checkPage(page);
  await actStep(page, "quarter");
  await expect(page.getByTestId("lender-quarter")).toContainText("Met", { timeout: 60_000 });
  expect(
    (await readAs(page, "business-lender", "business-lender/credit/northwind/covenant-test-q1"))
      .status,
  ).toBe(200);
  expect((await own(page, "consents/s2-expired")).status).toBe(200);
  const afterExpiry = (await own(page, "credentials/tax-compliance.acl")).body;
  expect(afterExpiry).not.toContain(card("business-lender"));

  // 8. Repaid: S3 withdrawn, Brackenridge's next read refused with a real 403.
  await openStep(page, "revoke");
  await checkPage(page);
  await actStep(page, "revoke");
  await expect(page.getByTestId("wallet-loan-withdrawn")).toContainText("refused by the pod (403)");
  expect((await own(page, "consents/s3-withdrawn")).status).toBe(200);
  const cashAcl = (await own(page, "finance/cash-flow.acl")).body;
  expect(cashAcl).not.toContain(card("business-lender"));
  expect(cashAcl).toContain(card("bank"));
  // Brackenridge keeps its own credit file.
  expect(
    (await readAs(page, "business-lender", "business-lender/credit/northwind/assessment")).status,
  ).toBe(200);

  // 9. The ledger and the examiner view: every obligation evidenced from the log.
  await openStep(page, "ledger");
  const obligations = page.locator("journey-ledger .obligation");
  await expect(obligations).toHaveCount(4, { timeout: 60_000 });
  for (const id of ["notice-of-action", "retain-records", "covenant-monitoring", "access-ends"]) {
    await expect(
      page.locator(`journey-ledger .obligation[data-obligation="${id}"]`),
    ).toHaveAttribute("data-met", "true");
  }
  await expect(page.getByTestId("wallet-loan-issuers")).toHaveText("2");
  await expect(page.getByTestId("wallet-loan-lenders")).toHaveText("1");
  await expect(page.getByTestId("wallet-loan-decisions")).toHaveText("1");
  await checkPage(page);
});
