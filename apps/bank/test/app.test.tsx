// AUTHORED-BY Claude Opus 5.5
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";

const at = (path: string) => memoryLocation({ path }).hook;

afterEach(cleanup);

describe("Alder Bank before the pods connect", () => {
  it("renders the trust banner and the fictional-organisation line", () => {
    render(<App hook={at("/")} />);
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
    expect(screen.getByText(/Alder Bank is a fictional organisation\./)).toBeTruthy();
  });

  it("keeps Send disabled until the pods are there", () => {
    const { container } = render(<App hook={at("/share")} />);
    const button = container.querySelector<HTMLButtonElement>('[data-tour="bank-send"]');
    expect(button?.disabled).toBe(true);
  });

  it("keeps the banner on a not-found route", () => {
    render(<App hook={at("/no-such-page")} />);
    expect(screen.getByRole("heading", { name: "We could not find that page" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
  });
});

describe("who the bank shows as signed in", () => {
  const signedIn = (container: HTMLElement) =>
    container.querySelector("[data-demo-signed-in]")?.textContent ?? "";

  it("names Alex on the mortgage pages", () => {
    const { container } = render(<App hook={at("/share")} />);
    expect(signedIn(container)).toContain("Alex");
    expect(signedIn(container)).not.toContain("Jordan Blake");
    expect(container.querySelector(".masthead .signed-in")?.textContent).toContain("Alex");
  });

  it.each(["/kyb/due-diligence", "/business"])(
    "names Jordan Blake for Northwind on the business page %s",
    (path) => {
      const { container } = render(<App hook={at(path)} />);
      expect(signedIn(container)).toContain("Jordan Blake");
      expect(signedIn(container)).toContain("Northwind Logistics LLC");
      expect(signedIn(container)).not.toContain("Alex");
      const masthead = container.querySelector(".masthead .signed-in")?.textContent ?? "";
      expect(masthead).toContain("Jordan Blake");
      expect(masthead).not.toContain("Alex");
    },
  );
});
