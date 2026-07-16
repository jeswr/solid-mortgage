// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { AppShell } from "../src/app-shell.js";
import { CredentialCard } from "../src/credential-card.js";
import { DemoLockedField } from "../src/demo-locked-field.js";
import { bannerFullText, DEMO_FIELD_HINT, footerLegalLine } from "../src/disclaimers.js";
import { HonestyPanel } from "../src/honesty-panel.js";
import { IllustrativeFigure } from "../src/illustrative-figure.js";
import { ReceiptCard } from "../src/receipt-card.js";
import { StatCard } from "../src/stat-card.js";
import { orgThemes } from "../src/themes.js";

afterEach(cleanup);

test("IllustrativeFigure keeps the R5 tag in the same element as the figure", () => {
  const { container } = render(<IllustrativeFigure>6.875%</IllustrativeFigure>);
  const figure = container.querySelector("[data-illustrative-figure]");
  expect(figure?.textContent).toBe("6.875% — illustrative figure, not an offer");
});

test("DemoLockedField is read-only and hint-described by default (R7)", () => {
  render(<DemoLockedField label="Full name" value="Jordan Demo" />);
  const input = screen.getByLabelText<HTMLInputElement>("Full name");
  expect(input.readOnly).toBe(true);
  expect(input.value).toBe("Jordan Demo");
  const hintId = input.getAttribute("aria-describedby");
  expect(hintId).not.toBeNull();
  expect(document.getElementById(hintId as string)?.textContent).toBe(DEMO_FIELD_HINT);
});

test("DemoLockedField editable variant stays prefilled and keeps the hint", () => {
  render(<DemoLockedField editable label="Preferred contact" value="demo@example.org" />);
  const input = screen.getByLabelText<HTMLInputElement>("Preferred contact");
  expect(input.readOnly).toBe(false);
  expect(input.value).toBe("demo@example.org");
  expect(screen.getByText(DEMO_FIELD_HINT)).toBeDefined();
});

test("DemoLockedField hint prop is supplemental — the R7 warning cannot be replaced", () => {
  render(<DemoLockedField hint="Use persona Jordan Demo." label="City" value="Springfield" />);
  const input = screen.getByLabelText<HTMLInputElement>("City");
  const hintId = input.getAttribute("aria-describedby");
  expect(document.getElementById(hintId as string)?.textContent).toBe(
    `${DEMO_FIELD_HINT} Use persona Jordan Demo.`,
  );
});

test("AppShell frames the app with role-first header, adjacent banner, footer, and theme", () => {
  const theme = orgThemes.wallet;
  const { container } = render(
    <AppShell appName="Data Vault" theme={theme}>
      <main>content</main>
    </AppShell>,
  );
  expect(screen.getByText("Data Vault")).toBeDefined();
  expect(screen.getByText("consumer data custodian · modelled on Verizon")).toBeDefined();
  const banner = container.querySelector("[data-concept-demo-banner]");
  expect(banner?.textContent).toContain(
    bannerFullText({ organization: theme.modelledOn, role: theme.role }),
  );
  expect(container.querySelector("[data-demo-footer]")?.textContent).toBe(
    footerLegalLine({ organization: theme.modelledOn }),
  );
  const shell = container.querySelector<HTMLElement>("[data-app-shell]");
  expect(shell?.style.getPropertyValue("--primary")).toBe(theme.tokens.primary);
});

test("AppShell own-branded variant (tour) frames without source-negation", () => {
  const theme = orgThemes.tour;
  const { container } = render(
    <AppShell appName="Solid Mortgage Tour" theme={theme} variant="own">
      <main>content</main>
    </AppShell>,
  );
  expect(screen.getByText("convener · EDMA Solid Community of Practice")).toBeDefined();
  expect(container.querySelector("[data-concept-demo-banner]")?.textContent).not.toContain(
    "this is not",
  );
  expect(container.querySelector("[data-demo-footer]")?.textContent).not.toContain(
    "Not affiliated",
  );
});

test("StatCard wraps illustrative values in the R5 tag", () => {
  const { container } = render(
    <StatCard detail="30-year fixed" illustrative label="Quoted rate" value="6.875%" />,
  );
  expect(screen.getByText("Quoted rate")).toBeDefined();
  expect(container.querySelector("[data-illustrative-figure]")?.textContent).toBe(
    "6.875% — illustrative figure, not an offer",
  );
  expect(screen.getByText("30-year fixed")).toBeDefined();
});

test("CredentialCard shows issuer, validity window, and a non-colour-only status", () => {
  const { container } = render(
    <CredentialCard
      issuer="employment and income verifier (demo)"
      status="revoked"
      title="Employment and income"
      validFrom="2026-01-01"
      validUntil="2027-01-01"
    />,
  );
  expect(screen.getByText("Issued by employment and income verifier (demo)")).toBeDefined();
  expect(screen.getByText("Valid from 2026-01-01 · until 2027-01-01")).toBeDefined();
  const status = container.querySelector("[data-credential-status='revoked']");
  expect(status?.textContent).toContain("Revoked");
});

test("HonestyPanel is a native disclosure with injected real/simulated content", () => {
  const { container } = render(
    <HonestyPanel real={<p>Actual Solid pod reads</p>} simulated={<p>Rates and decisions</p>} />,
  );
  const details = container.querySelector<HTMLDetailsElement>("details[data-honesty-panel]");
  expect(details?.open).toBe(false);
  expect(screen.getByText("What is real and what is simulated?")).toBeDefined();
  expect(screen.getByText("Actual Solid pod reads")).toBeDefined();
  expect(screen.getByText("Rates and decisions")).toBeDefined();
  cleanup();
  const { container: openContainer } = render(<HonestyPanel defaultOpen real="r" simulated="s" />);
  expect(openContainer.querySelector<HTMLDetailsElement>("details")?.open).toBe(true);
});

test("ReceiptCard renders the app-level who, what, and when trail", () => {
  const { container } = render(
    <ReceiptCard
      action="revoke"
      actor="https://pod.example/profile/card#me"
      issuedAt="2026-07-16T14:30:00.000Z"
      recipient="https://lender.example/profile/card#service"
      resource="https://pod.example/mortgage/closing-record"
    />,
  );
  expect(screen.getByRole("heading", { name: "Access revoked", level: 3 })).toBeDefined();
  expect(screen.getByText("https://pod.example/profile/card#me")).toBeDefined();
  expect(screen.getByText("https://lender.example/profile/card#service")).toBeDefined();
  expect(screen.getByText("https://pod.example/mortgage/closing-record")).toBeDefined();
  expect(container.querySelector("time")?.getAttribute("datetime")).toBe(
    "2026-07-16T14:30:00.000Z",
  );
  expect(screen.getByText(/written by this application/)).toBeDefined();
});
