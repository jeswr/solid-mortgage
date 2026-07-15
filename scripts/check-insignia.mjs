#!/usr/bin/env node
/**
 * R2 bright-line insignia guard (decision 0002 addendum; docs/research/regn-optics.md §5).
 *
 * Greps rendered-source directories (apps/<app>/app, packages/ui/src) for regulatory
 * insignia and product marks that must never render on any demo surface. There is no
 * allowlist and no inline-suppression mechanism: these are bright lines, some binding on
 * any person regardless of commerce (12 U.S.C. § 1828(a)(4)).
 *
 * Usage: node scripts/check-insignia.mjs [dir ...]   (defaults to the rendered-source dirs)
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(HERE, "..");

export const BANNED_PATTERNS = [
  {
    id: "fdic-mark",
    pattern: /\bFDIC\b|\bfederal\s+deposit\s+insurance\b/i,
    reason: "FDIC marks / deposit-insurance claims bind ANY person (12 U.S.C. § 1828(a)(4))",
  },
  {
    id: "equal-housing",
    pattern: /\bequal\s+housing\s+(?:lender|opportunity)\b/i,
    reason: "Equal Housing Lender/Opportunity insignia are credentials of covered entities",
  },
  {
    id: "agency-seal",
    pattern: /\b(?:HUD|FHA|VA|Ginnie\s*Mae)\s+(?:seal|logo|mark|insignia|badge)s?\b/i,
    reason: "HUD/FHA/VA/agency seals may never be rendered",
  },
  {
    id: "nmls",
    pattern: /\bNMLS\b/i,
    reason: "NMLS IDs / licensee credentials (real or invented) may never be rendered",
  },
  {
    id: "gse-product-mark",
    pattern: /\bloan\s+product\s+advisor\b/i,
    reason: "Freddie Mac product identifiers require written consent (R3) — say 'AUS'",
  },
  {
    id: "gse-product-abbreviation",
    pattern: /\bLPA\b/,
    reason: "Standalone GSE product abbreviation on an app surface (R3) — say 'AUS'",
  },
];

const SCANNED_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mdx",
  ".mjs",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const SKIPPED_DIRECTORIES = new Set([".next", ".turbo", "dist", "node_modules"]);

/** apps/<app>/app + packages/ui/src — the directories whose contents reach a rendered page. */
export function defaultTargetDirectories(repoRoot = REPO_ROOT) {
  const targets = [];
  const appsRoot = join(repoRoot, "apps");
  for (const entry of readdirSync(appsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const appDirectory = join(appsRoot, entry.name, "app");
    if (safeIsDirectory(appDirectory)) targets.push(appDirectory);
  }
  targets.push(join(repoRoot, "packages", "ui", "src"));
  return targets;
}

function safeIsDirectory(path) {
  try {
    readdirSync(path);
    return true;
  } catch {
    return false;
  }
}

function* walkFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* walkFiles(path);
    else if (entry.isFile()) yield path;
  }
}

function fileExtension(path) {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot).toLowerCase();
}

/** Scan directories; returns findings [{ file, line, id, reason, excerpt }]. */
export function scanInsignia(directories) {
  const findings = [];
  for (const directory of directories) {
    for (const file of walkFiles(directory)) {
      if (!SCANNED_EXTENSIONS.has(fileExtension(file))) continue;
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      for (let index = 0; index < lines.length; index += 1) {
        const text = lines[index];
        for (const { id, pattern, reason } of BANNED_PATTERNS) {
          if (!pattern.test(text)) continue;
          findings.push({
            excerpt: text.trim().slice(0, 120),
            file: relative(REPO_ROOT, file),
            id,
            line: index + 1,
            reason,
          });
        }
      }
    }
  }
  return findings;
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
