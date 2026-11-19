// AUTHORED-BY Claude Opus 5.5
/**
 * The site CRS (src/zk/crs.ts), SECURITY-CRITICAL: the committed files match their pins, the loader
 * fails closed on every way a file can be wrong or missing, the bb.js hook loads exactly the pinned
 * CRS and fails closed when bb.js does not go through it, and the pinned G1 size is enough for
 * every committed circuit while one point fewer is not.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";
import { FilterIntD1 } from "../src/zk/circuits/filter-int-d1.js";
import { FilterIntD2 } from "../src/zk/circuits/filter-int-d2.js";
import { FilterIntD3 } from "../src/zk/circuits/filter-int-d3.js";
import { FilterIntD4 } from "../src/zk/circuits/filter-int-d4.js";
import {
  type BarretenbergModuleLike,
  barretenbergWithSiteCrs,
  CRS_FILES,
  CRS_G1,
  CRS_G1_POINTS,
  CRS_G2,
  loadSiteCrs,
  type SiteCrs,
  usesSiteCrs,
} from "../src/zk/crs.js";
import { ZkError } from "../src/zk/errors.js";
import { KybCompletenessScanN8 } from "../src/zk/kyb/circuit.js";

const CRS_DIR = join(import.meta.dirname, "..", "crs");
const BASE = "https://site.test/crs/";
const committed = (file: string) => new Uint8Array(readFileSync(join(CRS_DIR, file)));

/** A fetch that serves the committed files under BASE, with `tamper` applied, and records calls. */
function siteFetch(
  tamper: (file: string, bytes: Uint8Array) => Uint8Array | Response = (_f, b) => b,
) {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    calls.push({ init, url });
    const file = url.startsWith(BASE) ? url.slice(BASE.length) : "";
    if (!CRS_FILES.some((pin) => pin.file === file))
      return new Response("not found", { status: 404 });
    const served = tamper(file, committed(file));
    return served instanceof Response ? served : new Response(served);
  }) as typeof globalThis.fetch;
  return { calls, fetch };
}

async function rejection(promise: Promise<unknown>): Promise<ZkError> {
  const error = await promise.then(
    () => undefined,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(ZkError);
  return error as ZkError;
}

describe("the committed CRS files", () => {
  it("are exactly the pinned files, with the pinned lengths and SHA-256", () => {
    expect(readdirSync(CRS_DIR).sort()).toEqual(CRS_FILES.map((pin) => pin.file).sort());
    for (const pin of CRS_FILES) {
      const bytes = committed(pin.file);
      expect(bytes.length).toBe(pin.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(pin.sha256);
      expect(pin.file).toContain(pin.sha256.slice(0, 16));
    }
    expect(CRS_G1.bytes).toBe(CRS_G1_POINTS * 64);
  });

  it("start with the BN254 generator (1, 2), as Aztec's g1.dat does", () => {
    const first = committed(CRS_G1.file).subarray(0, 64);
    const coordinate = (bytes: Uint8Array) => BigInt(`0x${Buffer.from(bytes).toString("hex")}`);
    expect(coordinate(first.subarray(0, 32))).toBe(1n);
    expect(coordinate(first.subarray(32, 64))).toBe(2n);
  });
});

describe("loadSiteCrs", () => {
  it("loads both pinned files from the site, refusing redirects", async () => {
    const { calls, fetch } = siteFetch();
    const crs = await loadSiteCrs({ baseUrl: BASE, fetch });
    expect(crs.numPoints).toBe(CRS_G1_POINTS);
    expect(crs.g1).toEqual(committed(CRS_G1.file));
    expect(crs.g2).toEqual(committed(CRS_G2.file));
    expect(calls.map((call) => call.url).sort()).toEqual(
      [`${BASE}${CRS_G1.file}`, `${BASE}${CRS_G2.file}`].sort(),
    );
    for (const call of calls) {
      expect(call.init?.redirect).toBe("error");
      expect(call.init?.credentials).toBe("same-origin");
    }
  });

  it("fails closed on one flipped bit in G1", async () => {
    const { fetch } = siteFetch((file, bytes) => {
      if (file !== CRS_G1.file) return bytes;
      const copy = bytes.slice();
      copy[1000] = (copy[1000] as number) ^ 1;
      return copy;
    });
    expect((await rejection(loadSiteCrs({ baseUrl: BASE, fetch }))).code).toBe("CRS_INTEGRITY");
  });

  it("fails closed on a different G2 point of the right length", async () => {
    const { fetch } = siteFetch((file, bytes) =>
      file === CRS_G2.file ? bytes.slice().reverse() : bytes,
    );
    expect((await rejection(loadSiteCrs({ baseUrl: BASE, fetch }))).code).toBe("CRS_INTEGRITY");
  });

  it("fails closed on a truncated or an extended file", async () => {
    const short = siteFetch((file, bytes) =>
      file === CRS_G1.file ? bytes.subarray(0, bytes.length - 64) : bytes,
    );
    expect((await rejection(loadSiteCrs({ baseUrl: BASE, fetch: short.fetch }))).code).toBe(
      "CRS_INTEGRITY",
    );
    const long = siteFetch((file, bytes) => {
      if (file !== CRS_G1.file) return bytes;
      const extended = new Uint8Array(bytes.length + 64);
      extended.set(bytes);
      return extended;
    });
    expect((await rejection(loadSiteCrs({ baseUrl: BASE, fetch: long.fetch }))).code).toBe(
      "CRS_INTEGRITY",
    );
  });

  it("fails closed when a file is missing, errors, or the fetch itself fails", async () => {
    const missing = siteFetch((file, bytes) =>
      file === CRS_G2.file ? new Response("gone", { status: 404 }) : bytes,
    );
    expect((await rejection(loadSiteCrs({ baseUrl: BASE, fetch: missing.fetch }))).code).toBe(
      "CRS_UNAVAILABLE",
    );
    const broken = siteFetch((file, bytes) =>
      file === CRS_G1.file ? new Response("oops", { status: 500 }) : bytes,
    );
    expect((await rejection(loadSiteCrs({ baseUrl: BASE, fetch: broken.fetch }))).code).toBe(
      "CRS_UNAVAILABLE",
    );
    const offline = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof globalThis.fetch;
    expect((await rejection(loadSiteCrs({ baseUrl: BASE, fetch: offline }))).code).toBe(
      "CRS_UNAVAILABLE",
    );
  });

  it("refuses to guess a base without a site origin", async () => {
    expect(usesSiteCrs()).toBe(false);
    const { fetch, calls } = siteFetch();
    expect((await rejection(loadSiteCrs({ fetch }))).code).toBe("CRS_UNAVAILABLE");
    expect(calls).toEqual([]);
  });
});

/** A stand-in for bb.js: `new()` makes an instance and calls `initSRSChonk` on it, as bb.js does. */
function fakeBb(options: { callsInit?: boolean; srsFails?: boolean } = {}) {
  const network = vi.fn(async () => {
    throw new Error("the CDN");
  });
  const srsInitSrs = vi.fn(async () => {
    if (options.srsFails) throw new Error("srs_init_srs failed in the wasm");
  });
  const destroy = vi.fn(async () => undefined);
  const newOptions: unknown[] = [];
  /** Every instance made, as bb.js makes a worker and wasm for each; `live` drops it on destroy(). */
  const made: object[] = [];
  const live = new Set<object>();
  class Barretenberg {
    srsInitSrs = srsInitSrs;
    destroy = async () => {
      live.delete(this);
      await destroy();
    };
    // As bb.js's own new(): it makes the backend, then awaits initSRSChonk with no cleanup on a throw.
    static async new(opts: { threads?: number }) {
      newOptions.push(opts);
      const api = new Barretenberg();
      made.push(api);
      live.add(api);
      if (options.callsInit !== false) await api.initSRSChonk();
      return api;
    }
    initSRSChonk(): Promise<void> {
      return network();
    }
  }
  return { Barretenberg, destroy, live, made, network, newOptions, srsInitSrs };
}

const crsFrom = async (): Promise<SiteCrs> => {
  const { fetch } = siteFetch();
  return loadSiteCrs({ baseUrl: BASE, fetch });
};

describe("barretenbergWithSiteCrs", () => {
  it("starts bb.js on the pinned CRS instead of its CDN download, then puts bb.js back", async () => {
    const bb = fakeBb();
    const original = bb.Barretenberg.prototype.initSRSChonk;
    const api = await barretenbergWithSiteCrs(bb as unknown as BarretenbergModuleLike, 4, crsFrom);
    expect(api).toBeInstanceOf(bb.Barretenberg);
    expect(bb.newOptions).toEqual([{ threads: 4 }]);
    expect(bb.network).not.toHaveBeenCalled();
    expect(bb.srsInitSrs).toHaveBeenCalledTimes(1);
    expect(bb.srsInitSrs).toHaveBeenCalledWith({
      g2Point: committed(CRS_G2.file),
      numPoints: CRS_G1_POINTS,
      pointsBuf: committed(CRS_G1.file),
    });
    expect(bb.Barretenberg.prototype.initSRSChonk).toBe(original);
  });

  it("fails closed when the CRS does not load, and puts bb.js back", async () => {
    const bb = fakeBb();
    const original = bb.Barretenberg.prototype.initSRSChonk;
    const tampered = async () => {
      const { fetch } = siteFetch((file, bytes) =>
        file === CRS_G1.file ? bytes.slice().fill(0) : bytes,
      );
      return loadSiteCrs({ baseUrl: BASE, fetch });
    };
    const error = await rejection(
      barretenbergWithSiteCrs(bb as unknown as BarretenbergModuleLike, 1, tampered),
    );
    expect(error.code).toBe("CRS_INTEGRITY");
    expect(bb.srsInitSrs).not.toHaveBeenCalled();
    expect(bb.network).not.toHaveBeenCalled();
    expect(bb.Barretenberg.prototype.initSRSChonk).toBe(original);
    // The instance bb.js had already started is destroyed, not left running.
    expect(bb.made).toHaveLength(1);
    expect(bb.live.size).toBe(0);
  });

  it("leaves no instance running however many starts fail, and the next good start keeps only its own", async () => {
    const bb = fakeBb();
    const badG1 = async () => {
      const { fetch } = siteFetch((file, bytes) => {
        if (file !== CRS_G1.file) return bytes;
        const copy = bytes.slice();
        copy[copy.length - 1] = (copy[copy.length - 1] ?? 0) ^ 1;
        return copy;
      });
      return loadSiteCrs({ baseUrl: BASE, fetch });
    };
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const error = await rejection(
        barretenbergWithSiteCrs(bb as unknown as BarretenbergModuleLike, 1, badG1),
      );
      expect(error.code).toBe("CRS_INTEGRITY");
    }
    expect(bb.made).toHaveLength(3);
    expect(bb.live.size).toBe(0);
    const api = await barretenbergWithSiteCrs(bb as unknown as BarretenbergModuleLike, 1, crsFrom);
    expect(bb.made).toHaveLength(4);
    expect([...bb.live]).toEqual([api]);
    expect(bb.destroy).toHaveBeenCalledTimes(3);
  });

  it("destroys the instance when the wasm refuses the CRS, and reports the wasm's error", async () => {
    const bb = fakeBb({ srsFails: true });
    const original = bb.Barretenberg.prototype.initSRSChonk;
    await expect(
      barretenbergWithSiteCrs(bb as unknown as BarretenbergModuleLike, 1, crsFrom),
    ).rejects.toThrow("srs_init_srs failed in the wasm");
    expect(bb.srsInitSrs).toHaveBeenCalledTimes(1);
    expect(bb.live.size).toBe(0);
    expect(bb.Barretenberg.prototype.initSRSChonk).toBe(original);
  });

  it("fails closed when bb.js starts without going through initSRSChonk", async () => {
    const bb = fakeBb({ callsInit: false });
    const error = await rejection(
      barretenbergWithSiteCrs(bb as unknown as BarretenbergModuleLike, 1, crsFrom),
    );
    expect(error.code).toBe("CRS_HOOK");
    expect(bb.destroy).toHaveBeenCalledTimes(1);
  });

  it("fails closed when bb.js has no initSRSChonk at all, before starting it", async () => {
    const bb = fakeBb();
    const prototype = bb.Barretenberg.prototype as { initSRSChonk?: unknown };
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "initSRSChonk");
    delete prototype.initSRSChonk;
    try {
      const error = await rejection(
        barretenbergWithSiteCrs(bb as unknown as BarretenbergModuleLike, 1, crsFrom),
      );
      expect(error.code).toBe("CRS_HOOK");
      expect(bb.newOptions).toEqual([]);
    } finally {
      if (descriptor) Object.defineProperty(prototype, "initSRSChonk", descriptor);
    }
  });
});

/**
 * The real bb.js wasm, started through the hook. Computing a verification key commits to the
 * circuit's polynomials, so it needs as many G1 points as the circuit's padded size: the pinned
 * 2^15 points are enough for every committed circuit, and one point fewer is not.
 */
describe("the pinned G1 size, on the real bb.js wasm", () => {
  const CIRCUITS = [
    ["filter_int_d1", FilterIntD1],
    ["filter_int_d2", FilterIntD2],
    ["filter_int_d3", FilterIntD3],
    ["filter_int_d4", FilterIntD4],
    ["kyb_completeness_scan_n8", KybCompletenessScanN8],
  ] as const;
  const SETTINGS = {
    disableZk: false,
    ipaAccumulation: false,
    optimizedSolidityVerifier: false,
    oracleHashType: "keccak",
  };

  interface WasmApi {
    circuitComputeVk(command: unknown): Promise<{ bytes: Uint8Array }>;
    circuitStats(command: unknown): Promise<{ numGatesDyadic: number }>;
    destroy(): Promise<void>;
  }

  async function wasmApi(load: () => Promise<SiteCrs>): Promise<WasmApi> {
    const bb = await import("@aztec/bb.js");
    // In Node bb.js would use its native binary, which never calls initSRSChonk: ask for the wasm,
    // as a browser gets.
    const wasm: BarretenbergModuleLike = {
      Barretenberg: {
        new: (options) => bb.Barretenberg.new({ ...options, backend: bb.BackendType.Wasm }),
        prototype: bb.Barretenberg.prototype,
      },
    };
    return (await barretenbergWithSiteCrs(wasm, 1, load)) as WasmApi;
  }

  const circuit = (artifact: { bytecode: string }, name: string) => ({
    bytecode: new Uint8Array(gunzipSync(Buffer.from(artifact.bytecode, "base64"))),
    name,
    verificationKey: new Uint8Array(),
  });

  it("is every committed circuit's padded size, and every verification key computes with it", async () => {
    const api = await wasmApi(crsFrom);
    try {
      for (const [name, artifact] of CIRCUITS) {
        const stats = await api.circuitStats({
          circuit: circuit(artifact, name),
          includeGatesPerOpcode: false,
          settings: SETTINGS,
        });
        expect(stats.numGatesDyadic, name).toBeLessThanOrEqual(CRS_G1_POINTS);
        const vk = await api.circuitComputeVk({
          circuit: circuit(artifact, name),
          settings: SETTINGS,
        });
        expect(vk.bytes.length, name).toBeGreaterThan(0);
      }
      const largest = await api.circuitStats({
        circuit: circuit(FilterIntD4, "filter_int_d4"),
        includeGatesPerOpcode: false,
        settings: SETTINGS,
      });
      expect(largest.numGatesDyadic).toBe(CRS_G1_POINTS);
    } finally {
      await api.destroy();
    }
  }, 300_000);

  it("one point fewer is not enough", async () => {
    const short = async (): Promise<SiteCrs> => {
      const crs = await crsFrom();
      return {
        ...crs,
        g1: crs.g1.slice(0, (CRS_G1_POINTS - 1) * 64),
        numPoints: CRS_G1_POINTS - 1,
      };
    };
    const api = await wasmApi(short);
    try {
      await expect(
        api.circuitComputeVk({
          circuit: circuit(FilterIntD4, "filter_int_d4"),
          settings: SETTINGS,
        }),
      ).rejects.toThrow(/too many points/);
    } finally {
      await api.destroy().catch(() => undefined);
    }
  }, 300_000);
});
