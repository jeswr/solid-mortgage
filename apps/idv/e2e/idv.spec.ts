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

test("the start page renders with the trust banner and its own metadata", async ({ page }) => {
  await open(page, "./");
  await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
  await expectTrustSurfaces(page);
  await expect(page).toHaveTitle(/Trueline Identity/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#101412");
  await expect(
    page.getByRole("heading", { level: 1, name: "Identity, checked once" }),
  ).toBeVisible();
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
});

test("not-found keeps the banner", async ({ page }) => {
  await open(page, "./no-such-page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expectTrustSurfaces(page);
  await expectAccessible(page, OUTSIDE_LENS);
});

test("Trueline may write into Maya's pod under its slot, never read it", async ({ page }) => {
  await open(page, "./check");
  await expect(page.getByTestId("idv-read-back")).toContainText(/answers 40[13]/, {
    timeout: 60_000,
  });
  // The refusal is the pod's: Trueline holds no rule that lets it read Maya's credentials.
  expect([401, 403]).toContain((await readAs(page, "idv", "maya/credentials/identity")).status);
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
});

test("step 2 from its tour button: one check, one credential in Maya's pod", async ({ page }) => {
  await startTour(page);
  await gotoStep(page, "identity", "/idv/check");
  await expect(page.getByRole("img", { name: "0 of 3 steps done" })).toBeVisible();
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);

  await act(page, "identity");
  await expect(page.getByTestId("idv-issued")).toBeVisible();
  await expect(page.getByRole("img", { name: "3 of 3 steps done" })).toBeVisible();
  await expect(page.locator('[data-tour="idv-verify"]')).toBeDisabled();
  await expectAccessible(page, OUTSIDE_LENS);

  // Read back: the credential is in Maya's pod, the slot and its consent record are hers, Trueline
  // keeps a pointer and publishes its status list; and it still may not read what it wrote.
  const credential = await readAs(page, "maya", "maya/credentials/identity");
  expect(credential.status).toBe(200);
  expect(credential.body).toContain("Maya Torres");
  expect(credential.body).toContain("/pods/idv/profile/card#me");
  expect((await readAs(page, "maya", "maya/policies/s1")).status).toBe(200);
  expect((await readAs(page, "maya", "maya/consents/s1-given")).status).toBe(200);
  expect((await readAs(page, "idv", "idv/issued/maya-identity")).status).toBe(200);
  expect((await readAs(page, null, "idv/status/list")).status).toBe(200);
  expect([401, 403]).toContain((await readAs(page, "idv", "maya/credentials/identity")).status);
  await expect(page.getByTestId("idv-read-back")).toContainText(/answers 40[13]/);
});
