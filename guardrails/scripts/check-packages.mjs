#!/usr/bin/env node
/**
 * Deterministic dependency guardrail ported from jeswr/solid-sdk.
 *
 * Policy mode is offline. Full mode also verifies registry existence and that a package's first
 * publication predates the configured minimum age.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const LOCAL_SPEC = /^(file:|link:|workspace:|portal:|github:|git:|git\+|[\w.-]+\/[\w.-]+(#.+)?$)/;

function parseArgs(argv) {
  const options = {
    names: [],
    mode: "full",
    ecosystem: "npm",
    strict: false,
    scans: [],
    workspace: false,
    policy: resolve(HERE, "..", "package-policy.json"),
    minAgeDays: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--mode") options.mode = argv[++index];
    else if (argument === "--ecosystem") options.ecosystem = argv[++index];
    else if (argument === "--scan") options.scans.push(argv[++index]);
    else if (argument === "--workspace") options.workspace = true;
    else if (argument === "--policy") options.policy = argv[++index];
    else if (argument === "--min-age-days") options.minAgeDays = Number(argv[++index]);
    else if (argument === "--strict") options.strict = true;
    else if (argument?.startsWith("--")) {
      console.error(`unknown flag: ${argument}`);
      process.exit(2);
    } else if (argument) options.names.push(argument);
  }
  return options;
}

function loadPolicy(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`could not read policy ${file}: ${error.message}`);
    process.exit(2);
  }
}

function resolveNpmAlias(name, spec) {
  if (typeof spec !== "string" || !spec.startsWith("npm:")) return name;
  const target = spec.slice("npm:".length);
  const separator = target.lastIndexOf("@");
  return separator > 0 ? target.slice(0, separator) : target;
}

function inferGitPackageName(spec) {
  if (typeof spec !== "string") return null;
  let pathname;
  if (spec.startsWith("github:")) {
    pathname = spec.slice("github:".length).split("#")[0];
  } else if (/^[\w.-]+\/[\w.-]+(#.+)?$/.test(spec)) {
    pathname = spec.split("#")[0];
  } else if (/^git(\+|:)/.test(spec)) {
    try {
      pathname = new URL(spec.replace(/^git\+/, "")).pathname;
    } catch {
      return null;
    }
  } else {
    return null;
  }
  return (
    pathname
      .split("/")
      .filter(Boolean)
      .at(-1)
      ?.replace(/\.git$/, "") ?? null
  );
}

function dependenciesFromPackageJson(file) {
  const manifest = JSON.parse(readFileSync(file, "utf8"));
  const groups = [
    manifest.dependencies,
    manifest.devDependencies,
    manifest.peerDependencies,
    manifest.optionalDependencies,
  ];
  const dependencies = [];
  for (const group of groups) {
    for (const [name, spec] of Object.entries(group ?? {})) {
      const resolved = resolveNpmAlias(name, spec);
      dependencies.push({
        name: resolved,
        registry: resolved !== name || typeof spec !== "string" || !LOCAL_SPEC.test(spec),
      });
      const inferredGitName = inferGitPackageName(spec);
      if (inferredGitName && inferredGitName !== resolved) {
        dependencies.push({ name: inferredGitName, registry: false });
      }
    }
  }
  return dependencies;
}

function workspaceManifests() {
  const manifests = [join(REPO_ROOT, "package.json")];
  for (const workspaceDirectory of ["apps", "packages"]) {
    const absoluteDirectory = join(REPO_ROOT, workspaceDirectory);
    if (!existsSync(absoluteDirectory)) continue;
    for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifest = join(absoluteDirectory, entry.name, "package.json");
      if (existsSync(manifest)) manifests.push(manifest);
    }
  }
  return manifests;
}

async function registryInfo(ecosystem, name) {
  if (ecosystem === "npm") {
    const response = await fetch(`https://registry.npmjs.org/${name.replace("/", "%2F")}`, {
      headers: { accept: "application/json" },
    });
    if (response.status === 404) return { exists: false, createdMs: null };
    if (!response.ok) throw new Error(`npm registry ${response.status}`);
    const metadata = await response.json();
    return {
      exists: true,
      createdMs: metadata?.time?.created ? Date.parse(metadata.time.created) : null,
    };
  }
  if (ecosystem === "pypi") {
    const response = await fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`, {
      headers: { accept: "application/json" },
    });
    if (response.status === 404) return { exists: false, createdMs: null };
    if (!response.ok) throw new Error(`pypi ${response.status}`);
    const metadata = await response.json();
    let earliest = null;
    for (const files of Object.values(metadata.releases ?? {})) {
      for (const file of files) {
        const timestamp = Date.parse(file.upload_time_iso_8601 ?? file.upload_time ?? "");
        if (!Number.isNaN(timestamp) && (earliest === null || timestamp < earliest)) {
          earliest = timestamp;
        }
      }
    }
    return { exists: true, createdMs: earliest };
  }
  throw new Error(`unsupported ecosystem: ${ecosystem}`);
}

const options = parseArgs(process.argv.slice(2));
if (!new Set(["policy", "full"]).has(options.mode)) {
  console.error(`unsupported mode: ${options.mode}`);
  process.exit(2);
}

const policy = loadPolicy(options.policy);
if (options.workspace) options.scans.push(...workspaceManifests());
const ecosystem = options.scans.some((file) => file?.endsWith("package.json"))
  ? "npm"
  : options.ecosystem;
const minimumAge = options.minAgeDays ?? policy.minAgeDays ?? 0;
const ecosystemPolicy = policy[ecosystem] ?? { deny: [], allow: [] };
const deny = new Set(ecosystemPolicy.deny ?? []);
const allow = new Set(ecosystemPolicy.allow ?? []);
const allowlistMode = policy.mode === "allowlist";

const dependencies = new Map(options.names.map((name) => [name, true]));
for (const manifest of options.scans) {
  for (const dependency of dependenciesFromPackageJson(manifest)) {
    dependencies.set(
      dependency.name,
      dependency.registry || dependencies.get(dependency.name) === true,
    );
  }
}
if (dependencies.size === 0) {
  console.error("no package names given (pass names or --scan)");
  process.exit(2);
}

const violations = [];
const warnings = [];
for (const [name, registryInstall] of dependencies) {
  if (deny.has(name)) {
    violations.push(`${name}: on DENYLIST (${ecosystem})`);
    continue;
  }
  if (allowlistMode && !allow.has(name)) {
    violations.push(`${name}: not on ALLOWLIST (${ecosystem}, allowlist mode)`);
    continue;
  }
  if (options.mode === "policy") {
    console.log(`ok(policy)   ${name}`);
    continue;
  }
  if (!registryInstall) {
    console.log(`ok(policy)   ${name}  (non-registry install)`);
    continue;
  }

  try {
    const { exists, createdMs } = await registryInfo(ecosystem, name);
    if (!exists) {
      violations.push(`${name}: DOES NOT EXIST in ${ecosystem} - possible hallucination/slopsquat`);
      continue;
    }
    if (createdMs === null) {
      warnings.push(`${name}: exists but publish date is unknown - cannot age-check`);
      continue;
    }
    const ageDays = Math.floor((Date.now() - createdMs) / 86_400_000);
    if (ageDays < minimumAge) {
      violations.push(`${name}: TOO NEW - first published ${ageDays}d ago (< ${minimumAge}d)`);
      continue;
    }
    console.log(`ok           ${name}  (age ${ageDays}d)`);
  } catch (error) {
    const message = `${name}: registry check failed (${error.message})`;
    if (options.strict) violations.push(`${message} [--strict]`);
    else warnings.push(`${message} - passing (use --strict to fail)`);
  }
}

for (const warning of warnings) console.warn(`WARN  ${warning}`);
if (violations.length > 0) {
  console.error(`\nFAIL  ${violations.length} package policy violation(s):`);
  for (const violation of violations) console.error(`  x ${violation}`);
  process.exit(1);
}
console.log(
  `\nPASS  ${dependencies.size} package(s) cleared (${options.mode} mode, ${ecosystem}).`,
);
