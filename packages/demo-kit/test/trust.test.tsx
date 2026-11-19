// @vitest-environment jsdom
// AUTHORED-BY Claude Opus 5.5
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { OrgRecord } from "../src/registry.js";
import {
  applyDocumentMeta,
  DemoTrust,
  demoDocumentMeta,
  demoPack,
  fictionalLine,
  TrustBanner,
  useDemoOrg,
} from "../src/trust.js";
import { setUrlMode } from "../src/urls.js";

const ORG: OrgRecord = {
  actsAs: "lender",
  organisation: "Example Home Loans",
  persona: { name: "Pat Example", role: "processor" },
  role: "Lender",
  short: "Example",
  slug: "lender-desk",
  themeColor: "#123456",
  title: "Example Desk",
};

afterEach(() => {
  cleanup();
  setUrlMode({ kind: "path" });
});

describe("trust wiring", () => {
  it("renders the kit banner, the fictional line and the simulated sign-in", () => {
    render(
      <DemoTrust org={ORG}>
        <TrustBanner />
      </DemoTrust>,
    );
    const banner = screen.getByRole("note", { name: "Concept demonstration notice" });
    expect(banner.textContent).toContain("Concept demo.");
    expect(banner.textContent).toContain("EDMA Solid Community of Practice");
    expect(banner.textContent).toContain("All data is simulated.");
    expect(screen.getByText(/is a fictional organisation\./).textContent).toContain(
      "Example Home Loans is a fictional organisation.",
    );
    expect(screen.getByText("Signed in as Pat Example, processor (simulated)")).toBeTruthy();
    const about = banner.querySelector("a");
    expect(about?.getAttribute("href")).toBe("/welcome/honesty");
  });

  it("omits the sign-in line on a public page", () => {
    render(
      <DemoTrust org={{ ...ORG, persona: null }}>
        <TrustBanner />
      </DemoTrust>,
    );
    expect(document.querySelector("[data-demo-signed-in]")).toBeNull();
  });

  it("follows host mode for the honesty link", () => {
    setUrlMode({ kind: "host", domain: "demo.example" });
    render(
      <DemoTrust org={ORG}>
        <TrustBanner />
      </DemoTrust>,
    );
    expect(document.querySelector("[data-concept-demo-banner] a")?.getAttribute("href")).toBe(
      "https://welcome.demo.example/honesty",
    );
  });

  it("fails closed without a provider", () => {
    function Bare() {
      useDemoOrg();
      return null;
    }
    expect(() => render(<Bare />)).toThrow(/DemoTrust/);
  });

  it("builds noindex document metadata with the fictional line", () => {
    const meta = demoDocumentMeta(ORG, "Pipeline");
    expect(meta.title).toBe("Pipeline · Example Desk");
    expect(meta.robots).toBe("noindex, nofollow");
    expect(meta.description.startsWith(fictionalLine(ORG))).toBe(true);
    applyDocumentMeta(ORG);
    expect(document.title).toBe("Example Desk");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(
      "#123456",
    );
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe(
      "noindex, nofollow",
    );
  });

  it("uses one frozen pack", () => {
    expect(Object.isFrozen(demoPack)).toBe(true);
    expect(demoPack.bannerFullText({ organization: "x", variant: "own" })).toBe(
      "Concept demo. A research prototype by the EDMA Solid Community of Practice. All data is simulated. Nothing here is a real offer of credit, insurance or any other financial product.",
    );
  });
});
