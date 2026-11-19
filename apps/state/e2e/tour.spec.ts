// AUTHORED-BY Claude Opus 5.5
/**
 * The whole moving-house tour on the built site (flows.md section 2), step by step through the
 * tour engine, across the wallet, State Online Services, the county, the insurer and the bank:
 * every interactive step by its own tour button, every step's page checked for accessibility and
 * phone width, and each step's effect read back from the pods.
 */
import { expect, type Page, test } from "@playwright/test";
import {
  expectAccessible,
  expectNoSideScroll,
  OUTSIDE_LENS,
  readAs,
} from "../../../test-support/e2e.ts";
import { act, gotoStep, onStep, startTour } from "./demo.ts";

test.setTimeout(600_000);

async function checkPage(page: Page): Promise<void> {
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
}

/** Poll a pod read until it answers `status` (a back office acts a moment after the event). */
async function eventually(page: Page, agent: string, path: string, status: number) {
  await expect
    .poll(async () => (await readAs(page, agent, path)).status, { timeout: 60_000 })
    .toBe(status);
  return readAs(page, agent, path);
}

const metric = (page: Page, key: string) => page.locator(`[data-metric="moving-house.${key}"]`);

test("the moving-house tour, all ten steps, with the pods read back", async ({ page }) => {
  // 1. One address, kept by Alex.
  await startTour(page);
  await expect(page.getByTestId("mh-consumers")).toBeVisible({ timeout: 60_000 });
  await checkPage(page);
  const before = await readAs(page, "alex", "alex/profile/address");
  expect(before.status).toBe(200);
  expect(before.body).toContain("Fenwick Street");

  // 2. Change it once, with the deed.
  await gotoStep(page, "change", "/wallet/moving/address");
  await checkPage(page);
  await act(page, "change");
  const saved = await readAs(page, "alex", "alex/profile/address");
  expect(saved.body).toContain("Larch Lane");
  expect(saved.body).toContain("/alex/mortgage/closing/recording-receipt");

  // 3. Choose who should know: six standing grants; bank, payroll and servicer read at once.
  await gotoStep(page, "who", "/wallet/moving/who");
  await checkPage(page);
  await act(page, "who");
  for (const code of ["h1", "h2", "h3", "h4", "h5", "h6"]) {
    expect((await readAs(page, "alex", `alex/policies/${code}`)).status).toBe(200);
    expect((await readAs(page, "alex", `alex/consents/${code}-given`)).status).toBe(200);
  }
  for (const [holder, copy] of [
    ["bank", "bank/customers/alex-address"],
    ["payroll", "payroll/employees/alex-address"],
    ["servicer", "servicer/accounts/alex-address"],
  ] as const) {
    expect((await eventually(page, holder, copy, 200)).body).toContain("Larch Lane");
  }
  // The address's access rules name the six organisations and nobody else. (Read as Alex: a
  // test-side read as an organisation would itself count in the ledger.)
  const acl = (await readAs(page, "alex", "alex/profile/address.acl")).body;
  for (const holder of ["state", "county", "bank", "insurer", "payroll", "servicer"])
    expect(acl).toContain(`/pods/${holder}/profile/card#me`);
  expect(acl).not.toContain("/pods/lender/");

  // 4. Driver Services reads, then re-issues.
  await gotoStep(page, "driver-services", "/state/driver-services");
  await expect(page.getByTestId("state-address")).toContainText("14 Larch Lane", {
    timeout: 60_000,
  });
  await checkPage(page);
  await act(page, "driver-services");
  await expect(page.getByTestId("state-licence")).toContainText("version 2", { timeout: 60_000 });
  expect((await readAs(page, "alex", "alex/identity/driver-licence")).body).toContain("Larch Lane");

  // 5. The county treasurer reads it.
  await gotoStep(page, "treasurer", "/county/moving/treasurer");
  await expect(page.getByTestId("mh-held-address")).toContainText("14 Larch Lane", {
    timeout: 60_000,
  });
  await checkPage(page);
  expect((await readAs(page, "county", "county/treasurer/alex-address")).body).toContain(
    "/alex/profile/address",
  );

  // 6. The insurer updates the car policy.
  await gotoStep(page, "insurer", "/insurer/moving/policies");
  await expect(page.getByTestId("mh-held-address")).toContainText("14 Larch Lane", {
    timeout: 60_000,
  });
  await expect(page.getByText(/Premium at the new address.*illustrative/)).toBeVisible();
  await checkPage(page);
  expect((await readAs(page, "insurer", "insurer/policyholders/alex-address")).status).toBe(200);

  // 7. Six readers, one copy.
  await gotoStep(page, "readers", "/wallet/moving/readers");
  await expect(metric(page, "organisations")).toHaveAttribute("data-value", "6", {
    timeout: 60_000,
  });
  await expect(metric(page, "records")).toHaveAttribute("data-value", "1");
  await checkPage(page);

  // 8. Withdraw Alder Bank's grant: the rule is removed, the bank is refused at once.
  await gotoStep(page, "revoke-bank", "/wallet/moving/sharing");
  await checkPage(page);
  await act(page, "revoke-bank");
  expect((await readAs(page, "alex", "alex/consents/h3-withdrawn")).status).toBe(200);
  const after = (await readAs(page, "alex", "alex/profile/address.acl")).body;
  expect(after).not.toContain("/pods/bank/");
  expect(after).toContain("/pods/payroll/profile/card#me");

  // 9. Correct the unit, a week later: five read it again; the bank's read is refused (403).
  await gotoStep(page, "correction", "/wallet/moving/address");
  await checkPage(page);
  await act(page, "correction");
  for (const copy of [
    ["payroll", "payroll/employees/alex-address"],
    ["servicer", "servicer/accounts/alex-address"],
    ["state", "state/licensing/alex-address"],
    ["county", "county/treasurer/alex-address"],
    ["insurer", "insurer/policyholders/alex-address"],
  ] as const) {
    await expect
      .poll(async () => (await readAs(page, copy[0], copy[1])).body, { timeout: 60_000 })
      .not.toContain("Apt 3");
  }
  const stale = await readAs(page, "bank", "bank/customers/alex-address");
  expect(stale.body).toContain("Apt 3");
  expect(stale.body).toContain("invalidatedAtTime");

  // 10. The journey ledger: totals counted from the log.
  await gotoStep(page, "ledger", "/wallet/moving/ledger");
  await expect(metric(page, "reads")).toHaveAttribute("data-value", "11", { timeout: 60_000 });
  await expect(metric(page, "records")).toHaveAttribute("data-value", "1");
  await expect(metric(page, "organisations")).toHaveAttribute("data-value", "6");
  await expect(metric(page, "denied")).toHaveAttribute("data-value", "1");
  await checkPage(page);

  // Every step of the tour is done.
  const done = await page.evaluate(
    () => (window as unknown as { __demo: { state(): { done: string[] } } }).__demo.state().done,
  );
  expect([...done].sort()).toEqual(
    [
      "address",
      "change",
      "who",
      "driver-services",
      "treasurer",
      "insurer",
      "readers",
      "revoke-bank",
      "correction",
      "ledger",
    ].sort(),
  );
});

test("after the tour, the bank's page says its copy is out of date; payroll's is current", async ({
  page,
}) => {
  await startTour(page);
  for (const [step, at] of [
    ["change", "/wallet/moving/address"],
    ["who", "/wallet/moving/who"],
  ] as const) {
    await gotoStep(page, step, at);
    await act(page, step);
  }
  await eventually(page, "bank", "bank/customers/alex-address", 200);
  await page.goto("/bank/moving/address");
  await expect(page.getByTestId("mh-held-address")).toContainText("14 Larch Lane", {
    timeout: 60_000,
  });
  await expect(page.getByTestId("mh-held-stale")).toHaveCount(0);
  await checkPage(page);

  await page.goto("/wallet/moving/sharing?tour=moving-house&step=revoke-bank");
  await onStep(page, "revoke-bank");
  await act(page, "revoke-bank");
  await gotoStep(page, "correction", "/wallet/moving/address");
  await act(page, "correction");
  // The bank's back office runs in this tab: let it mark its copy before the page changes.
  await expect
    .poll(async () => (await readAs(page, "bank", "bank/customers/alex-address")).body, {
      timeout: 60_000,
    })
    .toContain("invalidatedAtTime");

  await page.goto("/bank/moving/address");
  await expect(page.getByTestId("mh-held-stale")).toBeVisible({ timeout: 60_000 });
  await checkPage(page);
  await page.goto("/payroll/moving/address");
  await expect(page.getByTestId("mh-held-address")).not.toContainText("Apt 3", {
    timeout: 60_000,
  });
  await expect(page.getByTestId("mh-held-stale")).toHaveCount(0);
  await checkPage(page);
  await page.goto("/servicer/moving/address");
  await expect(page.getByTestId("mh-held-address")).toContainText("14 Larch Lane", {
    timeout: 60_000,
  });
  await checkPage(page);
});
