// AUTHORED-BY Claude Opus 5.5
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";

afterEach(cleanup);

describe("Copperfield shell", () => {
  it("keeps the trust banner and the fictional-organisation line on a not-found route", () => {
    render(<App hook={memoryLocation({ path: "/nowhere" }).hook} />);
    expect(screen.getByRole("heading", { name: "Nothing here." })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
    expect(screen.getByText(/Copperfield Mortgage is a fictional organisation\./)).toBeTruthy();
  });
});
