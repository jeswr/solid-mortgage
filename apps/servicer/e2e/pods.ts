// AUTHORED-BY Claude Opus 5.5
/** Helpers the specs share: wait for the real pods, inject the harness, read as an owner. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";
import { HARNESS_DIR } from "./build-harness.ts";

/** The app's page is controlled by the pod service worker and the pods are seeded. */
export async function podsReady(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          if (navigator.serviceWorker.controller === null) return 0;
          return (await fetch("/pods/insurer/status/list")).status;
        }),
      { timeout: 60_000 },
    )
    .toBe(200);
}

/** Put the harness in the page (it acts on the page's service worker). */
export async function injectHarness(page: Page): Promise<void> {
  const content = readFileSync(join(HARNESS_DIR, "harness.js"), "utf8");
  await page.addScriptTag({ content, type: "module" });
  await page.waitForFunction(() => window.__harness !== undefined);
}

export const podUrlIn = (page: Page, owner: string, path: string): string =>
  new URL(`/pods/${owner}/${path}`, page.url()).href;

export function runUntil(page: Page, beat: string): Promise<string[]> {
  return page.evaluate((name) => window.__harness?.runUntil(name) ?? [], beat);
}

export function readAs(
  page: Page,
  owner: string,
  path: string,
): Promise<{ status: number; body: string }> {
  const url = podUrlIn(page, owner, path);
  return page.evaluate(
    ([who, where]) =>
      window.__harness?.read(who as never, where as string) ?? { body: "", status: 0 },
    [owner, url] as const,
  );
}

/** No horizontal scroll at the page's current width. */
export async function noHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}
