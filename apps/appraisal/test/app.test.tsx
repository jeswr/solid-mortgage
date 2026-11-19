// AUTHORED-BY Claude Opus 5.5
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";

afterEach(cleanup);

describe("Plumbline", () => {
  it("keeps the trust banner on a not-found route", () => {
    render(<App hook={memoryLocation({ path: "/no-such-screen" }).hook} />);
    expect(screen.getByRole("heading", { name: "No such screen" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
    expect(screen.getByText(/Plumbline Valuation is a fictional organisation\./)).toBeTruthy();
  });
});
