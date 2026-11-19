// AUTHORED-BY Claude Opus 5.5
/**
 * Castellan's console against the real service-worker pods: step 10's source checks read each
 * credential where it lives and check it against its issuer's status list; after Alex withdraws
 * G4 the same reads come back refused. The harness plays every other app's beats.
 */
import { expect, type Page, test } from "@playwright/test";
import {
  beats,
  expectAccessible,
  expectNoHorizontalScroll,
  expectTrustSurfaces,
  openHarness,
  read,
  UP_TO_APPLICATION,
} from "./support.ts";

const CHECKS = "casefiles/JHL-1001/source-checks";

async function open(page: Page, path: string): Promise<void> {
  await page.goto(`${path}${path.includes("?") ? "&" : "?"}tour=off`);
  await expectTrustSurfaces(page);
}

const THROUGH_SALE = [
  "deliver-loan-estimate",
  "intend-to-proceed",
  "order-services",
  "submit-appraisal",
  "issue-title-commitment",
  "bind-insurance",
  "refresh-employment-and-clear",
  "deliver-closing-disclosure",
  "acknowledge-closing-disclosure",
  "sign-at-closing",
  "record-with-county",
  "deliver-loan",
  "announce-servicing-transfer",
];

test("source checks, the purchase, and the same checks refused after the revoke", async ({
  context,
}) => {
  const harness = await openHarness(context);
  const page = await context.newPage();
  page.on("pageerror", (error) => console.error(`aus: ${error.message}`));

  await test.step("the journey up to Juniper's casefile submission", () =>
    beats(harness, ...UP_TO_APPLICATION, "pull-credit-and-run-aus"));

  await test.step("step 10: each credential checked at its source", async () => {
    await open(page, CHECKS);
    const table = page.locator('[data-tour="aus-source-checks"]');
    await expect(table).toHaveCount(1);
    const rows = table.locator("tbody tr");
    await expect(rows).toHaveCount(3);
    for (const path of [
      "/credentials/employment-income",
      "/credentials/assets",
      "/credentials/credit-summary",
    ]) {
      const row = rows.filter({ hasText: path });
      await expect(row).toContainText("valid, key from the issuer's WebID");
      await expect(row).toContainText("not revoked (status list read)");
    }
    // The pointers and findings are Castellan's own records.
    const listing = await read(harness, "aus", `${CHECKS}/`);
    expect(listing.status).toBe(200);
    expect((await read(harness, "aus", "casefiles/JHL-1001/findings")).status).toBe(200);
    await expectAccessible(page);
  });

  await test.step("findings: numbered messages from the casefile", async () => {
    await open(page, "casefiles/JHL-1001");
    await expect(page.getByText("0001")).toBeVisible();
    await expectAccessible(page);
  });

  await test.step("the rest of the journey, through the loan sale", () =>
    beats(harness, ...THROUGH_SALE));

  await test.step("the purchase confirmation and the closing record Juniper shared", async () => {
    expect((await read(harness, "aus", "deliveries/JHL-1001")).status).toBe(200);
    await open(page, "deliveries/JHL-1001");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("JHL-1001");
    await expect(page.getByText(/refused/i)).toHaveCount(0);
    await expectAccessible(page);
  });

  await test.step("after the revoke, the source checks are refused by Alex's pod", async () => {
    await beats(harness, "connect-servicer", "revoke-juniper");
    expect((await read(harness, "alex", "credentials/assets", "aus")).status).toBe(403);
    await open(page, CHECKS);
    const rows = page.locator('[data-tour="aus-source-checks"] tbody tr');
    await expect(rows.filter({ hasText: "/credentials/assets" })).toContainText(
      "REFUSED 403: the pod no longer lets Castellan read this credential at source",
    );
    await expectAccessible(page);
  });

  await test.step("every route: axe and 390 px", async () => {
    for (const route of ["", "casefiles/JHL-1001", CHECKS, "deliveries/JHL-1001", "nope"]) {
      await page.setViewportSize({ height: 900, width: 1280 });
      await open(page, route);
      await expect(page.locator("main h1, h1").first()).toBeVisible();
      await expectAccessible(page);
      await page.setViewportSize({ height: 844, width: 390 });
      await expectNoHorizontalScroll(page);
    }
  });
});

test("Castellan's agent answers a casefile on its own", async ({ context }) => {
  const harness = await openHarness(context);
  await beats(harness, ...UP_TO_APPLICATION);
  // Juniper submits the casefile but does not run Castellan in line: the worker agent must.
  await harness.evaluate(() => window.harness.submitCasefileOnly());
  await expect
    .poll(async () => (await read(harness, "aus", "casefiles/JHL-1001/findings")).status, {
      timeout: 90_000,
    })
    .toBe(200);
});

test("free play on fresh pods: no casefile yet", async ({ page }) => {
  await open(page, "");
  await expect(page.getByRole("heading", { name: "Automated underwriting" })).toBeVisible();
  await open(page, CHECKS);
  await expect(page.locator("body")).not.toContainText("■ valid");
  await expectAccessible(page);
});
