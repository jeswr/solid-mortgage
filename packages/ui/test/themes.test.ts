import { expect, test } from "vitest";
import {
  brandCssProperties,
  type OrgThemeId,
  orgThemeIds,
  orgThemes,
  themeCssProperties,
} from "../src/themes.js";

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

test("every theme carries an original product brand; product names are distinct per org", () => {
  const names = new Map<string, string[]>();
  for (const id of orgThemeIds) {
    const brand = orgThemes[id].brand;
    expect(brand, id).toBeDefined();
    if (brand === undefined) continue;
    expect(brand.productName.length).toBeGreaterThan(0);
    expect(brand.markText.length).toBeGreaterThan(0);
    expect(brand.markText.length).toBeLessThanOrEqual(2);
    // Never name the modelled organisation in the fictional product name.
    expect(brand.productName.toLowerCase()).not.toContain(
      orgThemes[id].modelledOn.toLowerCase().split(" ")[0],
    );
    names.set(brand.productName, [...(names.get(brand.productName) ?? []), id]);
  }
  // Only the three verification flows share one suite brand.
  for (const [name, ids] of names) {
    if (ids.length > 1) {
      expect(name).toBe("Proofline Verify");
      expect(ids.every((id) => id.startsWith("verifications-"))).toBe(true);
    }
  }
});

test("brandCssProperties adds font + radius tokens; unbranded themes get palette only", () => {
  const style = brandCssProperties(orgThemes.wallet);
  expect(style["--primary"]).toBe(orgThemes.wallet.tokens.primary);
  expect(style["--font-brand"]).toBe(orgThemes.wallet.brand?.fontStack);
  expect(style["--font-heading"]).toBe(orgThemes.wallet.brand?.fontStack);
  expect(style["--radius-lg"]).toBe(orgThemes.wallet.brand?.radius);
  const { brand: _brand, ...unbranded } = orgThemes.wallet;
  expect(brandCssProperties(unbranded)).toEqual(themeCssProperties(unbranded));
});

test("backgrounds are visibly distinct across member apps", () => {
  const backgrounds = orgThemeIds.map((id) => orgThemes[id].tokens.background);
  expect(new Set(backgrounds).size).toBe(backgrounds.length);
});
