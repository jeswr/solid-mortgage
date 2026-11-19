// AUTHORED-BY Claude Opus 5.5
/**
 * Copperfield against the real pods: step 6. The steps before it (credentials and the proofs,
 * which Alex's wallet makes in step 5) are set up over the same pods: the signing beats inside the
 * page through the harness, the proofs from the test (they need no signing key; see pods.ts). The "What we received" panel must show a yes and who vouches for it, and
 * never the numbers; a read of Alex's pod by Copperfield must be refused.
 */
import { CREDIT, DAY, EMPLOYMENT } from "@mortgage/content/mortgage/facts";
import { proveToLenders } from "@mortgage/content/mortgage/journey";
import { podUrl } from "@mortgage/content/mortgage/world";
import { expect, type Page, test } from "@playwright/test";
import { expectAccessible, expectNoSideScroll } from "../../../test-support/e2e.ts";
import { injectHarness, on, runBeats, statusAs, testWorld } from "./pods.ts";

test.describe.configure({ mode: "serial" });

async function open(page: Page, path: string): Promise<void> {
  await page.goto(`${path}?tour=off`);
  await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
}

async function checkPage(page: Page): Promise<void> {
  await expectAccessible(page);
  await expectNoSideScroll(page);
}

async function controlled(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);
}

test("landing page metadata and empty states", async ({ page }) => {
  await open(page, "./");
  await expect(page).toHaveTitle("Copperfield Mortgage");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#B4532A");
  const cta = page.getByRole("link", { name: "Check if you pre-qualify" }).first();
  await expect(cta).toHaveAttribute("href", /\/wallet\/prove\?return=/);
  await checkPage(page);
  await open(page, "received");
  await expect(page.locator('[data-tour="lender-b-received"]')).toContainText(
    "Copperfield has received nothing",
  );
  await checkPage(page);
  await open(page, "result");
  await expect(page.getByText("We have not received anything from you yet.")).toBeVisible();
  await checkPage(page);
  await open(page, "nowhere");
  await expect(page.getByRole("heading", { name: "Nothing here." })).toBeVisible();
  await checkPage(page);
});

test("what we received: a yes, who vouches for it, and no numbers", async ({ page }) => {
  test.setTimeout(600_000);
  await open(page, "result");
  await controlled(page);
  const helperPage = await page.context().newPage();
  await helperPage.goto("result?tour=off");
  await controlled(helperPage);
  await injectHarness(helperPage);
  const world = testWorld(helperPage);

  await runBeats(helperPage, ["share-employment", "share-credit-summary"]);
  // Step 5 as Alex's wallet runs it: both lenders open a challenge, Alex proves, each checks.
  await on(world, DAY.credentials, proveToLenders);
  const quote = podUrl(world, "lender-b", "quotes/prequalification");
  expect(await statusAs(helperPage, "lender-b", quote)).toBe(200);

  await open(page, "received");
  const panel = page.locator('[data-tour="lender-b-received"]');
  await expect(panel.getByText("Yes", { exact: true })).toHaveCount(2);
  await expect(panel).toContainText("Monthly gross income is at least $7,000");
  await expect(panel).toContainText("Credit score is at least 620");
  await expect(panel).toContainText("Vouched for by Ledgerly Payroll");
  await expect(panel).toContainText("Vouched for by Quillon Credit Bureau");
  await expect(panel).toContainText("statements[].proof.proof[]");
  // The hidden values are nowhere on the page.
  const text = await page.locator("body").innerText();
  const numbers = new Set((text.match(/\d[\d,]*/g) ?? []).map((n) => Number(n.replace(/,/g, ""))));
  expect(numbers.has(EMPLOYMENT.monthlyGrossIncomeUsd)).toBe(false);
  expect(numbers.has(CREDIT.consumerSummaryScore)).toBe(false);
  await panel.click();
  await checkPage(page);

  // Copperfield has no grant in Alex's pod: the pod refuses, and the screen says so.
  await page.getByRole("button", { name: "Ask Alex's pod for the income" }).click();
  await expect(page.getByRole("alert")).toContainText("403 Forbidden");
  expect(
    await statusAs(helperPage, "lender-b", podUrl(world, "alex", "credentials/employment-income")),
  ).toBe(403);

  await open(page, "result");
  await expect(page.getByText("You pre-qualify.")).toBeVisible();
  await checkPage(page);
  await open(page, "./");
  await expect(page.getByText("You already pre-qualified.")).toBeVisible();
});
