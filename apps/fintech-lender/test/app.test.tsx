// AUTHORED-BY Claude Opus 5.5
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";
import { org } from "../src/org.ts";

const at = (path: string) => memoryLocation({ path }).hook;

afterEach(cleanup);

describe("Finchly Loans", () => {
  it("is the registry's fintech-lender record, a fictional organisation", () => {
    expect(org.slug).toBe("fintech-lender");
    expect(org.actsAs).toBe("fintech-lender");
    expect(org.themeColor).toBe("#5B3FD1");
  });

  it("renders the home page with the big number, the trust banner and the fictional line", () => {
    render(<App hook={at("/")} />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.getByText("$2,000")).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Your loan" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
    expect(screen.getByText(/Finchly Loans is a fictional organisation\./)).toBeTruthy();
  });

  it("asks for grant L1 on the apply page, with the tour's action target", () => {
    const { container } = render(<App hook={at("/apply")} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "The grant we ask for: L1" }),
    ).toBeTruthy();
    const button = container.querySelector<HTMLButtonElement>('[data-tour="fintech-apply"]');
    expect(button?.textContent).toBe("Apply");
  });

  it("shows the servicing page's payments and the pay target", () => {
    const { container } = render(<App hook={at("/servicing")} />);
    expect(container.querySelectorAll(".schedule > li")).toHaveLength(2);
    expect(container.querySelector('[data-tour="fintech-pay"]')?.textContent).toBe(
      "Make the payments",
    );
  });

  it("keeps the banner on a not-found route", () => {
    render(<App hook={at("/no-such-page")} />);
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
  });
});
