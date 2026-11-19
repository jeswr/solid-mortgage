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

test("the services home renders with the trust banner and its own metadata", async ({ page }) => {
  await open(page, "./");
  await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
  await expectTrustSurfaces(page);
  await expect(page).toHaveTitle(/State Online Services/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#17375E");
  await expect(page.getByRole("heading", { level: 1, name: "Online services" })).toBeVisible();
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
});

test("not-found keeps the banner", async ({ page }) => {
  await open(page, "./no-such-page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expectTrustSurfaces(page);
  await expectAccessible(page, OUTSIDE_LENS);
});

test("before Alex grants anything, the pod refuses Driver Services' read", async ({ page }) => {
  await open(page, "./driver-services");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    /Refused by the pod \(40[13]\)/,
    { timeout: 60_000 },
  );
  await expect(page.locator('[data-tour="state-update-licence"]')).toBeDisabled();
  await expect(page.getByTestId("state-address")).toHaveCount(0);
  // The refusal is the pod's: the state may not read Alex's address.
  expect([401, 403]).toContain((await readAs(page, "state", "alex/profile/address")).status);
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
});

test("step 4 from its tour button: Driver Services reads the address and re-issues the licence", async ({
  page,
}) => {
  // Steps 2 and 3 in Alex's wallet, by the tour's own buttons.
  await startTour(page);
  await gotoStep(page, "change", "/wallet/moving/address");
  await act(page, "change");
  await gotoStep(page, "who", "/wallet/moving/who");
  await act(page, "who");

  await gotoStep(page, "driver-services", "/state/driver-services");
  await expect(page.getByTestId("state-address")).toContainText("14 Larch Lane", {
    timeout: 60_000,
  });
  await expect(page.getByTestId("state-licence")).toContainText("version 1");
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);

  await act(page, "driver-services");
  await expect(page.getByTestId("state-licence")).toContainText("version 2", { timeout: 60_000 });
  await expect(page.getByTestId("state-licence")).toContainText("Version 1 is withdrawn");
  await expect(page.locator('[data-tour="state-update-licence"]')).toBeDisabled();
  await expectAccessible(page, OUTSIDE_LENS);

  // Read back from the pods: the licence in Alex's pod carries the new address, the state
  // keeps a pointer to what it issued, and its status list is public.
  const licence = await readAs(page, "alex", "alex/identity/driver-licence");
  expect(licence.status).toBe(200);
  expect(licence.body).toContain("Larch Lane");
  expect(licence.body).not.toContain("Fenwick Street");
  expect((await readAs(page, "state", "state/issued/driver-licence-v2")).status).toBe(200);
  expect((await readAs(page, null, "state/status/list")).status).toBe(200);
  // The copy Driver Services keeps says where it came from.
  const copy = await readAs(page, "state", "state/licensing/alex-address");
  expect(copy.status).toBe(200);
  expect(copy.body).toContain("/alex/profile/address");
});
