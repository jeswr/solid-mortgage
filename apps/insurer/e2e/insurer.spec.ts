// AUTHORED-BY Claude Opus 5.5
/**
 * Wrenfield against the real pods: the built site, the real service worker, the real wasm
 * server. Every test gets a fresh browser context, so fresh pods.
 */
import { expect, type Page, test } from "@playwright/test";
import { expectAccessible, OUTSIDE_LENS } from "../../../test-support/e2e.ts";
import { injectHarness, noHorizontalScroll, podsReady, readAs, runUntil } from "./pods.ts";

const ROUTES = ["./", "./property", "./quote", "./evidence", "./no-such-page"];

/**
 * "You are covered." shows as soon as the evidence is in Alex's pod (the screen reads the pod
 * log), but the bind goes on: Wrenfield records what it issued, then Juniper checks the evidence
 * at source and keeps its pointer. The button leaves "Binding…" only when all of that is done.
 */
async function bindSettled(page: Page): Promise<void> {
  const bind = page.locator('[data-tour="insurer-bind"]');
  await expect(bind).toHaveText("Coverage bound", { timeout: 60_000 });
  await expect(page.getByRole("alert").filter({ hasText: "Binding stopped" })).toHaveCount(0);
}

test("every route has the trust banner, noindex and its own metadata", async ({ page }) => {
  for (const route of ROUTES) {
    await page.goto(route);
    await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
    await expect(page.getByText("Wrenfield Mutual is a fictional organisation.")).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#2F80ED");
    await expect(page).toHaveTitle(/Wrenfield Mutual/);
  }
});

test("step 15: Bind reads the property facts and writes the evidence into Alex's pod", async ({
  page,
}) => {
  await page.goto("./quote");
  await podsReady(page);
  await injectHarness(page);
  await runUntil(page, "bind-insurance");

  // Before binding, Wrenfield holds nothing and reads nothing.
  expect((await readAs(page, "alex", "insurance/evidence-of-insurance")).status).toBe(404);
  const bind = page.locator('[data-tour="insurer-bind"]');
  await expect(bind).toBeEnabled({ timeout: 20_000 });
  await bind.click();
  await expect(page.getByText("You are covered.")).toBeVisible({ timeout: 60_000 });
  await bindSettled(page);

  // The evidence exists in Alex's pod, read back as Alex, the owner.
  const evidence = await readAs(page, "alex", "insurance/evidence-of-insurance");
  expect(evidence.status).toBe(200);
  expect(evidence.body).toContain("EvidenceOfInsuranceCredential");
  expect(evidence.body).toContain("WM-HO-558120");
  // The grant and consent record the wallet wrote, and Juniper's pointer to the evidence.
  expect((await readAs(page, "alex", "consents/g7-given")).status).toBe(200);
  expect(
    (await readAs(page, "lender", "loans/JHL-1001/pointers/evidence-of-insurance")).status,
  ).toBe(200);
  await expect(bind).toBeDisabled();

  // The property screen now shows facts read from the pod, each with its source.
  await page.goto("./property");
  await expect(page.getByText("1998")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Asphalt shingle")).toBeVisible();
  await expect(page.getByText("Appraised value")).toBeVisible();
  await expect(page.getByText("Alex's pod · property record").first()).toBeVisible();
  await expectAccessible(page, OUTSIDE_LENS);
});

test("the evidence is write-only for Wrenfield: reading it back is refused", async ({ page }) => {
  await page.goto("./evidence");
  await podsReady(page);
  await injectHarness(page);
  await runUntil(page, "bind-insurance");
  await page.goto("./quote");
  await page.locator('[data-tour="insurer-bind"]').click({ timeout: 20_000 });
  await expect(page.getByText("You are covered.")).toBeVisible({ timeout: 60_000 });
  // Leaving the page now would end the bind before Wrenfield records what it issued.
  await bindSettled(page);

  await page.goto("./evidence");
  await expect(page.getByText("Fingerprint (SHA-256)")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Read the evidence as Wrenfield" }).click();
  await expect(page.getByText("Refused by Alex's pod (403)")).toBeVisible();
  await expectAccessible(page, OUTSIDE_LENS);
});

test("axe passes on every route and nothing scrolls sideways at 390 px", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  for (const route of ROUTES) {
    await page.goto(route);
    await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
    await expectAccessible(page, OUTSIDE_LENS);
    await noHorizontalScroll(page);
  }
});

test("the self-hosted font loads from the app's own origin", async ({ page }) => {
  const fonts: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "font") fonts.push(request.url());
  });
  await page.goto("./");
  await page.evaluate(() => document.fonts.ready);
  expect(fonts.length).toBeGreaterThan(0);
  for (const url of fonts) expect(new URL(url).pathname).toMatch(/^\/insurer\/assets\//);
});
