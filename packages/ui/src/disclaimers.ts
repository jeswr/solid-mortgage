/**
 * Disclaimer copy pack v2 — the single source of truth for the EXACT wording required by
 * decision 0002 (R1/R5/R6/R8 addendum) and docs/research/regn-optics.md §4.
 *
 * Components in this package render these strings; unit tests and the shared Playwright
 * suite import them so the asserted copy can never drift from the rendered copy.
 *
 * `variant`:
 * - "modelled" (default) — branded apps modelled on a real organisation; copy negates
 *   source ("this is not {Org}") and offer ("not an offer of credit").
 * - "own" — surfaces published under the convener's own branding (apps/tour), where
 *   source-negation against the convener would be self-contradictory.
 */

export const EDMA_NAME = "EDMA Solid Community of Practice";

export type DisclaimerVariant = "modelled" | "own";

/** A run of copy; `strong` marks the phrases regn-optics §4.2 renders bold. */
export interface CopySegment {
  text: string;
  strong?: boolean;
}

/** Flatten copy segments to the plain text an e2e assertion sees. */
export function copyText(segments: CopySegment[]): string {
  return segments.map((segment) => segment.text).join("");
}

export interface BannerCopyOptions {
  organization: string;
  /** Journey role, e.g. "primary mortgage lender"; rendered as "modelled on the {role} role". */
  role?: string;
  variant?: DisclaimerVariant;
}

export interface BannerCopy {
  /** Leading phrase, rendered bold (the four-Ps "headline corrector"). */
  lead: string;
  /** Remainder of the sentence(s), rendered at the same prominence tier. */
  rest: string;
  /** Visible text of the "About this demo" link. */
  aboutLabel: string;
}

/**
 * True when `organization` lists several organisations ("Cotality and First American",
 * "The Work Number, Finicity, or Equifax"): the copy then names them once and refers back
 * to "these organisations" (astra-review-2 L1).
 */
export function namesSeveralOrganisations(organization: string): boolean {
  return /,| and | or /.test(organization);
}

/** R1 banner copy v3, desktop variant (shortened per astra-review-2 L1; R1 elements kept). */
export function bannerFullCopy(options: BannerCopyOptions): BannerCopy {
  if (options.variant === "own") {
    return {
      lead: "Concept demo.",
      rest: ` A research prototype by the ${EDMA_NAME}. Simulated data. Not an offer of credit.`,
      aboutLabel: "About this demo",
    };
  }
  const reference = namesSeveralOrganisations(options.organization)
    ? "these organisations"
    : options.organization;
  const roleClause = options.role === undefined ? "" : ` Modelled on the ${options.role} role.`;
  return {
    lead: `Concept demo — this is not ${options.organization}.`,
    rest: `${roleClause} Not affiliated with, sponsored by or endorsed by ${reference}. Simulated data. Not an offer of credit.`,
    aboutLabel: "About this demo",
  };
}

/** R1 banner copy v2, mobile-compressed variant (same element, small screens). */
export function bannerCompactCopy(options: BannerCopyOptions): BannerCopy {
  if (options.variant === "own") {
    return {
      lead: "Concept demo.",
      rest: " Simulated data. Not an offer of credit.",
      aboutLabel: "About",
    };
  }
  return {
    lead: `Concept demo — not ${options.organization}.`,
    rest: " Simulated data. Not an offer of credit.",
    aboutLabel: "About",
  };
}

/** Full desktop banner text as a single string (for assertions). */
export function bannerFullText(options: BannerCopyOptions): string {
  const copy = bannerFullCopy(options);
  return `${copy.lead}${copy.rest}`;
}

/** Compact banner text as a single string (for assertions). */
export function bannerCompactText(options: BannerCopyOptions): string {
  const copy = bannerCompactCopy(options);
  return `${copy.lead}${copy.rest}`;
}

export interface FooterCopyOptions {
  organization: string;
  variant?: DisclaimerVariant;
}

/** Footer legal line, every page (regn-optics §4.3). */
export function footerLegalLine(options: FooterCopyOptions): string {
  const segments = ["Concept demonstration", EDMA_NAME];
  if (options.variant !== "own") {
    segments.push(`Not affiliated with, sponsored by, or endorsed by ${options.organization}`);
  }
  segments.push(
    "All data simulated",
    "Not an offer of credit",
    "Do not enter real personal information",
  );
  return segments.join(" · ");
}

/** R8 interstitial labels (regn-optics §4.2). */
export const INTERSTITIAL_HEADING = "You're entering a concept demonstration";
export const INTERSTITIAL_CONTINUE_LABEL = "I understand — enter the demo";
export const INTERSTITIAL_LEARN_MORE_LABEL = "Learn more about the project";

/** Simulation paragraph — shared verbatim by both interstitial variants. */
const SIMULATED_PARAGRAPH: CopySegment[] = [
  { strong: true, text: "All people, data, rates, fees, decisions and documents are simulated." },
  { text: " This is not an offer or solicitation of credit or financial services." },
];

/** Do-not-enter paragraph — shared verbatim by both interstitial variants. */
const DO_NOT_ENTER_PARAGRAPH: CopySegment[] = [
  { strong: true, text: "Do not enter real personal or financial information." },
  { text: " Use the supplied demo data." },
];

/** Convener paragraph — shared verbatim by both interstitial variants. */
const CONVENER_PARAGRAPH: CopySegment[] = [
  { text: "This research prototype was built by the " },
  { strong: true, text: EDMA_NAME },
  { text: " to demonstrate a US mortgage journey using Solid personal data stores." },
];

/** The organisation paragraph of the modelled variant (R8: "not built by {Org}"). */
function modelledParagraph(organization: string): CopySegment[] {
  if (namesSeveralOrganisations(organization)) {
    return [
      { text: "This app models the roles " },
      { strong: true, text: organization },
      { text: " play in that journey. It was " },
      { strong: true, text: "not built by these organisations" },
      { text: " and is " },
      { strong: true, text: "not affiliated with, sponsored by or endorsed by any of them" },
      { text: "." },
    ];
  }
  return [
    { text: "This app models the role " },
    { strong: true, text: organization },
    { text: " plays in that journey. It was " },
    { strong: true, text: `not built by ${organization}` },
    { text: " and is " },
    { strong: true, text: `not affiliated with, sponsored by or endorsed by ${organization}` },
    { text: "." },
  ];
}

/**
 * The four interstitial paragraphs, with the bold phrases marked (R8 v3, shortened per
 * astra-review-2 L1; "not built by", "offer or solicitation" and "do not enter real personal
 * or financial information" are kept).
 *
 * `variant: "own"` (the convener-branded tour app, sm-90e) replaces the org-negation
 * paragraph — negating the convener against itself would be self-contradictory — with a
 * collective negation of every organisation named inside the demo. The other paragraphs are
 * shared verbatim with the modelled variant so the R8 core copy cannot drift.
 */
export function interstitialParagraphs(
  organization: string,
  variant: DisclaimerVariant = "modelled",
): CopySegment[][] {
  if (variant === "own") {
    return [
      CONVENER_PARAGRAPH,
      [
        { text: "Organisations named in this demo " },
        { strong: true, text: "illustrate market roles only" },
        { text: ". " },
        { strong: true, text: "None of them built it" },
        { text: ", and " },
        { strong: true, text: "none is affiliated with, sponsors or endorses it" },
        { text: "." },
      ],
      SIMULATED_PARAGRAPH,
      DO_NOT_ENTER_PARAGRAPH,
    ];
  }
  return [
    CONVENER_PARAGRAPH,
    modelledParagraph(organization),
    SIMULATED_PARAGRAPH,
    DO_NOT_ENTER_PARAGRAPH,
  ];
}

/** R5 inline tag rendered adjacent to every rate/fee/payment/decision (regn-optics §4.4). */
export const ILLUSTRATIVE_FIGURE_TAG = "illustrative figure, not an offer";

/** R7 default hint for demo form fields. */
export const DEMO_FIELD_HINT = "Demo field — do not enter real information.";

export interface DemoMetadataOptions {
  appName: string;
  organization: string;
  variant?: DisclaimerVariant;
}

/** Structurally compatible with Next.js `Metadata` without depending on `next`. */
export interface DemoMetadata {
  title: string;
  description: string;
  openGraph: { title: string; description: string };
  robots: { index: false; follow: false };
}

/** R6 `<title>` — suffixed "— Concept Demo (not {Org})" on every branded app. */
export function demoTitle(options: DemoMetadataOptions): string {
  if (options.variant === "own") return `${options.appName} — Concept Demo`;
  return `${options.appName} — Concept Demo (not ${options.organization})`;
}

/** R6 meta/OG description — leads with the non-affiliation line (regn-optics §4.5). */
export function demoDescription(options: DemoMetadataOptions): string {
  if (options.variant === "own") {
    return `Concept demonstration by the ${EDMA_NAME}. All data simulated.`;
  }
  return `Concept demonstration by the ${EDMA_NAME} — not affiliated with ${options.organization}. All data simulated.`;
}

/**
 * R6 metadata helper for app layouts: title suffix + OG description + noindex.
 *
 * Usage: `export const metadata: Metadata = demoMetadata({ appName, organization });`
 */
export function demoMetadata(options: DemoMetadataOptions): DemoMetadata {
  const title = demoTitle(options);
  const description = demoDescription(options);
  return {
    title,
    description,
    openGraph: { title, description },
    robots: { follow: false, index: false },
  };
}
