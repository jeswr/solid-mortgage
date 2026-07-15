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

/** R1 banner copy v2, desktop variant (regn-optics §4.1). */
export function bannerFullCopy(options: BannerCopyOptions): BannerCopy {
  if (options.variant === "own") {
    return {
      lead: "Concept demo.",
      rest: ` A research prototype by the ${EDMA_NAME}. All data is simulated. Nothing here is an offer of credit.`,
      aboutLabel: "About this demo",
    };
  }
  const roleClause = options.role === undefined ? "" : `, modelled on the ${options.role} role`;
  return {
    lead: `Concept demo — this is not ${options.organization}.`,
    rest: ` A research prototype by the ${EDMA_NAME}${roleClause}. All data is simulated. Nothing here is an offer of credit.`,
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

/** R8 interstitial copy v2 (regn-optics §4.2). */
export const INTERSTITIAL_HEADING = "You're entering a concept demonstration";
export const INTERSTITIAL_CONTINUE_LABEL = "I understand — enter the demo";
export const INTERSTITIAL_LEARN_MORE_LABEL = "Learn more about the project";

/** The four interstitial paragraphs, with the §4.2 bold phrases marked. */
export function interstitialParagraphs(organization: string): CopySegment[][] {
  return [
    [
      { text: "This site is a research prototype built by the " },
      { strong: true, text: EDMA_NAME },
      { text: " to show how a US mortgage journey could work on Solid personal data stores." },
    ],
    [
      { text: "It is modelled on the role " },
      { strong: true, text: organization },
      { text: " plays in that journey. It was " },
      { strong: true, text: `not built by ${organization}` },
      { text: " and is " },
      { strong: true, text: `not affiliated with, sponsored by, or endorsed by ${organization}` },
      { text: `. The ${organization} name is used only to identify that market role.` },
    ],
    [
      { strong: true, text: "Everything here is simulated." },
      {
        text: " Rates, fees, credit decisions, documents, and personas are fictitious and illustrative. Nothing on this site is an offer or solicitation of credit or of any financial product or service.",
      },
    ],
    [
      { strong: true, text: "Do not enter real personal or financial information." },
      { text: " Use the demo personas provided." },
    ],
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
