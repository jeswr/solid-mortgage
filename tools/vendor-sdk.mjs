#!/usr/bin/env node
// AUTHORED-BY Claude Opus 5.5
// Refresh vendor/ from a jeswr/solid-sdk checkout: build the SDK packages this repo uses that are
// not on npm, pack each one as a tarball (pnpm rewrites workspace: versions), and record the
// source commit in vendor/SOURCE. Re-runnable; same pattern as idea-sandbox/scripts/vendor-sdk.mjs.
//
// Usage: node tools/vendor-sdk.mjs <path-to-solid-sdk>
// The checkout needs its dependencies (`pnpm install --frozen-lockfile --filter
// "@jeswr/solid-showcase-kit..."` is enough). Afterwards run `pnpm install`, then `pnpm run gate`.
import { execFileSync } from "node:child_process";
import { readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

/** solid-sdk package directories, dependencies first. */
export const SDK_PACKAGES = ["app-shell", "solid-showcase-kit"];

const sdk = process.argv[2];
if (!sdk) {
  console.error("usage: node tools/vendor-sdk.mjs <path-to-solid-sdk>");
  process.exit(1);
}
const root = resolve(import.meta.dirname, "..");
const vendor = join(root, "vendor");
const sdkRoot = resolve(sdk);
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: "inherit" });

run("pnpm", ["--filter", "@jeswr/solid-showcase-kit...", "run", "build"], sdkRoot);
for (const file of readdirSync(vendor)) if (file.endsWith(".tgz")) rmSync(join(vendor, file));
for (const name of SDK_PACKAGES) {
  run("pnpm", ["pack", "--pack-destination", vendor], join(sdkRoot, "packages", name));
}
const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: sdkRoot, encoding: "utf8" }).trim();
const dirty = execFileSync(
  "git",
  ["status", "--porcelain", "--", ...SDK_PACKAGES.map((p) => `packages/${p}`)],
  {
    cwd: sdkRoot,
    encoding: "utf8",
  },
).trim();
writeFileSync(
  join(vendor, "SOURCE"),
  `jeswr/solid-sdk ${sha}${dirty ? " (with local changes)" : ""}\n`,
);
console.log(`vendor/ now matches jeswr/solid-sdk ${sha}. Run pnpm install, then pnpm run gate.`);
