// AUTHORED-BY Claude Opus 5.5
/**
 * The site under test: the assembled `dist/` served on loopback by `tools/serve-dist.mjs`
 * (playwright.config.ts). Helpers here open an app, wait for its pod runtime and tour, and turn
 * a missing app into a failure that names the lane that owns it, never a skip.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, type Page } from "@playwright/test";
import { ORGS, POD_HOLDER } from "../../content/orgs.ts";
import {
  APP_SLUGS,
  type AppSlug,
  ORG_SLUGS,
  type OrgSlug,
  type PodOwner,
} from "../../packages/demo-kit/src/registry.ts";
import { appUrl } from "../../packages/demo-kit/src/urls.ts";

export type { AppSlug, OrgSlug, PodOwner };
export { APP_SLUGS, ORG_SLUGS, ORGS, POD_HOLDER };

export const REPO_ROOT = resolve(import.meta.dirname, "..", "..");
export const DIST = join(REPO_ROOT, "dist");

/** The loopback origin the config serves `dist/` on. */
export function siteOrigin(): string {
  const port = process.env.SITE_E2E_PORT;
  if (port === undefined || port === "") {
    throw new Error(
      "SITE_E2E_PORT is not set: run the suite through the root playwright.config.ts",
    );
  }
  return `http://127.0.0.1:${port}`;
}

/** Which build-plan lane delivers each app (build-plan.md §2), for failure messages. */
export const APP_LANE: Readonly<Record<AppSlug, string>> = Object.freeze({
  wallet: "A1",
  payroll: "A2",
  bank: "A2",
  bureau: "A2",
  lender: "A3",
  "lender-b": "A3",
  "lender-desk": "A4",
  aus: "A4",
  appraisal: "A5",
  title: "A5",
  county: "A5",
  insurer: "A6",
  servicer: "A6",
  welcome: "A7",
  state: "F2",
  registry: "F3",
  "business-lender": "F3",
  idv: "F4",
  "fintech-lender": "F4",
  payout: "F4",
  hospital: "F5",
  pharmacy: "F5",
  clinic: "F5",
  repairer: "F7",
  "card-issuer": "F8",
});

interface SiteJson {
  apps?: string[];
  agents?: string[];
  podServiceWorker?: boolean;
}

/** `dist/site.json`, written by tools/build-site.mjs. */
export function siteJson(): SiteJson {
  const file = join(DIST, "site.json");
  if (!existsSync(file)) {
    throw new Error("dist/site.json is missing: run `pnpm run build` before the acceptance suite");
  }
  return JSON.parse(readFileSync(file, "utf8")) as SiteJson;
}

/** Fail, naming the owning lane, unless every app in `slugs` was built into dist/. */
export function requireApps(slugs: readonly AppSlug[]): void {
  const built = new Set(siteJson().apps ?? []);
  const missing = slugs.filter((slug) => !built.has(slug));
  if (missing.length > 0) {
    const named = missing.map((slug) => `apps/${slug} (lane ${APP_LANE[slug]})`).join(", ");
    throw new Error(
      `not built into dist/ yet: ${named}. dist/site.json lists: ${[...built].join(", ") || "none"}`,
    );
  }
}

/** Fail unless the pod runtime's service worker (lane L1) was assembled into dist/. */
export function requirePodRuntime(): void {
  if (siteJson().podServiceWorker !== true) {
    throw new Error(
      "dist/pods-sw.js is missing: packages/pod-runtime (lane L1) has not been built into the site",
    );
  }
}

/** Root-relative URL of a page in an app (path mode, through demo-kit's appUrl). */
export function appPath(
  slug: AppSlug,
  path = "",
  params: Record<string, string | undefined> = {},
): string {
  return appUrl(slug, path, params, { kind: "path" });
}

/** The pod owner an app's requests act as (registry `actsAs`); the welcome app acts as no one. */
export function actsAs(slug: AppSlug | PodOwner): PodOwner | undefined {
  if (slug === "alex") return "alex";
  if (slug === "welcome") return undefined;
  return (ORGS as Record<string, { actsAs: PodOwner } | undefined>)[slug]?.actsAs;
}

/** The WebID the pod runtime gives an owner on this origin (design.md §d.2). */
export function webidOf(owner: PodOwner): string {
  return `${siteOrigin()}/pods/${owner}/profile/card#me`;
}

/** The owner a WebID on this origin belongs to, if it is one of the demo's pods. */
export function ownerOfWebid(webid: string): PodOwner | undefined {
  const match = /^\/pods\/([^/]+)\/profile\/card#me$/.exec(
    webid.startsWith(siteOrigin()) ? webid.slice(siteOrigin().length) : "",
  );
  return match?.[1] as PodOwner | undefined;
}

/** Holder's first name, as the copy uses it ("Alex"). */
export const HOLDER_FIRST_NAME = POD_HOLDER.name.split(" ")[0] ?? POD_HOLDER.name;

/** Retry a page evaluation across navigations (a destroyed context just means "try again"). */
export async function evaluateSoon<T, A = undefined>(
  page: Page,
  fn: (arg: A) => T | Promise<T>,
  arg?: A,
): Promise<T | undefined> {
  try {
    return await page.evaluate(fn as (arg: unknown) => T | Promise<T>, arg);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/context was destroyed|navigat|Target closed|frame was detached/i.test(message)) {
      return undefined;
    }
    throw error;
  }
}

/** Is the page controlled by the pod runtime's service worker? */
export async function isControlled(page: Page): Promise<boolean> {
  return (
    (await evaluateSoon(page, () => navigator.serviceWorker?.controller?.scriptURL ?? null)) ===
    `${siteOrigin()}/pods-sw.js`
  );
}

/**
 * Open a page of an app and wait until the pod runtime controls it. With `tour`, also wait for
 * the tour engine's `window.__demo` (design.md §d.6).
 */
export async function openApp(
  page: Page,
  slug: AppSlug,
  path = "",
  options: { params?: Record<string, string | undefined>; tour?: boolean; timeout?: number } = {},
): Promise<void> {
  requireApps([slug]);
  requirePodRuntime();
  const url = appPath(slug, path, options.params ?? {});
  const response = await page.goto(url);
  expect(response?.status(), `GET ${url}`).toBe(200);
  await waitForRuntime(page, {
    runtime: slug !== "welcome",
    timeout: options.timeout,
    tour: options.tour ?? false,
  });
}

/**
 * Wait for the pod runtime (and optionally the tour) on whatever page is loaded now. The
 * welcome app is not an organisation app, so by default only organisation pages must be
 * controlled by the pod runtime.
 */
export async function waitForRuntime(
  page: Page,
  options: { tour?: boolean; timeout?: number; runtime?: boolean } = {},
): Promise<void> {
  const timeout = options.timeout ?? 30_000;
  const onWelcome = new URL(page.url()).pathname.startsWith("/welcome/");
  if (options.runtime ?? !onWelcome) {
    await expect
      .poll(() => isControlled(page), {
        message: `the pod runtime service worker never controlled ${page.url()} (does the app call configure() and ready()?)`,
        timeout,
      })
      .toBe(true);
  }
  if (options.tour) {
    await expect
      .poll(() => evaluateSoon(page, () => typeof window.__demo?.state === "function"), {
        message: `window.__demo (tour mountDemo) never appeared on ${page.url()}`,
        timeout,
      })
      .toBe(true);
  }
}

declare global {
  interface Window {
    __demo?: {
      goto(stepId: string): Promise<void>;
      act(): Promise<string>;
      lens(view: string): void;
      present(on: boolean): Promise<void>;
      totals(): unknown;
      state(): { step?: string; done: string[]; mode: string } | undefined;
    };
  }
}
