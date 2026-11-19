#!/usr/bin/env node
// AUTHORED-BY Claude Opus 5.5
/**
 * Build every site app and assemble the static site in `dist/` (design.md §d.8):
 *
 *   dist/<slug>/      each app's Vite build (an app is a directory under apps/ with a
 *                     vite.config.ts; apps/vocab is a separate Vercel project and is skipped)
 *   dist/pods-sw.js   the pod runtime's service worker, from packages/pod-runtime/dist/
 *   dist/agents/      one bundle per app that has src/agent.ts (organisation back offices)
 *   dist/zk-crs/      the BN254 CRS the in-browser prover loads (packages/vc-kit/crs/), so
 *                     no proof ever fetches it from another origin
 *   dist/video/       recorded demo videos, from video/dist/ when present
 *   dist/site.json    what was assembled, for tests
 *
 * After assembling, what every app's index.html loads up front is held to a gzip budget (build-plan.md
 * acceptance test 15): see {@link checkEntryBudgets}. A build that breaks the budget fails.
 *
 * Usage: node tools/build-site.mjs [--skip-build]   (--skip-build reuses existing app builds)
 *        node tools/build-site.mjs --check-budget   (only checks the budget of the existing dist/)
 */
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { SITE_SLUGS } from "./site-routes.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");
const BIN = join(ROOT, "node_modules", ".bin");

/** Site apps: apps/<slug> directories with a Vite config, in a stable order. */
export function siteApps(root = ROOT) {
  const appsDir = join(root, "apps");
  return readdirSync(appsDir, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && existsSync(join(appsDir, entry.name, "vite.config.ts")),
    )
    .map((entry) => {
      const dir = join(appsDir, entry.name);
      const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
      return { dir, name: manifest.name, slug: entry.name };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

const run = (command, args, options = {}) =>
  execFileSync(command, args, {
    cwd: ROOT,
    env: { ...process.env, PATH: `${BIN}:${process.env.PATH ?? ""}` },
    stdio: "inherit",
    ...options,
  });

/** Fail if an app's index.html loads anything from outside its own `/<slug>/` base. */
function checkBase(app, html) {
  for (const match of html.matchAll(/(?:src|href)="(\/[^"]*)"/g)) {
    const url = match[1];
    if (!url.startsWith(`/${app.slug}/`)) {
      throw new Error(
        `apps/${app.slug}/dist/index.html references ${url}: set base: "/${app.slug}/" in its vite.config.ts`,
      );
    }
  }
}

// --- The entry-chunk budget ------------------------------------------------------------------------

/**
 * Most gzip bytes an app's index.html may load before anything is lazy-loaded (build-plan.md
 * acceptance test 15: "first load of any app under 400 kB compressed excluding the wasm").
 */
export const ENTRY_GZIP_BUDGET = 400_000;

/**
 * What `dist/<slug>/index.html` loads up front: every `<script src>`, `<link rel="modulepreload">`
 * and `<link rel="stylesheet">` it names under `/<slug>/`, plus every chunk that JavaScript imports
 * statically (`import ... from "./x.js"`, `export ... from "./x.js"`). A dynamic `import("./x.js")`
 * is lazy and is not counted, nor are the fonts and images a stylesheet asks for. Returns absolute
 * paths, the entry first.
 */
export function entryAssets(siteDir, slug) {
  const appDir = join(siteDir, slug);
  const html = readFileSync(join(appDir, "index.html"), "utf8");
  const queue = [];
  for (const tag of html.matchAll(/<(script|link)\b[^>]*>/g)) {
    const attrs = tag[0];
    const rel = attrs.match(/\srel="([^"]+)"/)?.[1];
    const url =
      tag[1] === "script"
        ? attrs.match(/\ssrc="([^"]+)"/)?.[1]
        : rel === "modulepreload" || rel === "stylesheet"
          ? attrs.match(/\shref="([^"]+)"/)?.[1]
          : undefined;
    if (url === undefined || !url.startsWith(`/${slug}/`) || !/\.(?:js|css)$/.test(url)) continue;
    queue.push(join(appDir, url.slice(slug.length + 2)));
  }
  const seen = new Set();
  while (queue.length > 0) {
    const file = queue.shift();
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    if (!file.endsWith(".js")) continue;
    const code = readFileSync(file, "utf8");
    for (const match of code.matchAll(
      /\b(?:import|export)\s*(?:[\w$*{}\s,]*?\bfrom\s*)?["'](\.{1,2}\/[^"']+\.js)["']/g,
    )) {
      queue.push(resolve(dirname(file), match[1]));
    }
  }
  return [...seen];
}

/**
 * Measure every app in `siteDir` (each directory with an index.html) against `budget`: the summed
 * gzip size of its {@link entryAssets}. Returns one row per app; `over` lists the apps that break it.
 */
export function checkEntryBudgets(siteDir = DIST, budget = ENTRY_GZIP_BUDGET) {
  const rows = readdirSync(siteDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(siteDir, entry.name, "index.html")))
    .map((entry) => {
      const files = entryAssets(siteDir, entry.name);
      const gzip = files.reduce((sum, file) => sum + gzipSync(readFileSync(file)).length, 0);
      return { files: files.length, gzip, slug: entry.name };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
  return { budget, over: rows.filter((row) => row.gzip > budget), rows };
}

/** Print every app's first load and throw if any is over budget. */
function enforceEntryBudgets({ budget, over, rows }) {
  const kB = (bytes) => `${(bytes / 1000).toFixed(1)} kB`;
  for (const row of rows) {
    console.log(
      `build-site: ${row.slug.padEnd(14)} first load ${kB(row.gzip).padStart(9)} gzip (${row.files} file(s))`,
    );
  }
  if (over.length > 0) {
    throw new Error(
      `first load over the ${kB(budget)} gzip budget: ${over
        .map((row) => `${row.slug} ${kB(row.gzip)}`)
        .join(", ")}. Load heavy code with a dynamic import() at the point of use.`,
    );
  }
}

async function bundleAgents(apps) {
  const withAgents = apps.filter((app) => existsSync(join(app.dir, "src", "agent.ts")));
  if (withAgents.length === 0) return [];
  const { build } = await import("vite");
  for (const app of withAgents) {
    await build({
      build: {
        emptyOutDir: false,
        lib: {
          entry: join(app.dir, "src", "agent.ts"),
          fileName: () => `${app.slug}.js`,
          formats: ["es"],
        },
        outDir: join(DIST, "agents"),
        sourcemap: true,
      },
      // The app's own config supplies resolve.alias (the vc-kit browser stand-ins for the Node
      // modules @jeswr/solid-vc imports); the inline lib build above takes precedence.
      configFile: existsSync(join(app.dir, "vite.config.ts"))
        ? join(app.dir, "vite.config.ts")
        : false,
      publicDir: false,
      logLevel: "warn",
      root: app.dir,
    });
  }
  return withAgents.map((app) => app.slug);
}

async function main() {
  if (process.argv.includes("--check-budget")) {
    enforceEntryBudgets(checkEntryBudgets());
    return;
  }
  const skipBuild = process.argv.includes("--skip-build");
  const apps = siteApps();
  if (apps.length === 0) throw new Error("no site apps found under apps/");
  for (const app of apps) {
    if (!SITE_SLUGS.includes(app.slug)) {
      throw new Error(
        `apps/${app.slug} is not a site slug; add it to APP_SLUGS (demo-kit) and regenerate vercel.json`,
      );
    }
  }
  if (!skipBuild) {
    run("turbo", [
      "run",
      "build",
      "--concurrency=4",
      ...apps.map((app) => `--filter=${app.name}...`),
    ]);
  }

  rmSync(DIST, { force: true, recursive: true });
  mkdirSync(DIST, { recursive: true });
  for (const app of apps) {
    const built = join(app.dir, "dist");
    const index = join(built, "index.html");
    if (!existsSync(index))
      throw new Error(`apps/${app.slug} has no dist/index.html after its build`);
    checkBase(app, readFileSync(index, "utf8"));
    cpSync(built, join(DIST, app.slug), { recursive: true });
  }

  const serviceWorker = join(ROOT, "packages", "pod-runtime", "dist", "pods-sw.js");
  const hasServiceWorker = existsSync(serviceWorker);
  if (hasServiceWorker) {
    cpSync(serviceWorker, join(DIST, "pods-sw.js"));
    if (existsSync(`${serviceWorker}.map`))
      cpSync(`${serviceWorker}.map`, join(DIST, "pods-sw.js.map"));
  } else {
    console.warn(
      "build-site: packages/pod-runtime/dist/pods-sw.js not found; dist/ has no pod service worker yet",
    );
  }

  const agents = await bundleAgents(apps);

  // The prover's CRS, served by the site itself (packages/vc-kit/src/zk/crs.ts).
  cpSync(join(ROOT, "packages", "vc-kit", "crs"), join(DIST, "zk-crs"), { recursive: true });

  const video = join(ROOT, "video", "dist");
  const hasVideo = existsSync(video);
  if (hasVideo) cpSync(video, join(DIST, "video"), { recursive: true });

  const budgets = checkEntryBudgets();
  const site = {
    agents,
    apps: apps.map((app) => app.slug),
    firstLoadGzip: Object.fromEntries(budgets.rows.map((row) => [row.slug, row.gzip])),
    podServiceWorker: hasServiceWorker,
    video: hasVideo,
  };
  writeFileSync(join(DIST, "site.json"), `${JSON.stringify(site, null, 2)}\n`);
  enforceEntryBudgets(budgets);
  console.log(
    `build-site: dist/ assembled with ${site.apps.length} app(s): ${site.apps.join(", ")}`,
  );
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`build-site: ${error.message}`);
    process.exit(1);
  });
}
