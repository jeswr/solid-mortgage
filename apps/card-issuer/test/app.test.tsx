// AUTHORED-BY Claude Opus 5.5
import { ACTION_TARGETS, TOUR } from "@mortgage/content/reusable-kyc/tour";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";
import { org } from "../src/org.ts";

const at = (path: string) => memoryLocation({ path }).hook;

afterEach(cleanup);

describe("Pennant Card", () => {
  it("is the registry's card-issuer record, a fictional card issuer", () => {
    expect(org.slug).toBe("card-issuer");
    expect(org.actsAs).toBe("card-issuer");
    expect(org.themeColor).toBe("#B3122B");
    expect(org.organisation).toBe("Pennant Card");
  });

  it("renders the offer page with the trust banner and the fictional line", () => {
    render(<App hook={at("/")} />);
    expect(screen.getByRole("heading", { level: 1, name: /Pennant Everyday Card/ })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Pennant" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
    expect(screen.getByText(/Pennant Card is a fictional organisation\./)).toBeTruthy();
  });

  it("shows the long form open, with the two identity buttons the tour presses", () => {
    const { container } = render(<App hook={at("/apply")} />);
    expect(screen.getByRole("heading", { level: 1, name: /Apply for/ })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Or fill in the form" })).toBeTruthy();
    const use = container.querySelector('[data-tour="card-use-verified-identity"]');
    const check = container.querySelector('[data-tour="card-check-identity"]');
    expect(use?.textContent).toBe("Use verified identity");
    expect(check?.textContent).toBe("Check identity");
    // Refresh appears only once Pennant has a record of a check, which needs the pods.
    expect(container.querySelector('[data-tour="card-refresh-identity"]')).toBeNull();
  });

  it("owns the tour's card-issuer steps, all on the apply page", () => {
    const owned = TOUR.filter((step) => step.app === "card-issuer");
    expect(owned.map((step) => step.id)).toEqual([
      "card-consent",
      "card-verify",
      "not-shared",
      "used-up",
    ]);
    expect(new Set(owned.map((step) => step.path))).toEqual(new Set(["apply"]));
    for (const target of ["card-use-verified-identity", "card-check-identity"]) {
      expect(ACTION_TARGETS).toContain(target);
    }
    expect(ACTION_TARGETS).toContain("card-refresh-identity");
  });

  it("keeps the banner on a not-found route", () => {
    render(<App hook={at("/no-such-page")} />);
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
  });
});
