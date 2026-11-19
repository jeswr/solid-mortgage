// AUTHORED-BY Claude Opus 5.5
/**
 * Alder Bank's business banking page (small business loan, step 1) against the real pods: the
 * tour button writes twelve months into Northwind's pod under S1, the pod refuses the bank's
 * read-back and any write elsewhere, and the trust banner names Northwind's operator.
 */
import { expect, test } from "@playwright/test";
import {
  expectAccessible,
  expectNoSideScroll,
  expectTrustSurfaces,
  OUTSIDE_LENS,
  openReady,
  podRequest,
  readAs,
} from "../../../test-support/e2e.ts";
import { actStep, startLoanTour } from "../../business-lender/e2e/loan-demo.ts";

test.setTimeout(300_000);

test("step 1 from its tour button: S1 lets the bank write one record and read nothing", async ({
  page,
}) => {
  await startLoanTour(page);
  await expectTrustSurfaces(page);
  await expect(page.locator("[data-demo-signed-in]")).toContainText("Jordan Blake");
  await expect(page.locator("[data-demo-signed-in]")).toContainText("Northwind Logistics LLC");
  await expect(page.locator(".masthead .signed-in")).not.toContainText("Alex");
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);

  await actStep(page, "publish-cash-flow");
  await expect(page.getByTestId("bank-s1-state")).toContainText("active");
  await expect(page.getByTestId("bank-published").locator("tbody tr")).toHaveCount(12);
  // The page's own read-back, refused: S1 is write-only.
  await expect(page.getByTestId("bank-read-back")).toContainText("Refused by the pod (403)");

  // Read back as Northwind: the record Alder wrote, from its own ledger.
  const record = await readAs(page, "northwind", "northwind/finance/cash-flow");
  expect(record.status).toBe(200);
  expect(record.body).toContain("CashFlowRecord");
  expect(record.body).toContain("2210");
  // The pod refuses the bank everywhere else in Northwind's pod.
  expect((await readAs(page, "bank", "northwind/finance/cash-flow")).status).toBe(403);
  expect((await readAs(page, "bank", "northwind/credentials/beneficial-ownership")).status).toBe(
    403,
  );
  const elsewhere = await podRequest(page, "bank", "northwind/finance/statement", {
    body: "",
    contentType: "text/turtle",
    method: "PUT",
  });
  expect([401, 403]).toContain(elsewhere.status);
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
});

test("before Northwind approves S1, the pod refuses the bank's write", async ({ page }) => {
  await openReady(page, "business");
  await expectTrustSurfaces(page);
  await expect(page.getByTestId("bank-s1-state")).toContainText("not yet approved", {
    timeout: 60_000,
  });
  const write = await podRequest(page, "bank", "northwind/finance/cash-flow", {
    body: "",
    contentType: "text/turtle",
    method: "PUT",
  });
  expect([401, 403]).toContain(write.status);
  expect((await readAs(page, "northwind", "northwind/finance/cash-flow")).status).toBe(404);
});

test("the mortgage pages still name Alex", async ({ page }) => {
  await openReady(page, "share");
  await expect(page.locator(".masthead .signed-in")).toContainText("Alex");
  await expect(page.locator("[data-demo-signed-in]")).not.toContainText("Jordan Blake");
});
