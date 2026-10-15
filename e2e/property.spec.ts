/**
 * property (sm-33) e2e: the two branded issuer flows end-to-end against the
 * REAL production app server (real DPoP-bound Solid-OIDC, real in-memory sparq
 * pods, the real route handlers). Asserts the R1 banner + WCAG axe on every
 * page, the disclosed-value preview, and that an authenticated caller issues a
 * shape-valid credential into the token-derived pod for BOTH brands.
 */

import AxeBuilder from "@axe-core/playwright";
import { personas } from "@mortgage/data-model";
import {
  type DevOidcIssuer,
  type SolidTestServer,
  seedPod,
  startDevOidcIssuer,
  startSolidServer,
} from "@mortgage/solid-kit/testing";
import { expect, type Page, test } from "@playwright/test";
import { bannerFullText } from "../packages/ui/src/disclaimers";
import { AppRunner } from "./support/app-runner";

const runner = new AppRunner();
let appOrigin = "";
let pods: SolidTestServer;
let podBase = "";
let issuer: DevOidcIssuer;

test.describe("property (sm-33)", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    test.setTimeout(180_000);
    // Pods FIRST: the dev issuer advertises the pod as the borrower's
    // pim:storage (decision 0015 forward claim), so it needs the pod origin.
    pods = await startSolidServer({});
    podBase = `${pods.baseUrl}/`;
    issuer = await startDevOidcIssuer({ storage: podBase });

    const [alex] = await personas({
      now: new Date(),
      podBases: { "alex-rivera": podBase },
      webIds: { "alex-rivera": issuer.webid },
    });
    if (alex === undefined) throw new Error("persona fixtures missing");
    await seedPod(pods.baseUrl, [
      ...alex.resources.map((resource) => ({ path: resource.path, body: resource.turtle })),
      {
        path: "/profile/card",
        body: `<${issuer.webid}> <http://www.w3.org/ns/pim/space#storage> <${podBase}> .\n`,
      },
    ]);

    appOrigin = await runner.start({
      packageName: "@mortgage/app-property",
      readyPath: "/property/api/health",
      command: "start",
      env: {
        MORTGAGE_TRUSTED_OIDC_ISSUERS: issuer.issuer,
        MORTGAGE_POD_ALLOWED_ORIGINS: pods.baseUrl,
        MORTGAGE_DEV_ALLOW_LOOPBACK: "1",
        MORTGAGE_ENABLE_RUNTIME_ISSUANCE: "1",
        // Reconstruct the DPoP htu from the request host (the Vercel posture:
        // TLS terminates ahead of the function). Without this, `next start`
        // reconstructs a mismatching htu host/scheme and every DPoP-bound call
        // is rejected 401 — matches apps/lender-boa's e2e recipe.
        MORTGAGE_TRUST_FORWARDED_HEADERS: "1",
      },
    });
  });

  test.afterAll(async () => {
    runner.stopAll();
    await pods?.stop();
    await issuer?.stop();
  });

  async function expectBannerAndAxe(page: Page, organization: string, role?: string) {
    const banner = page.locator("[data-concept-demo-banner]").first();
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(
      bannerFullText(role === undefined ? { organization } : { organization, role }),
    );
    // WCAG 2.1 A/AA. The axe "best-practice" bucket is excluded: its
    // landmark-containment rule flags the shared ConceptDemoBanner
    // (packages/ui — not this app's surface).
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }

  /**
   * Attach the borrower's REAL DPoP-bound Solid-OIDC session to the page's API
   * calls (decision 0015: the routes derive borrower + pod from the token).
   * Fresh single-use proof bound to each request's method + htu.
   */
  async function authenticatePage(page: Page): Promise<void> {
    await page.route("**/property/api/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const auth = await issuer.authHeaders(request.method(), `${url.origin}${url.pathname}`);
      await route.continue({ headers: { ...request.headers(), ...auth } });
    });
  }

  test("health probe answers for the tour dock @smoke", async () => {
    const response = await fetch(`${appOrigin}/property/api/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, service: "property", simulated: true });
  });

  test("hub page: banner + axe @smoke", async ({ page }) => {
    const response = await page.goto(`${appOrigin}/property`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Property Services" })).toBeVisible();
    await expectBannerAndAxe(page, "Cotality and First American");
  });

  test("appraisal page WITHOUT a session: disclosed value, honesty copy, banner + axe @smoke", async ({
    page,
  }) => {
    const response = await page.goto(`${appOrigin}/property/appraisal`);
    expect(response?.status()).toBe(200);
    // The appraised value is disclosed in the preview.
    await expect(page.locator("[data-appraised-value]").first()).toBeVisible();
    await expect(page.locator("[data-issue-hint]")).toContainText(
      "Preview the simulated appraisal. Select ‘Issue demo credential’ to save it.",
    );
    await expect(page.locator("[data-credential-preview]").first()).toContainText(
      "Preview — not issued.",
    );
    await expect(page.locator("[data-consistency-check]")).toContainText(
      "covers the requested loan",
    );
    await expectBannerAndAxe(page, "Cotality", "property appraisal provider");
  });

  test("title page WITHOUT a session: clear status, banner + axe @smoke", async ({ page }) => {
    const response = await page.goto(`${appOrigin}/property/title`);
    expect(response?.status()).toBe(200);
    await expect(page.locator("[data-title-status]").first()).toHaveAttribute(
      "data-title-status",
      "clear",
    );
    await expectBannerAndAxe(page, "First American", "title insurance provider");
  });

  test("anonymous issue routes are challenged 401 (decision 0015)", async () => {
    for (const path of ["appraisal", "title"]) {
      const response = await fetch(`${appOrigin}/property/api/${path}/issue`, { method: "POST" });
      expect(response.status, path).toBe(401);
      expect(response.headers.get("www-authenticate"), path).toBeTruthy();
    }
  });

  test("appraisal: an authenticated borrower issues the credential into the token pod", async ({
    page,
  }) => {
    await authenticatePage(page);
    await page.goto(`${appOrigin}/property/appraisal`);
    await page.getByRole("button", { name: "Issue demo credential", exact: true }).click();
    const issued = page.locator("[data-issued-credential]");
    await expect(issued).toBeVisible();
    await expect(issued).toHaveAttribute(
      "data-credential-iri",
      `${podBase}mortgage/credentials/appraisal`,
    );
    await expect(issued).toContainText("Appraisal credential saved.");
    await expect(issued).toContainText("illustrative figure, not an offer");
    // The signed credential now exists in the token-derived pod.
    const written = await fetch(`${podBase}mortgage/credentials/appraisal`, {
      headers: { accept: "text/turtle" },
    });
    expect(written.status).toBe(200);
  });

  test("title: an authenticated borrower issues the clear-title credential into the token pod", async ({
    page,
  }) => {
    await authenticatePage(page);
    await page.goto(`${appOrigin}/property/title`);
    await page.getByRole("button", { name: "Issue demo credential", exact: true }).click();
    const issued = page.locator("[data-issued-credential]");
    await expect(issued).toBeVisible();
    await expect(issued).toHaveAttribute(
      "data-credential-iri",
      `${podBase}mortgage/credentials/title`,
    );
    const written = await fetch(`${podBase}mortgage/credentials/title`, {
      headers: { accept: "text/turtle" },
    });
    expect(written.status).toBe(200);
  });
});
