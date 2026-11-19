// AUTHORED-BY Claude Opus 5.5
/**
 * Playwright steps every app's e2e suite shares. Pod requests run inside the page, so the REAL
 * service-worker pods answer them and the pod server checks access for the agent the request
 * names (path mode's `x-demo-agent`). Nothing is mocked.
 *
 * Import with a relative path from an app's `e2e/` folder: `../../../test-support/e2e.ts`.
 */
import { mkdirSync, readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { type BrowserContext, expect, type Page } from "@playwright/test";
import { build } from "vite";

// ---------------------------------------------------------------------------------------------
// Accessibility and layout.

/** WCAG 2.0 A and AA plus 2.1 AA: what most app suites check. */
export const WCAG_AA: readonly string[] = ["wcag2a", "wcag2aa", "wcag21aa"];
/** The same plus WCAG 2.1 A. */
export const WCAG_A_AA: readonly string[] = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

export interface AxeOptions {
  /** axe tags; default {@link WCAG_AA}. */
  readonly tags?: readonly string[];
  /** Selectors axe skips, e.g. the Lens dock, which its own package tests. */
  readonly exclude?: readonly string[];
}

/** WCAG 2.1 A and AA, the Lens included. */
export const WCAG_21: AxeOptions = { tags: WCAG_A_AA };

/** Skip the Solid Lens dock (`packages/lens` runs axe on it). */
export const OUTSIDE_LENS: AxeOptions = { exclude: ["solid-lens"] };

/** axe finds no violation. A failure names each rule and the elements it flagged. */
export async function expectAccessible(page: Page, options: AxeOptions = {}): Promise<void> {
  let builder = new AxeBuilder({ page }).withTags([...(options.tags ?? WCAG_AA)]);
  for (const selector of options.exclude ?? []) builder = builder.exclude(selector);
  const results = await builder.analyze();
  expect(
    results.violations.map(
      (violation) =>
        `${violation.id}: ${violation.help} (${violation.nodes.map((node) => node.target).join(" ")})`,
    ),
  ).toEqual([]);
}

/** No horizontal page scroll at the page's current width; on failure, names what sticks out. */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const report = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll("body *")]
      .filter((element) => element.getBoundingClientRect().right > width + 1)
      .slice(0, 5)
      .map((element) => `${element.tagName.toLowerCase()}.${element.className}`);
    return { overflow: document.documentElement.scrollWidth - width, wide };
  });
  expect(report.overflow, `${page.url()} overflows: ${report.wide.join(", ")}`).toBeLessThanOrEqual(
    0,
  );
}

/** No horizontal scroll at a phone width (390 px by default), then the old size again. */
export async function expectNoSideScroll(page: Page, width = 390): Promise<void> {
  const size = page.viewportSize();
  await page.setViewportSize({ height: 844, width });
  await expectNoHorizontalScroll(page);
  if (size !== null) await page.setViewportSize(size);
}

/** The trust banner, the fictional line and noindex: on every route, including not-found. */
export async function expectTrustSurfaces(page: Page): Promise<void> {
  await expect(page.locator("[data-demo-trust]")).toBeVisible();
  await expect(page.locator("[data-demo-fictional]")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
}

// ---------------------------------------------------------------------------------------------
// The pods in the page.

/** Open `path` and wait until the pod service worker controls the page. */
export async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, undefined, {
    timeout: 60_000,
  });
}

/** `path` with the tour switched off (`tour=off`), for free-play checks. */
export const tourOff = (path: string): string => `${path}${path.includes("?") ? "&" : "?"}tour=off`;

/** Open `path` with the tour off and wait until the app's "Connecting" status has gone. */
export async function openReady(page: Page, path: string): Promise<void> {
  await page.goto(tourOff(path));
  await expect(page.getByRole("status").filter({ hasText: "Connecting" })).toHaveCount(0, {
    timeout: 60_000,
  });
}

export interface PodAnswer {
  status: number;
  body: string;
  location: string | null;
}

/**
 * A request to `/pods/<path>` from inside the page, as `agent` (an app slug, sent as
 * `x-demo-agent`) or anonymously with `null`. GET by default.
 */
export function podRequest(
  page: Page,
  agent: string | null,
  path: string,
  init: { method?: string; body?: string; contentType?: string } = {},
): Promise<PodAnswer> {
  return page.evaluate(
    async ({ agent, path, init }) => {
      const headers: Record<string, string> = { accept: "text/turtle" };
      if (agent !== null) headers["x-demo-agent"] = agent;
      if (init.contentType) headers["content-type"] = init.contentType;
      const response = await fetch(`/pods/${path}`, {
        body: init.body,
        credentials: "omit",
        headers,
        method: init.method ?? "GET",
      });
      return {
        body: await response.text(),
        location: response.headers.get("location"),
        status: response.status,
      };
    },
    { agent, init, path },
  );
}

/** GET a pod resource as `agent` (or anonymously with `null`) from inside the page. */
export async function readAs(
  page: Page,
  agent: string | null,
  path: string,
): Promise<{ status: number; body: string }> {
  const { body, status } = await podRequest(page, agent, path);
  return { body, status };
}

interface Wire {
  status: number;
  headers: [string, string][];
  body: string;
}

/**
 * A `fetch` that runs each request inside `page` as `agent` (`x-demo-agent`), so the page's pod
 * service worker answers it. For journey functions run from the test side.
 */
export function fetchAs(page: Page, agent: string): typeof fetch {
  return async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? "GET").toUpperCase();
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((value, name) => {
      headers[name] = value;
    });
    headers["x-demo-agent"] = agent;
    const body = init?.body === undefined || init.body === null ? undefined : String(init.body);
    const wire = await page.evaluate(
      async (request): Promise<Wire> => {
        const response = await fetch(request.url, {
          body: request.body,
          headers: request.headers,
          method: request.method,
        });
        return {
          body: await response.text(),
          headers: [...response.headers],
          status: response.status,
        };
      },
      { body, headers, method, url },
    );
    const empty = wire.status === 204 || wire.status === 304 || method === "HEAD";
    return new Response(empty ? null : wire.body, { headers: wire.headers, status: wire.status });
  };
}

// ---------------------------------------------------------------------------------------------
// Free play and tour buttons.

/** Free play: restart the demo and run the earlier steps, then wait until that has finished. */
export async function catchUp(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Restart and run the earlier steps" }).click();
  await expect(page.getByRole("heading", { name: "Catching up" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Catching up" })).toHaveCount(0, {
    timeout: 200_000,
  });
  // A failed run leaves the panel with an alert.
  await expect(page.locator(".catch-up [role=alert]")).toHaveCount(0);
}

/** Clicks a tour target and waits for its action bar to report; fails with the bar's message. */
export async function press(page: Page, target: string): Promise<string> {
  const button = page.locator(`[data-tour="${target}"]`);
  await expect(button).toHaveCount(1);
  await expect(button).toBeEnabled({ timeout: 60_000 });
  await button.click();
  const status = page.locator(".action-bar").filter({ has: button }).getByRole("status");
  await expect(status).toBeVisible({ timeout: 180_000 });
  const text = (await status.textContent()) ?? "";
  expect(await status.getAttribute("class"), text).toContain("action-ok");
  return text;
}

// ---------------------------------------------------------------------------------------------
// Test-only harnesses: code that plays other apps' journey beats in the page.

/**
 * Bundle a harness entry into one ES module in `outDir` (`harness.js`). Keep `outDir` outside
 * the repository: the bundle inlines the data model, and tools/check-insignia.mjs scans every
 * file under apps/<app>. `alias` is the app's `mortgageAliases()`.
 */
export async function buildHarness(options: {
  entry: string;
  outDir: string;
  alias: Record<string, string>;
}): Promise<void> {
  mkdirSync(options.outDir, { recursive: true });
  await build({
    build: {
      emptyOutDir: true,
      lib: { entry: options.entry, fileName: () => "harness.js", formats: ["es"] },
      outDir: options.outDir,
      rolldownOptions: { output: { codeSplitting: false } },
    },
    configFile: false,
    logLevel: "warn",
    publicDir: false,
    resolve: { alias: options.alias },
  });
}

/** Put a bundled harness (`<dir>/harness.js`) in the page; it sets `window.__harness`. */
export async function injectHarness(page: Page, dir: string): Promise<void> {
  const content = readFileSync(`${dir}/harness.js`, "utf8");
  await page.addScriptTag({ content, type: "module" });
  await page.waitForFunction(() => (window as { __harness?: unknown }).__harness !== undefined);
}

/**
 * Open the harness page served at `/e2e-harness/` (test-support/e2e-server.mjs) in this
 * context; its pods are the ones the app pages see.
 */
export async function openHarness(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  page.on("pageerror", (error) => console.error(`harness: ${error.message}`));
  await page.goto("/e2e-harness/");
  await expect(page.locator("#harness-state")).toHaveText("ready", { timeout: 90_000 });
  return page;
}

interface HarnessWindow {
  harness: {
    run(...names: string[]): Promise<void>;
    read(owner: string, path: string, reader?: string): Promise<{ status: number; body: string }>;
  };
}

/** Play journey beats that belong to other apps, on the harness page. */
export async function beats(harness: Page, ...names: string[]): Promise<void> {
  await harness.evaluate(
    (list) => (window as unknown as HarnessWindow).harness.run(...list),
    names,
  );
}

/** GET a pod resource as its owner (or as `reader`), on the harness page. */
export function read(
  harness: Page,
  owner: string,
  path: string,
  reader?: string,
): Promise<{ status: number; body: string }> {
  return harness.evaluate(
    ([o, p, r]) => (window as unknown as HarnessWindow).harness.read(o as string, p as string, r),
    [owner, path, reader] as const,
  );
}

/** Every journey beat before Juniper's first step: credentials shared, access approved, applied. */
export const UP_TO_APPLICATION: readonly string[] = [
  "welcome",
  "share-employment",
  "share-assets",
  "share-credit-summary",
  "approve-application-access",
  "submit-application",
];
