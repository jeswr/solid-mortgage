// AUTHORED-BY Claude Opus 5.5
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";
import { sections } from "../src/sections/index.ts";

const at = (path: string) => memoryLocation({ path }).hook;
/** The pods never start in jsdom: screens render their frame and wait, reading nothing. */
const never = new Promise<never>(() => undefined);

afterEach(cleanup);

describe("Cairn's medication-handover screens", () => {
  it("registers five health sections for the medication handover", () => {
    expect(sections.filter((s) => s.demo === "medication-handover").map((s) => s.path)).toEqual([
      "health",
      "health/requests",
      "health/sharing",
      "health/shared",
      "health/ledger",
    ]);
  });

  it("shows Rosa's Health screen with the not-clinical-guidance line", () => {
    render(<App hook={at("/health")} started={never} holder="rosa" demoHolder="rosa" />);
    expect(screen.getByRole("heading", { level: 1, name: "Health" })).toBeTruthy();
    expect(screen.getByText(/Not clinical guidance\./)).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Health" })).toBeTruthy();
  });

  it("sends another holder to Rosa's own view", () => {
    render(<App hook={at("/health/requests")} started={never} holder="alex" demoHolder="rosa" />);
    expect(screen.getByRole("link", { name: "Open it as Rosa" })).toBeTruthy();
  });

  it("shows Alex's Shared with me only to Alex", () => {
    render(<App hook={at("/health/shared")} started={never} holder="alex" demoHolder="rosa" />);
    expect(screen.getByRole("heading", { level: 1, name: "Shared with me" })).toBeTruthy();
    expect(screen.getByText(/you cannot change them/)).toBeTruthy();
    cleanup();
    render(<App hook={at("/health/shared")} started={never} holder="rosa" demoHolder="rosa" />);
    expect(screen.getByRole("link", { name: "Open it as Alex" })).toBeTruthy();
  });

  it("renders the ledger's totals, counted from an empty log", () => {
    const { container } = render(
      <App hook={at("/health/ledger")} started={never} holder="rosa" demoHolder="rosa" />,
    );
    const metrics = [...container.querySelectorAll("[data-metric]")].map((li) =>
      li.getAttribute("data-metric"),
    );
    expect(metrics).toEqual([
      "medication-handover.lists",
      "medication-handover.writers",
      "medication-handover.readers",
      "medication-handover.changes",
      "medication-handover.attributed",
      "medication-handover.denied",
    ]);
  });
});
