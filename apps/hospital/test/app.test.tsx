// AUTHORED-BY Claude Opus 5.5
import { ADMISSION_LIST } from "@mortgage/content/medication-handover/facts";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";
import { org } from "../src/org.ts";

const at = (path: string) => memoryLocation({ path }).hook;

afterEach(cleanup);

describe("Riverbend General Hospital", () => {
  it("is the registry's hospital record, a fictional organisation", () => {
    expect(org.slug).toBe("hospital");
    expect(org.actsAs).toBe("hospital");
    expect(org.themeColor).toBe("#14558F");
  });

  it("renders the record with the patient banner, tabs, trust banner and fictional line", () => {
    render(<App hook={at("/")} />);
    expect(screen.getByRole("heading", { level: 1, name: "Summary" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Patient" }).textContent).toContain("Amoxicillin");
    expect(screen.getByRole("navigation", { name: "Patient record" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
    expect(
      screen.getByText(/Riverbend General Hospital is a fictional organisation\./),
    ).toBeTruthy();
    expect(screen.getByText(/Not clinical guidance/)).toBeTruthy();
  });

  it("lists the medicines on admission with their RxNorm codes", () => {
    const { container } = render(<App hook={at("/medicines")} />);
    const rows = container.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(ADMISSION_LIST.length);
    expect(rows[0]?.textContent).toContain("29046");
  });

  it("shows no Sign button before Rosa's list is read (no pods in this test)", () => {
    const { container } = render(<App hook={at("/discharge")} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Discharge medicines reconciliation" }),
    ).toBeTruthy();
    expect(container.querySelector('[data-tour="hospital-sign-discharge"]')).toBeNull();
  });

  it("keeps the banner on a not-found route", () => {
    render(<App hook={at("/no-such-page")} />);
    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeTruthy();
    expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
  });
});
