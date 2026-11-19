// AUTHORED-BY Claude Opus 5.5
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";
import { sections } from "../src/sections/index.ts";

const at = (path: string) => memoryLocation({ path }).hook;

afterEach(cleanup);
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("Wrenfield's claims (motor-claim demo)", () => {
  it("registers the claims page and the claims desk as motor-claim sections", () => {
    expect(sections.filter((section) => section.demo === "motor-claim").map((s) => s.path)).toEqual(
      ["claims", "claims/desk"],
    );
  });

  it.each(["/claims", "/claims/desk"])("renders the trust banner on %s", (path) => {
    render(<App hook={at(path)} />);
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
    expect(screen.getByText(/Wrenfield Mutual is a fictional organisation\./)).toBeTruthy();
  });

  it("asks for exactly C1's three things, until the claim closes", () => {
    const { container } = render(<App hook={at("/claims")} />);
    const asks = container.querySelectorAll('[aria-label="What we ask to read"] li');
    expect(asks).toHaveLength(2);
    expect(container.textContent).toContain("Read the driver licence and the motor policy");
    expect(container.textContent).toContain("Until the claim closes");
    const report = container.querySelector<HTMLButtonElement>('[data-tour="insurer-mc-report"]');
    expect(report?.textContent).toBe("Report claim");
  });

  it("puts both desk actions on the desk, disabled until a claim is open", () => {
    const { container } = render(<App hook={at("/claims/desk")} />);
    for (const target of ["insurer-mc-check", "insurer-mc-approve-estimate"]) {
      const button = container.querySelector<HTMLButtonElement>(`[data-tour="${target}"]`);
      expect(button, target).not.toBeNull();
      expect(button?.disabled).toBe(true);
    }
  });
});
