// AUTHORED-BY Claude Opus 5.5
/**
 * The BN254 common reference string, served by the site itself (acceptance test 6: no request
 * leaves the site's origin).
 *
 * In a browser, bb.js's `Barretenberg.new()` loads its CRS through `initSRSChonk()`, which
 * downloads 2^20 G1 points (64 MiB) and a Grumpkin CRS from Aztec's CDN
 * (`crs.aztec-cdn.foundation`, falling back to `crs.aztec-labs.com`). The demo has no server
 * and must not call one, and every committed circuit member needs only 2^15 points. So in a
 * browser {@link installSameOriginCrs} replaces that step: it fetches the first
 * {@link CRS_POINTS} points of the same Aztec Ignition transcript from the site
 * (`/zk-crs/bn254_g1.dat` and `bn254_g2.dat`, copied from `packages/vc-kit/crs/` by
 * tools/build-site.mjs), checks both files against the SHA-256 digests pinned below, and loads
 * them with bb.js's own `srsInitSrs`. The Grumpkin CRS is only for IPA/ECCVM proofs, which
 * UltraHonk never makes, so it is not loaded. Node keeps bb.js's own CRS handling.
 *
 * The CRS is public data: a transparent setup's points, not a secret. The digests stop a
 * truncated or substituted file from being used silently; a VK computed from these points
 * equals the one bb.js computes from its own download (test/zk-crs.test.ts).
 */

/** G1 points shipped: the committed circuits' dyadic size (2^15; test/zk-crs.test.ts). */
export const CRS_POINTS = 2 ** 15;

/** Where the site serves the CRS files, relative to its origin. */
export const SITE_CRS_PATH = "/zk-crs/";

/** SHA-256 of the first 2^15 G1 points of the Aztec Ignition transcript (64 bytes each). */
export const CRS_G1_SHA256 = "50d2f4e9567be2b8e382cedfd078b96a3428a94597b7e88c4116e105d578ce77";
/** SHA-256 of the 128-byte G2 point of the same transcript. */
export const CRS_G2_SHA256 = "01797bfc4de5a96f0e516a9ea4537d18786dc30cb991aca4274c95822b69c32f";

export interface CrsData {
  readonly g1: Uint8Array;
  readonly g2: Uint8Array;
  readonly points: number;
}

/** Thrown when the CRS files are missing, the wrong size or not the pinned bytes. */
export class CrsError extends Error {
  override readonly name = "CrsError";
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Check `g1` and `g2` against the pinned size and digests. */
export async function checkCrs(g1: Uint8Array, g2: Uint8Array): Promise<CrsData> {
  if (g1.length !== CRS_POINTS * 64) {
    throw new CrsError(`bn254_g1.dat holds ${g1.length} bytes, not ${CRS_POINTS * 64}`);
  }
  if (g2.length !== 128) throw new CrsError(`bn254_g2.dat holds ${g2.length} bytes, not 128`);
  if ((await sha256Hex(g1)) !== CRS_G1_SHA256)
    throw new CrsError("bn254_g1.dat is not the pinned CRS");
  if ((await sha256Hex(g2)) !== CRS_G2_SHA256)
    throw new CrsError("bn254_g2.dat is not the pinned CRS");
  return { g1, g2, points: CRS_POINTS };
}

/**
 * Fetch and check the CRS from `base` (default: {@link SITE_CRS_PATH} on this page's or
 * worker's own origin). Only `base` is fetched: never another host.
 */
export async function fetchSiteCrs(
  base: string | URL = new URL(
    SITE_CRS_PATH,
    (globalThis as { location?: { href: string } }).location?.href,
  ).href,
  fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
): Promise<CrsData> {
  const load = async (name: string) => {
    const url = new URL(name, base);
    const response = await fetchImpl(url.href);
    if (!response.ok) throw new CrsError(`GET ${url.href} answered ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  };
  const [g1, g2] = await Promise.all([load("bn254_g1.dat"), load("bn254_g2.dat")]);
  return checkCrs(g1, g2);
}

/** The part of bb.js's `Barretenberg` class this module touches. */
export interface BarretenbergClass {
  prototype: {
    initSRSChonk(srsSize?: number): Promise<void>;
    srsInitSrs(input: {
      pointsBuf: Uint8Array;
      numPoints: number;
      g2Point: Uint8Array;
    }): Promise<unknown>;
  };
}

const INSTALLED = Symbol.for("@mortgage/vc-kit/same-origin-crs");

/**
 * Make every `Barretenberg` instance load its CRS with `load` instead of downloading it. The CRS
 * is fetched once and shared. Idempotent: a second call keeps the first loader.
 */
export function installSameOriginCrs(
  Barretenberg: BarretenbergClass,
  load: () => Promise<CrsData> = () => fetchSiteCrs(),
): void {
  const proto = Barretenberg.prototype as BarretenbergClass["prototype"] & {
    [INSTALLED]?: true;
  };
  if (proto[INSTALLED]) return;
  let crs: Promise<CrsData> | undefined;
  proto.initSRSChonk = async function initSameOriginSrs(this: BarretenbergClass["prototype"]) {
    crs ??= load();
    crs.catch(() => {
      crs = undefined; // a failed fetch may be retried by the next prover
    });
    const { g1, g2, points } = await crs;
    await this.srsInitSrs({ g2Point: g2, numPoints: points, pointsBuf: g1 });
  };
  proto[INSTALLED] = true;
}

/** Is this Node (bb.js keeps its own CRS handling there)? */
export function isNode(): boolean {
  return (
    typeof (globalThis as { process?: { versions?: { node?: string } } }).process?.versions
      ?.node === "string"
  );
}
