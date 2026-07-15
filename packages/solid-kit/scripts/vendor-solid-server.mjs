#!/usr/bin/env node
/**
 * Vendor `@jeswr/solid-server` (sparq's WASM Solid server Node host) from a sparq source
 * checkout into `packages/solid-kit/vendor/` as a packed tarball (sm-4).
 *
 * This is the stopgap until the package's npm bootstrap publish (sm-50) and the upstream
 * exports/dispatcher refactor (sparq-org/sparq#2323, sm-69): npm cannot install a
 * subdirectory of a git repo, so the only reproducible consumption path today is
 * build-from-checkout + `npm pack` (docs/research/lws-survey.md §3).
 *
 * What it does:
 *   1. Preflight: cargo + wasm-pack >= 0.14 (0.13.x forwards `--profile` to cargo alongside
 *      its own `--release`, and `build:lws-wasm` fails), a clean-ish sparq checkout.
 *   2. `npm --workspace @jeswr/solid-server run build:lws-wasm` in the checkout (the FULL
 *      build: `sparql-endpoint` feature on, per the sparq README).
 *   3. Runs the package's own `check:package` guardrail, then `npm pack --ignore-scripts`
 *      (the build already ran; `prepack` would rebuild the wasm a second time).
 *   4. Verifies the exports patch in `vendor/patches/` still applies to the packed
 *      `package.json` (the patch itself is applied at install time by pnpm
 *      `patchedDependencies` — see pnpm-workspace.yaml).
 *   5. Copies the tarball into `vendor/` and writes `vendor/PROVENANCE.md` (sparq sha,
 *      toolchain versions, tarball sha256).
 *
 * Usage:
 *   node scripts/vendor-solid-server.mjs --checkout /path/to/sparq
 *   SPARQ_CHECKOUT=/path/to/sparq node scripts/vendor-solid-server.mjs
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KIT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VENDOR_DIR = join(KIT_ROOT, "vendor");
const PATCH_FILE = join(VENDOR_DIR, "patches", "@jeswr__solid-server.patch");
const TARBALL_COMMIT_CEILING_BYTES = 2 * 1024 * 1024; // commit tarball only when <= 2 MiB
const MINIMUM_WASM_PACK = [0, 14, 0];

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}

function fail(message) {
  console.error(`vendor-solid-server: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = { checkout: process.env.SPARQ_CHECKOUT };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--checkout") options.checkout = argv[++index];
    else fail(`unknown argument: ${argv[index]}`);
  }
  if (!options.checkout) {
    fail("pass --checkout <sparq-checkout-dir> (or set SPARQ_CHECKOUT)");
  }
  return { checkout: resolve(options.checkout) };
}

function preflight(checkout) {
  for (const tool of ["cargo", "git", "npm"]) {
    try {
      run(tool, ["--version"]);
    } catch {
      fail(`${tool} is required on PATH`);
    }
  }
  let wasmPackVersion;
  try {
    wasmPackVersion = run("wasm-pack", ["--version"]).trim().split(/\s+/).at(-1) ?? "";
  } catch {
    fail("wasm-pack is required on PATH (cargo install wasm-pack --locked)");
  }
  const parts = wasmPackVersion.split(".").map(Number);
  const [major = 0, minor = 0] = parts;
  const [needMajor, needMinor] = MINIMUM_WASM_PACK;
  if (major < needMajor || (major === needMajor && minor < needMinor)) {
    fail(
      `wasm-pack ${wasmPackVersion} is too old: build:lws-wasm needs >= ${MINIMUM_WASM_PACK.join(".")} ` +
        "(older wasm-pack forwards `--profile release-wasm` to cargo alongside its own `--release`, " +
        "and cargo rejects the pair)",
    );
  }
  const packageDir = join(checkout, "packages", "solid-server");
  try {
    statSync(join(packageDir, "package.json"));
  } catch {
    fail(`${packageDir} does not look like a sparq checkout (missing packages/solid-server)`);
  }
  return { packageDir, wasmPackVersion };
}

function checkoutState(checkout) {
  const sha = run("git", ["-C", checkout, "rev-parse", "HEAD"]).trim();
  // Build artifacts (crates/*/pkg, packages/solid-server/wasm, target/) are untracked; only
  // modifications to TRACKED files make the sha lie about what was built.
  const dirty = run("git", [
    "-C",
    checkout,
    "status",
    "--porcelain",
    "--untracked-files=no",
  ]).trim();
  if (dirty !== "") {
    fail(
      `sparq checkout has tracked modifications — refusing to vendor from an unclean tree:\n${dirty}`,
    );
  }
  return sha;
}

function buildAndPack(checkout, packageDir) {
  console.log("building @jeswr/solid-server (wasm-pack, full sparql-endpoint tier)…");
  run("npm", ["--workspace", "@jeswr/solid-server", "run", "build:lws-wasm"], {
    cwd: checkout,
    stdio: ["ignore", "inherit", "inherit"],
  });
  console.log("running the package's check:package guardrail…");
  run("node", ["guardrails/check-package.mjs"], {
    cwd: packageDir,
    stdio: ["ignore", "inherit", "inherit"],
  });
  const packDestination = mkdtempSync(join(tmpdir(), "solid-server-pack-"));
  // --ignore-scripts: prepack would run build:lws-wasm again; we just built + guarded above.
  const packJson = run(
    "npm",
    ["pack", "--json", "--ignore-scripts", "--pack-destination", packDestination],
    { cwd: packageDir },
  );
  const [packed] = JSON.parse(packJson);
  if (!packed?.filename) fail("npm pack reported no tarball");
  return { packDestination, tarball: join(packDestination, packed.filename), meta: packed };
}

/**
 * The exports patch (vendor/patches/) is applied at INSTALL time by pnpm patchedDependencies;
 * here we only prove it still applies to what we just packed, so re-vendoring against a newer
 * sparq sha fails loudly instead of producing an installable-but-unpatchable tarball.
 */
function verifyPatchApplies(tarball) {
  const extractDir = mkdtempSync(join(tmpdir(), "solid-server-verify-"));
  run("tar", ["-xzf", tarball, "-C", extractDir]);
  const packageRoot = join(extractDir, "package");
  try {
    run("git", ["apply", "--check", "--directory", "", PATCH_FILE], { cwd: packageRoot });
  } catch (error) {
    fail(
      `exports patch no longer applies to the packed package.json — regenerate ${PATCH_FILE} ` +
        `against the new upstream (${error.stderr ?? error.message})`,
    );
  } finally {
    rmSync(extractDir, { recursive: true, force: true });
  }
}

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function writeProvenance({ sha, tarballName, tarballBytes, tarballSha256, wasmPackVersion, meta }) {
  const cargoVersion = run("cargo", ["--version"]).trim();
  const nodeVersion = process.version;
  const provenance = `<!-- Generated by scripts/vendor-solid-server.mjs — do not edit by hand. -->

# Vendored @jeswr/solid-server — provenance

| Field | Value |
| --- | --- |
| Package | \`${meta.name}@${meta.version}\` |
| Tarball | \`${tarballName}\` (${tarballBytes} bytes, sha256 \`${tarballSha256}\`) |
| sparq source | <https://github.com/sparq-org/sparq> @ \`${sha}\` |
| Build command | \`npm --workspace @jeswr/solid-server run build:lws-wasm\` (full tier, \`sparql-endpoint\` on) then \`npm pack --ignore-scripts\` after the package's \`check:package\` guardrail |
| Toolchain | ${cargoVersion}; wasm-pack ${wasmPackVersion}; node ${nodeVersion} |
| Vendored | ${new Date().toISOString()} |

## Why vendored

\`@jeswr/solid-server\` has not had its npm bootstrap publish (sm-50, credential-gated on
Jesse), and npm cannot install a subdirectory of a git repo, so the tarball is built from a
sparq checkout and committed here (docs/research/lws-survey.md §3). Delete this directory and
switch \`packages/solid-kit/package.json\` to the registry version once sm-50 lands.

## Install-time patch

\`patches/@jeswr__solid-server.patch\` (wired via \`patchedDependencies\` in
\`pnpm-workspace.yaml\`) widens the package \`exports\` map to expose the wasm \`SolidServer\`
class and the \`src/http.js\` mapping helpers, which upstream currently hides behind the
\`"."\`-only exports map (docs/research/fastify-host.md §3 "the real blocker"). The upstream
fix is sparq-org/sparq#2323 (sm-69); the patch dies with it. \`scripts/vendor-solid-server.mjs\`
verifies the patch still applies whenever the tarball is re-vendored. The \`./http\` subpath
ships no type declarations upstream; consumers of the patched subpaths are plain ESM.

## Refresh

\`\`\`sh
node scripts/vendor-solid-server.mjs --checkout /path/to/sparq   # from packages/solid-kit
pnpm install                                                     # re-hash + re-patch
\`\`\`
`;
  writeFileSync(join(VENDOR_DIR, "PROVENANCE.md"), provenance);
}

const { checkout } = parseArgs(process.argv.slice(2));
const { packageDir, wasmPackVersion } = preflight(checkout);
const sha = checkoutState(checkout);
const { packDestination, tarball, meta } = buildAndPack(checkout, packageDir);
verifyPatchApplies(tarball);

mkdirSync(VENDOR_DIR, { recursive: true });
const tarballName = basename(tarball);
const destination = join(VENDOR_DIR, tarballName);
copyFileSync(tarball, destination);
rmSync(packDestination, { recursive: true, force: true });

const tarballBytes = statSync(destination).size;
const tarballSha256 = sha256(destination);
writeProvenance({ sha, tarballName, tarballBytes, tarballSha256, wasmPackVersion, meta });

console.log(`vendored ${tarballName} (${tarballBytes} bytes, sha256 ${tarballSha256})`);
console.log(`sparq sha ${sha}`);
if (tarballBytes > TARBALL_COMMIT_CEILING_BYTES) {
  console.log(
    `tarball exceeds ${TARBALL_COMMIT_CEILING_BYTES} bytes — gitignore it (vendor/.gitignore) instead of committing`,
  );
} else {
  console.log("tarball is within the 2 MiB commit ceiling — commit it for reproducibility");
}
