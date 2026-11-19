// AUTHORED-BY Claude Opus 5.5
/**
 * The whole medication-handover tour on the built site (flows.md section 5), step by step through
 * the tour engine, across Rosa's wallet, Riverbend General Hospital, Corner Dispensary, Larch
 * Lane Family Practice and Alex's wallet: every interactive step by its own tour button, every
 * step's page checked for accessibility and phone width, each step's effect read back from the
 * pods, and the ledger's totals checked against what happened. (Reads from the test side are
 * made as Rosa: a read as an organisation would itself count in the ledger.)
 */
import { expect, type Page, test } from "@playwright/test";
import {
  expectAccessible,
  expectNoSideScroll,
  OUTSIDE_LENS,
  readAs,
} from "../../../test-support/e2e.ts";
import { act, gotoStep, startTour } from "./demo.ts";

test.setTimeout(600_000);

async function checkPage(page: Page): Promise<void> {
  await expectAccessible(page, OUTSIDE_LENS);
  await expectNoSideScroll(page);
}

const rosa = (page: Page, path: string) => readAs(page, "rosa", `rosa/${path}`);
const metric = (page: Page, key: string) =>
  page.locator(`[data-metric="medication-handover.${key}"]`);

test("the medication-handover tour, all ten steps, with the pods read back", async ({ page }) => {
  // 1. Rosa's own list and allergy, in her wallet.
  await startTour(page);
  await expect(page.getByTestId("allergy-amoxicillin")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("med-ibuprofen")).toContainText("Taking");
  await checkPage(page);

  // 2. The ward signs: three changes, each with its reason.
  await gotoStep(page, "discharge", "/hospital/discharge");
  await expect(page.locator('[data-tour="hospital-sign-discharge"]')).toBeEnabled({
    timeout: 60_000,
  });
  await checkPage(page);
  await act(page, "discharge");
  expect((await rosa(page, "medications/lisinopril")).body).toContain("Lisinopril 20 mg tablet");
  expect((await rosa(page, "medications/provenance/ibuprofen-day-53")).body).toContain(
    "Kidney function fell",
  );
  expect((await rosa(page, "discharge/summary")).status).toBe(200);

  // 3. Rosa approves the pharmacy, the practice and Alex; the ward's stay grant has ended.
  await gotoStep(page, "grants", "/wallet/health/requests");
  await expect(page.locator('[data-tour="wallet-med-approve"]')).toBeEnabled({ timeout: 60_000 });
  await checkPage(page);
  await act(page, "grants");
  for (const code of ["m2", "m3", "m4"]) {
    expect((await rosa(page, `policies/${code}`)).status).toBe(200);
    expect((await rosa(page, `consents/${code}-given`)).status).toBe(200);
  }
  const listAcl = (await rosa(page, "medications/.acl")).body;
  for (const holder of ["pharmacy", "clinic", "alex"])
    expect(listAcl).toContain(`/pods/${holder}/profile/card#me`);
  expect(listAcl).not.toContain("/pods/hospital/");
  const summaryAcl = (await rosa(page, "discharge/.acl")).body;
  expect(summaryAcl).toContain("/pods/clinic/profile/card#me");
  expect(summaryAcl).not.toContain("/pods/pharmacy/");

  // 4. The pharmacy compares with its last supply and dispenses.
  await gotoStep(page, "dispense", "/pharmacy/queue");
  await expect(page.getByTestId("line-atorvastatin")).toHaveAttribute("data-status", "new", {
    timeout: 60_000,
  });
  await checkPage(page);
  await act(page, "dispense");
  expect((await rosa(page, "medications/dispenses/atorvastatin-day-53")).status).toBe(200);
  expect((await rosa(page, "medications/dispenses/lisinopril-day-53")).status).toBe(200);

  // 5. What the pharmacy does not see.
  await gotoStep(page, "not-shared", "/pharmacy/queue");
  await checkPage(page);

  // 6. The practice stops the duplicate statin.
  await gotoStep(page, "consultation", "/clinic/consultation");
  await expect(page.getByTestId("clinic-duplicate")).toBeVisible({ timeout: 60_000 });
  await checkPage(page);
  await act(page, "consultation");
  expect((await rosa(page, "medications/simvastatin")).body).toContain("Duplicate statin");
  expect((await rosa(page, "medications/provenance/simvastatin-day-60")).body).toContain(
    "Lena Marsh",
  );

  // 7. The pharmacy's next read shows it.
  await gotoStep(page, "pharmacy-refresh", "/pharmacy/queue");
  await expect(page.locator('[data-tour="pharmacy-refresh"]')).toBeEnabled({ timeout: 60_000 });
  await checkPage(page);
  await act(page, "pharmacy-refresh");
  await expect(
    page.getByTestId("pharmacy-refreshed").getByTestId("line-simvastatin"),
  ).toHaveAttribute("data-status", "stopped");

  // 8. Alex's wallet, read-only.
  await gotoStep(page, "carer", "/wallet/health/shared");
  await expect(page.getByTestId("med-shared-stopped")).toContainText("Simvastatin", {
    timeout: 60_000,
  });
  await expect(page.getByTestId("med-shared-current")).toContainText("Atorvastatin");
  await checkPage(page);

  // 9. Rosa changes pharmacy: M2 withdrawn, and the pharmacy's next read is refused.
  await gotoStep(page, "revoke", "/wallet/health/sharing");
  await checkPage(page);
  await act(page, "revoke");
  expect((await rosa(page, "consents/m2-withdrawn")).status).toBe(200);
  expect((await rosa(page, "medications/.acl")).body).not.toContain("/pods/pharmacy/");

  // 10. The ledger: totals counted from the log.
  await gotoStep(page, "ledger", "/wallet/health/ledger");
  await expect(metric(page, "lists")).toHaveAttribute("data-value", "1", { timeout: 60_000 });
  await expect(metric(page, "writers")).toHaveAttribute("data-value", "3");
  await expect(metric(page, "readers")).toHaveAttribute("data-value", "4");
  await expect(metric(page, "changes")).toHaveAttribute("data-value", "4");
  await expect(metric(page, "attributed")).toHaveAttribute("data-value", "4");
  await expect(metric(page, "denied")).toHaveAttribute("data-value", "1");
  await checkPage(page);
});
