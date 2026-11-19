// AUTHORED-BY Claude Opus 5.5
/**
 * Driving the small business loan tour from a test (content/small-business-loan/tour.ts),
 * through the tour engine's own `window.__demo`: the step helpers in ./demo.ts, the tour's steps
 * with their pages and buttons, a fresh start at step 1 (a new browser context is a cold start:
 * the first step brings the pods to the business onboarding demo's end), and a run of the earlier
 * steps by their own tour buttons. The other apps' suites import this file.
 */
import { expect, type Page } from "@playwright/test";
import { act, gotoStep, onStep, stepDone } from "./demo.ts";

export { act, gotoStep, onStep, stepDone };

/** Each step, the page it opens and its tour button (`undefined`: a step with no action). */
export const LOAN_STEPS: readonly { id: string; at: string; target?: string }[] = [
  { at: "/bank/business", id: "publish-cash-flow", target: "bank-business-publish-cash-flow" },
  { at: "/state/revenue", id: "tax-compliance", target: "state-revenue-issue-tax" },
  { at: "/wallet/loan/requests", id: "apply", target: "wallet-loan-approve-s2" },
  { at: "/business-lender/loan", id: "assessment", target: "lender-loan-assess" },
  { at: "/business-lender/loan/decision", id: "decision", target: "lender-loan-decide" },
  { at: "/wallet/loan/requests", id: "monitoring", target: "wallet-loan-approve-s3" },
  { at: "/business-lender/loan/covenants", id: "quarter", target: "lender-loan-quarter" },
  { at: "/wallet/loan/sharing", id: "revoke", target: "wallet-loan-withdraw-s3" },
  { at: "/wallet/loan/ledger", id: "ledger" },
];

const stepOf = (id: string) => {
  const step = LOAN_STEPS.find((s) => s.id === id);
  if (step === undefined) throw new Error(`no loan step ${id}`);
  return step;
};

/** Start the small business loan tour fresh at its first step, on Alder Bank's business page. */
export async function startLoanTour(page: Page): Promise<void> {
  await page.goto("/bank/business?tour=small-business-loan&step=publish-cash-flow");
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, undefined, {
    timeout: 60_000,
  });
  await onStep(page, "publish-cash-flow");
}

/** Open a step's page through the engine (step 1 is where the tour starts). */
export async function openStep(page: Page, id: string): Promise<void> {
  const step = stepOf(id);
  if (id === "publish-cash-flow") {
    await onStep(page, id);
    return;
  }
  await gotoStep(page, id, step.at);
}

/** Press a step's tour button through the engine, once it is enabled; resolves when done. */
export async function actStep(page: Page, id: string): Promise<void> {
  const { target } = stepOf(id);
  if (target === undefined) throw new Error(`step ${id} has no action`);
  await expect(page.locator(`[data-tour="${target}"]`)).toBeEnabled({ timeout: 120_000 });
  await act(page, id);
}

/**
 * From a fresh start, play every step before `id` by its own tour button, then open `id`'s page
 * (its button not yet pressed).
 */
export async function playLoanUpTo(page: Page, id: string): Promise<void> {
  await startLoanTour(page);
  for (const step of LOAN_STEPS) {
    if (step.id === id) break;
    await openStep(page, step.id);
    await actStep(page, step.id);
  }
  await openStep(page, id);
}
