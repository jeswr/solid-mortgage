// AUTHORED-BY Claude Opus 5.5
import { MORT } from "@mortgage/data-model";
import { describe, expect, it } from "vitest";
import {
  isQualified,
  keyPaths,
  monthlyPayment,
  organisationName,
  statementText,
} from "../src/view.ts";

describe("Copperfield view logic", () => {
  it("states each threshold in words", () => {
    expect(statementText({ bound: 7000, field: MORT.monthlyGrossIncomeUsd, op: "ge" })).toBe(
      "Monthly gross income is at least $7,000",
    );
    expect(statementText({ bound: 620, field: MORT.creditScoreValue, op: "ge" })).toBe(
      "Credit score is at least 620",
    );
  });

  it("reads the outcome from Copperfield's own record", () => {
    expect(isQualified("Pre-qualified, not a commitment to lend.")).toBe(true);
    expect(isQualified("Not pre-qualified: no live challenge")).toBe(false);
  });

  it("lists every field of a presentation and no value", () => {
    const presentation = {
      challenge: "https://x/pods/lender-b/prequalification/challenge",
      holder: "https://x/pods/alex/profile/card#me",
      nonce: "n",
      statements: [
        {
          anchor: "<turtle>",
          proof: { member: "m", proof: [1, 2, 3], publicInputs: ["0x1"], verifierTarget: "evm" },
          statement: { bound: 7000, field: MORT.monthlyGrossIncomeUsd, op: "ge" },
        },
      ],
      type: "ThresholdPresentation",
    };
    expect(keyPaths(presentation).sort()).toEqual(
      [
        "challenge",
        "holder",
        "nonce",
        "statements[].anchor",
        "statements[].proof.member",
        "statements[].proof.proof[]",
        "statements[].proof.publicInputs[]",
        "statements[].proof.verifierTarget",
        "statements[].statement.bound",
        "statements[].statement.field",
        "statements[].statement.op",
        "type",
      ].sort(),
    );
  });

  it("names the issuer behind a WebID", () => {
    expect(organisationName("http://127.0.0.1:1/pods/bureau/profile/card#me")).toBe(
      "Quillon Credit Bureau",
    );
  });

  it("computes the illustrative payment", () => {
    expect(Math.round(monthlyPayment(300_000, 6.375, 360))).toBe(1872);
  });
});
