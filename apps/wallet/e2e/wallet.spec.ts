// AUTHORED-BY Claude Opus 5.5
/**
 * Cairn against the real service-worker pods (the assembled site, `pnpm run build` first).
 * Earlier journey steps are run by the test harness page with the same functions the apps call;
 * the wallet's own steps (5, 7, 21, 22) are run through the wallet's buttons. Every assertion
 * about access is a request the pod server answered: nothing is mocked.
 */
import AxeBuilder from "@axe-core/playwright";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { CRS_G1 } from "../../../packages/vc-kit/src/zk/crs-pins.ts";
import { keepToOrigin } from "../../../test-support/origin-guard.ts";

type Owner =
  | "alex"
  | "maya"
  | "rosa"
  | "northwind"
  | "payroll"
  | "bank"
  | "bureau"
  | "lender"
  | "lender-b"
  | "aus"
  | "servicer";

interface Harness {
  ready(): Promise<boolean>;
  beats(names: readonly string[]): Promise<string[]>;
  request(code: string, day: number): Promise<string>;
  status(owner: Owner, pod: Owner, path: string, method?: string): Promise<number>;
  write(owner: Owner, pod: Owner, path: string, text: string): Promise<number>;
  members(owner: Owner, pod: Owner, path: string): Promise<string[]>;
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
    write: (owner: Owner, pod: Owner, path: string, text: string) =>
      page.evaluate(
        ([o, p, x, t]) => (window as unknown as { __harness: Harness }).__harness.write(o, p, x, t),
        [owner, pod, path, text] as const,
      ),
    members: (owner: Owner, pod: Owner, path: string) =>
      page.evaluate(
        ([o, p, x]) => (window as unknown as { __harness: Harness }).__harness.members(o, p, x),
        [owner, pod, path] as const,
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
  baseURL,
  context,
  page,
}) => {
  test.setTimeout(240_000);
  // Nothing may leave the site, Aztec's CRS hosts included: the prover loads the site's pinned CRS.
  const guard = await keepToOrigin(context, new URL(baseURL as string).origin);
  const harness = await openHarness(context);
  await harness.beats(["share-employment", "share-credit-summary"]);
  await page.goto("prove");
  expect(await page.evaluate(() => globalThis.crossOriginIsolated)).toBe(true);
  const prove = page.locator('[data-tour="wallet-prove"]');
  await expect(prove).toBeEnabled();
  await prove.click();
  // Seconds with the prover's threads. The prover's workers load from /wallet/assets/, which
  // must carry Cross-Origin-Embedder-Policy too, or the isolated page cannot start them.
  await expect(page.getByText("Checked: yes")).toHaveCount(2, { timeout: 180_000 });
  expect(guard.cdn).toEqual([]);
  expect(guard.outside).toEqual([]);
  expect(guard.crs.some((path) => path.startsWith("/crs/bn254-g1-"))).toBe(true);
  // Each lender wrote its own result; each challenge was used up; neither can read Alex's data.
  for (const lender of ["lender-b", "lender"] as const) {
    expect(await harness.status(lender, lender, "quotes/prequalification")).toBe(200);
    expect(await harness.status(lender, lender, "prequalification/challenge")).toBe(404);
    expect(await harness.status(lender, "alex", "credentials/employment-income")).toBe(403);
    expect(await harness.status(lender, "alex", "credentials/credit-summary")).toBe(403);
  }
});

test("step 5 fails closed on a CRS one bit off: no proof reaches either lender, and the retry proves", async ({
  baseURL,
  context,
  page,
}) => {
  test.setTimeout(300_000);
  const origin = new URL(baseURL as string).origin;
  const guard = await keepToOrigin(context, origin);
  // The one response this suite alters: the site's G1 file, served at its pinned length with its last
  // bit flipped. Only a SHA-256 check over every byte can tell it from the real file, so a browser
  // path that checked the length alone, or nothing, would prove here instead of failing.
  const g1Path = `/crs/${CRS_G1.file}`;
  let tampered = 0;
  await context.route(`${origin}${g1Path}`, async (route) => {
    const real = await route.fetch();
    const body = await real.body();
    expect(real.status()).toBe(200);
    expect(body.length).toBe(CRS_G1.bytes);
    body[body.length - 1] = (body[body.length - 1] ?? 0) ^ 1;
    tampered += 1;
    // no-store, so the browser cannot keep the altered bytes for the retry below.
    await route.fulfill({
      body,
      headers: { ...real.headers(), "cache-control": "no-store" },
      status: 200,
    });
  });
  const harness = await openHarness(context);
  await harness.beats(["share-employment", "share-credit-summary"]);
  const lenders = ["lender-b", "lender"] as const;
  const inboxes = () =>
    Promise.all(lenders.map((lender) => harness.members(lender, lender, "inbox/")));
  const before = await inboxes();
  await page.goto("prove");
  const prove = page.locator('[data-tour="wallet-prove"]');
  await expect(prove).toBeEnabled();
  await prove.click();
  const problem = page.getByRole("alert");
  await expect(problem).toContainText(`the CRS file ${g1Path} does not match its pinned SHA-256`, {
    timeout: 120_000,
  });
  await expect(prove).toBeEnabled();
  expect(tampered).toBeGreaterThan(0);
  await expect(page.getByText("Checked: yes")).toHaveCount(0);
  // Each lender opened its challenge before the prover started, and that is all that was written:
  // no proof presentation reached either inbox, no lender wrote a result, and bb.js did not go to
  // its CDN instead.
  for (const lender of lenders) {
    expect(await harness.status(lender, lender, "prequalification/challenge")).toBe(200);
    expect(await harness.status(lender, lender, "quotes/prequalification")).toBe(404);
  }
  expect(await inboxes()).toEqual(before);
  expect(guard.cdn).toEqual([]);
  expect(guard.outside).toEqual([]);

  // The site serves the right file again: the same tab retries, and proves.
  await context.unroute(`${origin}${g1Path}`);
  await prove.click();
  await expect(page.getByText("Checked: yes")).toHaveCount(2, { timeout: 180_000 });
  await expect(problem).toHaveCount(0);
  for (const lender of lenders) {
    expect(await harness.status(lender, lender, "quotes/prequalification")).toBe(200);
  }
  // The retry's presentations did arrive, one in each inbox: the inbox check above can see one.
  const after = await inboxes();
  for (const [index, members] of after.entries()) {
    const added = members.filter((member) => !(before[index] ?? []).includes(member));
    expect(added).toHaveLength(1);
    expect(added[0]).toMatch(/^inbox\//);
  }
  expect(guard.cdn).toEqual([]);
  expect(guard.outside).toEqual([]);
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
  // Juniper gets the drawer; its underwriting service only the three documents it checks.
  expect(await harness.aclAgents("credentials/")).toContain(lender);
  expect(await harness.aclAgents("credentials/")).not.toContain(aus);
  expect(await harness.aclAgents("credentials/assets")).toEqual(expect.arrayContaining([aus]));
  expect(await harness.status("lender", "alex", "credentials/assets")).toBe(200);
  expect(await harness.status("aus", "alex", "credentials/assets")).toBe(200);
  expect(await harness.status("aus", "alex", "property/purchase-agreement")).toBe(403);
});

test("step 7 by Do it for me: the wallet points to Juniper, has it ask, then approves", async ({
  context,
  page,
}) => {
  const harness = await openHarness(context);
  await harness.beats(ISSUED);
  await page.goto("requests?tour=mortgage&step=apply-consent");
  const handoff = page.locator("section.handoff");
  await expect(handoff).toContainText("Waiting for Juniper Home Loans");
  await expect(handoff.getByRole("link", { name: "Go to Juniper Home Loans" })).toHaveAttribute(
    "href",
    "/lender/",
  );
  await expectAxeClean(page);
  // The tour's own "Do it for me": the cursor presses the stand-in, then the request's Approve.
  await page.evaluate(() =>
    (window as unknown as { __demo: { act(): Promise<string> } }).__demo.act(),
  );
  await page.waitForURL(/\/lender\/application$/, { timeout: 60_000 });
  expect(await harness.status("alex", "alex", "policies/g4")).toBe(200);
  expect(await harness.status("alex", "alex", "consents/g4-given")).toBe(200);
  expect(await harness.status("lender", "alex", "credentials/assets")).toBe(200);
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
  const g2 = page.locator("article.grant:has(#grant-G2)");
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
  // The harness ran the earlier beats with agents off; on this first wallet page the back-office
  // agents catch up on every inbox message, and pod reads queue behind them for a while.
  await expect(card).toContainText("Contact details", { timeout: 90_000 });
  await expect(card).toContainText("Autopay instruction");
  await page.locator('[data-tour="wallet-approve-g8"]').click();
  await expect(page.getByRole("status").filter({ hasText: "Shared" })).toBeVisible({
    timeout: 90_000,
  });
  expect(await harness.status("alex", "alex", "consents/g8-given")).toBe(200);
  expect(await harness.status("servicer", "alex", "profile/contact")).toBe(200);
  expect(await harness.status("servicer", "alex", "credentials/assets")).toBe(403);

  // Step 22 (day 72): the sharing screen explains Juniper's grant, then Alex revokes it.
  await page.goto("sharing?tour=mortgage&step=revoke-juniper");
  const juniper = page.locator("article.grant:has(#grant-G4)");
  await expect(juniper).toContainText("Mortgage application");
  await expect(juniper).toContainText("Castellan Housing Finance may read");
  await expect(juniper).toContainText("Active", { timeout: 60_000 });
  await page.locator('[data-tour="wallet-revoke-juniper"]').click();
  await expect(juniper).toContainText("Withdrawn", { timeout: 60_000 });
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
  await expect(page.locator("article.grant:has(#grant-G2)")).toContainText("Ended");
  await expect(page.locator("article.grant:has(#grant-G8)")).toContainText("Active");
});

test("holders: one wallet shows Alex's, Maya's, Rosa's and Northwind's pods, each as its holder", async ({
  context,
  page,
}) => {
  const harness = await openHarness(context);
  // Maya's own document: hers to read, refused to an organisation and to another holder.
  expect(await harness.write("maya", "maya", "notes/repair-quote", "car repair: $2,000")).toBe(201);
  expect(await harness.status("maya", "maya", "notes/repair-quote")).toBe(200);
  expect(await harness.status("bank", "maya", "notes/repair-quote")).toBe(403);
  expect(await harness.status("alex", "maya", "notes/repair-quote")).toBe(403);
  expect(await harness.status("maya", "alex", "credentials/")).toBe(403);

  // The mortgage demo names no holder: Alex, as before, with no parameter in the address.
  await page.goto("./");
  await expect(page.locator("main")).toContainText("Alex, everything below");
  await expect(page.locator(".drawers > li").filter({ hasText: "Credentials" })).toBeVisible();
  await expect(page.getByText("Signed in as Alex Rivera").first()).toBeVisible();
  expect(new URL(page.url()).searchParams.has("holder")).toBe(false);

  // Switch to Maya: the wallet now reads her pod as her (a read as Alex would be refused).
  await page.locator('[data-tour="wallet-holder-maya"]').click();
  await expect(page.locator("main")).toContainText("Maya, everything below");
  const drawers = page.locator(".drawers > li");
  await expect(drawers.filter({ hasText: "Notes" })).toContainText("1 item");
  await expect(drawers.filter({ hasText: "Profile" })).toBeVisible();
  await expect(drawers.filter({ hasText: "Credentials" })).toHaveCount(0);
  await expect(page.getByText("Signed in as Maya Torres").first()).toBeVisible();
  await expect(page.locator('[data-tour="wallet-holder-maya"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("link", { name: /Open Prove/ })).toHaveCount(0);
  await expectAxeClean(page);

  // Moving between screens and reloading keep Maya.
  await page.getByRole("link", { name: "Documents" }).click();
  await expect(page).toHaveURL(/holder=maya/);
  await page.reload();
  await page.getByRole("link", { name: "Home" }).click();
  await expect(page.locator("main")).toContainText("Maya, everything below");

  // A business holder, shown as its operator.
  await page.locator('[data-tour="wallet-holder-northwind"]').click();
  await expect(page.locator("main")).toContainText(
    "Everything Northwind Logistics LLC keeps is in one store it controls",
  );
  await expect(
    page.getByText("Signed in as Jordan Blake, for Northwind Logistics LLC").first(),
  ).toBeVisible();
  await expect(page.locator(".drawers > li").filter({ hasText: "Notes" })).toHaveCount(0);

  // A link can name the holder; back to Alex, whose pod is as it was.
  await page.goto("./?holder=rosa");
  await expect(page.locator("main")).toContainText("Rosa, everything below");
  await page.locator('[data-tour="wallet-holder-alex"]').click();
  await expect(page.locator("main")).toContainText("Alex, everything below");
  await expect(page.locator(".drawers > li").filter({ hasText: "Credentials" })).toBeVisible();
  expect(new URL(page.url()).searchParams.has("holder")).toBe(false);
});
