/**
 * sm-26 - the Node bridge into sparq's NATIVE seed-time tooling.
 *
 * Everything cryptographic (Poseidon2 graph commitments, Schnorr-over-Baby-
 * JubJub attestations, `encode_int_literal` term encodings, Merkle roots,
 * circuit witness assembly) runs inside `scripts/sparq-helper`, a Rust binary
 * built on demand against a LOCAL sparq checkout (decisions 0004/0012: never
 * reimplement Poseidon2/Schnorr in JS). This module only locates the
 * checkout, builds/spawns the helper, and marshals JSON.
 *
 * Node-only (`node:child_process` etc.) - exported via the package's
 * `./seed-tooling` entry, NEVER from the browser-safe root export.
 */

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { CompiledCircuitArtifact } from "../zk/circuits/registry.js";
import { assertCircuitArtifact, PINNED_NARGO_VERSION } from "../zk/circuits/registry.js";

const execFileAsync = promisify(execFile);

/** Thrown for every native-toolchain failure (missing checkout, build, run). */
export class SeedToolingError extends Error {
  override readonly name: string = "SeedToolingError";
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

// ── job / result shapes (mirror scripts/sparq-helper/src/main.rs, serde camelCase) ──

export interface SparqZkStatusInput {
  /** IRI of the ZK rail's own Schnorr-bound status list (decision 0012). */
  readonly listIri: string;
  /** The credential's CLEAR index (borrower-only witness data). */
  readonly index: number;
  readonly version: number;
  /** Blinding for the HIDING index commitment, 0x field hex. */
  readonly indexBlindingHex: string;
}

export interface SparqCredentialInput {
  /** Handle referenced by `composite`. */
  readonly name: string;
  /** The SIGNED credential subset (claim graph, no eddsa proof) as N-Triples. */
  readonly ntriples: string;
  /** Per-graph RDFC10 bnode salt, 0x field hex. */
  readonly saltHex: string;
  /** Deterministic DEMO issuer key seed (`SecretKey::from_seed` - not production). */
  readonly issuerSeed: number;
  readonly status: SparqZkStatusInput;
}

export interface SparqCompositeInput {
  /** The capture-time challenge as 0x field hex (derive via `challengeFieldOf`). */
  readonly challengeHex: string;
  readonly join: {
    readonly a: string;
    readonly b: string;
    readonly slotA: number;
    readonly slotB: number;
    readonly blindingHex: string;
  };
  readonly revoke: {
    readonly credential: string;
    readonly depth: number;
    readonly size: number;
    readonly revokedIndices: readonly number[];
  };
  readonly hiddenIssuer: {
    readonly issuerSeeds: readonly number[];
    readonly credential: string;
    readonly depth: number;
  };
}

export interface SparqSeedJob {
  readonly encodeInts?: readonly number[];
  readonly credentials?: readonly SparqCredentialInput[];
  readonly composite?: SparqCompositeInput;
}

/** A Schnorr-BJJ dual-sign attestation (sparq `CommitmentAttestation` shape). */
export interface SparqAttestation {
  /** Poseidon2 commitment `C(G)` over the RDFC-1.0 canonical claim graph. */
  readonly commitment: string;
  readonly salt: string;
  /** Compressed Baby-JubJub issuer verification key, hex. */
  readonly issuerPublicKey: string;
  /** Schnorr signature over the status-bound commitment message. */
  readonly signature: string;
  /** `https://sparq.dev/ns/zk#poseidon2-schnorr-v1`. */
  readonly cryptosuite: string;
  /** The exact signed message field (`m` of `hidden_issuer_d4`). */
  readonly message: string;
  readonly canonicalTriples: number;
  readonly status: {
    readonly listIri: string;
    readonly version: number;
    /** HIDING commitment to the index (the clear index is never in here). */
    readonly indexCommitment: string;
  };
}

export interface SparqSubRelation {
  /** Compiled circuit member (sparq `CircuitId::package()` naming). */
  readonly member: string;
  /** `[name, value]` public inputs in the member's ABI declaration order. */
  readonly publicInputs: readonly (readonly [string, string])[];
  /** Full Prover.toml body (public + PRIVATE witness) for noir_js execution. */
  readonly proverToml: string;
}

export interface SparqSeedResult {
  readonly encodings: Readonly<Record<string, string>>;
  readonly attestations: Readonly<Record<string, SparqAttestation>>;
  readonly composite?: {
    readonly challenge: string;
    readonly join: SparqSubRelation;
    readonly revoke: SparqSubRelation;
    readonly hiddenIssuer: SparqSubRelation;
    readonly context: SparqCompositeContext;
  };
}

/** Verifier-side trust-anchor material the composite build discloses. */
export interface SparqCompositeContext {
  /**
   * The ISSUER-AUTHENTICATED status-list snapshot reference (decision 0012's
   * Schnorr-bound ZK list): `rootSignature` is a Schnorr-BJJ signature over
   * sparq's `accepted_status_leaf(H(iri), version, root)` digest, so a
   * verifier can authenticate the exact (list, version, root) the revocation
   * proof was built against - a prover cannot substitute an all-unset
   * snapshot of their own making. Signature verification is native tooling
   * (Poseidon2/Schnorr are not reimplemented in JS).
   *
   * TRUST MODEL (roborev 5560): `issuerPublicKey` here is INFORMATIVE - a
   * document that carried both signature and key would otherwise
   * self-authenticate. A verifier MUST resolve the list issuer's key from
   * its own trust store (issuer registry / pinned key-set) and verify
   * `rootSignature` against THAT key. In this demo the list issuer is the
   * credential issuer (each issuer maintains its own revocation list).
   */
  readonly statusList: {
    readonly iri: string;
    readonly version: number;
    readonly root: string;
    readonly rootSignature: string;
    readonly issuerPublicKey: string;
    readonly cryptosuite: string;
  };
  readonly issuerKeySetRoot: string;
  readonly issuerKeySet: readonly string[];
  readonly joinRelation: string;
}

/**
 * The seam tests stub: anything that can answer a {@link SparqSeedJob}.
 * Production/capture use {@link SparqSeedHelper}; unit tests inject canned
 * results captured from the real helper (fixtures with provenance).
 */
export interface SparqNativeBridge {
  run(job: SparqSeedJob): Promise<SparqSeedResult>;
}

export interface SparqSeedHelperOptions {
  /** Path to a local sparq checkout (jeswr/sparq). REQUIRED - no default. */
  readonly sparqCheckout: string;
  /** Override the helper crate directory (defaults to scripts/sparq-helper). */
  readonly helperDir?: string;
  /** Forward cargo/nargo output to stderr (default true - builds are long). */
  readonly verbose?: boolean;
}

const HELPER_BINARY = join("target", "release", "sparq-seed-helper");

/**
 * Builds and runs the `scripts/sparq-helper` binary against a local sparq
 * checkout. The checkout is wired in via the `.sparq` symlink (the committed
 * Cargo.toml path-deps resolve through it), so the checkout path never
 * appears in committed files.
 */
export class SparqSeedHelper implements SparqNativeBridge {
  readonly #checkout: string;
  readonly #helperDir: string;
  readonly #verbose: boolean;
  #built: Promise<void> | undefined;

  constructor(options: SparqSeedHelperOptions) {
    if (!options.sparqCheckout || !existsSync(options.sparqCheckout)) {
      throw new SeedToolingError(
        "NO_SPARQ_CHECKOUT",
        `sparqCheckout does not exist: ${String(options.sparqCheckout)} - clone jeswr/sparq and pass its path (SPARQ_CHECKOUT)`,
      );
    }
    this.#checkout = options.sparqCheckout;
    this.#helperDir =
      options.helperDir ?? fileURLToPath(new URL("../../scripts/sparq-helper", import.meta.url));
    this.#verbose = options.verbose ?? true;
  }

  /** The sparq checkout commit (for PROVENANCE records). */
  async sparqCommit(): Promise<string> {
    const { stdout } = await execFileAsync("git", ["-C", this.#checkout, "rev-parse", "HEAD"]);
    return stdout.trim();
  }

  /** Symlink the checkout + `cargo build --release` (idempotent, memoised). */
  build(): Promise<void> {
    this.#built ??= this.#doBuild().catch((error: unknown) => {
      this.#built = undefined;
      throw error;
    });
    return this.#built;
  }

  async #doBuild(): Promise<void> {
    const link = join(this.#helperDir, ".sparq");
    await rm(link, { force: true });
    await symlink(this.#checkout, link, "dir");
    try {
      await execFileAsync("cargo", ["build", "--release"], {
        cwd: this.#helperDir,
        maxBuffer: 64 * 1024 * 1024,
      });
    } catch (error) {
      throw new SeedToolingError(
        "HELPER_BUILD_FAILED",
        `cargo build of scripts/sparq-helper failed - is the Rust toolchain installed and the sparq checkout intact? ${(error as Error).message}`,
      );
    }
  }

  async run(job: SparqSeedJob): Promise<SparqSeedResult> {
    await this.build();
    const binary = join(this.#helperDir, HELPER_BINARY);
    const child = execFile(binary, [], { maxBuffer: 256 * 1024 * 1024 });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout?.on("data", (chunk: Buffer) => stdout.push(Buffer.from(chunk)));
    child.stderr?.on("data", (chunk: Buffer) => stderr.push(Buffer.from(chunk)));
    child.stdin?.end(JSON.stringify(job));
    const code = await new Promise<number>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (status) => resolve(status ?? 1));
    });
    if (code !== 0) {
      throw new SeedToolingError(
        "HELPER_FAILED",
        `sparq-seed-helper exited ${code}: ${Buffer.concat(stderr).toString("utf8").trim()}`,
      );
    }
    return JSON.parse(Buffer.concat(stdout).toString("utf8")) as SparqSeedResult;
  }

  /**
   * Compile circuit members from the checkout's `zk/compose` Noir workspace
   * with the PINNED nargo, in a copy under `workDir` (the checkout itself is
   * never written to). Returns slim artifacts (`noir_version`/`abi`/
   * `bytecode` (+`hash`)) - `debug_symbols`/`file_map` are stripped: unused
   * by noir_js/bb.js and full of build-machine paths.
   */
  async compileCircuits(
    members: readonly string[],
    workDir: string,
  ): Promise<Record<string, CompiledCircuitArtifact>> {
    let nargoVersion: string;
    try {
      ({ stdout: nargoVersion } = await execFileAsync("nargo", ["--version"]));
    } catch {
      throw new SeedToolingError("NO_NARGO", "nargo is not on PATH - install the pinned Noir");
    }
    if (!nargoVersion.includes(PINNED_NARGO_VERSION)) {
      throw new SeedToolingError(
        "NARGO_PIN_MISMATCH",
        `nargo is not the pinned ${PINNED_NARGO_VERSION} (decision 0005): ${nargoVersion.split("\n")[0]}`,
      );
    }
    // ALWAYS a fresh copy: a reused work dir could compile stale sources from
    // an earlier checkout/commit while provenance records the current one
    // (roborev 5554 finding 3).
    const compose = join(workDir, "zk-compose");
    await rm(compose, { recursive: true, force: true });
    await mkdir(workDir, { recursive: true });
    await cp(join(this.#checkout, "zk", "compose"), compose, { recursive: true });
    const artifacts: Record<string, CompiledCircuitArtifact> = {};
    for (const member of members) {
      await execFileAsync("nargo", ["compile", "--package", member], {
        cwd: compose,
        maxBuffer: 64 * 1024 * 1024,
      });
      const raw = JSON.parse(await readFile(join(compose, "target", `${member}.json`), "utf8")) as {
        noir_version: string;
        hash?: string;
        abi: unknown;
        bytecode: string;
      };
      const slim = {
        noir_version: raw.noir_version,
        ...(raw.hash !== undefined ? { hash: raw.hash } : {}),
        abi: raw.abi,
        bytecode: raw.bytecode,
      } as CompiledCircuitArtifact;
      assertCircuitArtifact(slim, member);
      artifacts[member] = slim;
    }
    return artifacts;
  }
}
