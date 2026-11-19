// AUTHORED-BY Claude Opus 5.5
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";

const at = (path: string) => memoryLocation({ path }).hook;

afterEach(cleanup);

describe("Juniper borrower portal shell", () => {
  it("keeps the trust banner and the fictional-organisation line on a not-found route", () => {
    render(<App hook={at("/no-such-page")} />);
    expect(screen.getByRole("heading", { name: "We could not find that page" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
    expect(screen.getByText(/Juniper Home Loans is a fictional organisation\./)).toBeTruthy();
  });

  it("renders the hand-filled route inside the milestone tracker", () => {
    render(<App hook={at("/manual")} />);
    expect(screen.getByRole("heading", { name: "Filling in by hand" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Your loan, step by step" })).toBeTruthy();
  });
});
