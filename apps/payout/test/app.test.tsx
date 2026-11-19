// AUTHORED-BY Claude Opus 5.5
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App, STAGES } from "../src/App.tsx";
import { org } from "../src/org.ts";

const at = (path: string) => memoryLocation({ path }).hook;

afterEach(cleanup);

describe("Swiftline Payouts", () => {
  it("is the registry's payout record, a fictional organisation", () => {
    expect(org.slug).toBe("payout");
    expect(org.actsAs).toBe("payout");
    expect(org.themeColor).toBe("#0E1A2B");
  });

  it("renders the home page with the trust banner and the fictional line", () => {
    render(<App hook={at("/")} />);
    expect(screen.getByRole("heading", { level: 1, name: "Payouts" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
    expect(screen.getByText(/Swiftline Payouts is a fictional organisation\./)).toBeTruthy();
  });

  it("shows one timeline of four stages and the tour's action target", () => {
    const { container } = render(<App hook={at("/status")} />);
    const timeline = screen.getByRole("list", { name: "Payout timeline" });
    expect(timeline.querySelectorAll("li")).toHaveLength(STAGES.length);
    expect(container.querySelector('[data-tour="payout-authorise"]')?.textContent).toBe(
      "Authorise in Cairn",
    );
  });

  it("keeps the banner on a not-found route", () => {
    render(<App hook={at("/no-such-page")} />);
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
  });
});
