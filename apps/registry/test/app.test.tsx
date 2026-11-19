// AUTHORED-BY Claude Opus 5.5
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";
import { org } from "../src/org.ts";

const at = (path: string) => memoryLocation({ path }).hook;

afterEach(cleanup);

describe("Halyard LEI Services", () => {
  it("is the registry's record, a fictional register", () => {
    expect(org.slug).toBe("registry");
    expect(org.actsAs).toBe("registry");
    expect(org.themeColor).toBe("#0E6E6E");
  });

  it("opens on the search, with the trust banner and the fictional line", () => {
    render(<App hook={at("/")} />);
    expect(screen.getByRole("heading", { level: 1, name: "Search the register" })).toBeTruthy();
    expect(document.querySelector("search form")).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
    expect(screen.getByText(/Halyard LEI Services is a fictional organisation\./)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Northwind Logistics LLC" })).toBeTruthy();
  });

  it("searches by name and by LEI; nothing else matches", () => {
    render(<App hook={at("/")} />);
    const box = screen.getByRole("searchbox", { name: "Legal name or LEI" });
    fireEvent.change(box, { target: { value: "9999NW" } });
    expect(screen.getByRole("link", { name: "Northwind Logistics LLC" })).toBeTruthy();
    fireEvent.change(box, { target: { value: "acme" } });
    expect(screen.queryByRole("link", { name: "Northwind Logistics LLC" })).toBeNull();
    expect(screen.getByText(/No entity matches/)).toBeTruthy();
  });

  it("shows the entity record with an illustrative LEI in monospace", () => {
    const { container } = render(<App hook={at("/entity")} />);
    const lei = screen.getByTestId("registry-lei");
    expect(lei.textContent).toMatch(/^9999[0-9A-Z]{16}$/);
    expect(lei.className).toBe("mono");
    expect(container.querySelector('[data-tour="registry-issue-identity"]')).toBeTruthy();
  });

  it("each record tab carries its step's tour target", () => {
    const officers = render(<App hook={at("/officers")} />);
    expect(officers.container.querySelector('[data-tour="registry-issue-officers"]')).toBeTruthy();
    officers.unmount();
    const ownership = render(<App hook={at("/ownership")} />);
    expect(
      ownership.container.querySelector('[data-tour="registry-issue-ownership"]'),
    ).toBeTruthy();
    expect(
      ownership.container.querySelectorAll("[data-testid=registry-owners] tbody tr"),
    ).toHaveLength(4);
  });

  it("keeps the banner on a not-found route", () => {
    render(<App hook={at("/no-such-page")} />);
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
  });
});
