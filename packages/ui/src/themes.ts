/**
 * Per-organisation theme tokens (decision 0002).
 *
 * Palette-INSPIRED, adjacent-but-distinct: each theme sits in the hue neighbourhood of the
 * modelled organisation's public palette family but deliberately does NOT reproduce any
 * brand-guideline colour value — every token is an original oklch value. No logos or trade
 * dress anywhere; naming is role-first ("modelled on X", never "by X").
 *
 * Consumption: the tokens are CSS custom properties matching the app `globals.css`
 * convention (`--background`, `--primary`, …) which each app maps to Tailwind via
 * `@theme inline` (`--color-background: var(--background)`, …). Apply a theme by spreading
 * `themeCssProperties(theme)` onto a wrapper's `style` — `AppShell` does this for you.
 * Apps that use the `accent` tokens must add the `--color-accent`/`--color-accent-foreground`
 * mappings to their `@theme inline` block.
 */

export type OrgThemeId =
  | "tour"
  | "wallet"
  | "verifications-employment"
  | "verifications-assets"
  | "verifications-credit"
  | "lender-boa"
  | "lender-53"
  | "gse"
  | "property-appraisal"
  | "property-title"
  | "closing-eclose"
  | "closing-servicing";

export interface OrgThemeTokens {
  background: string;
  foreground: string;
  card: string;
  "card-foreground": string;
  muted: string;
  "muted-foreground": string;
  border: string;
  primary: string;
  "primary-foreground": string;
  accent: string;
  "accent-foreground": string;
}

/**
 * Header treatment for a branded product. Each is an ORIGINAL layout, not any real
 * organisation's trade dress:
 * - `solid` — full-bleed primary bar, light text.
 * - `gradient` — full-bleed primary→accent wash, light text.
 * - `underline` — light bar with a heavy primary rule beneath.
 * - `topbar` — light bar under a thin primary band.
 * - `split` — two-tone: a slim primary utility strip above a light product row.
 * - `pill` — floating rounded card on the page background.
 * - `minimal` — plain light bar with a hairline border (the neutral convener hub).
 */
export type BrandHeaderStyle =
  | "solid"
  | "gradient"
  | "underline"
  | "topbar"
  | "split"
  | "pill"
  | "minimal";

/** Abstract geometric container for the monogram (never a real organisation's logo). */
export type BrandMarkShape = "circle" | "rounded-square" | "hexagon" | "diamond" | "notch";

/**
 * An ORIGINAL fictional product identity layered over the modelled role. The product name
 * is the demo's own invention; the "{role} · modelled on {X}" framing line always renders
 * beneath it, so the real organisation is only ever named nominatively (decision 0002).
 * Fonts are system stacks only — no network font downloads.
 */
export interface OrgBrand {
  /** Original fictional product name shown prominently in the header. */
  productName: string;
  /** 1–2 character monogram drawn inside {@link markShape}. */
  markText: string;
  markShape: BrandMarkShape;
  header: BrandHeaderStyle;
  /** Body font stack (system fonts only). */
  fontStack: string;
  /** Optional heading font stack (h1–h3); defaults to {@link fontStack}. */
  headingFontStack?: string;
  /** Base corner radius (CSS length) — drives `--radius` and the Tailwind radius scale. */
  radius: string;
  /** Header padding density. */
  density: "compact" | "comfortable" | "spacious";
  /** Content width of the header/footer frame. */
  width?: "5xl" | "6xl" | "7xl";
  /** Uppercase, letter-spaced product name (technical/console feel). */
  uppercaseName?: boolean;
  /** Short product descriptor shown in the `split` utility strip. */
  tagline?: string;
}

export interface OrgTheme {
  id: OrgThemeId;
  /** Display name for the "modelled on {X}" framing. */
  modelledOn: string;
  /** Journey role; reads well in "the {role} role" and in header framing. */
  role: string;
  tokens: OrgThemeTokens;
  /** Optional original product identity (name, mark, header, type, shape). */
  brand?: OrgBrand;
}

const LIGHT_FOREGROUND = "oklch(0.985 0.003 250)";
const DARK_FOREGROUND = "oklch(0.24 0.02 250)";

interface PaletteOptions {
  /** Neutral hue anchor for background/foreground/muted/border. */
  hue: number;
  primary: string;
  primaryForeground?: string;
  accent: string;
  accentForeground?: string;
  /** Page background tint: lightness + chroma at {@link hue} (default near-white). */
  backgroundLightness?: number;
  backgroundChroma?: number;
  /** Card tint chroma at {@link hue} (default pure white). */
  cardChroma?: number;
}

function paletteTokens(options: PaletteOptions): OrgThemeTokens {
  const { hue } = options;
  const bgL = options.backgroundLightness ?? 0.985;
  const bgC = options.backgroundChroma ?? 0.004;
  const cardC = options.cardChroma ?? 0;
  return {
    accent: options.accent,
    "accent-foreground": options.accentForeground ?? LIGHT_FOREGROUND,
    background: `oklch(${bgL} ${bgC} ${hue})`,
    border: `oklch(${(bgL - 0.115).toFixed(3)} ${(bgC + 0.014).toFixed(3)} ${hue})`,
    card: cardC === 0 ? "oklch(1 0 0)" : `oklch(0.995 ${cardC} ${hue})`,
    "card-foreground": `oklch(0.21 0.03 ${hue})`,
    foreground: `oklch(0.21 0.03 ${hue})`,
    muted: `oklch(${(bgL - 0.05).toFixed(3)} ${(bgC + 0.008).toFixed(3)} ${hue})`,
    "muted-foreground": `oklch(0.44 0.03 ${hue})`,
    primary: options.primary,
    "primary-foreground": options.primaryForeground ?? LIGHT_FOREGROUND,
  };
}

/** System font stacks (no downloads). */
const FONT = {
  condensed:
    'Bahnschrift, "DIN Alternate", "Roboto Condensed", "Arial Narrow", "Franklin Gothic Medium", sans-serif',
  geometric:
    'Avenir, "Avenir Next", Montserrat, Corbel, "URW Gothic", "Century Gothic", sans-serif',
  grotesque: 'Inter, Roboto, "Helvetica Neue", "Arial Nova", "Nimbus Sans", Arial, sans-serif',
  humanist:
    'Seravek, "Gill Sans Nova", "Gill Sans", Ubuntu, Calibri, "DejaVu Sans", "Trebuchet MS", sans-serif',
  classical: 'Optima, Candara, "Noto Sans", "Segoe UI", sans-serif',
  oldStyle:
    '"Iowan Old Style", "Palatino Linotype", Palatino, "URW Palladio L", P052, Georgia, serif',
  rounded:
    'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", Quicksand, Comfortaa, Manjari, "Arial Rounded MT", "Arial Rounded MT Bold", Calibri, sans-serif',
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  transitional: 'Charter, "Bitstream Charter", "Sitka Text", Cambria, Georgia, serif',
} as const;

/** One shared product identity across the three verification issuer flows. */
const PROOFLINE_BRAND: OrgBrand = {
  density: "comfortable",
  fontStack: FONT.grotesque,
  header: "topbar",
  markShape: "notch",
  markText: "Pv",
  productName: "Proofline Verify",
  radius: "0.25rem",
  width: "6xl",
};

export const orgThemes: Record<OrgThemeId, OrgTheme> = {
  "closing-eclose": {
    brand: {
      density: "comfortable",
      fontStack: FONT.classical,
      header: "gradient",
      markShape: "circle",
      markText: "Sp",
      productName: "SealPoint eClose",
      radius: "1rem",
      width: "6xl",
    },
    id: "closing-eclose",
    modelledOn: "Wolters Kluwer (eOriginal)",
    role: "digital closing platform",
    tokens: paletteTokens({
      accent: "oklch(0.72 0.14 125)",
      accentForeground: DARK_FOREGROUND,
      backgroundChroma: 0.014,
      backgroundLightness: 0.972,
      hue: 228,
      primary: "oklch(0.46 0.13 248)",
    }),
  },
  "closing-servicing": {
    brand: {
      density: "comfortable",
      fontStack: FONT.humanist,
      header: "underline",
      markShape: "rounded-square",
      markText: "Lw",
      productName: "Lanternway Loan Servicing",
      radius: "0.5rem",
    },
    id: "closing-servicing",
    modelledOn: "Truist",
    role: "mortgage servicer",
    tokens: paletteTokens({
      accent: "oklch(0.62 0.07 310)",
      accentForeground: DARK_FOREGROUND,
      backgroundChroma: 0.016,
      backgroundLightness: 0.968,
      hue: 300,
      primary: "oklch(0.34 0.09 300)",
    }),
  },
  gse: {
    brand: {
      density: "compact",
      fontStack: FONT.condensed,
      header: "solid",
      markShape: "hexagon",
      markText: "K",
      productName: "Keystone Underwriting",
      radius: "0.125rem",
      uppercaseName: true,
      width: "7xl",
    },
    id: "gse",
    modelledOn: "Freddie Mac",
    role: "automated underwriting service",
    tokens: paletteTokens({
      accent: "oklch(0.74 0.12 80)",
      accentForeground: DARK_FOREGROUND,
      backgroundChroma: 0.008,
      backgroundLightness: 0.95,
      hue: 220,
      primary: "oklch(0.3 0.045 220)",
    }),
  },
  "lender-53": {
    brand: {
      density: "comfortable",
      fontStack: FONT.humanist,
      header: "split",
      markShape: "diamond",
      markText: "N",
      productName: "Northgate Mortgage",
      radius: "0.75rem",
      tagline: "Home loans · rate quotes · pre-qualification",
      width: "6xl",
    },
    id: "lender-53",
    modelledOn: "Fifth Third Bank",
    role: "competing mortgage lender",
    tokens: paletteTokens({
      accent: "oklch(0.56 0.13 155)",
      backgroundChroma: 0.016,
      backgroundLightness: 0.972,
      hue: 165,
      primary: "oklch(0.36 0.1 245)",
    }),
  },
  "lender-boa": {
    brand: {
      density: "spacious",
      fontStack: FONT.system,
      header: "underline",
      headingFontStack: FONT.oldStyle,
      markShape: "rounded-square",
      markText: "H",
      productName: "Harborline Home Loans",
      radius: "0.375rem",
      width: "6xl",
    },
    id: "lender-boa",
    modelledOn: "Bank of America",
    role: "primary mortgage lender",
    tokens: paletteTokens({
      accent: "oklch(0.5 0.14 28)",
      backgroundChroma: 0.014,
      backgroundLightness: 0.975,
      cardChroma: 0.004,
      hue: 85,
      primary: "oklch(0.34 0.11 258)",
    }),
  },
  "property-appraisal": {
    brand: {
      density: "comfortable",
      fontStack: FONT.geometric,
      header: "solid",
      markShape: "notch",
      markText: "Gw",
      productName: "Groundwork Valuation",
      radius: "0.875rem",
      width: "6xl",
    },
    id: "property-appraisal",
    modelledOn: "Cotality",
    role: "property appraisal provider",
    tokens: paletteTokens({
      accent: "oklch(0.74 0.15 128)",
      accentForeground: DARK_FOREGROUND,
      backgroundChroma: 0.018,
      backgroundLightness: 0.968,
      hue: 150,
      primary: "oklch(0.38 0.085 168)",
    }),
  },
  "property-title": {
    brand: {
      density: "comfortable",
      fontStack: FONT.transitional,
      header: "topbar",
      markShape: "diamond",
      markText: "P",
      productName: "Parcel & Title Services",
      radius: "0.2rem",
      width: "6xl",
    },
    id: "property-title",
    modelledOn: "First American",
    role: "title insurance provider",
    tokens: paletteTokens({
      accent: "oklch(0.35 0.04 255)",
      backgroundChroma: 0.02,
      backgroundLightness: 0.962,
      hue: 70,
      primary: "oklch(0.47 0.12 40)",
    }),
  },
  tour: {
    brand: {
      density: "comfortable",
      fontStack: FONT.system,
      header: "minimal",
      markShape: "rounded-square",
      markText: "SM",
      productName: "Solid Mortgage Showcase",
      radius: "0.625rem",
      width: "6xl",
    },
    id: "tour",
    modelledOn: "EDMA Solid Community of Practice",
    role: "convener",
    tokens: paletteTokens({
      accent: "oklch(0.55 0.1 250)",
      hue: 260,
      primary: "oklch(0.279 0.041 260)",
    }),
  },
  "verifications-assets": {
    brand: PROOFLINE_BRAND,
    id: "verifications-assets",
    modelledOn: "Mastercard Finicity",
    role: "financial account data aggregator",
    tokens: paletteTokens({
      accent: "oklch(0.6 0.15 45)",
      backgroundChroma: 0.012,
      backgroundLightness: 0.975,
      hue: 60,
      primary: "oklch(0.5 0.13 60)",
    }),
  },
  "verifications-credit": {
    brand: PROOFLINE_BRAND,
    id: "verifications-credit",
    modelledOn: "Equifax",
    role: "credit reporting agency",
    tokens: paletteTokens({
      accent: "oklch(0.48 0.15 15)",
      backgroundChroma: 0.01,
      backgroundLightness: 0.975,
      hue: 235,
      primary: "oklch(0.32 0.05 265)",
    }),
  },
  "verifications-employment": {
    brand: PROOFLINE_BRAND,
    id: "verifications-employment",
    modelledOn: "The Work Number (Equifax)",
    role: "employment and income verifier",
    tokens: paletteTokens({
      accent: "oklch(0.45 0.07 260)",
      backgroundChroma: 0.01,
      backgroundLightness: 0.977,
      hue: 15,
      primary: "oklch(0.4 0.14 10)",
    }),
  },
  wallet: {
    brand: {
      density: "comfortable",
      fontStack: FONT.rounded,
      header: "pill",
      markShape: "rounded-square",
      markText: "Hf",
      productName: "Homefile Vault",
      radius: "1.25rem",
      width: "6xl",
    },
    id: "wallet",
    modelledOn: "Verizon",
    role: "consumer data custodian",
    tokens: paletteTokens({
      accent: "oklch(0.6 0.17 35)",
      backgroundChroma: 0.018,
      backgroundLightness: 0.968,
      hue: 295,
      primary: "oklch(0.3 0.06 290)",
    }),
  },
};

export const orgThemeIds = Object.keys(orgThemes) as OrgThemeId[];

export type ThemeStyleProperties = Record<`--${string}`, string>;

/** CSS custom properties for a theme, ready to spread onto a `style` prop. */
export function themeCssProperties(theme: OrgTheme): ThemeStyleProperties {
  const style: ThemeStyleProperties = {};
  for (const [token, value] of Object.entries(theme.tokens)) {
    style[`--${token}`] = value;
  }
  return style;
}

/**
 * Theme tokens plus the brand's font and radius scale as CSS custom properties. Spread onto
 * the frame that should carry the product identity (`AppShell` does this for you).
 */
export function brandCssProperties(theme: OrgTheme): ThemeStyleProperties {
  const style = themeCssProperties(theme);
  const brand = theme.brand;
  if (brand === undefined) return style;
  style["--font-brand"] = brand.fontStack;
  style["--font-heading"] = brand.headingFontStack ?? brand.fontStack;
  style["--radius"] = brand.radius;
  style["--radius-sm"] = `calc(${brand.radius} * 0.5)`;
  style["--radius-md"] = `calc(${brand.radius} * 0.75)`;
  style["--radius-lg"] = brand.radius;
  style["--radius-xl"] = `calc(${brand.radius} * 1.5)`;
  style["--radius-2xl"] = `calc(${brand.radius} * 2)`;
  return style;
}
