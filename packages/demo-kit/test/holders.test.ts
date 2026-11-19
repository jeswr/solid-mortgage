// AUTHORED-BY Claude Opus 5.5
import { describe, expect, it } from "vitest";
import {
  DEFAULT_HOLDER,
  HOLDER_IDS,
  HOLDERS,
  holderOfPodUrl,
  holderRecord,
  isHolderId,
} from "../src/holders.js";
import {
  holdersActedFor,
  isPodOwner,
  ORG_SLUGS,
  type OrgRecord,
  type OrgRegistry,
  type OrgSlug,
  podOwners,
  webidFor,
} from "../src/registry.js";

/** A registry where every app acts as itself, except the wallet (a holder) and the desk. */
function registry(): OrgRegistry {
  const out = {} as Record<OrgSlug, OrgRecord>;
  for (const slug of ORG_SLUGS) {
    out[slug] = {
      actsAs: slug === "wallet" ? "alex" : slug === "lender-desk" ? "lender" : slug,
      organisation: slug,
      persona: null,
      role: slug,
      short: slug,
      slug,
      themeColor: "#000000",
      title: slug,
    };
  }
  return out;
}

describe("holder registry", () => {
  it("registers Alex (the default), Maya, Rosa and Northwind", () => {
    expect(HOLDER_IDS).toEqual(["alex", "maya", "rosa", "northwind"]);
    expect(DEFAULT_HOLDER).toBe("alex");
    expect(holderRecord("northwind").kind).toBe("business");
    expect(holderRecord("maya").kind).toBe("person");
    expect(holderRecord("alex").name).toBe("Alex Rivera");
  });

  it("keys each record by its id and puts its pod at /pods/<id>/, with a WebID there", () => {
    for (const id of HOLDER_IDS) {
      expect(HOLDERS[id].id).toBe(id);
      expect(HOLDERS[id].podPath).toBe(`/pods/${id}/`);
      expect(webidFor(id, "https://site.example")).toBe(
        `https://site.example${HOLDERS[id].podPath}profile/card#me`,
      );
      expect(Object.isFrozen(HOLDERS[id])).toBe(true);
    }
  });

  it("never reuses an organisation slug as a holder id", () => {
    for (const id of HOLDER_IDS) expect((ORG_SLUGS as readonly string[]).includes(id)).toBe(false);
  });

  it("recognises holder ids and pod owners, and nothing from Object.prototype", () => {
    expect(isHolderId("maya")).toBe(true);
    expect(isHolderId("bank")).toBe(false);
    expect(isHolderId("constructor")).toBe(false);
    expect(isHolderId("__proto__")).toBe(false);
    expect(isPodOwner("northwind")).toBe(true);
    expect(isPodOwner("lender")).toBe(true);
    expect(isPodOwner("welcome")).toBe(false);
  });

  it("reads the holder a pod URL names", () => {
    expect(holderOfPodUrl("https://x.example/pods/rosa/health/allergies")).toBe("rosa");
    expect(holderOfPodUrl("/pods/maya/inbox/req-1")).toBe("maya");
    expect(holderOfPodUrl("/pods/northwind")).toBe("northwind");
    expect(holderOfPodUrl("/pods/bank/inbox/")).toBeUndefined();
    expect(holderOfPodUrl("/pods/mayanot/")).toBeUndefined();
  });

  it("provisions every holder's pod, then the organisations'", () => {
    const owners = podOwners(registry());
    expect(owners.slice(0, 4)).toEqual(["alex", "maya", "rosa", "northwind"]);
    expect(owners).toContain("lender");
    expect(owners).not.toContain("wallet");
    expect(owners).not.toContain("lender-desk");
  });

  it("lets only an app that acts as a holder act for the holders", () => {
    const orgs = registry();
    expect(holdersActedFor(orgs, "wallet")).toEqual(HOLDER_IDS);
    expect(holdersActedFor(orgs, "bank")).toEqual([]);
    expect(holdersActedFor(orgs, "lender-desk")).toEqual([]);
    expect(holdersActedFor(orgs, "welcome")).toEqual([]);
    expect(holdersActedFor(orgs, "maya")).toEqual([]);
  });
});
