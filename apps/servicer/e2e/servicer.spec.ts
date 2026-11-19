// AUTHORED-BY Claude Opus 5.5
/**
 * Marigold against the real pods: the built site, the real service worker, the real wasm
 * server. Every test gets a fresh browser context, so fresh pods. The wallet's Approve (lane
 * A1's screen) is stood in for by the harness calling the same `approveRequest` as Alex.
 */
import AxeBuilder from "@axe-core/playwright";
import { DAY } from "@mortgage/content/mortgage/facts";
import { expect, type Page, test } from "@playwright/test";
import { injectHarness, noHorizontalScroll, podsReady, readAs, runUntil } from "./pods.ts";

const ROUTES = ["./", "./connect", "./account", "./escrow", "./insurance", "./no-such-page"];

test.setTimeout(240_000);

async function axe(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .exclude("solid-lens")
    .analyze();
  expect(results.violations).toEqual([]);
}

/** Run the journey to step 21, connect through the hand-off, and come back approved. */
async function connectThroughTheWallet(page: Page): Promise<void> {
  await page.goto("./connect");
  await podsReady(page);
  await injectHarness(page);
  await runUntil(page, "connect-servicer");
  await page.reload();

  // The wallet is lane A1's app and is not in this branch's build: stand in for its page.
  await page.route("**/wallet/**", (route) =>
    route.fulfill({ body: "<!doctype html><title>Wallet</title>", contentType: "text/html" }),
  );
  const connect = page.getByRole("button", { name: "Connect with Cairn" });
  await expect(connect).toBeEnabled({ timeout: 20_000 });
  await connect.click();

  // The hand-off carries the request and the return address, nothing else.
  await page.waitForURL(/\/wallet\/requests\?/);
  const handoff = new URL(page.url());
  expect([...handoff.searchParams.keys()].sort()).toEqual(["request", "return"]);
  const request = handoff.searchParams.get("request") ?? "";
  expect(new URL(request).pathname).toMatch(/^\/pods\/alex\/inbox\/request-g8/);
  const back = handoff.searchParams.get("return") ?? "";
  expect(back).toBe("/servicer/connect?from=wallet");

  // Alex approves in the wallet.
  await page.goto("./");
  await injectHarness(page);
  const code = await page.evaluate(
    ([url, day]) => window.__harness?.approve(url as string, day as number),
    [request, DAY.servicingTransfer] as const,
  );
  expect(code).toBe("G8");

  // Back at Marigold, the Connect screen finishes setting up the account.
  await page.goto(back);
  await expect(page.getByText("Connected.")).toBeVisible({ timeout: 60_000 });
  await injectHarness(page);
}

test("every route has the trust banner, noindex and its own metadata", async ({ page }) => {
  for (const route of ROUTES) {
    await page.goto(route);
    await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
    await expect(
      page.getByText("Marigold Loan Servicing is a fictional organisation."),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#E9A100");
    await expect(page).toHaveTitle(/Marigold Loan Servicing/);
  }
});

test("step 21: Connect asks, the wallet approves, Marigold delivers and reads under G8", async ({
  page,
}) => {
  await connectThroughTheWallet(page);

  // What Marigold wrote is in Alex's pod, read back as Alex.
  const notice = await readAs(page, "alex", "mortgage/servicing/transfer-notice");
  expect(notice.status).toBe(200);
  expect(notice.body).toContain("Marigold Loan Servicing");
  expect((await readAs(page, "alex", "mortgage/servicing/escrow-statement")).status).toBe(200);
  expect((await readAs(page, "alex", "banking/payment-mandate")).status).toBe(200);
  expect((await readAs(page, "alex", "consents/g8-given")).status).toBe(200);

  // The portal shows what it reads from the pod.
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Welcome: notice of servicing transfer" }),
  ).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("Late-fee protection until")).toBeVisible();
  await axe(page);

  await page.goto("./account");
  await expect(page.getByText("$2,659.03")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/•••• \d{4}/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Where we reach you" })).toBeVisible();
  await axe(page);

  await page.goto("./escrow");
  await expect(page.getByRole("rowheader", { name: "Property taxes, per year" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    page.getByRole("rowheader", { name: "Homeowner's insurance, per year" }),
  ).toBeVisible();
  await axe(page);

  await page.goto("./insurance");
  await expect(page.getByRole("heading", { name: "Policy WM-HO-558120" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("Signed by Wrenfield Mutual")).toBeVisible();
  await axe(page);
  await page.setViewportSize({ height: 844, width: 390 });
  for (const route of ["./", "./account", "./escrow", "./insurance"]) {
    await page.goto(route);
    await expect(page.locator(".panel").first()).toBeVisible({ timeout: 20_000 });
    await noHorizontalScroll(page);
  }
});

test("Marigold asked for three things: reading income is refused", async ({ page }) => {
  await connectThroughTheWallet(page);
  await page.getByRole("button", { name: "Read income as Marigold" }).click();
  await expect(page.getByText("Alex's pod refused this read (403)")).toBeVisible();
  await axe(page);
});

test("axe passes on every route and nothing scrolls sideways at 390 px", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  for (const route of ROUTES) {
    await page.goto(route);
    await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
    await axe(page);
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
  for (const url of fonts) expect(new URL(url).pathname).toMatch(/^\/servicer\/assets\//);
});
