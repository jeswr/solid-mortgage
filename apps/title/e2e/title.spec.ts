// AUTHORED-BY Claude Opus 5.5
import { expect, type Page, test } from "@playwright/test";
import { catchUp, expectAccessible, expectNoSideScroll, open, readAs } from "./helpers.ts";

const FILE = "files/STE-2026-0417";

const ROOMS: { path: string; heading: string }[] = [
  { heading: "File STE-2026-0417", path: FILE },
  { heading: "Title search", path: `${FILE}/search` },
  { heading: "Commitment for title insurance", path: `${FILE}/commitment` },
  { heading: "Closing room", path: `${FILE}/closing` },
  { heading: "Disbursement ledger", path: `${FILE}/ledger` },
  { heading: "Recording", path: `${FILE}/recording` },
  { heading: "Policies", path: `${FILE}/policy` },
];

/** Client-side navigation keeps the pods (a full reload would too, but this is what a visitor does). */
async function visitEveryRoom(page: Page): Promise<void> {
  for (const room of ROOMS) {
    await page
      .getByRole("navigation", { name: "File" })
      .getByRole("link", { exact: true, name: navLabel(room.heading) })
      .click();
    await expect(page.getByRole("heading", { level: 1, name: room.heading })).toBeVisible();
    await expect(page.getByText("Reading the pods…")).toHaveCount(0);
    await expectAccessible(page);
    await expectNoSideScroll(page);
  }
}

function navLabel(heading: string): string {
  if (heading.startsWith("File ")) return "File overview";
  if (heading.startsWith("Commitment")) return "Commitment";
  return heading;
}

test("the open files list renders with the trust banner and its own metadata", async ({ page }) => {
  await open(page, "./");
  await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
  await expect(page).toHaveTitle(/Sextant Title & Escrow/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#1B2A49");
  await expect(page.getByRole("heading", { name: "Open files" })).toBeVisible();
  await expectAccessible(page);
  await expectNoSideScroll(page);
});

test("not-found keeps the banner", async ({ page }) => {
  await open(page, "./no-such-document");
  await expect(page.getByRole("heading", { name: "No such document" })).toBeVisible();
  await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
  await expectAccessible(page);
});

test("step 14: Sextant searches title and issues the signed commitment", async ({ page }) => {
  await open(page, `./${FILE}/commitment`);
  await catchUp(page);
  // Before issue: a draft built from the two documents G6 lets Sextant read.
  await expect(page.getByText("Draft. Not issued.")).toBeVisible();
  const issue = page.locator('[data-tour="title-issue-commitment"]');
  await expect(issue).toBeEnabled();
  await expectAccessible(page);
  await expectNoSideScroll(page);
  await issue.click();
  await expect(page.getByText(/^Issued .*, signed by Sextant Title & Escrow/)).toBeVisible({
    timeout: 60_000,
  });
  await expect(issue).toBeDisabled();

  const own = await readAs(page, "title", "title/files/STE-2026-0417/commitment");
  expect(own.status).toBe(200);
  expect(own.body).toContain("STE-2026-0417");
  expect((await readAs(page, "alex", "alex/mortgage/closing/title-commitment")).status).toBe(200);

  await visitEveryRoom(page);
});

test("step 18: the closing is signed (simulated) and Sextant cannot read back what it delivered", async ({
  page,
}) => {
  await open(page, `./${FILE}/closing`);
  await expect(
    page.getByRole("note").filter({ hasText: "Simulated signing: not a notarial act." }),
  ).toBeVisible();
  await catchUp(page);
  const sign = page.locator('[data-tour="title-sign"]');
  await expect(sign).toBeEnabled();
  await expectAccessible(page);
  await expectNoSideScroll(page);
  await sign.click();
  await expect(page.getByText("Signed (simulated)").first()).toBeVisible({ timeout: 60_000 });
  await expect(sign).toBeDisabled();

  for (const path of [
    "settlement-statement",
    "signed/promissory-note",
    "signed/mortgage",
    "signed/warranty-deed",
  ]) {
    expect((await readAs(page, "alex", `alex/mortgage/closing/${path}`)).status, path).toBe(200);
  }

  // G6 is write-only on mortgage/closing/: the read-back is refused, and the screen says so.
  await page.getByRole("button", { name: "Try to open Alex's settlement statement" }).click();
  await expect(page.getByRole("alert")).toContainText("Refused by the pod (403)");
  await expectAccessible(page);

  await visitEveryRoom(page);
});
