// AUTHORED-BY Claude Opus 5.5
import { ORGS } from "@mortgage/content/orgs";
import { describe, expect, it } from "vitest";
import {
  credentialLabel,
  dollars,
  inquiries,
  isoDate,
  organisationOf,
  podAnswer,
  podPath,
  stamp,
} from "../src/view.ts";

const ORIGIN = "https://site.test";

describe("Quillon's plain formats", () => {
  it("writes dates and figures as its forms do", () => {
    const at = new Date("2026-08-12T11:05:00Z");
    expect(isoDate(at)).toBe("2026-08-12");
    expect(stamp(at)).toBe("2026-08-12 11:05 UTC");
    expect(dollars(1180)).toBe("$1,180");
  });

  it("names what it issues and where", () => {
    expect(credentialLabel("https://x.test/mort#CreditScoreCredential")).toBe(
      "Consumer credit summary",
    );
    expect(credentialLabel("https://x.test/mort#ZkOperandAnchor")).toMatch(/anchor/);
    expect(podPath(`${ORIGIN}/pods/alex/credentials/credit-summary`)).toBe(
      "/credentials/credit-summary",
    );
  });

  it("names the organisation behind a WebID", () => {
    expect(organisationOf(`${ORIGIN}/pods/lender/profile/card#me`, ORGS, ORIGIN)).toBe(
      "Juniper Home Loans",
    );
    expect(organisationOf(`${ORIGIN}/pods/alex/profile/card#me`, ORGS, ORIGIN)).toMatch(/Alex/);
  });
});

describe("the inquiries log", () => {
  const nameOf = (webid: string) => (webid.includes("lender") ? "Juniper Home Loans" : webid);
  const disclosure = { asOf: new Date("2026-08-03T09:15:00Z") };
  const delivered = {
    from: "lender",
    received: new Date("2026-08-12T11:00:00Z"),
    report: { reportNumber: "QCB-TM-20417" },
  };

  it("lists a delivered order as a hard inquiry and the consumer's request as soft", () => {
    const log = inquiries([delivered], [disclosure], nameOf);
    expect(log.map((entry) => [entry.kind, entry.who])).toEqual([
      ["hard", "Juniper Home Loans"],
      ["soft", "Alex Rivera"],
    ]);
  });

  it("does not count an order Quillon never fulfilled", () => {
    expect(inquiries([{ ...delivered, report: undefined }], [], nameOf)).toEqual([]);
  });
});

describe("what the pod's answer means", () => {
  it("tells the write-only slot from the consent-gated authorisation", () => {
    expect(podAnswer(403, "slot")).toMatch(/write this slot, not read it/);
    expect(podAnswer(403, "authorisation")).toMatch(/No consent/);
    expect(podAnswer(200, "authorisation")).toMatch(/application consent/);
  });
});
