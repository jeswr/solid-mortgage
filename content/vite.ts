// AUTHORED-BY Claude Opus 5.5
/**
 * Vite settings every mortgage app shares. The pinned `@jeswr/solid-vc` build imports three Node
 * modules; `@mortgage/vc-kit` ships browser stand-ins for exactly the functions it calls. The
 * paths are resolved from this package, which depends on vc-kit, so an app does not need vc-kit
 * in its own manifest:
 *
 * ```ts
 * import { mortgageAliases } from "@mortgage/content/vite";
 * export default defineConfig({ resolve: { alias: mortgageAliases() } });
 * ```
 *
 * The `Buffer` stand-in is installed by `@mortgage/content/mortgage/browser` itself.
 */
import { fileURLToPath } from "node:url";

const STAND_INS = {
  "node:zlib": "@mortgage/vc-kit/browser/zlib",
  "node:crypto": "@mortgage/vc-kit/browser/crypto",
  "@jeswr/guarded-fetch/node": "@mortgage/vc-kit/browser/guarded-fetch",
} as const;

/** Absolute file paths of the browser stand-ins, keyed by the Node import they replace. */
export function mortgageAliases(): Record<keyof typeof STAND_INS, string> {
  const entries = Object.entries(STAND_INS).map(([from, to]) => [
    from,
    fileURLToPath(import.meta.resolve(to)),
  ]);
  return Object.fromEntries(entries) as Record<keyof typeof STAND_INS, string>;
}
