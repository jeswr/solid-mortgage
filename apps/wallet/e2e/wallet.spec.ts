// AUTHORED-BY Claude Opus 5.5
/**
 * Cairn against the real service-worker pods (the assembled site, `pnpm run build` first).
 * Earlier journey steps are run by the test harness page with the same functions the apps call;
 * the wallet's own steps (5, 7, 21, 22) are run through the wallet's buttons. Every assertion
 * about access is a request the pod server answered: nothing is mocked.
 */
import AxeBuilder from "@axe-core/playwright";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";

type Owner = "alex" | "payroll" | "bank" | "bureau" | "lender" | "lender-b" | "aus" | "servicer";

interface Harness {
  ready(): Promise<boolean>;
  beats(names: readonly string[]): Promise<string[]>;
  request(code: string, day: number): Promise<string>;
  status(owner: Owner, pod: Owner, path: string, method?: string): Promise<number>;
  aclAgents(path: string): Promise<string[]>;
  webid(owner: Owner): string;
}

/** A page on the harness, in the same browser context (same pods) as the wallet pages. */
async function openHarness(context: BrowserContext) {
  const page = await context.newPage();
  await page.goto("/__wallet-e2e__/");
  await page.waitForFunction(
    () => (window as unknown as { __harness?: Harness }).__harness !== undefined,
  );
  await page.evaluate(() => (window as unknown as { __harness: Harness }).__harness.ready());
  return {
    page,
    beats: (names: string[]) =>
      page.evaluate((n) => (window as unknown as { __harness: Harness }).__harness.beats(n), names),
    request: (code: string, day: number) =>
      page.evaluate(
        ([c, d]) => (window as unknown as { __harness: Harness }).__harness.request(c, d),
        [code, day] as const,
      ),
    status: (owner: Owner, pod: Owner, path: string, method = "GET") =>
      page.evaluate(
        ([o, p, x, m]) =>
          (window as unknown as { __harness: Harness }).__harness.status(o, p, x, m),
        [owner, pod, path, method] as const,
      ),
    aclAgents: (path: string) =>
      page.evaluate(
        (p) => (window as unknown as { __harness: Harness }).__harness.aclAgents(p),
        path,
      ),
    webid: (owner: Owner) =>
      page.evaluate((o) => (window as unknown as { __harness: Harness }).__harness.webid(o), owner),
  };
}

const ISSUED = ["share-employment", "share-assets", "share-credit-summary"];

/** Every beat from step 2 to the second beat of step 20, except the proof and step 6. */
const UP_TO_SERVICING = [
  ...ISSUED,
  "approve-application-access",
  "submit-application",
  "pull-credit-and-run-aus",
  "aus-source-checks",
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

async function expectTrust(page: Page) {
  await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
  await expect(page.getByText("Cairn is a fictional organisation.").first()).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#0F5C5A");
}

async function expectAxeClean(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`),
  ).toEqual([]);
}

async function expectNoSideScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test("every screen: trust banner, axe clean, no horizontal scroll at 390 px", async ({
  context,
  page,
}) => {
  const harness = await openHarness(context);
  await harness.beats(ISSUED);
  await harness.request("G4", 3);
  await page.setViewportSize({ height: 844, width: 390 });
  const routes: [string, RegExp][] = [
    ["./", /Drawers/],
    ["documents", /Employment and income verification/],
    ["documents/employment-income", /Signature, issuer key, validity and status all check out/],
    ["requests", /Juniper Home Loans/],
    ["sharing", /Ledgerly Payroll/],
    ["activity", /Given/],
    ["inbox", /Nothing has been delivered yet|Inbox/],
    ["prove", /The questions/],
    ["no-such-screen", /This screen is not part of Cairn/],
  ];
  for (const [route, content] of routes) {
    await page.goto(route);
    await expectTrust(page);
    await expect(page.locator("main")).toContainText(content);
    await expectNoSideScroll(page);
    await expectAxeClean(page);
  }
  await expect(page).toHaveTitle(/Cairn/);
});

test("home reads the drawers from the pod", async ({ context, page }) => {
  const harness = await openHarness(context);
  await harness.beats(["share-employment"]);
  await page.goto("./");
  const drawers = page.locator(".drawers > li");
  await expect(drawers.filter({ hasText: "Credentials" })).toContainText("2 items");
  await expect(drawers.filter({ hasText: "Identity" })).toContainText("1 item");
});

test("step 5: prove to two lenders, cross-origin isolated, no grant given", async ({
  context,
  page,
}) => {
  test.setTimeout(480_000);
  const harness = await openHarness(context);
  await harness.beats(["share-employment", "share-credit-summary"]);
  await page.goto("prove");
  expect(await page.evaluate(() => globalThis.crossOriginIsolated)).toBe(true);
  const prove = page.locator('[data-tour="wallet-prove"]');
  await expect(prove).toBeEnabled();
  await prove.click();
  await expect(page.getByText("Checked: yes")).toHaveCount(2, { timeout: 420_000 });
  // Each lender wrote its own result; each challenge was used up; neither can read Alex's data.
  for (const lender of ["lender-b", "lender"] as const) {
    expect(await harness.status(lender, lender, "quotes/prequalification")).toBe(200);
    expect(await harness.status(lender, lender, "prequalification/challenge")).toBe(404);
    expect(await harness.status(lender, "alex", "credentials/employment-income")).toBe(403);
    expect(await harness.status(lender, "alex", "credentials/credit-summary")).toBe(403);
  }
});

test("step 7: Juniper's request explained, approved, enforced, and the visitor sent back", async ({
  context,
  page,
}) => {
  const harness = await openHarness(context);
  await harness.beats(ISSUED);
  expect(await harness.status("lender", "alex", "credentials/assets")).toBe(403);
  const request = await harness.request("G4", 3);
  await page.goto(
    `requests?request=${encodeURIComponent(request)}&return=${encodeURIComponent("/lender/application")}`,
  );
  const card = page.locator("article.consent").first();
  await expect(card).toContainText("Juniper Home Loans");
  await expect(card).toContainText("may read");
  await expect(card).toContainText("Castellan Housing Finance may read");
  await expect(card).toContainText("Until Day");
  await page.locator('[data-tour="wallet-approve-g4"]').click();
  await page.waitForURL(/\/lender\/application$/);
  expect(await harness.status("alex", "alex", "policies/g4")).toBe(200);
  expect(await harness.status("alex", "alex", "consents/g4-given")).toBe(200);
  const lender = await harness.webid("lender");
  const aus = await harness.webid("aus");
  expect(await harness.aclAgents("credentials/")).toEqual(expect.arrayContaining([lender, aus]));
  expect(await harness.status("lender", "alex", "credentials/assets")).toBe(200);
  expect(await harness.status("aus", "alex", "credentials/assets")).toBe(200);
  expect(await harness.status("aus", "alex", "property/purchase-agreement")).toBe(403);
});

test("a return URL outside the site is never followed", async ({ context, page }) => {
  const harness = await openHarness(context);
  const request = await harness.request("G2", 1);
  await page.goto(
    `requests?request=${encodeURIComponent(request)}&return=${encodeURIComponent("https://example.org/")}`,
  );
  await page.locator("article.consent button.primary").click();
  await expect(page.getByRole("status").filter({ hasText: "Shared" })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/wallet/requests");
});

test("declining shares nothing and removes the request", async ({ context, page }) => {
  const harness = await openHarness(context);
  await harness.request("G3", 1);
  await page.goto("requests");
  await page.getByRole("button", { name: "Decline" }).click();
  await expect(page.getByText("No organisation is waiting for an answer.")).toBeVisible();
  expect(await harness.status("alex", "alex", "policies/g3")).toBe(404);
  expect(await harness.status("bureau", "alex", "credentials/credit-summary", "PUT")).toBe(403);
});

test("the wallet applies expiry when the day moves past a grant's end", async ({
  context,
  page,
}) => {
  const harness = await openHarness(context);
  await harness.beats(["share-assets"]);
  expect(await harness.status("alex", "alex", "consents/g2-expired")).toBe(404);
  // In the tour on day 12 (step 13), seven days after G2 was approved on day 1.
  await page.goto("sharing?tour=mortgage&step=appraisal-report");
  const g2 = page.locator("article.grant", { hasText: "G2" });
  await expect(g2).toContainText("Ended");
  expect(await harness.status("alex", "alex", "consents/g2-expired")).toBe(200);
  expect(await harness.aclAgents("credentials/")).not.toContain(await harness.webid("bank"));
});

test("steps 21 and 22: approve Marigold, revoke Juniper, and the pod refuses Juniper", async ({
  context,
  page,
}) => {
  test.setTimeout(600_000);
  const harness = await openHarness(context);
  await harness.beats(UP_TO_SERVICING);
  expect(await harness.status("lender", "alex", "credentials/assets")).toBe(200);
  const request = await harness.request("G8", 70);

  // Step 21, in the guided tour (day 70).
  await page.goto(
    `requests?tour=mortgage&step=servicer-connect&request=${encodeURIComponent(request)}`,
  );
  const card = page.locator("article.consent", { hasText: "Marigold Loan Servicing" });
  await expect(card).toContainText("Contact details");
  await expect(card).toContainText("Autopay instruction");
  await page.locator('[data-tour="wallet-approve-g8"]').click();
  await expect(page.getByRole("status").filter({ hasText: "Shared" })).toBeVisible();
  expect(await harness.status("alex", "alex", "consents/g8-given")).toBe(200);
  expect(await harness.status("servicer", "alex", "profile/contact")).toBe(200);
  expect(await harness.status("servicer", "alex", "credentials/assets")).toBe(403);

  // Step 22 (day 72): the sharing screen explains Juniper's grant, then Alex revokes it.
  await page.goto("sharing?tour=mortgage&step=revoke-juniper");
  const juniper = page.locator("article.grant", { hasText: "Juniper Home Loans" });
  await expect(juniper).toContainText("Mortgage application");
  await expect(juniper).toContainText("Castellan Housing Finance may read");
  await expect(juniper).toContainText("Active");
  await page.locator('[data-tour="wallet-revoke-juniper"]').click();
  await expect(juniper).toContainText("Withdrawn");
  await expect(page.locator('[data-tour="wallet-revoke-juniper"]')).toHaveCount(0);
  await juniper.getByRole("button", { name: "Show access rules" }).click();
  await expect(juniper).toContainText("No access rule in your pod names Juniper Home Loans");

  // The pod itself now refuses Juniper (the step 23 read); its own loan file is untouched.
  expect(await harness.status("alex", "alex", "consents/g4-withdrawn")).toBe(200);
  expect(await harness.status("lender", "alex", "credentials/assets")).toBe(403);
  expect(await harness.status("lender", "alex", "identity/identity-credential")).toBe(403);
  expect(await harness.status("aus", "alex", "credentials/assets")).toBe(403);
  expect(await harness.status("lender", "lender", "loans/JHL-1001/application")).toBe(200);
  expect(await harness.aclAgents("credentials/")).not.toContain(await harness.webid("lender"));
  // Grants that ended on their own are shown as ended, Marigold's is still active.
  await expect(page.locator("article.grant", { hasText: "G2" })).toContainText("Ended");
  await expect(page.locator("article.grant", { hasText: "G8" })).toContainText("Active");
});
