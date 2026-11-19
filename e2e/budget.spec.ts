// AUTHORED-BY Claude Opus 5.5
/**
 * Acceptance test 15 (build-plan.md §4): the first load of any app is under 400 kB compressed,
 * not counting the wasm; and the wasm is fetched once and then cached.
 *
 * The local server (tools/serve-dist.mjs) does not compress, so each response body is gzipped
 * here (zlib default level, as a typical CDN would) and summed. The wasm ships inside
 * `/pods-sw.js` (packages/pod-runtime/README.md), so that script and any `.wasm` file are the
 * excluded "wasm"; source maps are never loaded by a visitor and are excluded too.
 */
import { gzipSync } from "node:zlib";
import { type BrowserContext, expect, type Response, test } from "@playwright/test";
import {
  APP_SLUGS,
  type AppSlug,
  appPath,
  requireApps,
  siteOrigin,
  waitForRuntime,
} from "./support/site.ts";

const BUDGET_BYTES = 400 * 1000;

const isWasmCarrier = (url: URL) =>
  url.pathname === "/pods-sw.js" || url.pathname.endsWith(".wasm");

function collect(context: BrowserContext): { responses: Response[] } {
  const responses: Response[] = [];
  context.on("response", (response) => {
    if (!response.fromServiceWorker()) responses.push(response);
  });
  return { responses };
}

for (const slug of APP_SLUGS) {
  test(`15 Budget: first load of ${slug} is under 400 kB compressed, wasm excluded`, async ({
    browser,
  }) => {
    requireApps([slug]);
    const context = await browser.newContext({ baseURL: `${siteOrigin()}/` });
    const { responses } = collect(context);
    const page = await context.newPage();
    await page.goto(appPath(slug));
    await waitForRuntime(page, { tour: false });
    await page.waitForLoadState("networkidle");
    const rows: string[] = [];
    let total = 0;
    for (const response of responses) {
      const url = new URL(response.url());
      if (url.origin !== siteOrigin() || isWasmCarrier(url) || url.pathname.endsWith(".map"))
        continue;
      if (url.pathname.startsWith("/pods/")) continue; // pod data, answered in the browser
      const body = await response.body().catch(() => Buffer.alloc(0));
      const size = gzipSync(body).length;
      total += size;
      rows.push(`${size}\t${response.status()}\t${url.pathname}`);
    }
    await context.close();
    await test.info().attach(`first-load-${slug}.tsv`, {
      body: `${rows.join("\n")}\n${total}\ttotal`,
      contentType: "text/tab-separated-values",
    });
    expect(total, `gzipped first load of /${slug}/ in bytes`).toBeLessThan(BUDGET_BYTES);
  });
}

test("15 Budget: the wasm is fetched once and cached across apps", async ({ browser }) => {
  const apps: AppSlug[] = ["wallet", "lender", "bank"];
  requireApps(apps);
  const context = await browser.newContext({ baseURL: `${siteOrigin()}/` });
  const { responses } = collect(context);
  const page = await context.newPage();
  for (const slug of apps) {
    await page.goto(appPath(slug));
    await waitForRuntime(page, { tour: false });
    await page.waitForLoadState("networkidle");
  }
  const transfers = new Map<string, number>();
  for (const response of responses) {
    const url = new URL(response.url());
    if (url.origin !== siteOrigin() || !isWasmCarrier(url)) continue;
    if (response.status() === 200)
      transfers.set(url.pathname, (transfers.get(url.pathname) ?? 0) + 1);
  }
  await context.close();
  expect(transfers.size, "the wasm (pods-sw.js or a .wasm file) was fetched").toBeGreaterThan(0);
  for (const [path, count] of transfers) {
    expect(count, `${path} downloaded in full across ${apps.join(", ")}`).toBe(1);
  }
});
