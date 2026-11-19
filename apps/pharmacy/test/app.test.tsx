// AUTHORED-BY Claude Opus 5.5
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";
import { org } from "../src/org.ts";

const at = (path: string) => memoryLocation({ path }).hook;

afterEach(cleanup);

describe("Corner Dispensary", () => {
  it("is the registry's pharmacy record, a fictional organisation", () => {
    expect(org.slug).toBe("pharmacy");
    expect(org.actsAs).toBe("pharmacy");
    expect(org.themeColor).toBe("#006B3C");
  });

  it("renders the queue with its toolbar, the trust banner and the fictional line", () => {
    render(<App hook={at("/queue")} />);
    expect(screen.getByRole("heading", { level: 1, name: "Queue" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Rosa Rivera" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Dispensary" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
    expect(screen.getByText(/Corner Dispensary is a fictional organisation\./)).toBeTruthy();
    expect(screen.getAllByText(/Not clinical guidance/).length).toBeGreaterThan(0);
  });

  it("shows no tour button before Rosa's record is read (no pods in this test)", () => {
    const { container } = render(<App hook={at("/")} />);
    expect(container.querySelector('[data-tour="pharmacy-dispense"]')).toBeNull();
    expect(container.querySelector('[data-tour="pharmacy-refresh"]')).toBeNull();
  });

  it("has its own records page", () => {
    render(<App hook={at("/records")} />);
    expect(screen.getByRole("heading", { level: 1, name: "Our dispensing records" })).toBeTruthy();
  });

  it("keeps the banner on a not-found route", () => {
    render(<App hook={at("/no-such-page")} />);
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
  });
});
