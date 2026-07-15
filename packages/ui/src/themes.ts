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

export interface OrgTheme {
  id: OrgThemeId;
  /** Display name for the "modelled on {X}" framing. */
  modelledOn: string;
  /** Journey role; reads well in "the {role} role" and in header framing. */
  role: string;
  tokens: OrgThemeTokens;
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
}

function paletteTokens(options: PaletteOptions): OrgThemeTokens {
  const { hue } = options;
  return {
    accent: options.accent,
    "accent-foreground": options.accentForeground ?? LIGHT_FOREGROUND,
    background: `oklch(0.985 0.004 ${hue})`,
    border: `oklch(0.87 0.018 ${hue})`,
    card: "oklch(1 0 0)",
    "card-foreground": `oklch(0.21 0.03 ${hue})`,
    foreground: `oklch(0.21 0.03 ${hue})`,
    muted: `oklch(0.93 0.012 ${hue})`,
    "muted-foreground": `oklch(0.45 0.03 ${hue})`,
    primary: options.primary,
    "primary-foreground": options.primaryForeground ?? LIGHT_FOREGROUND,
  };
}

export const orgThemes: Record<OrgThemeId, OrgTheme> = {
  "closing-eclose": {
    id: "closing-eclose",
    modelledOn: "Wolters Kluwer (eOriginal)",
    role: "digital closing platform",
    tokens: paletteTokens({
      accent: "oklch(0.72 0.14 125)",
      accentForeground: DARK_FOREGROUND,
      hue: 240,
      primary: "oklch(0.5 0.11 240)",
    }),
  },
  "closing-servicing": {
    id: "closing-servicing",
    modelledOn: "Truist",
    role: "mortgage servicer",
    tokens: paletteTokens({
      accent: "oklch(0.62 0.07 310)",
      accentForeground: DARK_FOREGROUND,
      hue: 300,
      primary: "oklch(0.34 0.09 300)",
    }),
  },
  gse: {
    id: "gse",
    modelledOn: "Freddie Mac",
    role: "automated underwriting service",
    tokens: paletteTokens({
      accent: "oklch(0.7 0.11 85)",
      accentForeground: DARK_FOREGROUND,
      hue: 210,
      primary: "oklch(0.42 0.08 210)",
    }),
  },
  "lender-53": {
    id: "lender-53",
    modelledOn: "Fifth Third Bank",
    role: "competing mortgage lender",
    tokens: paletteTokens({
      accent: "oklch(0.55 0.12 150)",
      hue: 250,
      primary: "oklch(0.33 0.08 250)",
    }),
  },
  "lender-boa": {
    id: "lender-boa",
    modelledOn: "Bank of America",
    role: "primary mortgage lender",
    tokens: paletteTokens({
      accent: "oklch(0.52 0.16 20)",
      hue: 262,
      primary: "oklch(0.36 0.11 262)",
    }),
  },
  "property-appraisal": {
    id: "property-appraisal",
    modelledOn: "Cotality",
    role: "property appraisal provider",
    tokens: paletteTokens({
      accent: "oklch(0.72 0.15 130)",
      accentForeground: DARK_FOREGROUND,
      hue: 165,
      primary: "oklch(0.4 0.09 165)",
    }),
  },
  "property-title": {
    id: "property-title",
    modelledOn: "First American",
    role: "title insurance provider",
    tokens: paletteTokens({
      accent: "oklch(0.35 0.04 255)",
      hue: 40,
      primary: "oklch(0.47 0.12 40)",
    }),
  },
  tour: {
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
    id: "verifications-assets",
    modelledOn: "Mastercard Finicity",
    role: "financial account data aggregator",
    tokens: paletteTokens({
      accent: "oklch(0.6 0.15 45)",
      hue: 60,
      primary: "oklch(0.5 0.13 60)",
    }),
  },
  "verifications-credit": {
    id: "verifications-credit",
    modelledOn: "Equifax",
    role: "credit reporting agency",
    tokens: paletteTokens({
      accent: "oklch(0.48 0.15 15)",
      hue: 265,
      primary: "oklch(0.32 0.05 265)",
    }),
  },
  "verifications-employment": {
    id: "verifications-employment",
    modelledOn: "The Work Number (Equifax)",
    role: "employment and income verifier",
    tokens: paletteTokens({
      accent: "oklch(0.45 0.07 260)",
      hue: 15,
      primary: "oklch(0.4 0.14 10)",
    }),
  },
  wallet: {
    id: "wallet",
    modelledOn: "Verizon",
    role: "consumer data custodian",
    tokens: paletteTokens({
      accent: "oklch(0.5 0.19 20)",
      hue: 270,
      primary: "oklch(0.22 0.012 270)",
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
