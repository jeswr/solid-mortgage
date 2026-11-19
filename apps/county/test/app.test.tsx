// AUTHORED-BY Claude Opus 5.5
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";

afterEach(cleanup);

describe("Marlow County Recorder", () => {
  it("renders the home page with the trust banner", () => {
    render(<App hook={memoryLocation({ path: "/" }).hook} />);
    expect(screen.getByRole("heading", { level: 1, name: "Recorder's Office" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
  });

  it("keeps the trust banner on a not-found route", () => {
    render(<App hook={memoryLocation({ path: "/no-such-page" }).hook} />);
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
  });
});
