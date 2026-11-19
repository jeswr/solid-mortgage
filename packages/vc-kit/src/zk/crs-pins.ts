// AUTHORED-BY Claude Opus 5.5
/**
 * The pins for the CRS files the site serves (see crs.ts): their names, exact lengths and SHA-256.
 * This module imports nothing, so the site tools (tools/build-site.mjs, tools/site-routes.mjs)
 * import it directly with Node's type stripping and check and serve exactly these files. vc-kit
 * checks every file against the same pins when it loads it.
 */

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

/** Every file the site serves under {@link CRS_PATH}, and no other (`packages/vc-kit/crs/`, copied by the site build). */
export const CRS_FILES: readonly PinnedCrsFile[] = Object.freeze([CRS_G1, CRS_G2]);

/** Where on its own origin the site serves the CRS files. */
export const CRS_PATH = "/crs/";
