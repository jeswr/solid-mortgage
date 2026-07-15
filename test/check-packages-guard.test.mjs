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

function scan(manifest, policy) {
  const directory = mkdtempSync(join(tmpdir(), "package-guard-test-"));
  temporaryDirectories.push(directory);
  const fixture = join(directory, "package.json");
  writeFileSync(fixture, JSON.stringify(manifest));
  const args = [guard, "--mode", "policy", "--scan", fixture];
  if (policy) {
    const policyFixture = join(directory, "package-policy.json");
    writeFileSync(policyFixture, JSON.stringify(policy));
    args.push("--policy", policyFixture);
  }
  return spawnSync(process.execPath, args, {
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

  it("passes registry and local workspace dependencies", () => {
    const result = scan({
      dependencies: { vitest: "^4.0.0", "@jeswr/solid-dpop": "workspace:*" },
    });
    expect(result.status).toBe(0);
  });

  it("allows an exact remote Git source approved in policy", () => {
    const spec = "github:jeswr/fetch-rdf#abc1234";
    const result = scan(
      { dependencies: { "@jeswr/fetch-rdf": spec } },
      {
        mode: "denylist",
        npm: { deny: ["request"], allow: [], remoteGitAllow: [spec] },
      },
    );
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

  it("applies policy checks to non-registry dependency specs", () => {
    const result = scan({ dependencies: { request: "github:example/request#abc1234" } });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toMatch(/request/);
  });

  it("rejects an unapproved Git repository hidden behind a manifest alias", () => {
    const result = scan({
      dependencies: { "safe-looking-name": "github:example/request#abc1234" },
    });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toMatch(/request/);
  });

  it("rejects an unapproved SCP-style SSH Git spec", () => {
    const result = scan({
      dependencies: {
        "safe-looking-name": "git+ssh://git@github.com:example/request.git#abc1234",
      },
    });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toMatch(/request/);
  });

  it.each(["gitlab:example/request#abc1234", "bitbucket:example/request#abc1234"])(
    "rejects an unapproved hosted Git spec: %s",
    (spec) => {
      expect(scan({ dependencies: { "safe-looking-name": spec } }).status).toBe(1);
    },
  );

  it("rejects an unapproved HTTPS Git or tarball source", () => {
    const result = scan({
      dependencies: { "safe-looking-name": "https://example.com/request.tgz" },
    });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toMatch(/not explicitly allowed/);
  });

  it("matches remote URL schemes case-insensitively", () => {
    const result = scan({
      dependencies: { "safe-looking-name": "HTTPS://example.com/request.tgz" },
    });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toMatch(/not explicitly allowed/);
  });

  it("treats git+file dependencies as local sources", () => {
    expect(
      scan({ dependencies: { "safe-local-package": "git+file:../safe-local-package" } }).status,
    ).toBe(0);
  });

  it("resolves scoped npm aliases", () => {
    expect(scan({ dependencies: { formatter: "npm:@biomejs/biome@^2.0.0" } }).status).toBe(0);
  });
});
