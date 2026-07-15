import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const guard = join(repoRoot, "guardrails", "scripts", "check-packages.mjs");

let temporaryDirectories = [];
afterEach(() => {
  for (const directory of temporaryDirectories) rmSync(directory, { recursive: true, force: true });
  temporaryDirectories = [];
});

function scan(manifest) {
  const directory = mkdtempSync(join(tmpdir(), "package-guard-test-"));
  temporaryDirectories.push(directory);
  const fixture = join(directory, "package.json");
  writeFileSync(fixture, JSON.stringify(manifest));
  return spawnSync(process.execPath, [guard, "--mode", "policy", "--scan", fixture], {
    encoding: "utf8",
  });
}

describe("check-packages policy mode", () => {
  it("scans the workspace manifests", () => {
    const result = spawnSync(process.execPath, [guard, "--mode", "policy", "--workspace"], {
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/@playwright\/test/);
  });

  it("passes registry, workspace, and GitHub dependencies", () => {
    const result = scan({
      dependencies: { vitest: "^4.0.0", "@jeswr/solid-dpop": "workspace:*" },
      devDependencies: { "@jeswr/fetch-rdf": "github:jeswr/fetch-rdf#abc1234" },
    });
    expect(result.status).toBe(0);
  });

  it("checks optional dependencies", () => {
    const result = scan({ optionalDependencies: { request: "^2.88.0" } });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toMatch(/request/);
  });

  it("checks the target of an npm alias", () => {
    const result = scan({ dependencies: { "safe-looking-name": "npm:request@^2.88.0" } });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toMatch(/request/);
  });

  it("resolves scoped npm aliases", () => {
    expect(scan({ dependencies: { formatter: "npm:@biomejs/biome@^2.0.0" } }).status).toBe(0);
  });
});
