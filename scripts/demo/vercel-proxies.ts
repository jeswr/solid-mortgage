/**
 * Generate the Vercel PROXY projects that put the hosted demo server behind the public
 * `*.vercel.app` links: one project per app origin (plus the pod), each a single
 * `vercel.json` rewriting every path to that app's port on the demo server.
 *
 *   node scripts/demo/vercel-proxies.ts http://<server-host>   # writes .deploy/vercel/*
 *
 * Then deploy each directory to its project (see docs/deploy.md, "Hosted guided tour").
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const backend = process.argv[2]?.replace(/\/+$/, "");
if (backend === undefined || !/^https?:\/\/[^/]+$/.test(backend)) {
  console.error("usage: node scripts/demo/vercel-proxies.ts http://<server-host>");
  process.exit(1);
}

const origins = JSON.parse(
  readFileSync(resolve(root, "deploy/hosted/origins.json"), "utf8"),
) as Record<string, string>;
/** The demo server's port per app key (start.ts: overview 4400, zones in order, pod 4408). */
const PORTS: Record<string, number> = {
  tour: 4400,
  "/wallet": 4401,
  "/verifications": 4402,
  "/lender-boa": 4403,
  "/lender-53": 4404,
  "/gse": 4405,
  "/property": 4406,
  "/closing": 4407,
  pod: 4408,
};

for (const [key, origin] of Object.entries(origins)) {
  const port = PORTS[key];
  if (port === undefined) throw new Error(`no port for ${key}`);
  const project = new URL(origin).hostname.replace(/\.vercel\.app$/, "");
  const dir = resolve(root, ".deploy/vercel", project);
  mkdirSync(dir, { recursive: true });
  const config = {
    $schema: "https://openapi.vercel.sh/vercel.json",
    framework: null,
    buildCommand: null,
    installCommand: null,
    outputDirectory: null,
    rewrites: [
      // `/:path*` does not match the bare root, so it gets its own rule.
      { source: "/", destination: `${backend}:${port}/` },
      // …and neither does a trailing slash (Solid containers end in "/").
      { source: "/:path*/", destination: `${backend}:${port}/:path*/` },
      { source: "/:path*", destination: `${backend}:${port}/:path*` },
    ],
  };
  writeFileSync(resolve(dir, "vercel.json"), `${JSON.stringify(config, null, 2)}\n`);
  // No static files: Vercel serves a matching file before it applies rewrites.
  console.log(`${project.padEnd(32)} → ${backend}:${port}`);
}
