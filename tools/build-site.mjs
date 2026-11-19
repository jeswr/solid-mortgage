#!/usr/bin/env node
// AUTHORED-BY Claude Opus 5.5
/**
 * Build every site app and assemble the static site in `dist/` (design.md §d.8):
 *
 *   dist/<slug>/      each app's Vite build (an app is a directory under apps/ with a
 *                     vite.config.ts; apps/vocab is a separate Vercel project and is skipped)
 *   dist/pods-sw.js   the pod runtime's service worker, from packages/pod-runtime/dist/
 *   dist/agents/      one bundle per app that has src/agent.ts (organisation back offices)
 *   dist/video/       recorded demo videos, from video/dist/ when present
 *   dist/site.json    what was assembled, for tests
 *
 * Usage: node tools/build-site.mjs [--skip-build]   (--skip-build reuses existing app builds)
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
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
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
      configFile: false,
      publicDir: false,
      logLevel: "warn",
      root: app.dir,
    });
  }
  return withAgents.map((app) => app.slug);
}

async function main() {
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

  const video = join(ROOT, "video", "dist");
  const hasVideo = existsSync(video);
  if (hasVideo) cpSync(video, join(DIST, "video"), { recursive: true });

  const site = {
    agents,
    apps: apps.map((app) => app.slug),
    podServiceWorker: hasServiceWorker,
    video: hasVideo,
  };
  writeFileSync(join(DIST, "site.json"), `${JSON.stringify(site, null, 2)}\n`);
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
