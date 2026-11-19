// AUTHORED-BY Claude Opus 5.5
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";
import { org } from "../src/org.ts";

const at = (path: string) => memoryLocation({ path }).hook;

afterEach(cleanup);

describe("State Online Services", () => {
  it("is the registry's state record, a fictional agency", () => {
    expect(org.slug).toBe("state");
    expect(org.actsAs).toBe("state");
    expect(org.themeColor).toBe("#17375E");
  });

  it("renders the home page with the band, the trust banner and the fictional line", () => {
    render(<App hook={at("/")} />);
    expect(screen.getByRole("heading", { level: 1, name: "Online services" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "State services" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
    expect(screen.getByText(/State Online Services is a fictional organisation\./)).toBeTruthy();
  });

  it("shows Driver Services with three numbered steps and the tour's action target", () => {
    const { container } = render(<App hook={at("/driver-services")} />);
    expect(screen.getByRole("heading", { level: 1, name: "Driver Services" })).toBeTruthy();
    expect(container.querySelectorAll("ol.steps > li")).toHaveLength(3);
    const button = container.querySelector<HTMLButtonElement>('[data-tour="state-update-licence"]');
    expect(button?.textContent).toBe("Update licence");
    // Nothing is read yet in a test without pods, so there is nothing to update.
    expect(button?.disabled).toBe(true);
  });

  it("keeps the banner on a not-found route", () => {
    render(<App hook={at("/no-such-page")} />);
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
  });
});
