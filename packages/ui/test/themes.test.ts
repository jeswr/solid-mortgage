import { expect, test } from "vitest";
import { type OrgThemeId, orgThemeIds, orgThemes, themeCssProperties } from "../src/themes.js";

const EXPECTED_IDS: OrgThemeId[] = [
  "tour",
  "wallet",
  "verifications-employment",
  "verifications-assets",
  "verifications-credit",
  "lender-boa",
  "lender-53",
  "gse",
  "property-appraisal",
  "property-title",
  "closing-eclose",
  "closing-servicing",
];

const TOKEN_NAMES = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "muted",
  "muted-foreground",
  "border",
  "primary",
  "primary-foreground",
  "accent",
  "accent-foreground",
] as const;

test("one theme per modelled org (decision 0002 app set)", () => {
  expect([...orgThemeIds].sort()).toEqual([...EXPECTED_IDS].sort());
});

test("every theme carries a modelledOn display name, a role string, and full tokens", () => {
  for (const id of orgThemeIds) {
    const theme = orgThemes[id];
    expect(theme.id).toBe(id);
    expect(theme.modelledOn.length).toBeGreaterThan(0);
    expect(theme.role.length).toBeGreaterThan(0);
    // Roles are interpolated into "the {role} role" — guard against "role role".
    expect(theme.role.endsWith("role")).toBe(false);
    for (const token of TOKEN_NAMES) {
      // Palette-inspired original oklch values only — never brand-guideline hex codes.
      expect(theme.tokens[token], `${id}.${token}`).toMatch(/^oklch\(/);
    }
  }
});

test("primary palettes are distinct across orgs", () => {
  const primaries = orgThemeIds.map((id) => orgThemes[id].tokens.primary);
  expect(new Set(primaries).size).toBe(primaries.length);
});

test("R3 — the GSE theme uses role-first AUS framing, never product identifiers", () => {
  expect(orgThemes.gse.role).toBe("automated underwriting service");
});

test("themeCssProperties emits CSS custom properties for every token", () => {
  const style = themeCssProperties(orgThemes.wallet);
  for (const token of TOKEN_NAMES) {
    expect(style[`--${token}`]).toBe(orgThemes.wallet.tokens[token]);
  }
});
