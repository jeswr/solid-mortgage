// AUTHORED-BY Claude Opus 5.5
/**
 * Section registry. A demo other than the mortgage adds screens to an existing app only under
 * src/sections/<demo>/ and registers them here (build-plan.md §2).
 */
import type { ComponentType } from "react";
import { MotorClaims, MotorClaimsDesk } from "./motor-claim/MotorClaim.tsx";
import { MovingPolicies } from "./moving-house/MovingHouse.tsx";

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
    Component: MovingPolicies,
    demo: "moving-house",
    path: "moving/policies",
    title: "Car policy: garaging address",
  },
  { Component: MotorClaims, demo: "motor-claim", path: "claims", title: "Report a car claim" },
  { Component: MotorClaimsDesk, demo: "motor-claim", path: "claims/desk", title: "Claims desk" },
];
