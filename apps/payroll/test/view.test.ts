// AUTHORED-BY Claude Opus 5.5
import { ORGS } from "@mortgage/content/orgs";
import { createDemoCalendar } from "@mortgage/demo-kit/calendar";
import { describe, expect, it } from "vitest";
import {
  credentialLabel,
  organisationOf,
  payslips,
  podPath,
  refusalText,
  statusSeed,
  usd,
} from "../src/view.ts";

const MORT = "https://solid-mortgage-vocab.vercel.app/mort#";

describe("Ledgerly view logic", () => {
  it("uses the credential URL as the status seed of a first issuance", () => {
    const url = "https://x.test/pods/alex/credentials/employment-income";
    expect(statusSeed("employment-income", url)).toBe(url);
    expect(statusSeed("employment-income-anchor", `${url}-anchor`)).toBe(`${url}-anchor`);
  });

  it("uses the refresh day for a re-issue, so old and new have separate entries", () => {
    const url = "https://x.test/pods/alex/credentials/employment-income";
    expect(statusSeed("employment-income-refresh-day-31", url)).toBe(`${url}#refresh-day-31`);
  });

  it("names credential classes in plain words", () => {
    expect(credentialLabel(`${MORT}EmploymentIncomeCredential`)).toBe(
      "Employment and income verification",
    );
    expect(credentialLabel(`${MORT}SomethingElse`)).toBe("Something Else");
  });

  it("says a 403 is the pod refusing a read the grant does not allow", () => {
    expect(refusalText(403)).toMatch(/refused/);
    expect(refusalText(403)).toMatch(/not read/);
  });

  it("finds the organisation behind a WebID", () => {
    expect(
      organisationOf("https://x.test/pods/lender/profile/card#me", ORGS, "https://x.test"),
    ).toBe("Juniper Home Loans");
    expect(organisationOf("https://x.test/pods/alex/profile/card#me", ORGS, "https://x.test")).toBe(
      "Alex Rivera",
    );
  });

  it("dates payslips on the last weekday of the months before day 1", () => {
    const slips = payslips(createDemoCalendar("2026-08-03"), 8500, 3);
    expect(slips.map((slip) => slip.payDate)).toEqual(["2026-07-31", "2026-06-30", "2026-05-29"]);
    expect(slips[0]?.grossUsd).toBe(8500);
  });

  it("formats money and pod paths", () => {
    expect(usd(96250)).toBe("$96,250");
    expect(podPath("https://x.test/pods/alex/credentials/assets")).toBe("/credentials/assets");
  });
});
