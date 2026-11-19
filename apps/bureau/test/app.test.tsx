// AUTHORED-BY Claude Opus 5.5
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";

const at = (path: string) => memoryLocation({ path }).hook;

afterEach(cleanup);

describe("Quillon before the pods connect", () => {
  it("renders the trust banner with the consumer persona on the consumer pages", () => {
    const { container } = render(<App hook={at("/summary")} />);
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
    expect(screen.getByText(/Quillon Credit Bureau is a fictional organisation\./)).toBeTruthy();
    expect(container.querySelector("[data-demo-signed-in]")?.textContent).toMatch(/Alex Rivera/);
  });

  it("shows the order desk clerk as signed in on the orders view", () => {
    const { container } = render(<App hook={at("/orders")} />);
    expect(container.querySelector("[data-demo-signed-in]")?.textContent).toMatch(
      /Order desk clerk/,
    );
  });

  it("keeps Send summary disabled until the pods are there", () => {
    const { container } = render(<App hook={at("/summary")} />);
    const button = container.querySelector<HTMLButtonElement>('[data-tour="bureau-send"]');
    expect(button?.disabled).toBe(true);
    expect(button?.textContent).toBe("Send summary to my pod");
  });

  it("keeps the banner on a not-found route", () => {
    render(<App hook={at("/no-such-page")} />);
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
  });
});
