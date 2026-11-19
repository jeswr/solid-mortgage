// AUTHORED-BY Claude Opus 5.5
/**
 * The Department of Revenue's page (small business loan, step 2) against the real pods: after
 * step 1, the tour button signs Northwind's tax compliance credential into Northwind's pod; the
 * page reads it back; the pod refuses the department a read of what it signed.
 */
import { expect, test } from "@playwright/test";
import {
  expectAccessible,
  expectNoSideScroll,
  expectTrustSurfaces,
  OUTSIDE_LENS,
  openReady,
  readAs,
} from "../../../test-support/e2e.ts";
import { actStep, playLoanUpTo } from "../../business-lender/e2e/loan-demo.ts";

test.setTimeout(300_000);

test("step 2 from its tour button: the credential lands in Northwind's pod", async ({ page }) => {
  await playLoanUpTo(page, "tax-compliance");
  await expectTrustSurfaces(page);
  await expect(page.locator("[data-demo-signed-in]")).toContainText("Jordan Blake");
  await expect(page.getByText("No tax compliance credential yet.")).toBeVisible({
    timeout: 60_000,
  });
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);

  await actStep(page, "tax-compliance");
  const shown = page.getByTestId("state-tax-credential");
  await expect(shown).toContainText("Compliant", { timeout: 60_000 });
  await expect(shown).toContainText("$500,000 to $1 million");

  const credential = await readAs(page, "northwind", "northwind/credentials/tax-compliance");
  expect(credential.status).toBe(200);
  expect(credential.body).toContain("TaxComplianceCredential");
  expect(credential.body).toContain("4417");
  // The department keeps an issuance record and its status list, not the credential.
  expect((await readAs(page, "state", "state/issued/tax-compliance-northwind-v1")).status).toBe(
    200,
  );
  expect((await readAs(page, "state", "northwind/credentials/tax-compliance")).status).toBe(403);
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
});

test("Driver Services keeps the moving-house demo and Alex", async ({ page }) => {
  await openReady(page, "/state/driver-services");
  await expectTrustSurfaces(page);
  await expect(page.locator("[data-demo-signed-in]")).not.toContainText("Jordan Blake");
});
