// AUTHORED-BY Claude Opus 5.5
/**
 * Ledgerly against the real pods: the site's own service worker runs the wasm Solid server in
 * this browser. Nothing is mocked. Owner reads use the same path-mode identity header the pod
 * runtime's `podFetch` sends.
 */
import { buildInboxMessage, MORT } from "@mortgage/data-model";
import { createDemoCalendar } from "@mortgage/demo-kit/calendar";
import { expect, test } from "@playwright/test";
import { Writer } from "n3";
import { podRequest as asOwner, expectAccessible, openReady } from "../../../test-support/e2e.ts";

test("step 2: Sign and send writes a signed credential into Alex's pod", async ({ page }) => {
  await openReady(page, "share");
  const button = page.locator('[data-tour="payroll-sign-send"]');
  await expect(button).toHaveCount(1);
  await expect(button).toBeEnabled({ timeout: 60_000 });
  await button.click();
  await expect(page.getByRole("heading", { name: "Sent to your pod" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(button).toHaveText("Already in your pod");

  const credential = await asOwner(page, "alex", "alex/credentials/employment-income");
  expect(credential.status).toBe(200);
  expect(credential.body).toContain("EmploymentIncomeCredential");
  expect((await asOwner(page, "alex", "alex/credentials/employment-income-anchor")).status).toBe(
    200,
  );
  const record = await asOwner(page, "payroll", "payroll/issued/employment-income");
  expect(record.status).toBe(200);
  expect(record.body).toContain("credentials/employment-income");

  // The table shows the status-list entry, read from Ledgerly's own list.
  await expect(page.getByText(/not revoked/).first()).toBeVisible();
  // Ledgerly cannot read back what it wrote: the pod refuses, and the screen says so.
  await page.getByRole("button", { name: "Try to read it back from Alex's pod" }).click();
  await expect(page.locator(".refusal")).toContainText("403 Forbidden");
  expect((await asOwner(page, "payroll", "alex/credentials/employment-income")).status).toBe(403);
  await expectAccessible(page);
});

test("the back office answers a refresh request: new credential, old one revoked", async ({
  page,
}) => {
  await openReady(page, "share");
  await page.locator('[data-tour="payroll-sign-send"]').click();
  await expect(page.getByRole("heading", { name: "Sent to your pod" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.locator('[data-tour="payroll-sign-send"]')).toHaveText("Already in your pod");
  const before = await asOwner(page, "alex", "alex/credentials/employment-income");

  // Juniper asks for a refresh, as the lender desk does at step 16.
  const origin = new URL(page.url()).origin;
  const container = `${origin}/pods/payroll/inbox/`;
  const placeholder = `${container}refreshrequest`;
  const message = buildInboxMessage({
    actor: `${origin}/pods/lender/profile/card#me`,
    iri: placeholder,
    loanNumber: "JHL-1001",
    messageKind: MORT.MessageKind_RefreshRequest,
    objects: [`${origin}/pods/alex/credentials/employment-income`],
    // Day 31, as at step 16. The host's calendar starts on demoDayOne() in a fresh browser.
    published: createDemoCalendar().clock(31, "09:00"),
    summary: "Please re-verify employment for loan JHL-1001 before closing",
  });
  const body = await new Promise<string>((resolve, reject) => {
    const writer = new Writer({ baseIRI: placeholder, format: "text/turtle" });
    writer.addQuads([...message.dataset]);
    writer.end((error, result) => (error ? reject(error) : resolve(result)));
  });
  const posted = await page.evaluate(
    async ({ body }) => {
      const response = await fetch("/pods/payroll/inbox/", {
        body,
        headers: {
          "content-type": "text/turtle",
          slug: "refreshrequest",
          "x-demo-agent": "lender",
        },
        method: "POST",
      });
      return response.status;
    },
    { body },
  );
  expect(posted).toBe(201);

  await page.getByRole("link", { name: "Verifications" }).click();
  await expect(page.getByText("Answered automatically")).toBeVisible({ timeout: 60_000 });
  await expect(
    page
      .getByText(/revoked/)
      .filter({ hasNotText: "not revoked" })
      .first(),
  ).toBeVisible({
    timeout: 30_000,
  });
  const after = await asOwner(page, "alex", "alex/credentials/employment-income");
  expect(after.status).toBe(200);
  expect(after.body).not.toBe(before.body);
  // "Answered automatically" shows once the back office claims the request, and the revoked
  // entry before the reply is sent: the delivery to Juniper's inbox is the agent's last write.
  await expect
    .poll(async () => (await asOwner(page, "lender", "lender/inbox/")).body, { timeout: 30_000 })
    .toMatch(/refreshdelivery/i);
});

for (const path of ["", "pay", "share", "verifications", "no-such-page"]) {
  test(`/${path}: trust banner, no axe violations, no horizontal scroll at 390 px`, async ({
    page,
  }) => {
    await openReady(page, path);
    await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#3D3A8C");
    await expectAccessible(page);
    await page.setViewportSize({ height: 844, width: 390 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("the self-hosted font loads from the app's own origin", async ({ page }) => {
  const fonts: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "font") fonts.push(request.url());
  });
  await openReady(page, "");
  await page.evaluate(() => document.fonts.ready);
  expect(fonts.length).toBeGreaterThan(0);
  for (const url of fonts) expect(new URL(url).pathname).toMatch(/^\/payroll\/assets\//);
});
