// AUTHORED-BY Claude Opus 5.5
/**
 * Section registry. A demo other than the mortgage adds screens to an existing app only under
 * src/sections/<demo>/ and registers them here (build-plan.md §2). Empty until a demo needs it.
 */
import type { ComponentType } from "react";
import { LendingCreditSummary } from "./small-dollar-lending/CreditSummary.tsx";

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
    Component: LendingCreditSummary,
    demo: "small-dollar-lending",
    path: "lending",
    title: "Credit summary",
  },
];
