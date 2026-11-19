// AUTHORED-BY Claude Opus 5.5
import { expect, test } from "@playwright/test";
import {
  expectAccessible,
  expectNoSideScroll,
  expectTrustSurfaces,
  OUTSIDE_LENS,
  open,
  readAs,
} from "../../../test-support/e2e.ts";
import { act, gotoStep, startTour } from "./demo.ts";

test("the register's search renders with the trust banner and its own metadata", async ({
  page,
}) => {
  await open(page, "./");
  await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
  await expectTrustSurfaces(page);
  await expect(page).toHaveTitle(/Halyard LEI Services/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#0E6E6E");
  await expect(page.getByRole("heading", { level: 1, name: "Search the register" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Legal name or LEI" }).fill("9999NW");
  await expect(page.getByRole("link", { name: "Northwind Logistics LLC" })).toBeVisible();
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
});

test("not-found keeps the banner", async ({ page }) => {
  await open(page, "./no-such-page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expectTrustSurfaces(page);
  await expectAccessible(page, OUTSIDE_LENS);
});

test("steps 2, 3, 4 and 9 from their tour buttons, read back from the pods", async ({ page }) => {
  test.setTimeout(480_000);
  await startTour(page);
  // The register issues into Northwind's pod; it can never read it back.
  expect([401, 403]).toContain((await readAs(page, "registry", "northwind/credentials/")).status);

  await gotoStep(page, "org-identity", "/registry/entity");
  await expect(page.getByTestId("registry-lei")).toHaveText(/^9999[0-9A-Z]{16}$/);
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
  await act(page, "org-identity");
  await expect(page.getByTestId("registry-issued-org-identity")).toContainText("Version 1");
  await expect(page.locator('[data-tour="registry-issue-identity"]')).toBeDisabled();
  const identity = await readAs(page, "northwind", "northwind/credentials/org-identity");
  expect(identity.status).toBe(200);
  expect(identity.body).toContain("9999NWLOGISTICS");
  expect((await readAs(page, "registry", "registry/issued/org-identity-v1")).status).toBe(200);

  await gotoStep(page, "officer", "/registry/officers");
  await act(page, "officer");
  const officers = await readAs(page, "northwind", "northwind/credentials/officer-authorisation");
  expect(officers.body).toContain("Jordan Blake");

  await gotoStep(page, "ownership", "/registry/ownership");
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
  await act(page, "ownership");
  for (const path of [
    "beneficial-ownership",
    "anchors/owner-array",
    "anchors/owner-1",
    "anchors/owner-2",
  ]) {
    expect((await readAs(page, "northwind", `northwind/credentials/${path}`)).status).toBe(200);
  }
  expect((await readAs(page, "northwind", "northwind/credentials/anchors/owner-3")).status).toBe(
    404,
  );
  // Nobody else can read the ownership table: not the register, not a bank.
  for (const agent of ["registry", "bank", "business-lender"]) {
    expect([401, 403]).toContain(
      (await readAs(page, agent, "northwind/credentials/beneficial-ownership")).status,
    );
  }

  await gotoStep(page, "ownership-change", "/registry/ownership");
  await act(page, "ownership-change");
  await expect(page.getByTestId("registry-issued-beneficial-ownership")).toContainText(
    "Version 1 withdrawn",
  );
  await expect(page.locator('[data-tour="registry-record-sale"]')).toBeDisabled();
  const v2 = await readAs(page, "northwind", "northwind/credentials/beneficial-ownership");
  expect(v2.body).toContain("6000");
  expect((await readAs(page, "registry", "registry/issued/beneficial-ownership-v2")).status).toBe(
    200,
  );
  // The status list is public: anyone can check the old version is withdrawn.
  expect((await readAs(page, null, "registry/status/list")).status).toBe(200);
  // Jordan's 60% has no captured encoding: his share anchor was withdrawn, never guessed.
  expect((await readAs(page, "northwind", "northwind/credentials/anchors/owner-1")).status).toBe(
    404,
  );
  await expectAccessible(page, OUTSIDE_LENS);
});
