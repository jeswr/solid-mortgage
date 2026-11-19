// AUTHORED-BY Claude Opus 5.5
/**
 * The small-dollar lending additions (flows.md section 4), SECURITY-CRITICAL:
 *
 * - two credential kinds (cash flow, repayment history) issue shape-conformant, verify, and
 *   refuse bad input before anything is signed;
 * - the one-digit circuit member and the `eq` operator prove "no returned payments in 90 days"
 *   (nsf90Count = 0) for real, and the cash-flow score and income thresholds prove over d3/d4;
 * - each field's member range [minDigits, digits] is enforced by the prover AND the verifier, so
 *   the new one-digit member cannot be used for any mortgage field (whose behaviour is unchanged)
 *   or for the 3-digit cash-flow score;
 * - every lending proof passes the full decision-0012 anchor gate set, and the negative cases
 *   each fail with every other gate passing.
 */

import { MORT } from "@mortgage/data-model";
import { beforeAll, describe, expect, it, test } from "vitest";
import {
  CAPTURED_OPERAND_ENCODINGS,
  type CashFlowClaims,
  ClaimInputError,
  COMMITTED_MEMBERS,
  type IssuedCredential,
  IssueRefusedError,
  issueCredential,
  memberForDigits,
  OP_CODES,
  proveTierA,
  type RepaymentHistoryClaims,
  type StatusListClient,
  type TierAProof,
  type TierAStatement,
  verifyCredential,
  verifyTierA,
} from "../src/index.js";
import {
  BACKDATED_VALIDITY,
  hostedStatusList,
  ISSUER,
  issuerKey,
  NOW,
  resolveIssuerKey,
  type StubHost,
  SUBJECT,
  stubHost,
} from "./support.js";
import { encOf, oneShotNonce } from "./zk-support.js";

const PROVE_TIMEOUT = 180_000;
const SESSION = "lending-session";

export const NSF_STATEMENT: TierAStatement = { field: MORT.nsf90Count, op: "eq", bound: 0 };
export const CASH_FLOW_STATEMENT: TierAStatement = {
  field: MORT.cashFlowScoreValue,
  op: "ge",
  bound: 660,
};
export const LENDING_INCOME_STATEMENT: TierAStatement = {
  field: MORT.monthlyGrossIncomeUsd,
  op: "ge",
  bound: 2200,
};

function cashFlowClaims(overrides: Partial<CashFlowClaims> = {}): CashFlowClaims {
  return {
    accountLast4: "3318",
    averageDailyBalanceUsd: 940,
    balanceUsd: 1210.4,
    bankName: "Alder Bank",
    cashFlowScoreValue: 720,
    depositStreams: [
      { monthlyAmountUsd: 2380, name: "Brightline Staffing payroll" },
      { monthlyAmountUsd: 480, name: "Weekend delivery platform payouts" },
    ],
    kind: "cash-flow-credential",
    nsf90Count: 0,
    observationMonths: 6,
    ...overrides,
  };
}

function repaymentClaims(overrides: Partial<RepaymentHistoryClaims> = {}): RepaymentHistoryClaims {
  return {
    end: "2026-11-30",
    kind: "repayment-history-credential",
    late: 0,
    loanNumber: "FL-2048",
    onTime: 2,
    scheduled: 4,
    servicedLoan: "https://alex.example/loans/finchly/disclosure",
    start: "2026-11-02",
    ...overrides,
  };
}

let host: StubHost;
let list: StatusListClient;

beforeAll(async () => {
  host = stubHost();
  list = await hostedStatusList(host);
});

async function issue(
  kind: "cash-flow-credential" | "repayment-history-credential" | "zk-operand-anchor",
  claims: Parameters<typeof issueCredential>[0]["claims"],
  index: number,
): Promise<IssuedCredential> {
  return issueCredential({
    claims,
    credentialId: `https://alex.example/credentials/${kind}-${index}`,
    issuer: ISSUER,
    key: await issuerKey(),
    kind,
    status: list.entry(index),
    subject: SUBJECT,
    validity: BACKDATED_VALIDITY,
  });
}

describe("lending credential kinds", () => {
  test.each([
    ["cash-flow-credential", () => cashFlowClaims(), 101],
    ["repayment-history-credential", () => repaymentClaims(), 102],
  ] as const)("%s issues and verifies", { timeout: 30_000 }, async (kind, claims, index) => {
    const issued = await issue(kind, claims(), index);
    expect(issued.kind).toBe(kind);
    expect(issued.proof.cryptosuite).toBe("eddsa-rdfc-2022");
    const outcome = await verifyCredential(issued.body, {
      expectShape: kind,
      now: NOW,
      resolveKey: resolveIssuerKey,
      statusFetch: host.fetch,
    });
    expect(outcome.errors).toEqual([]);
    expect(outcome.verified).toBe(true);
  });

  test("the cash-flow credential carries both ZK fields as plain integers", async () => {
    const issued = await issue("cash-flow-credential", cashFlowClaims(), 103);
    expect(issued.body).toMatch(/nsf90Count> 0[;.]/);
    expect(issued.body).toMatch(/cashFlowScoreValue> 720[;.]/);
    expect(issued.body).toContain("ScoreModel-CashFlowV1");
  });

  test.each([
    ["a full account number", { accountLast4: "4111111111111111" }],
    ["an out-of-budget score", { cashFlowScoreValue: 851 }],
    ["an out-of-budget returned-payment count", { nsf90Count: 100 }],
    ["no deposit stream", { depositStreams: [] }],
  ] as const)("cash flow refuses %s before signing", async (_label, patch) => {
    await expect(issue("cash-flow-credential", cashFlowClaims(patch), 104)).rejects.toBeInstanceOf(
      ClaimInputError,
    );
  });

  test("repayment history refuses more payments than were scheduled", async () => {
    await expect(
      issue("repayment-history-credential", repaymentClaims({ late: 1, onTime: 4 }), 105),
    ).rejects.toBeInstanceOf(ClaimInputError);
  });

  test("repayment history refuses an unsafe loan IRI and a bad date", async () => {
    await expect(
      issue("repayment-history-credential", repaymentClaims({ servicedLoan: "x> <y" }), 106),
    ).rejects.toBeInstanceOf(ClaimInputError);
    await expect(
      issue("repayment-history-credential", repaymentClaims({ start: "2026-02-30" }), 107),
    ).rejects.toBeInstanceOf(ClaimInputError);
  });

  test("the shape refuses a reporting period that ends before it starts", async () => {
    await expect(
      issue("repayment-history-credential", repaymentClaims({ end: "2026-11-01" }), 108),
    ).rejects.toBeInstanceOf(IssueRefusedError);
  });

  test("a lending anchor issues for each new ZK field", async () => {
    for (const [field, value] of [
      [MORT.nsf90Count, 0],
      [MORT.cashFlowScoreValue, 720],
    ] as const) {
      const anchor = await issue(
        "zk-operand-anchor",
        { field, kind: "zk-operand-anchor", operandEnc: encOf(value) },
        110 + (value % 7),
      );
      expect(anchor.kind).toBe("zk-operand-anchor");
    }
  });
});

describe("the one-digit member and the eq operator", () => {
  it("commits filter_int_d1 first, with the eq operator code 4", () => {
    expect(COMMITTED_MEMBERS[0]).toBe("filter_int_d1");
    expect(memberForDigits(1)).toBe("filter_int_d1");
    expect(OP_CODES).toEqual({ eq: 4, ge: 3 });
  });

  it("captures the lending values at the same sparq commit", () => {
    for (const value of ["0", "660", "720", "2200", "2860"]) {
      expect(CAPTURED_OPERAND_ENCODINGS[value]).toMatch(/^0x[0-9a-f]{64}$/);
    }
  });
});

describe("prover member range", () => {
  it("refuses the one-digit member for a mortgage field (unchanged NO_COMMITTED_MEMBER)", async () => {
    await expect(
      proveTierA({
        nonce: "n",
        operandEnc: encOf(0),
        statement: LENDING_INCOME_STATEMENT,
        value: 0,
      }),
    ).rejects.toMatchObject({ code: "NO_COMMITTED_MEMBER" });
  });

  it("refuses an out-of-budget returned-payment count before proving", async () => {
    await expect(
      proveTierA({ nonce: "n", operandEnc: encOf(0), statement: NSF_STATEMENT, value: 100 }),
    ).rejects.toMatchObject({ code: "BUDGET_VIOLATION" });
  });

  it(
    "a non-zero count cannot prove eq 0: bound 1 over a hidden 0 is unsatisfiable",
    async () => {
      await expect(
        proveTierA({
          nonce: "n",
          operandEnc: encOf(0),
          statement: { ...NSF_STATEMENT, bound: 1 },
          value: 0,
        }),
      ).rejects.toMatchObject({ code: "UNSATISFIABLE" });
    },
    PROVE_TIMEOUT,
  );

  it(
    "a cash-flow score below 660 cannot be proved: 500 >= 660 is unsatisfiable",
    async () => {
      await expect(
        proveTierA({
          nonce: "n",
          operandEnc: encOf(500),
          statement: CASH_FLOW_STATEMENT,
          value: 500,
        }),
      ).rejects.toMatchObject({ code: "UNSATISFIABLE" });
    },
    PROVE_TIMEOUT,
  );
});

describe("verifyTierA over the lending statements", () => {
  let nsfProof: TierAProof;
  let cashFlowProof: TierAProof;
  let incomeProof: TierAProof;
  let nsfAnchor: IssuedCredential;
  let cashFlowAnchor: IssuedCredential;
  let incomeAnchor: IssuedCredential;

  beforeAll(async () => {
    nsfProof = await proveTierA({
      nonce: "nsf-nonce",
      operandEnc: encOf(0),
      statement: NSF_STATEMENT,
      value: 0,
    });
    cashFlowProof = await proveTierA({
      nonce: "cash-flow-nonce",
      operandEnc: encOf(720),
      statement: CASH_FLOW_STATEMENT,
      value: 720,
    });
    incomeProof = await proveTierA({
      nonce: "income-nonce",
      operandEnc: encOf(2860),
      statement: LENDING_INCOME_STATEMENT,
      value: 2860,
    });
    const anchor = (field: string, value: number, index: number) =>
      issue(
        "zk-operand-anchor",
        { field, kind: "zk-operand-anchor", operandEnc: encOf(value) },
        index,
      );
    nsfAnchor = await anchor(MORT.nsf90Count, 0, 120);
    cashFlowAnchor = await anchor(MORT.cashFlowScoreValue, 720, 121);
    incomeAnchor = await anchor(MORT.monthlyGrossIncomeUsd, 2860, 122);
  }, PROVE_TIMEOUT);

  function options(
    statement: TierAStatement,
    anchorVc: IssuedCredential,
    nonce: string,
  ): Parameters<typeof verifyTierA>[1] {
    return {
      anchorVc: anchorVc.body,
      nonce,
      nonces: oneShotNonce(SESSION, nonce),
      now: NOW,
      resolveKey: resolveIssuerKey,
      sessionKey: SESSION,
      statement,
      statusFetch: host.fetch,
      trustedIssuers: [ISSUER],
      webid: SUBJECT,
    };
  }

  it("proves nsf90Count = 0 over filter_int_d1 and verifies with its anchor", async () => {
    expect(nsfProof.member).toBe("filter_int_d1");
    expect(BigInt(nsfProof.publicInputs[2] ?? "0x0")).toBe(4n); // OP_EQ
    expect(BigInt(nsfProof.publicInputs[3] ?? "0x1")).toBe(0n);
    const result = await verifyTierA(nsfProof, options(NSF_STATEMENT, nsfAnchor, "nsf-nonce"));
    expect(result.errors).toEqual([]);
    expect(result.verified).toBe(true);
  });

  it("proves cash-flow score >= 660 over filter_int_d3", async () => {
    expect(cashFlowProof.member).toBe("filter_int_d3");
    const result = await verifyTierA(
      cashFlowProof,
      options(CASH_FLOW_STATEMENT, cashFlowAnchor, "cash-flow-nonce"),
    );
    expect(result.errors).toEqual([]);
    expect(result.verified).toBe(true);
  });

  it("proves income >= 2200 over filter_int_d4", async () => {
    expect(incomeProof.member).toBe("filter_int_d4");
    const result = await verifyTierA(
      incomeProof,
      options(LENDING_INCOME_STATEMENT, incomeAnchor, "income-nonce"),
    );
    expect(result.errors).toEqual([]);
    expect(result.verified).toBe(true);
  });

  it("rejects the d1 proof presented for a mortgage field (below its minimum width)", async () => {
    const result = await verifyTierA(
      nsfProof,
      options({ ...LENDING_INCOME_STATEMENT, op: "eq", bound: 0 }, incomeAnchor, "nsf-nonce"),
    );
    expect(result.verified).toBe(false);
    expect(result.errors[0]?.code).toBe("MEMBER_BUDGET_MISMATCH");
  });

  it("rejects the d1 proof presented for the 3-digit cash-flow score", async () => {
    const result = await verifyTierA(
      nsfProof,
      options({ ...CASH_FLOW_STATEMENT, op: "eq", bound: 0 }, cashFlowAnchor, "nsf-nonce"),
    );
    expect(result.verified).toBe(false);
    expect(result.errors[0]?.code).toBe("MEMBER_BUDGET_MISMATCH");
  });

  it("rejects the d3 proof presented for the 2-digit returned-payment budget", async () => {
    const result = await verifyTierA(
      cashFlowProof,
      options(NSF_STATEMENT, nsfAnchor, "cash-flow-nonce"),
    );
    expect(result.verified).toBe(false);
    expect(result.errors[0]?.code).toBe("MEMBER_BUDGET_MISMATCH");
  });

  it("rejects an eq proof advertised as ge (statement binding)", async () => {
    const result = await verifyTierA(
      nsfProof,
      options({ ...NSF_STATEMENT, op: "ge" }, nsfAnchor, "nsf-nonce"),
    );
    expect(result.verified).toBe(false);
    expect(result.errors[0]?.code).toBe("STATEMENT_MISMATCH");
  });

  it("rejects the nsf proof bound to the cash-flow anchor (field gate)", async () => {
    const result = await verifyTierA(nsfProof, options(NSF_STATEMENT, cashFlowAnchor, "nsf-nonce"));
    expect(result.verified).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("ANCHOR_FIELD_MISMATCH");
  });

  it("rejects a replayed challenge", async () => {
    const nonces = oneShotNonce(SESSION, "nsf-nonce");
    const first = await verifyTierA(nsfProof, {
      ...options(NSF_STATEMENT, nsfAnchor, "nsf-nonce"),
      nonces,
    });
    expect(first.verified).toBe(true);
    const second = await verifyTierA(nsfProof, {
      ...options(NSF_STATEMENT, nsfAnchor, "nsf-nonce"),
      nonces,
    });
    expect(second.verified).toBe(false);
    expect(second.errors[0]?.code).toBe("NONCE_INVALID");
  });
});
