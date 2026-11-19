// AUTHORED-BY Claude Opus 5.5
/**
 * Alder Bank against the real pods: the site's own service worker runs the wasm Solid server in
 * this browser. Nothing is mocked. Owner reads use the path-mode identity header the pod
 * runtime's `podFetch` sends.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

/** A GET to a pod as `owner`, from inside the page (so the service worker answers it). */
function asOwner(
  page: Page,
  owner: string,
  path: string,
): Promise<{ status: number; body: string }> {
  return page.evaluate(
    async ({ owner, path }) => {
      const response = await fetch(`/pods/${path}`, {
        headers: { accept: "text/turtle", "x-demo-agent": owner },
      });
      return { body: await response.text(), status: response.status };
    },
    { owner, path },
  );
}

async function openReady(page: Page, path: string): Promise<void> {
  await page.goto(`${path}${path.includes("?") ? "&" : "?"}tour=off`);
  await expect(page.getByRole("status").filter({ hasText: "Connecting" })).toHaveCount(0, {
    timeout: 60_000,
  });
}

async function noAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" ")}`),
  ).toEqual([]);
}

test("step 3: Send writes a signed account summary into Alex's pod", async ({ page }) => {
  await openReady(page, "share");
  const button = page.locator('[data-tour="bank-send"]');
  await expect(button).toHaveCount(1);
  await expect(button).toBeEnabled({ timeout: 60_000 });
  await button.click();
  await expect(page.getByRole("heading", { name: "Sent to your pod" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(button).toHaveText("Sent");
  await expect(button).toBeDisabled();

  const credential = await asOwner(page, "alex", "alex/credentials/assets");
  expect(credential.status).toBe(200);
  expect(credential.body).toContain("AssetCredential");
  expect(credential.body).toContain("7730");
  const record = await asOwner(page, "bank", "bank/issued/assets");
  expect(record.status).toBe(200);
  expect(record.body).toContain("credentials/assets");

  // The receipt shows the status-list entry, read from the bank's own list.
  const receipt = page.locator(".receipt");
  await expect(receipt.getByText(/Entry \d+: not revoked/)).toBeVisible();
  // The bank cannot read back what it wrote: the pod refuses, and the screen says so.
  await receipt.getByRole("button", { name: /Try to read it back/ }).click();
  await expect(receipt.locator(".refusal")).toContainText("403 Forbidden");
  expect((await asOwner(page, "bank", "alex/credentials/assets")).status).toBe(403);
});

test("Connected services: the seeded identity credential, and no access to read it", async ({
  page,
}) => {
  await openReady(page, "connected");
  const card = page.locator(".issued-card").filter({ hasText: "Verified identity" });
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card).toContainText("/identity/identity-credential");
  await expect(card.getByText(/Entry \d+: not revoked/)).toBeVisible();
  await card.getByRole("button", { name: /Try to read it back/ }).click();
  await expect(card.locator(".refusal")).toContainText("no access to this part of the pod");
  expect((await asOwner(page, "bank", "alex/identity/identity-credential")).status).toBe(403);
  expect((await asOwner(page, "alex", "alex/identity/identity-credential")).status).toBe(200);
});

test("account detail shows the bank's own ledger, which never reaches a pod", async ({ page }) => {
  await openReady(page, "accounts/2291");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Everyday Checking");
  const rows = page.locator("table.ledger tbody tr");
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeGreaterThan(5);
  await expect(page.getByText("60-day average balance")).toBeVisible();
  await page.goto("accounts/0000?tour=off");
  await expect(page.getByRole("heading", { name: "We could not find that account" })).toBeVisible();
});

for (const path of ["", "accounts/2291", "share", "connected", "no-such-page"]) {
  test(`/${path}: trust banner, no axe violations, no horizontal scroll at 390 px`, async ({
    page,
  }) => {
    await openReady(page, path);
    await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#1F5135");
    await noAxeViolations(page);
    await page.setViewportSize({ height: 844, width: 390 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("the self-hosted fonts load from the app's own origin", async ({ page }) => {
  const fonts: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "font") fonts.push(request.url());
  });
  await openReady(page, "");
  await page.evaluate(() => document.fonts.ready);
  expect(fonts.length).toBeGreaterThan(1);
  for (const url of fonts) expect(new URL(url).pathname).toMatch(/^\/bank\/assets\//);
});
