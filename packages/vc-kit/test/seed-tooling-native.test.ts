/**
 * sm-26 - INTEGRATION coverage of the real native bridge: builds and runs the
 * `scripts/sparq-helper` Rust binary against a local sparq checkout and
 * asserts its outputs are byte-identical to the committed fixtures (which
 * were captured the same way - fixtures/PROVENANCE.json).
 *
 * Gated: needs `SPARQ_CHECKOUT` + cargo on PATH. Skipped otherwise (CI runs
 * without the Rust toolchain; `capture:fixtures` exercises this path too).
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEMO_OPERAND_VALUES,
  DEMO_ZK_STATUS,
  defaultIndexBlindingHex,
  defaultSaltHex,
  SparqSeedHelper,
} from "../src/seed-tooling/index.js";

const SPARQ_CHECKOUT = process.env.SPARQ_CHECKOUT;

function cargoAvailable(): boolean {
  try {
    execFileSync("cargo", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const enabled = SPARQ_CHECKOUT !== undefined && SPARQ_CHECKOUT !== "" && cargoAvailable();
// First build compiles the sparq crates - allow plenty.
const NATIVE_TIMEOUT = 15 * 60 * 1000;

describe.skipIf(!enabled)("SparqSeedHelper (native, gated on SPARQ_CHECKOUT)", () => {
  const fixture = (name: string) =>
    JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", name), "utf8"));

  it(
    "reproduces the committed operand encodings and attestation shape",
    async () => {
      const helper = new SparqSeedHelper({ sparqCheckout: SPARQ_CHECKOUT ?? "" });
      const committed = fixture("operand-enc.json") as {
        provenance: { sparqCommit: string };
        encodings: Record<string, string>;
      };
      const result = await helper.run({ encodeInts: [...DEMO_OPERAND_VALUES] });
      expect(result.encodings).toEqual(committed.encodings);

      // Attestation determinism: same graph + salt + seed => same signature.
      const ntriples =
        '<https://alex.example/credentials/income> <https://www.w3.org/2018/credentials#credentialSubject> <https://alex.example/profile/card#me> .\n<https://alex.example/profile/card#me> <https://solid-mortgage-vocab.vercel.app/mort#monthlyGrossIncomeUsd> "8500"^^<http://www.w3.org/2001/XMLSchema#integer> .\n';
      const status = {
        ...DEMO_ZK_STATUS.employment,
        indexBlindingHex: defaultIndexBlindingHex(DEMO_ZK_STATUS.employment),
      };
      const job = {
        credentials: [
          {
            name: "employment",
            ntriples,
            saltHex: defaultSaltHex("https://alex.example/credentials/income"),
            issuerSeed: 4101,
            status,
          },
        ],
      };
      const first = await helper.run(job);
      const second = await helper.run(job);
      expect(first.attestations.employment).toEqual(second.attestations.employment);
      expect(first.attestations.employment?.cryptosuite).toBe(
        "https://sparq.dev/ns/zk#poseidon2-schnorr-v1",
      );
      expect(first.attestations.employment?.commitment).toMatch(/^0x[0-9a-f]{64}$/);
    },
    NATIVE_TIMEOUT,
  );
});
