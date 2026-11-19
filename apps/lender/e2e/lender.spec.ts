// AUTHORED-BY Claude Opus 5.5
/**
 * Juniper's borrower portal against the real pods: steps 7 (start screen), 8, 11 and 17 run from
 * their buttons; the steps before them run as journey beats inside the page, over the same pods
 * (see harness.ts and pods.ts). Every resource a step writes is read back as its owner.
 */
import { DAY } from "@mortgage/content/mortgage/facts";
import { podUrl, readDataset } from "@mortgage/content/mortgage/world";
import { ClosingDisclosure, LoanEstimate } from "@mortgage/data-model";
import { expect, type Page, test } from "@playwright/test";
import { DataFactory } from "n3";
import { expectAccessible, expectNoSideScroll } from "../../../test-support/e2e.ts";
import {
  approveAs,
  fetchAs,
  injectHarness,
  runBeats,
  statusAs,
  type TestWorld,
  testWorld,
} from "./pods.ts";

test.describe.configure({ mode: "serial" });

async function open(page: Page, path: string): Promise<void> {
  await page.goto(`${path}${path.includes("?") ? "&" : "?"}tour=off`);
  await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
}

async function checkPage(page: Page): Promise<void> {
  await expectAccessible(page);
  await expectNoSideScroll(page);
}

/** A second page in the same context carries the test's own pod requests. */
async function helper(page: Page): Promise<{ world: TestWorld; helperPage: Page }> {
  const helperPage = await page.context().newPage();
  await helperPage.goto("manual?tour=off");
  await expect(helperPage.getByRole("heading", { name: "Filling in by hand" })).toBeVisible();
  // The page is controlled once its first pod read has been answered.
  await expect
    .poll(() => helperPage.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);
  await injectHarness(helperPage);
  return { helperPage, world: testWorld(helperPage) };
}

test("metadata, start screen and the hand-filled route", async ({ page }) => {
  await open(page, "./");
  await expect(page).toHaveTitle("Juniper Home Loans");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#2B6777");
  await expect(page.getByRole("button", { name: "Apply with your pod" })).toBeEnabled();
  await checkPage(page);
  await open(page, "manual");
  await checkPage(page);
  await open(page, "nowhere");
  await expect(page.getByRole("heading", { name: "We could not find that page" })).toBeVisible();
  await checkPage(page);
});

test("apply, submit, intend to proceed and acknowledge the Closing Disclosure", async ({
  page,
}) => {
  test.setTimeout(420_000);
  await open(page, "./");
  const { world, helperPage } = await helper(page);
  const alex = (path: string) => podUrl(world, "alex", path);
  const loanFile = (path: string) => podUrl(world, "lender", `loans/JHL-1001/${path}`);

  // Chapter 1 as the issuers' apps would do it.
  await runBeats(helperPage, ["share-employment", "share-assets", "share-credit-summary"]);

  // Before any grant the application screen shows the pod's refusal.
  await open(page, "application");
  await expect(page.getByRole("alert")).toContainText("403");
  await expect(page.getByRole("alert")).toContainText("refused");
  await checkPage(page);

  // Step 7, Juniper's side: the request goes to Alex's inbox and the wallet opens with it.
  await open(page, "./");
  // The wallet is lane A1's app and may not be in this build: stand in for its page (only the
  // page, never a pod) so the hand-off URL can be checked. The pods are untouched.
  await page.route(/\/wallet\/requests\?/, (route) =>
    route.fulfill({ body: "<!doctype html><title>Wallet</title>", contentType: "text/html" }),
  );
  await page.getByRole("button", { name: "Apply with your pod" }).click();
  await page.waitForURL(/\/wallet\/requests\?/);
  const handoff = new URL(page.url());
  const request = handoff.searchParams.get("request");
  expect(request).toBeTruthy();
  expect(handoff.searchParams.get("return")).toContain("/lender/application");
  expect(await statusAs(helperPage, "alex", request as string)).toBe(200);
  // The wallet's approval (lane A1's screen), made here as Alex.
  expect(await approveAs(helperPage, request as string, DAY.application)).toBe("G4");

  // Step 8: the form is filled from the pod, credentials are checked at source, Submit files it.
  await open(page, "application");
  await expect(page.getByText("Alex Rivera").first()).toBeVisible();
  await expect(
    page.getByText(/issued by Ledgerly Payroll · signature checked/).first(),
  ).toBeVisible();
  await expect(page.getByText(/issued by Alder Bank · signature checked/).first()).toBeVisible();
  const submit = page.locator('[data-tour="lender-submit-application"]');
  await expect(submit).toBeEnabled();
  await checkPage(page);
  // A wrong number keeps the six items incomplete; the demo number completes them.
  const ssn = page.getByLabel("Social Security number");
  await ssn.fill("900-00-0000");
  await expect(submit).toBeDisabled();
  await ssn.fill("900-00-4417");
  await submit.click();
  await expect(page.getByText(/Application received on/)).toBeVisible();
  expect(await statusAs(helperPage, "lender", loanFile("application"))).toBe(200);
  expect(await statusAs(helperPage, "alex", alex("mortgage/juniper/application"))).toBe(200);
  expect(await statusAs(helperPage, "alex", alex("consents/g4-credit-report-authorisation"))).toBe(
    200,
  );
  // The typed number went nowhere: not in Juniper's file, not in Alex's copy.
  for (const [owner, url] of [
    ["lender", loanFile("application")],
    ["alex", alex("mortgage/juniper/application")],
  ] as const) {
    const body = await (await fetchAs(helperPage, owner)(url)).text();
    expect(body).not.toContain("900-00-4417");
    expect(body).not.toContain("900004417");
  }

  // Step 11: opening the screen delivers the Loan Estimate; the button records intent.
  await open(page, "disclosures");
  const intent = page.locator('[data-tour="lender-intent-to-proceed"]');
  await expect(intent).toBeEnabled();
  await expect(page.getByText("Business day 1 of 3: on time")).toBeVisible();
  await checkPage(page);
  await intent.click();
  await expect(intent).toHaveText("You said you intend to proceed");
  const leUrl = alex("mortgage/juniper/loan-estimate");
  const estimate = new LoanEstimate(
    leUrl,
    await readDataset(fetchAs(helperPage, "alex"), leUrl),
    DataFactory,
  );
  expect(estimate.intentToProceedDate?.toISOString().slice(0, 10)).toBe(
    world.calendar.date(DAY.loanEstimate),
  );

  // Step 17 needs a loan cleared to close (the Loan Desk's step 16), set up here.
  await runBeats(helperPage, ["refresh-employment-and-clear"]);
  await open(page, "disclosures");
  const received = page.locator('[data-tour="lender-cd-received"]');
  await expect(received).toBeEnabled();
  await expect(page.getByText("Must be received by")).toBeVisible();
  await received.click();
  await expect(received).toHaveText("Receipt confirmed");
  await expect(page.getByText("Closing date respects the waiting period")).toBeVisible();
  await checkPage(page);
  const cdUrl = alex("mortgage/juniper/closing-disclosure");
  const closing = new ClosingDisclosure(
    cdUrl,
    await readDataset(fetchAs(helperPage, "alex"), cdUrl),
    DataFactory,
  );
  expect(closing.receivedDate?.toISOString().slice(0, 10)).toBe(
    world.calendar.date(DAY.closingDisclosure),
  );

  // Status and closing read the same file.
  await open(page, "status");
  await expect(page.getByText("Clear to close")).toBeVisible();
  await checkPage(page);
  await open(page, "closing");
  await expect(page.getByText("Cash to close")).toBeVisible();
  await checkPage(page);
});
