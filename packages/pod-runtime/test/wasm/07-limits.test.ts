// AUTHORED-BY Claude Opus 5.5
/** Body size limit and the module-wide linear-memory ceiling. */
import {
  lwsMemoryCeilingBytes,
  lwsMemoryLiveBytes,
  lwsSetMemoryCeilingBytes,
} from "@sparq-org/solid-server/wasm";
import { afterEach, beforeAll, describe, expect, test } from "vitest";
import { BASE, doc, initWasm, newPod, OWNER, req, TURTLE } from "./helpers.js";

beforeAll(initWasm);
const OCTET = { "content-type": "application/octet-stream" };
const MiB = 1024 * 1024;

describe("body limit", () => {
  test("the wasm router itself enforces exactly 2 MiB: 2,097,152 bytes is 201, one more is 413", async () => {
    const pod = newPod();
    expect(
      (await req(pod, "PUT", "/ok", { headers: OCTET, body: new Uint8Array(2 * MiB), as: OWNER }))
        .status,
    ).toBe(201);
    const over = await req(pod, "PUT", "/over", {
      headers: OCTET,
      body: new Uint8Array(2 * MiB + 1),
      as: OWNER,
    });
    expect(over.status).toBe(413);
    expect(over.text).toMatch(/length limit exceeded/);
  });

  test("an oversized body is still copied into wasm memory before the 413 (host should pre-check to avoid the copy)", async () => {
    const pod = newPod();
    const res = await req(pod, "PUT", "/huge", {
      headers: OCTET,
      body: new Uint8Array(64 * MiB),
      as: OWNER,
    });
    expect(res.status).toBe(413);
  });

  test("the limit applies to RDF too (a ~3.4 MB Turtle body is 413)", async () => {
    const pod = newPod();
    const big = Array.from(
      { length: 40_000 },
      (_, i) => `<#s${i}> <http://example.org/p> "${"x".repeat(60)}" .`,
    ).join("\n");
    expect((await req(pod, "PUT", "/big", { headers: TURTLE, body: big, as: OWNER })).status).toBe(
      413,
    );
  });
});

describe("memory ceiling", () => {
  let original = 0;
  beforeAll(() => {
    original = lwsMemoryCeilingBytes();
  });
  afterEach(() => lwsSetMemoryCeilingBytes(original));

  test("default ceiling is 3 GiB and is module-wide (shared by every pod in the realm)", () => {
    expect(original).toBe(3 * 1024 * MiB);
  });

  test("over the ceiling, requests answer 507 instead of trapping - on ANY pod, even small reads", async () => {
    const a = newPod();
    const b = newPod(
      "https://pods.example/pods/bank/",
      "https://pods.example/pods/bank/profile/card#me",
    );
    await req(b, "PUT", "/x", {
      headers: TURTLE,
      body: doc("https://pods.example/pods/bank/x"),
      as: "https://pods.example/pods/bank/profile/card#me",
    });
    lwsSetMemoryCeilingBytes(lwsMemoryLiveBytes() + 256 * 1024);
    expect(
      (await req(a, "PUT", "/m", { headers: OCTET, body: new Uint8Array(1.5 * MiB), as: OWNER }))
        .status,
    ).toBe(507);
    expect(
      (await req(b, "GET", "/x", { as: "https://pods.example/pods/bank/profile/card#me" })).status,
    ).toBe(507);
    lwsSetMemoryCeilingBytes(0);
    expect(
      (await req(a, "PUT", "/m", { headers: OCTET, body: new Uint8Array(1.5 * MiB), as: OWNER }))
        .status,
    ).toBe(201);
  });

  test("a negative ceiling is rejected", () => {
    expect(() => lwsSetMemoryCeilingBytes(-1)).toThrow(/non-negative/);
  });
});

test("doc helper sanity", () => {
  expect(doc(`${BASE}x`)).toContain("example.org/Thing");
});
