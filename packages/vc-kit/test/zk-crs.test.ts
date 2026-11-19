// AUTHORED-BY Claude Opus 5.5
/**
 * The same-origin CRS (src/zk/crs.ts): the committed files are the pinned Ignition points, the
 * loader fetches only from the site and refuses substituted bytes, and bb.js's real WASM backend
 * proves and verifies the committed circuits with these 2^15 points alone (no download, no
 * Grumpkin CRS), the way a browser does. The VK matches the one bb.js derives from its own CRS.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import * as bb from "@aztec/bb.js";
import { describe, expect, it, vi } from "vitest";
import { loadCommittedCircuit } from "../src/zk/circuits/registry.js";
import {
  type BarretenbergClass,
  CRS_POINTS,
  CrsError,
  checkCrs,
  fetchSiteCrs,
  installSameOriginCrs,
  isNode,
} from "../src/zk/crs.js";

const CRS_DIR = join(import.meta.dirname, "..", "crs");
const G1 = new Uint8Array(readFileSync(join(CRS_DIR, "bn254_g1.dat")));
const G2 = new Uint8Array(readFileSync(join(CRS_DIR, "bn254_g2.dat")));

const PROVE_TIMEOUT = 300_000;

describe("the committed CRS files", () => {
  it("hold the pinned 2^15 G1 points and the G2 point", async () => {
    const crs = await checkCrs(G1, G2);
    expect(crs.points).toBe(CRS_POINTS);
    // The first point of the transcript is the BN254 generator (1, 2).
    expect(G1.subarray(0, 32)).toEqual(bb.BN254_G1_GENERATOR.x);
    expect(G1.subarray(32, 64)).toEqual(bb.BN254_G1_GENERATOR.y);
  });

  it("cover every committed circuit's dyadic size", async () => {
    const api = await bb.Barretenberg.new({ threads: 1 });
    try {
      for (const member of ["filter_int_d2", "filter_int_d3", "filter_int_d4"] as const) {
        const circuit = await loadCommittedCircuit(member);
        const [, dyadic] = await api.acirGetCircuitSizes(
          new Uint8Array(gunzipSync(decode(circuit.bytecode))),
          false,
          false,
        );
        expect(dyadic, member).toBeLessThanOrEqual(CRS_POINTS);
      }
    } finally {
      await api.destroy();
    }
  });

  it("refuses a truncated or substituted file", async () => {
    await expect(checkCrs(G1.subarray(0, G1.length - 64), G2)).rejects.toThrow(CrsError);
    const flipped = G1.slice();
    flipped[100] = (flipped[100] ?? 0) ^ 1;
    await expect(checkCrs(flipped, G2)).rejects.toThrow(/not the pinned CRS/);
    await expect(checkCrs(G1, G2.slice(0, 64))).rejects.toThrow(CrsError);
  });
});

describe("fetchSiteCrs", () => {
  it("fetches only the two files under the site's base", async () => {
    const fetched: string[] = [];
    const fake = vi.fn(async (url: string | URL | Request) => {
      const href = String(url);
      fetched.push(href);
      return new Response(href.endsWith("bn254_g1.dat") ? G1 : G2);
    }) as unknown as typeof fetch;
    const crs = await fetchSiteCrs("https://site.test/zk-crs/", fake);
    expect(crs.points).toBe(CRS_POINTS);
    expect(fetched.sort()).toEqual([
      "https://site.test/zk-crs/bn254_g1.dat",
      "https://site.test/zk-crs/bn254_g2.dat",
    ]);
  });

  it("fails on a missing file", async () => {
    const fake = (async () => new Response("", { status: 404 })) as unknown as typeof fetch;
    await expect(fetchSiteCrs("https://site.test/zk-crs/", fake)).rejects.toThrow(/answered 404/);
  });
});

function decode(bytecode: string): Uint8Array {
  // Committed artifacts are base64 gzip ACIR, as noir_js and bb.js take them.
  return new Uint8Array(Buffer.from(bytecode, "base64"));
}

describe("installSameOriginCrs on bb.js's real WASM backend", () => {
  it(
    "proves and verifies with the site's CRS alone, never downloading one",
    async () => {
      expect(isNode()).toBe(true);
      let loads = 0;
      installSameOriginCrs(bb.Barretenberg as unknown as BarretenbergClass, async () => {
        loads++;
        return checkCrs(G1, G2);
      });
      // Node would pick the native backend (its own CRS); force the WASM backend a browser uses.
      const original = bb.Barretenberg.new.bind(bb.Barretenberg);
      const spy = vi
        .spyOn(bb.Barretenberg, "new")
        .mockImplementation((options = {}) =>
          original({ ...options, backend: bb.BackendType.Wasm }),
        );
      const network = vi.spyOn(globalThis, "fetch");
      try {
        const { incomeProof } = await import("./zk-support.js");
        const { verifyProof } = await import("../src/zk/backend.js");
        const proof = await incomeProof();
        expect(proof.proof.length).toBe(8384);
        expect(
          await verifyProof("filter_int_d4", {
            proof: proof.proof,
            publicInputs: proof.publicInputs,
          }),
        ).toBe(true);
        expect(loads).toBe(1);
        expect(spy).toHaveBeenCalled();
        expect(network.mock.calls.map((call) => String(call[0]))).toEqual([]);

        // The VK from these points equals the one bb.js computes from its own CRS (native).
        const circuit = await loadCommittedCircuit("filter_int_d4");
        const settings = {
          disableZk: false,
          ipaAccumulation: false,
          optimizedSolidityVerifier: false,
          oracleHashType: "keccak",
        };
        const local = await original({ backend: bb.BackendType.Wasm, threads: 1 });
        const own = await original({ threads: 1 });
        try {
          const bytecode = new Uint8Array(gunzipSync(decode(circuit.bytecode)));
          const vkLocal = await local.circuitComputeVk({
            circuit: { bytecode, name: "c" },
            settings,
          });
          const vkOwn = await own.circuitComputeVk({ circuit: { bytecode, name: "c" }, settings });
          expect(vkLocal.bytes).toEqual(vkOwn.bytes);
        } finally {
          await local.destroy();
          await own.destroy();
        }
      } finally {
        spy.mockRestore();
        network.mockRestore();
      }
    },
    PROVE_TIMEOUT,
  );
});
