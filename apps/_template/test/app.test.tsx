// AUTHORED-BY Claude Opus 5.5
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";

const at = (path: string) => memoryLocation({ path }).hook;

afterEach(cleanup);

describe("template app", () => {
  it("renders the trust banner and the fictional-organisation line", () => {
    render(<App hook={at("/")} />);
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
    expect(screen.getByText(/Example Organisation is a fictional organisation\./)).toBeTruthy();
  });

  it("exposes a data-tour target that does something", () => {
    const { container } = render(<App hook={at("/")} />);
    const target = container.querySelector<HTMLButtonElement>('[data-tour="template-example"]');
    expect(target).not.toBeNull();
    fireEvent.click(target as HTMLButtonElement);
    expect(target?.textContent).toBe("Done");
  });

  it("keeps the banner on a not-found route", () => {
    render(<App hook={at("/no-such-page")} />);
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
  });
});
