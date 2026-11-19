// AUTHORED-BY Claude Opus 5.5
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";

const at = (path: string) => memoryLocation({ path }).hook;

afterEach(cleanup);
// No pod runtime in jsdom: the runtime logs that it was not configured, and screens show what
// they show before anything has been read.
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("Wrenfield app", () => {
  it.each(["/", "/property", "/quote", "/evidence", "/no-such-page"])(
    "renders the trust banner and the fictional-organisation line on %s",
    (path) => {
      render(<App hook={at(path)} />);
      expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
      expect(screen.getByText(/Wrenfield Mutual is a fictional organisation\./)).toBeTruthy();
    },
  );

  it("offers to skip the form with the pod", () => {
    render(<App hook={at("/")} />);
    expect(screen.getByRole("link", { name: "Use my pod to skip the form" })).toBeTruthy();
  });

  it("puts the Bind target on the quote screen, disabled until the pod allows it", () => {
    const { container } = render(<App hook={at("/quote")} />);
    const bind = container.querySelector<HTMLButtonElement>('[data-tour="insurer-bind"]');
    expect(bind?.textContent).toBe("Bind coverage");
    expect(bind?.disabled).toBe(true);
  });

  it("lists what the pod will share before anything is shared", () => {
    render(<App hook={at("/property")} />);
    expect(screen.getByText("Your property record")).toBeTruthy();
    expect(screen.getByText("Your copy of the appraisal")).toBeTruthy();
  });
});
