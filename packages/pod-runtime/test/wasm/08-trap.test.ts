// AUTHORED-BY Claude Opus 5.5
/**
 * How a wasm trap surfaces. Each scenario runs in a child process (fixtures/trap-child.mjs):
 * a trap poisons the whole JS realm's wasm module, and Vitest would count the uncaught error.
 *
 * Trigger: a JSON-LD body with ~1000 nested objects (~16 KB) overflows the Rust stack
 * ("memory access out of bounds"). Turtle, N3 Patch and SPARQL Update nesting to 100k did not trap.
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const child = fileURLToPath(new URL("../fixtures/trap-child.mjs", import.meta.url));
function run(...args: string[]): Record<string, unknown> {
  const out = execFileSync(process.execPath, [child, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return JSON.parse(out.trim().split("\n").at(-1) ?? "{}");
}
const TRAP = "RuntimeError: memory access out of bounds";

describe("trap trigger", () => {
  test("JSON-LD nesting 900 is fine; 1000 traps", () => {
    expect(run("depth", "900").status).toBe(201);
    const r = run("depth", "1000");
    expect(r.status).toBe("never-settled");
    expect(r.uncaught).toEqual(
      expect.arrayContaining([{ name: "RuntimeError", message: "memory access out of bounds" }]),
    );
  });
});

describe("how the trap surfaces and its blast radius", () => {
  const r = run("blast");

  test("CONTRADICTS d.2 / old host: the trapping handleRequest promise NEVER settles; the RuntimeError is thrown as an uncaught exception (from the microtask polling the future), so `catch (isWasmTrap)` never runs", () => {
    expect(r.trapRequest).toBe("never-settled");
    expect((r.uncaughtAfterTrap as unknown[]).length).toBeGreaterThan(0);
  });

  test("CONTRADICTS d.2: the whole module is poisoned - the same pod, every OTHER pod in the realm and even a NEW SolidServer fail", () => {
    expect(r.samePodAfter).toBe(TRAP);
    expect(r.otherPodAfter).toBe(TRAP);
    expect(r.newPodAfter).toBe(TRAP);
  });

  test("snapshot() is impossible after the trap, and calling init() again returns the cached poisoned module", () => {
    expect(r.snapshotAfter).toBe(TRAP);
    expect(r.reinitSameGlue).toBe(TRAP);
  });

  test("recovery works with a FRESH module instance (glue loaded again under a new URL) restored from a snapshot taken BEFORE the trap", () => {
    expect(r.freshModuleRestoredGet).toBe(200);
  });
});

describe("who can trigger it", () => {
  const r = run("append-agent");

  test("WAC runs before body parsing: unauthorised (403) and anonymous (401) writers cannot trap the pod", () => {
    expect(r.unauthorisedPut).toBe(403);
    expect(r.anonymousPut).toBe(401);
    expect(r.uncaughtBeforeAppend).toBe(0);
  });

  test("an Append-only agent POSTing to an inbox CAN trap the pod (and with it every pod in the realm)", () => {
    expect(r.appendPost).toBe("never-settled");
  });
});

test("calling handleRequest on a freed SolidServer also never settles (uncaught 'null pointer passed to rust'), but does not poison the module", () => {
  const r = run("use-after-free");
  expect(r.afterFree).toBe("never-settled");
  expect(r.uncaught).toEqual([{ name: "Error", message: "null pointer passed to rust" }]);
  expect(r.otherPodStillWorks).toBe(200);
});
