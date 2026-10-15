// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { ConceptDemoBanner } from "../src/concept-demo-banner.js";
import { bannerCompactText, bannerFullText } from "../src/disclaimers.js";

afterEach(cleanup);

test("renders both banner variants with the v2 copy and the about link", () => {
  render(<ConceptDemoBanner orgRole="primary mortgage lender" organization="Bank of America" />);
  const banner = screen.getByRole("note", { name: "Concept demonstration notice" });
  expect(banner.textContent).toContain(
    bannerFullText({ organization: "Bank of America", role: "primary mortgage lender" }),
  );
  expect(banner.textContent).toContain(
    bannerCompactText({ organization: "Bank of America", role: "primary mortgage lender" }),
  );
  // At desktop width only the full variant is in the accessibility tree; the compact
  // variant exists in the DOM but is display:none via the embedded media query.
  const aboutLinks = screen.getAllByRole("link");
  expect(aboutLinks.map((link) => link.textContent)).toEqual(["About this demo"]);
  const compactLink = banner.querySelector("[data-cdb-compact] a");
  expect(compactLink?.textContent).toBe("About");
  expect(aboutLinks[0]?.getAttribute("href")).toBe("/");
  expect(compactLink?.getAttribute("href")).toBe("/");
});

test("stub-compatible: organization-only props render source and offer negation", () => {
  render(<ConceptDemoBanner organization="Freddie Mac" />);
  const banner = screen.getByRole("note", { name: "Concept demonstration notice" });
  expect(banner.textContent).toContain("Concept demo — this is not Freddie Mac.");
  expect(banner.textContent).toContain("Not an offer of credit.");
  expect(banner.textContent).not.toContain("Modelled on the");
});

test("own-branded variant drops the self-negation but keeps the offer negation", () => {
  render(<ConceptDemoBanner organization="EDMA Solid Community of Practice" variant="own" />);
  const banner = screen.getByRole("note", { name: "Concept demonstration notice" });
  expect(banner.textContent).not.toContain("this is not");
  expect(banner.textContent).toContain("Not an offer of credit.");
});

test("placement: fixed-bottom by default, in-flow when static (AppShell)", () => {
  const { unmount } = render(<ConceptDemoBanner organization="Verizon" />);
  expect(screen.getByRole("note", { name: "Concept demonstration notice" }).style.position).toBe(
    "fixed",
  );
  unmount();
  render(<ConceptDemoBanner organization="Verizon" placement="static" />);
  expect(screen.getByRole("note", { name: "Concept demonstration notice" }).style.position).toBe(
    "",
  );
});

test("is marked for the shared e2e assertion and has no hide affordance", () => {
  const { container } = render(<ConceptDemoBanner organization="Verizon" />);
  expect(container.querySelector("[data-concept-demo-banner]")).not.toBeNull();
  // The component API is copy-only: no prop combination may suppress rendering.
  expect(container.textContent).toContain("Concept demo");
});
