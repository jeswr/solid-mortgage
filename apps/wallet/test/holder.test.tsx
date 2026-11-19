// AUTHORED-BY Claude Opus 5.5
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";
import { initialHolder } from "../src/holder.ts";

const at = (path: string) => memoryLocation({ path }).hook;
const never = new Promise<never>(() => undefined);
const site = "https://site.test/wallet/";

afterEach(cleanup);

describe("which holder Cairn shows first", () => {
  it("is Alex when nothing names another (the mortgage demo)", () => {
    expect(initialHolder(site, undefined)).toBe("alex");
    expect(initialHolder(site, "alex")).toBe("alex");
    expect(
      initialHolder(
        `${site}requests?request=${encodeURIComponent("https://site.test/pods/alex/inbox/r1")}&return=x`,
        "alex",
      ),
    ).toBe("alex");
  });

  it("follows ?holder=, then a request's inbox, then the demo's holder", () => {
    expect(initialHolder(`${site}?holder=maya`, "alex")).toBe("maya");
    const request = encodeURIComponent("https://site.test/pods/rosa/inbox/r1");
    expect(initialHolder(`${site}requests?request=${request}`, "alex")).toBe("rosa");
    expect(initialHolder(`${site}?holder=northwind&request=${request}`, "alex")).toBe("northwind");
    expect(initialHolder(site, "northwind")).toBe("northwind");
  });

  it("ignores a value that is not a registered holder", () => {
    expect(initialHolder(`${site}?holder=bank`, "alex")).toBe("alex");
    expect(initialHolder(`${site}?holder=__proto__`, "maya")).toBe("maya");
    const bank = encodeURIComponent("https://site.test/pods/bank/inbox/r1");
    expect(initialHolder(`${site}?request=${bank}`, undefined)).toBe("alex");
  });
});

describe("the holder switcher", () => {
  it("lists every pod in the wallet with the shown one pressed; Alex's Home is unchanged", () => {
    const { container } = render(<App hook={at("/")} started={never} />);
    const nav = screen.getByRole("navigation", { name: "Pods in this wallet" });
    const buttons = [...nav.querySelectorAll("button")];
    expect(buttons.map((b) => b.textContent)).toEqual([
      "AlexPerson",
      "MayaPerson",
      "RosaPerson",
      "NorthwindBusiness",
    ]);
    expect(buttons.map((b) => b.getAttribute("aria-pressed"))).toEqual([
      "true",
      "false",
      "false",
      "false",
    ]);
    expect(screen.getByText(/Alex, everything below is in one store you control\./)).toBeTruthy();
    expect(screen.getByText(/Signed in as Alex Rivera/)).toBeTruthy();
    expect(container.querySelector('a[href="/wallet/prove"]')).not.toBeNull();
  });

  it("shows a business holder as its operator, without the mortgage-only Prove card", () => {
    const { container } = render(<App hook={at("/")} started={never} holder="northwind" />);
    expect(
      screen.getByText(/Everything Northwind Logistics LLC keeps is in one store it controls/),
    ).toBeTruthy();
    expect(screen.getByText(/Signed in as Jordan Blake, for Northwind Logistics LLC/)).toBeTruthy();
    expect(container.querySelector('a[href="/wallet/prove"]')).toBeNull();
    const pressed = container.querySelector('.holders [aria-pressed="true"]');
    expect(pressed?.getAttribute("data-tour")).toBe("wallet-holder-northwind");
  });
});
