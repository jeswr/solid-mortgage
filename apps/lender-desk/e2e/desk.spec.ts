// AUTHORED-BY Claude Opus 5.5
/**
 * Juniper Loan Desk against the real service-worker pods: steps 9, 12, 16, 20 and 23 run
 * through their buttons; the harness plays the other apps' beats in between and reads back,
 * as the owner, what each step wrote. Step 23's refusal comes from the pod's own access check.
 */
import { expect, type Page, test } from "@playwright/test";
import {
  beats,
  expectAccessible,
  expectNoHorizontalScroll,
  expectTrustSurfaces,
  openHarness,
  press,
  read,
  UP_TO_APPLICATION,
} from "./support.ts";

const LOAN = "loans/JHL-1001";
const TABS = [
  "summary",
  "1003",
  "credit",
  "aus",
  "verifications",
  "appraisal",
  "title",
  "insurance",
  "conditions",
  "disclosures",
  "closing",
  "post-closing",
];

/** A desk route in free play (no tour), loaded fresh so it reads the pods again. */
async function open(page: Page, path: string): Promise<void> {
  await page.goto(`${path}${path.includes("?") ? "&" : "?"}tour=off`);
  await expectTrustSurfaces(page);
}

async function expectStatus(
  harness: Page,
  owner: string,
  path: string,
  status: number,
  reader?: string,
) {
  const result = await read(harness, owner, path, reader);
  expect(result.status, `${reader ?? owner} GET /pods/${owner}/${path}`).toBe(status);
  return result.body;
}

test("the desk's five steps write to the pods, and the revoke ends in a 403 on screen", async ({
  context,
}) => {
  const harness = await openHarness(context);
  const page = await context.newPage();
  page.on("pageerror", (error) => console.error(`desk: ${error.message}`));

  await test.step("the portal's beats: credentials shared, access approved, application in", () =>
    beats(harness, ...UP_TO_APPLICATION));

  await test.step("step 9: pull credit and run underwriting", async () => {
    await open(page, `${LOAN}/credit`);
    await press(page, "desk-credit-aus");
    const order = await expectStatus(harness, "lender", `${LOAN}/orders/credit-report`, 200);
    expect(order).toContain("OrderDelivered");
    await expectStatus(harness, "bureau", "orders/JHL-1001/report", 200);
    await expectStatus(harness, "alex", "mortgage/juniper/score-notice", 200);
    await expectStatus(harness, "aus", "casefiles/JHL-1001/findings", 200);
    await page.reload();
    await expect(page.getByText("Credit pulled and underwriting run.")).toBeVisible();
  });

  await test.step("the portal's beats: Loan Estimate and intent to proceed", () =>
    beats(harness, "deliver-loan-estimate", "intend-to-proceed"));

  await test.step("before the revoke, the same read is allowed", async () => {
    await open(page, `${LOAN}/verifications`);
    const message = await press(page, "desk-read-again");
    expect(message).toContain("allowed the read (200)");
    await expect(page.getByTestId("denied-result")).toHaveCount(0);
  });

  await test.step("step 12: order services (Alex approves both requests)", async () => {
    await open(page, `${LOAN}/verifications`);
    await press(page, "desk-order-services");
    await expectStatus(harness, "lender", `${LOAN}/orders/appraisal`, 200);
    await expectStatus(harness, "lender", `${LOAN}/orders/title`, 200);
    // Both requests were approved, so the providers can now read what they asked for.
    await expectStatus(harness, "alex", "property/subject-property", 200, "appraisal");
  });

  await test.step("the providers' beats: appraisal, title commitment, insurance", () =>
    beats(harness, "submit-appraisal", "issue-title-commitment", "bind-insurance"));

  await test.step("step 16: refresh employment and clear to close", async () => {
    await open(page, `${LOAN}/conditions`);
    await press(page, "desk-refresh-clear");
    const decision = await expectStatus(harness, "lender", `${LOAN}/decision`, 200);
    expect(decision).toContain("Approved");
  });

  await test.step("the closing beats: CD, signing, recording", () =>
    beats(
      harness,
      "deliver-closing-disclosure",
      "acknowledge-closing-disclosure",
      "sign-at-closing",
      "record-with-county",
    ));

  await test.step("step 20: deliver the loan to Castellan", async () => {
    await open(page, `${LOAN}/post-closing`);
    await press(page, "desk-deliver-loan");
    await expectStatus(harness, "lender", `${LOAN}/closing-record`, 200);
    await expectStatus(harness, "aus", "deliveries/JHL-1001", 200);
    await expectStatus(harness, "alex", "mortgage/juniper/servicing-transfer-notice", 200);
  });

  await test.step("the wallet's beats: connect the servicer, revoke Juniper (G4)", () =>
    beats(harness, "connect-servicer", "revoke-juniper"));

  await test.step("step 23: read bank data again: 403 on screen, own records kept", async () => {
    // The pod itself, independent of the screen: Alex still reads it; Juniper no longer can.
    await expectStatus(harness, "alex", "credentials/assets", 200);
    await expectStatus(harness, "alex", "credentials/assets", 403, "lender");
    await open(page, `${LOAN}/verifications`);
    expect(await press(page, "desk-read-again")).toContain("refused");
    const denied = page.getByTestId("denied-result");
    await expect(denied).toContainText("403 Forbidden");
    await expect(denied).toContainText("GET /credentials/assets");
    await expect(denied).toContainText("Grant G4 was withdrawn.");
    await expect(denied).toContainText(
      "Juniper still holds the loan file it is required to keep. What has ended is its access to Alex's data at source.",
    );
    const kept = denied.getByRole("table");
    await expect(kept.getByRole("row", { name: /Loan application/ })).toContainText("200");
    await expect(kept.getByRole("row", { name: /Underwriting decision/ })).toBeVisible();
    await expect(kept.getByRole("row", { name: /Closing record/ })).toBeVisible();
    await expectAccessible(page);
  });

  await test.step("every route, with the whole file on record: axe and 390 px", async () => {
    const routes = ["", ...TABS.map((tab) => `${LOAN}/${tab}`), "no-such-page"];
    for (const route of routes) {
      await page.setViewportSize({ height: 900, width: 1280 });
      await open(page, route);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.getByText(/^Loading /)).toHaveCount(0);
      await expectAccessible(page);
      await page.setViewportSize({ height: 844, width: 390 });
      await expectNoHorizontalScroll(page);
    }
  });
});

test("free play on fresh pods: every action waits for its prerequisite", async ({ page }) => {
  await open(page, "");
  await expect(page.getByRole("heading", { name: "Pipeline" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Application" })).toBeVisible();
  await open(page, `${LOAN}/credit`);
  const button = page.locator('[data-tour="desk-credit-aus"]');
  await expect(button).toBeDisabled();
  await expect(page.getByText("Waiting for the application")).toBeVisible();
  for (const [tab, target] of [
    ["verifications", "desk-order-services"],
    ["verifications", "desk-read-again"],
    ["conditions", "desk-refresh-clear"],
    ["post-closing", "desk-deliver-loan"],
  ] as const) {
    await open(page, `${LOAN}/${tab}`);
    await expect(page.locator(`[data-tour="${target}"]`)).toBeDisabled();
  }
  await expectAccessible(page);
});
