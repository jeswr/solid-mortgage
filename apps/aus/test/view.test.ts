// AUTHORED-BY Claude Opus 5.5
import type { VerifyCredentialResult } from "@mortgage/vc-kit";
import { describe, expect, it } from "vitest";
import { checkColumns, findingMessages, podPath, recommendationOf } from "../src/view.ts";

const FINDINGS = [
  "Recommendation: Approve/Eligible. This is a recommendation; the lender's underwriter decides.",
  "Income, assets and credit summary were each read at source and their signatures checked.",
  "Conditions: appraisal supporting the value; title commitment; evidence of homeowner's insurance;",
  "verification of employment no more than 10 business days before the note date.",
].join(" ");

describe("findings report", () => {
  it("numbers each message and splits the conditions", () => {
    const messages = findingMessages(FINDINGS);
    expect(messages.map((message) => [message.number, message.kind])).toEqual([
      ["0001", "recommendation"],
      ["0002", "note"],
      ["0003", "verification"],
      ["0004", "condition"],
      ["0005", "condition"],
      ["0006", "condition"],
      ["0007", "condition"],
    ]);
    expect(messages[6]?.text).toBe(
      "verification of employment no more than 10 business days before the note date",
    );
  });

  it("finds the recommendation", () => {
    expect(recommendationOf(FINDINGS)).toBe("Approve/Eligible");
    expect(recommendationOf("No decision.")).toBeUndefined();
  });
});

const result = (codes: string[]): VerifyCredentialResult =>
  ({
    errors: codes.map((code) => ({ code, message: code })),
    verified: codes.length === 0,
  }) as VerifyCredentialResult;

describe("source check columns", () => {
  it("passes a verified credential on every column", () => {
    const columns = checkColumns(result([]));
    expect(columns.overall).toBe("pass");
    expect(columns.signature.outcome).toBe("pass");
    expect(columns.status.text).toBe("not revoked (status list read)");
  });

  it("reports a revoked credential in the status column only", () => {
    const columns = checkColumns(result(["STATUS_REVOKED"]));
    expect(columns.overall).toBe("fail");
    expect(columns.signature.outcome).toBe("pass");
    expect(columns.status).toEqual({ outcome: "fail", text: "revoked by the issuer" });
  });

  it("reports a bad signature and an expiry", () => {
    const columns = checkColumns(result(["INVALID_SIGNATURE", "EXPIRED"]));
    expect(columns.signature).toEqual({ outcome: "fail", text: "invalid signature" });
    expect(columns.validity.text).toBe("expired");
  });

  it("strips the pod prefix from a URL", () => {
    expect(podPath("https://x.test/pods/alex/credentials/assets")).toBe("/credentials/assets");
  });
});
