/**
 * Property app identity. ONE Next.js app hosting two distinctly-branded issuer
 * flows (decision 0002): a Cotality-modelled appraisal flow and a First
 * American-modelled title flow. The org labels here drive the per-flow
 * `AppShell` theme framing and the R6 metadata; the theme tokens live in
 * `@mortgage/ui` (`orgThemes["property-appraisal" | "property-title"]`).
 */
export const site = {
  appName: "Property Services",
  /** Both organisations named in the hub metadata / banner. */
  organization: "Cotality and First American",
} as const;

/** The Cotality-modelled appraisal flow. */
export const appraisalBrand = {
  appName: "Appraisal Services",
  organization: "Cotality",
  role: "property appraisal provider",
} as const;

/** The First American-modelled title flow. */
export const titleBrand = {
  appName: "Title Services",
  organization: "First American",
  role: "title insurance provider",
} as const;
