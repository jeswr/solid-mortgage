// AUTHORED-BY Claude Opus 5.5
import { appUrl } from "@mortgage/demo-kit/urls";
import type { MouseEvent } from "react";
import type { DemoTour } from "./demos.ts";

/**
 * "Try it yourself": the tour's first step, deep-linked (design.md §d.6,
 * `?tour=<demo>&step=<id>`). The tour engine starts the guided path from there.
 */
export function tourUrl(tour: DemoTour): string {
  return appUrl(tour.app, tour.path, { tour: tour.demo, step: tour.step });
}

/** The demo a `?tour=<demo>` URL guides, or `undefined` (no tour, or `tour=off`). */
export function guidedDemo(search: string): string | undefined {
  const demo = new URLSearchParams(search).get("tour");
  return demo === null || demo === "" || demo === "off" ? undefined : demo;
}

/**
 * Click handler for a "Try it yourself" link: the guided tour starts with fresh data
 * (design.md §e), so the demo restarts from its seed before the link is followed. A modified
 * click (new tab, new window) follows the plain link. If the restart fails, the link is
 * followed anyway: the tour still runs on the data the pods have.
 */
export function startTourFresh(event: MouseEvent<HTMLAnchorElement>): void {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  const link = event.currentTarget;
  if (link.getAttribute("aria-busy") === "true") return;
  link.setAttribute("aria-busy", "true");
  const href = link.href;
  import("./guided-tour.ts")
    .then((tour) => tour.startFresh(href))
    .catch((error: unknown) => {
      console.error("welcome: could not restart the demo before the tour", error);
      window.location.assign(href);
    });
}
