// AUTHORED-BY Claude Opus 5.5
/**
 * Quillon against the real pods: the site's own service worker runs the wasm Solid server in this
 * browser, and Quillon's agent runs in the site's agent worker. Nothing is mocked.
 *
 * Step 9 needs state other apps produce (Alex's application consent, Juniper's order). The test
 * builds it with the journey's own functions, run here in Node over a fetch that sends each
 * request into the page, so the service worker and the pods' access rules answer it exactly as
 * they answer the apps.
 */
import AxeBuilder from "@axe-core/playwright";
import {
  createBrowserWorld,
  crossOwnerFetch,
  memoryKeyStore,
} from "@mortgage/content/mortgage/browser";
import { DAY } from "@mortgage/content/mortgage/facts";
import { approveApplicationAccess, CREDIT_AUTHORISATION } from "@mortgage/content/mortgage/journey";
import { deliver, findReply } from "@mortgage/content/mortgage/messages";
import { podUrl, type World } from "@mortgage/content/mortgage/world";
import { MORT } from "@mortgage/data-model";
import { createDemoCalendar } from "@mortgage/demo-kit/calendar";
import { expect, type Page, test } from "@playwright/test";

/** A fetch that runs inside the page, so the site's service worker answers it. */
function pageFetch(page: Page): typeof fetch {
  return async (input, init) => {
    const request = new Request(input, init);
    const body =
      request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
    const answer = await page.evaluate(
      async ({ url, method, headers, body }) => {
        const response = await fetch(url, { body, headers, method });
        return {
          body: await response.text(),
          headers: [...response.headers],
          status: response.status,
        };
      },
      { body, headers: [...request.headers], method: request.method, url: request.url },
    );
    const empty = request.method === "HEAD" || [101, 204, 205, 304].includes(answer.status);
    return new Response(empty ? null : answer.body, {
      headers: answer.headers,
      status: answer.status,
    });
  };
}

/** Juniper's world, on application day, over the page's pods. */
function lenderWorld(page: Page): World {
  const base = pageFetch(page);
  return createBrowserWorld({
    actsAs: "lender",
    day: DAY.application,
    dayOne: createDemoCalendar().dayOne,
    fetch: base,
    keys: memoryKeyStore(),
    podFetch: crossOwnerFetch("lender", base, () => null),
    podOrigin: new URL(page.url()).origin,
    tour: () => null,
  });
}

/** Juniper orders a report, as at step 9, naming Alex's authorisation. */
function orderReport(world: World): Promise<string> {
  return deliver(world, {
    from: "lender",
    kind: MORT.MessageKind_CreditReportOrder,
    objects: [podUrl(world, "alex", CREDIT_AUTHORISATION)],
    summary: "Order for a tri-merge credit report, with the consumer's authorisation",
    time: "11:00",
    to: "bureau",
  });
}

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

test("step 4: Send summary to my pod writes the summary and its anchor", async ({ page }) => {
  await openReady(page, "summary");
  const button = page.locator('[data-tour="bureau-send"]');
  await expect(button).toHaveCount(1);
  await expect(button).toBeEnabled({ timeout: 60_000 });
  await button.click();
  await expect(page.getByRole("heading", { name: "Sent" })).toBeVisible({ timeout: 60_000 });
  await expect(button).toHaveText("Summary sent");

  const summary = await asOwner(page, "alex", "alex/credentials/credit-summary");
  expect(summary.status).toBe(200);
  expect(summary.body).toContain("CreditScoreCredential");
  expect((await asOwner(page, "alex", "alex/credentials/credit-summary-anchor")).status).toBe(200);
  expect((await asOwner(page, "bureau", "bureau/issued/credit-summary")).status).toBe(200);

  const rows = page.locator("table tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("not revoked");
  await page.getByRole("button", { name: "Try to read it back from Alex's pod" }).click();
  await expect(page.locator(".refusal")).toContainText("403 Forbidden");
  expect((await asOwner(page, "bureau", "alex/credentials/credit-summary")).status).toBe(403);
  await noAxeViolations(page);

  await page.getByRole("link", { name: "Inquiries" }).click();
  await expect(page.getByRole("row", { name: /Soft/ })).toContainText("Consumer disclosure");
});

test("step 9, Quillon's side: its agent checks the authorisation and releases the report", async ({
  page,
}) => {
  await openReady(page, "orders");
  await expect(page.getByText("No orders.")).toBeVisible();
  const world = lenderWorld(page);
  await approveApplicationAccess(world);
  const order = await orderReport(world);

  // Quillon's agent, in the site's agent worker, answers the order: nothing here calls it.
  await expect
    .poll(async () => findReply(world, "lender", order), { timeout: 60_000 })
    .toBeDefined();
  const report = await asOwner(page, "bureau", "bureau/orders/JHL-1001/report");
  expect(report.status).toBe(200);
  expect(report.body).toContain("QCB-TM-20417");
  expect(report.body).toContain("604(a)(3)(A)");
  // Juniper can read the report in Quillon's pod; it never went to Alex's.
  expect((await asOwner(page, "lender", "bureau/orders/JHL-1001/report")).status).toBe(200);

  await expect(async () => {
    await page.reload();
    await expect(page.getByRole("row", { name: /Juniper Home Loans/ })).toContainText("Delivered", {
      timeout: 5_000,
    });
  }).toPass({ timeout: 60_000 });
  const row = page.getByRole("row", { name: /Juniper Home Loans/ });
  await expect(row).toContainText("Credit transaction initiated by the consumer");
  await expect(row).toContainText("/consents/g4-credit-report-authorisation");
  await row.getByRole("button", { name: /Check at source/ }).click();
  await expect(row.getByRole("status")).toContainText("200 OK");
  await noAxeViolations(page);
  await expect(page.locator("[data-demo-signed-in]")).toContainText("Order desk clerk");

  await page.getByRole("link", { name: "Inquiries" }).click();
  await expect(page.getByRole("row", { name: /Juniper Home Loans/ })).toContainText("Hard");
});

test("an order without a standing authorisation is refused at source", async ({ page }) => {
  await openReady(page, "orders");
  // No application consent: Alex never made the authorisation readable to Quillon.
  const world = lenderWorld(page);
  await orderReport(world);
  await expect(async () => {
    await page.reload();
    await expect(page.getByRole("row", { name: /Juniper Home Loans/ })).toBeVisible({
      timeout: 5_000,
    });
  }).toPass({ timeout: 60_000 });
  const row = page.getByRole("row", { name: /Juniper Home Loans/ });
  await row.getByRole("button", { name: /Check at source/ }).click();
  await expect(row.locator(".refusal")).toContainText("403 Forbidden");
  await noAxeViolations(page);
  // Quillon's agent hit the same refusal, so no report was released and its claim was given back.
  await page.waitForTimeout(2_000);
  expect((await asOwner(page, "bureau", "bureau/orders/JHL-1001/report")).status).toBe(404);
  await expect(row).not.toContainText("Delivered");
});

for (const path of ["", "summary", "orders", "inquiries", "no-such-page"]) {
  test(`/${path}: trust banner, no axe violations, no horizontal scroll at 390 px`, async ({
    page,
  }) => {
    await openReady(page, path);
    await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#44546A");
    await noAxeViolations(page);
    await page.setViewportSize({ height: 844, width: 390 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("no web font: Quillon uses the system serif", async ({ page }) => {
  const fonts: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "font") fonts.push(request.url());
  });
  await openReady(page, "summary");
  await page.evaluate(() => document.fonts.ready);
  expect(fonts).toEqual([]);
});
