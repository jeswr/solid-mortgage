// AUTHORED-BY Claude Opus 5.5
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";
import { org } from "../src/org.ts";

const at = (path: string) => memoryLocation({ path }).hook;

afterEach(cleanup);

describe("Larch Lane Family Practice", () => {
  it("is the registry's clinic record, a fictional organisation", () => {
    expect(org.slug).toBe("clinic");
    expect(org.actsAs).toBe("clinic");
    expect(org.themeColor).toBe("#5B4F7C");
  });

  it("renders today's list with the trust banner and the fictional line", () => {
    render(<App hook={at("/")} />);
    expect(screen.getByRole("heading", { level: 1, name: "Today's list" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Practice" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
    expect(
      screen.getByText(/Larch Lane Family Practice is a fictional organisation\./),
    ).toBeTruthy();
    expect(screen.getByText(/Not clinical guidance/)).toBeTruthy();
  });

  it("shows the consultation's timeline, and no Save button before Rosa's record is read", () => {
    const { container } = render(<App hook={at("/consultation")} />);
    expect(screen.getByRole("heading", { level: 1, name: "Rosa Rivera: follow-up" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Encounters" })).toBeTruthy();
    expect(container.querySelector('[data-tour="clinic-save-consultation"]')).toBeNull();
  });

  it("keeps the banner on a not-found route", () => {
    render(<App hook={at("/no-such-page")} />);
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
  });
});
