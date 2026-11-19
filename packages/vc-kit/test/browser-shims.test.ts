// AUTHORED-BY Claude Fable 5.2
/**
 * The browser stand-ins for the Node built-ins the pinned solid-vc imports,
 * checked against the Node originals: a worker that runs on the stand-ins
 * must produce and accept exactly what Node does.
 */

import { createHash as nodeCreateHash, randomBytes } from "node:crypto";
import { deflateRawSync, gunzipSync as nodeGunzip, gzipSync as nodeGzip } from "node:zlib";
import { describe, expect, test } from "vitest";
import { BufferShim, installBufferShim } from "../src/browser/buffer.js";
import { createHash, randomUUID } from "../src/browser/crypto.js";
import { createNodeGuardedFetch } from "../src/browser/guarded-fetch.js";
import { gunzipSync, gzipSync } from "../src/browser/zlib.js";
import { sha256 } from "../src/sha256.js";

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");

/** A status-list-like bitstring: mostly zero, a few set bits. */
function sparseBits(length: number, set: readonly number[]): Uint8Array {
  const bits = new Uint8Array(length);
  for (const index of set) bits[index >> 3] = (bits[index >> 3] as number) | (0x80 >> (index & 7));
  return bits;
}

describe("sha256", () => {
  test("matches the NIST vectors", () => {
    expect(hex(sha256(""))).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(hex(sha256("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(hex(sha256("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"))).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
  });

  test("matches node:crypto across every padding boundary and on random input", () => {
    for (let length = 0; length <= 200; length += 1) {
      const input = randomBytes(length);
      expect(hex(sha256(input))).toBe(nodeCreateHash("sha256").update(input).digest("hex"));
    }
    const large = randomBytes(100_003);
    expect(hex(sha256(large))).toBe(nodeCreateHash("sha256").update(large).digest("hex"));
  });

  test("hashes a string as UTF-8", () => {
    const text = "Señor 模 🏠";
    expect(hex(sha256(text))).toBe(nodeCreateHash("sha256").update(text, "utf8").digest("hex"));
  });
});

describe("browser crypto stand-in", () => {
  test("createHash('sha256').update(text, 'utf8').digest() equals Node's", () => {
    const canonical = '<https://a.example/s> <https://a.example/p> "v" .\n';
    const ours = new Uint8Array(createHash("sha256").update(canonical, "utf8").digest());
    expect(hex(ours)).toBe(nodeCreateHash("sha256").update(canonical, "utf8").digest("hex"));
  });

  test("several updates hash as one message", () => {
    const ours = createHash("sha256")
      .update("ab")
      .update(new Uint8Array([99]))
      .digest();
    expect(hex(ours)).toBe(hex(sha256("abc")));
  });

  test("any other algorithm or encoding is refused", () => {
    expect(() => createHash("sha1")).toThrow(/only sha256/);
    expect(() => createHash("sha256").update("00", "hex")).toThrow(/only utf8/);
  });

  test("randomUUID is a version 4 UUID", () => {
    expect(randomUUID()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe("browser zlib stand-in", () => {
  const samples: readonly [string, Uint8Array][] = [
    ["empty", new Uint8Array(0)],
    ["one byte", new Uint8Array([7])],
    ["an all-clear status list", new Uint8Array(16_384)],
    ["a status list with revoked entries", sparseBits(16_384, [42, 7, 131_071, 9_000])],
    ["text", new TextEncoder().encode("the quick brown fox ".repeat(400))],
    ["random bytes", randomBytes(5_000)],
    ["runs of every short length", Uint8Array.from([1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 5, 5, 5, 5, 5])],
    ["a run of 259", new Uint8Array(259).fill(9)],
    ["a run of 260", new Uint8Array(260).fill(9)],
    ["a run of 517", new Uint8Array(517).fill(9)],
  ];

  test.each(samples)("Node reads what the stand-in writes: %s", (_name, data) => {
    expect(hex(nodeGunzip(gzipSync(data)))).toBe(hex(data));
  });

  test.each(samples)("the stand-in reads what Node writes: %s", (_name, data) => {
    expect(hex(gunzipSync(nodeGzip(data)))).toBe(hex(data));
    expect(hex(gunzipSync(nodeGzip(data, { level: 1 })))).toBe(hex(data));
    expect(hex(gunzipSync(nodeGzip(data, { level: 0 })))).toBe(hex(data));
  });

  test.each(samples)("the stand-in reads what it writes: %s", (_name, data) => {
    expect(hex(gunzipSync(gzipSync(data)))).toBe(hex(data));
  });

  test("an all-clear list compresses to a small fraction of its size", () => {
    expect(gzipSync(new Uint8Array(16_384)).length).toBeLessThan(200);
  });

  test("reads a member with a file name and an extra field", () => {
    const data = new TextEncoder().encode("status");
    const body = deflateRawSync(data);
    const plain = nodeGzip(data);
    const header = Uint8Array.from([
      0x1f,
      0x8b,
      8,
      0x04 | 0x08,
      0,
      0,
      0,
      0,
      0,
      255,
      3,
      0,
      1,
      2,
      3,
      0x61,
      0x62,
      0,
    ]);
    const member = new Uint8Array(header.length + body.length + 8);
    member.set(header);
    member.set(body, header.length);
    member.set(plain.subarray(plain.length - 8), header.length + body.length);
    expect(new TextDecoder().decode(gunzipSync(member))).toBe("status");
  });

  test("maxOutputLength stops a decompression bomb while decoding", () => {
    const bomb = nodeGzip(new Uint8Array(4_000_000));
    expect(() => gunzipSync(bomb, { maxOutputLength: 16_384 })).toThrow(/larger than 16384/);
    expect(gunzipSync(nodeGzip(new Uint8Array(16_384)), { maxOutputLength: 16_384 }).length).toBe(
      16_384,
    );
  });

  test("corrupt input throws instead of returning data", () => {
    const good = nodeGzip(sparseBits(2_048, [5]));
    const badCrc = Uint8Array.from(good);
    badCrc[badCrc.length - 8] = (badCrc[badCrc.length - 8] as number) ^ 0xff;
    expect(() => gunzipSync(badCrc)).toThrow(/incorrect data check/);
    const badLength = Uint8Array.from(good);
    badLength[badLength.length - 4] = (badLength[badLength.length - 4] as number) ^ 0x01;
    expect(() => gunzipSync(badLength)).toThrow(/incorrect length check/);
    expect(() => gunzipSync(good.subarray(0, good.length - 9))).toThrow();
    expect(() => gunzipSync(new TextEncoder().encode("not gzip at all, just text"))).toThrow(
      /incorrect header check/,
    );
    expect(() => gunzipSync(new Uint8Array(4))).toThrow();
  });
});

describe("Buffer stand-in", () => {
  test("base64url round-trips exactly as Node's Buffer does", () => {
    for (let length = 0; length < 40; length += 1) {
      const bytes = randomBytes(length);
      const encoded = BufferShim.from(bytes).toString("base64url");
      expect(encoded).toBe(Buffer.from(bytes).toString("base64url"));
      expect(hex(BufferShim.from(encoded, "base64url"))).toBe(hex(bytes));
    }
  });

  test("byteLength and concat match Node's", () => {
    expect(BufferShim.byteLength("Señor 🏠", "utf8")).toBe(Buffer.byteLength("Señor 🏠", "utf8"));
    const parts = [new TextEncoder().encode('{"a":'), new TextEncoder().encode('"é"}')];
    expect(BufferShim.concat(parts).toString("utf8")).toBe('{"a":"é"}');
  });

  test("a compressed list survives the encode and decode path solid-vc uses", () => {
    const bits = sparseBits(16_384, [42]);
    const encoded = `u${BufferShim.from(gzipSync(bits)).toString("base64url")}`;
    const decoded = gunzipSync(BufferShim.from(encoded.slice(1), "base64url"), {
      maxOutputLength: 16_384,
    });
    expect(hex(decoded)).toBe(hex(bits));
    // And Node's own decoder accepts the same string.
    expect(hex(nodeGunzip(Buffer.from(encoded.slice(1), "base64url")))).toBe(hex(bits));
  });

  test("it never replaces a Buffer the runtime already has", () => {
    expect(installBufferShim()).toBe(false);
    expect(globalThis.Buffer).not.toBe(BufferShim);
  });
});

describe("guarded-fetch stand-in", () => {
  test("fails closed when no fetch was supplied", async () => {
    await expect(createNodeGuardedFetch()("https://issuer.example/status/1")).rejects.toThrow(
      /no fetch was supplied/,
    );
  });
});
