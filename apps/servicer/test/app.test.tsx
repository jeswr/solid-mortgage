// AUTHORED-BY Claude Opus 5.5
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";

const at = (path: string) => memoryLocation({ path }).hook;

afterEach(cleanup);
// No pod runtime in jsdom: the runtime logs that it was not configured, and screens show what
// they show before the pod is connected.
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("Marigold app", () => {
  it.each(["/", "/connect", "/account", "/escrow", "/insurance", "/no-such-page"])(
    "renders the trust banner and the fictional-organisation line on %s",
    (path) => {
      render(<App hook={at(path)} />);
      expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
      expect(
        screen.getByText(/Marigold Loan Servicing is a fictional organisation\./),
      ).toBeTruthy();
    },
  );

  it("marks the current tab", () => {
    render(<App hook={at("/escrow")} />);
    expect(screen.getByRole("link", { name: "Escrow" }).getAttribute("aria-current")).toBe("page");
  });

  it("asks for nothing before Juniper's notice", () => {
    render(<App hook={at("/connect")} />);
    const button = screen.getByRole("button", { name: "Connect with Cairn" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByText("Autopay instruction")).toBeTruthy();
  });

  it("does not read the pod before it is connected", () => {
    render(<App hook={at("/account")} />);
    expect(screen.getByRole("heading", { name: "Your pod is not connected yet" })).toBeTruthy();
  });
});
