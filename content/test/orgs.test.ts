// AUTHORED-BY Claude Opus 5.5
import { displayName, HOLDER_IDS, ORG_SLUGS, podOwners } from "@mortgage/demo-kit/registry";
import { describe, expect, it } from "vitest";
import { DEMO_APPS, ORGS } from "../orgs.js";

describe("organisation registry", () => {
  it("has one record per organisation app, keyed by its own slug", () => {
    expect(Object.keys(ORGS).sort()).toEqual([...ORG_SLUGS].sort());
    for (const slug of ORG_SLUGS) expect(ORGS[slug].slug).toBe(slug);
  });

  it("covers fifteen fictional organisations across sixteen apps", () => {
    const organisations = new Set(ORG_SLUGS.map((slug) => ORGS[slug].organisation));
    expect(organisations.size).toBe(15);
    expect(displayName(ORGS["lender-desk"])).toBe("Juniper Home Loans, Loan Desk");
  });

  it("gives every app its own title and theme colour", () => {
    const titles = ORG_SLUGS.map((slug) => ORGS[slug].title);
    const colours = ORG_SLUGS.map((slug) => ORGS[slug].themeColor.toLowerCase());
    expect(new Set(titles).size).toBe(ORG_SLUGS.length);
    expect(new Set(colours).size).toBe(ORG_SLUGS.length);
    for (const colour of colours) expect(colour).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("implies one pod per registered holder and one per organisation that acts for itself", () => {
    const owners = podOwners(ORGS);
    expect(owners).toContain("alex");
    expect(owners).not.toContain("wallet");
    expect(owners).not.toContain("lender-desk");
    expect(owners.slice(0, HOLDER_IDS.length)).toEqual([...HOLDER_IDS]);
    // The holders plus every organisation other than Cairn and the Loan Desk (one pod each).
    expect(owners).toHaveLength(HOLDER_IDS.length + ORG_SLUGS.length - 2);
  });
});

describe("the apps each demo uses", () => {
  it("the mortgage keeps its thirteen applications and twelve organisations", () => {
    expect(DEMO_APPS.mortgage).toHaveLength(13);
    expect(new Set(DEMO_APPS.mortgage.map((slug) => ORGS[slug].organisation)).size).toBe(12);
  });

  it("small-dollar lending: Maya's wallet, three new apps and three mortgage apps", () => {
    expect(DEMO_APPS["small-dollar-lending"]).toHaveLength(7);
    for (const slug of DEMO_APPS["small-dollar-lending"]) expect(ORGS[slug]).toBeDefined();
  });
});
