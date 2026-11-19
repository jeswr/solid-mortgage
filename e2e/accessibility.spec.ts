// AUTHORED-BY Claude Opus 5.5
/**
 * Acceptance test 2 (build-plan.md §4, design.md §c.6): axe (WCAG 2.1 AA) passes on every step
 * of the guided path, with the Solid Lens open and with it collapsed; and chapters 1 to 3 can be
 * run with the keyboard alone (Tab to each step's `data-tour` target, Enter; Tab to the Lens's
 * Next, Enter).
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { evaluateSoon } from "./support/site.ts";
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
      const where = `step ${index + 1} "${step.id}" ${page.url()}`;
      await setLensCollapsed(page, false);
      for (const v of await axe(page)) violations.push(`${where} [Lens open] ${v}`);
      await setLensCollapsed(page, true);
      for (const v of await axe(page)) violations.push(`${where} [Lens collapsed] ${v}`);
      await setLensCollapsed(page, false);
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
  const perform = async (step: TourStep) => {
    const target = step.action?.target as string;
    const reached = await tabTo(page, () => focusIs(page, "target", target));
    if (!reached)
      throw new Error(`[data-tour="${target}"] cannot be reached with Tab on ${page.url()}`);
    await page.keyboard.press("Enter");
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
      if (!(await tabTo(page, () => focusIs(page, "target", target))))
        throw new Error(`[data-tour="${target}"] cannot be reached with Tab on ${page.url()}`);
    },
    perform: async (step) => perform(step),
    to: end,
  });
  expect(result.error, "keyboard run").toBeUndefined();
  expect(result.windows.length).toBe(end);
});
