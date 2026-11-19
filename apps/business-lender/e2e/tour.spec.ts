// AUTHORED-BY Claude Opus 5.5
/**
 * The whole business KYB tour on the built site (flows.md section 3), step by step through the
 * tour engine, across the wallet (Northwind), Halyard LEI Services, Alder Bank and Brackenridge
 * Bank: every interactive step by its own tour button, the proof made live in the browser, each
 * step's page checked for accessibility and phone width, and each step's effect read back from
 * the pods. Read-backs are made as Northwind or as the organisation in its own pod, so the test's
 * own reads do not add organisation reads of Northwind's credentials to the ledger.
 */
import { expect, type Page, test } from "@playwright/test";
import {
  expectAccessible,
  expectNoSideScroll,
  OUTSIDE_LENS,
  readAs,
} from "../../../test-support/e2e.ts";
import { act, gotoStep, startTour, stepDone } from "./demo.ts";

test.setTimeout(900_000);

async function checkPage(page: Page): Promise<void> {
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
}

const card = (who: string) => `/pods/${who}/profile/card#me`;

test("the business KYB tour, all twelve steps, with the pods read back", async ({ page }) => {
  // 1. Northwind's pod, empty.
  await startTour(page);
  await expect(page.getByText(/credentials drawer is empty/)).toBeVisible({ timeout: 90_000 });
  await stepDone(page, "vault");
  await checkPage(page);
  expect((await readAs(page, "northwind", "northwind/credentials/")).status).toBe(200);

  // 2 to 4. The register issues three credentials and the anchors.
  await gotoStep(page, "org-identity", "/registry/entity");
  await checkPage(page);
  await act(page, "org-identity");
  await gotoStep(page, "officer", "/registry/officers");
  await act(page, "officer");
  await gotoStep(page, "ownership", "/registry/ownership");
  await checkPage(page);
  await act(page, "ownership");
  const v1 = await readAs(page, "northwind", "northwind/credentials/beneficial-ownership");
  expect(v1.body).toContain("4200");
  expect((await readAs(page, "northwind", "northwind/credentials/anchors/owner-2")).status).toBe(
    200,
  );

  // 5. Alder Bank's request; Northwind approves K1.
  await gotoStep(page, "onboarding-consent", "/wallet/kyb/requests");
  await expect(page.getByTestId("kyb-request-k1")).toBeVisible({ timeout: 60_000 });
  await checkPage(page);
  await act(page, "onboarding-consent");
  expect((await readAs(page, "northwind", "northwind/policies/k1")).status).toBe(200);
  expect((await readAs(page, "northwind", "northwind/consents/k1-given")).status).toBe(200);
  const acl = (await readAs(page, "northwind", "northwind/credentials/beneficial-ownership.acl"))
    .body;
  expect(acl).toContain(card("bank"));
  expect(acl).not.toContain(card("business-lender"));

  // 6. Due diligence at Alder Bank.
  await gotoStep(page, "due-diligence", "/bank/kyb/due-diligence");
  await checkPage(page);
  await act(page, "due-diligence");
  await expect(page.getByTestId("bank-cdd-decision")).toHaveText("Account opened", {
    timeout: 60_000,
  });
  for (const name of ["org-identity", "officer-authorisation", "beneficial-ownership"]) {
    await expect(page.getByTestId(`bank-check-${name}`)).toContainText("Verified");
  }
  const cdd = await readAs(page, "bank", "bank/kyb/cdd/northwind");
  expect(cdd.status).toBe(200);
  expect(cdd.body).toContain("Priya Nandakumar");
  expect(cdd.body).not.toContain("Marcus Webb");

  // 7. The proof, made live in this browser on the cross-origin isolated page.
  await gotoStep(page, "proof", "/wallet/prove/kyb");
  expect(await page.evaluate(() => globalThis.crossOriginIsolated)).toBe(true);
  await expect(page.locator('[data-tour="wallet-kyb-prove"]')).toBeEnabled({ timeout: 90_000 });
  await checkPage(page);
  await act(page, "proof");
  const live = page.getByTestId("kyb-proved-live");
  await expect(live).toContainText(/Proved live in this browser in [\d.]+ s/, { timeout: 60_000 });
  const ms = Number(await live.getAttribute("data-ms"));
  expect(ms).toBeGreaterThan(0);
  console.log(`business KYB: proved live in the browser in ${ms} ms`);
  await expect(page.getByTestId("kyb-pre-decision")).toContainText(
    "Jordan Blake and Priya Nandakumar",
  );
  const pre = await readAs(page, "business-lender", "business-lender/kyb/pre-decisions/northwind");
  expect(pre.body).toContain("Pre-decision: proceed");
  expect(pre.body).not.toContain("Marcus Webb");
  // The challenge was single-use: it is gone.
  expect(
    (await readAs(page, "business-lender", "business-lender/kyb/challenges/northwind")).status,
  ).toBe(404);

  // 8. K2: Brackenridge reads the credentials for its deal sheet.
  await gotoStep(page, "disclosed-grant", "/wallet/kyb/requests");
  await expect(page.getByTestId("kyb-request-k2")).toBeVisible({ timeout: 60_000 });
  await checkPage(page);
  await act(page, "disclosed-grant");
  expect((await readAs(page, "northwind", "northwind/policies/k2")).status).toBe(200);
  // The step completes on the desk's read; the deal sheet's record is written just after.
  await expect
    .poll(
      async () =>
        (await readAs(page, "business-lender", "business-lender/kyb/deals/northwind-ownership"))
          .status,
      { timeout: 60_000 },
    )
    .toBe(200);
  await expect(page.getByRole("status").filter({ hasText: "Grant K2 given" })).toBeVisible();

  // 9. The sale at the register.
  await gotoStep(page, "ownership-change", "/registry/ownership");
  await act(page, "ownership-change");
  const v2 = await readAs(page, "northwind", "northwind/credentials/beneficial-ownership");
  expect(v2.body).toContain("6000");

  // 10. Brackenridge's deal page: its desk and Alder's monitoring read the re-issue.
  await gotoStep(page, "both-banks", "/business-lender/deal");
  await stepDone(page, "both-banks");
  await expect(page.getByTestId("lender-owners")).toContainText("60%", { timeout: 60_000 });
  await expect(page.getByTestId("lender-owners")).toContainText("Re-issued at the register");
  await expect(page.getByTestId("lender-covenants")).toContainText("Met");
  await checkPage(page);

  // 11. Northwind closes the Alder account: K1 withdrawn, Alder's next read refused.
  await gotoStep(page, "revoke", "/wallet/kyb/sharing");
  await checkPage(page);
  await act(page, "revoke");
  await expect(page.getByTestId("kyb-withdrawn")).toContainText("refused by the pod (403)");
  expect((await readAs(page, "northwind", "northwind/consents/k1-withdrawn")).status).toBe(200);
  const after = (await readAs(page, "northwind", "northwind/credentials/beneficial-ownership.acl"))
    .body;
  expect(after).not.toContain(card("bank"));
  expect(after).toContain(card("business-lender"));
  // Alder keeps its own record.
  expect((await readAs(page, "bank", "bank/kyb/cdd/northwind")).status).toBe(200);

  // 12. The examiner view: every obligation evidenced from the log.
  await gotoStep(page, "examiner", "/wallet/kyb/ledger");
  const obligations = page.locator("journey-ledger .obligation");
  await expect(obligations).toHaveCount(5, { timeout: 60_000 });
  for (const id of [
    "identify-customer",
    "ownership-prong",
    "control-prong",
    "monitoring",
    "retention",
  ]) {
    await expect(
      page.locator(`journey-ledger .obligation[data-obligation="${id}"]`),
    ).toHaveAttribute("data-met", "true");
  }
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
});
