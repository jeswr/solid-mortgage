// AUTHORED-BY Claude Opus 5.5
import { describe, expect, it } from "vitest";
import {
  APP_SLUGS,
  displayName,
  isOrgSlug,
  ORG_SLUGS,
  type OrgRecord,
  webidFor,
  webidPath,
} from "../src/registry.js";

describe("registry types", () => {
  it("has the thirteen mortgage apps, the later demos' apps and the front door", () => {
    expect(ORG_SLUGS).toHaveLength(24);
    expect(ORG_SLUGS.slice(0, 13)).toContain("servicer");
    expect(ORG_SLUGS.at(13)).toBe("state");
    expect(ORG_SLUGS).toEqual(expect.arrayContaining(["idv", "fintech-lender", "payout"]));
    expect(ORG_SLUGS).toContain("registry");
    expect(ORG_SLUGS).toContain("business-lender");
    expect(ORG_SLUGS.slice(-5)).toEqual([
      "hospital",
      "pharmacy",
      "clinic",
      "card-issuer",
      "repairer",
    ]);
    expect(APP_SLUGS).toContain("welcome");
    expect(isOrgSlug("welcome")).toBe(false);
    expect(isOrgSlug("lender-desk")).toBe(true);
  });

  it("derives WebIDs from the pod path layout", () => {
    expect(webidPath("alex")).toBe("/pods/alex/profile/card#me");
    expect(webidFor("bank", "https://site.example")).toBe(
      "https://site.example/pods/bank/profile/card#me",
    );
  });

  it("names a second view after its organisation", () => {
    const record = {
      organisation: "Example Org",
      product: "Back Office",
    } as OrgRecord;
    expect(displayName(record)).toBe("Example Org, Back Office");
    expect(displayName({ ...record, product: undefined } as unknown as OrgRecord)).toBe(
      "Example Org",
    );
  });
});
