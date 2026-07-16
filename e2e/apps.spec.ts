import { expect, type Page, test } from "@playwright/test";
import {
  bannerFullText,
  copyText,
  type DisclaimerVariant,
  INTERSTITIAL_CONTINUE_LABEL,
  INTERSTITIAL_HEADING,
  interstitialParagraphs,
} from "../packages/ui/src/disclaimers";
import { AppRunner } from "./support/app-runner";

interface AppDefinition {
  appName: string;
  organization: string;
  packageName: string;
  path: string;
  role?: string;
  variant?: DisclaimerVariant;
  hasInterstitial?: boolean;
  zoneEnv?: string;
  /** The landing page's h1 when it differs from {@link appName}. */
  heading?: string;
  /** Interstitial copy's organization when it differs from the banner's. */
  interstitialOrganization?: string;
}

const apps: AppDefinition[] = [
  {
    appName: "Solid Mortgage Tour",
    hasInterstitial: true,
    organization: "EDMA Solid Community of Practice",
    packageName: "@mortgage/app-tour",
    path: "/",
    variant: "own",
  },
  {
    appName: "Data Vault",
    hasInterstitial: true,
    organization: "Verizon",
    packageName: "@mortgage/app-wallet",
    path: "/wallet",
    role: "consumer data custodian",
    zoneEnv: "MORTGAGE_WALLET_ZONE_URL",
  },
  {
    appName: "Verification Services",
    organization: "The Work Number (Equifax), Mastercard Finicity, and Equifax",
    packageName: "@mortgage/app-verifications",
    path: "/verifications",
    zoneEnv: "MORTGAGE_VERIFICATIONS_ZONE_URL",
  },
  {
    appName: "Mortgage Origination",
    organization: "Bank of America",
    packageName: "@mortgage/app-lender-boa",
    path: "/lender-boa",
    role: "primary mortgage lender",
    zoneEnv: "MORTGAGE_PRIMARY_LENDER_ZONE_URL",
  },
  {
    appName: "Mortgage Pre-qualification",
    hasInterstitial: true,
    heading: "Get a competing rate quote without sharing your numbers",
    organization: "Fifth Third Bank",
    packageName: "@mortgage/app-lender-53",
    path: "/lender-53",
    role: "competing mortgage lender",
    zoneEnv: "MORTGAGE_COMPARISON_LENDER_ZONE_URL",
  },
  {
    appName: "Automated Underwriting Service",
    organization: "Freddie Mac",
    packageName: "@mortgage/app-gse",
    path: "/gse",
    role: "automated underwriting service",
    zoneEnv: "MORTGAGE_UNDERWRITING_ZONE_URL",
  },
  {
    appName: "Property Services",
    organization: "Cotality and First American",
    packageName: "@mortgage/app-property",
    path: "/property",
    zoneEnv: "MORTGAGE_PROPERTY_ZONE_URL",
  },
  {
    appName: "Digital Closing and Servicing",
    // The scene page leads with its headline; the shell banner is the eClose
    // brand and the servicer section carries its own banner (sm-34).
    hasInterstitial: true,
    heading: "Sign once. See every consent change.",
    interstitialOrganization: "Wolters Kluwer (eOriginal) or Truist",
    organization: "Wolters Kluwer (eOriginal)",
    packageName: "@mortgage/app-closing",
    path: "/closing",
    role: "digital closing platform",
    zoneEnv: "MORTGAGE_CLOSING_ZONE_URL",
  },
];

const runner = new AppRunner();
let shellOrigin = "";

async function startApp(app: AppDefinition, env: NodeJS.ProcessEnv = {}) {
  return runner.start({
    // `dev` for the shell so next.config reads zone envs at start time; `start` for zones.
    command: app.zoneEnv === undefined ? "dev" : "start",
    env,
    packageName: app.packageName,
    readyPath: app.path,
  });
}

async function expectBannerVisible(page: Page, app: AppDefinition) {
  // `.first()`: pages may carry additional per-section banners (e.g. the
  // closing app's servicer section); the shell banner always renders first.
  const banner = page.locator("[data-concept-demo-banner]").first();
  await expect(banner).toBeVisible();
  await expect(banner).toContainText(
    bannerFullText({ organization: app.organization, role: app.role, variant: app.variant }),
  );
  await expect(banner.getByRole("link", { name: "About this demo" })).toBeVisible();
}

async function acknowledgeInterstitial(
  page: Page,
  organization: string,
  variant: DisclaimerVariant = "modelled",
) {
  const dialog = page.getByRole("dialog", { name: INTERSTITIAL_HEADING });
  await expect(dialog).toBeVisible();
  // Negation paragraph (regn-optics §4.2; own variant per sm-90e) must be present verbatim.
  await expect(dialog).toContainText(copyText(interstitialParagraphs(organization, variant)[1]));
  await dialog.getByRole("button", { name: INTERSTITIAL_CONTINUE_LABEL }).click();
  await expect(dialog).toBeHidden();
}

test.describe("app concept-demo banners", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    const shellEnv: NodeJS.ProcessEnv = {};
    for (const app of apps.slice(1)) {
      if (app.zoneEnv === undefined) throw new Error(`Missing zone env for ${app.packageName}`);
      shellEnv[app.zoneEnv] = await startApp(app);
    }
    shellOrigin = await startApp(apps[0], shellEnv);
  });

  test.afterAll(() => runner.stopAll());

  for (const app of apps) {
    test(`${app.packageName} renders its required banner @smoke`, async ({ page }) => {
      const response = await page.goto(`${shellOrigin}${app.path}`);
      expect(response?.status(), runner.logsByPackage.get("@mortgage/app-tour")?.join("")).toBe(
        200,
      );
      await expect(
        page.getByRole("heading", { level: 1, name: app.heading ?? app.appName }),
      ).toBeVisible();
      if (app.hasInterstitial === true) {
        await acknowledgeInterstitial(
          page,
          app.interstitialOrganization ?? app.organization,
          app.variant,
        );
        // Consent is cookie-persisted: the interstitial must not reappear on reload.
        await page.reload();
        await expect(page.getByRole("dialog", { name: INTERSTITIAL_HEADING })).toBeHidden();
      }
      await expectBannerVisible(page, app);
    });
  }

  test("@mortgage/app-tour renders the banner on unknown routes (404) @smoke", async ({ page }) => {
    const response = await page.goto(`${shellOrigin}/route-that-does-not-exist`);
    expect(response?.status()).toBe(404);
    // Fresh browser context: the own-variant interstitial shows on the error route too.
    await acknowledgeInterstitial(page, apps[0].organization, apps[0].variant);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expectBannerVisible(page, apps[0]);
  });

  test("@mortgage/app-wallet renders the banner on unknown routes (404) @smoke", async ({
    page,
  }) => {
    const wallet = apps[1];
    const response = await page.goto(`${shellOrigin}/wallet/route-that-does-not-exist`);
    expect(response?.status()).toBe(404);
    // Fresh browser context: the interstitial shows again on the error route too.
    await acknowledgeInterstitial(page, wallet.organization);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expectBannerVisible(page, wallet);
  });
});
