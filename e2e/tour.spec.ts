import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { chapters } from "../apps/tour/app/content/chapters";
import { EXAMINER_NON_AFFILIATION, examinerChecks } from "../apps/tour/app/content/examiner";
import { launcherApps, roleServices } from "../apps/tour/app/content/services";
import {
  bannerFullText,
  copyText,
  INTERSTITIAL_CONTINUE_LABEL,
  INTERSTITIAL_HEADING,
  interstitialParagraphs,
} from "../packages/ui/src/disclaimers";
import { AppRunner } from "./support/app-runner";

/**
 * Tour app suite (sm-35). The shell boots ALONE — no zone envs — so every zone rewrite
 * points at an unreachable fallback: exactly the degraded environment the tour must stay
 * honest in (showcase-patterns §1). Content assertions import the same registry/chapter
 * modules that render, so the asserted copy can never drift.
 */

const ORGANIZATION = "EDMA Solid Community of Practice";

const runner = new AppRunner();
let origin = "";

/** Pre-set the consent cookie so tests other than the interstitial one start past it. */
async function openWithConsent(page: Page, path: string) {
  await page.context().addCookies([{ name: "sm-demo-consent-tour", url: origin, value: "1" }]);
  const response = await page.goto(`${origin}${path}`);
  expect(response?.status(), runner.logsByPackage.get("@mortgage/app-tour")?.join("")).toBe(200);
  await expect(page.getByRole("dialog", { name: INTERSTITIAL_HEADING })).toBeHidden();
}

async function expectAxeClean(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

test.describe("tour app — landing, map, chapters, Examiner View", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    origin = await runner.start({
      command: "dev",
      packageName: "@mortgage/app-tour",
      readyPath: "/",
    });
  });

  test.afterAll(() => runner.stopAll());

  test("landing shows the own-variant interstitial (sm-90e), pitch, banner, and CTA", async ({
    page,
  }) => {
    await page.goto(`${origin}/`);
    const dialog = page.getByRole("dialog", { name: INTERSTITIAL_HEADING });
    await expect(dialog).toBeVisible();
    for (const paragraph of interstitialParagraphs(ORGANIZATION, "own")) {
      await expect(dialog).toContainText(copyText(paragraph));
    }
    await dialog.getByRole("button", { name: INTERSTITIAL_CONTINUE_LABEL }).click();
    await expect(dialog).toBeHidden();

    await expect(
      page.getByRole("heading", { level: 1, name: "Solid Mortgage Tour" }),
    ).toBeVisible();
    const banner = page.locator("[data-concept-demo-banner]");
    await expect(banner).toContainText(
      bannerFullText({ organization: ORGANIZATION, variant: "own" }),
    );
    await expect(page.locator("[data-cta-start-tour]")).toHaveAttribute(
      "href",
      `/chapters/${chapters[0].slug}`,
    );
    // Quantified anchors carry citations.
    await expect(page.locator("[data-anchor-sources] a")).toHaveCount(4);

    // Consent is cookie-persisted.
    await page.reload();
    await expect(page.getByRole("dialog", { name: INTERSTITIAL_HEADING })).toBeHidden();
  });

  test("ecosystem map shows the twelve roles and degrades honestly with no zones deployed", async ({
    page,
  }) => {
    await openWithConsent(page, "/");
    // Twelve numbered roles from the single registry, plus the centre vault node.
    expect(roleServices).toHaveLength(12);
    await expect(page.locator("[data-map-node][data-map-role]")).toHaveCount(roleServices.length);
    await expect(page.locator("[data-map-center]")).toHaveCount(1);

    // No zone is deployed in this boot: probes must settle on the honest "Not deployed".
    await expect
      .poll(
        () => page.locator('[data-ecosystem-map] [data-service-status="not-deployed"]').count(),
        { timeout: 30_000 },
      )
      .toBeGreaterThan(0);

    // Select the lender seat: the detail panel offers try-live, disabled with an explanation.
    await page.locator('[data-map-node="lender"]').click();
    const detail = page.locator("[data-map-detail]");
    await expect(detail).toContainText("Lender / originator");
    await expect(detail).toContainText("modelled on Bank of America");
    const disabledLaunch = detail.locator("[data-try-live-disabled]").first();
    await expect(disabledLaunch).toBeVisible();
    await expect(disabledLaunch).toHaveAttribute("aria-disabled", "true");
    await expect(detail).toContainText("not deployed in this environment");

    // A mapped-but-unbuilt seat says so instead of faking a link.
    await page.locator('[data-map-node="standards"]').click();
    await expect(detail.locator("[data-map-no-app]")).toBeVisible();

    // The launcher dock lists every app with its status; the shell itself is live.
    await page.getByRole("button", { name: "Apps" }).click();
    await expect(page.locator("[data-launcher] [data-launcher-app]")).toHaveCount(
      launcherApps.length,
    );
    await expect(
      page.locator('[data-launcher-app="tour"] [data-service-status="live"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-launcher-app="wallet"] [data-service-status="not-deployed"]'),
    ).toBeVisible();
  });

  test("chapter player: steps, underneath panel, and chapter-to-chapter navigation", async ({
    page,
  }) => {
    await openWithConsent(page, `/chapters/${chapters[0].slug}`);
    await expect(page.getByRole("heading", { level: 1, name: chapters[0].title })).toBeVisible();
    await expect(page.locator("[data-chapter-step]")).toContainText("Step 1 of 3");
    await expect(page.locator("[data-chapter-step]")).toContainText(chapters[0].steps[0].title);

    // Every step carries its try-this-live control (visible even when the zone is down).
    await expect(page.locator("[data-chapter-step] [data-try-live]")).toBeVisible();

    await page.getByRole("button", { name: "Next step →" }).click();
    await expect(page.locator("[data-chapter-step]")).toContainText("Step 2 of 3");
    await expect(page.locator("[data-chapter-step]")).toContainText(chapters[0].steps[1].title);
    await page.getByRole("button", { name: "← Previous step" }).click();
    await expect(page.locator("[data-chapter-step]")).toContainText("Step 1 of 3");

    // Scene 1 must expose the required "what just happened underneath" panel.
    const underneath = page.locator("[data-underneath-panel]");
    await underneath.locator("summary").click();
    await expect(underneath).toContainText(chapters[0].underneath?.[0] ?? "MISSING");

    // Chapter-to-chapter navigation.
    await page.locator("[data-next-chapter]").click();
    await expect(page.getByRole("heading", { level: 1, name: chapters[1].title })).toBeVisible();

    // The last scene hands over to the Examiner View.
    await openWithConsent(page, `/chapters/${chapters[4].slug}`);
    await expect(page.locator("[data-next-chapter]")).toHaveAttribute("href", "/examiner");
  });

  test("Examiner View is unbranded and states CFPB non-affiliation", async ({ page }) => {
    await openWithConsent(page, "/examiner");
    await expect(page.getByRole("heading", { level: 1, name: "Examiner View" })).toBeVisible();
    await expect(page.locator("[data-examiner-view]")).toContainText(EXAMINER_NON_AFFILIATION);
    await expect(page.locator("[data-examiner-check]")).toHaveCount(examinerChecks.length);
    // Each check cites its public rule.
    for (const check of examinerChecks) {
      await expect(page.locator(`[data-examiner-check="${check.id}"]`)).toContainText(
        check.citation,
      );
    }
    // The R1 banner still frames the unbranded view (every route, no exceptions).
    await expect(page.locator("[data-concept-demo-banner]")).toBeVisible();
  });

  test("axe: landing passes WCAG 2.x A/AA", async ({ page }) => {
    await openWithConsent(page, "/");
    await expect(page.locator("[data-map-node][data-map-role]")).toHaveCount(12);
    await expectAxeClean(page);
  });

  test("axe: a chapter passes WCAG 2.x A/AA", async ({ page }) => {
    await openWithConsent(page, `/chapters/${chapters[1].slug}`);
    await expect(page.getByRole("heading", { level: 1, name: chapters[1].title })).toBeVisible();
    await expectAxeClean(page);
  });
});
