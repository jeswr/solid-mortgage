// AUTHORED-BY Claude Opus 5.5
import { displayName, HOLDER_IDS, ORG_SLUGS, podOwners } from "@mortgage/demo-kit/registry";
import { describe, expect, it } from "vitest";
import { DEMO_APPS, ORGS } from "../orgs.js";

describe("organisation registry", () => {
  it("has one record per organisation app, keyed by its own slug", () => {
    expect(Object.keys(ORGS).sort()).toEqual([...ORG_SLUGS].sort());
    for (const slug of ORG_SLUGS) expect(ORGS[slug].slug).toBe(slug);
  });

  it("covers eighteen fictional organisations across nineteen apps", () => {
    const organisations = new Set(ORG_SLUGS.map((slug) => ORGS[slug].organisation));
    expect(organisations.size).toBe(18);
    expect(displayName(ORGS["lender-desk"])).toBe("Juniper Home Loans, Loan Desk");
  });

  it("gives every app its own title and theme colour", () => {
    const titles = ORG_SLUGS.map((slug) => ORGS[slug].title);
    const colours = ORG_SLUGS.map((slug) => ORGS[slug].themeColor.toLowerCase());
    expect(new Set(titles).size).toBe(19);
    expect(new Set(colours).size).toBe(19);
    for (const colour of colours) expect(colour).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("implies one pod per registered holder and one per organisation that acts for itself", () => {
    const owners = podOwners(ORGS);
    expect(owners).toContain("alex");
    expect(owners).not.toContain("wallet");
    expect(owners).not.toContain("lender-desk");
    expect(owners.slice(0, HOLDER_IDS.length)).toEqual([...HOLDER_IDS]);
    // The holders plus the seventeen organisations other than Cairn (the state app is moving
    // house's; the registry and business lender are business KYB's; the hospital, the pharmacy
    // and the practice are the medication handover's).
    expect(owners).toHaveLength(HOLDER_IDS.length + 17);
  });
});

describe("the apps each demo uses", () => {
  it("the mortgage keeps its thirteen applications and twelve organisations", () => {
    expect(DEMO_APPS.mortgage).toHaveLength(13);
    expect(new Set(DEMO_APPS.mortgage.map((slug) => ORGS[slug].organisation)).size).toBe(12);
  });

  it("moving house: Alex's wallet and the six organisations that read the address", () => {
    expect(DEMO_APPS["moving-house"]).toHaveLength(7);
    for (const slug of DEMO_APPS["moving-house"]) expect(ORGS[slug]).toBeDefined();
  });

  it("business KYB: Northwind's wallet, the register and two banks", () => {
    expect(DEMO_APPS["business-kyb"]).toEqual(["wallet", "registry", "bank", "business-lender"]);
    expect(new Set(DEMO_APPS["business-kyb"].map((slug) => ORGS[slug].organisation)).size).toBe(4);
  });

  it("medication handover: Rosa's wallet, the hospital, the pharmacy and the practice", () => {
    expect(DEMO_APPS["medication-handover"]).toEqual(["wallet", "hospital", "pharmacy", "clinic"]);
    for (const slug of DEMO_APPS["medication-handover"]) expect(ORGS[slug]).toBeDefined();
  });
});
