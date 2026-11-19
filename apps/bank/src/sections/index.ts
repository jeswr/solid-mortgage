// AUTHORED-BY Claude Opus 5.5
/**
 * Section registry. A demo other than the mortgage adds screens to an existing app only under
 * src/sections/<demo>/ and registers them here (build-plan.md §2).
 */
import { type ComponentType, createElement, lazy, Suspense } from "react";

/**
 * Sections load with their own page, so a demo's section adds nothing to the first load of the
 * app's own screens (acceptance test 15: under 400 kB compressed).
 */
function lazySection(load: () => Promise<ComponentType>): ComponentType {
  const Section = lazy(async () => ({ default: await load() }));
  return function LazySection() {
    return createElement(
      Suspense,
      { fallback: createElement("p", { className: "muted" }, "Loading…") },
      createElement(Section),
    );
  };
}

const MovingAddressOnFile = lazySection(
  async () => (await import("./moving-house/MovingHouse.tsx")).MovingAddressOnFile,
);
const KybOnboarding = lazySection(
  async () => (await import("./business-kyb/BusinessKyb.tsx")).KybOnboarding,
);
const KybDueDiligence = lazySection(
  async () => (await import("./business-kyb/BusinessKyb.tsx")).KybDueDiligence,
);

export interface AppSection {
  /** The demo that owns this section, e.g. "moving-house". */
  demo: string;
  /** Path inside the app, without the app's base, e.g. "moving/notify". */
  path: string;
  title: string;
  Component: ComponentType;
}

export const sections: readonly AppSection[] = [
  {
    Component: MovingAddressOnFile,
    demo: "moving-house",
    path: "moving/address",
    title: "Address on file",
  },
  { Component: KybOnboarding, demo: "business-kyb", path: "kyb", title: "Business onboarding" },
  {
    Component: KybDueDiligence,
    demo: "business-kyb",
    path: "kyb/due-diligence",
    title: "Customer due diligence",
  },
];
