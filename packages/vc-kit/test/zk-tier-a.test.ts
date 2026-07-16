/**
 * Tier A verification (sm-25 deliverable 2) - decision 0012's MANDATORY
 * operand-anchor binding, exercised end-to-end with GENUINE UltraHonk proofs
 * (proved live in this suite; see zk-support.ts) and the full negative
 * matrix. SECURITY-CRITICAL: every negative test asserts rejection of a
 * scenario in which all OTHER gates pass - no test is vacuous.
 */

import { createNonceStore } from "@mortgage/solid-kit/auth/api";
import { beforeAll, describe, expect, it } from "vitest";
import type { IssuedCredential, TierAProof, VerifyTierAOptions } from "../src/index.js";
import { verifyTierA } from "../src/index.js";
import { ISSUER, NOW, resolveIssuerKey, SUBJECT } from "./support.js";
import {
  type AnchorRig,
  anchorRig,
  encOf,
  forgedIncomeProof,
  INCOME_STATEMENT,
  incomeProof,
  NONCE_FORGED,
  NONCE_INCOME,
  NONCE_SCORE,
  oneShotNonce,
  SCORE_STATEMENT,
  scoreProof,
} from "./zk-support.js";

const PROVE_TIMEOUT = 180_000;
const SESSION = "session-1";

let rig: AnchorRig;
let anchor8500: IssuedCredential;
let proof8500: TierAProof;

/** Baseline options: every gate passes unless a test overrides one input. */
function baseOptions(overrides: Partial<VerifyTierAOptions> = {}): VerifyTierAOptions {
  return {
    statement: INCOME_STATEMENT,
    anchorVc: anchor8500.body,
    webid: SUBJECT,
    nonce: NONCE_INCOME,
    nonces: oneShotNonce(SESSION, NONCE_INCOME),
    sessionKey: SESSION,
    now: NOW,
    trustedIssuers: [ISSUER],
    resolveKey: resolveIssuerKey,
    statusFetch: rig.host.fetch,
    ...overrides,
  };
}

beforeAll(async () => {
  rig = await anchorRig();
  anchor8500 = await rig.issue(); // genuine anchor: income field, enc(8500), SUBJECT
  proof8500 = await incomeProof();
}, PROVE_TIMEOUT);

describe("verifyTierA - acceptance", () => {
  it("accepts a live proof bound to its issuer-signed operand anchor", async () => {
    const result = await verifyTierA(proof8500, baseOptions());
    expect(result.errors).toEqual([]);
    expect(result.verified).toBe(true);
    expect(result.checks).toEqual({
      structural: true,
      nonce: true,
      challenge: true,
      statement: true,
      anchor: true,
      subject: true,
      field: true,
      operandBinding: true,
      proof: true,
    });
    expect(result.anchor?.verified).toBe(true);
    expect(result.anchor?.credential?.issuer).toBe(ISSUER);
  });

  it(
    "accepts the score statement over filter_int_d3 with its own anchor",
    async () => {
      const proof = await scoreProof();
      const anchor = await rig.issue({
        field: SCORE_STATEMENT.field,
        operandEnc: encOf(742),
        index: 9,
      });
      const result = await verifyTierA(proof, {
        ...baseOptions({
          statement: SCORE_STATEMENT,
          anchorVc: anchor.body,
          nonce: NONCE_SCORE,
          nonces: oneShotNonce(SESSION, NONCE_SCORE),
        }),
      });
      expect(result.errors).toEqual([]);
      expect(result.verified).toBe(true);
    },
    PROVE_TIMEOUT,
  );

  it(
    "works against the real solid-kit NonceStore seam",
    async () => {
      // The real store mints its own nonce, so the proof must be produced for
      // it - this is the one test that pays a fresh prove against a live mint.
      const store = createNonceStore({ now: () => NOW.getTime() });
      const nonce = store.mint(SESSION);
      const { proveTierA } = await import("../src/index.js");
      const proof = await proveTierA({
        statement: INCOME_STATEMENT,
        value: 8500,
        operandEnc: encOf(8500),
        nonce,
      });
      const first = await verifyTierA(proof, baseOptions({ nonce, nonces: store }));
      expect(first.verified).toBe(true);
      // REPLAY (negative 2): the identical, previously-accepted presentation
      // must reject - the challenge is single-use and was burned.
      const replay = await verifyTierA(proof, baseOptions({ nonce, nonces: store }));
      expect(replay.verified).toBe(false);
      expect(replay.errors[0]?.code).toBe("NONCE_INVALID");
    },
    PROVE_TIMEOUT,
  );
});

describe("verifyTierA - the negative matrix (every scenario must REJECT)", () => {
  it(
    "FORGEABILITY REGRESSION (decision 0012): a valid proof over a self-minted encoding with a genuine anchor for the real value",
    async () => {
      // The adversary's true income is 6500 (< 7000). Their issuer honestly
      // anchored enc(6500). Because operand_enc is deterministic and salt-free,
      // the adversary computes enc(9999) themselves and honestly proves
      // 9999 >= 7000 - a VALID UltraHonk proof, fresh nonce, genuine anchor VC,
      // correct subject, correct field. ONLY the anchor-equality gate stands
      // between this and a pre-qualification: it must reject, always.
      const forged = await forgedIncomeProof();
      const genuineAnchorForRealIncome = await rig.issue({
        operandEnc: encOf(6500),
        index: 11,
      });
      const result = await verifyTierA(forged, {
        ...baseOptions({
          anchorVc: genuineAnchorForRealIncome.body,
          nonce: NONCE_FORGED,
          nonces: oneShotNonce(SESSION, NONCE_FORGED),
        }),
      });
      expect(result.verified).toBe(false);
      expect(result.errors[0]?.code).toBe("ANCHOR_OPERAND_MISMATCH");
      // Everything up to the binding gate genuinely passed - the test is not
      // rejecting for some incidental reason.
      expect(result.checks.anchor).toBe(true);
      expect(result.checks.subject).toBe(true);
      expect(result.checks.field).toBe(true);
      expect(result.checks.operandBinding).toBe(false);
    },
    PROVE_TIMEOUT,
  );

  it("wrong nonce: the presented nonce is not the session's live challenge", async () => {
    const result = await verifyTierA(proof8500, {
      ...baseOptions({ nonces: oneShotNonce(SESSION, "a-different-nonce") }),
    });
    expect(result.verified).toBe(false);
    expect(result.errors[0]?.code).toBe("NONCE_INVALID");
  });

  it("stolen-challenge: a proof produced for ANOTHER nonce, presented with the live one", async () => {
    // The store accepts the live nonce, but the proof's baked-in challenge
    // public input is NONCE_INCOME's field form, not the live nonce's.
    const live = "freshly-minted-other-nonce";
    const result = await verifyTierA(proof8500, {
      ...baseOptions({ nonce: live, nonces: oneShotNonce(SESSION, live) }),
    });
    expect(result.verified).toBe(false);
    expect(result.errors[0]?.code).toBe("CHALLENGE_MISMATCH");
  });

  it("revoked anchor: the issuer set the anchor's status bit", async () => {
    const revokedAnchor = await rig.issue({ index: 13 });
    await rig.revoke(13);
    const result = await verifyTierA(proof8500, {
      ...baseOptions({ anchorVc: revokedAnchor.body }),
    });
    expect(result.verified).toBe(false);
    expect(result.errors[0]?.code).toBe("ANCHOR_INVALID");
    expect(result.errors[0]?.message).toContain("STATUS_REVOKED");
  });

  it("unreachable status list fails closed", async () => {
    const result = await verifyTierA(proof8500, {
      ...baseOptions({
        statusFetch: async () => new Response("boom", { status: 500 }),
      }),
    });
    expect(result.verified).toBe(false);
    expect(result.errors[0]?.code).toBe("ANCHOR_INVALID");
  });

  it("wrong-subject anchor: anchored to a different WebID than the presenter", async () => {
    const foreignAnchor = await rig.issue({
      subject: "https://mallory.example/profile/card#me",
      index: 15,
    });
    const result = await verifyTierA(proof8500, {
      ...baseOptions({ anchorVc: foreignAnchor.body }),
    });
    expect(result.verified).toBe(false);
    expect(result.errors[0]?.code).toBe("ANCHOR_SUBJECT_MISMATCH");
  });

  it("presenter WebID does not match the anchor subject", async () => {
    const result = await verifyTierA(proof8500, {
      ...baseOptions({ webid: "https://mallory.example/profile/card#me" }),
    });
    expect(result.verified).toBe(false);
    expect(result.errors[0]?.code).toBe("ANCHOR_SUBJECT_MISMATCH");
  });

  it("wrong-field anchor: anchors the credit-score field, not the income statement's", async () => {
    // Same operandEnc, same subject, valid signature - but the issuer signed
    // it for creditScoreValue. An income statement must not consume it.
    const wrongFieldAnchor = await rig.issue({
      field: SCORE_STATEMENT.field,
      operandEnc: encOf(8500),
      index: 17,
    });
    const result = await verifyTierA(proof8500, {
      ...baseOptions({ anchorVc: wrongFieldAnchor.body }),
    });
    expect(result.verified).toBe(false);
    expect(result.errors[0]?.code).toBe("ANCHOR_FIELD_MISMATCH");
  });

  it("expired anchor rejects", async () => {
    const expiredAnchor = await rig.issue({
      index: 19,
      validity: {
        validFrom: new Date(NOW.getTime() - 60 * 24 * 3600 * 1000),
        validUntil: new Date(NOW.getTime() - 30 * 24 * 3600 * 1000),
      },
    });
    const result = await verifyTierA(proof8500, {
      ...baseOptions({ anchorVc: expiredAnchor.body }),
    });
    expect(result.verified).toBe(false);
    expect(result.errors[0]?.code).toBe("ANCHOR_INVALID");
    expect(result.errors[0]?.message).toContain("EXPIRED");
  });

  it("untrusted anchor issuer rejects", async () => {
    const result = await verifyTierA(proof8500, {
      ...baseOptions({ trustedIssuers: ["https://someone-else.example/org"] }),
    });
    expect(result.verified).toBe(false);
    expect(result.errors[0]?.code).toBe("ANCHOR_INVALID");
    expect(result.errors[0]?.message).toContain("UNTRUSTED_ISSUER");
  });

  it(
    "tampered anchor document: signature must not survive an operandEnc edit",
    async () => {
      // Splice the ADVERSARY's encoding into the genuine anchor body - the
      // eddsa-rdfc-2022 proof must fail.
      const tamperedBody = anchor8500.body.replace(encOf(8500), encOf(9999));
      expect(tamperedBody).not.toBe(anchor8500.body);
      const forged = await forgedIncomeProof();
      const result = await verifyTierA(forged, {
        ...baseOptions({
          anchorVc: tamperedBody,
          nonce: NONCE_FORGED,
          nonces: oneShotNonce(SESSION, NONCE_FORGED),
        }),
      });
      expect(result.verified).toBe(false);
      expect(result.errors[0]?.code).toBe("ANCHOR_INVALID");
      expect(result.errors[0]?.message).toContain("INVALID_SIGNATURE");
    },
    PROVE_TIMEOUT,
  );

  it("tampered proof bytes reject", async () => {
    const tampered = Uint8Array.from(proof8500.proof);
    tampered[100] = (tampered[100] ?? 0) ^ 0xff;
    const result = await verifyTierA({ ...proof8500, proof: tampered }, baseOptions());
    expect(result.verified).toBe(false);
    expect(result.errors[0]?.code).toBe("PROOF_INVALID");
    // The tamper is only detectable cryptographically - all prior gates pass.
    expect(result.checks.operandBinding).toBe(true);
  });

  it("tampered public inputs reject (operand swap breaks the transcript)", async () => {
    // Swap the operand_enc public input to the adversary encoding AND present
    // a matching anchor - the transcript no longer matches the proof.
    const swappedAnchor = await rig.issue({ operandEnc: encOf(9999), index: 21 });
    const inputs = [...proof8500.publicInputs];
    inputs[1] = encOf(9999);
    const result = await verifyTierA(
      { ...proof8500, publicInputs: inputs },
      baseOptions({ anchorVc: swappedAnchor.body }),
    );
    expect(result.verified).toBe(false);
    expect(result.errors[0]?.code).toBe("PROOF_INVALID");
  });

  it("*-no-zk flavours are rejected before any cryptography runs", async () => {
    for (const flavour of ["evm-no-zk", "noir-recursive-no-zk", "starknet-no-zk", "poseidon2"]) {
      const result = await verifyTierA({ ...proof8500, verifierTarget: flavour }, baseOptions());
      expect(result.verified).toBe(false);
      expect(result.errors[0]?.code).toBe("FORBIDDEN_FLAVOUR");
    }
  });

  it("unknown circuit members are rejected", async () => {
    const result = await verifyTierA({ ...proof8500, member: "filter_int_d9" }, baseOptions());
    expect(result.verified).toBe(false);
    expect(result.errors[0]?.code).toBe("UNKNOWN_MEMBER");
  });

  it("a member wider than the statement field's digit budget is rejected", async () => {
    // A d4 proof presented for the 3-digit credit-score budget.
    const result = await verifyTierA(proof8500, {
      ...baseOptions({ statement: SCORE_STATEMENT }),
    });
    expect(result.verified).toBe(false);
    expect(result.errors[0]?.code).toBe("MEMBER_BUDGET_MISMATCH");
  });

  it("wrong public-input count is rejected", async () => {
    const result = await verifyTierA(
      { ...proof8500, publicInputs: proof8500.publicInputs.slice(0, 4) },
      baseOptions(),
    );
    expect(result.verified).toBe(false);
    expect(result.errors[0]?.code).toBe("MALFORMED_PROOF");
  });

  it("a bound different from the advertised statement is rejected", async () => {
    const result = await verifyTierA(proof8500, {
      ...baseOptions({ statement: { ...INCOME_STATEMENT, bound: 6000 } }),
    });
    expect(result.verified).toBe(false);
    expect(result.errors[0]?.code).toBe("STATEMENT_MISMATCH");
  });

  it("an unknown statement field is rejected", async () => {
    const result = await verifyTierA(proof8500, {
      ...baseOptions({
        statement: { ...INCOME_STATEMENT, field: "https://example.org/not-a-zk-field" },
      }),
    });
    expect(result.verified).toBe(false);
    expect(result.errors[0]?.code).toBe("UNKNOWN_FIELD");
  });

  it("an omitted/empty issuer allowlist fails closed (never accepts any issuer)", async () => {
    for (const bad of [
      [] as string[],
      undefined as unknown as string[],
      "https://issuer.example/org" as unknown as string[],
    ]) {
      const result = await verifyTierA(proof8500, {
        ...baseOptions({ trustedIssuers: bad }),
      });
      expect(result.verified).toBe(false);
      expect(result.errors[0]?.code).toBe("ANCHOR_INVALID");
      expect(result.errors[0]?.message).toContain("allowlist");
      // Rejected at gate 0 - before the nonce is even consulted.
      expect(result.checks.structural).toBe(false);
    }
  });

  it("an invalid `now` fails closed (a NaN instant must not bypass the window)", async () => {
    const result = await verifyTierA(proof8500, {
      ...baseOptions({ now: new Date("not-a-date") }),
    });
    expect(result.verified).toBe(false);
    expect(result.errors[0]?.code).toBe("ANCHOR_INVALID");
    expect(result.errors[0]?.message).toContain("valid Date");
  });

  it("an oversized proof payload is rejected before verification", async () => {
    const result = await verifyTierA(
      { ...proof8500, proof: new Uint8Array(131_073) },
      baseOptions(),
    );
    expect(result.verified).toBe(false);
    expect(result.errors[0]?.code).toBe("MALFORMED_PROOF");
  });

  it("a failed attempt burns the challenge: no second try on the same nonce", async () => {
    const nonces = oneShotNonce(SESSION, NONCE_INCOME);
    const foreignAnchor = await rig.issue({
      subject: "https://mallory.example/profile/card#me",
      index: 23,
    });
    const attempt = await verifyTierA(proof8500, {
      ...baseOptions({ nonces, anchorVc: foreignAnchor.body }),
    });
    expect(attempt.verified).toBe(false);
    // Retry with everything corrected - but the nonce is gone.
    const retry = await verifyTierA(proof8500, { ...baseOptions({ nonces }) });
    expect(retry.verified).toBe(false);
    expect(retry.errors[0]?.code).toBe("NONCE_INVALID");
  });
});
