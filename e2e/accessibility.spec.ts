// AUTHORED-BY Claude Opus 5.5
/**
 * Acceptance test 2 (build-plan.md §4, design.md §c.6): axe (WCAG 2.1 AA) passes on every step
 * of the guided path, with the Solid Lens open and with it collapsed; and chapters 1 to 3 can be
 * run with the keyboard alone (Tab to each step's `data-tour` target, Enter; Tab to the Lens's
 * Next, Enter).
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { evaluateSoon, waitForRuntime } from "./support/site.ts";
import { chapterStarts, loadMortgageTour, type TourStep } from "./support/tour-content.ts";
import { tourState, walkTour } from "./support/walk.ts";

const WCAG_21_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function axe(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze();
  return results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
  );
}

async function setLensCollapsed(page: Page, collapsed: boolean): Promise<void> {
  const found = await page.evaluate((value) => {
    const lens = document.querySelector("solid-lens") as
      | (HTMLElement & { collapsed?: boolean })
      | null;
    if (lens === null) return false;
    lens.collapsed = value;
    return true;
  }, collapsed);
  if (!found) throw new Error(`no <solid-lens> on ${page.url()}`);
  await page.waitForTimeout(400);
}

test("2 Accessibility: axe passes on every step with the Lens open and collapsed", async ({
  page,
}) => {
  test.setTimeout(40 * 60_000);
  const tour = await loadMortgageTour();
  const violations: string[] = [];
  const result = await walkTour(page, tour, {
    onReached: async (step, index) => {
      // A page can still move on as a step is reached (a redirect, the runtime claiming it);
      // then the check runs again on the page it settled on.
      for (let attempt = 1; ; attempt++) {
        const found: string[] = [];
        try {
          const where = `step ${index + 1} "${step.id}" ${page.url()}`;
          await setLensCollapsed(page, false);
          for (const v of await axe(page)) found.push(`${where} [Lens open] ${v}`);
          await setLensCollapsed(page, true);
          for (const v of await axe(page)) found.push(`${where} [Lens collapsed] ${v}`);
          await setLensCollapsed(page, false);
          violations.push(...found);
          return;
        } catch (error) {
          if (attempt >= 3 || !/Execution context was destroyed|navigat/i.test(String(error)))
            throw error;
          await page.waitForLoadState("load").catch(() => undefined);
          await waitForRuntime(page, { tour: true });
        }
      }
    },
  });
  expect(violations, "axe violations").toEqual([]);
  expect(result.error, "the guided path must be walked to the end").toBeUndefined();
  expect(result.windows.length).toBe(tour.steps.length);
});

/** The focused element, looking through open shadow roots (the Lens is a custom element). */
async function focusIs(page: Page, kind: "target" | "next", target?: string): Promise<boolean> {
  return (
    (await evaluateSoon(
      page,
      ({ kind, target }) => {
        let active: Element | null = document.activeElement;
        while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
        if (active === null) return false;
        if (kind === "target") return active.closest(`[data-tour="${target}"]`) !== null;
        const name = (active.getAttribute("aria-label") ?? active.textContent ?? "").trim();
        return active.tagName === "BUTTON" && /^next\b/i.test(name);
      },
      { kind, target },
    )) ?? false
  );
}

/**
 * Wait, as a visitor would, until the page shows a step's `data-tour` target (a page may render
 * it only once its pod data has loaded, like the AUS source-checks table), before tabbing to it.
 * The same 30 s wait `lookAt` (support/walk.ts) gives a mouse visitor; reaching it with Tab is
 * still required.
 */
async function targetShown(page: Page, target: string): Promise<void> {
  await page
    .locator(`[data-tour="${target}"]`)
    .first()
    .waitFor({ state: "visible", timeout: 30_000 })
    .catch(() => undefined);
}

/** Press Tab until `predicate` holds; false after `max` presses. */
async function tabTo(page: Page, predicate: () => Promise<boolean>, max = 200): Promise<boolean> {
  for (let i = 0; i < max; i++) {
    if (await predicate()) return true;
    await page.keyboard.press("Tab");
  }
  return predicate();
}

test("2 Accessibility: chapters 1 to 3 run with the keyboard alone", async ({ page }) => {
  test.setTimeout(20 * 60_000);
  const tour = await loadMortgageTour();
  const starts = chapterStarts(tour);
  // design.md §b.5: Welcome, then chapters 1 Get ready, 2 Shop, 3 Apply; stop before chapter 4.
  const end = starts[4];
  expect(end, `the tour needs at least five chapters (found ${starts.length})`).toBeDefined();
  // Some actions take two presses of the same target, as "Do it for me" does them: in the wallet
  // "Have Juniper ask now" brings Juniper's request, whose Approve carries the same target.
  const perform = async (step: TourStep) => {
    const target = step.action?.target as string;
    const done = async () => (await tourState(page))?.done.includes(step.id) ?? false;
    for (let press = 0; press < 3 && !(await done()); press++) {
      if (press > 0) {
        const settled = await expect
          .poll(done, { timeout: 10_000 })
          .toBe(true)
          .then(() => true)
          .catch(() => false);
        if (settled) return;
        if ((await page.locator(`[data-tour="${target}"]:enabled`).count()) === 0) return;
      }
      await targetShown(page, target);
      const reached = await tabTo(page, () => focusIs(page, "target", target));
      if (!reached)
        throw new Error(`[data-tour="${target}"] cannot be reached with Tab on ${page.url()}`);
      await page.keyboard.press("Enter");
    }
  };
  const result = await walkTour(page, tour, {
    onDone: async (step, index) => {
      if (index + 1 >= (end as number)) return;
      // Leave the step with the Lens's Next button, by keyboard.
      const next = tour.steps[index + 1] as TourStep;
      const reached = await tabTo(page, () => focusIs(page, "next"));
      if (!reached)
        throw new Error(`the Lens's Next button cannot be reached with Tab on ${page.url()}`);
      await page.keyboard.press("Enter");
      await expect
        .poll(async () => (await tourState(page))?.step, {
          message: `Next from "${step.id}" by keyboard`,
          timeout: 30_000,
        })
        .toBe(next.id);
    },
    // A "Look" step: Tab until focus is in the region (the tour completes it on focus).
    look: async (step) => {
      const target = step.done.target as string;
      await targetShown(page, target);
      if (!(await tabTo(page, () => focusIs(page, "target", target))))
        throw new Error(`[data-tour="${target}"] cannot be reached with Tab on ${page.url()}`);
    },
    perform: async (step) => perform(step),
    to: end,
  });
  expect(result.error, "keyboard run").toBeUndefined();
  expect(result.windows.length).toBe(end);
});
