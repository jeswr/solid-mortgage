import { type ChildProcess, spawn } from "node:child_process";
import { createServer } from "node:net";
import { expect, type Page, test } from "@playwright/test";
import {
  bannerFullText,
  copyText,
  type DisclaimerVariant,
  INTERSTITIAL_CONTINUE_LABEL,
  INTERSTITIAL_HEADING,
  interstitialParagraphs,
} from "../packages/ui/src/disclaimers";

interface AppDefinition {
  appName: string;
  organization: string;
  packageName: string;
  path: string;
  role?: string;
  variant?: DisclaimerVariant;
  hasInterstitial?: boolean;
  zoneEnv?: string;
}

const apps: AppDefinition[] = [
  {
    appName: "Solid Mortgage Tour",
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
    organization: "Fifth Third Bank",
    packageName: "@mortgage/app-lender-53",
    path: "/lender-53",
    zoneEnv: "MORTGAGE_COMPARISON_LENDER_ZONE_URL",
  },
  {
    appName: "Automated Underwriting Service",
    organization: "Freddie Mac",
    packageName: "@mortgage/app-gse",
    path: "/gse",
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
    organization: "Wolters Kluwer (eOriginal) and Truist",
    packageName: "@mortgage/app-closing",
    path: "/closing",
    zoneEnv: "MORTGAGE_CLOSING_ZONE_URL",
  },
];

const childProcesses: ChildProcess[] = [];
const logsByPackage = new Map<string, string[]>();
let shellOrigin = "";

async function reservePort() {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    server.close();
    throw new Error("Could not allocate a dynamic app port");
  }
  const { port } = address;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return port;
}

async function waitUntilReady(url: string, child: ChildProcess, logs: string[]) {
  await expect
    .poll(
      async () => {
        if (child.exitCode !== null) {
          throw new Error(`App server exited early (${child.exitCode})\n${logs.join("")}`);
        }
        try {
          const response = await fetch(url, { redirect: "manual" });
          return response.status;
        } catch {
          return 0;
        }
      },
      { message: `Wait for ${url}`, timeout: 60_000 },
    )
    .toBe(200);
}

async function startApp(app: AppDefinition, env: NodeJS.ProcessEnv = {}) {
  const port = await reservePort();
  const origin = `http://127.0.0.1:${port}`;
  const logs: string[] = [];
  logsByPackage.set(app.packageName, logs);
  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const command = app.zoneEnv === undefined ? "dev" : "start";
  const child = spawn(
    pnpm,
    ["--filter", app.packageName, command, "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: process.cwd(),
      detached: process.platform !== "win32",
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout?.on("data", (chunk: Buffer) => logs.push(chunk.toString()));
  child.stderr?.on("data", (chunk: Buffer) => logs.push(chunk.toString()));
  childProcesses.push(child);
  await waitUntilReady(`${origin}${app.path}`, child, logs);
  return origin;
}

async function stopApps() {
  for (const child of childProcesses.reverse()) {
    if (child.exitCode !== null || child.pid === undefined) continue;
    try {
      process.kill(process.platform === "win32" ? child.pid : -child.pid, "SIGTERM");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
    }
  }
}

async function expectBannerVisible(page: Page, app: AppDefinition) {
  const banner = page.locator("[data-concept-demo-banner]");
  await expect(banner).toBeVisible();
  await expect(banner).toContainText(
    bannerFullText({ organization: app.organization, role: app.role, variant: app.variant }),
  );
  await expect(banner.getByRole("link", { name: "About this demo" })).toBeVisible();
}

async function acknowledgeInterstitial(page: Page, organization: string) {
  const dialog = page.getByRole("dialog", { name: INTERSTITIAL_HEADING });
  await expect(dialog).toBeVisible();
  // Source-negation paragraph (regn-optics §4.2) must be present verbatim.
  await expect(dialog).toContainText(copyText(interstitialParagraphs(organization)[1]));
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

  test.afterAll(stopApps);

  for (const app of apps) {
    test(`${app.packageName} renders its required banner @smoke`, async ({ page }) => {
      const response = await page.goto(`${shellOrigin}${app.path}`);
      expect(response?.status(), logsByPackage.get("@mortgage/app-tour")?.join("")).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: app.appName })).toBeVisible();
      if (app.hasInterstitial === true) {
        await acknowledgeInterstitial(page, app.organization);
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
