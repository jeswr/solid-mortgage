// AUTHORED-BY Claude Opus 5.5
/**
 * The site stays on its own origin: a Playwright guard for the prove steps. Kept apart from
 * e2e.ts so a suite can use it without loading Vite and axe into its test process.
 *
 * Import with a relative path from an app's `e2e/` folder: `../../../test-support/origin-guard.ts`.
 */
import type { BrowserContext } from "@playwright/test";

/** Aztec's CRS hosts, bb.js's own download: the site serves its pinned CRS instead (vc-kit zk/crs.ts). */
export const CRS_CDN_HOSTS: readonly string[] = ["crs.aztec-cdn.foundation", "crs.aztec-labs.com"];

/**
 * What {@link keepToOrigin} saw: every request that tried to leave (aborted), those of them to
 * Aztec's CRS hosts, and the site's own CRS files the pages loaded.
 */
export interface OriginGuard {
  readonly outside: string[];
  readonly cdn: string[];
  readonly crs: string[];
}

/**
 * Abort, and record, every request from `context` (its pages and their workers) to anywhere but
 * `origin`, Aztec's CRS hosts among them. Install it before the first page loads; a test then
 * asserts `outside` is empty to show nothing left the site.
 */
export async function keepToOrigin(context: BrowserContext, origin: string): Promise<OriginGuard> {
  const guard: OriginGuard = { cdn: [], crs: [], outside: [] };
  context.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin === origin && url.pathname.startsWith("/crs/")) guard.crs.push(url.pathname);
  });
  await context.route(
    (url) => url.origin !== origin && /^(https?|wss?):$/.test(url.protocol),
    (route) => {
      const url = route.request().url();
      guard.outside.push(url);
      if (CRS_CDN_HOSTS.includes(new URL(url).hostname)) guard.cdn.push(url);
      return route.abort("blockedbyclient");
    },
  );
  return guard;
}
