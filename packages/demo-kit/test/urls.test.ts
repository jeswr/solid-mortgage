// AUTHORED-BY Claude Opus 5.5
import { afterEach, describe, expect, it } from "vitest";
import { appSlugOfPath, appUrl, podOrigin, setUrlMode, urlMode } from "../src/urls.js";

afterEach(() => setUrlMode({ kind: "path" }));

describe("appUrl", () => {
  it("path mode builds root-relative links", () => {
    expect(appUrl("lender")).toBe("/lender/");
    expect(appUrl("lender", "apply")).toBe("/lender/apply");
    expect(appUrl("lender", "/apply")).toBe("/lender/apply");
    expect(
      appUrl("wallet", "requests", { request: "/pods/alex/inbox/r1", return: "/lender/" }),
    ).toBe("/wallet/requests?request=%2Fpods%2Falex%2Finbox%2Fr1&return=%2Flender%2F");
  });

  it("merges params into an existing query and keeps the fragment last", () => {
    expect(appUrl("aus", "case?id=7#findings", { tab: "checks", skip: undefined })).toBe(
      "/aus/case?id=7&tab=checks#findings",
    );
  });

  it("host mode puts the slug in the hostname", () => {
    setUrlMode({ kind: "host", domain: "demo.example" });
    expect(urlMode().kind).toBe("host");
    expect(appUrl("lender-desk", "loans/JHL-1001")).toBe(
      "https://lender-desk.demo.example/loans/JHL-1001",
    );
    expect(podOrigin()).toBe("https://pods.demo.example");
  });

  it("an explicit mode argument overrides the current one", () => {
    expect(appUrl("county", "", { q: 1 }, { kind: "path", origin: "https://site.example" })).toBe(
      "https://site.example/county/?q=1",
    );
    expect(podOrigin()).toBe("");
  });

  it("rejects unknown slugs and bad domains", () => {
    expect(() => appUrl("nope" as never)).toThrow(/unknown app slug/);
    expect(() => setUrlMode({ kind: "host", domain: "evil.example/x" })).toThrow();
  });

  it("finds the app a path belongs to", () => {
    expect(appSlugOfPath("/lender-b/result")).toBe("lender-b");
    expect(appSlugOfPath("/pods/alex/")).toBeUndefined();
    expect(appSlugOfPath("/")).toBeUndefined();
  });
});
