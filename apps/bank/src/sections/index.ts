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
const BusinessBanking = lazySection(
  async () => (await import("./small-business-loan/SmallBusinessLoan.tsx")).BusinessBanking,
);
const KybOnboarding = lazySection(
  async () => (await import("./business-kyb/BusinessKyb.tsx")).KybOnboarding,
);
const KybDueDiligence = lazySection(
  async () => (await import("./business-kyb/BusinessKyb.tsx")).KybDueDiligence,
);
const LendingCashFlow = lazySection(
  async () => (await import("./small-dollar-lending/CashFlow.tsx")).LendingCashFlow,
);
const LendingLoans = lazySection(
  async () => (await import("./small-dollar-lending/Loans.tsx")).LendingLoans,
);
const YourIdentity = lazySection(
  async () => (await import("./reusable-kyc/YourIdentity.tsx")).YourIdentity,
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
  {
    Component: LendingCashFlow,
    demo: "small-dollar-lending",
    path: "lending/cash-flow",
    title: "Cash-flow summary",
  },
  {
    Component: LendingLoans,
    demo: "small-dollar-lending",
    path: "lending/loans",
    title: "Personal loans",
  },
  { Component: KybOnboarding, demo: "business-kyb", path: "kyb", title: "Business onboarding" },
  {
    Component: KybDueDiligence,
    demo: "business-kyb",
    path: "kyb/due-diligence",
    title: "Customer due diligence",
  },
  {
    Component: BusinessBanking,
    demo: "small-business-loan",
    path: "business",
    title: "Business banking",
  },
  { Component: YourIdentity, demo: "reusable-kyc", path: "kyc", title: "Your identity" },
];
