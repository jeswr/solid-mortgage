// AUTHORED-BY Claude Opus 5.5
/**
 * Pages other demos add to State Online Services (AGENTS.md: a demo other than the mortgage adds
 * to an existing app only under `src/sections/<demo>/`). App.tsx routes each one at `/<path>`.
 */
import type { ComponentType } from "react";
import { Revenue } from "./small-business-loan/Revenue.tsx";

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
    Component: Revenue,
    demo: "small-business-loan",
    path: "revenue",
    title: "Department of Revenue",
  },
];
