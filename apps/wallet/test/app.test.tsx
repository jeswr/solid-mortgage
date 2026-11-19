// AUTHORED-BY Claude Opus 5.5
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";

const at = (path: string) => memoryLocation({ path }).hook;
/** The pods never start in jsdom: screens render their frame and wait, reading nothing. */
const never = new Promise<never>(() => undefined);

afterEach(cleanup);

describe("Cairn shell", () => {
  it("renders the trust banner and the fictional-organisation line", () => {
    render(<App hook={at("/")} started={never} />);
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
    expect(screen.getByText(/Cairn is a fictional organisation\./)).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Your pod" })).toBeTruthy();
  });

  it("has a bottom tab bar with the current screen marked", () => {
    render(<App hook={at("/sharing")} started={never} />);
    const nav = screen.getByRole("navigation", { name: "Wallet" });
    const current = nav.querySelector('[aria-current="page"]');
    expect(current?.textContent).toBe("Sharing");
    expect(nav.querySelectorAll("a")).toHaveLength(5);
  });

  it("links to Prove with a full navigation, never a client-side route change", () => {
    const { container } = render(<App hook={at("/")} started={never} />);
    const link = container.querySelector<HTMLAnchorElement>('a[href="/wallet/prove"]');
    expect(link).not.toBeNull();
  });

  it("keeps the banner on a not-found route", () => {
    render(<App hook={at("/no-such-page")} started={never} />);
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
  });
});

describe("the small business loan screens", () => {
  it.each([
    ["/loan", "Northwind's loan"],
    ["/loan/requests", "Requests"],
    ["/loan/sharing", "Grants"],
    ["/loan/ledger", "Journey ledger"],
  ])("%s renders its frame and the trust banner", (path, title) => {
    render(<App hook={at(path)} started={never} holder="northwind" demoHolder="northwind" />);
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Equipment loan" })).toBeTruthy();
  });

  it("starts the ledger's totals at zero, from the log and nothing else", () => {
    render(
      <App hook={at("/loan/ledger")} started={never} holder="northwind" demoHolder="northwind" />,
    );
    expect(screen.getByTestId("wallet-loan-issuers").textContent).toBe("0");
    expect(screen.getByTestId("wallet-loan-lenders").textContent).toBe("0");
    expect(screen.getByTestId("wallet-loan-decisions").textContent).toBe("0");
  });
});
