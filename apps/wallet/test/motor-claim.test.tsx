// AUTHORED-BY Claude Opus 5.5
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";
import { sections } from "../src/sections/index.ts";

const at = (path: string) => memoryLocation({ path }).hook;
/** The pods never start in jsdom: screens render their frame and wait, reading nothing. */
const never = new Promise<never>(() => undefined);

afterEach(cleanup);

describe("Cairn's motor-claim screens", () => {
  it("registers four motor-claim sections under claim/", () => {
    expect(sections.filter((section) => section.demo === "motor-claim").map((s) => s.path)).toEqual(
      ["claim", "claim/requests", "claim/seen", "claim/sharing"],
    );
  });

  it.each([
    ["/claim", "Claim CLM-1"],
    ["/claim/requests", "Requests"],
    ["/claim/seen", "Who saw what"],
    ["/claim/sharing", "Grants and ledger"],
  ])("renders %s with its heading and the trust banner", (path, heading) => {
    render(<App hook={at(path)} started={never} />);
    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Motor claim" })).toBeTruthy();
  });

  it("lists what the workshop did not see, from an empty log", () => {
    render(<App hook={at("/claim/seen")} started={never} />);
    const list = screen.getByTestId("mc-not-seen");
    expect(list.textContent).toContain("Driver licence");
    expect(list.textContent).toContain("Other driver's details");
  });
});
