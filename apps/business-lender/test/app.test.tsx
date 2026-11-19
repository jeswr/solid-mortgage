// AUTHORED-BY Claude Opus 5.5
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";
import { org } from "../src/org.ts";

const at = (path: string) => memoryLocation({ path }).hook;

afterEach(cleanup);

describe("Brackenridge Bank Commercial Credit", () => {
  it("is the registry's business-lender record, a fictional bank", () => {
    expect(org.slug).toBe("business-lender");
    expect(org.actsAs).toBe("business-lender");
    expect(org.themeColor).toBe("#7A2335");
  });

  it("opens on the pipeline, with the trust banner and the fictional line", () => {
    render(<App hook={at("/")} />);
    expect(screen.getByRole("heading", { level: 1, name: "Credit pipeline" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
    expect(screen.getByText(/Brackenridge Bank is a fictional organisation\./)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Northwind Logistics LLC" })).toBeTruthy();
  });

  it("the deal page waits for the pods before showing either pane", () => {
    render(<App hook={at("/deal")} />);
    expect(screen.getByRole("heading", { level: 1, name: "Northwind Logistics LLC" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/Reading the deal file/);
  });

  it("keeps the banner on a not-found route", () => {
    render(<App hook={at("/no-such-page")} />);
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
  });
});
