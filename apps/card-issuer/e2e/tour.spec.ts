// AUTHORED-BY Claude Opus 5.5
/**
 * The whole reusable-KYC tour on the built site (flows.md section 8), step by step through the
 * tour engine, across Alder Bank, Pennant and Alex's wallet: every interactive step by its own
 * tour button, every step's page checked for accessibility and phone width, each step's effect
 * read back from the pods, and the ledger's totals, counted from the log, checked at the end.
 */
import { expect, type Page, test } from "@playwright/test";
import {
  expectAccessible,
  expectNoSideScroll,
  OUTSIDE_LENS,
  readAs,
} from "../../../test-support/e2e.ts";
import { act, actThroughWallet, gotoStep, PENNANT, STATEMENT, startTour } from "./demo.ts";

test.setTimeout(600_000);

async function checkPage(page: Page): Promise<void> {
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
}

const metric = (page: Page, key: string) => page.locator(`[data-metric="reusable-kyc.${key}"]`);

test("the reusable-KYC tour, all seven steps, with the pods read back", async ({ page }) => {
  // 1. Alder Bank states what it verified, and signs it.
  await startTour(page);
  await expect(page.getByRole("heading", { level: 1, name: "Your identity" })).toBeVisible();
  await checkPage(page);
  await act(page, "attestation");
  await expect(page.getByTestId("bank-kyc-statement")).toBeVisible({ timeout: 60_000 });
  const v1 = await readAs(page, "alex", STATEMENT);
  expect(v1.status).toBe(200);
  expect(v1.body).toContain("eddsa-rdfc-2022");
  expect(v1.body).toContain("BitstringStatusListEntry");
  expect((await readAs(page, "bank", "bank/issued/kyc-attestation-v1")).status).toBe(200);
  await checkPage(page);

  // 2. Pennant asks for one read; Alex's wallet approves Y1.
  await gotoStep(page, "card-consent", "/card-issuer/apply");
  await checkPage(page);
  await actThroughWallet(page, "card-consent");
  expect((await readAs(page, "alex", "alex/policies/y1")).status).toBe(200);
  expect((await readAs(page, "alex", "alex/consents/y1-given")).status).toBe(200);
  expect((await readAs(page, "alex", `${STATEMENT}.acl`)).body).toContain(PENNANT);

  // 3. Pennant reads once and checks signature, status and the scheme's list.
  await gotoStep(page, "card-verify", "/card-issuer/apply");
  await act(page, "card-verify");
  await expect(page.locator(".gates li.pass")).toHaveCount(3, { timeout: 60_000 });
  await checkPage(page);
  expect(
    (await readAs(page, "card-issuer", "card-issuer/applications/alex-identity-check")).status,
  ).toBe(200);

  // 4. What Pennant did not see.
  await gotoStep(page, "not-shared", "/card-issuer/apply");
  await checkPage(page);

  // 5. Asking again is refused.
  await gotoStep(page, "used-up", "/card-issuer/apply");
  await act(page, "used-up");
  await expect(page.getByTestId("card-refresh-refused")).toContainText("(403)");
  await checkPage(page);

  // 6. The next day: the bank withdraws version 1 and re-issues.
  await gotoStep(page, "reissue", "/bank/kyc");
  await checkPage(page);
  await act(page, "reissue");
  await expect(page.getByTestId("bank-kyc-withdrawn")).toContainText("Version 1 is withdrawn", {
    timeout: 60_000,
  });
  await checkPage(page);
  expect((await readAs(page, "bank", "bank/issued/kyc-attestation-v2")).status).toBe(200);
  expect((await readAs(page, null, "bank/status/list")).status).toBe(200);
  const v2 = await readAs(page, "alex", STATEMENT);
  expect(v2.body).toContain("Replacement government photo ID");
  expect(v2.body).not.toBe(v1.body);

  // 7. The journey ledger, with totals counted from the log.
  await gotoStep(page, "ledger", "/wallet/kyc/ledger");
  await expect(page.locator("journey-ledger")).toBeVisible({ timeout: 60_000 });
  const expected: Record<string, number> = {
    accessWithdrawn: 1,
    checks: 1,
    denied: 1,
    institutions: 2,
    reads: 1,
    statementsWithdrawn: 1,
    withdrawals: 2,
  };
  for (const [key, value] of Object.entries(expected)) {
    await expect(metric(page, key)).toHaveAttribute("data-value", String(value), {
      timeout: 30_000,
    });
  }
  // The Lens counts from the same log; the narration's "two institutions" is its figure.
  const lens = await page.evaluate(() =>
    (
      window as unknown as { __demo?: { totals(): { organisations: number; denied: number } } }
    ).__demo?.totals(),
  );
  expect(lens?.organisations).toBe(2);
  expect(lens?.denied).toBe(1);
  await checkPage(page);
  // Y1 is on record as ended: the wallet's first visit after the read is on day 75, when its
  // expiry check closes the record (or, earlier, its "used" record does).
  await expect
    .poll(
      async () =>
        Math.min(
          (await readAs(page, "alex", "alex/consents/y1-used")).status,
          (await readAs(page, "alex", "alex/consents/y1-expired")).status,
        ),
      { timeout: 30_000 },
    )
    .toBe(200);
});
