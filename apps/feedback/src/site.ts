// AUTHORED-BY Claude Opus 5.5
/**
 * The feedback page's identity: the convener's, like the front door's (apps/welcome/src/site.ts).
 * The trust wiring in demo-kit is keyed to an organisation record, so the page passes a stand-in
 * whose `organisation` reads as the subject of the banner's fictional line and which shows
 * nobody as signed in. Its slug is required by the type and never used to reach a pod.
 */
import type { OrgRecord } from "@mortgage/demo-kit/registry";
import { demoPack } from "@mortgage/demo-kit/trust";

export const SITE_NAME = "Solid demos for EDMA members";
export const CONVENER = demoPack.convener;
export const THEME_COLOR = "#13212E";
export const PAGE_TITLE = `Give feedback · ${SITE_NAME}`;

/** Recorded with each submission, so the team knows which version of the page collected it. */
export const FEEDBACK_VERSION = "feedback-page-1";

export const SITE_RECORD: OrgRecord = Object.freeze({
  actsAs: "alex",
  organisation: "Every organisation in these demos",
  persona: null,
  role: "Feedback page of the demo site",
  short: "Feedback",
  slug: "wallet",
  themeColor: THEME_COLOR,
  title: PAGE_TITLE,
});

export const DESCRIPTION = `Tell the ${CONVENER} what you made of the Solid demos. ${demoPack.demoDescription(
  { appName: SITE_NAME, organization: SITE_NAME, variant: "own" },
)}`;

/** Title, robots, theme colour and description on the live document. Browser only. */
export function applyMeta(page?: string): void {
  document.title = page === undefined ? PAGE_TITLE : `${page} · ${SITE_NAME}`;
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
