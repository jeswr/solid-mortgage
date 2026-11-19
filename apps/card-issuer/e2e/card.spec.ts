// AUTHORED-BY Claude Opus 5.5
import { expect, test } from "@playwright/test";
import {
  expectAccessible,
  expectNoSideScroll,
  expectTrustSurfaces,
  OUTSIDE_LENS,
  open,
  readAs,
} from "../../../test-support/e2e.ts";
import { act, actThroughWallet, gotoStep, PENNANT, STATEMENT, startTour } from "./demo.ts";

test("the offer page renders with the trust banner and its own metadata", async ({ page }) => {
  await open(page, "./");
  await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
  await expectTrustSurfaces(page);
  await expect(page).toHaveTitle(/Pennant Card/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#B3122B");
  await expect(
    page.getByRole("heading", { level: 1, name: /Pennant Everyday Card/ }),
  ).toBeVisible();
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
});

test("not-found keeps the banner", async ({ page }) => {
  await open(page, "./no-such-page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expectTrustSurfaces(page);
  await expectAccessible(page, OUTSIDE_LENS);
});

test("before Alex grants anything, the pod refuses Pennant's read", async ({ page }) => {
  await open(page, "./apply");
  await expect(page.getByRole("group", { name: "Or fill in the form" })).toBeVisible();
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
  await page.locator('[data-tour="card-check-identity"]').click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    /Refused by the pod \(40[13]\)/,
    { timeout: 60_000 },
  );
  // Nothing was checked, so Pennant keeps no record, and the form stays open.
  expect(
    (await readAs(page, "card-issuer", "card-issuer/applications/alex-identity-check")).status,
  ).toBe(404);
  await expect(page.getByTestId("card-prefilled")).toHaveCount(0);
  expect([401, 403]).toContain((await readAs(page, "card-issuer", STATEMENT)).status);
  await expectAccessible(page, OUTSIDE_LENS);
});

test("steps 2 to 5 from their tour buttons: one read under Y1, then a refusal", async ({
  page,
}) => {
  test.setTimeout(480_000);
  // Step 1 at Alder Bank, by its tour button.
  await startTour(page);
  await act(page, "attestation");
  expect((await readAs(page, "alex", STATEMENT)).status).toBe(200);

  // 2. Use verified identity: the request, the wallet's approval, and back to Pennant.
  await gotoStep(page, "card-consent", "/card-issuer/apply");
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
  await actThroughWallet(page, "card-consent");
  const policy = await readAs(page, "alex", "alex/policies/y1");
  expect(policy.status).toBe(200);
  expect(policy.body).toContain("count");
  expect((await readAs(page, "alex", "alex/consents/y1-given")).status).toBe(200);
  expect((await readAs(page, "alex", `${STATEMENT}.acl`)).body).toContain(PENNANT);

  // 3. Check identity: one read, three checks, the form collapses prefilled.
  await gotoStep(page, "card-verify", "/card-issuer/apply");
  await act(page, "card-verify");
  await expect(page.getByTestId("card-prefilled")).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("[data-gate]")).toHaveCount(3);
  await expect(page.locator(".gates li.pass")).toHaveCount(3);
  await page.getByText("Identity: prefilled from Alder Bank's statement").click();
  await expect(page.getByTestId("card-claims")).toContainText("14 Larch Lane");
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
  const record = await readAs(page, "card-issuer", "card-issuer/applications/alex-identity-check");
  expect(record.status).toBe(200);
  expect(record.body).toContain("/alex/credentials/kyc-attestation");
  // The runtime closed Y1 after that read: Pennant's rule is gone from the statement's ACL.
  await expect
    .poll(async () => (await readAs(page, "alex", `${STATEMENT}.acl`)).body, { timeout: 30_000 })
    .not.toContain(PENNANT);

  // The Lens names who closed it.
  await page.evaluate(() =>
    (window as unknown as { __demo?: { lens(view: string): unknown } }).__demo?.lens("step"),
  );
  await expect(
    page
      .locator("solid-lens")
      .getByText(/one-time grant, closed by Alex's wallet/)
      .first(),
  ).toBeAttached({ timeout: 30_000 });

  // 4. What Pennant did not see: a summary step on the same page.
  await gotoStep(page, "not-shared", "/card-issuer/apply");

  // 5. Refresh: the pod refuses.
  await gotoStep(page, "used-up", "/card-issuer/apply");
  await act(page, "used-up");
  await expect(page.getByTestId("card-refresh-refused")).toContainText("Refused by the pod (403)");
  await expect(page.getByTestId("card-refresh-refused")).toContainText(
    "One-time grant, closed by Alex's wallet",
  );
  await expectAccessible(page, OUTSIDE_LENS);
  expect((await readAs(page, "card-issuer", STATEMENT)).status).toBe(403);

  // Alex's wallet, the same day: the grant shows as used up, and the wallet records it.
  await page.goto("/wallet/kyc");
  await expect(page.getByTestId("wallet-kyc-sharing")).toHaveAttribute("data-state", "used", {
    timeout: 60_000,
  });
  await expect(page.getByTestId("wallet-kyc-sharing")).toContainText(
    "One-time grant, closed by your wallet",
  );
  await expect
    .poll(async () => (await readAs(page, "alex", "alex/consents/y1-used")).status, {
      timeout: 30_000,
    })
    .toBe(200);
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
});
