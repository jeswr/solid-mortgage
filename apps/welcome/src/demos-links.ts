// AUTHORED-BY Claude Opus 5.5
import { appUrl } from "@mortgage/demo-kit/urls";
import type { DemoTour } from "./demos.ts";

/**
 * "Try it yourself": the tour's first step, deep-linked (design.md §d.6,
 * `?tour=<demo>&step=<id>`). The tour engine starts the guided path from there.
 */
export function tourUrl(tour: DemoTour): string {
  return appUrl(tour.app, tour.path, { tour: tour.demo, step: tour.step });
}
