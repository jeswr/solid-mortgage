// AUTHORED-BY Claude Opus 5.5
/**
 * Drive the guided path the way a visitor using "Do it for me" does (design.md §d.6): deep-link
 * to the first step, then for each step call `window.__demo.act()`, wait until the tour marks
 * the step done (it does so only from Lens entries or the real click, never by faking an
 * outcome), check the step's `expect` list against the pod runtime's log, and move on with
 * `window.__demo.goto(next)`.
 *
 * The walker never throws for a step that does not complete: it stops and reports, so the tests
 * that read its record can each fail with their own message.
 */
import type { Page } from "@playwright/test";
import { describeEntry, describeExpectation, matchesExpectation } from "./match.ts";
import { type LensEntry, podLogSoon } from "./pod.ts";
import { evaluateSoon, isControlled, openApp, waitForRuntime } from "./site.ts";
import type { MortgageTour, TourStep } from "./tour-content.ts";

export interface StepWindow {
  index: number;
  id: string;
  app: string;
  path: string;
  /** Log entries with `from < id <= to` happened during this step. */
  from: number;
  to: number;
  completed: boolean;
  /** Expectations that never appeared in the log during the step. */
  missing: string[];
  url: string;
}

export interface WalkResult {
  windows: StepWindow[];
  /** Set when the walk stopped before the requested end. */
  error?: string;
  /** Index of the step the walk stopped on. */
  stoppedAt?: number;
}

export interface WalkOptions {
  /** First step index (default 0, which deep-links to the first step). */
  from?: number;
  /** Stop before this index (default: the end of the tour). */
  to?: number;
  /** Deep-link to the first step instead of assuming the page is already on it. */
  open?: boolean;
  onReached?: (step: TourStep, index: number) => Promise<void>;
  onDone?: (step: TourStep, index: number, window: StepWindow) => Promise<void>;
  /** "act" (Do it for me, default) or a custom actor (the keyboard run). */
  perform?: (step: TourStep, index: number) => Promise<void>;
  /** How the visitor looks at a step with no action (default: click its target region). */
  look?: (step: TourStep, index: number) => Promise<void>;
  /** Called before moving on to the next step: let the page finish what it is doing. */
  settle?: (step: TourStep, index: number) => Promise<void>;
  reachTimeout?: number;
  doneTimeout?: number;
  expectTimeout?: number;
}

export async function tourState(
  page: Page,
): Promise<{ step?: string; done: string[]; mode: string } | undefined> {
  return evaluateSoon(page, () => window.__demo?.state() ?? undefined);
}

async function lastId(page: Page, fallback: number): Promise<number> {
  if (!(await isControlled(page))) return fallback;
  try {
    const log = await podLogSoon(page, 5_000);
    return log.at(-1)?.id ?? 0;
  } catch {
    return fallback;
  }
}

async function waitFor(
  page: Page,
  predicate: () => Promise<boolean>,
  timeout: number,
  every = 250,
): Promise<boolean> {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    if (await predicate().catch(() => false)) return true;
    await page.waitForTimeout(every);
  }
  return predicate().catch(() => false);
}

/** "Do it for me": start `act()` without awaiting it (it may navigate away). */
export async function doItForMe(page: Page): Promise<void> {
  await evaluateSoon(page, () => {
    void window.__demo?.act().catch((error: unknown) => console.warn("[e2e] act failed", error));
  });
}

/** A visitor looking at a "Look" step's region: a real click on its `data-tour` target. */
export async function lookAt(page: Page, target: string): Promise<void> {
  const region = page.locator(`[data-tour="${target}"]`).first();
  await region.waitFor({ state: "visible", timeout: 30_000 });
  await region.click({ position: { x: 4, y: 4 } });
}

async function gotoStep(page: Page, id: string): Promise<void> {
  await evaluateSoon(
    page,
    (stepId: string) => {
      void window.__demo?.goto(stepId);
    },
    id,
  );
}

/** Entries during a step: after its watermark, and not tagged with another step. */
export function entriesOf(
  log: LensEntry[],
  window: Pick<StepWindow, "from" | "to" | "id">,
): LensEntry[] {
  return log.filter(
    (entry) =>
      entry.id > window.from &&
      entry.id <= window.to &&
      (entry.source !== "pod" || entry.tour === undefined || entry.tour.step === window.id),
  );
}

export async function walkTour(
  page: Page,
  tour: MortgageTour,
  options: WalkOptions = {},
): Promise<WalkResult> {
  const from = options.from ?? 0;
  const to = Math.min(options.to ?? tour.steps.length, tour.steps.length);
  const windows: StepWindow[] = [];
  const reachTimeout = options.reachTimeout ?? 30_000;
  const doneTimeout = options.doneTimeout ?? 60_000;
  const expectTimeout = options.expectTimeout ?? 20_000;
  let watermark = 0;

  const stop = (index: number, error: string): WalkResult => ({ error, stoppedAt: index, windows });

  for (let index = from; index < to; index++) {
    const step = tour.steps[index] as TourStep;
    const label = `step ${index + 1} "${step.id}" (${step.app}${step.path.startsWith("/") ? "" : "/"}${step.path})`;
    try {
      if (index === from && (options.open ?? from === 0)) {
        await openApp(page, step.app, step.path, {
          params: { step: step.id, tour: tour.demo },
          tour: true,
        });
      }
      // Reach the step: the tour must report it as current.
      let reached = await waitFor(
        page,
        async () => (await tourState(page))?.step === step.id,
        Math.min(5_000, reachTimeout),
      );
      if (!reached) {
        await gotoStep(page, step.id);
        reached = await waitFor(
          page,
          async () => (await tourState(page))?.step === step.id,
          reachTimeout,
        );
      }
      if (!reached) {
        return stop(
          index,
          `${label} was never reached: window.__demo.state() is ${JSON.stringify(await tourState(page))} on ${page.url()}`,
        );
      }
      await waitForRuntime(page, { tour: true });
      await options.onReached?.(step, index);
      // The first step's window opens now. Later steps' windows open where the previous step's
      // closed, so the reads a step's page makes as it loads (steps 6, 10 and 24 expect them)
      // count towards the step that navigated there.
      if (index === from) watermark = await lastId(page, watermark);
      const span: StepWindow = {
        app: step.app,
        completed: false,
        from: watermark,
        id: step.id,
        index,
        missing: [],
        path: step.path,
        to: watermark,
        url: page.url(),
      };
      windows.push(span);

      // Act, then wait for the tour to mark the step done. A "Look" step has no action (and no
      // "Do it for me"): the visitor looks at its target region, which is what completes it.
      const isDone = async () => (await tourState(page))?.done.includes(step.id) ?? false;
      if (step.action !== undefined && !(await isDone())) {
        if (options.perform) await options.perform(step, index);
        else await doItForMe(page);
      } else if (step.done.target !== undefined && !(await isDone())) {
        if (options.look) await options.look(step, index);
        else await lookAt(page, step.done.target);
      }
      let done = await waitFor(page, isDone, step.action ? doneTimeout / 2 : doneTimeout);
      if (!done && step.action !== undefined && options.perform === undefined) {
        await doItForMe(page); // a navigation can swallow the first click
        done = await waitFor(page, isDone, doneTimeout / 2);
      }
      if (!done) {
        const log = await podLogSoon(page, 5_000).catch(() => []);
        const recent = log
          .filter((e) => e.id > span.from)
          .map(describeEntry)
          .join("\n  ");
        return stop(
          index,
          `${label} did not complete within ${doneTimeout / 1000} s` +
            (step.action ? ` after "Do it for me" on [data-tour="${step.action.target}"]` : "") +
            ` (now on ${page.url()}). Entries since the step began:\n  ${recent || "none"}`,
        );
      }
      span.completed = true;
      await waitForRuntime(page, { tour: true });

      // Every expect item must be in the log, among this step's entries.
      let log: LensEntry[] = [];
      const unmatched = async () => {
        log = await podLogSoon(page, 5_000);
        span.to = log.at(-1)?.id ?? span.to;
        const mine = entriesOf(log, span);
        return step.expect.filter((item) => !mine.some((entry) => matchesExpectation(item, entry)));
      };
      await waitFor(page, async () => (await unmatched()).length === 0, expectTimeout, 500);
      const missing = await unmatched().catch(() => step.expect);
      span.missing = missing.map(describeExpectation);
      watermark = span.to;
      await options.onDone?.(step, index, span);

      const next = tour.steps[index + 1];
      if (next !== undefined && index + 1 < to) {
        await options.settle?.(step, index);
        await gotoStep(page, next.id);
      }
    } catch (error) {
      return stop(index, `${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { windows };
}
