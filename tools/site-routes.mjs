#!/usr/bin/env node
// AUTHORED-BY Claude Opus 5.5
/**
 * The site's routing rules in one place (design.md §d.8). `vercel.json` is generated from
 * `vercelConfig()` (`node tools/site-routes.mjs --write`; a test fails when the committed file
 * drifts), and `tools/serve-dist.mjs` applies the same rules locally for e2e runs.
 *
 * - Every app lives under `/<slug>/` with a single-page fallback to its own `index.html`.
 * - `/` redirects to the front door; `/<slug>` redirects to `/<slug>/`.
 * - `noindex` on everything; hashed assets cached for a year; `pods-sw.js` may control `/`.
 * - Cross-origin isolation only on `/wallet/prove` (multithreaded proving).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { APP_SLUGS } from "../packages/demo-kit/src/registry.ts";

export const ROOT = resolve(import.meta.dirname, "..");

/** Every URL segment the site serves an app under: the 14 demo apps plus the template. */
export const SITE_SLUGS = Object.freeze([...APP_SLUGS, "_template"]);

/** The front door. */
export const HOME_SLUG = "welcome";

/** Routes that get cross-origin isolation headers (SharedArrayBuffer for the prover). */
export const ISOLATED_PATHS = Object.freeze(["/wallet/prove"]);

const SLUG_ALTERNATION = SITE_SLUGS.join("|");

export const BASE_HEADERS = Object.freeze({
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
});

export const IMMUTABLE = "public, max-age=31536000, immutable";
export const NO_CACHE = "no-cache";

export const ISOLATION_HEADERS = Object.freeze({
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Opener-Policy": "same-origin",
});

const toVercelHeaders = (headers) =>
  Object.entries(headers).map(([key, value]) => ({ key, value }));

/** The committed `vercel.json`, as data. */
export function vercelConfig() {
  return {
    $schema: "https://openapi.vercel.sh/vercel.json",
    framework: null,
    installCommand: "pnpm install --frozen-lockfile",
    buildCommand: "pnpm run build",
    outputDirectory: "dist",
    ignoreCommand: "node tools/vercel-ignore.mjs",
    redirects: [
      { source: "/", destination: `/${HOME_SLUG}/`, permanent: false },
      { source: `/:app(${SLUG_ALTERNATION})`, destination: "/:app/", permanent: false },
    ],
    rewrites: [
      {
        source: `/:app(${SLUG_ALTERNATION})/:path((?!assets/).*)`,
        destination: "/:app/index.html",
      },
    ],
    headers: [
      { source: "/(.*)", headers: toVercelHeaders(BASE_HEADERS) },
      {
        source: "/pods-sw.js",
        headers: toVercelHeaders({ "Cache-Control": NO_CACHE, "Service-Worker-Allowed": "/" }),
      },
      { source: "/agents/(.*)", headers: toVercelHeaders({ "Cache-Control": NO_CACHE }) },
      {
        source: `/:app(${SLUG_ALTERNATION})/assets/(.*)`,
        headers: toVercelHeaders({ "Cache-Control": IMMUTABLE }),
      },
      ...ISOLATED_PATHS.flatMap((path) => [
        { source: path, headers: toVercelHeaders(ISOLATION_HEADERS) },
        { source: `${path}/(.*)`, headers: toVercelHeaders(ISOLATION_HEADERS) },
      ]),
    ],
  };
}

/**
 * How the site answers `pathname` (already URL-decoded, no query), mirroring `vercelConfig()`:
 * `{ redirect }`, or `{ file, fallback }` where `file` is relative to `dist/` and `fallback`
 * is true when it is an app's single-page fallback rather than the file asked for.
 * `exists(relativePath)` reports whether dist/ holds a file.
 */
export function resolveRequest(pathname, exists) {
  if (pathname === "/") return { redirect: `/${HOME_SLUG}/` };
  const segments = pathname.split("/");
  const slug = segments[1] ?? "";
  if (SITE_SLUGS.includes(slug) && segments.length === 2) return { redirect: `/${slug}/` };
  const direct = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  const relative = direct.replace(/^\/+/, "");
  if (exists(relative)) return { fallback: false, file: relative };
  if (SITE_SLUGS.includes(slug) && segments[2] !== "assets") {
    return { fallback: true, file: `${slug}/index.html` };
  }
  return { fallback: false, file: null };
}

/** Response headers for `pathname`, mirroring `vercelConfig().headers`. */
export function headersFor(pathname) {
  const headers = { ...BASE_HEADERS };
  if (pathname === "/pods-sw.js") {
    Object.assign(headers, { "Cache-Control": NO_CACHE, "Service-Worker-Allowed": "/" });
  }
  if (pathname.startsWith("/agents/")) headers["Cache-Control"] = NO_CACHE;
  const [, slug, second] = pathname.split("/");
  if (SITE_SLUGS.includes(slug) && second === "assets") headers["Cache-Control"] = IMMUTABLE;
  if (ISOLATED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    Object.assign(headers, ISOLATION_HEADERS);
  }
  return headers;
}

export const VERCEL_JSON = join(ROOT, "vercel.json");

export function renderVercelJson() {
  return `${JSON.stringify(vercelConfig(), null, 2)}\n`;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes("--write")) {
    writeFileSync(VERCEL_JSON, renderVercelJson());
    console.log("vercel.json written");
  } else if (readFileSync(VERCEL_JSON, "utf8") !== renderVercelJson()) {
    console.error("vercel.json is out of date: run node tools/site-routes.mjs --write");
    process.exit(1);
  } else {
    console.log("vercel.json matches tools/site-routes.mjs");
  }
}
