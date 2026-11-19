// AUTHORED-BY Claude Opus 5.5
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App, FRAMES } from "../src/App.tsx";
import { org } from "../src/org.ts";

const at = (path: string) => memoryLocation({ path }).hook;

afterEach(cleanup);

describe("Trueline Identity", () => {
  it("is the registry's idv record, a fictional organisation", () => {
    expect(org.slug).toBe("idv");
    expect(org.actsAs).toBe("idv");
    expect(org.themeColor).toBe("#101412");
  });

  it("renders the start page with the trust banner and the fictional line", () => {
    render(<App hook={at("/")} />);
    expect(screen.getByRole("heading", { level: 1, name: "Identity, checked once" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
    expect(screen.getByText(/Trueline Identity is a fictional organisation\./)).toBeTruthy();
  });

  it("shows the funnel's three camera frames, the ring and the tour's action target", () => {
    const { container } = render(<App hook={at("/check")} />);
    expect(screen.getByRole("heading", { level: 1, name: "Identity check" })).toBeTruthy();
    expect(container.querySelectorAll("ol.frames > li")).toHaveLength(FRAMES.length);
    expect(screen.getByRole("img", { name: "0 of 3 steps done" })).toBeTruthy();
    const button = container.querySelector<HTMLButtonElement>('[data-tour="idv-verify"]');
    expect(button?.textContent).toBe("Verify identity");
  });

  it("keeps the banner on a not-found route", () => {
    render(<App hook={at("/no-such-page")} />);
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
  });
});
