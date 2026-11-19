#!/usr/bin/env node
// AUTHORED-BY Claude Opus 5.5
/**
 * Bright-line insignia guard (design.md §b.2 rule 3; decision 0002 addendum;
 * docs/research/regn-optics.md §5). Scans everything that can reach a page: every app's source
 * tree, the shared packages that render, the content, and the built site in dist/ (acceptance
 * test 10). The roster is tools/insignia-roster.mjs: regulatory insignia, product marks and every
 * real organisation named in docs/. No allowlist and no inline suppression.
 *
 * The scanner is `scanInsigniaTree` from `@jeswr/solid-showcase-kit/testing` (path and content,
 * symlinks rejected).
 *
 * Usage: node tools/check-insignia.mjs [dir ...]   (defaults to the rendered-source dirs + dist/)
 */
import { existsSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { scanInsigniaTree } from "@jeswr/solid-showcase-kit/testing";
import { INSIGNIA_ROSTER } from "./insignia-roster.mjs";

export const REPO_ROOT = resolve(import.meta.dirname, "..");

/** Shared packages whose source reaches a rendered page. */
const RENDERED_PACKAGES = ["demo-kit", "lens", "tour", "pod-runtime"];

/** apps/<app> trees, rendering packages' src, content/, video/ and dist/ when present. */
export function defaultTargetDirectories(repoRoot = REPO_ROOT) {
  const targets = [];
  const appsRoot = join(repoRoot, "apps");
  for (const entry of readdirSync(appsRoot, { withFileTypes: true })) {
    if (entry.isDirectory()) targets.push(join(appsRoot, entry.name));
  }
  for (const name of RENDERED_PACKAGES) targets.push(join(repoRoot, "packages", name, "src"));
  for (const name of ["content", "video", "dist"]) targets.push(join(repoRoot, name));
  return targets.filter((directory) => existsSync(directory));
}

const bannedMarks = INSIGNIA_ROSTER.map(({ pattern, reason }) => ({ pattern, reason }));

/** Scan directories; findings carry the roster id (`fdic-mark`, `org-equifax`, …). */
export function scanInsignia(directories, rootDir = REPO_ROOT) {
  return scanInsigniaTree(directories, { bannedMarks, rootDir }).map((finding) => {
    const index = Number(finding.id.replace("banned-mark-", "")) - 1;
    return { ...finding, id: INSIGNIA_ROSTER[index]?.id ?? finding.id };
  });
}

function main() {
  const overrides = process.argv.slice(2).map((argument) => resolve(REPO_ROOT, argument));
  const directories = overrides.length > 0 ? overrides : defaultTargetDirectories();
  const findings = scanInsignia(directories);
  if (findings.length > 0) {
    console.error(`check-insignia: ${findings.length} banned rendering(s) found\n`);
    for (const finding of findings) {
      console.error(`  ${finding.file}:${finding.line} [${finding.id}] ${finding.excerpt}`);
      console.error(`    ${finding.reason}`);
    }
    process.exit(1);
  }
  const scope = directories.map((directory) => relative(REPO_ROOT, directory)).join(", ");
  console.log(`check-insignia: clean (${scope})`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
