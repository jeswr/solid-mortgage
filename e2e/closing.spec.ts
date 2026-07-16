/**
 * closing (sm-34) e2e: scene 5 end-to-end against the REAL production app
 * server — real DPoP-bound Solid-OIDC on every API call, a real WAC-enforcing
 * in-memory sparq pod, the app's REAL client-credentials service identity for
 * pod IO, the real route handlers. NO request interception ever fulfils a
 * response: the only Playwright routing attaches the borrower's genuine DPoP
 * headers (the same recipe as e2e/property.spec.ts).
 *
 * Proves the roborev sm-34 findings closed at the outermost boundary:
 *   - grant/revoke are REAL WAC effects, asserted by authenticated reads as
 *     the lender/servicer identities;
 *   - a REPEAT close is 409 and does not restore the revoked lender;
 *   - the consent ledger records every grant/revoke (decision 0006);
 *   - an anonymous caller is challenged 401, and the UI shows the honest
 *     Mode-1 fallback instead of pretending success.
 */
import AxeBuilder from "@axe-core/playwright";
import {
  containerGrantAcl,
  type DevOidcIssuer,
  profileCardFixture,
  type SolidTestAccount,
  type SolidTestServer,
  seedPod,
  startDevOidcIssuer,
  startSolidServer,
} from "@mortgage/solid-kit/testing";
import { expect, type Page, test } from "@playwright/test";
import { closingRecordIri } from "../apps/closing/lib/server/scene";
import { bannerFullText, INTERSTITIAL_CONTINUE_LABEL } from "../packages/ui/src/disclaimers";
import { AppRunner } from "./support/app-runner";

const SERVICE_CLIENT = { clientId: "closing-service", clientSecret: "e2e-service-secret" };

const runner = new AppRunner();
let pods: SolidTestServer;
let owner: SolidTestAccount;
let lender: SolidTestAccount;
let servicer: SolidTestAccount;
let borrower: DevOidcIssuer;
let serviceIssuer: DevOidcIssuer;
let podBase = "";
let appOrigin = "";

/**
 * Attach the borrower's REAL DPoP-bound Solid-OIDC session to the page's API
 * calls (decision 0015: the routes derive borrower + pod from the token).
 * Fresh single-use proof bound to each request's method + htu — the request
 * always CONTINUES to the real server, nothing is fulfilled from the test.
 */
async function authenticatePage(page: Page): Promise<void> {
  await page.route("**/closing/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const auth = await borrower.authHeaders(request.method(), `${url.origin}${url.pathname}`);
    await route.continue({ headers: { ...request.headers(), ...auth } });
  });
}

test.describe("closing scene 5 (real authenticated rail)", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    test.setTimeout(180_000);
    // Pods FIRST: the dev issuer advertises the pod as the borrower's
    // pim:storage (decision 0015 forward claim), so it needs the pod origin.
    pods = await startSolidServer({ oidc: true });
    const primary = pods.accounts[0];
    if (primary === undefined) throw new Error("OIDC harness did not provision an owner");
    owner = primary;
    [lender, servicer] = await Promise.all([pods.provisionAccount(), pods.provisionAccount()]);
    podBase = `${pods.baseUrl}/`;
    [borrower, serviceIssuer] = await Promise.all([
      startDevOidcIssuer({ storage: podBase }),
      // http-schemed WebID: the POD verifies the service's tokens itself.
      startDevOidcIssuer({ clientCredentials: SERVICE_CLIENT, webidScheme: "http" }),
    ]);

    // Backward acknowledgment (decision 0015 L2.3), publicly readable like any
    // WebID document, plus the sm-28-modelled wallet grant for the app's
    // service identity over the mortgage container.
    await seedPod(
      pods.baseUrl,
      [profileCardFixture({ webid: borrower.webid, name: "Alex Rivera", storage: podBase })],
      { fetch: owner.authFetch, ownerWebid: owner.webid },
    );
    const container = await owner.authFetch(`${podBase}mortgage/`, {
      method: "PUT",
      headers: { "content-type": "text/turtle" },
      body: "",
    });
    if (!container.ok) throw new Error(`container seed failed (${container.status})`);
    const acl = await owner.authFetch(`${podBase}mortgage/.acl`, {
      method: "PUT",
      headers: { "content-type": "text/turtle" },
      body: containerGrantAcl({
        containerPath: "/mortgage/",
        ownerWebid: owner.webid,
        agents: [{ webid: serviceIssuer.webid, control: true }],
      }),
    });
    if (!acl.ok) throw new Error(`grant seed failed (${acl.status})`);

    appOrigin = await runner.start({
      command: "start",
      packageName: "@mortgage/app-closing",
      readyPath: "/closing/api/health",
      env: {
        MORTGAGE_TRUSTED_OIDC_ISSUERS: borrower.issuer,
        MORTGAGE_POD_ALLOWED_ORIGINS: pods.baseUrl,
        MORTGAGE_DEV_ALLOW_LOOPBACK: "1",
        // Reconstruct the DPoP htu from the request host (the Vercel posture:
        // TLS terminates ahead of the function). Without this, `next start`
        // reconstructs a mismatching htu and every DPoP-bound call is 401 —
        // matches the property/lender-boa e2e recipe.
        MORTGAGE_TRUST_FORWARDED_HEADERS: "1",
        MORTGAGE_LENDER_SERVICE_WEBID: lender.webid,
        MORTGAGE_SERVICER_SERVICE_WEBID: servicer.webid,
        MORTGAGE_CLOSING_SERVICE_WEBID: serviceIssuer.webid,
        MORTGAGE_CLOSING_POD_SERVICE_ISSUER: serviceIssuer.issuer,
        MORTGAGE_CLOSING_POD_SERVICE_CLIENT_ID: SERVICE_CLIENT.clientId,
        MORTGAGE_CLOSING_POD_SERVICE_CLIENT_SECRET: SERVICE_CLIENT.clientSecret,
      },
    });
  });

  test.afterAll(async () => {
    runner.stopAll();
    await pods?.stop();
    await borrower?.stop();
    await serviceIssuer?.stop();
  });

  test("anonymous scene routes are challenged 401 (decision 0015) @smoke", async () => {
    const response = await fetch(`${appOrigin}/closing/api/scene/close`, { method: "POST" });
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBeTruthy();
  });

  test("without a session the UI shows the honest Mode-1 fallback", async ({ page }) => {
    await page.goto(`${appOrigin}/closing`);
    await page.getByRole("button", { name: INTERSTITIAL_CONTINUE_LABEL }).click();
    await page.getByRole("button", { name: "eSign closing package" }).click();
    await expect(page.locator("[data-closing-unauthenticated]")).toContainText(
      "No authenticated borrower session",
    );
  });

  test("close, transfer servicing, revoke the lender, and read the ledger — all real", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const record = closingRecordIri(podBase);
    await authenticatePage(page);
    await page.goto(`${appOrigin}/closing`);
    await page.getByRole("button", { name: INTERSTITIAL_CONTINUE_LABEL }).click();

    const eCloseBanner = page
      .locator("[data-concept-demo-banner]")
      .filter({ hasText: "Wolters Kluwer" });
    await expect(eCloseBanner).toContainText(
      bannerFullText({
        organization: "Wolters Kluwer (eOriginal)",
        role: "digital closing platform",
      }),
    );
    const servicerBanner = page.locator("[data-concept-demo-banner]").filter({ hasText: "Truist" });
    await expect(servicerBanner).toContainText(
      bannerFullText({ organization: "Truist", role: "mortgage servicer" }),
    );

    await page.getByRole("button", { name: "eSign closing package" }).click();
    await expect(page.getByText("ClosingRecord written to Alex's pod")).toBeVisible({
      timeout: 30_000,
    });
    // The close granted the lender for real (an authenticated read succeeds).
    expect((await lender.authFetch(record)).status).toBe(200);

    await page.getByRole("button", { name: "Approve servicer access" }).click();
    await expect(page.getByText("Servicer read access granted", { exact: false })).toBeVisible({
      timeout: 30_000,
    });
    expect((await servicer.authFetch(record)).status).toBe(200);

    await page.getByRole("button", { name: "Revoke lender access" }).click();
    await expect(page.getByText("Lender read access revoked", { exact: false })).toBeVisible({
      timeout: 30_000,
    });
    expect([401, 403]).toContain((await lender.authFetch(record)).status);
    expect((await servicer.authFetch(record)).status).toBe(200);

    // REGRESSION (roborev sm-34 High): a REPEAT close against the live server
    // is 409 and does NOT restore the revoked lender's read — proven by a real
    // authenticated read attempt as the lender identity.
    const repeat = await fetch(`${appOrigin}/closing/api/scene/close`, {
      method: "POST",
      headers: {
        ...(await borrower.authHeaders("POST", `${appOrigin}/closing/api/scene/close`)),
        "content-type": "application/json",
      },
      body: "{}",
    });
    expect(repeat.status).toBe(409);
    expect([401, 403]).toContain((await lender.authFetch(record)).status);
    expect((await servicer.authFetch(record)).status).toBe(200);

    await page.getByRole("button", { name: "Read consent-receipt ledger" }).click();
    const cards = page.locator("[data-receipt-card]");
    await expect(cards).toHaveCount(3, { timeout: 30_000 });
    await expect(cards.nth(0)).toHaveAttribute("data-receipt-action", "grant");
    await expect(cards.nth(0)).toContainText(lender.webid);
    await expect(cards.nth(1)).toHaveAttribute("data-receipt-action", "grant");
    await expect(cards.nth(1)).toContainText(servicer.webid);
    await expect(cards.nth(2)).toHaveAttribute("data-receipt-action", "revoke");
    await expect(cards.nth(2)).toContainText(lender.webid);
    await expect(cards.nth(0).locator("time")).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}T/);
    await expect(
      page.getByText("WAC and the Solid protocol do not provide this audit ledger"),
    ).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
