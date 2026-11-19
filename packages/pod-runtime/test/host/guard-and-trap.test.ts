// AUTHORED-BY Claude Opus 5.5
/** The trap trigger is refused before dispatch; a trap that does happen answers 503 and recovers. */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { checkBody, jsonDepth, turtleDepth } from "../../src/host/guard.js";
import { wasmLoader } from "../../src/host/wasm.js";
import { nodeWasmModule } from "../../src/node.js";
import { doc, makeHost, put, url } from "../helpers.js";

const bomb = (depth: number) =>
  `${'{"https://schema.org/about":'.repeat(depth)}1${"}".repeat(depth)}`;
const enc = (s: string) => new TextEncoder().encode(s);

describe("body guard (unit)", () => {
  test("depth counting ignores brackets inside strings, IRIs and comments", () => {
    expect(jsonDepth('{"a":"[[[[{{"}')).toBe(1);
    expect(jsonDepth('[{"a":[1,{"b":"\\"["}]}]')).toBe(4);
    expect(turtleDepth('<http://x/(> <p> "((([[[" . # ((((\n<s> <p> [ <q> ( 1 2 ) ] .')).toBe(2);
    expect(turtleDepth('<s> <p> """ { [ ( """ .')).toBe(0);
    expect(turtleDepth("INSERT DATA { <s> <p> 1 } WHERE { FILTER(?a < 3) }")).toBe(2);
  });

  test("checkBody: size, JSON-LD depth, Turtle-family depth; unknown media type gets both checks", () => {
    expect(checkBody(new Uint8Array(2 * 1024 * 1024 + 1), "application/octet-stream")?.status).toBe(
      413,
    );
    expect(checkBody(enc(bomb(65)), "application/ld+json")?.status).toBe(400);
    expect(checkBody(enc(bomb(64)), "application/ld+json")).toBeUndefined();
    expect(
      checkBody(enc(`<s> <p> ${"[ <p> ".repeat(65)}1${" ]".repeat(65)} .`), "text/turtle")?.status,
    ).toBe(400);
    expect(checkBody(enc(bomb(65)), null)?.status).toBe(400);
    expect(checkBody(enc(bomb(65)), "image/png")).toBeUndefined();
  });
});

describe("guard in the host", () => {
  test("the known trap trigger (JSON-LD nested 2000 deep, from an Append-only agent) is refused with 400 and the pods keep working", async () => {
    const host = makeHost();
    await host.ready;
    const res = await host.fetchAs("alex")(url("alex", "/inbox/"), {
      body: bomb(2000),
      headers: { "content-type": "application/ld+json" },
      method: "POST",
    });
    expect(res.status).toBe(400);
    expect((await host.info()).recoveries).toBe(0);
    expect((await host.fetchAs("alex")(url("alex", "/profile/card"))).status).toBe(200);
  });

  test("an oversized body is 413 from the host", async () => {
    const host = makeHost();
    await host.ready;
    const res = await host.fetchAs("alex")(url("alex", "/big"), {
      body: new Uint8Array(2 * 1024 * 1024 + 1),
      headers: { "content-type": "application/octet-stream" },
      method: "PUT",
    });
    expect(res.status).toBe(413);
  });
});

describe("trap recovery", () => {
  test("a trap that rejects (injected RuntimeError around the real wasm) answers 503; the module is replaced and state is intact", async () => {
    const real = wasmLoader(nodeWasmModule());
    let armed = false;
    const host = makeHost({
      loadWasm: () => {
        const glue = real();
        const Base = glue.SolidServer;
        const original = Base.prototype.handleRequest;
        Base.prototype.handleRequest = function (
          this: InstanceType<typeof Base>,
          ...args: Parameters<typeof original>
        ) {
          if (armed) {
            armed = false;
            return Promise.reject(new WebAssembly.RuntimeError("injected trap"));
          }
          return original.apply(this, args);
        };
        return glue;
      },
    });
    await host.ready;
    const alex = host.fetchAs("alex");
    await put(alex, url("alex", "/notes/n"), await doc(url("alex", "/notes/n")));
    armed = true;
    expect((await alex(url("alex", "/notes/n"))).status).toBe(503);
    expect((await host.info()).recoveries).toBe(1);
    expect((await alex(url("alex", "/notes/n"))).status).toBe(200);
  });

  const built = fileURLToPath(new URL("../../dist/node.js", import.meta.url));
  test.skipIf(!existsSync(built))(
    "a REAL trap (guard disabled) answers 503 instead of hanging; every pod comes back with its state (child process, built dist)",
    () => {
      const script = fileURLToPath(new URL("../fixtures/trap-host.mjs", import.meta.url));
      const out = execFileSync(process.execPath, [script, "unguarded"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const r = JSON.parse(out.trim().split("\n").at(-1) ?? "{}");
      expect(r).toMatchObject({
        after: 200,
        before: 201,
        bomb: 503,
        otherPodAfter: 200,
        otherPodBefore: 201,
        recoveries: 1,
        writeAfter: 201,
      });
      // Detected from the uncaught error, not the watchdog.
      expect(r.bombMs).toBeLessThan(5000);
    },
  );

  test.skipIf(!existsSync(built))(
    "with the guard on, the same body is a 400 and nothing traps (built dist)",
    () => {
      const script = fileURLToPath(new URL("../fixtures/trap-host.mjs", import.meta.url));
      const out = execFileSync(process.execPath, [script, "guarded"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      expect(JSON.parse(out.trim().split("\n").at(-1) ?? "{}")).toMatchObject({
        bomb: 400,
        recoveries: 0,
      });
    },
  );
});
