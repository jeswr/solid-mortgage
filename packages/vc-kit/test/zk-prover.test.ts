/**
 * Tier A prover (sm-25 deliverable 1): live proving over the committed
 * filter_int_d3/d4 artifacts with the pinned toolchain, decision-0005 budget
 * gates BEFORE proving, exact-width member derivation, and the honest
 * unsatisfiability of false claims. Proving runs for real in this suite
 * (Node, single-threaded bb.js) - see zk-support.ts for the once-per-scenario
 * cache and measured timings.
 */

import { MORT } from "@mortgage/data-model";
import { describe, expect, it } from "vitest";
import {
  COMMITTED_MEMBERS,
  challengeFieldOf,
  loadCommittedCircuit,
  PINNED_NARGO_VERSION,
  proveTierA,
  tierAProofFromJson,
  tierAProofToJson,
  ZkError,
} from "../src/index.js";
import {
  encOf,
  INCOME_STATEMENT,
  incomeProof,
  NONCE_INCOME,
  SCORE_STATEMENT,
  scoreProof,
} from "./zk-support.js";

const PROVE_TIMEOUT = 120_000;

describe("committed circuit artifacts", () => {
  it("every committed member carries the pinned nargo version", async () => {
    for (const member of COMMITTED_MEMBERS) {
      const artifact = await loadCommittedCircuit(member);
      expect(artifact.noir_version.startsWith(PINNED_NARGO_VERSION)).toBe(true);
      expect(artifact.bytecode.length).toBeGreaterThan(0);
    }
  });
});

describe("proveTierA", () => {
  it(
    "proves income >= 7000 over a hidden 8500 with filter_int_d4 - live, full-ZK flavour",
    async () => {
      const proof = await incomeProof();
      expect(proof.member).toBe("filter_int_d4");
      expect(proof.verifierTarget).toBe("evm");
      // The evm flavour's wire size (14 656 B for the default flavour).
      expect(proof.proof.length).toBe(8384);
      expect(proof.publicInputs).toHaveLength(5);
      // Public inputs are [challenge, operand_enc, op, bound, expected] - and
      // the HIDDEN value appears in none of them.
      expect(proof.publicInputs[0]).toBe(await challengeFieldOf(NONCE_INCOME));
      expect(BigInt(proof.publicInputs[1] ?? "0x0")).toBe(BigInt(encOf(8500)));
      expect(BigInt(proof.publicInputs[2] ?? "0x0")).toBe(3n); // OP_GE
      expect(BigInt(proof.publicInputs[3] ?? "0x0")).toBe(7000n);
      expect(BigInt(proof.publicInputs[4] ?? "0x0")).toBe(1n); // verdict TRUE
      for (const input of proof.publicInputs) {
        expect(BigInt(input)).not.toBe(8500n);
      }
    },
    PROVE_TIMEOUT,
  );

  it(
    "proves score >= 620 over a hidden 742 with filter_int_d3",
    async () => {
      const proof = await scoreProof();
      expect(proof.member).toBe("filter_int_d3");
      expect(proof.publicInputs).toHaveLength(5);
      expect(BigInt(proof.publicInputs[3] ?? "0x0")).toBe(620n);
    },
    PROVE_TIMEOUT,
  );

  it(
    "a FALSE claim is unsatisfiable - no proof exists for 6500 >= 7000",
    async () => {
      await expect(
        proveTierA({
          statement: INCOME_STATEMENT,
          value: 6500,
          operandEnc: encOf(6500),
          nonce: "any-nonce",
        }),
      ).rejects.toMatchObject({ code: "UNSATISFIABLE" });
    },
    PROVE_TIMEOUT,
  );

  it(
    "a mismatched operandEnc is unsatisfiable - the circuit binds the hidden digits to the encoding",
    async () => {
      await expect(
        proveTierA({
          statement: INCOME_STATEMENT,
          value: 8500,
          operandEnc: encOf(742), // not the encoding of 8500
          nonce: "any-nonce",
        }),
      ).rejects.toMatchObject({ code: "UNSATISFIABLE" });
    },
    PROVE_TIMEOUT,
  );

  it("refuses a field outside the decision-0005 budgets", async () => {
    await expect(
      proveTierA({
        statement: { field: MORT.accountLast4, op: "ge", bound: 1 },
        value: 8500,
        operandEnc: encOf(8500),
        nonce: "n",
      }),
    ).rejects.toMatchObject({ code: "UNKNOWN_FIELD" });
  });

  it("refuses values outside the field budget BEFORE proving", async () => {
    await expect(
      proveTierA({
        statement: INCOME_STATEMENT,
        value: 15_000, // 5 digits - over the 4-digit income budget
        operandEnc: encOf(8500),
        nonce: "n",
      }),
    ).rejects.toMatchObject({ code: "BUDGET_VIOLATION" });
    await expect(
      proveTierA({
        statement: SCORE_STATEMENT,
        value: 250, // below the 300 score floor
        operandEnc: encOf(742),
        nonce: "n",
      }),
    ).rejects.toMatchObject({ code: "BUDGET_VIOLATION" });
    await expect(
      proveTierA({
        statement: { ...INCOME_STATEMENT, bound: 123_456 }, // bound over budget
        value: 8500,
        operandEnc: encOf(8500),
        nonce: "n",
      }),
    ).rejects.toMatchObject({ code: "BUDGET_VIOLATION" });
  });

  it("refuses a digit count with no committed member (clean error, never a wrong member)", async () => {
    await expect(
      proveTierA({
        statement: INCOME_STATEMENT,
        value: 5, // 1 digit: in budget, but no committed filter_int_d1
        operandEnc: encOf(8500),
        nonce: "n",
      }),
    ).rejects.toMatchObject({ code: "NO_COMMITTED_MEMBER" });
  });

  it("refuses a malformed operandEnc", async () => {
    await expect(
      proveTierA({
        statement: INCOME_STATEMENT,
        value: 8500,
        operandEnc: "not-hex",
        nonce: "n",
      }),
    ).rejects.toMatchObject({ code: "MALFORMED_FIELD" });
  });
});

describe("wire codec", () => {
  it(
    "round-trips a proof through JSON",
    async () => {
      const proof = await incomeProof();
      const parsed = tierAProofFromJson(JSON.parse(JSON.stringify(tierAProofToJson(proof))));
      expect(parsed.member).toBe(proof.member);
      expect(parsed.verifierTarget).toBe("evm");
      expect([...parsed.proof]).toEqual([...proof.proof]);
      expect(parsed.publicInputs).toEqual([...proof.publicInputs]);
    },
    PROVE_TIMEOUT,
  );

  it("rejects malformed payloads", () => {
    expect(() => tierAProofFromJson(null)).toThrow(ZkError);
    expect(() => tierAProofFromJson({})).toThrow(ZkError);
    expect(() =>
      tierAProofFromJson({
        member: "filter_int_d4",
        verifierTarget: "evm",
        proof: [],
        publicInputs: [],
      }),
    ).toThrow(/byte array/);
    expect(() =>
      tierAProofFromJson({
        member: "filter_int_d4",
        verifierTarget: "evm",
        proof: [1, 2, 999],
        publicInputs: [],
      }),
    ).toThrow(/byte array/);
  });
});
