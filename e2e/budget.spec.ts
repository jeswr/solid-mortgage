// AUTHORED-BY Claude Opus 5.5
/**
 * Acceptance test 15 (build-plan.md §4): the first load of any app is under 400 kB compressed,
 * not counting the wasm; and the wasm is fetched once and then cached.
 *
 * The local server (tools/serve-dist.mjs) does not compress, so each response body is gzipped
 * here (zlib default level, as a typical CDN would) and summed. The wasm ships inside
 * `/pods-sw.js` (packages/pod-runtime/README.md), so that script and any `.wasm` file are the
 * excluded "wasm", together with the organisations' agent bundles (`/agents/`), which the pod
 * runtime's own worker (started from `/pods-sw.js`) loads to run the back offices beside the
 * wasm. Source maps are never loaded by a visitor and are excluded too.
 *
 * An app's first load is measured in a browser whose pods are already running: the visitor
 * arrives from another app of the tour, as every step after the first does. Starting the pods
 * for the first time (installing the service worker and writing the seed) happens once per
 * browser, like the wasm download; its size is attached to the report, not budgeted.
 */
import { gzipSync } from "node:zlib";
import { type BrowserContext, expect, type Page, type Response, test } from "@playwright/test";
import { MEDICATION_PAGES } from "../content/medication-handover/mount.ts";
import { isOk, isPodEntry, podLogSoon, podRelative, waitForSeed } from "./support/pod.ts";
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
/** What the pod runtime loads beside the wasm: its worker's agent bundles. */
const isRuntime = (url: URL) => isWasmCarrier(url) || url.pathname.startsWith("/agents/");

function collect(context: BrowserContext): { responses: Response[] } {
  const responses: Response[] = [];
  context.on("response", (response) => {
    if (!response.fromServiceWorker()) responses.push(response);
  });
  return { responses };
}

/**
 * Start the pods from another app, as an earlier tour step would, and let it settle: the seed
 * written, not just the worker in control. A page that finds the pods unseeded builds the seed
 * itself (pod-runtime `ready()`), loading the SHACL validator, which is not the next app's
 * first load.
 *
 * An app whose every page belongs to the medication handover is reached only from an earlier
 * step of that demo, whose first page brings Rosa's pod to the morning of the discharge
 * (content/medication-handover/prepare.ts, once per browser, like the seed; any of the demo's
 * pages that reads Rosa's pod runs it). So it is started from such a page of another app of that
 * demo, and measured once the preparation has landed: both access requests in Rosa's inbox, its
 * last part.
 */
async function startPodsElsewhere(page: Page, slug: AppSlug): Promise<void> {
  const medicationOnly = MEDICATION_PAGES[slug] === "";
  // A page of the demo that reads Rosa's pod as it loads, which prepares it.
  const [other, path]: [AppSlug, string] = medicationOnly
    ? slug === "pharmacy"
      ? ["hospital", "discharge"]
      : ["pharmacy", ""]
    : [slug === "payroll" ? "bank" : "payroll", ""];
  requireApps([other]);
  await page.goto(appPath(other, path));
  await waitForRuntime(page, { tour: false });
  await waitForSeed(page);
  if (medicationOnly) {
    await expect
      .poll(
        async () =>
          (await podLogSoon(page)).filter(
            (e) =>
              isPodEntry(e) &&
              e.pod === "rosa" &&
              e.kind === "write" &&
              isOk(e.status) &&
              /^\/inbox\/[^/]+$/.test(podRelative(e.path, e.pod)),
          ).length,
        {
          message: `the medication handover never prepared Rosa's pod from /${other}/`,
          timeout: 60_000,
        },
      )
      .toBeGreaterThanOrEqual(2);
  }
  await page.waitForLoadState("networkidle");
}

async function gzipTotal(responses: readonly Response[], skip: (url: URL) => boolean) {
  const rows: string[] = [];
  let total = 0;
  for (const response of responses) {
    const url = new URL(response.url());
    if (url.origin !== siteOrigin() || url.pathname.endsWith(".map") || skip(url)) continue;
    if (url.pathname.startsWith("/pods/")) continue; // pod data, answered in the browser
    const body = await response.body().catch(() => Buffer.alloc(0));
    const size = gzipSync(body).length;
    total += size;
    rows.push(`${size}\t${response.status()}\t${url.pathname}`);
  }
  return { rows, total };
}

for (const slug of APP_SLUGS) {
  test(`15 Budget: first load of ${slug} is under 400 kB compressed, wasm excluded`, async ({
    browser,
  }) => {
    requireApps([slug]);
    const context = await browser.newContext({ baseURL: `${siteOrigin()}/` });
    const { responses } = collect(context);
    const page = await context.newPage();
    await startPodsElsewhere(page, slug);
    const firstStart = await gzipTotal(responses.splice(0), () => false);
    await page.goto(appPath(slug));
    await waitForRuntime(page, { tour: false });
    await page.waitForLoadState("networkidle");
    const { rows, total } = await gzipTotal(responses, isRuntime);
    await context.close();
    await test.info().attach("pods-first-start.tsv", {
      body: `${firstStart.rows.join("\n")}\n${firstStart.total}\ttotal (once per browser, wasm included)`,
      contentType: "text/tab-separated-values",
    });
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
    // Chrome reports a copy revalidated from its cache (a 304 on the wire) as 200; the raw headers
    // tell them apart: only a response that carries a body is framed by a length or chunking.
    const raw = (await response.headersArray()).map((header) => header.name.toLowerCase());
    const carriesBody = raw.includes("content-length") || raw.includes("transfer-encoding");
    if (response.status() === 200 && carriesBody)
      transfers.set(url.pathname, (transfers.get(url.pathname) ?? 0) + 1);
  }
  await context.close();
  expect(transfers.size, "the wasm (pods-sw.js or a .wasm file) was fetched").toBeGreaterThan(0);
  for (const [path, count] of transfers) {
    expect(count, `${path} downloaded in full across ${apps.join(", ")}`).toBe(1);
  }
});
