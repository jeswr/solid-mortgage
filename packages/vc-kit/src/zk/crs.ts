// AUTHORED-BY Claude Opus 5.5
/**
 * The structured reference string (CRS) UltraHonk proves and verifies with, served by this site and
 * pinned by SHA-256.
 *
 * In a browser, bb.js fetches its CRS from Aztec's CDN (`crs.aztec-cdn.foundation`, falling back to
 * `crs.aztec-labs.com`) every time `Barretenberg.new()` starts: `initSRSChonk()` asks for 2^20 G1
 * points (64 MiB) and a Grumpkin CRS of 2^16 points (4 MiB), and only that browser's IndexedDB
 * caches them. A proof would then depend on a third party at proof time, and a fresh browser would
 * download 68 MiB. bb.js has no browser option to supply the CRS (`crsPath` is read only by its Node
 * build), so for the one `Barretenberg.new()` call vc-kit makes in a browser this module stands in
 * for `initSRSChonk` and loads the CRS from the site itself:
 *
 * - G1: the first 32,768 points (2 MiB). Every committed circuit (filter_int_d1 to d4 and the KYB
 *   completeness scan) is 17,416 gates, 2^15 once padded to a power of two, and both the prover and
 *   the verifier (which computes the verification key) commit with at most that many points.
 * - G2: the one G2 point verification pairs against (128 bytes).
 * - Grumpkin: none. Only IPA accumulation uses it, and the sanctioned flavour
 *   (`verifierTarget: "evm"`, so `ipaAccumulation: false`) never runs it.
 *
 * The files are byte-identical to the start of Aztec's published `g1.dat` and to its `g2.dat`
 * (checked against both CDN hosts and against native bb's own download). Fail closed: a missing
 * file, a redirect, a wrong length or a wrong SHA-256 throws, and nothing falls back to the network.
 * A circuit larger than 2^15 makes bb.js fail as well (its SRS would be too small): grow the G1 file
 * and its pin with it.
 */
import { ZkError } from "./errors.js";

/** One CRS file the site serves, with the exact length and SHA-256 it must have. */
export interface PinnedCrsFile {
  readonly file: string;
  readonly bytes: number;
  readonly sha256: string;
}

/** G1 points in the site CRS: the largest committed circuit's size, 2^15. */
export const CRS_G1_POINTS = 32_768;

/** The first {@link CRS_G1_POINTS} BN254 G1 points (64 bytes each, uncompressed affine, big-endian). */
export const CRS_G1: PinnedCrsFile = Object.freeze({
  bytes: CRS_G1_POINTS * 64,
  file: "bn254-g1-32768-50d2f4e9567be2b8.dat",
  sha256: "50d2f4e9567be2b8e382cedfd078b96a3428a94597b7e88c4116e105d578ce77",
});

/** The BN254 G2 point of the same ceremony. */
export const CRS_G2: PinnedCrsFile = Object.freeze({
  bytes: 128,
  file: "bn254-g2-01797bfc4de5a96f.dat",
  sha256: "01797bfc4de5a96f0e516a9ea4537d18786dc30cb991aca4274c95822b69c32f",
});

/** Every file the site must serve under {@link CRS_PATH} (`packages/vc-kit/crs/`, copied by the site build). */
export const CRS_FILES: readonly PinnedCrsFile[] = Object.freeze([CRS_G1, CRS_G2]);

/** Where on its own origin the site serves the CRS files. */
export const CRS_PATH = "/crs/";

/** The CRS as bb.js takes it. */
export interface SiteCrs {
  readonly g1: Uint8Array;
  readonly g2: Uint8Array;
  readonly numPoints: number;
}

export interface LoadSiteCrsOptions {
  /** Default: {@link CRS_PATH} on the current origin. */
  readonly baseUrl?: string | URL;
  readonly fetch?: typeof fetch;
}

/** True where vc-kit runs in a browser (a page or a worker): there bb.js would fetch from the CDN. */
export function usesSiteCrs(): boolean {
  const scope = globalThis as {
    document?: unknown;
    location?: { origin?: unknown };
    WorkerGlobalScope?: unknown;
  };
  return (
    (scope.document !== undefined || scope.WorkerGlobalScope !== undefined) &&
    typeof scope.location?.origin === "string"
  );
}

function siteBase(): URL {
  const origin = (globalThis as { location?: { origin?: unknown } }).location?.origin;
  if (typeof origin !== "string" || origin === "null") {
    throw new ZkError("CRS_UNAVAILABLE", "there is no site origin to load the CRS from");
  }
  return new URL(CRS_PATH, origin);
}

async function sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function loadPinned(pin: PinnedCrsFile, base: URL, load: typeof fetch): Promise<Uint8Array> {
  const url = new URL(pin.file, base);
  let response: Response;
  try {
    response = await load(url, { credentials: "same-origin", redirect: "error" });
  } catch (error) {
    throw new ZkError(
      "CRS_UNAVAILABLE",
      `the CRS file ${url.pathname} could not be loaded: ${String((error as Error)?.message ?? error)}`,
    );
  }
  if (!response.ok) {
    throw new ZkError(
      "CRS_UNAVAILABLE",
      `the CRS file ${url.pathname} answered HTTP ${response.status}`,
    );
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length !== pin.bytes) {
    throw new ZkError(
      "CRS_INTEGRITY",
      `the CRS file ${url.pathname} is ${bytes.length} bytes, not the pinned ${pin.bytes}`,
    );
  }
  if ((await sha256Hex(bytes)) !== pin.sha256) {
    throw new ZkError(
      "CRS_INTEGRITY",
      `the CRS file ${url.pathname} does not match its pinned SHA-256`,
    );
  }
  return bytes;
}

/** Load the pinned CRS from the site. Throws `ZkError` (`CRS_UNAVAILABLE`, `CRS_INTEGRITY`); never retries elsewhere. */
export async function loadSiteCrs(options: LoadSiteCrsOptions = {}): Promise<SiteCrs> {
  const base = options.baseUrl === undefined ? siteBase() : new URL(options.baseUrl);
  const load = options.fetch ?? globalThis.fetch.bind(globalThis);
  const [g1, g2] = await Promise.all([
    loadPinned(CRS_G1, base, load),
    loadPinned(CRS_G2, base, load),
  ]);
  return { g1, g2, numPoints: CRS_G1_POINTS };
}

interface SrsApi {
  srsInitSrs(command: {
    pointsBuf: Uint8Array;
    numPoints: number;
    g2Point: Uint8Array;
  }): Promise<unknown>;
  destroy?(): Promise<unknown>;
}

/** The part of `@aztec/bb.js` this module uses. */
export interface BarretenbergModuleLike {
  readonly Barretenberg: {
    "new"(options: { threads?: number }): Promise<unknown>;
    readonly prototype: object;
  };
}

/**
 * `Barretenberg.new({ threads })` with the site CRS instead of bb.js's CDN download. bb.js calls
 * `initSRSChonk()` on the instance it makes before `new()` resolves; for that call the prototype
 * method loads the pinned CRS instead, and the original method is put back afterwards. Fails closed
 * when bb.js no longer has that method, or starts without calling it.
 */
export async function barretenbergWithSiteCrs(
  bb: BarretenbergModuleLike,
  threads: number,
  load: () => Promise<SiteCrs> = loadSiteCrs,
): Promise<unknown> {
  const prototype = bb.Barretenberg.prototype as { initSRSChonk?: unknown };
  const original = prototype.initSRSChonk;
  if (typeof original !== "function") {
    throw new ZkError(
      "CRS_HOOK",
      "bb.js has no initSRSChonk to load the site CRS through; refusing to let it fetch its own",
    );
  }
  const crs = load();
  crs.catch(() => undefined); // reported where initSRSChonk awaits it
  let loaded = 0;
  prototype.initSRSChonk = async function initSiteSrs(this: SrsApi): Promise<void> {
    const { g1, g2, numPoints } = await crs;
    await this.srsInitSrs({ g2Point: g2, numPoints, pointsBuf: g1 });
    loaded += 1;
  };
  try {
    const api = (await bb.Barretenberg.new({ threads })) as SrsApi;
    if (loaded !== 1) {
      await api.destroy?.().catch(() => undefined);
      throw new ZkError("CRS_HOOK", "bb.js started without loading the site CRS");
    }
    return api;
  } finally {
    prototype.initSRSChonk = original;
  }
}
