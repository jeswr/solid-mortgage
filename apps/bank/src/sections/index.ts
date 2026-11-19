// AUTHORED-BY Claude Opus 5.5
/**
 * Section registry. A demo other than the mortgage adds screens to an existing app only under
 * src/sections/<demo>/ and registers them here (build-plan.md §2).
 */
import type { ComponentType } from "react";
import { KybDueDiligence, KybOnboarding } from "./business-kyb/BusinessKyb.tsx";
import { MovingAddressOnFile } from "./moving-house/MovingHouse.tsx";
import { YourIdentity } from "./reusable-kyc/YourIdentity.tsx";
import { LendingCashFlow } from "./small-dollar-lending/CashFlow.tsx";
import { LendingLoans } from "./small-dollar-lending/Loans.tsx";

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
  { Component: YourIdentity, demo: "reusable-kyc", path: "kyc", title: "Your identity" },
];
