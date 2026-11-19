// AUTHORED-BY Claude Opus 5.5
import { expect, test } from "@playwright/test";
import { catchUp, expectAccessible, expectNoSideScroll, open, readAs } from "./helpers.ts";

test("the Recorder's home renders with the trust banner and its own metadata", async ({ page }) => {
  await open(page, "./");
  await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
  await expect(page).toHaveTitle(/Marlow County Recorder/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#2A4D8F");
  await expect(page.getByRole("heading", { level: 1, name: "Recorder's Office" })).toBeVisible();
  await expectAccessible(page);
  await expectNoSideScroll(page);
});

test("not-found keeps the banner", async ({ page }) => {
  await open(page, "./no-such-page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
  await expectAccessible(page);
});

test("the search reads the register anonymously; the queue refuses an anonymous reader", async ({
  page,
}) => {
  await open(page, "./search");
  await expect(page.getByRole("status").filter({ hasText: "0 documents found" })).toBeVisible();
  await page
    .getByRole("button", { name: "Try to open the eRecording queue without signing in" })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    /Refused by the pod \(40[13]\)/,
  );
  await expectAccessible(page);
  await expectNoSideScroll(page);
});

test("step 19: the county records the deed and mortgage, and anyone can find them", async ({
  page,
}) => {
  await open(page, "./intake");
  await catchUp(page);
  const record = page.locator('[data-tour="county-record"]');
  await expect(record).toBeEnabled();
  await expectAccessible(page);
  await expectNoSideScroll(page);
  await record.click();
  await expect(page.getByRole("heading", { name: "Instruments recorded" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(record).toBeDisabled();
  await expect(
    page.getByRole("main").getByRole("cell", { name: "Sextant Title & Escrow" }).first(),
  ).toBeVisible();
  await expectAccessible(page);
  await expectNoSideScroll(page);

  // Read back as the county, and as nobody: the register is public, the inbox is not.
  for (const reference of ["2026-0048113", "2026-0048114"]) {
    expect((await readAs(page, "county", `county/records/${reference}`)).status).toBe(200);
    const anonymous = await readAs(page, null, `county/records/${reference}`);
    expect(anonymous.status).toBe(200);
    expect(anonymous.body).toContain(reference);
  }
  expect([401, 403]).toContain((await readAs(page, null, "county/inbox/")).status);

  // The public search, which reads without signing in.
  await page
    .getByRole("navigation", { name: "County" })
    .getByRole("link", { name: "Search records" })
    .click();
  await page.getByLabel("Search for", { exact: true }).fill("Alex Rivera");
  await page.getByLabel("Search in", { exact: true }).selectOption("name");
  await page.getByRole("main").getByRole("button", { exact: true, name: "Search" }).click();
  await expect(page.getByRole("status").filter({ hasText: "2 documents found" })).toBeVisible();
  await expectAccessible(page);
  await expectNoSideScroll(page);

  await page.getByRole("main").getByRole("link", { name: "2026-0048114" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Instrument 2026-0048114" }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("cell", { name: "Juniper Home Loans" }),
  ).toBeVisible();
  await expectAccessible(page);
  await expectNoSideScroll(page);
});
