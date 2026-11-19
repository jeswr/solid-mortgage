// AUTHORED-BY Claude Opus 5.5
/**
 * Pages other demos add to Brackenridge Bank Commercial Credit (AGENTS.md: a demo other than the
 * mortgage adds to an existing app only under `src/sections/<demo>/`). App.tsx routes each one at
 * `/<path>`.
 */
import type { ComponentType } from "react";
import { LoanApplication, LoanCovenants, LoanDecision } from "./small-business-loan/Loan.tsx";

export interface AppSection {
  /** The demo id the section belongs to. */
  readonly demo: string;
  /** The route inside the app, without a leading slash. */
  readonly path: string;
  readonly title: string;
  readonly Component: ComponentType;
}

export const sections: readonly AppSection[] = [
  {
    Component: LoanApplication,
    demo: "small-business-loan",
    path: "loan",
    title: "Equipment loan application",
  },
  {
    Component: LoanDecision,
    demo: "small-business-loan",
    path: "loan/decision",
    title: "Credit decision",
  },
  {
    Component: LoanCovenants,
    demo: "small-business-loan",
    path: "loan/covenants",
    title: "Covenant monitoring",
  },
];
