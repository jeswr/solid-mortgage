// AUTHORED-BY Claude Opus 5.5
import { ACTION_TARGETS } from "@mortgage/content/motor-claim/tour";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";
import { org } from "../src/org.ts";

const at = (path: string) => memoryLocation({ path }).hook;

afterEach(cleanup);

describe("Anvil Collision Repair", () => {
  it("is the registry's repairer record, a fictional body shop", () => {
    expect(org.slug).toBe("repairer");
    expect(org.actsAs).toBe("repairer");
    expect(org.organisation).toBe("Anvil Collision Repair");
    expect(org.themeColor).toBe("#1F1D1A");
  });

  it("renders the job board with the bar, the trust banner and the fictional line", () => {
    render(<App hook={at("/")} />);
    expect(screen.getByRole("heading", { level: 1, name: "Job board" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Workshop" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
    expect(screen.getByText(/Anvil Collision Repair is a fictional organisation\./)).toBeTruthy();
  });

  it("shows the job card with the tour's three action targets, disabled until a job exists", () => {
    const { container } = render(<App hook={at("/jobs/CLM-1")} />);
    expect(screen.getByRole("heading", { level: 1, name: "Job CLM-1" })).toBeTruthy();
    const mine = ["repairer-write-estimate", "repairer-complete-job", "repairer-open-photos"];
    expect(ACTION_TARGETS.filter((target) => target.startsWith("repairer-"))).toEqual(mine);
    for (const target of mine) {
      const button = container.querySelector<HTMLButtonElement>(`[data-tour="${target}"]`);
      expect(button, target).not.toBeNull();
      // No pods in a unit test: no job record, so nothing to act on yet.
      expect(button?.disabled).toBe(true);
    }
    expect(screen.getByTestId("job-grant").textContent).toContain("Until the job is complete");
  });

  it("keeps the banner on a not-found route", () => {
    render(<App hook={at("/no-such-page")} />);
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
  });
});
