// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test } from "vitest";
import { ConsentInterstitial } from "../src/consent-interstitial.js";
import {
  copyText,
  INTERSTITIAL_CONTINUE_LABEL,
  INTERSTITIAL_HEADING,
  interstitialParagraphs,
} from "../src/disclaimers.js";

const APP_ID = "test-app";

function clearConsentCookie() {
  // biome-ignore lint/suspicious/noDocumentCookie: jsdom has no Cookie Store API; test-only cleanup.
  document.cookie = `sm-demo-consent-${APP_ID}=; max-age=0; path=/`;
}

beforeEach(clearConsentCookie);
afterEach(() => {
  cleanup();
  clearConsentCookie();
});

test("first visit: renders the §4.2 copy, blocks scroll, and takes focus", async () => {
  render(<ConsentInterstitial appId={APP_ID} organization="Verizon" />);
  const dialog = screen.getByRole("dialog", { name: INTERSTITIAL_HEADING });
  expect(dialog.getAttribute("aria-modal")).toBe("true");
  for (const paragraph of interstitialParagraphs("Verizon")) {
    expect(dialog.textContent).toContain(copyText(paragraph));
  }
  expect(screen.getByRole("link", { name: "Learn more about the project" })).toBeDefined();
  expect(document.body.style.overflow).toBe("hidden");
  await waitFor(() => expect(document.activeElement).toBe(dialog));
});

test("affirmative continue persists the cookie and dismisses the dialog", () => {
  render(<ConsentInterstitial appId={APP_ID} organization="Verizon" />);
  fireEvent.click(screen.getByRole("button", { name: INTERSTITIAL_CONTINUE_LABEL }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.cookie).toContain(`sm-demo-consent-${APP_ID}=1`);
  expect(document.body.style.overflow).toBe("");
});

test("returning visit: consent cookie suppresses the interstitial", async () => {
  // biome-ignore lint/suspicious/noDocumentCookie: jsdom has no Cookie Store API; test-only setup.
  document.cookie = `sm-demo-consent-${APP_ID}=1; path=/`;
  render(<ConsentInterstitial appId={APP_ID} organization="Verizon" />);
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

test("Escape does not dismiss it — continuing must be affirmative", () => {
  render(<ConsentInterstitial appId={APP_ID} organization="Verizon" />);
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeNull();
});

test("Tab is trapped inside the dialog", () => {
  render(<ConsentInterstitial appId={APP_ID} organization="Verizon" />);
  const dialog = screen.getByRole("dialog");
  const continueButton = screen.getByRole("button", { name: INTERSTITIAL_CONTINUE_LABEL });
  const learnMoreLink = screen.getByRole("link", { name: "Learn more about the project" });
  learnMoreLink.focus();
  fireEvent.keyDown(dialog, { key: "Tab" });
  expect(document.activeElement).toBe(continueButton);
  fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(learnMoreLink);
});

test("own variant (sm-90e): collective role negation, no self-negation of the convener", () => {
  render(
    <ConsentInterstitial
      appId={APP_ID}
      organization="EDMA Solid Community of Practice"
      variant="own"
    />,
  );
  const dialog = screen.getByRole("dialog", { name: INTERSTITIAL_HEADING });
  for (const paragraph of interstitialParagraphs("EDMA Solid Community of Practice", "own")) {
    expect(dialog.textContent).toContain(copyText(paragraph));
  }
  expect(dialog.textContent).not.toContain("not built by EDMA");
});
