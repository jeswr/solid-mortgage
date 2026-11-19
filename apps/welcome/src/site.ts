// AUTHORED-BY Claude Opus 5.5
/**
 * The welcome app's identity: the convener's own branding, not a fictional organisation's
 * (design.md §e). The trust wiring in demo-kit is keyed to an organisation record, so the front
 * door passes a stand-in whose `organisation` reads as a sentence subject in the banner's
 * fictional line ("Every organisation in these demos is a fictional organisation.") and which
 * shows nobody as signed in.
 */
import type { OrgRecord } from "@mortgage/demo-kit/registry";
import { demoPack } from "@mortgage/demo-kit/trust";

export const SITE_NAME = "Solid demos for EDMA members";
export const CONVENER = demoPack.convener;
export const THEME_COLOR = "#13212E";

/**
 * Stand-in record for `<DemoTrust>`. Only `organisation` and `persona` reach the page; the slug
 * is required by the type and never used to build a link or reach a pod.
 */
export const SITE_RECORD: OrgRecord = Object.freeze({
  actsAs: "alex",
  organisation: "Every organisation in these demos",
  persona: null,
  role: "Front door of the demo site",
  short: "Solid demos",
  slug: "wallet",
  themeColor: THEME_COLOR,
  title: SITE_NAME,
});

export const DESCRIPTION = `See what changes when the customer holds the data. ${demoPack.demoDescription(
  { appName: SITE_NAME, organization: SITE_NAME, variant: "own" },
)}`;

/** Join-in destinations (design.md §e item 6). */
export const LINKS = Object.freeze({
  meeting: "https://hub.edmcouncil.org/NC__Event?id=a0lVQ0000061alxYAA",
  forum: "https://edmconnect.edmcouncil.org/solidforum/home",
  source: "https://github.com/jeswr/solid-mortgage",
});

/** The document title for a page: "Watch · Solid demos for EDMA members". */
export function pageTitle(page?: string): string {
  return page === undefined ? SITE_NAME : `${page} · ${SITE_NAME}`;
}

/** Title, robots, theme colour and description on the live document. Browser only. */
export function applyMeta(page?: string): void {
  document.title = pageTitle(page);
  for (const [name, content] of [
    ["theme-color", THEME_COLOR],
    ["robots", "noindex, nofollow"],
    ["description", DESCRIPTION],
  ] as const) {
    let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
    if (element === null) {
      element = document.createElement("meta");
      element.name = name;
      document.head.append(element);
    }
    element.content = content;
  }
}
