import AxeBuilder from "@axe-core/playwright";
import {
  type SolidTestAccount,
  type SolidTestServer,
  startSolidServer,
} from "@mortgage/solid-kit/testing";
import { expect, type Page, type Route, test } from "@playwright/test";
import {
  changeServicingAccess,
  closingRecordIri,
  executeClosing,
  readConsentLedger,
} from "../apps/closing/lib/server/scene";
import { bannerFullText, INTERSTITIAL_CONTINUE_LABEL } from "../packages/ui/src/disclaimers";
import { AppRunner } from "./support/app-runner";

const runner = new AppRunner();
let pods: SolidTestServer;
let owner: SolidTestAccount;
let lender: SolidTestAccount;
let servicer: SolidTestAccount;
let podBase = "";
let appOrigin = "";
let minute = 0;

function sceneOptions() {
  return {
    podFetch: owner.authFetch,
    now: () => new Date(Date.UTC(2026, 6, 16, 14, 30 + minute++)),
    randomId: () => `e2e-${minute}`,
  };
}

async function jsonRoute(route: Route, operation: () => Promise<object>): Promise<void> {
  try {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ simulated: true, ...(await operation()) }),
      status: 200,
    });
  } catch (error) {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ detail: error instanceof Error ? error.message : "scene failed" }),
      status: 500,
    });
  }
}

async function wireSceneToSeededPod(page: Page): Promise<void> {
  await page.route("**/closing/api/scene/close", (route) =>
    jsonRoute(route, () => executeClosing(podBase, owner.webid, lender.webid, sceneOptions())),
  );
  await page.route("**/closing/api/scene/grant-servicer", (route) =>
    jsonRoute(route, async () => ({
      receipt: await changeServicingAccess(
        podBase,
        owner.webid,
        servicer.webid,
        "grant",
        sceneOptions(),
      ),
    })),
  );
  await page.route("**/closing/api/scene/revoke-lender", (route) =>
    jsonRoute(route, async () => ({
      receipt: await changeServicingAccess(
        podBase,
        owner.webid,
        lender.webid,
        "revoke",
        sceneOptions(),
      ),
    })),
  );
  await page.route("**/closing/api/scene/ledger", (route) =>
    jsonRoute(route, async () => ({
      receipts: await readConsentLedger(podBase, owner.webid, sceneOptions()),
    })),
  );
}

test.describe("closing scene 5", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    pods = await startSolidServer({ oidc: true });
    const primary = pods.accounts[0];
    if (primary === undefined) throw new Error("OIDC harness did not provision an owner");
    owner = primary;
    lender = await pods.provisionAccount();
    servicer = await pods.provisionAccount();
    podBase = `${pods.baseUrl}/`;
    await executeClosing(podBase, owner.webid, lender.webid, sceneOptions());
    appOrigin = await runner.start({
      command: "start",
      packageName: "@mortgage/app-closing",
      readyPath: "/closing/api/health",
    });
  });

  test.afterAll(async () => {
    runner.stopAll();
    await pods?.stop();
  });

  test("approve servicer, revoke lender, and read the app receipt ledger on a seeded pod", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await wireSceneToSeededPod(page);
    await page.goto(`${appOrigin}/closing`);
    await page.getByRole("button", { name: INTERSTITIAL_CONTINUE_LABEL }).click();

    const eCloseBanner = page
      .locator("[data-concept-demo-banner]")
      .filter({ hasText: "Wolters Kluwer" });
    await expect(eCloseBanner).toContainText(
      bannerFullText({ organization: "Wolters Kluwer (eOriginal)" }),
    );
    const servicerBanner = page.locator("[data-concept-demo-banner]").filter({ hasText: "Truist" });
    await expect(servicerBanner).toContainText(
      bannerFullText({ organization: "Truist", role: "mortgage servicer" }),
    );

    await page.getByRole("button", { name: "eSign closing package" }).click();
    await expect(page.getByText("ClosingRecord written to Alex's pod")).toBeVisible();
    await page.getByRole("button", { name: "Approve servicer access" }).click();
    await expect(page.getByText("Servicer read access granted", { exact: false })).toBeVisible();
    expect((await servicer.authFetch(closingRecordIri(podBase))).status).toBe(200);

    await page.getByRole("button", { name: "Revoke lender access" }).click();
    await expect(page.getByText("Lender read access revoked", { exact: false })).toBeVisible();
    expect([401, 403]).toContain((await lender.authFetch(closingRecordIri(podBase))).status);

    await page.getByRole("button", { name: "Read consent-receipt ledger" }).click();
    const cards = page.locator("[data-receipt-card]");
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toHaveAttribute("data-receipt-action", "grant");
    await expect(cards.nth(0)).toContainText(servicer.webid);
    await expect(cards.nth(1)).toHaveAttribute("data-receipt-action", "revoke");
    await expect(cards.nth(1)).toContainText(lender.webid);
    await expect(cards.nth(0).locator("time")).toHaveAttribute("datetime", /2026-07-16T/);
    await expect(cards.nth(1).locator("time")).toHaveAttribute("datetime", /2026-07-16T/);
    await expect(
      page.getByText("WAC and the Solid protocol do not provide this audit ledger"),
    ).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
