// AUTHORED-BY Claude Opus 5.5
/**
 * The tour engine end to end on three fixture pages (a fictional trail expedition): "Do it for
 * me" with a visible cursor, completion from Lens entries first and data-tour clicks second,
 * deep links, resume after reload, modes and window.__demo.
 */
import { AxeBuilder } from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
}

const card = (page: Page) => page.locator("solid-lens section.step");
const next = (page: Page) => card(page).locator('[data-lens="next"]');

test.beforeEach(async ({ page }) => {
  await page.goto("/payroll/");
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await new Promise<void>((resolve) => {
      const r = indexedDB.deleteDatabase("solid-demo-tour");
      r.onsuccess = r.onerror = r.onblocked = () => resolve();
    });
  });
});

test("completes the three-step fixture demo with Do it for me and resumes after reload", async ({
  page,
}) => {
  await open(page, "/payroll/?tour=trail&step=certify");
  await expect(card(page).locator(".step-meta")).toContainText("Step 1 of 3");
  await expect(card(page).locator("h3")).toHaveText("Collect your first-aid certificate");
  await expect(next(page)).toHaveText("Skip ›");

  // Step 1 completes from the pod event the click produces.
  await card(page).getByRole("button", { name: "Do it for me" }).click();
  await expect(page.locator("[data-tour-cursor]")).toHaveCount(1);
  await expect(page.locator("#status")).toHaveText("Certificate sent.");
  await expect(next(page)).toHaveText("Next ›");
  await expect(page.locator("solid-lens ol.entries")).toContainText(
    "Tamarack delivered a signed credential",
  );

  // Next moves to another app's page.
  await next(page).click();
  await page.waitForURL(/\/county\/permit\?tour=trail&step=permit$/);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(card(page).locator(".step-meta")).toContainText("Step 2 of 3");
  await expect(next(page)).toHaveText("Skip ›");

  // Reload mid-step: state comes back from IndexedDB.
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(card(page).locator(".step-meta")).toContainText("Step 2 of 3");
  await expect(page.locator('solid-lens .drawer[data-path="/certificates/"]')).toHaveAttribute(
    "data-seal",
    "true",
  );

  // Step 2 completes from the app note (not from the pod read that comes first).
  await page.evaluate(() => window.__demo?.act());
  await expect(page.locator("#status")).toHaveText("Permit application sent.");
  await expect(next(page)).toHaveText("Next ›");

  await next(page).click();
  await page.waitForURL(/\/welcome\/ledger\?tour=trail&step=finish$/);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");

  // Step 3 has no entry to wait for, so its data-tour click completes it.
  await expect(next(page)).toHaveText("Skip ›");
  await page.locator('[data-tour="finish-trip"]').click();
  await expect(next(page)).toHaveText("Finish ›");
  const state = await page.evaluate(() => window.__demo?.state());
  expect(state).toEqual({ step: "finish", done: ["certify", "permit", "finish"], mode: "guided" });
});

test("a step completes only from the entry it names", async ({ page }) => {
  await open(page, "/county/permit?tour=trail&step=certify");
  // Wrong page for step 1: clicking another page's control completes nothing.
  await page.locator('[data-tour="apply-permit"]').click();
  await expect(next(page)).toHaveText("Skip ›");
  expect(await page.evaluate(() => window.__demo?.state()?.done)).toEqual([]);
});

test("Do it for me from another page navigates there and acts on arrival", async ({ page }) => {
  await open(page, "/payroll/?tour=trail&step=permit");
  await expect(card(page).locator(".step-meta")).toContainText("Step 2 of 3");
  await card(page).getByRole("button", { name: "Do it for me" }).click();
  await page.waitForURL(/\/county\/permit\?tour=trail&step=permit$/);
  await expect(page.locator("#status")).toHaveText("Permit application sent.");
  await expect(next(page)).toHaveText("Next ›");
});

test("Back, Skip and the deep link keep the URL and the card in step", async ({ page }) => {
  await open(page, "/county/permit?tour=trail&step=permit");
  await card(page).locator('[data-lens="back"]').click();
  await page.waitForURL(/\/payroll\/\?tour=trail&step=certify$/);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(card(page).locator('[data-lens="back"]')).toBeDisabled();
  await next(page).click();
  await page.waitForURL(/\/county\/permit\?tour=trail&step=permit$/);
});

test("present mode hides the step card and enlarges the Lens; window.__demo drives it", async ({
  page,
}) => {
  await open(page, "/payroll/?tour=trail&step=certify&present=1");
  await expect(page.locator("solid-lens")).toHaveAttribute("mode", "present");
  await expect(card(page)).toBeHidden();
  await page.evaluate(() => window.__demo?.present(false));
  await expect(page.locator("solid-lens")).toHaveAttribute("mode", "guided");
  await expect(card(page)).toBeVisible();
  await page.evaluate(() => window.__demo?.lens("grants"));
  await expect(page.locator("solid-lens [role=tab][aria-selected=true]")).toHaveText("Grants");
  await page.evaluate(() => window.__demo?.act());
  await expect(page.locator("#status")).toHaveText("Certificate sent.");
  const totals = await page.evaluate(() => window.__demo?.totals());
  expect(totals).toMatchObject({ credentialsIssued: 1, organisations: 1, denied: 0, uploads: 0 });
  await page.evaluate(() => window.__demo?.goto("finish"));
  await page.waitForURL(/\/welcome\/ledger\?tour=trail&step=finish$/);
});

test("free play shows the Lens without a step card", async ({ page }) => {
  await open(page, "/payroll/?tour=off");
  await expect(page.locator("solid-lens")).toHaveAttribute("mode", "free");
  await expect(card(page)).toBeHidden();
  await page.locator('[data-tour="send-certificate"]').click();
  await expect(page.locator("solid-lens .headline")).toHaveText(
    "Tamarack delivered a signed credential: Wilderness first-aid certificate",
  );
});

test("reduced motion: the cursor does not travel, the click still happens", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "/payroll/?tour=trail&step=certify");
  const animations = await page.evaluate(async () => {
    await window.__demo?.act();
    return document.getAnimations().length;
  });
  expect(animations).toBe(0);
  await expect(page.locator("#status")).toHaveText("Certificate sent.");
});

test("mount adds view transitions and leaves room for the dock", async ({ page }) => {
  await open(page, "/payroll/?tour=trail&step=certify");
  await expect(page.locator("style#solid-lens-host-style")).toHaveCount(1);
  expect(await page.locator("style#solid-lens-host-style").textContent()).toContain(
    "@view-transition",
  );
  const pad = await page.evaluate(() => getComputedStyle(document.body).paddingRight);
  expect(pad).toBe("376px");
});

test("axe passes on a tour page with the step card", async ({ page }) => {
  await open(page, "/payroll/?tour=trail&step=certify");
  await card(page).getByRole("button", { name: "Do it for me" }).click();
  await expect(next(page)).toHaveText("Next ›");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});
