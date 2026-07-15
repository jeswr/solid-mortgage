import { expect, test } from "vitest";
import {
  bannerCompactText,
  bannerFullText,
  copyText,
  DEMO_FIELD_HINT,
  demoDescription,
  demoMetadata,
  demoTitle,
  footerLegalLine,
  ILLUSTRATIVE_FIGURE_TAG,
  INTERSTITIAL_CONTINUE_LABEL,
  INTERSTITIAL_HEADING,
  INTERSTITIAL_LEARN_MORE_LABEL,
  interstitialParagraphs,
} from "../src/disclaimers.js";

// These literal assertions pin the EXACT copy required by regn-optics.md §4 / decision 0002
// (R1/R5/R6/R8). Do not weaken them; a copy change must be a deliberate decision.

test("R1 banner copy v2 — desktop, modelled with role (regn-optics §4.1)", () => {
  expect(bannerFullText({ organization: "Bank of America", role: "primary mortgage lender" })).toBe(
    "Concept demo — this is not Bank of America. A research prototype by the EDMA Solid Community of Practice, modelled on the primary mortgage lender role. All data is simulated. Nothing here is an offer of credit.",
  );
});

test("R1 banner copy v2 — desktop, modelled without a role clause", () => {
  expect(bannerFullText({ organization: "Verizon" })).toBe(
    "Concept demo — this is not Verizon. A research prototype by the EDMA Solid Community of Practice. All data is simulated. Nothing here is an offer of credit.",
  );
});

test("R1 banner copy v2 — mobile-compressed variant", () => {
  expect(bannerCompactText({ organization: "Verizon" })).toBe(
    "Concept demo — not Verizon. Simulated data. Not an offer of credit.",
  );
});

test("R1 banner copy — own-branded (convener) variant drops the self-negation", () => {
  expect(bannerFullText({ organization: "EDMA Solid Community of Practice", variant: "own" })).toBe(
    "Concept demo. A research prototype by the EDMA Solid Community of Practice. All data is simulated. Nothing here is an offer of credit.",
  );
  expect(
    bannerCompactText({ organization: "EDMA Solid Community of Practice", variant: "own" }),
  ).toBe("Concept demo. Simulated data. Not an offer of credit.");
});

test("footer legal line (regn-optics §4.3)", () => {
  expect(footerLegalLine({ organization: "Verizon" })).toBe(
    "Concept demonstration · EDMA Solid Community of Practice · Not affiliated with, sponsored by, or endorsed by Verizon · All data simulated · Not an offer of credit · Do not enter real personal information",
  );
  expect(footerLegalLine({ organization: "Anyone", variant: "own" })).not.toContain(
    "Not affiliated",
  );
});

test("R8 interstitial copy v2 (regn-optics §4.2)", () => {
  expect(INTERSTITIAL_HEADING).toBe("You're entering a concept demonstration");
  expect(INTERSTITIAL_CONTINUE_LABEL).toBe("I understand — enter the demo");
  expect(INTERSTITIAL_LEARN_MORE_LABEL).toBe("Learn more about the project");
  const paragraphs = interstitialParagraphs("Verizon").map(copyText);
  expect(paragraphs).toEqual([
    "This site is a research prototype built by the EDMA Solid Community of Practice to show how a US mortgage journey could work on Solid personal data stores.",
    "It is modelled on the role Verizon plays in that journey. It was not built by Verizon and is not affiliated with, sponsored by, or endorsed by Verizon. The Verizon name is used only to identify that market role.",
    "Everything here is simulated. Rates, fees, credit decisions, documents, and personas are fictitious and illustrative. Nothing on this site is an offer or solicitation of credit or of any financial product or service.",
    "Do not enter real personal or financial information. Use the demo personas provided.",
  ]);
});

test("R5 illustrative-figure tag (regn-optics §4.4)", () => {
  expect(ILLUSTRATIVE_FIGURE_TAG).toBe("illustrative figure, not an offer");
});

test("R7 demo-field hint", () => {
  expect(DEMO_FIELD_HINT).toBe("Demo field — do not enter real information.");
});

test("R6 demoMetadata — title suffix, OG description, noindex (regn-optics §4.5)", () => {
  expect(demoTitle({ appName: "Data Vault", organization: "Verizon" })).toBe(
    "Data Vault — Concept Demo (not Verizon)",
  );
  expect(demoDescription({ appName: "Data Vault", organization: "Verizon" })).toBe(
    "Concept demonstration by the EDMA Solid Community of Practice — not affiliated with Verizon. All data simulated.",
  );
  const metadata = demoMetadata({ appName: "Data Vault", organization: "Verizon" });
  expect(metadata.openGraph).toEqual({
    description: metadata.description,
    title: metadata.title,
  });
  expect(metadata.robots).toEqual({ follow: false, index: false });
});

test("R6 demoMetadata — own-branded variant", () => {
  const metadata = demoMetadata({
    appName: "Solid Mortgage Tour",
    organization: "EDMA Solid Community of Practice",
    variant: "own",
  });
  expect(metadata.title).toBe("Solid Mortgage Tour — Concept Demo");
  expect(metadata.description).toBe(
    "Concept demonstration by the EDMA Solid Community of Practice. All data simulated.",
  );
  expect(metadata.robots).toEqual({ follow: false, index: false });
});
