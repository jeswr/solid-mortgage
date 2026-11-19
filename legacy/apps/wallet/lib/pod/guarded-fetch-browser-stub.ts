/**
 * Browser-bundle stand-in for `@jeswr/guarded-fetch/node` (aliased in
 * `next.config.ts`). The node entry is the SERVER-side DNS-pinning SSRF
 * guard; it can never run in a browser (node:dns / undici). The wallet's
 * client code always injects pod-served `webIdFetch`/`statusFetch` seams into
 * vc-kit, so solid-vc's lazy default-guarded-fetch import is unreachable —
 * this stub exists to satisfy the bundler, and FAILS CLOSED if something ever
 * does reach it (never a silent unguarded fetch).
 */
export function createNodeGuardedFetch(): typeof fetch {
  return () =>
    Promise.reject(
      new Error(
        "@jeswr/guarded-fetch/node is server-only; inject an explicit fetch seam " +
          "(webIdFetch/statusFetch) instead of relying on the default guarded fetch",
      ),
    );
}
