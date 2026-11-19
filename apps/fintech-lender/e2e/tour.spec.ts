// AUTHORED-BY Claude Opus 5.5
/**
 * The whole small-dollar lending tour on the built site (flows.md section 4), step by step through
 * the tour engine, across Cairn, Trueline Identity, Ledgerly, Alder Bank, Quillon, Finchly and
 * Swiftline: every interactive step by its own tour button, every step's page checked for
 * accessibility and phone width, and each step's effect read back from the pods, ending with the
 * refusal after Maya withdraws Finchly's grant and the journey ledger's totals.
 */
import { expect, type Page, test } from "@playwright/test";
import {
  expectAccessible,
  expectNoSideScroll,
  OUTSIDE_LENS,
  readAs,
} from "../../../test-support/e2e.ts";
import { keepToOrigin } from "../../../test-support/origin-guard.ts";
import { act, gotoStep, startTour } from "./demo.ts";

test.setTimeout(900_000);

async function checkPage(page: Page): Promise<void> {
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
}

/** Poll a pod read until it answers `status` (a back office acts a moment after the event). */
async function eventually(page: Page, agent: string, path: string, status: number) {
  await expect
    .poll(async () => (await readAs(page, agent, path)).status, { timeout: 60_000 })
    .toBe(status);
  return readAs(page, agent, path);
}

const metric = (page: Page, key: string) =>
  page.locator(`[data-metric="small-dollar-lending.${key}"]`);

test("the small-dollar lending tour, all twelve steps, with the pods read back", async ({
  baseURL,
  context,
  page,
}) => {
  // Nothing may leave the site, Aztec's CRS hosts included: the prover loads the site's pinned CRS.
  const guard = await keepToOrigin(context, new URL(baseURL as string).origin);
  // 1. An empty pod.
  await startTour(page);
  await expect(page.getByTestId("sd-drawers")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("None yet. Your credentials drawer is empty.")).toBeVisible();
  await checkPage(page);
  expect((await readAs(page, "maya", "maya/consents/")).status).toBe(200);

  // 2. Trueline Identity: verified once, written to the pod under slot S1.
  await gotoStep(page, "identity", "/idv/check");
  await checkPage(page);
  await act(page, "identity");
  await expect(page.getByTestId("idv-issued")).toBeVisible();
  const identity = await readAs(page, "maya", "maya/credentials/identity");
  expect(identity.status).toBe(200);
  expect(identity.body).toContain("Maya Torres");
  expect([401, 403]).toContain((await readAs(page, "idv", "maya/credentials/identity")).status);

  // 3. Ledgerly: employment and income, and its anchor.
  await gotoStep(page, "income", "/payroll/lending");
  await checkPage(page);
  await act(page, "income");
  expect((await readAs(page, "maya", "maya/credentials/employment-income")).status).toBe(200);
  expect((await readAs(page, "maya", "maya/credentials/employment-income-anchor")).status).toBe(
    200,
  );

  // 4. Alder Bank: the cash-flow summary and its two anchors.
  await gotoStep(page, "cash-flow", "/bank/lending/cash-flow");
  await checkPage(page);
  await act(page, "cash-flow");
  for (const path of ["cash-flow", "cash-flow-score-anchor", "returned-payments-anchor"]) {
    expect((await readAs(page, "maya", `maya/credentials/${path}`)).status).toBe(200);
  }

  // 5. Quillon: the credit summary.
  await gotoStep(page, "credit-summary", "/bureau/lending");
  await checkPage(page);
  await act(page, "credit-summary");
  expect((await readAs(page, "maya", "maya/credentials/credit-summary")).status).toBe(200);

  // 6. Two quotes, nothing handed over: proofs made in the wallet, grant A1 for Alder's check.
  await gotoStep(page, "prove", "/wallet/lending/prove");
  await checkPage(page);
  await act(page, "prove");
  await expect(page.getByTestId("sd-proved-fintech-lender")).toBeVisible();
  await expect(page.getByTestId("sd-proved-bank")).toBeVisible();
  expect(guard.cdn).toEqual([]);
  expect(guard.outside).toEqual([]);
  expect(guard.crs.some((path) => path.startsWith("/crs/bn254-g1-"))).toBe(true);
  const quote = await readAs(page, "fintech-lender", "fintech-lender/quotes/maya");
  expect(quote.status).toBe(200);
  expect(quote.body).not.toContain("2860");
  expect((await readAs(page, "bank", "bank/quotes/maya")).status).toBe(200);
  // Neither lender can read anything in Maya's pod yet.
  expect([401, 403]).toContain(
    (await readAs(page, "fintech-lender", "maya/credentials/cash-flow")).status,
  );
  expect((await readAs(page, "maya", "maya/policies/a1")).status).toBe(200);

  // 7. Apply: grant L1, its consent record written first.
  await gotoStep(page, "apply", "/fintech-lender/apply");
  await expect(page.getByTestId("fintech-quote")).toContainText("Pre-qualified");
  await expect(page.getByTestId("fintech-access")).toContainText("403");
  await checkPage(page);
  await act(page, "apply");
  await expect(page.getByTestId("fintech-access")).toContainText("200", { timeout: 60_000 });
  expect((await readAs(page, "maya", "maya/policies/l1")).status).toBe(200);
  expect((await readAs(page, "maya", "maya/consents/l1-given")).status).toBe(200);
  expect((await readAs(page, "fintech-lender", "maya/credentials/cash-flow")).status).toBe(200);

  // 8. One decision, two models; the disclosure is Maya's to keep.
  await gotoStep(page, "decision", "/fintech-lender/decision");
  await expect(page.getByTestId("fintech-bureau-only")).toContainText("Declined", {
    timeout: 120_000,
  });
  await expect(page.getByTestId("fintech-with-cash-flow")).toContainText("Approved");
  await checkPage(page);
  await act(page, "decision");
  await expect(page.getByTestId("fintech-disclosed")).toBeVisible();
  const disclosure = await readAs(page, "maya", "maya/loans/finchly/disclosure");
  expect(disclosure.status).toBe(200);
  expect(disclosure.body).toContain("FL-2048");
  expect(
    (await readAs(page, "fintech-lender", "fintech-lender/loans/fl-2048-decision")).status,
  ).toBe(200);

  // 9. Alder's decline arrives with its reasons, in the pod.
  await gotoStep(page, "decline-notice", "/bank/lending/loans");
  await expect(page.getByTestId("bank-lending-notice")).toBeVisible({ timeout: 120_000 });
  await checkPage(page);
  const notice = await readAs(page, "maya", "maya/loans/alder/adverse-action");
  expect(notice.status).toBe(200);
  expect(notice.body).toContain("Length of credit history");
  expect([401, 403]).toContain(
    (await readAs(page, "bank", "maya/loans/alder/adverse-action")).status,
  );

  // 10. The payout: one record, once.
  await gotoStep(page, "payout", "/payout/status");
  await checkPage(page);
  await act(page, "payout");
  await expect(page.getByTestId("payout-receipt")).toBeVisible();
  expect((await readAs(page, "payout", "payout/payouts/fl-2048")).status).toBe(200);
  expect((await readAs(page, "maya", "maya/consents/l2-used")).status).toBe(200);
  await page.getByRole("button", { name: "Read again" }).click();
  await expect(page.getByTestId("payout-second-read")).toContainText("Refused by the pod (403)");

  // 11. The payments become a credential.
  await gotoStep(page, "repayments", "/fintech-lender/servicing");
  await checkPage(page);
  await act(page, "repayments");
  await expect(page.getByTestId("fintech-repayment")).toBeVisible();
  const repayment = await readAs(page, "maya", "maya/credentials/repayment-history");
  expect(repayment.status).toBe(200);
  expect(repayment.body).toContain("FL-2048");
  expect((await readAs(page, "bureau", "fintech-lender/loans/fl-2048-furnishing")).status).toBe(
    200,
  );

  // 12. Paid off, access ended: Maya withdraws L1, and Finchly's next read is refused.
  await gotoStep(page, "revoke", "/wallet/lending/sharing");
  await checkPage(page);
  await act(page, "revoke");
  expect((await readAs(page, "maya", "maya/consents/l1-withdrawn")).status).toBe(200);
  const ended = await eventually(
    page,
    "fintech-lender",
    "fintech-lender/loans/fl-2048-access-ended",
    200,
  );
  expect(ended.body).toContain("403");
  expect([401, 403]).toContain(
    (await readAs(page, "fintech-lender", "maya/credentials/cash-flow")).status,
  );

  // The journey ledger, counted from the log.
  await page.goto("/wallet/lending/ledger");
  await expect(metric(page, "issuers")).toHaveAttribute("data-value", "5", { timeout: 60_000 });
  await expect(metric(page, "lenders")).toHaveAttribute("data-value", "2");
  await expect(metric(page, "paymentServices")).toHaveAttribute("data-value", "1");
  await expect(metric(page, "credentials")).toHaveAttribute("data-value", "5");
  await expect(metric(page, "denied")).not.toHaveAttribute("data-value", "0");
  await checkPage(page);
});
